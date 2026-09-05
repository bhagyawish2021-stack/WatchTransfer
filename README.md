# WatchTransfer

**Right Patient → Right Clinician → Right Time**

WatchTransfer is a clinical notification responsibility system designed to solve the problem of out-of-sync notifications due to patient handoffs. When a clinical result becomes available, WatchTransfer ensures the notification is sent to the clinician who was *actually responsible at the exact moment the result became available*, not necessarily the one who initially requested it.

## Features

- **Standing Requests:** Create automated notification triggers for patient results.
- **Out-of-Order Event Handling:** Reconstructs accurate patient responsibility timelines using actual event timestamps (`event_time`) rather than system receipt times (`received_at`).
- **Dynamic Responsibility Resolution:** Deterministically calculates the responsible clinician at the exact trigger time of a result.
- **Delayed Acknowledgment Tracking:** Records acknowledgments separately without modifying historical responsibility decisions.
- **Comprehensive Audit Trail:** Logs the entire decision-making process for clinical safety and accountability.

## Technology Stack

- **Frontend:** React.js (Dashboards, timeline visualization, event simulator)
- **Backend:** Python + FastAPI (REST APIs, responsibility resolver, timeline builder)
- **Database:** SQLite (Relational storage for MVP)

## Project Structure

```
WatchTransfer/
├── backend/                  # FastAPI Application
│   ├── main.py               # Entry point
│   ├── database.py           # SQLite connection & setup
│   ├── models.py             # SQLAlchemy models
│   ├── schemas.py            # Pydantic models for validation
│   ├── routers/              # API Endpoints
│   │   ├── patients.py
│   │   ├── clinicians.py
│   │   ├── requests.py
│   │   ├── handoffs.py
│   │   ├── results.py
│   │   ├── notifications.py
│   │   └── timeline.py
│   └── services/             # Business Logic
│       ├── event_service.py
│       ├── timeline_service.py
│       ├── responsibility_service.py
│       ├── notification_service.py
│       └── audit_service.py
└── frontend/                 # React Application
    ├── src/
    │   ├── components/       # Reusable UI components
    │   ├── pages/            # Dashboard, Simulator, Audit views
    │   ├── services/         # API integration (api.js)
    │   ├── App.jsx
    │   └── main.jsx
    └── package.json
```

## Setup & Installation

### Backend Setup
1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use `venv\Scripts\activate`
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the FastAPI server:
   ```bash
   uvicorn main:app --reload
   ```
   The API will be available at `http://localhost:8000`.

### Frontend Setup
1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the React development server:
   ```bash
   npm run dev
   ```
   The UI will be available at `http://localhost:5173`.

## Hackathon Demo Scenario

1. Create a patient (e.g., Ravi) and have Dr. A create a standing request for blood test results.
2. Simulate handoffs: Dr. A → Dr. B (10:05), Dr. B → Dr. C (10:07).
3. Use the Event Simulator to send these handoff events *out of order* to demonstrate the system's robustness (e.g., Dr. C's handoff arrives before Dr. B's).
4. Trigger a blood test result at 10:08.
5. Observe the Responsibility Resolver accurately identifying Dr. C as the responsible clinician and routing the notification accordingly.
6. Acknowledge the notification as Dr. C and view the unmutated historical audit log.
