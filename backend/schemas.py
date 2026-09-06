from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional


class PatientCreate(BaseModel):
    patient_id: str
    name: str


class PatientResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    patient_id: str
    name: str


from enum import Enum
from pydantic import field_validator

class ClinicianAvailability(str, Enum):
    AVAILABLE = "AVAILABLE"
    BUSY = "BUSY"
    UNAVAILABLE = "UNAVAILABLE"
    ON_CALL = "ON_CALL"
    OFF_DUTY = "OFF_DUTY"


class ClinicianCreate(BaseModel):
    clinician_id: str
    name: str
    role: str
    department: Optional[str] = None
    availability_status: Optional[str] = "AVAILABLE"
    backup_clinician_id: Optional[str] = None

    @field_validator("availability_status")
    def validate_availability(cls, v):
        if v is not None:
            allowed = {"AVAILABLE", "BUSY", "UNAVAILABLE", "ON_CALL", "OFF_DUTY"}
            if v not in allowed:
                raise ValueError(f"Invalid availability_status. Must be one of: {sorted(list(allowed))}")
        return v


class ClinicianAvailabilityUpdate(BaseModel):
    availability_status: str
    backup_clinician_id: Optional[str] = None

    @field_validator("availability_status")
    def validate_availability(cls, v):
        allowed = {"AVAILABLE", "BUSY", "UNAVAILABLE", "ON_CALL", "OFF_DUTY"}
        if v not in allowed:
            raise ValueError(f"Invalid availability_status. Must be one of: {sorted(list(allowed))}")
        return v


class ClinicianResponse(BaseModel):
    clinician_id: str
    name: str
    role: str
    department: Optional[str] = None
    availability_status: str = "AVAILABLE"
    backup_clinician_id: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)



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
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class StandingRequestStatusUpdate(BaseModel):
    status: str


class ResponsibilityEventCreate(BaseModel):
    event_id: str
    patient_id: str
    from_clinician: Optional[str] = None
    to_clinician: str
    event_time: datetime
    received_at: Optional[datetime] = None
    source: Optional[str] = "EHR"

class ResponsibilityEventResponse(BaseModel):
    event_id: str
    patient_id: str
    from_clinician: Optional[str] = None
    to_clinician: str
    event_time: datetime
    received_at: datetime
    source: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ResultEventCreate(BaseModel):
    result_id: str
    patient_id: str
    result_type: str
    result_data: str
    event_time: datetime
    received_at: Optional[datetime] = None
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

    model_config = ConfigDict(from_attributes=True)

class NotificationResponse(BaseModel):
    notification_id: str
    result_id: str
    patient_id: str
    clinician_id: str
    original_responsible_clinician_id: Optional[str] = None
    recipient_clinician_id: Optional[str] = None
    escalation_level: int = 0
    escalation_reason: Optional[str] = None
    message: str
    trigger_time: datetime
    status: str
    acknowledged_at: Optional[datetime] = None
    ack_deadline: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)



class AuditLogResponse(BaseModel):
    audit_id: str
    patient_id: Optional[str] = None
    event_type: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    description: str
    event_time: Optional[datetime] = None
    created_at: datetime
    extra_metadata: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
