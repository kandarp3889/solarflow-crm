from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import AutomationRule, Company
from app.schemas.schemas import AutomationRuleCreate, AutomationRuleResponse
from app.api.deps import get_current_company

router = APIRouter(prefix="/automation", tags=["Workflow Automation"])

@router.get("/rules", response_model=List[AutomationRuleResponse])
def get_automation_rules(
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    rules = db.query(AutomationRule).filter(AutomationRule.company_id == company.id).all()
    return rules

@router.post("/rules", response_model=AutomationRuleResponse)
def create_automation_rule(
    rule_in: AutomationRuleCreate,
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    new_rule = AutomationRule(
        company_id=company.id,
        name=rule_in.name,
        description=rule_in.description,
        trigger_event=rule_in.trigger_event,
        conditions=rule_in.conditions or {},
        actions=rule_in.actions,
        is_active=True
    )
    db.add(new_rule)
    db.commit()
    db.refresh(new_rule)
    return new_rule

@router.patch("/rules/{rule_id}/toggle")
def toggle_automation_rule(
    rule_id: int,
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    rule = db.query(AutomationRule).filter(AutomationRule.id == rule_id, AutomationRule.company_id == company.id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    rule.is_active = not rule.is_active
    db.commit()
    return {"id": rule.id, "is_active": rule.is_active}
