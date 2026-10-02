import re
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models.models import Lead, LeadActivity, User, Company, PipelineStage
from app.schemas.schemas import LeadResponse
from app.api.deps import get_current_user, get_current_company
from app.services.automation_engine import process_automation_event
from app.services.notification_service import notify_stage_changed
from app.services.loan_service import ensure_loan_process_for_lead, build_loan_process_summary

router = APIRouter(prefix="/pipeline", tags=["Pipeline"])

class MoveCardRequest(BaseModel):
    lead_id: int
    new_stage: str

class StageCreate(BaseModel):
    label: str
    key: Optional[str] = None
    color: Optional[str] = "blue"
    win_probability_pct: Optional[int] = 50
    is_won: Optional[bool] = False
    is_lost: Optional[bool] = False
    order_index: Optional[int] = None

class StageUpdate(BaseModel):
    label: Optional[str] = None
    key: Optional[str] = None
    color: Optional[str] = None
    win_probability_pct: Optional[int] = None
    is_won: Optional[bool] = None
    is_lost: Optional[bool] = None
    order_index: Optional[int] = None

class StageReorder(BaseModel):
    stage_ids: List[int]

def slugify(text: str) -> str:
    s = text.lower().strip()
    s = re.sub(r'[^a-z0-9]+', '_', s)
    s = s.strip('_')
    return s or "stage"

def get_company_pipeline_stages(company_id: int, db: Session) -> List[PipelineStage]:
    stages = db.query(PipelineStage).filter(PipelineStage.company_id == company_id).order_by(PipelineStage.order_index).all()
    if not stages:
        default_stages = [
            {"key": "new_lead", "label": "New Lead", "color": "blue", "order_index": 0, "win_probability_pct": 15, "is_won": False, "is_lost": False},
            {"key": "contacted", "label": "Contacted", "color": "indigo", "order_index": 1, "win_probability_pct": 25, "is_won": False, "is_lost": False},
            {"key": "qualified", "label": "Qualified", "color": "amber", "order_index": 2, "win_probability_pct": 40, "is_won": False, "is_lost": False},
            {"key": "survey_scheduled", "label": "Site Survey", "color": "purple", "order_index": 3, "win_probability_pct": 50, "is_won": False, "is_lost": False},
            {"key": "survey_completed", "label": "Survey Done", "color": "cyan", "order_index": 4, "win_probability_pct": 60, "is_won": False, "is_lost": False},
            {"key": "quotation_sent", "label": "Quotation Sent", "color": "orange", "order_index": 5, "win_probability_pct": 75, "is_won": False, "is_lost": False},
            {"key": "negotiation", "label": "Negotiation", "color": "pink", "order_index": 6, "win_probability_pct": 85, "is_won": False, "is_lost": False},
            {"key": "won", "label": "Deal Won", "color": "emerald", "order_index": 7, "win_probability_pct": 100, "is_won": True, "is_lost": False},
            {"key": "lost", "label": "Deal Lost", "color": "red", "order_index": 8, "win_probability_pct": 0, "is_won": False, "is_lost": True},
        ]
        created_stages = []
        for s_data in default_stages:
            stage_obj = PipelineStage(company_id=company_id, **s_data)
            db.add(stage_obj)
            created_stages.append(stage_obj)
        db.commit()
        for s in created_stages:
            db.refresh(s)
        return created_stages
    return stages

