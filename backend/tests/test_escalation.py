from datetime import datetime, timezone, timedelta
import pytest
from models import Clinician, Patient, StandingRequest, ResponsibilityEvent, ResultEvent, Notification, AuditLog
from services.audit_service import AuditEventType


def setup_base_clinicians(client):
    """Helper to ensure C001, C002, C003, C004 exist with default AVAILABLE status."""
    for cid, name, role in [
        ("C001", "Dr. Clinician One", "Attending"),
        ("C002", "Dr. Clinician Two", "Fellow"),
        ("C003", "Dr. Clinician Three", "Resident"),
        ("C004", "Dr. Clinician Four", "Hospitalist"),
    ]:
        client.post("/clinicians/", json={
            "clinician_id": cid,
            "name": name,
            "role": role,
            "department": "Internal Medicine",
            "availability_status": "AVAILABLE"
        })


def test_scenario_1_available_clinician(client):
    """
    TEST 1: Available clinician
    C001 is responsible at trigger time.
    C001 is AVAILABLE.
    Result arrives -> Notification recipient is C001, Escalation level = 0, Status = PENDING.
    """
    setup_base_clinicians(client)

    # Patient and Request
    client.post("/patients/", json={"patient_id": "P_T1", "name": "Patient T1"})
    client.post("/requests/", json={
        "request_id": "REQ_T1",
        "patient_id": "P_T1",
        "requested_by": "C001",
        "result_type": "Potassium",
        "condition": "value > 5.0",
        "status": "ACTIVE"
    })

    # C001 is responsible from 10:00
    client.post("/handoffs/", json={
        "event_id": "H_T1",
        "patient_id": "P_T1",
        "from_clinician": None,
        "to_clinician": "C001",
        "event_time": "2026-09-05T10:00:00",
        "received_at": "2026-09-05T10:00:00",
        "source": "SYS"
    })

    # Ensure C001 is AVAILABLE
    client.patch("/clinicians/C001/availability", json={"availability_status": "AVAILABLE"})

    # Result arrives at 10:08
    res = client.post("/results/", json={
        "result_id": "RES_T1",
        "patient_id": "P_T1",
        "result_type": "Potassium",
        "result_data": "5.8",
        "event_time": "2026-09-05T10:08:00",
        "received_at": "2026-09-05T10:08:05"
    })
    assert res.status_code == 200

    notifs = client.get("/notifications/").json()
    notif = next(n for n in notifs if n["result_id"] == "RES_T1")

    assert notif["original_responsible_clinician_id"] == "C001"
    assert notif["recipient_clinician_id"] == "C001"
    assert notif["clinician_id"] == "C001"
    assert notif["escalation_level"] == 0
    assert notif["status"] == "PENDING"


def test_scenario_2_responsible_clinician_unavailable(client):
    """
    TEST 2: Responsible clinician unavailable
    C001 is responsible at trigger time.
    C001 is OFF_DUTY with backup C002 (AVAILABLE).
    Result arrives -> Historical responsibility = C001, Recipient = C002, Escalation level = 1.
    """
    setup_base_clinicians(client)

    client.post("/patients/", json={"patient_id": "P_T2", "name": "Patient T2"})
    client.post("/requests/", json={
        "request_id": "REQ_T2",
        "patient_id": "P_T2",
        "requested_by": "C001",
        "result_type": "Troponin",
        "condition": "value > 0.04",
        "status": "ACTIVE"
    })

    # Responsibility to C001
    client.post("/handoffs/", json={
        "event_id": "H_T2",
        "patient_id": "P_T2",
        "from_clinician": None,
        "to_clinician": "C001",
        "event_time": "2026-09-05T10:00:00",
        "received_at": "2026-09-05T10:00:00",
        "source": "SYS"
    })

    # C001 is OFF_DUTY with backup C002
    client.patch("/clinicians/C001/availability", json={
        "availability_status": "OFF_DUTY",
        "backup_clinician_id": "C002"
    })
    client.patch("/clinicians/C002/availability", json={"availability_status": "AVAILABLE"})

    res = client.post("/results/", json={
        "result_id": "RES_T2",
        "patient_id": "P_T2",
        "result_type": "Troponin",
        "result_data": "0.15",
        "event_time": "2026-09-05T10:08:00",
        "received_at": "2026-09-05T10:08:05"
    })
    assert res.status_code == 200

    notifs = client.get("/notifications/").json()
    notif = next(n for n in notifs if n["result_id"] == "RES_T2")

    # Historical responsibility remains C001!
    assert notif["original_responsible_clinician_id"] == "C001"
    # Recipient escalated to C002!
    assert notif["recipient_clinician_id"] == "C002"
    assert notif["clinician_id"] == "C002"
    assert notif["escalation_level"] == 1
    assert notif["status"] == "ESCALATED"
    assert "OFF_DUTY" in notif["escalation_reason"]


