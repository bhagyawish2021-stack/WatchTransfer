from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session
from .timeline_service import get_responsibility_timeline

def resolve_responsible_clinician(patient_id: str, trigger_time: datetime, db: Session) -> Optional[str]:
    # 1. Build the chronological timeline
    timeline = get_responsibility_timeline(patient_id, db)
    
    if not timeline:
        return None
        
    # 2. Find the interval containing the trigger_time
    # start_time <= trigger_time < end_time
    for interval in timeline:
        start_time = interval["start_time"]
        end_time = interval["end_time"]
        
        # If it's before the very first handoff, we assume no one was responsible yet
        # (or handle it depending on business logic, here we just check if it's within)
        if trigger_time >= start_time:
            if end_time is None or trigger_time < end_time:
                return interval["clinician_id"]
                
    # If the trigger_time is before the first event in our system, return None
    return None
