from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from .. import models, schemas
from ..database import get_db
from ..services.timeline_service import get_responsibility_timeline

router = APIRouter(
    prefix="/handoffs",
    tags=["handoffs"]
)

@router.post("/", response_model=schemas.ResponsibilityEvent)
def create_handoff(handoff: schemas.ResponsibilityEventCreate, db: Session = Depends(get_db)):
    db_event = db.query(models.ResponsibilityEvent).filter(
        models.ResponsibilityEvent.event_id == handoff.event_id
    ).first()
    if db_event:
        raise HTTPException(status_code=400, detail="Event ID already registered")
        
    new_event = models.ResponsibilityEvent(
        event_id=handoff.event_id,
        patient_id=handoff.patient_id,
        from_clinician=handoff.from_clinician,
        to_clinician=handoff.to_clinician,
        event_time=handoff.event_time,
        received_at=handoff.received_at,
        source=handoff.source
    )
    db.add(new_event)
    db.commit()
    db.refresh(new_event)
    return new_event

@router.get("/patients/{patient_id}/timeline")
def get_timeline(patient_id: str, db: Session = Depends(get_db)):
    timeline = get_responsibility_timeline(patient_id, db)
    return timeline
