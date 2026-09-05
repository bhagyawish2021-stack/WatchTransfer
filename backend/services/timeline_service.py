from sqlalchemy.orm import Session
import models

def get_timeline(patient_id: str, db: Session):
    events = db.query(models.ResponsibilityEvent).filter(
        models.ResponsibilityEvent.patient_id == patient_id
    ).all()
    
    # Core rule: Sort by event_time, then event_id for deterministic ordering
    events.sort(key=lambda x: (x.event_time, x.event_id))
    
    timeline = []
    for event in events:
        timeline.append({
            "event_id": event.event_id,
            "event_time": event.event_time,
            "from_clinician": event.from_clinician,
            "to_clinician": event.to_clinician
        })
        
    return timeline
