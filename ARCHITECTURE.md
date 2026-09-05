# WatchTransfer System Architecture

## 1. High-Level Architecture

```text
                         React Frontend
                              │
                           REST API
                              │
                              ▼
                       FastAPI Backend
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
 Event Ingestion       Request Manager       Notification Manager
        │                     │                     │
        ▼                     │                     ▼
 Timeline Builder             │              Notification
        │                     │                     │
        ▼                     │                     ▼
 Responsibility Resolver      │               Acknowledgment
        │                     │
        └──────────────┬──────┘
                       ▼
                 Audit Manager
                       │
                       ▼
                 SQLite Database
```

## 2. Core System Flow

1. **Standing Request**: Doctor creates a standing request which is stored in the database.
2. **Handoffs**: Patient responsibility changes, and handoff events are received. These events might arrive out of order (network delay, batch processing, etc).
3. **Event Storage**: Events are stored using their actual **EVENT TIMESTAMP** (`event_time`), not when the system received them (`received_at`).
4. **Timeline Reconstruction**: The Timeline Builder reconstructs the chronological order of responsibility based on `event_time`.
5. **Result Trigger**: A clinical result arrives, and its timestamp becomes the **TRIGGER TIME**.
6. **Responsibility Resolution**: The Responsibility Resolver checks the reconstructed timeline to find the clinician responsible at the exact TRIGGER TIME.
7. **Notification**: The Notification Manager creates and displays a notification to the correct clinician (ensuring `REQUEST CREATOR ≠ RESPONSIBLE CLINICIAN` if there was a handoff).
8. **Acknowledgment**: The clinician acknowledges the notification. This is stored separately without altering historical responsibility.
9. **Audit Trail**: A complete audit log records the decision-making process.

## 3. Database Design (SQLite)

- **`patients`**: `id`, `patient_id`, `name`, `created_at`
- **`clinicians`**: `id`, `clinician_id`, `name`, `role`, `department`
- **`standing_requests`**: `id`, `request_id`, `patient_id`, `requested_by`, `result_type`, `condition`, `created_at`, `status`
- **`responsibility_events`**: `id`, `event_id`, `patient_id`, `from_clinician`, `to_clinician`, `event_time`, `received_at`, `source`
- **`result_events`**: `id`, `result_id`, `patient_id`, `result_type`, `event_time`, `received_at`, `status`
- **`notifications`**: `id`, `notification_id`, `request_id`, `patient_id`, `clinician_id`, `trigger_time`, `created_at`, `status`
- **`acknowledgments`**: `id`, `notification_id`, `clinician_id`, `acknowledged_at`
- **`audit_logs`**: `id`, `patient_id`, `request_id`, `event_type`, `description`, `event_time`, `created_at`

### Data Model Relationships

```text
Patient
   │
   ├── Standing Requests
   │
   ├── Responsibility Events
   │
   ├── Result Events
   │
   └── Notifications
           │
           └── Acknowledgment

Clinician
   │
   ├── Creates Requests
   ├── Receives Responsibility
   └── Receives Notifications

Standing Request
   │
   └── Notification
           │
           └── Audit Log
```

## 4. Core Business Logic (Responsibility Resolver)

### Notification Decision Flow

This flow highlights the core innovation of accurately determining responsibility at the exact time a result becomes available, irrespective of message arrival order.

```text
Result Received
      ↓
Read result.event_time
      ↓
Find active standing request
      ↓
Get responsibility events
      ↓
Sort by event_time
      ↓
Reconstruct timeline
      ↓
Find responsible clinician
      ↓
Create notification
      ↓
Record audit decision
      ↓
Wait for acknowledgment
```

### Responsibility Resolver Logic