def test_scenario_3_responsible_clinician_on_call(client):
    """
    TEST 3: Responsible clinician ON_CALL
    C001 is responsible at trigger time.
    C001 is ON_CALL.
    Result arrives -> Notification -> C001, Escalation level = 0.
    """
    setup_base_clinicians(client)

    client.post("/patients/", json={"patient_id": "P_T3", "name": "Patient T3"})
    client.post("/requests/", json={
        "request_id": "REQ_T3",
        "patient_id": "P_T3",
        "requested_by": "C001",
        "result_type": "Sodium",
        "condition": "value < 130",
        "status": "ACTIVE"
    })

    client.post("/handoffs/", json={
        "event_id": "H_T3",
        "patient_id": "P_T3",
        "from_clinician": None,
        "to_clinician": "C001",
        "event_time": "2026-09-05T10:00:00",
        "received_at": "2026-09-05T10:00:00",
        "source": "SYS"
    })

    client.patch("/clinicians/C001/availability", json={"availability_status": "ON_CALL"})

    res = client.post("/results/", json={
        "result_id": "RES_T3",
        "patient_id": "P_T3",
        "result_type": "Sodium",
        "result_data": "125",
        "event_time": "2026-09-05T10:08:00",
        "received_at": "2026-09-05T10:08:05"
    })
    assert res.status_code == 200

    notifs = client.get("/notifications/").json()
    notif = next(n for n in notifs if n["result_id"] == "RES_T3")

    assert notif["original_responsible_clinician_id"] == "C001"
    assert notif["recipient_clinician_id"] == "C001"
    assert notif["escalation_level"] == 0
    assert notif["status"] == "PENDING"


def test_scenario_4_no_backup_available(client):
    """
    TEST 4: No backup available
    C001 is responsible at trigger time.
    C001 is OFF_DUTY, no other clinician is available.
    Result arrives -> Notification must NOT be silently dropped.
    Status = ESCALATION_REQUIRED. Audit entry created.
    """
    setup_base_clinicians(client)

    # Set all clinicians to OFF_DUTY
    for cid in ["C001", "C002", "C003", "C004"]:
        client.patch(f"/clinicians/{cid}/availability", json={"availability_status": "OFF_DUTY"})

    client.post("/patients/", json={"patient_id": "P_T4", "name": "Patient T4"})
    client.post("/requests/", json={
        "request_id": "REQ_T4",
        "patient_id": "P_T4",
        "requested_by": "C001",
        "result_type": "Glucose",
        "condition": "value > 250",
        "status": "ACTIVE"
    })

    client.post("/handoffs/", json={
        "event_id": "H_T4",
        "patient_id": "P_T4",
        "from_clinician": None,
        "to_clinician": "C001",
        "event_time": "2026-09-05T10:00:00",
        "received_at": "2026-09-05T10:00:00",
        "source": "SYS"
    })

    res = client.post("/results/", json={
        "result_id": "RES_T4",
        "patient_id": "P_T4",
        "result_type": "Glucose",
        "result_data": "300",
        "event_time": "2026-09-05T10:08:00",
        "received_at": "2026-09-05T10:08:05"
    })
    assert res.status_code == 200

    notifs = client.get("/notifications/").json()
    notif = next(n for n in notifs if n["result_id"] == "RES_T4")

    assert notif["original_responsible_clinician_id"] == "C001"
    assert notif["status"] == "ESCALATION_REQUIRED"

    # Verify audit trail contains ESCALATION_REQUIRED
    audits = client.get("/patients/P_T4/audit").json()
    assert any(a["event_type"] == AuditEventType.ESCALATION_REQUIRED for a in audits)


