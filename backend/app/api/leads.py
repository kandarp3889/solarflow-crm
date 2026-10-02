import csv
import io
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc

from app.database import get_db
from app.models.models import Lead, LeadActivity, LeadNote, User, Company, LeadStage, FollowUp
from app.schemas.schemas import (
    LeadCreate, LeadUpdate, LeadResponse, LeadDetailResponse,
    LeadNoteCreate, LeadNoteResponse, LeadActivityResponse,
    BulkAssignRequest, BulkStatusRequest
)
from app.services.automation_engine import process_automation_event
from app.services.notification_service import (
    notify_lead_created, notify_lead_updated, notify_lead_note_added,
    notify_stage_changed, notify_lead_assigned, dispatch_targeted_notification
)
from app.api.deps import get_current_user, get_current_company

router = APIRouter(prefix="/leads", tags=["Leads"])

@router.get("", response_model=List[LeadResponse])
def get_leads(
    search: Optional[str] = None,
    stage: Optional[str] = None,
    source: Optional[str] = None,
    assigned_to: Optional[int] = None,
    city: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    query = db.query(Lead).filter(Lead.company_id == company.id)

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Lead.full_name.ilike(s),
                Lead.phone.ilike(s),
                Lead.email.ilike(s),
                Lead.lead_id.ilike(s),
                Lead.city.ilike(s)
            )
        )
    if stage:
        query = query.filter(Lead.stage == stage)
    if source:
        query = query.filter(Lead.lead_source == source)
    if assigned_to:
        query = query.filter(Lead.assigned_to_id == assigned_to)
    if city:
        query = query.filter(Lead.city.ilike(f"%{city}%"))

    leads = query.order_by(desc(Lead.created_at)).offset(skip).limit(limit).all()

    # Enrich assigned_to_name
    result = []
    for l in leads:
        lead_dict = LeadResponse.from_orm(l)
        if l.assigned_to:
            lead_dict.assigned_to_name = l.assigned_to.full_name
        result.append(lead_dict)
    return result

