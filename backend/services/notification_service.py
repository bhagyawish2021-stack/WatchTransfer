import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session

from models import StandingRequest, Notification
from services.responsibility_service import resolve_responsible_clinician
from services.audit_service import create_audit_log, AuditEventType
from services.escalation_service import (
    resolve_notification_recipient,
    NOTIFICATION_ACK_SLA_MINUTES,
)


def process_result(result_event, db: Session):
    """
    Called after a ResultEvent is persisted.

    Flow:
      1. Emit RESULT_RECEIVED audit record.
      2. Find active standing request for this patient + result_type.
      3. Resolve responsible clinician at the result's event_time (Historical Responsibility).
      4. Emit RESPONSIBILITY_RESOLVED audit record.
      5. Check clinician availability and determine operational notification recipient.
      6. Create Notification row with original_responsible_clinician_id and recipient_clinician_id.
      7. Emit NOTIFICATION_CREATED and NOTIFICATION_ESCALATED / ESCALATION_REQUIRED audit records.

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
            "received_at": result_event.received_at.isoformat() if hasattr(result_event.received_at, "isoformat") else str(result_event.received_at),
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

    # ── 3. Resolve responsible clinician (HISTORICAL RESPONSIBILITY) ─────────
    responsible_clinician_id = resolve_responsible_clinician(
        result_event.patient_id,
        result_event.event_time,
        db
    )

    if not responsible_clinician_id:
        return None

    # ── 4. RESPONSIBILITY_RESOLVED audit ────────────────────────────────────
    create_audit_log(
        db=db,
        event_type=AuditEventType.RESPONSIBILITY_RESOLVED,
        description=(
            f"Responsibility resolved to clinician {responsible_clinician_id} "
            f"for patient {result_event.patient_id}"
        ),
        patient_id=result_event.patient_id,
        entity_type="RESULT",
        entity_id=result_event.result_id,
        event_time=result_event.event_time,
        extra_metadata={
            "trigger_time": result_event.event_time.isoformat() if hasattr(result_event.event_time, "isoformat") else str(result_event.event_time),
            "responsible_clinician": responsible_clinician_id,
            "resolution_method": "event_time",
        },
    )

    # ── 5. Availability Check & Escalation Resolution ───────────────────────
    routing = resolve_notification_recipient(responsible_clinician_id, db)
    recipient_id = routing["recipient_id"]
    escalation_level = routing["escalation_level"]
    escalation_reason = routing["escalation_reason"]
    status = routing["status"]

    now = datetime.now(timezone.utc)
    ack_deadline = now + timedelta(minutes=NOTIFICATION_ACK_SLA_MINUTES)

    # ── 6. Create Notification ───────────────────────────────────────────────
    notification_id = f"N-{uuid.uuid4().hex[:8].upper()}"
    notification = Notification(
        notification_id=notification_id,
        result_id=result_event.result_id,
        patient_id=result_event.patient_id,
        clinician_id=recipient_id,
        original_responsible_clinician_id=responsible_clinician_id,
        recipient_clinician_id=recipient_id,
        escalation_level=escalation_level,
        escalation_reason=escalation_reason,
        message=(
            f"{result_event.result_type} result is available for patient "
            f"{result_event.patient_id}."
        ),
        trigger_time=result_event.event_time,
        status=status,
        ack_deadline=ack_deadline,
    )

    db.add(notification)
    db.commit()
    db.refresh(notification)

    # ── 7. Audit records ───────────────────────────────────────────────────
    # A) NOTIFICATION_CREATED (always records recipient and original responsible)
    created_reason = "Responsible at trigger time" if escalation_level == 0 else (escalation_reason or "Escalated")
    create_audit_log(
        db=db,
        event_type=AuditEventType.NOTIFICATION_CREATED,
        description=(
            f"Notification {notification_id} created for clinician {recipient_id}"
        ),
        patient_id=result_event.patient_id,
        entity_type="NOTIFICATION",
        entity_id=notification_id,
        event_time=result_event.event_time,
        extra_metadata={
            "recipient": recipient_id,
            "original_responsible": responsible_clinician_id,
            "result_id": result_event.result_id,
            "reason": created_reason,
            "escalation_level": escalation_level,
            "status": status,
        },
    )

    # B) NOTIFICATION_ESCALATED if routed away from responsible clinician
    if status == "ESCALATED":
        create_audit_log(
            db=db,
            event_type=AuditEventType.NOTIFICATION_ESCALATED,
            description=(
                f"Notification {notification_id} escalated to {recipient_id} "
                f"(Level {escalation_level}): {escalation_reason}"
            ),
            patient_id=result_event.patient_id,
            entity_type="NOTIFICATION",
            entity_id=notification_id,
            event_time=result_event.event_time,
            extra_metadata={
                "original_responsible": responsible_clinician_id,
                "original_recipient": responsible_clinician_id,
                "escalated_to": recipient_id,
                "escalation_level": escalation_level,
                "reason": escalation_reason,
            },
        )
    elif status == "ESCALATION_REQUIRED":
        create_audit_log(
            db=db,
            event_type=AuditEventType.ESCALATION_REQUIRED,
            description=(
                f"Notification {notification_id} requires escalation: {escalation_reason}"
            ),
            patient_id=result_event.patient_id,
            entity_type="NOTIFICATION",
            entity_id=notification_id,
            event_time=result_event.event_time,
            extra_metadata={
                "original_responsible": responsible_clinician_id,
                "reason": escalation_reason,
                "status": "ESCALATION_REQUIRED",
            },
        )

    return notification
