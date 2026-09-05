from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from .. import models, schemas
from ..database import get_db
from ..services.audit_service import log_event
from datetime import datetime

router = APIRouter(
    prefix="/notifications",
    tags=["notifications"]
)

@router.get("/", response_model=List[schemas.Notification])
def read_notifications(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    notifications = db.query(models.Notification).offset(skip).limit(limit).all()
    return notifications

@router.get("/{clinician_id}", response_model=List[schemas.Notification])
def get_clinician_notifications(clinician_id: str, db: Session = Depends(get_db)):
    notifications = db.query(models.Notification).filter(
        models.Notification.clinician_id == clinician_id
    ).all()
    return notifications

@router.post("/{notification_id}/ack", response_model=schemas.Acknowledgment)
def acknowledge_notification(notification_id: str, ack: schemas.AcknowledgmentCreate, db: Session = Depends(get_db)):
    notification = db.query(models.Notification).filter(models.Notification.notification_id == notification_id).first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    if notification.status == "ACKNOWLEDGED":
        raise HTTPException(status_code=400, detail="Notification already acknowledged")
        
    notification.status = "ACKNOWLEDGED"
    db.commit()
    
    new_ack = models.Acknowledgment(
        notification_id=notification_id,
        clinician_id=ack.clinician_id
    )
    db.add(new_ack)
    db.commit()
    db.refresh(new_ack)
    
    # Log acknowledgment
    log_event(db, "NOTIFICATION_ACKNOWLEDGED", f"Notification {notification_id} acknowledged by {ack.clinician_id}", datetime.utcnow(), patient_id=notification.patient_id, request_id=notification.request_id)
    
    return new_ack
