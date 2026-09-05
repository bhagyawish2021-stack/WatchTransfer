from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from .. import models, schemas
from ..database import get_db

router = APIRouter(
    prefix="/requests",
    tags=["requests"]
)

@router.post("/", response_model=schemas.StandingRequest)
def create_request(request: schemas.StandingRequestCreate, db: Session = Depends(get_db)):
    # Validate patient and clinician
    patient = db.query(models.Patient).filter(models.Patient.patient_id == request.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    clinician = db.query(models.Clinician).filter(models.Clinician.clinician_id == request.requested_by).first()
    if not clinician:
        raise HTTPException(status_code=404, detail="Clinician not found")

    db_request = db.query(models.StandingRequest).filter(models.StandingRequest.request_id == request.request_id).first()
    if db_request:
        raise HTTPException(status_code=400, detail="Request ID already registered")
    
    new_request = models.StandingRequest(
        request_id=request.request_id,
        patient_id=request.patient_id,
        requested_by=request.requested_by,
        result_type=request.result_type,
        condition=request.condition,
        status=request.status
    )
    db.add(new_request)
    db.commit()
    db.refresh(new_request)
    return new_request

@router.get("/", response_model=List[schemas.StandingRequest])
def read_requests(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    requests = db.query(models.StandingRequest).offset(skip).limit(limit).all()
    return requests

@router.get("/{request_id}", response_model=schemas.StandingRequest)
def read_request(request_id: str, db: Session = Depends(get_db)):
    request = db.query(models.StandingRequest).filter(models.StandingRequest.request_id == request_id).first()
    if request is None:
        raise HTTPException(status_code=404, detail="Request not found")
    return request
