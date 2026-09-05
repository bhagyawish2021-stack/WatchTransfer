# WatchTransfer

**Right Patient → Right Clinician → Right Time**

WatchTransfer is a clinical notification responsibility engine designed to eliminate missed critical results and alert fatigue caused by patient handoffs. When a clinical lab or imaging result is reported, WatchTransfer ensures the alert reaches the clinician who was **actively responsible for the patient at the exact clinical event timestamp** (`event_time`), rather than simply alerting whoever placed the initial request.

---

## The Problem: The Clinical Handoff Gap

In modern hospitals, patients are frequently handed off between clinicians across shifts, rotations, and service transfers. 
- **The Pitfall**: Traditional EHR systems route result notifications to the clinician who ordered the test. If a patient changes hands (e.g., Dr. Alpha hands off to Dr. Beta, who hands off to Dr. Gamma), critical lab results can sit unread in the inbox of an off-duty doctor.
- **The Out-of-Order Challenge**: Due to network latency, batch syncing, or mobile EHR delays, handoff messages often arrive out of chronological order (e.g., handoff B→C is received before handoff A→B). Systems relying on ingestion timestamps (`received_at`) produce corrupted responsibility timelines.
- **The Solution**: WatchTransfer decouples event receipt from clinical event time, reconstructs timelines chronologically using `event_time`, evaluates standing requests, routes alerts to the actively responsible clinician, and maintains an immutable, append-only audit trail.

---

## Core Capabilities

- 📋 **Automated Standing Requests**: Clinicians configure automated notification triggers for patient results (e.g., "Alert when Ravi's Troponin or Potassium result is reported").
- ⏱️ **Out-of-Order Event Reconstruction**: Rebuilds exact clinician responsibility timelines using clinical event timestamps (`event_time`) rather than receipt times (`received_at`).
- 🎯 **Dynamic Responsibility Resolution**: Deterministically resolves the active clinician at the exact result trigger time (`event_time`), seamlessly handling multiple rapid handoffs.
- 📬 **Delayed Acknowledgment Tracking**: Allows clinicians to acknowledge alerts while preserving historical responsibility decisions unchanged.
- 🛡️ **Append-Only Clinical Audit Trail**: Records every request, handoff, timeline reconstruction, notification, and acknowledgment with dual timestamps (`event_time` vs `created_at`) for medico-legal accountability.
- 🖥️ **Interactive Full-Stack Web App**: Production-ready React 19 dashboard featuring an interactive **Event Simulator** to demonstrate out-of-order handoffs and real-time alert routing.

---

## Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Vite, Tailwind & Vanilla CSS, Lucide Icons |
| **Backend** | Python 3.12+, FastAPI, Pydantic v2, Uvicorn |
| **Database & ORM** | PostgreSQL (NeonDB Serverless Cloud DB) via SQLAlchemy 2.0 (`DeclarativeBase`, `mapped_column`) |
| **Type Safety & Quality** | Pyrefly static type checker, Pytest test suite |

---

## Project Structure

```text
WatchTransfer/
├── backend/
│   ├── main.py                  # FastAPI entry point & CORS configuration
│   ├── database.py              # SQLAlchemy 2.0 engine & session setup
│   ├── models.py                # Database models (Patients, Clinicians, Requests, Events, Audit)
│   ├── schemas.py               # Pydantic v2 validation schemas
│   ├── pyrefly.toml             # Type checker configuration
│   ├── routers/                 # API Endpoints
│   │   ├── patients.py          # Patient directory & timeline lookup
│   │   ├── clinicians.py        # Clinician directory & management
│   │   ├── requests.py          # Standing request management
│   │   ├── handoffs.py          # Responsibility event ingestion
│   │   ├── results.py           # Result event ingestion & automated trigger
│   │   ├── notifications.py     # Clinician notification inbox & acknowledgments
│   │   └── audit.py             # Append-only audit trail exploration
│   ├── services/                # Core Business Logic
│   │   ├── timeline_service.py  # Chronological timeline reconstruction
│   │   ├── responsibility_service.py # Responsibility resolution engine
│   │   ├── notification_service.py   # Triggering & notification generation
│   │   └── audit_service.py     # Immutable audit log recording
│   └── tests/                   # Automated Pytest Suite
│       ├── conftest.py          # SQLite in-memory test database fixture
│       ├── test_handoffs.py     # Handoff ingestion tests
│       ├── test_out_of_order.py # Out-of-order timeline reconstruction tests
│       ├── test_results.py      # Result routing & notification tests
│       └── test_timeline.py     # Timeline boundary & interval tests
├── frontend/                    # Modern React 19 + Vite UI
│   ├── src/
│   │   ├── components/          # Layout, Sidebar, Cards, Modals, Status Badges
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx    # System metrics, active requests, real-time alert feed
│   │   │   ├── Demo.jsx         # Interactive Out-of-Order Event Simulator
│   │   │   ├── Notifications.jsx# Clinician notification center & acknowledgment
│   │   │   ├── Audit.jsx        # Complete clinical audit trail explorer
│   │   │   ├── Patients.jsx     # Patient directory
│   │   │   ├── PatientDetail.jsx# Patient timeline & clinical history
│   │   │   ├── Requests.jsx     # Standing request configuration
│   │   │   └── Settings.jsx     # System configuration & clinician switcher
│   │   ├── api.js               # Centralized Axios/fetch API client
│   │   └── index.css            # Design system tokens & animations
│   ├── package.json
│   └── vite.config.js
├── pyproject.toml               # Pytest & Pyrefly workspace configuration
└── README.md
```

