from datetime import datetime
from typing import Optional, TypedDict
from sqlalchemy.orm import Session
import models


class TimelineEvent(TypedDict):
    event_id: str
    event_time: datetime
    from_clinician: Optional[str]
    to_clinician: str


def get_timeline(patient_id: str, db: Session) -> list[TimelineEvent]:
    events = db.query(models.ResponsibilityEvent).filter(
        models.ResponsibilityEvent.patient_id == patient_id
    ).all()
    
    # Core rule: Sort by event_time, then event_id for deterministic ordering
    events.sort(key=lambda x: (x.event_time, x.event_id))
    
    timeline: list[TimelineEvent] = []
    for event in events:
        timeline.append({
            "event_id": event.event_id,
            "event_time": event.event_time,
            "from_clinician": event.from_clinician,
            "to_clinician": event.to_clinician
        })
        
    return timeline
