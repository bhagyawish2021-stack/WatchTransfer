from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from .. import models, schemas
from ..database import get_db
from ..services.responsibility_service import resolve_responsible_clinician
from ..services.notification_service import create_notification
from ..services.audit_service import log_event

router = APIRouter(
    prefix="/results",
    tags=["results"]
)

@router.post("/", response_model=schemas.ResultEvent)
def create_result(result: schemas.ResultEventCreate, db: Session = Depends(get_db)):
    db_result = db.query(models.ResultEvent).filter(
        models.ResultEvent.result_id == result.result_id
    ).first()
    if db_result:
        raise HTTPException(status_code=400, detail="Result ID already registered")
        
    # Save the result
    new_result = models.ResultEvent(
        result_id=result.result_id,
        patient_id=result.patient_id,
        result_type=result.result_type,
        event_time=result.event_time,
        received_at=result.received_at
    )
    db.add(new_result)
    db.commit()
    db.refresh(new_result)
    
    log_event(db, "RESULT_RECEIVED", f"Result {result.result_id} received for {result.patient_id}", result.event_time, patient_id=result.patient_id)
    
    # Check for active standing request
    request = db.query(models.StandingRequest).filter(
        models.StandingRequest.patient_id == result.patient_id,
        models.StandingRequest.result_type == result.result_type,
        models.StandingRequest.status == "ACTIVE"
    ).first()
    
    if not request:
        log_event(db, "NO_REQUEST_FOUND", f"No active request found for {result.patient_id} and {result.result_type}", result.event_time, patient_id=result.patient_id)
        return new_result
        
    # Resolve Responsibility
    responsible_clinician = resolve_responsible_clinician(result.patient_id, result.event_time, db)
    
    if not responsible_clinician:
        log_event(db, "RESPONSIBILITY_NOT_FOUND", f"Could not determine responsible clinician for {result.patient_id} at {result.event_time}", result.event_time, patient_id=result.patient_id, request_id=request.request_id)
        return new_result
        
    log_event(db, "RESPONSIBILITY_RESOLVED", f"Responsibility resolved using event_time. Responsible clinician: {responsible_clinician}", result.event_time, patient_id=result.patient_id, request_id=request.request_id)
    
    # Create notification
    notification = create_notification(db, request, responsible_clinician, result.event_time)
    
    log_event(db, "NOTIFICATION_CREATED", f"Notification {notification.notification_id} created for {responsible_clinician}", result.event_time, patient_id=result.patient_id, request_id=request.request_id)
    
    return new_result

@router.get("/{result_id}", response_model=schemas.ResultEvent)
def get_result(result_id: str, db: Session = Depends(get_db)):
    result = db.query(models.ResultEvent).filter(models.ResultEvent.result_id == result_id).first()
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")
    return result
