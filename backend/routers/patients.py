from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Patient
from schemas import PatientCreate, PatientResponse
from datetime import datetime
from services.responsibility_service import resolve_responsible_clinician

router = APIRouter(
    prefix="/patients",
    tags=["Patients"]
)


@router.post("/", response_model=PatientResponse)
def create_patient(
    patient: PatientCreate,
    db: Session = Depends(get_db)
):
    existing = db.query(Patient).filter(
        Patient.patient_id == patient.patient_id
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Patient already exists"
        )

    new_patient = Patient(
        patient_id=patient.patient_id,
        name=patient.name
    )

    db.add(new_patient)
    db.commit()
    db.refresh(new_patient)

    return new_patient


@router.get("/", response_model=list[PatientResponse])
def get_patients(
    db: Session = Depends(get_db)
):
    return db.query(Patient).all()


@router.get("/{patient_id}", response_model=PatientResponse)
def get_patient(
    patient_id: str,
    db: Session = Depends(get_db)
):
    patient = db.query(Patient).filter(
        Patient.patient_id == patient_id
    ).first()

    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Patient not found"
        )

    return patient

@router.get("/{patient_id}/responsible")
def get_responsible_clinician(
    patient_id: str,
    timestamp: datetime,
    db: Session = Depends(get_db)
):
    patient = db.query(Patient).filter(
        Patient.patient_id == patient_id
    ).first()

    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Patient not found"
        )
        
    responsible = resolve_responsible_clinician(patient_id, timestamp, db)
    
    return {
        "patient_id": patient_id,
        "timestamp": timestamp,
        "responsible_clinician": responsible
    }
