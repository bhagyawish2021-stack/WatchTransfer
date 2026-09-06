from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import StandingRequest, Patient, Clinician
from schemas import (
    StandingRequestCreate,
    StandingRequestResponse,
    StandingRequestStatusUpdate
)
from services.audit_service import create_audit_log, AuditEventType

router = APIRouter(
    prefix="/requests",
    tags=["Requests"]
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

    create_audit_log(
        db=db,
        event_type=AuditEventType.REQUEST_CREATED,
        description=(
            f"Standing request created for {request.result_type} "
            f"by clinician {request.requested_by}"
        ),
        patient_id=request.patient_id,
        entity_type="REQUEST",
        entity_id=request.request_id,
        extra_metadata={
            "result_type": request.result_type,
            "requested_by": request.requested_by,
            "condition": request.condition,
        },
    )

    return new_request


@router.get("/", response_model=list[StandingRequestResponse])
def get_requests(
    db: Session = Depends(get_db)
):
    return db.query(StandingRequest).order_by(StandingRequest.created_at.desc()).all()


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


@router.patch("/{request_id}/status", response_model=StandingRequestResponse)
def update_request_status(
    request_id: str,
    payload: StandingRequestStatusUpdate,
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

    request.status = payload.status
    db.commit()
    db.refresh(request)
    return request


@router.delete("/{request_id}")
def delete_request(
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

    db.delete(request)
    db.commit()
    return {"message": f"Standing request {request_id} deleted successfully."}

