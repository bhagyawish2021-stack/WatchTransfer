from sqlalchemy import Column, String, DateTime, Text, ForeignKey
from sqlalchemy.sql import func

from database import Base


class Patient(Base):
    __tablename__ = "patients"

    patient_id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)


class Clinician(Base):
    __tablename__ = "clinicians"

    clinician_id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    role = Column(String, nullable=False)


class StandingRequest(Base):
    __tablename__ = "standing_requests"

    request_id = Column(String, primary_key=True, index=True)
    patient_id = Column(
        String,
        ForeignKey("patients.patient_id"),
        nullable=False
    )
    requested_by = Column(
        String,
        ForeignKey("clinicians.clinician_id"),
        nullable=False
    )
    result_type = Column(String, nullable=False)
    condition = Column(Text, nullable=False)
    status = Column(String, default="ACTIVE")
    created_at = Column(DateTime, server_default=func.now())
