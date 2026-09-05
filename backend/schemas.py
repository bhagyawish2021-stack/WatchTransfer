from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

# --- Patient ---
class PatientBase(BaseModel):
    patient_id: str
    name: str

class PatientCreate(PatientBase):
    pass

class Patient(PatientBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

# --- Clinician ---
class ClinicianBase(BaseModel):
    clinician_id: str
    name: str
    role: str
    department: str

class ClinicianCreate(ClinicianBase):
    pass

class Clinician(ClinicianBase):
    id: int
    class Config:
        from_attributes = True

# --- Standing Request ---
class StandingRequestBase(BaseModel):
    request_id: str
    patient_id: str
    requested_by: str
    result_type: str
    condition: str
    status: str = "ACTIVE"

class StandingRequestCreate(StandingRequestBase):
    pass

class StandingRequest(StandingRequestBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

# --- Responsibility Event (Handoff) ---
class ResponsibilityEventBase(BaseModel):
    event_id: str
    patient_id: str
    from_clinician: Optional[str] = None
    to_clinician: str
    event_time: datetime
    received_at: datetime
    source: str

class ResponsibilityEventCreate(ResponsibilityEventBase):
    pass

class ResponsibilityEvent(ResponsibilityEventBase):
    id: int
    class Config:
        from_attributes = True

# --- Result Event ---
class ResultEventBase(BaseModel):
    result_id: str
    patient_id: str
    result_type: str
    event_time: datetime
    received_at: datetime

class ResultEventCreate(ResultEventBase):
    pass

class ResultEvent(ResultEventBase):
    id: int
    status: str
    class Config:
        from_attributes = True

# --- Notification ---
class NotificationBase(BaseModel):
    notification_id: str
    request_id: str
    patient_id: str
    clinician_id: str
    trigger_time: datetime
    status: str = "PENDING"

class NotificationCreate(NotificationBase):
    pass

class Notification(NotificationBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

# --- Acknowledgment ---
class AcknowledgmentBase(BaseModel):
    clinician_id: str

class AcknowledgmentCreate(AcknowledgmentBase):
    pass

class Acknowledgment(AcknowledgmentBase):
    id: int
    notification_id: str
    acknowledged_at: datetime
    class Config:
        from_attributes = True

# --- Audit Log ---
class AuditLogBase(BaseModel):
    patient_id: Optional[str] = None
    request_id: Optional[str] = None
    event_type: str
    description: str
    event_time: datetime

class AuditLogCreate(AuditLogBase):
    pass

class AuditLog(AuditLogBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True
