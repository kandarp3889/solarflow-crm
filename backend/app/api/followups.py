from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models.models import FollowUp, Lead, LeadActivity, User, Company, FollowUpStatus
from app.schemas.schemas import FollowUpCreate, FollowUpUpdate, FollowUpResponse
from app.api.deps import get_current_user, get_current_company
from app.services.notification_service import notify_followup_scheduled, notify_followup_completed
from app.core.timezone import now_ist, to_ist_naive, format_ist_datetime

router = APIRouter(prefix="/followups", tags=["Follow-ups"])

@router.get("", response_model=List[FollowUpResponse])
def get_followups(
    status: Optional[str] = None,
    lead_id: Optional[int] = None,
    assigned_to: Optional[int] = None,
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    query = db.query(FollowUp).filter(FollowUp.company_id == company.id)

    if status:
        query = query.filter(FollowUp.status == status)
    if lead_id:
        query = query.filter(FollowUp.lead_id == lead_id)
    if assigned_to:
        query = query.filter(FollowUp.assigned_to_id == assigned_to)

    # Dynamic overdue check: if pending and scheduled_date < now (evaluated in Asia/Kolkata)
    now = now_ist()
    items = query.order_by(FollowUp.scheduled_date.asc()).all()

    result = []
    for f in items:
        # If it was pending but scheduled in the past, consider overdue
        effective_status = f.status
        if f.status == FollowUpStatus.PENDING.value and f.scheduled_date < now:
            effective_status = FollowUpStatus.OVERDUE.value

        res = FollowUpResponse(
            id=f.id,
            company_id=f.company_id,
            lead_id=f.lead_id,
            assigned_to_id=f.assigned_to_id,
            scheduled_date=f.scheduled_date,
            follow_up_type=f.follow_up_type,
            status=effective_status,
            notes=f.notes,
            reminder=f.reminder,
            completed_at=f.completed_at,
            created_at=f.created_at,
            lead_name=f.lead.full_name if f.lead else None,
            lead_phone=f.lead.phone if f.lead else None,
            assigned_to_name=f.assigned_to.full_name if f.assigned_to else None
        )
        result.append(res)
    return result

@router.post("", response_model=FollowUpResponse)
def create_followup(
    follow_in: FollowUpCreate,
    current_user: User = Depends(get_current_user),
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    lead = db.query(Lead).filter(Lead.id == follow_in.lead_id, Lead.company_id == company.id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    assigned_id = follow_in.assigned_to_id or lead.assigned_to_id or current_user.id
    scheduled_ist = to_ist_naive(follow_in.scheduled_date)

    new_followup = FollowUp(
        company_id=company.id,
        lead_id=lead.id,
        assigned_to_id=assigned_id,
        scheduled_date=scheduled_ist,
        follow_up_type=follow_in.follow_up_type,
        status="pending",
        notes=follow_in.notes,
        reminder=follow_in.reminder
    )
    db.add(new_followup)

    # Update lead's next follow-up date
    lead.next_follow_up_date = scheduled_ist

    # Log activity on lead
    act = LeadActivity(
        company_id=company.id,
        lead_id=lead.id,
        user_id=current_user.id,
        activity_type="follow_up_scheduled",
        title=f"Follow-up Scheduled ({follow_in.follow_up_type.title()})",
        description=f"Scheduled for {format_ist_datetime(scheduled_ist)}. Note: {follow_in.notes or 'None'}"
    )
    db.add(act)

    db.commit()
    db.refresh(new_followup)

    # Send targeted notification about newly scheduled follow-up
    notify_followup_scheduled(db, company.id, lead, new_followup, current_user)

    return FollowUpResponse(
        id=new_followup.id,
        company_id=new_followup.company_id,
        lead_id=new_followup.lead_id,
        assigned_to_id=new_followup.assigned_to_id,
        scheduled_date=new_followup.scheduled_date,
        follow_up_type=new_followup.follow_up_type,
        status=new_followup.status,
        notes=new_followup.notes,
        reminder=new_followup.reminder,
        completed_at=new_followup.completed_at,
        created_at=new_followup.created_at,
        lead_name=lead.full_name,
        lead_phone=lead.phone,
        assigned_to_name=new_followup.assigned_to.full_name if new_followup.assigned_to else None
    )

@router.patch("/{followup_id}/complete")
def complete_followup(
    followup_id: int,
    current_user: User = Depends(get_current_user),
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    f = db.query(FollowUp).filter(FollowUp.id == followup_id, FollowUp.company_id == company.id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Follow-up not found")

    f.status = FollowUpStatus.COMPLETED.value
    f.completed_at = now_ist()

    act = LeadActivity(
        company_id=company.id,
        lead_id=f.lead_id,
        user_id=current_user.id,
        activity_type="follow_up_completed",
        title=f"Follow-up Completed ({f.follow_up_type.title()})",
        description=f"Completed by {current_user.full_name}."
    )
    db.add(act)

    db.commit()

    # Send targeted notification that follow-up has been completed
    if f.lead:
        notify_followup_completed(db, company.id, f.lead, f, current_user)

    return {"message": "Follow-up marked as completed"}

@router.delete("/{followup_id}")
def delete_followup(
    followup_id: int,
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    f = db.query(FollowUp).filter(FollowUp.id == followup_id, FollowUp.company_id == company.id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Follow-up not found")
    db.delete(f)
    db.commit()
    return {"message": "Follow-up deleted"}
