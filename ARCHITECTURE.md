# WatchTransfer System Architecture

WatchTransfer is a clinical notification responsibility engine that ensures critical diagnostic findings reach the clinician who was **actively responsible for the patient at the exact clinical event time**, rather than defaulting to the clinician who ordered the test.

---

## 1. High-Level System Architecture

```text
                           ┌─────────────────────────────────────────┐
                           │            React 19 Frontend            │
                           │  (Dashboard, Simulator, Audit, Inbox)  │
                           └────────────────────┬────────────────────┘
                                                │ REST API (JSON / HTTP)
                                                ▼
                           ┌─────────────────────────────────────────┐
                           │             FastAPI Backend             │
                           │       (Python 3.12+, Uvicorn, CORS)     │
                           └────────────────────┬────────────────────┘
                                                │
         ┌─────────────────────┬────────────────┼────────────────────┬────────────────────┐
         ▼                     ▼                ▼                    ▼                    ▼
   [Patients API]       [Clinicians API] [Requests API]        [Handoffs API]       [Results API]
         │                     │                │                    │                    │
         │                     │                │                    ▼                    ▼
         │                     │                │            [Timeline Builder]  [Notification Engine]
         │                     │                │            (Sort by event_time)         │
         │                     │                │                    │                    ▼
         │                     │                │                    └─────────► [Responsibility Resolver]
         │                     │                │                                         │
         │                     │                │                                         ▼
         │                     │                │                                [Notifications API]
         │                     │                │                                         │
         │                     │                │                                         ▼
         │                     │                │                                [Acknowledgment API]
         │                     │                │                                         │
         └─────────────────────┴────────────────┴────────────────────┬────────────────────┘
                                                                     │
                                                                     ▼
                                                          [Audit Trail Engine]
                                                       (Append-Only, Dual-Timestamped)
                                                                     │
                                                                     ▼
                                                        ┌───────────────────────────┐
                                                        │   PostgreSQL / NeonDB     │
                                                        │ (SQLAlchemy 2.0 ORM Base) │
                                                        └───────────────────────────┘
```

---

## 2. Core System Flow

1. **Standing Request Definition**: A clinician registers an automated alert condition for a patient (e.g., alert when blood test `Troponin-I` is reported for Patient `P001`).
2. **Clinical Handoff Occurrence**: Shift changes, service transfers, and coverage handoffs occur in the hospital. Each handoff contains:
   - `event_time`: The real-world clinical timestamp when the handoff took effect.
   - `received_at`: When the ingestion API received the event payload.
   - `from_clinician` & `to_clinician`: The handover participants.
3. **Out-of-Order Decoupling**: Ingestion order does **not** dictate clinical timeline order. All events are stored with both timestamps.
4. **Timeline Reconstruction**: When evaluating responsibility, `timeline_service` sorts all historical events for the patient by `event_time ASC` and constructs contiguous clinical responsibility intervals: `[start_time, end_time)`.
5. **Result Trigger**: A diagnostic result (e.g., lab value, critical imaging notification) arrives with its own clinical timestamp (`result.event_time`).
6. **Responsibility Resolution**: `responsibility_service` searches the reconstructed timeline to find the clinician whose interval covers `result.event_time`.
   - **Key Safety Guarantee**: Even if Dr. A ordered the test, if Dr. C is currently responsible at `result.event_time`, the notification is directed to Dr. C.
7. **Notification Generation**: `notification_service` verifies the active standing request, builds the notification record, and alerts Dr. C.
8. **Independent Acknowledgment**: Dr. C reviews and acknowledges the alert (`PATCH /notifications/{id}/acknowledge`). This transitions the notification status to `ACKNOWLEDGED` without mutating historical responsibility data.
9. **Append-Only Clinical Audit Log**: Every stage (request created, handoff received, timeline reconstructed, responsibility resolved, notification issued, acknowledgment completed) is committed to an immutable audit record.

---

## 3. Database Architecture (PostgreSQL & SQLAlchemy 2.0)

The system uses **PostgreSQL (NeonDB Serverless)** for cloud production and an in-memory **SQLite** database for automated test suites. 

The ORM is built on **SQLAlchemy 2.0** using `DeclarativeBase` and typed `mapped_column()` declarations to guarantee compile-time and runtime type safety.

### 3.1 Entity Relationship Diagram