```python
function process_result(result):
    trigger_time = result.event_time

    request = find_active_request(result.patient_id, result.result_type)
    if not request:
        create_audit_log()
        return

    # Crucial step: rebuild timeline from actual event times, NOT received times
    events = get_responsibility_events(result.patient_id)
    events = sort(events, by="event_time")
    timeline = build_responsibility_timeline(events)

    # Determine who gets the alert
    responsible_clinician = find_responsible_clinician(timeline, trigger_time)

    notification = create_notification(request, responsible_clinician, trigger_time)
    create_audit_log(trigger_time, responsible_clinician)
Absolutely. Since your architecture is finalized, the best approach is to **build the backend first in small, testable steps**. Don't start with the frontend yet.

For WatchTransfer, use:

**Python → FastAPI → SQLAlchemy → SQLite → Pydantic → Uvicorn**

## Backend build order

```text
STEP 1  → Create backend project
STEP 2  → Create virtual environment
STEP 3  → Install dependencies
STEP 4  → Create database configuration
STEP 5  → Create SQLAlchemy models
STEP 6  → Create Pydantic schemas
STEP 7  → Create database tables
STEP 8  → Build Patient APIs
STEP 9  → Build Clinician APIs
STEP 10 → Build Standing Request APIs
STEP 11 → Build Handoff/Event APIs
STEP 12 → Build Timeline Builder
STEP 13 → Build Responsibility Resolver ⭐
STEP 14 → Build Result Processing
STEP 15 → Build Notification APIs
STEP 16 → Build Acknowledgment
STEP 17 → Build Audit Logging
STEP 18 → Test complete workflow in Swagger/Postman
```

The important thing is **don't build everything at once**.

---

# STEP 1 — Create the backend folder

Your project should start like this:

```text
WatchTransfer/
│
├── README.md
├── ARCHITECTURE.md
│
└── backend/
```

Open the `WatchTransfer` folder in VS Code.

Open the terminal:

```bash
cd WatchTransfer
mkdir backend
cd backend
```

---

# STEP 2 — Create Python virtual environment

Inside `backend`:

```bash
python -m venv venv
```

Activate it.

### Windows

```bash
venv\Scripts\activate
```

You should see something like:

```text
(venv) C:\...\WatchTransfer\backend>
```

---

# STEP 3 — Install dependencies

Install the basic backend packages:

```bash
pip install fastapi uvicorn sqlalchemy pydantic
```

Then create:

```text
backend/
└── requirements.txt
```

Run:

```bash
pip freeze > requirements.txt
```

For this MVP, **don't install Redis, Kafka, Firebase, MongoDB, etc.**

---

# STEP 4 — Create backend structure

Create this structure:

```text
backend/
│
├── main.py
├── database.py
├── models.py
├── schemas.py
├── requirements.txt
│
├── routers/
│   ├── __init__.py
│   ├── patients.py
│   ├── clinicians.py
│   ├── requests.py
│   ├── handoffs.py
│   ├── results.py
│   ├── notifications.py
│   └── timeline.py
│
└── services/
    ├── __init__.py
    ├── event_service.py
    ├── timeline_service.py
    ├── responsibility_service.py
    ├── notification_service.py
    └── audit_service.py
```

Don't worry about filling all these files yet.

---

# STEP 5 — Set up SQLite

Create `database.py`.

Its job is only to handle:

```text
FastAPI
   ↓
SQLAlchemy
   ↓
SQLite
```

Your database file can simply be:

```text
watchtransfer.db
```

Later your structure will become:

```text
backend/
├── watchtransfer.db
├── database.py
├── models.py
└── ...
```

---

# STEP 6 — Create database models

Now create the SQLAlchemy models.

You need these **8 tables**:

```text
patients
clinicians
standing_requests
responsibility_events
result_events
notifications
acknowledgments
audit_logs
```

### Important relationships

```text
Patient
 ├── Standing Request
 ├── Responsibility Events
 ├── Result Events
 └── Notifications

Clinician
 ├── Standing Requests
 ├── Responsibility Events
 └── Notifications

Standing Request
 └── Notification
       └── Acknowledgment
