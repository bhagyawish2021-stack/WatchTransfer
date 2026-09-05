import uuid
from sqlalchemy.orm import Session
from models import StandingRequest, Notification
from services.responsibility_service import resolve_responsible_clinician

def process_result(result_event, db: Session):
    # 1. Find the active standing request
    request = db.query(StandingRequest).filter(
        StandingRequest.patient_id == result_event.patient_id,
        StandingRequest.result_type == result_event.result_type,
        StandingRequest.status == "ACTIVE"
    ).first()

    if not request:
        return None

    # 2. Find responsible clinician
    clinician_id = resolve_responsible_clinician(
        result_event.patient_id,
        result_event.event_time,
        db
    )

    if not clinician_id:
        return None

    # 3. Create Notification
    notification_id = f"N-{uuid.uuid4().hex[:8].upper()}"
    notification = Notification(
        notification_id=notification_id,
        result_id=result_event.result_id,
        patient_id=result_event.patient_id,
        clinician_id=clinician_id,
        message=f"{result_event.result_type} result is available for patient {result_event.patient_id}.",
        trigger_time=result_event.event_time,
        status="PENDING"
    )

    db.add(notification)
    db.commit()
    db.refresh(notification)

    return notification
