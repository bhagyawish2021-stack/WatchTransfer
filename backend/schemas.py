from pydantic import BaseModel


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