```

### Most important fields

#### Patients

```text
id
patient_id
name
created_at
```

#### Clinicians

```text
id
clinician_id
name
role
department
```

#### Standing Requests

```text
id
request_id
patient_id
requested_by
result_type
condition
created_at
status
```

#### Responsibility Events

```text
id
event_id
patient_id
from_clinician
to_clinician
event_time
received_at
source
```

#### Result Events

```text
id
result_id
patient_id
result_type
event_time
received_at
status
```

#### Notifications

```text
id
notification_id
request_id
patient_id
clinician_id
trigger_time
created_at
status
```

#### Acknowledgments

```text
id
notification_id
clinician_id
acknowledged_at
```

#### Audit Logs

```text
id
patient_id
request_id
event_type
description
event_time
created_at
```

### ⭐ Very important

Don't combine:

```text
event_time
received_at
```

They must remain separate.

---

# STEP 7 — Create Pydantic schemas

Create `schemas.py`.

Schemas control what comes into and goes out of your APIs.

For example:

```text
CreatePatient
CreateClinician
CreateStandingRequest
CreateHandoff
CreateResult
NotificationResponse
AcknowledgmentRequest
```

This gives you validation.

For example, a handoff request should contain:

```text
patient_id
from_clinician
to_clinician
event_time
received_at
source
```

---

# STEP 8 — Create `main.py`

Now create the FastAPI application.

Your basic flow should be:

```text
main.py
   ↓
Create FastAPI app
   ↓
Create database tables
   ↓
Register routers
   ↓
Start server
```

Run:

```bash
uvicorn main:app --reload
```

You should get:

```text
http://localhost:8000
```

And most importantly:

```text
http://localhost:8000/docs
```

That gives you the **Swagger UI**.

You can test your backend directly from there.

---

# STEP 9 — Build Patient API first

Create:

```text
routers/patients.py
```

Implement:

```text
POST /patients
GET /patients
GET /patients/{patient_id}
```

Test:

```text
POST /patients
```

with:

```json
{
  "patient_id": "P001",
  "name": "Ravi"
}
```

Expected:

```text
Patient created successfully
```

Then test:

```text
GET /patients
```

---

# STEP 10 — Build Clinician API

Create:

```text
routers/clinicians.py
```

Implement:

```text
POST /clinicians
GET /clinicians
```

Create:

```text
Dr A
Dr B
Dr C
```

For example:

```json
{
  "clinician_id": "C001",
  "name": "Dr. A",
  "role": "Physician",
  "department": "Cardiology"
}
```

---

# STEP 11 — Build Standing Request API

Create:

```text
routers/requests.py
```

Implement:

```text
POST /requests
GET /requests
GET /requests/{request_id}
```

Example:

```json
{
  "request_id": "R001",
  "patient_id": "P001",
  "requested_by": "C001",
  "result_type": "Blood Test",
  "condition": "When blood test result becomes available",
  "status": "ACTIVE"
}
```

### Critical concept

Here:

```text
requested_by = C001
```

does **NOT** mean C001 will necessarily receive the notification.

That's the core of WatchTransfer.

---

# STEP 12 — Build Handoff API

Create:

```text
routers/handoffs.py
```

Implement:

```text
POST /handoffs
```

Example:

```json
{
  "event_id": "E001",
  "patient_id": "P001",
  "from_clinician": "C001",
  "to_clinician": "C002",
  "event_time": "2026-09-05T10:05:00",
  "received_at": "2026-09-05T10:07:00",
  "source": "Event Simulator"
}
```

Then:

```text
E002
Dr B → Dr C
event_time = 10:07
```

Store both:

```text
event_time
received_at
```

---

# STEP 13 — Build Timeline Builder ⭐

This is one of your most important backend services.

Create:

```text
services/timeline_service.py
```

Its job:

```text
Get responsibility events
        ↓
Sort by event_time
        ↓
Build chronological timeline
        ↓
Return responsibility intervals
```

Example input:

```text
Received:
10:07 → B → C
10:00 → A → B
10:05 → A → B
```

After processing:

```text
10:00 → Dr A
10:05 → Dr B
10:07 → Dr C
```

**Never sort by `received_at`.**

---

# STEP 14 — Build Responsibility Resolver ⭐⭐⭐

This is the **heart of WatchTransfer**.

Create:

```text
services/responsibility_service.py
```

Input:

```text
patient_id
trigger_time
```

Example:

```text
P001
10:08
```

Process:

```text
Get responsibility events
        ↓
Sort by event_time
        ↓
Build timeline
        ↓
Find interval containing 10:08
        ↓
