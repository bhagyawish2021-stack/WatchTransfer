from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
import datetime

from .database import Base

class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String, unique=True, index=True)
    name = Column(String)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    standing_requests = relationship("StandingRequest", back_populates="patient")
    responsibility_events = relationship("ResponsibilityEvent", back_populates="patient")
    result_events = relationship("ResultEvent", back_populates="patient")
    notifications = relationship("Notification", back_populates="patient")

class Clinician(Base):
    __tablename__ = "clinicians"

    id = Column(Integer, primary_key=True, index=True)
    clinician_id = Column(String, unique=True, index=True)
    name = Column(String)
    role = Column(String)
    department = Column(String)

class StandingRequest(Base):
    __tablename__ = "standing_requests"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(String, unique=True, index=True)
    patient_id = Column(String, ForeignKey("patients.patient_id"))
    requested_by = Column(String, ForeignKey("clinicians.clinician_id"))
    result_type = Column(String)
    condition = Column(String)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(String, default="ACTIVE")

    patient = relationship("Patient", back_populates="standing_requests")
    notifications = relationship("Notification", back_populates="standing_request")

class ResponsibilityEvent(Base):
    __tablename__ = "responsibility_events"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(String, unique=True, index=True)
    patient_id = Column(String, ForeignKey("patients.patient_id"))
    from_clinician = Column(String, ForeignKey("clinicians.clinician_id"), nullable=True)
    to_clinician = Column(String, ForeignKey("clinicians.clinician_id"))
    event_time = Column(DateTime)
    received_at = Column(DateTime, default=datetime.datetime.utcnow)
    source = Column(String)

    patient = relationship("Patient", back_populates="responsibility_events")

class ResultEvent(Base):
    __tablename__ = "result_events"

    id = Column(Integer, primary_key=True, index=True)
    result_id = Column(String, unique=True, index=True)
    patient_id = Column(String, ForeignKey("patients.patient_id"))
    result_type = Column(String)
    event_time = Column(DateTime)
    received_at = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(String, default="PROCESSED")

    patient = relationship("Patient", back_populates="result_events")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    notification_id = Column(String, unique=True, index=True)
    request_id = Column(String, ForeignKey("standing_requests.request_id"))
    patient_id = Column(String, ForeignKey("patients.patient_id"))
    clinician_id = Column(String, ForeignKey("clinicians.clinician_id"))
    trigger_time = Column(DateTime)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(String, default="PENDING")

    patient = relationship("Patient", back_populates="notifications")
    standing_request = relationship("StandingRequest", back_populates="notifications")
    acknowledgments = relationship("Acknowledgment", back_populates="notification")

class Acknowledgment(Base):
    __tablename__ = "acknowledgments"

    id = Column(Integer, primary_key=True, index=True)
    notification_id = Column(String, ForeignKey("notifications.notification_id"))
    clinician_id = Column(String, ForeignKey("clinicians.clinician_id"))
    acknowledged_at = Column(DateTime, default=datetime.datetime.utcnow)

    notification = relationship("Notification", back_populates="acknowledgments")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String, nullable=True)
    request_id = Column(String, nullable=True)
    event_type = Column(String)
    description = Column(Text)
    event_time = Column(DateTime)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
