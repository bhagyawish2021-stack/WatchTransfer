from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Clinician
from schemas import ClinicianCreate, ClinicianResponse

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

    new_clinician = Clinician(
        clinician_id=clinician.clinician_id,
        name=clinician.name,
        role=clinician.role
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