Return responsible clinician
```

For our demo:

```text
10:00 → Dr A
10:05 → Dr B
10:07 → Dr C
10:08 → Result
```

Return:

```text
Dr C
```

---

# STEP 15 — Build Result API

Create:

```text
routers/results.py
```

Implement:

```text
POST /results
GET /results/{result_id}
```

Example:

```json
{
  "result_id": "RES001",
  "patient_id": "P001",
  "result_type": "Blood Test",
  "event_time": "2026-09-05T10:08:00",
  "received_at": "2026-09-05T10:10:00"
}
```

When the result is received:

```text
Result
  ↓
Find active request
  ↓
Get result.event_time
  ↓
Responsibility Resolver
  ↓
Find clinician
```

---

# STEP 16 — Build Notification Service

Create:

```text
services/notification_service.py
```

The service should receive:

```text
request
responsible_clinician
trigger_time
```

Then create:

```text
Notification
```

Example:

```text
Notification ID: N001
Patient: Ravi
Result: Blood Test
Responsible Clinician: Dr C
Trigger Time: 10:08
Status: PENDING
```

### Important

The notification service should **not calculate responsibility**.

It receives the clinician determined by:

```text
Responsibility Resolver
```

---

# STEP 17 — Build Acknowledgment API

Implement:

```text
POST /notifications/{notification_id}/ack
```

Example:

```text
10:20 → Dr C acknowledges
```

Store:

```text
acknowledged_at = 10:20
```

But don't change:

```text
responsible_clinician = Dr C
trigger_time = 10:08
```

---

# STEP 18 — Build Audit Service

Create:

```text
services/audit_service.py
```

Record important events such as:

```text
REQUEST_CREATED
HANDOFF_RECEIVED
TIMELINE_RECONSTRUCTED
RESULT_RECEIVED
RESPONSIBILITY_RESOLVED
NOTIFICATION_CREATED
NOTIFICATION_ACKNOWLEDGED
```

For example:

```text
10:08
Result RES001 became available.

Responsibility resolved using event_time.

Responsible clinician: Dr C.

Notification N001 created for Dr C.
```

This is what makes your system **explainable and auditable**.

---

# STEP 19 — Test the complete backend

Before touching React, test this exact scenario through Swagger/Postman:

```text
1. Create Ravi
        ↓
2. Create Dr A
3. Create Dr B
4. Create Dr C
        ↓
5. Dr A creates standing request
        ↓
6. Handoff A → B at 10:05
        ↓
7. Handoff B → C at 10:07
        ↓
8. Send events OUT OF ORDER
        ↓
9. Blood result at 10:08
        ↓
10. Responsibility Resolver
        ↓
11. Should return Dr C
        ↓
12. Notification created for Dr C
        ↓
13. Dr C acknowledges at 10:20
        ↓
14. Audit log contains complete history
```

### Your expected final result

```text
Patient: Ravi

Standing Request:
Requested By → Dr A

Result:
Blood Test
Trigger Time → 10:08

Responsibility:
Dr C

Notification:
Sent To → Dr C

Acknowledgment:
Dr C
Time → 10:20

Audit:
Complete
```

---

# ⭐ Most important development milestone

Don't consider the backend finished just because all APIs return `200 OK`.

Your **real success test** is:

```text
Events arrive OUT OF ORDER
             ↓
System sorts by EVENT TIME
             ↓
Timeline reconstructed correctly
             ↓
Result trigger time identified
             ↓
Responsible clinician determined
             ↓
Correct notification generated
```

If this works, **the core WatchTransfer problem is solved.**

### Recommended order for you now

Start only with these first:

**Phase 1**

```text
backend folder
↓
venv
↓
dependencies
↓
database.py
↓
models.py
↓
schemas.py
↓
main.py
```

**Phase 2**

```text
Patients
↓
Clinicians
↓
Standing Requests
```

**Phase 3 — Core Innovation**

```text
Handoffs
↓
Timeline Builder
↓
Responsibility Resolver
```

**Phase 4**

```text
Results
↓
Notifications
↓
Acknowledgment
↓
Audit
```

**Phase 5**

```text
Complete Swagger/Postman testing
↓
Only then start React frontend
```

If you're using **Antigravity**, I recommend giving it **one phase at a time**, rather than asking it to generate the entire backend in one shot. This makes debugging much easier and prevents it from inventing unnecessary architecture.

    return notification
```

---

## 5. API Architecture

Document the REST API structure clearly.

