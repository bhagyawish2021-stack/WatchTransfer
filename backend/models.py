import uuid
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

class ResponsibilityEvent(Base):
    __tablename__ = "responsibility_events"

    event_id = Column(String, primary_key=True, index=True)
    patient_id = Column(
        String,
        ForeignKey("patients.patient_id"),
        nullable=False
    )
    from_clinician = Column(
        String,
        ForeignKey("clinicians.clinician_id"),
        nullable=True
    )
    to_clinician = Column(
        String,
        ForeignKey("clinicians.clinician_id"),
        nullable=False
    )
    event_time = Column(DateTime, nullable=False)
    received_at = Column(DateTime, nullable=False)
    source = Column(String, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

class ResultEvent(Base):
    __tablename__ = "result_events"

    result_id = Column(String, primary_key=True, index=True)
    patient_id = Column(String, ForeignKey("patients.patient_id"), nullable=False)
    result_type = Column(String, nullable=False)
    result_data = Column(String, nullable=False)
    event_time = Column(DateTime, nullable=False)
    received_at = Column(DateTime, nullable=False)
    status = Column(String, default="PROCESSED")
    created_at = Column(DateTime, server_default=func.now())

class Notification(Base):
    __tablename__ = "notifications"

    notification_id = Column(String, primary_key=True, index=True)
    result_id = Column(String, ForeignKey("result_events.result_id"), nullable=False)
    patient_id = Column(String, ForeignKey("patients.patient_id"), nullable=False)
    clinician_id = Column(String, ForeignKey("clinicians.clinician_id"), nullable=False)
    message = Column(String, nullable=False)
    trigger_time = Column(DateTime, nullable=False)
    status = Column(String, default="PENDING")
    created_at = Column(DateTime, server_default=func.now())


class AuditLog(Base):
    __tablename__ = "audit_logs"

    audit_id = Column(
        String,
        primary_key=True,
        index=True,
        default=lambda: f"AUD-{uuid.uuid4().hex[:8].upper()}"
    )
    patient_id = Column(String, ForeignKey("patients.patient_id"), nullable=True)
    event_type = Column(String, nullable=False)
    entity_type = Column(String, nullable=True)
    entity_id = Column(String, nullable=True)
    description = Column(Text, nullable=False)
    # event_time: when the clinical event actually occurred
    event_time = Column(DateTime, nullable=True)
    # created_at: when this audit record was written to the DB
    created_at = Column(DateTime, server_default=func.now())
    extra_metadata = Column(Text, nullable=True)  # JSON string
