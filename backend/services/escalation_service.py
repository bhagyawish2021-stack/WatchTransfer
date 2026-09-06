from datetime import datetime, timezone, timedelta
from typing import Optional, Set
from sqlalchemy.orm import Session

import models
from services.audit_service import create_audit_log, AuditEventType

# Centralized SLA Configuration (Minutes)
NOTIFICATION_ACK_SLA_MINUTES = 5

# Set of statuses considered available for immediate clinical notification
AVAILABLE_STATUSES = {"AVAILABLE", "ON_CALL"}


def is_clinician_available_for_alert(status: str) -> bool:
    """Return True if clinician availability status allows immediate notification dispatch."""
    return status in AVAILABLE_STATUSES


def resolve_notification_recipient(
    original_responsible_id: str,
    db: Session
) -> dict:
    """
    Determine initial notification recipient based on responsible clinician's availability.

    Deterministic Rules:
    - If responsible clinician is AVAILABLE or ON_CALL:
        Recipient = responsible clinician, escalation_level = 0, status = "PENDING"
    - If responsible clinician is UNAVAILABLE, OFF_DUTY, or BUSY:
        1. Check responsible clinician's configured backup_clinician_id.
           If backup is available -> Recipient = backup, escalation_level = 1, status = "ESCALATED"
        2. If backup is not configured or unavailable:
           Search for an ON_CALL or AVAILABLE clinician.
           If found -> Recipient = on-call clinician, escalation_level = 1 (or 2), status = "ESCALATED"
        3. If no available clinician exists anywhere:
           Recipient = responsible clinician (fallback), escalation_level = 1, status = "ESCALATION_REQUIRED"
    """
    resp_clinician = db.query(models.Clinician).filter(
        models.Clinician.clinician_id == original_responsible_id
    ).first()

    status = resp_clinician.availability_status if resp_clinician else "AVAILABLE"

    # Rule 1 & 2: Available or On-Call
    if is_clinician_available_for_alert(status):
        return {
            "recipient_id": original_responsible_id,
            "escalation_level": 0,
            "escalation_reason": None,
            "status": "PENDING"
        }

    reason_prefix = f"Responsible clinician {original_responsible_id} is {status}"

    # Rule 4: Check designated backup clinician
    if resp_clinician and resp_clinician.backup_clinician_id:
        backup = db.query(models.Clinician).filter(
            models.Clinician.clinician_id == resp_clinician.backup_clinician_id
        ).first()

        if backup and is_clinician_available_for_alert(backup.availability_status):
            return {
                "recipient_id": backup.clinician_id,
                "escalation_level": 1,
                "escalation_reason": f"{reason_prefix} (routed to backup {backup.clinician_id})",
                "status": "ESCALATED"
            }

    # Fallback to any ON_CALL or AVAILABLE clinician
    excluded_ids = {original_responsible_id}
    if resp_clinician and resp_clinician.backup_clinician_id:
        excluded_ids.add(resp_clinician.backup_clinician_id)

    # Prefer ON_CALL first, then AVAILABLE
    on_call_clinician = db.query(models.Clinician).filter(
        ~models.Clinician.clinician_id.in_(excluded_ids),
        models.Clinician.availability_status == "ON_CALL"
    ).first()

    if not on_call_clinician:
        on_call_clinician = db.query(models.Clinician).filter(
            ~models.Clinician.clinician_id.in_(excluded_ids),
            models.Clinician.availability_status == "AVAILABLE"
        ).first()

    if on_call_clinician:
        level = 1 if not (resp_clinician and resp_clinician.backup_clinician_id) else 2
        return {
            "recipient_id": on_call_clinician.clinician_id,
            "escalation_level": level,
            "escalation_reason": f"{reason_prefix} (routed to on-call {on_call_clinician.clinician_id})",
            "status": "ESCALATED"
        }

    # Rule 5: No backup clinician exists / available
    return {
        "recipient_id": original_responsible_id,
        "escalation_level": 1,
        "escalation_reason": f"{reason_prefix} and no available backup clinician found",
        "status": "ESCALATION_REQUIRED"
    }