### Patients
* `POST /patients`: Create a new patient.
* `GET /patients`: List all patients.
* `GET /patients/{patient_id}`: Retrieve details of a specific patient.

### Clinicians
* `POST /clinicians`: Register a new clinician.
* `GET /clinicians`: List all clinicians.

### Standing Requests
* `POST /requests`: Create a standing notification request for a patient and result type.
* `GET /requests`: List standing requests.
* `GET /requests/{request_id}`: Retrieve details of a specific standing request.

### Handoffs
* `POST /handoffs`: Record a responsibility transfer (handoff) from one clinician to another.
* `GET /patients/{patient_id}/timeline`: Retrieve the chronological timeline of responsibility for a patient.

### Results
* `POST /results`: Ingest a clinical result (e.g., blood test) for a patient.
* `GET /results/{result_id}`: Retrieve details of a specific result.

### Responsibility
* `GET /patients/{patient_id}/responsible?timestamp={timestamp}`: Resolves and returns the responsible clinician for a patient at the exact given timestamp (`trigger_time`).

### Notifications
* `GET /notifications`: List all notifications.
* `GET /notifications/{clinician_id}`: Retrieve pending notifications for a specific clinician.
* `POST /notifications/{notification_id}/ack`: Acknowledge a notification.

---

## 6. Timeline Reconstruction Example

The core principle of WatchTransfer is that `event_time` is more important than `received_at`. 

### Actual clinical timeline

```text
10:00 → Dr. A responsible
10:05 → Dr. A hands off to Dr. B
10:07 → Dr. B hands off to Dr. C
10:08 → Blood test result becomes available
```

But suppose events arrive at the server out of order due to network delays or batch processing:

```text
Received first: 10:07 handoff → Dr. C
Received second: 10:00 responsibility event
Received third: 10:05 handoff → Dr. B
```

The system must NOT use message arrival order. It must sort using `event_time`.

Reconstructed timeline:
```text
10:00 → Dr. A
10:05 → Dr. B
10:07 → Dr. C
10:08 → Blood Test Result
```

Therefore:
```text
Trigger Time = 10:08
Responsible Clinician = Dr. C
Notification Recipient = Dr. C
```

**Key Takeaways:**
* `event_time ≠ received_at`
* `REQUEST CREATOR ≠ RESPONSIBLE CLINICIAN`
* `ACKNOWLEDGMENT TIME ≠ RESPONSIBILITY TIME`

---

## 7. Component Responsibilities

| Component               | Responsibility                                                                 |
| ----------------------- | ------------------------------------------------------------------------------ |
| React Frontend          | Dashboard, request creation, event simulation, timeline and notification views |
| Event Ingestion         | Receives and stores clinical events                                            |
| Request Manager         | Creates and manages standing requests                                          |
| Timeline Builder        | Sorts events by event_time and reconstructs responsibility                     |
| Responsibility Resolver | Determines who was responsible at the exact trigger time                       |
| Notification Manager    | Creates and routes notifications to the resolved clinician                     |
| Audit Manager           | Records important system decisions and events                                  |
| SQLite Database         | Persistent storage of project data                                             |
| API Layer               | Provides REST endpoints between frontend and backend                           |

*Note: The **Responsibility Resolver determines the recipient**, while the **Notification Manager only handles notification creation/delivery**.*

---

## 8. Edge Case Handling

### 1. Result Before Handoff
If a result becomes available before a handoff, notify the clinician responsible before the handoff.

### 2. Result Exactly at Handoff
If the result timestamp is exactly equal to a handoff timestamp, use a deterministic ordering/sequence rule so the result is always resolved consistently.

### 3. Multiple Rapid Handoffs
If several handoffs happen within a short period, reconstruct the timeline using all responsibility events sorted by `event_time`.

### 4. Out-of-Order Events
If events arrive at the server in the wrong order, store them and reconstruct the timeline using `event_time`, not `received_at`.

### 5. Delayed Acknowledgment
An acknowledgment received later must NOT change who was historically responsible at the result trigger time.
Store separately:
```text
trigger_time
responsible_clinician
notification_time
acknowledged_at
```

### 6. Duplicate Events
Use a unique `event_id` or equivalent validation to prevent duplicate events from corrupting the timeline.

