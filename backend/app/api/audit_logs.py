from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models.models import AuditLog, Company, User
from app.schemas.schemas import AuditLogResponse
from app.api.deps import get_current_company

router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"])

@router.get("", response_model=List[AuditLogResponse])
def get_audit_logs(
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    logs = db.query(AuditLog).filter(AuditLog.company_id == company.id).order_by(desc(AuditLog.created_at)).limit(100).all()
    results = []
    for l in logs:
        res = AuditLogResponse.from_orm(l)
        if l.user_id:
            u = db.query(User).filter(User.id == l.user_id).first()
            if u:
                res.user_name = u.full_name
        results.append(res)
    return results
