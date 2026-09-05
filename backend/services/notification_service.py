import uuid
from datetime import datetime
from sqlalchemy.orm import Session

from models import StandingRequest, Notification
from services.responsibility_service import resolve_responsible_clinician
from services.audit_service import create_audit_log, AuditEventType


def process_result(result_event, db: Session):
    """
    Called after a ResultEvent is persisted.

    Flow:
      1. Emit RESULT_RECEIVED audit record.
      2. Find active standing request for this patient + result_type.
      3. Resolve responsible clinician at the result's event_time.
      4. Emit RESPONSIBILITY_RESOLVED audit record (the most important one).
      5. Create Notification row.
      6. Emit NOTIFICATION_CREATED audit record.

    Returns the created Notification, or None if no match / no clinician found.
    """

    # ── 1. RESULT_RECEIVED audit ────────────────────────────────────────────
    create_audit_log(
        db=db,
        event_type=AuditEventType.RESULT_RECEIVED,
        description=(
            f"{result_event.result_type} result received for patient "
            f"{result_event.patient_id}"
        ),
        patient_id=result_event.patient_id,
        entity_type="RESULT",
        entity_id=result_event.result_id,
        event_time=result_event.event_time,
        extra_metadata={
            "result_type": result_event.result_type,
            "received_at": result_event.received_at.isoformat(),
        },
    )

    # ── 2. Find active standing request ─────────────────────────────────────
    request = db.query(StandingRequest).filter(
        StandingRequest.patient_id == result_event.patient_id,
        StandingRequest.result_type == result_event.result_type,
        StandingRequest.status == "ACTIVE"
    ).first()

    if not request:
        return None

    # ── 3. Resolve responsible clinician ────────────────────────────────────
    clinician_id = resolve_responsible_clinician(
        result_event.patient_id,
        result_event.event_time,
        db
    )

    # ── 4. RESPONSIBILITY_RESOLVED audit ────────────────────────────────────
    if clinician_id:
        create_audit_log(
            db=db,
            event_type=AuditEventType.RESPONSIBILITY_RESOLVED,
            description=(
                f"Responsibility resolved to clinician {clinician_id} "
                f"for patient {result_event.patient_id}"
            ),
            patient_id=result_event.patient_id,
            entity_type="RESULT",
            entity_id=result_event.result_id,
            event_time=result_event.event_time,
            extra_metadata={
                "trigger_time": result_event.event_time.isoformat(),
                "responsible_clinician": clinician_id,
                "resolution_method": "event_time",
            },
        )
    else:
        return None

    # ── 5. Create Notification ───────────────────────────────────────────────
    notification_id = f"N-{uuid.uuid4().hex[:8].upper()}"
    notification = Notification(
        notification_id=notification_id,
        result_id=result_event.result_id,
        patient_id=result_event.patient_id,
        clinician_id=clinician_id,
        message=(
            f"{result_event.result_type} result is available for patient "
            f"{result_event.patient_id}."
        ),
        trigger_time=result_event.event_time,
        status="PENDING"
    )

    db.add(notification)
    db.commit()
    db.refresh(notification)

    # ── 6. NOTIFICATION_CREATED audit ───────────────────────────────────────
    create_audit_log(
        db=db,
        event_type=AuditEventType.NOTIFICATION_CREATED,
        description=(
            f"Notification {notification_id} created for clinician {clinician_id}"
        ),
        patient_id=result_event.patient_id,
        entity_type="NOTIFICATION",
        entity_id=notification_id,
        event_time=result_event.event_time,
        extra_metadata={
            "recipient": clinician_id,
            "result_id": result_event.result_id,
            "reason": "Responsible at trigger time",
        },
    )

    return notification