def escalate_notification(
    notification: models.Notification,
    db: Session,
    reason: Optional[str] = None
) -> models.Notification:
    """
    Escalate an unacknowledged notification to the next escalation tier.

    Prevents circular escalation loops by tracking previously assigned clinicians.
    Caps escalation at LEVEL 2.
    """
    if notification.status in ("ACKNOWLEDGED", "ESCALATION_REQUIRED"):
        return notification

    if notification.escalation_level >= 2:
        if notification.status != "ESCALATION_REQUIRED":
            notification.status = "ESCALATION_REQUIRED"
            notification.escalation_reason = "Maximum escalation level reached without acknowledgment"
            db.commit()
            db.refresh(notification)

            create_audit_log(
                db=db,
                event_type=AuditEventType.ESCALATION_REQUIRED,
                description=(
                    f"Notification {notification.notification_id} requires escalation: "
                    f"Max escalation tier reached without acknowledgment."
                ),
                patient_id=notification.patient_id,
                entity_type="NOTIFICATION",
                entity_id=notification.notification_id,
                event_time=datetime.now(timezone.utc),
                extra_metadata={
                    "original_responsible": notification.original_responsible_clinician_id,
                    "recipient": notification.recipient_clinician_id,
                    "escalation_level": notification.escalation_level,
                    "reason": notification.escalation_reason,
                }
            )
        return notification

    visited: Set[str] = set()
    if notification.original_responsible_clinician_id:
        visited.add(notification.original_responsible_clinician_id)
    if notification.recipient_clinician_id:
        visited.add(notification.recipient_clinician_id)
    if notification.clinician_id:
        visited.add(notification.clinician_id)

    target_clinician: Optional[models.Clinician] = None
    new_level = notification.escalation_level + 1

    # Tier 1 check: if at level 0, try original responsible's backup first
    if notification.escalation_level == 0 and notification.original_responsible_clinician_id:
        orig = db.query(models.Clinician).filter(
            models.Clinician.clinician_id == notification.original_responsible_clinician_id
        ).first()
        if orig and orig.backup_clinician_id and orig.backup_clinician_id not in visited:
            candidate = db.query(models.Clinician).filter(
                models.Clinician.clinician_id == orig.backup_clinician_id
            ).first()
            if candidate and is_clinician_available_for_alert(candidate.availability_status):
                target_clinician = candidate

    # Tier 2 check: look for ON_CALL or AVAILABLE clinician not yet visited
    if not target_clinician:
        target_clinician = db.query(models.Clinician).filter(
            ~models.Clinician.clinician_id.in_(visited),
            models.Clinician.availability_status == "ON_CALL"
        ).first()

    if not target_clinician:
        target_clinician = db.query(models.Clinician).filter(
            ~models.Clinician.clinician_id.in_(visited),
            models.Clinician.availability_status == "AVAILABLE"
        ).first()

    now = datetime.now(timezone.utc)

    if not target_clinician:
        # No further targets available
        notification.status = "ESCALATION_REQUIRED"
        notification.escalation_reason = "No available backup clinician found for escalation"
        db.commit()
        db.refresh(notification)

        create_audit_log(
            db=db,
            event_type=AuditEventType.ESCALATION_REQUIRED,
            description=(
                f"Notification {notification.notification_id} requires escalation: "
                f"No available backup clinician found"
            ),
            patient_id=notification.patient_id,
            entity_type="NOTIFICATION",
            entity_id=notification.notification_id,
            event_time=now,
            extra_metadata={
                "original_responsible": notification.original_responsible_clinician_id,
                "current_recipient": notification.recipient_clinician_id,
                "escalation_level": notification.escalation_level,
                "reason": "No available backup clinician found",
            }
        )
        return notification

    # Target successfully resolved
    previous_recipient = notification.recipient_clinician_id or notification.clinician_id
    escalation_reason = reason or "Acknowledgment SLA expired without acknowledgment"

    notification.recipient_clinician_id = target_clinician.clinician_id
    notification.clinician_id = target_clinician.clinician_id
    notification.escalation_level = new_level
    notification.status = "ESCALATED"
    notification.escalation_reason = escalation_reason
    notification.ack_deadline = now + timedelta(minutes=NOTIFICATION_ACK_SLA_MINUTES)

    db.commit()
    db.refresh(notification)

    create_audit_log(
        db=db,
        event_type=AuditEventType.NOTIFICATION_ESCALATED,
        description=(
            f"Notification {notification.notification_id} escalated from {previous_recipient} "
            f"to {target_clinician.clinician_id} (Level {new_level})"
        ),
        patient_id=notification.patient_id,
        entity_type="NOTIFICATION",
        entity_id=notification.notification_id,
        event_time=now,
        extra_metadata={
            "original_responsible": notification.original_responsible_clinician_id,
            "original_recipient": previous_recipient,
            "escalated_to": target_clinician.clinician_id,
            "escalation_level": new_level,
            "reason": escalation_reason,
        }
    )

    return notification


def check_and_escalate_sla_breaches(db: Session) -> list[models.Notification]:
    """Scan all active notifications and escalate those that exceeded their acknowledgment SLA."""
    now = datetime.now(timezone.utc)
    candidates = db.query(models.Notification).filter(
        models.Notification.status.in_(["PENDING", "ESCALATED"]),
        models.Notification.ack_deadline.isnot(None),
        models.Notification.ack_deadline <= now
    ).all()

    escalated = []
    for notif in candidates:
        updated = escalate_notification(
            notif,
            db,
            reason="Acknowledgment SLA expired without acknowledgment"
        )
        escalated.append(updated)

    return escalated