### 7. Invalid Timestamp
Validate timestamps before processing events and reject invalid input.

### 8. No Active Standing Request
If a result arrives without a matching active standing request, do not create a notification. Record the event in the audit log.

---

## 9. Security and Validation

For this hackathon MVP, security and validation focus on data integrity rather than complex infrastructure:

* **Pydantic Validation:** All API inputs must be validated using FastAPI's Pydantic schemas.
* **Patient ID Validation:** Enforce existence checks for Patient IDs.
* **Clinician ID Validation:** Enforce existence checks for Clinician IDs.
* **Timestamp Validation:** Ensure all timestamps are valid dates/times and reject malformed inputs.
* **Duplicate Detection:** Use `event_id` uniqueness to prevent duplicate events.
* **Transition Validation:** Validate responsibility transitions where possible (e.g., clinician must be currently responsible to hand off).
* **Audit Immutability:** Audit records should not be editable through normal UI operations.
* **Data Privacy:** Avoid displaying unnecessary patient information.
* **No Unnecessary Infrastructure:** Do NOT introduce complex authentication, OAuth, Kubernetes, Redis, Kafka, Firebase, or other infrastructure unless specifically required.

---

## 10. Project Structure

```text
WatchTransfer/
│
├── README.md
├── ARCHITECTURE.md
│
├── backend/
│   ├── main.py
│   ├── database.py
│   ├── models.py
│   ├── schemas.py
│   │
│   ├── routers/
│   │   ├── patients.py
│   │   ├── clinicians.py
│   │   ├── requests.py
│   │   ├── handoffs.py
│   │   ├── results.py
│   │   ├── notifications.py
│   │   └── timeline.py
│   │
│   └── services/
│       ├── event_service.py
│       ├── timeline_service.py
│       ├── responsibility_service.py
│       ├── notification_service.py
│       └── audit_service.py
│
└── frontend/
    ├── src/
    │   ├── components/
    │   ├── pages/
    │   ├── services/
    │   ├── App.jsx
    │   └── main.jsx
    │
    └── package.json
```

* **`backend/`**: Contains the FastAPI application, SQLite database configuration, API routing, and core business logic (services).
* **`frontend/`**: Contains the React application, reusable components, page views, and API integration.

---

## 11. Hackathon Demo Flow

1. Create Patient Ravi (P001)
2. Dr. A creates a standing request: "Notify me when Ravi's blood test result becomes available."
3. Responsibility timeline:
   * 10:00 → Dr. A
   * 10:05 → Dr. B
   * 10:07 → Dr. C
4. Send the handoff events out of order.
5. System stores the events with `event_time` and `received_at`.
6. Timeline Builder reconstructs the correct chronological order.
7. Blood test result becomes available at 10:08.
8. Responsibility Resolver checks responsibility at 10:08.
9. System identifies Dr. C.
10. Notification Manager creates a notification for Dr. C.
11. Dr. C acknowledges at 10:20.
12. Audit log records the complete decision.

**Demo Outcome:**
```text
REQUEST CREATOR: Dr. A
RESPONSIBLE AT TRIGGER: Dr. C
NOTIFICATION RECIPIENT: Dr. C
ACKNOWLEDGED BY: Dr. C
```

---

## 12. Future Scalability

While the current MVP uses a simple technology stack, the system is designed to scale with these future enhancements (NOT part of the MVP):

* PostgreSQL instead of SQLite
* Real hospital/EHR event integrations
* Secure authentication and role-based access
* Real notification channels such as email/SMS/push
* Event queues for high-volume systems
* Distributed event processing
* Advanced audit and compliance controls

---

### Important Architecture Principle

```text
EVENT TIME
     ↓
RESPONSIBILITY AT TRIGGER TIME
     ↓
CORRECT CLINICIAN
     ↓
NOTIFICATION
```

**Never make the following assumptions:**
* `Request Creator = Notification Recipient`
* `Latest Received Event = Latest Clinical Event`
* `Acknowledgment Time = Responsibility Time`

**The architecture must always distinguish:**
* `event_time` → when the clinical event actually happened
* `received_at` → when the system received the event
* `trigger_time` → time at which the result became available
* `acknowledged_at` → when the clinician acknowledged the notification