@router.get("/stages")
def get_pipeline_stages(
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    stages = get_company_pipeline_stages(company.id, db)
    leads = db.query(Lead).filter(Lead.company_id == company.id).order_by(desc(Lead.created_at)).all()

    stages_dict = {s.key: [] for s in stages}
    fallback_key = stages[0].key if stages else "new_lead"

    for l in leads:
        lead_dict = LeadResponse.from_orm(l)
        if l.assigned_to:
            lead_dict.assigned_to_name = l.assigned_to.full_name
        stage_key = l.stage if l.stage in stages_dict else fallback_key
        stages_dict[stage_key].append(lead_dict)

    columns = []
    for s in stages:
        stage_leads = stages_dict.get(s.key, [])
        total_val = 0.0
        columns.append({
            "id": s.key,            # Keep "id": key for backward compatibility with frontend col.id
            "stage_id": s.id,       # Database record ID
            "key": s.key,
            "label": s.label,
            "color": s.color,
            "order_index": s.order_index,
            "win_probability_pct": s.win_probability_pct,
            "is_won": s.is_won,
            "is_lost": s.is_lost,
            "count": len(stage_leads),
            "total_value": total_val,
            "leads": stage_leads
        })

    return columns

@router.get("/stages/config")
def get_pipeline_stage_config(
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    stages = get_company_pipeline_stages(company.id, db)
    return [
        {
            "id": s.key,
            "stage_id": s.id,
            "key": s.key,
            "label": s.label,
            "color": s.color,
            "order_index": s.order_index,
            "win_probability_pct": s.win_probability_pct,
            "is_won": s.is_won,
            "is_lost": s.is_lost
        }
        for s in stages
    ]

@router.post("/stages")
def create_pipeline_stage(
    stage_in: StageCreate,
    current_user: User = Depends(get_current_user),
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    stages = get_company_pipeline_stages(company.id, db)

    # Clean label
    label = stage_in.label.strip()
    if not label:
        raise HTTPException(status_code=400, detail="Stage name cannot be empty")

    # Generate unique key for company
    base_key = slugify(stage_in.key or label)
    key = base_key
    counter = 1
    existing_keys = {s.key for s in stages}
    while key in existing_keys:
        key = f"{base_key}_{counter}"
        counter += 1

    # Determine order index
    if stage_in.order_index is not None:
        order_idx = stage_in.order_index
    else:
        order_idx = max([s.order_index for s in stages], default=-1) + 1

    new_stage = PipelineStage(
        company_id=company.id,
        key=key,
        label=label,
        color=stage_in.color or "blue",
        order_index=order_idx,
        win_probability_pct=max(0, min(100, stage_in.win_probability_pct if stage_in.win_probability_pct is not None else 50)),
        is_won=bool(stage_in.is_won),
        is_lost=bool(stage_in.is_lost)
    )
    db.add(new_stage)
    db.commit()
    db.refresh(new_stage)

    return {
        "id": new_stage.key,
        "stage_id": new_stage.id,
        "key": new_stage.key,
        "label": new_stage.label,
        "color": new_stage.color,
        "order_index": new_stage.order_index,
        "win_probability_pct": new_stage.win_probability_pct,
        "is_won": new_stage.is_won,
        "is_lost": new_stage.is_lost
    }

@router.put("/stages/reorder")
def reorder_pipeline_stages(
    req: StageReorder,
    current_user: User = Depends(get_current_user),
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    stages = db.query(PipelineStage).filter(PipelineStage.company_id == company.id).all()
    stage_map = {s.id: s for s in stages}

    for order_idx, sid in enumerate(req.stage_ids):
        if sid in stage_map:
            stage_map[sid].order_index = order_idx

    db.commit()
    return {"success": True, "message": "Pipeline stages reordered successfully"}

@router.post("/stages/reset")
def reset_pipeline_stages(
    current_user: User = Depends(get_current_user),
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    # Remove existing stages
    db.query(PipelineStage).filter(PipelineStage.company_id == company.id).delete()

    default_stages = [
        {"key": "new_lead", "label": "New Lead", "color": "blue", "order_index": 0, "win_probability_pct": 15, "is_won": False, "is_lost": False},
        {"key": "contacted", "label": "Contacted", "color": "indigo", "order_index": 1, "win_probability_pct": 25, "is_won": False, "is_lost": False},
        {"key": "qualified", "label": "Qualified", "color": "amber", "order_index": 2, "win_probability_pct": 40, "is_won": False, "is_lost": False},
        {"key": "survey_scheduled", "label": "Site Survey", "color": "purple", "order_index": 3, "win_probability_pct": 50, "is_won": False, "is_lost": False},
        {"key": "survey_completed", "label": "Survey Done", "color": "cyan", "order_index": 4, "win_probability_pct": 60, "is_won": False, "is_lost": False},
        {"key": "quotation_sent", "label": "Quotation Sent", "color": "orange", "order_index": 5, "win_probability_pct": 75, "is_won": False, "is_lost": False},
        {"key": "negotiation", "label": "Negotiation", "color": "pink", "order_index": 6, "win_probability_pct": 85, "is_won": False, "is_lost": False},
        {"key": "won", "label": "Deal Won", "color": "emerald", "order_index": 7, "win_probability_pct": 100, "is_won": True, "is_lost": False},
        {"key": "lost", "label": "Deal Lost", "color": "red", "order_index": 8, "win_probability_pct": 0, "is_won": False, "is_lost": True},
    ]
    for s_data in default_stages:
        stg = PipelineStage(company_id=company.id, **s_data)
        db.add(stg)
    db.commit()

    # Move any orphaned leads whose stage key is invalid to 'new_lead'
    valid_keys = [s["key"] for s in default_stages]
    db.query(Lead).filter(Lead.company_id == company.id, Lead.stage.notin_(valid_keys)).update({"stage": "new_lead"}, synchronize_session=False)
    db.commit()

    return {"success": True, "message": "Pipeline stages reset to solar industry standard defaults"}

@router.put("/stages/{stage_id}")
def update_pipeline_stage(
    stage_id: int,
    stage_in: StageUpdate,
    current_user: User = Depends(get_current_user),
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    stage = db.query(PipelineStage).filter(PipelineStage.id == stage_id, PipelineStage.company_id == company.id).first()
    if not stage:
        raise HTTPException(status_code=404, detail="Pipeline stage not found")

    old_key = stage.key
    if stage_in.label is not None:
        cleaned_label = stage_in.label.strip()
        if cleaned_label:
            stage.label = cleaned_label
    if stage_in.color is not None:
        stage.color = stage_in.color
    if stage_in.win_probability_pct is not None:
        stage.win_probability_pct = max(0, min(100, stage_in.win_probability_pct))
    if stage_in.is_won is not None:
        stage.is_won = stage_in.is_won
    if stage_in.is_lost is not None:
        stage.is_lost = stage_in.is_lost
    if stage_in.order_index is not None:
        stage.order_index = stage_in.order_index

    # If key changed, check conflict and update matching leads
    if stage_in.key and stage_in.key != old_key:
        new_key = slugify(stage_in.key)
        conflict = db.query(PipelineStage).filter(
            PipelineStage.company_id == company.id,
            PipelineStage.key == new_key,
            PipelineStage.id != stage.id
        ).first()
        if conflict:
            raise HTTPException(status_code=400, detail=f"Stage key '{new_key}' is already used by another stage.")
        stage.key = new_key
        # Update matching leads to new key
        db.query(Lead).filter(Lead.company_id == company.id, Lead.stage == old_key).update({"stage": new_key})

    db.commit()
    db.refresh(stage)

    return {
        "id": stage.key,
        "stage_id": stage.id,
        "key": stage.key,
        "label": stage.label,
        "color": stage.color,
        "order_index": stage.order_index,
        "win_probability_pct": stage.win_probability_pct,
        "is_won": stage.is_won,
        "is_lost": stage.is_lost
    }

@router.delete("/stages/{stage_id}")
def delete_pipeline_stage(
    stage_id: int,
    fallback_stage_key: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    stages = get_company_pipeline_stages(company.id, db)
    if len(stages) <= 1:
        raise HTTPException(status_code=400, detail="Cannot delete the only pipeline stage. At least one stage is required.")

    stage = db.query(PipelineStage).filter(PipelineStage.id == stage_id, PipelineStage.company_id == company.id).first()
    if not stage:
        raise HTTPException(status_code=404, detail="Pipeline stage not found")

    deleted_key = stage.key
    other_stages = [s for s in stages if s.id != stage_id]

    # Check fallback stage
    target_fallback = fallback_stage_key
    if not target_fallback or target_fallback == deleted_key:
        target_fallback = other_stages[0].key

    # Validate that fallback stage exists in company
    if not any(s.key == target_fallback for s in other_stages):
        target_fallback = other_stages[0].key

    # Migrate any leads in the deleted stage to fallback stage
    leads_count = db.query(Lead).filter(Lead.company_id == company.id, Lead.stage == deleted_key).count()
    if leads_count > 0:
        db.query(Lead).filter(Lead.company_id == company.id, Lead.stage == deleted_key).update({"stage": target_fallback})

    db.delete(stage)

    # Re-normalize order_index
    for idx, s in enumerate(other_stages):
        s.order_index = idx

    db.commit()
    return {
        "success": True,
        "message": f"Stage '{stage.label}' deleted successfully. {leads_count} lead(s) moved to '{target_fallback}'."
    }

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
    stages = get_company_pipeline_stages(company.id, db)
    target_stage = next((s for s in stages if s.key == req.new_stage), None)
    if target_stage:
        lead.win_probability_pct = target_stage.win_probability_pct
    else:
        probabilities = {
            "new_lead": 15, "contacted": 25, "qualified": 40,
            "survey_scheduled": 50, "survey_completed": 60,
            "quotation_sent": 75, "negotiation": 85, "won": 100, "lost": 0
        }
        lead.win_probability_pct = probabilities.get(req.new_stage, 50)

    # Log activity
    old_label = next((s.label for s in stages if s.key == old_stage), old_stage.replace('_', ' ').title())
    new_label = target_stage.label if target_stage else req.new_stage.replace('_', ' ').title()

    act = LeadActivity(
        company_id=company.id,
        lead_id=lead.id,
        user_id=current_user.id,
        activity_type="stage_changed",
        title=f"Stage Changed via Pipeline",
        description=f"Moved from {old_label} to {new_label}."
    )
    db.add(act)
    db.commit()

    # Automatically initialize Loan Process if moved to Deal Won
    is_won_stage = req.new_stage == "won" or (target_stage and target_stage.is_won)
    if is_won_stage:
        ensure_loan_process_for_lead(db, company.id, lead, current_user.id)

    # Trigger automation
    process_automation_event("stage_changed", lead, db, company.id)

    # Send targeted notification of stage progress
    notify_stage_changed(
        db=db,
        company_id=company.id,
        lead=lead,
        old_stage=old_label,
        new_stage=new_label,
        actor=current_user,
        win_probability=lead.win_probability_pct
    )

    res = LeadResponse.from_orm(lead)
    if lead.assigned_to:
        res.assigned_to_name = lead.assigned_to.full_name
    res.loan_process = build_loan_process_summary(lead.loan_process)
    return res
