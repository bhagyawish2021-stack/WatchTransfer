from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Clinician
from schemas import ClinicianCreate, ClinicianResponse, ClinicianAvailabilityUpdate
from services.audit_service import create_audit_log, AuditEventType

router = APIRouter(
    prefix="/clinicians",
    tags=["Clinicians"]
)


@router.post("/", response_model=ClinicianResponse)
def create_clinician(
    clinician: ClinicianCreate,
    db: Session = Depends(get_db)
):
    existing = db.query(Clinician).filter(
        Clinician.clinician_id == clinician.clinician_id
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Clinician already exists"
        )

    if clinician.backup_clinician_id:
        backup = db.query(Clinician).filter(
            Clinician.clinician_id == clinician.backup_clinician_id
        ).first()
        if not backup:
            raise HTTPException(
                status_code=404,
                detail=f"Backup clinician {clinician.backup_clinician_id} not found"
            )

    new_clinician = Clinician(
        clinician_id=clinician.clinician_id,
        name=clinician.name,
        role=clinician.role,
        department=clinician.department,
        availability_status=clinician.availability_status or "AVAILABLE",
        backup_clinician_id=clinician.backup_clinician_id,
    )

    db.add(new_clinician)
    db.commit()
    db.refresh(new_clinician)

    return new_clinician


@router.get("/", response_model=list[ClinicianResponse])
def get_clinicians(
    db: Session = Depends(get_db)
):
    return db.query(Clinician).all()


@router.get("/{clinician_id}", response_model=ClinicianResponse)
def get_clinician(
    clinician_id: str,
    db: Session = Depends(get_db)
):
    clinician = db.query(Clinician).filter(
        Clinician.clinician_id == clinician_id
    ).first()

    if not clinician:
        raise HTTPException(
            status_code=404,
            detail="Clinician not found"
        )

    return clinician


@router.patch("/{clinician_id}/availability", response_model=ClinicianResponse)
def update_clinician_availability(
    clinician_id: str,
    update: ClinicianAvailabilityUpdate,
    db: Session = Depends(get_db)
):
    """
    Update clinician availability status and optional backup clinician.
    Emits CLINICIAN_AVAILABILITY_CHANGED audit log.
    Does NOT modify historical responsibility.
    """
    clinician = db.query(Clinician).filter(
        Clinician.clinician_id == clinician_id
    ).first()

    if not clinician:
        raise HTTPException(
            status_code=404,
            detail="Clinician not found"
        )

    if update.backup_clinician_id is not None and update.backup_clinician_id != "":
        backup = db.query(Clinician).filter(
            Clinician.clinician_id == update.backup_clinician_id
        ).first()
        if not backup:
            raise HTTPException(
                status_code=404,
                detail=f"Backup clinician {update.backup_clinician_id} not found"
            )
        clinician.backup_clinician_id = update.backup_clinician_id
    elif update.backup_clinician_id == "":
        clinician.backup_clinician_id = None

    old_status = clinician.availability_status
    new_status = update.availability_status

    clinician.availability_status = new_status
    db.commit()
    db.refresh(clinician)

    # Emit audit log for availability change
    now = datetime.now(timezone.utc)
    create_audit_log(
        db=db,
        event_type=AuditEventType.CLINICIAN_AVAILABILITY_CHANGED,
        description=(
            f"Clinician {clinician_id} availability changed from {old_status} to {new_status}"
        ),
        entity_type="CLINICIAN",
        entity_id=clinician_id,
        event_time=now,
        extra_metadata={
            "clinician_id": clinician_id,
            "old_status": old_status,
            "new_status": new_status,
            "backup_clinician_id": clinician.backup_clinician_id,
        }
    )

    return clinician

