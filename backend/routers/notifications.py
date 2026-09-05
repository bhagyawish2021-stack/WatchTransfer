from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import Notification
from schemas import NotificationResponse

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("/", response_model=list[NotificationResponse])
def get_notifications(db: Session = Depends(get_db)):
    return db.query(Notification).all()

@router.get("/{clinician_id}", response_model=list[NotificationResponse])
def get_clinician_notifications(clinician_id: str, db: Session = Depends(get_db)):
    return db.query(Notification).filter(Notification.clinician_id == clinician_id).all()