---

## Getting Started

### Prerequisites
- **Python 3.12+**
- **Node.js 18+** and **npm**
- A PostgreSQL database (e.g. [NeonDB](https://neon.tech)) or local PostgreSQL instance.

---

### Backend Setup

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Create and activate a virtual environment**:
   ```bash
   python -m venv .venv
   # Windows PowerShell
   .venv\Scripts\Activate.ps1
   # macOS / Linux
   source .venv/bin/activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure Environment Variables**:
   Create a `.env` file in the `backend/` directory:
   ```env
   DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
   ```

5. **Start the API Server**:
   ```bash
   uvicorn main:app --reload --port 8000
   ```
   The interactive Swagger documentation will be available at [http://localhost:8000/docs](http://localhost:8000/docs).

---

### Frontend Setup

1. **Navigate to the frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```
   The application will be running at [http://localhost:5173](http://localhost:5173).

---

### Running Automated Tests

The test suite runs against an isolated in-memory SQLite database to verify all routing, out-of-order handling, and acknowledgment mechanics:

```bash
# From workspace root
pytest
```

---

## API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/patients` | List all patients |
| `POST` | `/patients` | Register a new patient |
| `GET` | `/patients/{id}/timeline` | Reconstructed responsibility intervals for a patient |
| `GET` | `/clinicians` | List clinicians |
| `POST` | `/clinicians` | Register a new clinician |
| `GET` | `/requests` | List active standing requests |
| `POST` | `/requests` | Create a new standing request |
| `POST` | `/handoffs` | Ingest a clinician responsibility / handoff event |
| `POST` | `/results` | Ingest a lab/imaging result and trigger routing |
| `GET` | `/notifications` | List all generated notifications |
| `GET` | `/notifications/{clinician_id}` | Retrieve inbox notifications for a specific clinician |
| `PATCH` | `/notifications/{id}/acknowledge` | Acknowledge a notification (idempotent, audited) |
| `GET` | `/audit` | Retrieve complete, chronological clinical audit trail |
| `GET` | `/audit/{id}` | Inspect a single audit record |

---

## Interactive Demo & Hackathon Scenario

Use the built-in **Interactive Simulator** (`/demo` route in the UI) to verify the core value proposition:

1. **Setup Patient & Standing Request**:
   - Patient `P001` (Ravi Kumar) is admitted.
   - Dr. A (`C001`) creates a Standing Request for `Troponin-I` results.
2. **Simulate Out-of-Order Handoffs**:
   - Shift handoff 1: Dr. A → Dr. B (`event_time: 10:05:00`).
   - Shift handoff 2: Dr. B → Dr. C (`event_time: 10:20:00`).
   - Intentionally send Handoff 2 first, followed by Handoff 1.
3. **Emit Clinical Result**:
   - Laboratory produces a critical `Troponin-I` result with timestamp `event_time: 10:25:00`.
4. **Inspect Resolution & Routing**:
   - WatchTransfer reconstructs the true chronological intervals.
   - Dr. C (`C003`) is identified as the clinician responsible at `10:25:00`.
   - The notification is routed directly to Dr. C's inbox, **not** Dr. A (the original requestor) or Dr. B.
5. **Delayed Acknowledgment & Audit Trail**:
   - Dr. C acknowledges the notification.
   - Review the **Audit Trail** to see the immutable log verifying that the decision was resolved deterministically.
