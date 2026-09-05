from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from .. import models, schemas
from ..database import get_db

router = APIRouter(
    prefix="/clinicians",
    tags=["clinicians"]
)

@router.post("/", response_model=schemas.Clinician)
def create_clinician(clinician: schemas.ClinicianCreate, db: Session = Depends(get_db)):
    db_clinician = db.query(models.Clinician).filter(models.Clinician.clinician_id == clinician.clinician_id).first()
    if db_clinician:
        raise HTTPException(status_code=400, detail="Clinician already registered")
    
    new_clinician = models.Clinician(
        clinician_id=clinician.clinician_id,
        name=clinician.name,
        role=clinician.role,
        department=clinician.department
    )
    db.add(new_clinician)
    db.commit()
    db.refresh(new_clinician)
    return new_clinician

@router.get("/", response_model=List[schemas.Clinician])
def read_clinicians(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    clinicians = db.query(models.Clinician).offset(skip).limit(limit).all()
    return clinicians