def test_scenario_5_delayed_acknowledgment(client):
    """
    TEST 5: Delayed acknowledgment (SLA Breach)
    C001 receives notification at Level 0.
    Acknowledgment SLA is breached -> Escalated to backup clinician (Level 1).
    """
    setup_base_clinicians(client)

    client.patch("/clinicians/C001/availability", json={
        "availability_status": "AVAILABLE",
        "backup_clinician_id": "C002"
    })
    client.patch("/clinicians/C002/availability", json={"availability_status": "AVAILABLE"})

    client.post("/patients/", json={"patient_id": "P_T5", "name": "Patient T5"})
    client.post("/requests/", json={
        "request_id": "REQ_T5",
        "patient_id": "P_T5",
        "requested_by": "C001",
        "result_type": "Hemoglobin",
        "condition": "value < 7.0",
        "status": "ACTIVE"
    })

    client.post("/handoffs/", json={
        "event_id": "H_T5",
        "patient_id": "P_T5",
        "from_clinician": None,
        "to_clinician": "C001",
        "event_time": "2026-09-05T10:00:00",
        "received_at": "2026-09-05T10:00:00",
        "source": "SYS"
    })

    client.post("/results/", json={
        "result_id": "RES_T5",
        "patient_id": "P_T5",
        "result_type": "Hemoglobin",
        "result_data": "6.2",
        "event_time": "2026-09-05T10:08:00",
        "received_at": "2026-09-05T10:08:05"
    })

    notifs = client.get("/notifications/").json()
    notif = next(n for n in notifs if n["result_id"] == "RES_T5")
    assert notif["recipient_clinician_id"] == "C001"
    assert notif["escalation_level"] == 0

    # Trigger SLA escalation check
    escalated_res = client.post(f"/notifications/{notif['notification_id']}/escalate?reason=Acknowledgment+SLA+breach")
    assert escalated_res.status_code == 200
    escalated = escalated_res.json()

    assert escalated["original_responsible_clinician_id"] == "C001"
    assert escalated["recipient_clinician_id"] == "C002"
    assert escalated["escalation_level"] == 1
    assert escalated["status"] == "ESCALATED"

    # Verify audit entry
    audits = client.get("/patients/P_T5/audit").json()
    assert any(a["event_type"] == AuditEventType.NOTIFICATION_ESCALATED for a in audits)


def test_scenario_6_acknowledgment_before_sla(client):
    """
    TEST 6: Acknowledgment before SLA
    C001 receives notification, acknowledges it -> No escalation occurs on SLA check.
    """
    setup_base_clinicians(client)

    client.patch("/clinicians/C001/availability", json={
        "availability_status": "AVAILABLE",
        "backup_clinician_id": "C002"
    })

    client.post("/patients/", json={"patient_id": "P_T6", "name": "Patient T6"})
    client.post("/requests/", json={
        "request_id": "REQ_T6",
        "patient_id": "P_T6",
        "requested_by": "C001",
        "result_type": "Lactate",
        "condition": "value > 2.0",
        "status": "ACTIVE"
    })

    client.post("/handoffs/", json={
        "event_id": "H_T6",
        "patient_id": "P_T6",
        "from_clinician": None,
        "to_clinician": "C001",
        "event_time": "2026-09-05T10:00:00",
        "received_at": "2026-09-05T10:00:00",
        "source": "SYS"
    })

    client.post("/results/", json={
        "result_id": "RES_T6",
        "patient_id": "P_T6",
        "result_type": "Lactate",
        "result_data": "3.5",
        "event_time": "2026-09-05T10:08:00",
        "received_at": "2026-09-05T10:08:05"
    })

    notifs = client.get("/notifications/").json()
    notif = next(n for n in notifs if n["result_id"] == "RES_T6")

    # Acknowledge before SLA
    ack_res = client.patch(f"/notifications/{notif['notification_id']}/acknowledge")
    assert ack_res.status_code == 200
    assert ack_res.json()["status"] == "ACKNOWLEDGED"

    # Running SLA breach check should NOT escalate acknowledged notification
    sla_res = client.post("/notifications/escalate-sla-breaches")
    assert sla_res.status_code == 200

    notif_after = client.get(f"/notifications/").json()
    n = next(x for x in notif_after if x["notification_id"] == notif["notification_id"])
    assert n["status"] == "ACKNOWLEDGED"
    assert n["recipient_clinician_id"] == "C001"
    assert n["escalation_level"] == 0


