from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import StandingRequest, Patient, Clinician
from schemas import (
    StandingRequestCreate,
    StandingRequestResponse
)

router = APIRouter(
    prefix="/requests",
    tags=["Standing Requests"]
)


@router.post("/", response_model=StandingRequestResponse)
def create_request(
    request: StandingRequestCreate,
    db: Session = Depends(get_db)
):

    patient = db.query(Patient).filter(
        Patient.patient_id == request.patient_id
    ).first()

    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Patient not found"
        )

    clinician = db.query(Clinician).filter(
        Clinician.clinician_id == request.requested_by
    ).first()

    if not clinician:
        raise HTTPException(
            status_code=404,
            detail="Clinician not found"
        )

    existing = db.query(StandingRequest).filter(
        StandingRequest.request_id == request.request_id
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Request already exists"
        )

    new_request = StandingRequest(
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


@router.get("/", response_model=list[StandingRequestResponse])
def get_requests(
    db: Session = Depends(get_db)
):
    return db.query(StandingRequest).all()


@router.get("/{request_id}", response_model=StandingRequestResponse)
def get_request(
    request_id: str,
    db: Session = Depends(get_db)
):
    request = db.query(StandingRequest).filter(
        StandingRequest.request_id == request_id
    ).first()

    if not request:
        raise HTTPException(
            status_code=404,
            detail="Standing request not found"
        )

    return request
