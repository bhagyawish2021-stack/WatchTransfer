from typing import List, Dict, Any
from sqlalchemy.orm import Session
from .. import models

def get_responsibility_timeline(patient_id: str, db: Session) -> List[Dict[str, Any]]:
    # Get all responsibility events for the patient
    events = db.query(models.ResponsibilityEvent).filter(
        models.ResponsibilityEvent.patient_id == patient_id
    ).all()
    
    # SORT strictly by event_time, NEVER by received_at
    sorted_events = sorted(events, key=lambda x: x.event_time)
    
    timeline = []
    
    # Reconstruct the timeline as intervals
    for i, event in enumerate(sorted_events):
        start_time = event.event_time
        end_time = None
        
        # If there is a next event, this interval ends when the next one begins
        if i + 1 < len(sorted_events):
            end_time = sorted_events[i + 1].event_time
            
        timeline.append({
            "clinician_id": event.to_clinician,
            "start_time": start_time,
            "end_time": end_time,
            "event_id": event.event_id
        })
        
    return timeline