@router.post("", response_model=LeadResponse)
def create_lead(
    lead_in: LeadCreate,
    current_user: User = Depends(get_current_user),
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    # Auto-generate Lead ID: e.g. SOL-2026-XXXX
    count = db.query(Lead).filter(Lead.company_id == company.id).count() + 1
    lead_code = f"SOL-2026-{count:04d}"

    lead_data = lead_in.dict()

    new_lead = Lead(
        **lead_data,
        company_id=company.id,
        lead_id=lead_code
    )
    db.add(new_lead)
    db.commit()
    db.refresh(new_lead)

    # Log activity
    act = LeadActivity(
        company_id=company.id,
        lead_id=new_lead.id,
        user_id=current_user.id,
        activity_type="lead_created",
        title="Lead Captured",
        description=f"Inquiry captured from {new_lead.lead_source}."
    )
    db.add(act)
    db.commit()

    # If next_follow_up_date is provided, create a pending follow-up record
    if new_lead.next_follow_up_date:
        followup = FollowUp(
            company_id=company.id,
            lead_id=new_lead.id,
            assigned_to_id=new_lead.assigned_to_id or current_user.id,
            scheduled_date=new_lead.next_follow_up_date,
            follow_up_type="call",
            status="pending",
            notes="Initial inquiry follow-up scheduled on lead entry."
        )
        db.add(followup)
        db.commit()

    # Trigger automation workflows
    process_automation_event("lead_created", new_lead, db, company.id)

    # Send targeted notification about newly captured solar lead
    notify_lead_created(db, company.id, new_lead, current_user)

    res = LeadResponse.from_orm(new_lead)
    if new_lead.assigned_to:
        res.assigned_to_name = new_lead.assigned_to.full_name
    return res

@router.get("/{lead_id}", response_model=LeadDetailResponse)
def get_lead_detail(
    lead_id: int,
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    lead = db.query(Lead).filter(Lead.id == lead_id, Lead.company_id == company.id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    res = LeadDetailResponse.from_orm(lead)
    if lead.assigned_to:
        res.assigned_to_name = lead.assigned_to.full_name

    # Populate activities with user names
    activities_list = []
    for a in lead.activities:
        act_dict = LeadActivityResponse.from_orm(a)
        if a.user:
            act_dict.user_name = a.user.full_name
        activities_list.append(act_dict)
    res.activities = activities_list

    # Populate notes with user names
    notes_list = []
    for n in lead.notes:
        n_dict = LeadNoteResponse.from_orm(n)
        if n.user:
            n_dict.user_name = n.user.full_name
        notes_list.append(n_dict)
    res.notes = notes_list

    return res

@router.put("/{lead_id}", response_model=LeadResponse)
def update_lead(
    lead_id: int,
    lead_in: LeadUpdate,
    current_user: User = Depends(get_current_user),
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    lead = db.query(Lead).filter(Lead.id == lead_id, Lead.company_id == company.id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    old_stage = lead.stage
    old_assigned = lead.assigned_to_id

    update_data = lead_in.dict(exclude_unset=True)
    for field, val in update_data.items():
        setattr(lead, field, val)

    # If stage changed, log activity and trigger automation
    if lead_in.stage and lead_in.stage != old_stage:
        act = LeadActivity(
            company_id=company.id,
            lead_id=lead.id,
            user_id=current_user.id,
            activity_type="stage_changed",
            title=f"Stage updated to {lead.stage.replace('_', ' ').title()}",
            description=f"Moved from {old_stage.replace('_', ' ').title()} to {lead.stage.replace('_', ' ').title()}"
        )
        db.add(act)
        process_automation_event("stage_changed", lead, db, company.id)

    if lead_in.assigned_to_id and lead_in.assigned_to_id != old_assigned:
        new_rep = db.query(User).filter(User.id == lead_in.assigned_to_id).first()
        act = LeadActivity(
            company_id=company.id,
            lead_id=lead.id,
            user_id=current_user.id,
            activity_type="assigned",
            title="Lead Reassigned",
            description=f"Assigned to {new_rep.full_name if new_rep else 'Team Member'}"
        )
        db.add(act)

    db.commit()
    db.refresh(lead)

    # If lead was newly assigned or reassigned, notify the assigned user
    if lead_in.assigned_to_id and lead_in.assigned_to_id != old_assigned:
        notify_lead_assigned(db, company.id, lead, lead.assigned_to_id, current_user)

    # Send targeted notification on lead progress/update
    if lead_in.stage and lead_in.stage != old_stage:
        notify_stage_changed(db, company.id, lead, old_stage, lead.stage, current_user, lead.win_probability_pct)
    else:
        notify_lead_updated(db, company.id, lead, current_user, "Updated customer details & status")

    res = LeadResponse.from_orm(lead)
    if lead.assigned_to:
        res.assigned_to_name = lead.assigned_to.full_name
    return res

@router.delete("/{lead_id}")
def delete_lead(
    lead_id: int,
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    lead = db.query(Lead).filter(Lead.id == lead_id, Lead.company_id == company.id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    db.delete(lead)
    db.commit()
    return {"message": "Lead deleted successfully"}

@router.post("/{lead_id}/notes", response_model=LeadNoteResponse)
def add_lead_note(
    lead_id: int,
    note_in: LeadNoteCreate,
    current_user: User = Depends(get_current_user),
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    lead = db.query(Lead).filter(Lead.id == lead_id, Lead.company_id == company.id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    new_note = LeadNote(
        company_id=company.id,
        lead_id=lead.id,
        user_id=current_user.id,
        content=note_in.content
    )
    db.add(new_note)

    # Also log to activity timeline
    act = LeadActivity(
        company_id=company.id,
        lead_id=lead.id,
        user_id=current_user.id,
        activity_type="note_added",
        title="Note Added",
        description=note_in.content[:100] + ("..." if len(note_in.content) > 100 else "")
    )
    db.add(act)

    db.commit()
    db.refresh(new_note)

    # Send targeted notification of new note on lead
    notify_lead_note_added(db, company.id, lead, note_in.content, current_user)

    res = LeadNoteResponse.from_orm(new_note)
    res.user_name = current_user.full_name
    return res

@router.post("/bulk-assign")
def bulk_assign_leads(
    req: BulkAssignRequest,
    current_user: User = Depends(get_current_user),
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    rep = db.query(User).filter(User.id == req.assigned_to_id, User.company_id == company.id).first()
    if not rep:
        raise HTTPException(status_code=404, detail="Sales representative not found")

    db.query(Lead).filter(
        Lead.id.in_(req.lead_ids),
        Lead.company_id == company.id
    ).update({"assigned_to_id": req.assigned_to_id}, synchronize_session=False)

    for lid in req.lead_ids:
        act = LeadActivity(
            company_id=company.id,
            lead_id=lid,
            user_id=current_user.id,
            activity_type="assigned",
            title="Bulk Reassigned",
            description=f"Assigned to {rep.full_name}"
        )
        db.add(act)

    db.commit()

    # Dispatch targeted notification to assigned representative
    dispatch_targeted_notification(
        db=db,
        company_id=company.id,
        actor=current_user,
        assigned_user_id=req.assigned_to_id,
        title=f"Leads Assigned: {len(req.lead_ids)} Leads",
        message=f"{current_user.full_name or 'Admin'} assigned {len(req.lead_ids)} solar rooftop leads to you.",
        category="lead",
        link_url="/leads"
    )

    return {"message": f"Successfully assigned {len(req.lead_ids)} leads to {rep.full_name}"}

@router.post("/bulk-status")
def bulk_update_status(
    req: BulkStatusRequest,
    current_user: User = Depends(get_current_user),
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    db.query(Lead).filter(
        Lead.id.in_(req.lead_ids),
        Lead.company_id == company.id
    ).update({"stage": req.stage}, synchronize_session=False)

    for lid in req.lead_ids:
        act = LeadActivity(
            company_id=company.id,
            lead_id=lid,
            user_id=current_user.id,
            activity_type="stage_changed",
            title="Bulk Stage Update",
            description=f"Stage changed to {req.stage.replace('_', ' ').title()}"
        )
        db.add(act)

    db.commit()
    return {"message": f"Updated stage to {req.stage} for {len(req.lead_ids)} leads"}

@router.get("/export/csv")
def export_leads_csv(
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    leads = db.query(Lead).filter(Lead.company_id == company.id).order_by(desc(Lead.created_at)).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Lead ID", "Name", "Phone", "Email", "City", "State", "Property Type",
        "Monthly Bill", "System Size (kW)",
        "Source", "Stage", "Created Date"
    ])

    for l in leads:
        writer.writerow([
            l.lead_id, l.full_name, l.phone, l.email or "", l.city or "", l.state or "",
            l.property_type, l.monthly_bill, l.recommended_kw,
            l.lead_source, l.stage,
            l.created_at.strftime("%Y-%m-%d")
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=solar_leads_export.csv"}
    )