def test_scenario_7_responsibility_plus_availability_combination(client):
    """
    TEST 7: Responsibility + availability combination
    10:05 C001 -> C002
    10:07 C002 -> C003
    10:08 Result arrives
    C003 is OFF_DUTY, C004 is backup and AVAILABLE.
    Historical responsible = C003 (NOT C001, NOT C002, NOT C004).
    Final recipient = C004.
    """
    setup_base_clinicians(client)

    client.post("/patients/", json={"patient_id": "P_T7", "name": "Patient T7"})
    client.post("/requests/", json={
        "request_id": "REQ_T7",
        "patient_id": "P_T7",
        "requested_by": "C001",  # Creator is C001
        "result_type": "Potassium",
        "condition": "value > 5.0",
        "status": "ACTIVE"
    })

    # Handoffs
    client.post("/handoffs/", json={
        "event_id": "H_T7_1",
        "patient_id": "P_T7",
        "from_clinician": "C001",
        "to_clinician": "C002",
        "event_time": "2026-09-05T10:05:00",
        "received_at": "2026-09-05T10:05:00",
        "source": "SYS"
    })

    client.post("/handoffs/", json={
        "event_id": "H_T7_2",
        "patient_id": "P_T7",
        "from_clinician": "C002",
        "to_clinician": "C003",
        "event_time": "2026-09-05T10:07:00",
        "received_at": "2026-09-05T10:07:00",
        "source": "SYS"
    })

    # Availability: C003 is OFF_DUTY, C004 is backup
    client.patch("/clinicians/C003/availability", json={
        "availability_status": "OFF_DUTY",
        "backup_clinician_id": "C004"
    })
    client.patch("/clinicians/C004/availability", json={"availability_status": "AVAILABLE"})

    # Result at 10:08
    res = client.post("/results/", json={
        "result_id": "RES_T7",
        "patient_id": "P_T7",
        "result_type": "Potassium",
        "result_data": "6.0",
        "event_time": "2026-09-05T10:08:00",
        "received_at": "2026-09-05T10:08:05"
    })
    assert res.status_code == 200

    notifs = client.get("/notifications/").json()
    notif = next(n for n in notifs if n["result_id"] == "RES_T7")

    # Invariants strictly verified:
    assert notif["original_responsible_clinician_id"] == "C003"
    assert notif["recipient_clinician_id"] == "C004"
    assert notif["escalation_level"] == 1
    assert notif["status"] == "ESCALATED"


def test_scenario_8_out_of_order_handoffs(client):
    """
    TEST 8: Out-of-order handoffs
    H002 (10:07 C002->C003) arrives before H001 (10:05 C001->C002).
    C003 is OFF_DUTY, C004 is backup.
    Result at 10:08 -> Historical responsible is C003 (determined strictly by event_time).
    Recipient is C004.
    """
    setup_base_clinicians(client)

    client.post("/patients/", json={"patient_id": "P_T8", "name": "Patient T8"})
    client.post("/requests/", json={
        "request_id": "REQ_T8",
        "patient_id": "P_T8",
        "requested_by": "C001",
        "result_type": "Creatinine",
        "condition": "value > 1.5",
        "status": "ACTIVE"
    })

    # Arrive out of order: 10:07 first
    client.post("/handoffs/", json={
        "event_id": "H_T8_2",
        "patient_id": "P_T8",
        "from_clinician": "C002",
        "to_clinician": "C003",
        "event_time": "2026-09-05T10:07:00",
        "received_at": "2026-09-05T10:07:00",
        "source": "SYS"
    })

    # Then 10:05 arrives late
    client.post("/handoffs/", json={
        "event_id": "H_T8_1",
        "patient_id": "P_T8",
        "from_clinician": "C001",
        "to_clinician": "C002",
        "event_time": "2026-09-05T10:05:00",
        "received_at": "2026-09-05T10:07:30",
        "source": "SYS"
    })

    client.patch("/clinicians/C003/availability", json={
        "availability_status": "OFF_DUTY",
        "backup_clinician_id": "C004"
    })
    client.patch("/clinicians/C004/availability", json={"availability_status": "AVAILABLE"})

    res = client.post("/results/", json={
        "result_id": "RES_T8",
        "patient_id": "P_T8",
        "result_type": "Creatinine",
        "result_data": "2.1",
        "event_time": "2026-09-05T10:08:00",
        "received_at": "2026-09-05T10:08:05"
    })
    assert res.status_code == 200

    notifs = client.get("/notifications/").json()
    notif = next(n for n in notifs if n["result_id"] == "RES_T8")

    assert notif["original_responsible_clinician_id"] == "C003"
    assert notif["recipient_clinician_id"] == "C004"


