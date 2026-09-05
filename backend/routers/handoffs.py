from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import ResponsibilityEvent, Patient, Clinician
from schemas import (
    ResponsibilityEventCreate,
    ResponsibilityEventResponse
)
from services.timeline_service import get_timeline

router = APIRouter(
    prefix="/handoffs",
    tags=["Handoffs"]
)

@router.post("/", response_model=ResponsibilityEventResponse)
def create_handoff(
    event: ResponsibilityEventCreate,
    db: Session = Depends(get_db)
):
    patient = db.query(Patient).filter(Patient.patient_id == event.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    if event.from_clinician:
        from_clinician = db.query(Clinician).filter(Clinician.clinician_id == event.from_clinician).first()
        if not from_clinician:
            raise HTTPException(status_code=404, detail="from_clinician not found")

    to_clinician = db.query(Clinician).filter(Clinician.clinician_id == event.to_clinician).first()
    if not to_clinician:
        raise HTTPException(status_code=404, detail="to_clinician not found")

    existing = db.query(ResponsibilityEvent).filter(
        ResponsibilityEvent.event_id == event.event_id
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Event already exists")

    new_event = ResponsibilityEvent(
        event_id=event.event_id,
        patient_id=event.patient_id,
        from_clinician=event.from_clinician,
        to_clinician=event.to_clinician,
        event_time=event.event_time,
        received_at=event.received_at,
        source=event.source
    )

    db.add(new_event)
    db.commit()
    db.refresh(new_event)

    return new_event

@router.get("/", response_model=list[ResponsibilityEventResponse])
def get_handoffs(db: Session = Depends(get_db)):
    return db.query(ResponsibilityEvent).all()

@router.get("/{event_id}", response_model=ResponsibilityEventResponse)
def get_handoff(event_id: str, db: Session = Depends(get_db)):
    event = db.query(ResponsibilityEvent).filter(ResponsibilityEvent.event_id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event

@router.get("/patients/{patient_id}/timeline")
def get_patient_timeline(patient_id: str, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    return get_timeline(patient_id, db)
