from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models.models import Survey, Lead, LeadActivity, User, Company, SurveyStatus, LeadStage
from app.schemas.schemas import SurveyCreate, SurveyUpdate, SurveyResponse
from app.api.deps import get_current_user, get_current_company
from app.services.notification_service import notify_survey_progress

router = APIRouter(prefix="/surveys", tags=["Site Surveys"])

@router.get("", response_model=List[SurveyResponse])
def get_surveys(
    status: Optional[str] = None,
    assigned_engineer: Optional[int] = None,
    lead_id: Optional[int] = None,
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    query = db.query(Survey).filter(Survey.company_id == company.id)

    if status:
        query = query.filter(Survey.status == status)
    if assigned_engineer:
        query = query.filter(Survey.assigned_engineer_id == assigned_engineer)
    if lead_id:
        query = query.filter(Survey.lead_id == lead_id)

    surveys = query.order_by(desc(Survey.created_at)).all()

    result = []
    for s in surveys:
        res = SurveyResponse.from_orm(s)
        if s.lead:
            res.lead_name = s.lead.full_name
            res.lead_phone = s.lead.phone
            res.lead_address = f"{s.lead.address or ''}, {s.lead.city or ''}".strip(", ")
        if s.assigned_engineer:
            res.assigned_engineer_name = s.assigned_engineer.full_name
        result.append(res)
    return result

@router.post("", response_model=SurveyResponse)
def create_survey(
    survey_in: SurveyCreate,
    current_user: User = Depends(get_current_user),
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    lead = db.query(Lead).filter(Lead.id == survey_in.lead_id, Lead.company_id == company.id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    count = db.query(Survey).filter(Survey.company_id == company.id).count() + 1
    code = f"SRV-2026-{count:04d}"

    survey_data = survey_in.dict()
    new_survey = Survey(
        **survey_data,
        company_id=company.id,
        survey_code=code
    )
    db.add(new_survey)

    # Automatically advance lead to survey_scheduled if currently earlier
    if lead.stage in [LeadStage.NEW_LEAD.value, LeadStage.CONTACTED.value, LeadStage.QUALIFIED.value]:
        lead.stage = LeadStage.SURVEY_SCHEDULED.value

    # Log activity
    act = LeadActivity(
        company_id=company.id,
        lead_id=lead.id,
        user_id=current_user.id,
        activity_type="survey_scheduled",
        title=f"Site Survey Scheduled ({code})",
        description=f"Engineer assessment scheduled for {survey_in.scheduled_date.strftime('%d %b %Y') if survey_in.scheduled_date else 'TBD'}."
    )
    db.add(act)

    db.commit()
    db.refresh(new_survey)

    # Send targeted notification about scheduled survey
    notify_survey_progress(db, company.id, lead, new_survey, "scheduled", current_user)

    res = SurveyResponse.from_orm(new_survey)
    res.lead_name = lead.full_name
    res.lead_phone = lead.phone
    res.lead_address = f"{lead.address or ''}, {lead.city or ''}".strip(", ")
    if new_survey.assigned_engineer:
        res.assigned_engineer_name = new_survey.assigned_engineer.full_name
    return res

@router.get("/{survey_id}", response_model=SurveyResponse)
def get_survey_detail(
    survey_id: int,
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    s = db.query(Survey).filter(Survey.id == survey_id, Survey.company_id == company.id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Survey not found")

    res = SurveyResponse.from_orm(s)
    if s.lead:
        res.lead_name = s.lead.full_name
        res.lead_phone = s.lead.phone
        res.lead_address = f"{s.lead.address or ''}, {s.lead.city or ''}".strip(", ")
    if s.assigned_engineer:
        res.assigned_engineer_name = s.assigned_engineer.full_name
    return res

@router.put("/{survey_id}", response_model=SurveyResponse)
def update_survey(
    survey_id: int,
    survey_in: SurveyUpdate,
    current_user: User = Depends(get_current_user),
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    s = db.query(Survey).filter(Survey.id == survey_id, Survey.company_id == company.id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Survey not found")

    old_status = s.status
    update_data = survey_in.dict(exclude_unset=True)
    for k, v in update_data.items():
        setattr(s, k, v)

    # If completed, stamp timestamp and update lead stage
    if survey_in.status == SurveyStatus.COMPLETED.value and old_status != SurveyStatus.COMPLETED.value:
        s.completed_date = datetime.utcnow()
        if s.lead and s.lead.stage in [LeadStage.SURVEY_SCHEDULED.value]:
            s.lead.stage = LeadStage.SURVEY_COMPLETED.value

        act = LeadActivity(
            company_id=company.id,
            lead_id=s.lead_id,
            user_id=current_user.id,
            activity_type="survey_completed",
            title=f"Site Survey Completed ({s.survey_code})",
            description=f"Recommended size: {s.recommended_system_size} kW. Available roof area: {s.available_roof_area} sq.ft."
        )
        db.add(act)

    db.commit()
    db.refresh(s)

    # Send targeted notification of survey update / completion
    if s.lead:
        action_name = "completed" if survey_in.status == SurveyStatus.COMPLETED.value else "updated"
        notify_survey_progress(db, company.id, s.lead, s, action_name, current_user)

    res = SurveyResponse.from_orm(s)
    if s.lead:
        res.lead_name = s.lead.full_name
        res.lead_phone = s.lead.phone
        res.lead_address = f"{s.lead.address or ''}, {s.lead.city or ''}".strip(", ")
    if s.assigned_engineer:
        res.assigned_engineer_name = s.assigned_engineer.full_name
    return res

@router.post("/{survey_id}/files")
def upload_survey_file(
    survey_id: int,
    file_info: Dict[str, Any],
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    s = db.query(Survey).filter(Survey.id == survey_id, Survey.company_id == company.id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Survey not found")

    current_files = list(s.files or [])
    file_info["uploaded_at"] = datetime.utcnow().isoformat()
    current_files.append(file_info)
    s.files = current_files

    db.commit()
    return {"message": "File recorded successfully", "files": s.files}
