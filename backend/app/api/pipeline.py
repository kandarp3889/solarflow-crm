from typing import List, Dict, Any
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models.models import Lead, LeadActivity, User, Company, LeadStage
from app.schemas.schemas import LeadResponse
from app.api.deps import get_current_user, get_current_company
from app.services.automation_engine import process_automation_event

router = APIRouter(prefix="/pipeline", tags=["Pipeline"])

class MoveCardRequest(BaseModel):
    lead_id: int
    new_stage: str

PIPELINE_STAGES = [
    {"id": "new_lead", "label": "New Lead", "color": "blue"},
    {"id": "contacted", "label": "Contacted", "color": "indigo"},
    {"id": "qualified", "label": "Qualified", "color": "amber"},
    {"id": "survey_scheduled", "label": "Survey Scheduled", "color": "purple"},
    {"id": "survey_completed", "label": "Survey Completed", "color": "cyan"},
    {"id": "quotation_sent", "label": "Quotation Sent", "color": "orange"},
    {"id": "negotiation", "label": "Negotiation", "color": "pink"},
    {"id": "won", "label": "Won", "color": "emerald"},
    {"id": "lost", "label": "Lost", "color": "red"},
]

@router.get("/stages")
def get_pipeline_stages(
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    leads = db.query(Lead).filter(Lead.company_id == company.id).order_by(desc(Lead.created_at)).all()

    stages_dict = {s["id"]: [] for s in PIPELINE_STAGES}
    for l in leads:
        lead_dict = LeadResponse.from_orm(l)
        if l.assigned_to:
            lead_dict.assigned_to_name = l.assigned_to.full_name
        stage_key = l.stage if l.stage in stages_dict else "new_lead"
        stages_dict[stage_key].append(lead_dict)

    columns = []
    for s in PIPELINE_STAGES:
        stage_leads = stages_dict[s["id"]]
        total_val = sum(item.estimated_value for item in stage_leads)
        columns.append({
            "id": s["id"],
            "label": s["label"],
            "color": s["color"],
            "count": len(stage_leads),
            "total_value": total_val,
            "leads": stage_leads
        })

    return columns

@router.patch("/move-card")
def move_pipeline_card(
    req: MoveCardRequest,
    current_user: User = Depends(get_current_user),
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    lead = db.query(Lead).filter(Lead.id == req.lead_id, Lead.company_id == company.id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    old_stage = lead.stage
    lead.stage = req.new_stage

    # Update win probability dynamically based on stage
    probabilities = {
        "new_lead": 15,
        "contacted": 25,
        "qualified": 40,
        "survey_scheduled": 50,
        "survey_completed": 60,
        "quotation_sent": 75,
        "negotiation": 85,
        "won": 100,
        "lost": 0
    }
    lead.win_probability_pct = probabilities.get(req.new_stage, 50)

    # Log activity
    act = LeadActivity(
        company_id=company.id,
        lead_id=lead.id,
        user_id=current_user.id,
        activity_type="stage_changed",
        title=f"Stage Changed via Pipeline",
        description=f"Moved from {old_stage.replace('_', ' ').title()} to {req.new_stage.replace('_', ' ').title()}."
    )
    db.add(act)
    db.commit()

    # Trigger automation
    process_automation_event("stage_changed", lead, db, company.id)

    res = LeadResponse.from_orm(lead)
    if lead.assigned_to:
        res.assigned_to_name = lead.assigned_to.full_name
    return res