```text
┌──────────────────┐           ┌───────────────────────┐
│     patients     │           │      clinicians       │
├──────────────────┤           ├───────────────────────┤
│ PK patient_id    │           │ PK clinician_id       │
│    name          │           │    name               │
└────────┬─────────┘           │    role               │
         │                     └───────────┬───────────┘
         ├────────────────────────┐        │
         ▼                        ▼        ▼
┌───────────────────────┐      ┌─────────────────────────────┐
│   standing_requests   │      │    responsibility_events    │
├───────────────────────┤      ├─────────────────────────────┤
│ PK request_id         │      │ PK event_id                 │
│ FK patient_id         │      │ FK patient_id               │
│ FK requested_by       │◄─────┤ FK from_clinician (nullable)│
│    result_type        │      │ FK to_clinician             │
│    condition          │      │    event_time (clinical)    │
│    status             │      │    received_at (system)     │
│    created_at         │      │    source                   │
└────────┬──────────────┘      │    created_at               │
         │                     └─────────────────────────────┘
         ▼                                    │
┌───────────────────────┐                     │
│     result_events     │                     │
├───────────────────────┤                     │
│ PK result_id          │                     │
│ FK patient_id         │                     │
│    result_type        │                     │
│    result_data        │                     │
│    event_time         │                     │
│    received_at        │                     │
│    status             │                     │
│    created_at         │                     │
└────────┬──────────────┘                     │
         │                                    │
         ▼                                    ▼
┌────────────────────────────────────────────────────────────┐
│                       notifications                        │
├────────────────────────────────────────────────────────────┤
│ PK notification_id                                         │
│ FK result_id                                               │
│ FK patient_id                                              │
│ FK clinician_id (responsible clinician at trigger time)    │
│    message                                                 │
│    trigger_time (result.event_time)                        │
│    status ("PENDING" -> "ACKNOWLEDGED")                    │
│    created_at                                              │
└────────────────────────────┬───────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────┐
│                        audit_logs                          │
├────────────────────────────────────────────────────────────┤
│ PK audit_id (AUD-XXXXXXXX)                                 │
│ FK patient_id (nullable for system events)                 │
│    event_type (REQUEST_CREATED, RESPONSIBILITY_RESOLVED...)│
│    entity_type ("NOTIFICATION", "HANDOFF", "REQUEST"...)   │
│    entity_id                                               │
│    description                                             │
│    event_time (clinical occurrence timestamp)              │
│    created_at (database insertion timestamp)               │
│    extra_metadata (JSON string for full explainability)    │
└────────────────────────────────────────────────────────────┘
```

### 3.2 Dual Timestamping Strategy

A central architectural pattern in WatchTransfer is **dual timestamping** on all clinical events:
- **`event_time`**: The clinical time at which the medical event actually transpired (e.g. shift change signed in EHR, specimen drawn in lab).
- **`received_at` / `created_at`**: The physical system time when the message payload entered the database.

By resolving responsibility exclusively on `event_time`, the system remains deterministic regardless of network latency, queue backlogs, or batched event replay.

---

## 4. Core Business Logic & Algorithms

### 4.1 Chronological Timeline Reconstruction

Clinical handoffs frequently arrive out of order. For example:
- Shift Handoff 1 (`Dr. A → Dr. B`) occurred at `10:05:00`, but packet delivery is delayed until `10:15:00`.
- Shift Handoff 2 (`Dr. B → Dr. C`) occurred at `10:10:00` and is received immediately at `10:10:02`.

The Timeline Reconstruction algorithm operates as follows:
```python
def get_timeline(patient_id: str, db: Session) -> list[dict]:
    # 1. Fetch all responsibility events for the patient
    events = db.query(ResponsibilityEvent).filter_by(patient_id=patient_id).all()

    # 2. Sort deterministically by clinical event_time ASC
    events = sorted(events, key=lambda e: e.event_time)

    # 3. Build contiguous time intervals
    timeline = []
    for i, ev in enumerate(events):
        start = ev.event_time
        # Next event defines the closing boundary of this interval
        end = events[i + 1].event_time if (i + 1 < len(events)) else None
        timeline.append({
            "clinician_id": ev.to_clinician,
            "start_time": start,
            "end_time": end,
            "source_event_id": ev.event_id
        })
    return timeline
```

### 4.2 Dynamic Responsibility Resolution

Given a result timestamp (`trigger_time`):
1. The timeline intervals are inspected sequentially.
2. The active clinician is identified where `start_time <= trigger_time < end_time` (or `end_time is None` for the latest open interval).
3. If `trigger_time` precedes the earliest known handoff, the engine falls back safely to the first recorded clinician or the request creator, logging a dedicated audit entry for safety review.

```python
def resolve_responsible_clinician(patient_id: str, trigger_time: datetime, db: Session) -> str:
    timeline = get_timeline(patient_id, db)
    if not timeline:
        # Fallback to standing request creator
        return fallback_clinician(patient_id, db)

    for interval in timeline:
        start = interval["start_time"]
        end = interval["end_time"]

        if end is not None:
            if start <= trigger_time < end:
                return interval["clinician_id"]
        else:
            if start <= trigger_time:
                return interval["clinician_id"]

    # Boundary fallback: if prior to earliest event, assign to earliest clinician
    return timeline[0]["clinician_id"]
```

---

## 5. API Architecture

All endpoints follow REST principles, returning standardized Pydantic v2 response schemas:

