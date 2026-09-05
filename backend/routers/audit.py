from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import AuditLog
from schemas import AuditLogResponse

router = APIRouter(prefix="/audit", tags=["Audit Trail"])


@router.get("/", response_model=list[AuditLogResponse])
def get_all_audit_logs(db: Session = Depends(get_db)):
    """
    Return all audit records ordered by created_at (storage time).

    Append-only: no update or delete endpoints are provided.
    """
    return (
        db.query(AuditLog)
        .order_by(AuditLog.created_at)
        .all()
    )


@router.get("/{audit_id}", response_model=AuditLogResponse)
def get_audit_log(audit_id: str, db: Session = Depends(get_db)):
    """
    Return a single audit record by audit_id.
    """
    log = db.query(AuditLog).filter(AuditLog.audit_id == audit_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Audit record not found")
    return log