def test_scenario_9_delayed_handoff_re_evaluation(client):
    """
    TEST 9: Delayed handoff
    Result arrives before a late handoff message is received.
    When the late handoff arrives (with event_time < result trigger time),
    the system re-evaluates according to late-event logic without using received_at.
    """
    setup_base_clinicians(client)

    client.post("/patients/", json={"patient_id": "P_T9", "name": "Patient T9"})
    client.post("/requests/", json={
        "request_id": "REQ_T9",
        "patient_id": "P_T9",
        "requested_by": "C001",
        "result_type": "WBC",
        "condition": "value > 12.0",
        "status": "ACTIVE"
    })

    # Initial handoff: C001 -> C002 at 10:00
    client.post("/handoffs/", json={
        "event_id": "H_T9_INIT",
        "patient_id": "P_T9",
        "from_clinician": "C001",
        "to_clinician": "C002",
        "event_time": "2026-09-05T10:00:00",
        "received_at": "2026-09-05T10:00:00",
        "source": "SYS"
    })

    # Result arrives at 10:08 BEFORE the 10:06 handoff is received
    client.post("/results/", json={
        "result_id": "RES_T9",
        "patient_id": "P_T9",
        "result_type": "WBC",
        "result_data": "15.4",
        "event_time": "2026-09-05T10:08:00",
        "received_at": "2026-09-05T10:08:05"
    })

    notif_initial = next(n for n in client.get("/notifications/").json() if n["result_id"] == "RES_T9")
    assert notif_initial["original_responsible_clinician_id"] == "C002"

    # Now a late handoff arrives: C002 -> C003 occurred at 10:06 (prior to result at 10:08)
    client.post("/handoffs/", json={
        "event_id": "H_T9_LATE",
        "patient_id": "P_T9",
        "from_clinician": "C002",
        "to_clinician": "C003",
        "event_time": "2026-09-05T10:06:00",
        "received_at": "2026-09-05T10:15:00",  # Late packet arrival
        "source": "SYS"
    })

    # Verify notification was re-evaluated!
    notif_reval = next(n for n in client.get("/notifications/").json() if n["result_id"] == "RES_T9")
    assert notif_reval["original_responsible_clinician_id"] == "C003"

    # Verify audit trail recorded RESULT_RE_EVALUATED
    audits = client.get("/patients/P_T9/audit").json()
    assert any(a["event_type"] == AuditEventType.RESULT_RE_EVALUATED for a in audits)


def test_scenario_10_duplicate_escalation_prevention(client):
    """
    TEST 10: Duplicate escalation and loop prevention
    Notification must not repeatedly escalate to the same clinician.
    Prevent escalation loops and duplicate escalation records.
    """
    setup_base_clinicians(client)

    client.patch("/clinicians/C001/availability", json={
        "availability_status": "AVAILABLE",
        "backup_clinician_id": "C002"
    })
    client.patch("/clinicians/C002/availability", json={
        "availability_status": "AVAILABLE",
        "backup_clinician_id": "C001"  # Potential circular backup!
    })
    client.patch("/clinicians/C003/availability", json={"availability_status": "OFF_DUTY"})
    client.patch("/clinicians/C004/availability", json={"availability_status": "OFF_DUTY"})

    client.post("/patients/", json={"patient_id": "P_T10", "name": "Patient T10"})
    client.post("/requests/", json={
        "request_id": "REQ_T10",
        "patient_id": "P_T10",
        "requested_by": "C001",
        "result_type": "Platelets",
        "condition": "value < 50",
        "status": "ACTIVE"
    })

    client.post("/handoffs/", json={
        "event_id": "H_T10",
        "patient_id": "P_T10",
        "from_clinician": None,
        "to_clinician": "C001",
        "event_time": "2026-09-05T10:00:00",
        "received_at": "2026-09-05T10:00:00",
        "source": "SYS"
    })

    client.post("/results/", json={
        "result_id": "RES_T10",
        "patient_id": "P_T10",
        "result_type": "Platelets",
        "result_data": "35",
        "event_time": "2026-09-05T10:08:00",
        "received_at": "2026-09-05T10:08:05"
    })

    notif = next(n for n in client.get("/notifications/").json() if n["result_id"] == "RES_T10")
    nid = notif["notification_id"]

    # First escalation: C001 -> C002 (Level 1)
    e1 = client.post(f"/notifications/{nid}/escalate").json()
    assert e1["escalation_level"] == 1
    assert e1["recipient_clinician_id"] == "C002"

    # Second escalation: C002 cannot escalate back to C001 (circular prevention!)
    # And since C003 and C004 are OFF_DUTY, no available clinician remains -> ESCALATION_REQUIRED
    e2 = client.post(f"/notifications/{nid}/escalate").json()
    assert e2["status"] == "ESCALATION_REQUIRED"

    # Repeated calls should NOT loop or duplicate escalate
    e3 = client.post(f"/notifications/{nid}/escalate").json()
    assert e3["status"] == "ESCALATION_REQUIRED"
    assert e3["recipient_clinician_id"] == "C002"
