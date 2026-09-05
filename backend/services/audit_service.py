from sqlalchemy.orm import Session
from datetime import datetime
from .. import models

def log_event(db: Session, event_type: str, description: str, event_time: datetime, patient_id: str = None, request_id: str = None):
    audit_log = models.AuditLog(
        patient_id=patient_id,
        request_id=request_id,
        event_type=event_type,
        description=description,
        event_time=event_time
    )
    db.add(audit_log)
    db.commit()
    db.refresh(audit_log)
    return audit_log
