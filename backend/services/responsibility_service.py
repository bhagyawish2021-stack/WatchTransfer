from datetime import datetime
from sqlalchemy.orm import Session
import models
from services.timeline_service import get_timeline

def resolve_responsible_clinician(patient_id: str, trigger_time: datetime, db: Session):
    # 1. Handle the Initial Clinician
    request = db.query(models.StandingRequest).filter(
        models.StandingRequest.patient_id == patient_id,
        models.StandingRequest.status == "ACTIVE"
    ).first()
    
    if not request:
        return None
        
    current_responsible = request.requested_by
    
    # 2. Get chronological timeline
    timeline = get_timeline(patient_id, db)
    
    # 3. Traverse timeline applying rule: "A handoff at exactly the trigger timestamp takes effect at that timestamp"
    for interval in timeline:
        # If the handoff happened AFTER the trigger_time, it doesn't affect responsibility
        if interval["event_time"] > trigger_time:
            break
            
        # A handoff at exactly trigger_time takes effect at trigger_time, so we also apply it
        if interval["event_time"] <= trigger_time:
            current_responsible = interval["to_clinician"]
            
    return current_responsible
