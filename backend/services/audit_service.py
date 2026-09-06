import json
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session

import models


# ─────────────────────────────────────────────────────────
# Canonical event-type constants
# ─────────────────────────────────────────────────────────
class AuditEventType:
    REQUEST_CREATED             = "REQUEST_CREATED"
    HANDOFF_RECEIVED            = "HANDOFF_RECEIVED"
    TIMELINE_RECONSTRUCTED      = "TIMELINE_RECONSTRUCTED"
    RESULT_RECEIVED             = "RESULT_RECEIVED"
    RESPONSIBILITY_RESOLVED     = "RESPONSIBILITY_RESOLVED"
    NOTIFICATION_CREATED        = "NOTIFICATION_CREATED"
    NOTIFICATION_ACKNOWLEDGED   = "NOTIFICATION_ACKNOWLEDGED"
    # Availability & Escalation events
    CLINICIAN_AVAILABILITY_CHANGED = "CLINICIAN_AVAILABILITY_CHANGED"
    NOTIFICATION_ESCALATED      = "NOTIFICATION_ESCALATED"
    ESCALATION_REQUIRED         = "ESCALATION_REQUIRED"
    # Optional extras
    RESULT_RE_EVALUATED         = "RESULT_RE_EVALUATED"
    DUPLICATE_EVENT_REJECTED    = "DUPLICATE_EVENT_REJECTED"
    REQUEST_UPDATED             = "REQUEST_UPDATED"



# ─────────────────────────────────────────────────────────
# Core function — append-only audit record creation
# ─────────────────────────────────────────────────────────
def create_audit_log(
    db: Session,
    event_type: str,
    description: str,
    patient_id: Optional[str] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    event_time: Optional[datetime] = None,
    extra_metadata: Optional[dict] = None,
) -> models.AuditLog:
    """
    Create and persist a single audit record.

    Parameters
    ----------
    db            : Active SQLAlchemy session
    event_type    : One of AuditEventType constants
    description   : Human-readable explanation of what happened
    patient_id    : Related patient (nullable for system events)
    entity_type   : "REQUEST" | "HANDOFF" | "RESULT" | "NOTIFICATION" | …
    entity_id     : ID of the related entity (e.g. "R001", "H001")
    event_time    : When the clinical event actually occurred (may differ from now)
    extra_metadata: Optional dict serialised to JSON for richer explainability

    Notes
    -----
    - created_at is set by the database server (func.now()), ensuring the
      audit record's storage time is independent of event_time.
    - This function never updates or deletes existing records (append-only).
    """
    metadata_json = json.dumps(extra_metadata) if extra_metadata else None

    audit_log = models.AuditLog(
        patient_id=patient_id,
        event_type=event_type,
        entity_type=entity_type,
        entity_id=entity_id,
        description=description,
        event_time=event_time,
        extra_metadata=metadata_json,
    )

    db.add(audit_log)
    db.commit()
    db.refresh(audit_log)
    return audit_log