### 5.1 Endpoints Summary

| Router | Method | Endpoint | Key Responsibility |
|---|---|---|---|
| **Patients** | `GET` | `/patients/` | List all registered patients |
| | `POST` | `/patients/` | Register a new patient |
| | `GET` | `/patients/{patient_id}` | Retrieve patient profile |
| | `GET` | `/patients/{patient_id}/timeline` | Reconstructed chronological responsibility intervals |
| **Clinicians** | `GET` | `/clinicians/` | List all clinicians |
| | `POST` | `/clinicians/` | Register clinician with role and department |
| | `GET` | `/clinicians/{clinician_id}` | Retrieve clinician details |
| **Requests** | `GET` | `/requests/` | List active standing requests |
| | `POST` | `/requests/` | Create a new standing request (triggers audit log) |
| | `GET` | `/requests/{request_id}` | Query standing request status |
| **Handoffs** | `POST` | `/handoffs/` | Ingest handoff event; auto-rebuilds timeline and emits audit entry |
| **Results** | `POST` | `/results/` | Ingest diagnostic result; triggers responsibility resolution & alert dispatch |
| **Notifications** | `GET` | `/notifications/` | List all system notifications |
| | `GET` | `/notifications/{clinician_id}` | Clinician-specific inbox view |
| | `PATCH`| `/notifications/{id}/acknowledge`| Clinician acknowledgment (idempotent, audited) |
| **Audit** | `GET` | `/audit/` | Retrieve complete chronological clinical audit trail |
| | `GET` | `/audit/{audit_id}` | Deep inspection of specific audit record |

---

## 6. Frontend Architecture (React 19 + Vite)

The UI is architected around actionable clinical workflows, high-clarity status indicators, and an interactive simulation laboratory:

```text
frontend/src/
├── main.jsx              # Application bootstrap & CSS imports
├── App.jsx               # Navigation router & top-level layout
├── api.js                # Centralized Axios/fetch client with backend baseURL
├── index.css             # Design tokens, dark-mode styling, glassmorphism, animations
├── components/
│   ├── Layout.jsx        # App frame, top navbar, clinician context switcher
│   ├── Sidebar.jsx       # Navigation links & active notification badges
│   ├── Card.jsx          # Structured data containers
│   ├── Modal.jsx         # Accessible popups for creation workflows
│   ├── StatusBadge.jsx   # Status indicators (PENDING, ACKNOWLEDGED, ACTIVE)
│   ├── Skeleton.jsx      # Shimmer loading states
│   └── ErrorState.jsx    # User-friendly error recovery screens
└── pages/
    ├── Dashboard.jsx     # High-level overview: active requests, quick actions, recent alerts
    ├── Demo.jsx          # Interactive Out-of-Order Event Simulator
    ├── Notifications.jsx # Clinician inbox with one-click acknowledgment
    ├── Audit.jsx         # Searchable, filterable audit trail explorer
    ├── Patients.jsx      # Patient roster with quick search
    ├── PatientDetail.jsx # Patient timeline visualizer & historical events
    ├── Requests.jsx      # Standing request creator & management
    └── Settings.jsx      # System preferences & database connection info
```

---

## 7. Edge Cases & Clinical Safety Guarantees

| Scenario | Risk | WatchTransfer Mitigation |
|---|---|---|
| **Out-of-Order Handoffs** | Later handoff packet arrives before earlier handoff packet. | Events are decoupled from arrival order. `timeline_service` sorts by `event_time`, reconstructing the correct sequence. |
| **Rapid Handoff Chaining** | 3 clinicians change hands within 2 minutes. | Interval slicing handles sub-second transitions deterministically. |
| **Result at Exact Boundary** | Result timestamp matches handoff time down to the second. | Inclusive start and exclusive end boundary rules (`start <= t < end`) assign responsibility to the incoming clinician. |
| **Delayed Acknowledgment** | Clinician acknowledges an alert 4 hours later. | Historical audit and responsibility records remain strictly immutable. Acknowledgment records its own timestamp. |
| **Result with No Request** | Lab result arrives without an active standing request. | Result is recorded in database; audit log records `NO_ACTIVE_REQUEST`; prevents alert clutter. |
| **Unregistered Clinician** | External clinician ID in handoff payload. | Foreign key constraints and Pydantic schema validation prevent orphaned records. |

---

## 8. Verification & Test Suite

The system includes automated unit and integration tests located in `backend/tests/`:
- **`test_handoffs.py`**: Validates handoff payload parsing, default values, and duplicate prevention.
- **`test_out_of_order.py`**: Ingests handoff events in reverse chronological order and asserts that the reconstructed timeline matches true clinical sequence.
- **`test_results.py`**: Emits lab results and verifies that notifications route to the active clinician rather than the request creator.
- **`test_timeline.py`**: Verifies boundary conditions, single-clinician intervals, and multi-clinician transitions.
