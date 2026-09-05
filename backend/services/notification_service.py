from sqlalchemy.orm import Session
from datetime import datetime
import uuid
from .. import models

def create_notification(db: Session, request: models.StandingRequest, clinician_id: str, trigger_time: datetime):
    # Generates a random notification ID for simplicity
    notification_id = f"N-{uuid.uuid4().hex[:8]}"
    
    notification = models.Notification(
        notification_id=notification_id,
        request_id=request.request_id,
        patient_id=request.patient_id,
        clinician_id=clinician_id,
        trigger_time=trigger_time,
        status="PENDING"
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification
