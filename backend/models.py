import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class Patient(Base):
    __tablename__ = "patients"

    patient_id: Mapped[str] = mapped_column(String, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)


class Clinician(Base):
    __tablename__ = "clinicians"

    clinician_id: Mapped[str] = mapped_column(String, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[str] = mapped_column(String, nullable=False)
    department: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    availability_status: Mapped[str] = mapped_column(String, default="AVAILABLE")
    backup_clinician_id: Mapped[Optional[str]] = mapped_column(
        String,
        ForeignKey("clinicians.clinician_id"),
        nullable=True
    )


class StandingRequest(Base):
    __tablename__ = "standing_requests"

    request_id: Mapped[str] = mapped_column(String, primary_key=True, index=True)
    patient_id: Mapped[str] = mapped_column(
        String,
        ForeignKey("patients.patient_id"),
        nullable=False
    )
    requested_by: Mapped[str] = mapped_column(
        String,
        ForeignKey("clinicians.clinician_id"),
        nullable=False
    )
    result_type: Mapped[str] = mapped_column(String, nullable=False)
    condition: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String, default="ACTIVE")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class ResponsibilityEvent(Base):
    __tablename__ = "responsibility_events"

    event_id: Mapped[str] = mapped_column(String, primary_key=True, index=True)
    patient_id: Mapped[str] = mapped_column(
        String,
        ForeignKey("patients.patient_id"),
        nullable=False
    )
    from_clinician: Mapped[Optional[str]] = mapped_column(
        String,
        ForeignKey("clinicians.clinician_id"),
        nullable=True
    )
    to_clinician: Mapped[str] = mapped_column(
        String,
        ForeignKey("clinicians.clinician_id"),
        nullable=False
    )
    event_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    received_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    source: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class ResultEvent(Base):
    __tablename__ = "result_events"

    result_id: Mapped[str] = mapped_column(String, primary_key=True, index=True)
    patient_id: Mapped[str] = mapped_column(String, ForeignKey("patients.patient_id"), nullable=False)
    result_type: Mapped[str] = mapped_column(String, nullable=False)
    result_data: Mapped[str] = mapped_column(String, nullable=False)
    event_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    received_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    status: Mapped[str] = mapped_column(String, default="PROCESSED")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class Notification(Base):
    __tablename__ = "notifications"

    notification_id: Mapped[str] = mapped_column(String, primary_key=True, index=True)
    result_id: Mapped[str] = mapped_column(String, ForeignKey("result_events.result_id"), nullable=False)
    patient_id: Mapped[str] = mapped_column(String, ForeignKey("patients.patient_id"), nullable=False)
    clinician_id: Mapped[str] = mapped_column(String, ForeignKey("clinicians.clinician_id"), nullable=False)
    original_responsible_clinician_id: Mapped[Optional[str]] = mapped_column(
        String, ForeignKey("clinicians.clinician_id"), nullable=True
    )
    recipient_clinician_id: Mapped[Optional[str]] = mapped_column(
        String, ForeignKey("clinicians.clinician_id"), nullable=True
    )
    escalation_level: Mapped[int] = mapped_column(default=0)
    escalation_reason: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    message: Mapped[str] = mapped_column(String, nullable=False)
    trigger_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    status: Mapped[str] = mapped_column(String, default="PENDING")
    acknowledged_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    ack_deadline: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())



class AuditLog(Base):
    __tablename__ = "audit_logs"

    audit_id: Mapped[str] = mapped_column(
        String,
        primary_key=True,
        index=True,
        default=lambda: f"AUD-{uuid.uuid4().hex[:8].upper()}"
    )
    patient_id: Mapped[Optional[str]] = mapped_column(String, ForeignKey("patients.patient_id"), nullable=True)
    event_type: Mapped[str] = mapped_column(String, nullable=False)
    entity_type: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    entity_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    # event_time: when the clinical event actually occurred
    event_time: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    # created_at: when this audit record was written to the DB
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    extra_metadata: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON string
