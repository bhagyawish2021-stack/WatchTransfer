from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

# Import project modules
from database import get_db
from models import Notification
from schemas import NotificationResponse
from services.audit_service import create_audit_log, AuditEventType

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("/", response_model=list[NotificationResponse])
def get_notifications(db: Session = Depends(get_db)):
    return db.query(Notification).all()


@router.get("/{clinician_id}", response_model=list[NotificationResponse])
def get_clinician_notifications(clinician_id: str, db: Session = Depends(get_db)):
    return db.query(Notification).filter(
        Notification.clinician_id == clinician_id
    ).all()


@router.patch("/{notification_id}/acknowledge", response_model=NotificationResponse)
def acknowledge_notification(
    notification_id: str,
    db: Session = Depends(get_db)
):
    """
    Acknowledge a notification.

    Marks the notification as ACKNOWLEDGED and creates a
    NOTIFICATION_ACKNOWLEDGED audit record.

    Note: Responsibility resolution is NOT modified by acknowledgment —
    historical audit records remain immutable.
    """
    notification = db.query(Notification).filter(
        Notification.notification_id == notification_id
    ).first()

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    if notification.status == "ACKNOWLEDGED":
        raise HTTPException(
            status_code=400,
            detail="Notification already acknowledged"
        )

    acknowledged_at = datetime.utcnow()
    notification.status = "ACKNOWLEDGED"
    db.commit()
    db.refresh(notification)

    create_audit_log(
        db=db,
        event_type=AuditEventType.NOTIFICATION_ACKNOWLEDGED,
        description=(
            f"Notification {notification_id} acknowledged by clinician "
            f"{notification.clinician_id}"
        ),
        patient_id=notification.patient_id,
        entity_type="NOTIFICATION",
        entity_id=notification_id,
        event_time=acknowledged_at,
        extra_metadata={
            "clinician_id": notification.clinician_id,
            "acknowledged_at": acknowledged_at.isoformat(),
            "responsibility_time": notification.trigger_time.isoformat(),
        },
    )

    return notification
