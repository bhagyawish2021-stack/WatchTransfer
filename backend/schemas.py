from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class PatientCreate(BaseModel):
    patient_id: str
    name: str


class PatientResponse(BaseModel):
    patient_id: str
    name: str

    class Config:
        from_attributes = True


class ClinicianCreate(BaseModel):
    clinician_id: str
    name: str
    role: str


class ClinicianResponse(BaseModel):
    clinician_id: str
    name: str
    role: str

    class Config:
        from_attributes = True


class StandingRequestCreate(BaseModel):
    request_id: str
    patient_id: str
    requested_by: str
    result_type: str
    condition: str
    status: str = "ACTIVE"


class StandingRequestResponse(BaseModel):
    request_id: str
    patient_id: str
    requested_by: str
    result_type: str
    condition: str
    status: str

    class Config:
        from_attributes = True

class ResponsibilityEventCreate(BaseModel):
    event_id: str
    patient_id: str
    from_clinician: Optional[str] = None
    to_clinician: str
    event_time: datetime
    received_at: datetime
    source: str

class ResponsibilityEventResponse(BaseModel):
    event_id: str
    patient_id: str
    from_clinician: Optional[str] = None
    to_clinician: str
    event_time: datetime
    received_at: datetime
    source: str
    created_at: datetime

    class Config:
        from_attributes = True

class ResultEventCreate(BaseModel):
    result_id: str
    patient_id: str
    result_type: str
    result_data: str
    event_time: datetime
    received_at: datetime
    status: Optional[str] = "PROCESSED"

class ResultEventResponse(BaseModel):
    result_id: str
    patient_id: str
    result_type: str
    result_data: str
    event_time: datetime
    received_at: datetime
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class NotificationResponse(BaseModel):
    notification_id: str
    result_id: str
    patient_id: str
    clinician_id: str
    message: str
    trigger_time: datetime
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
