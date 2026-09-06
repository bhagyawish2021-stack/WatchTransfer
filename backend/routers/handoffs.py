from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import ResponsibilityEvent, Patient, Clinician, ResultEvent, Notification
from schemas import (
    ResponsibilityEventCreate,
    ResponsibilityEventResponse
)
from services.timeline_service import get_timeline
from services.responsibility_service import resolve_responsible_clinician
from services.escalation_service import resolve_notification_recipient
from services.audit_service import create_audit_log, AuditEventType

router = APIRouter(
    prefix="/handoffs",
    tags=["Handoffs"]
)

@router.post("/", response_model=ResponsibilityEventResponse)
def create_handoff(
    event: ResponsibilityEventCreate,
    db: Session = Depends(get_db)
):
    patient = db.query(Patient).filter(Patient.patient_id == event.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    if event.from_clinician:
        from_clinician = db.query(Clinician).filter(Clinician.clinician_id == event.from_clinician).first()
        if not from_clinician:
            raise HTTPException(status_code=404, detail="from_clinician not found")

    to_clinician = db.query(Clinician).filter(Clinician.clinician_id == event.to_clinician).first()
    if not to_clinician:
        raise HTTPException(status_code=404, detail="to_clinician not found")

    existing = db.query(ResponsibilityEvent).filter(
        ResponsibilityEvent.event_id == event.event_id
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Event already exists")

    new_event = ResponsibilityEvent(
        event_id=event.event_id,
        patient_id=event.patient_id,
        from_clinician=event.from_clinician,
        to_clinician=event.to_clinician,
        event_time=event.event_time,
        received_at=event.received_at if event.received_at else datetime.now(timezone.utc),
        source=event.source if event.source else "EHR"
    )

    db.add(new_event)
    db.commit()
    db.refresh(new_event)

    # --- Audit: HANDOFF_RECEIVED ---
    from_label = event.from_clinician if event.from_clinician else "(initial)"
    create_audit_log(
        db=db,
        event_type=AuditEventType.HANDOFF_RECEIVED,
        description=f"{from_label} handed responsibility to {event.to_clinician}",
        patient_id=event.patient_id,
        entity_type="HANDOFF",
        entity_id=event.event_id,
        # Preserve the original clinical event_time so out-of-order events are traceable
        event_time=event.event_time,
        extra_metadata={
            "from_clinician": event.from_clinician,
            "to_clinician": event.to_clinician,
            "received_at": new_event.received_at.isoformat(),
            "source": event.source,
        },
    )

    # --- Audit: TIMELINE_RECONSTRUCTED ---
    timeline = get_timeline(event.patient_id, db)
    create_audit_log(
        db=db,
        event_type=AuditEventType.TIMELINE_RECONSTRUCTED,
        description=f"Timeline reconstructed for patient {event.patient_id} using event_time ordering",
        patient_id=event.patient_id,
        entity_type="HANDOFF",
        entity_id=event.event_id,
        extra_metadata={
            "events_considered": len(timeline),
            "ordering": "event_time",
        },
    )

    # --- Late-arriving handoff check (Re-evaluate affected results) ---
    past_results = db.query(ResultEvent).filter(
        ResultEvent.patient_id == event.patient_id,
        ResultEvent.event_time >= new_event.event_time
    ).all()

    for res in past_results:
        new_resp = resolve_responsible_clinician(event.patient_id, res.event_time, db)
        if not new_resp:
            continue
        notif = db.query(Notification).filter(Notification.result_id == res.result_id).first()
        if notif and notif.status != "ACKNOWLEDGED" and notif.original_responsible_clinician_id != new_resp:
            routing = resolve_notification_recipient(new_resp, db)
            notif.original_responsible_clinician_id = new_resp
            notif.recipient_clinician_id = routing["recipient_id"]
            notif.clinician_id = routing["recipient_id"]
            notif.escalation_level = routing["escalation_level"]
            notif.escalation_reason = routing["escalation_reason"]
            notif.status = routing["status"]
            db.commit()
            db.refresh(notif)

            create_audit_log(
                db=db,
                event_type=AuditEventType.RESULT_RE_EVALUATED,
                description=(
                    f"Result {res.result_id} re-evaluated due to late handoff {new_event.event_id}. "
                    f"Responsible clinician updated to {new_resp} (Recipient: {routing['recipient_id']})"
                ),
                patient_id=event.patient_id,
                entity_type="RESULT",
                entity_id=res.result_id,
                event_time=new_event.event_time,
                extra_metadata={
                    "result_id": res.result_id,
                    "handoff_id": new_event.event_id,
                    "new_responsible_clinician": new_resp,
                    "recipient": routing["recipient_id"],
                    "reason": "Retroactive handoff received",
                }
            )

    return new_event

@router.get("/", response_model=list[ResponsibilityEventResponse])
def get_handoffs(db: Session = Depends(get_db)):
    return db.query(ResponsibilityEvent).all()

@router.get("/{event_id}", response_model=ResponsibilityEventResponse)
def get_handoff(event_id: str, db: Session = Depends(get_db)):
    event = db.query(ResponsibilityEvent).filter(ResponsibilityEvent.event_id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event
