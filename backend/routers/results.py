from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import ResultEvent, Patient
from schemas import ResultEventCreate, ResultEventResponse
from services.notification_service import process_result

router = APIRouter(prefix="/results", tags=["Results"])

@router.post("/", response_model=ResultEventResponse)
def create_result(result: ResultEventCreate, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.patient_id == result.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    existing = db.query(ResultEvent).filter(ResultEvent.result_id == result.result_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Result already exists")

    new_result = ResultEvent(
        result_id=result.result_id,
        patient_id=result.patient_id,
        result_type=result.result_type,
        result_data=result.result_data,
        event_time=result.event_time,
        received_at=result.received_at,
        status=result.status
    )

    db.add(new_result)
    db.commit()
    db.refresh(new_result)

    # Trigger notification logic
    process_result(new_result, db)

    return new_result

@router.get("/", response_model=list[ResultEventResponse])
def get_results(db: Session = Depends(get_db)):
    return db.query(ResultEvent).all()

@router.get("/{result_id}", response_model=ResultEventResponse)
def get_result(result_id: str, db: Session = Depends(get_db)):
    result = db.query(ResultEvent).filter(ResultEvent.result_id == result_id).first()
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")
    return result
