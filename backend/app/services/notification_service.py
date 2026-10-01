import logging
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.models import Notification, User, UserRole, Lead, FollowUp, Survey, Quotation

logger = logging.getLogger(__name__)

def notify_company_admins(
    db: Session,
    company_id: int,
    title: str,
    message: str,
    category: str = "lead",
    link_url: Optional[str] = None,
    include_user_ids: Optional[List[int]] = None
) -> List[Notification]:
    """
    Sends a notification to all active administrators (and managers) of a company,
    plus any additional user IDs specified (e.g. assigned rep/engineer).
    """
    try:
        admin_roles = [
            UserRole.COMPANY_ADMIN.value,
            UserRole.SUPER_ADMIN.value,
            UserRole.SALES_MANAGER.value,
            "company_admin",
            "super_admin",
            "sales_manager"
        ]
        admins = db.query(User).filter(
            User.company_id == company_id,
            User.is_active == True,
            User.role.in_(admin_roles)
        ).all()

        target_user_ids = {u.id for u in admins}
        if include_user_ids:
            for uid in include_user_ids:
                if uid:
                    target_user_ids.add(uid)

        created_notifs = []
        for uid in target_user_ids:
            notif = Notification(
                company_id=company_id,
                user_id=uid,
                title=title,
                message=message,
                category=category,
                link_url=link_url,
                is_read=False
            )
            db.add(notif)
            created_notifs.append(notif)

        db.commit()
        return created_notifs
    except Exception as e:
        logger.error(f"Error creating admin notifications: {e}")
        db.rollback()
        return []

def notify_lead_created(db: Session, company_id: int, lead: Lead, creator_name: Optional[str] = None):
    actor = f" by {creator_name}" if creator_name else ""
    title = f"New Lead: {lead.full_name}"
    kw_str = f" ({lead.recommended_kw or lead.interested_kw} kW)" if (lead.recommended_kw or lead.interested_kw) else ""
    message = f"New solar rooftop lead {lead.lead_id} captured{actor} via {lead.lead_source}{kw_str}. Value: ₹{(lead.estimated_value or 0):,.0f}."
    return notify_company_admins(
        db=db,
        company_id=company_id,
        title=title,
        message=message,
        category="lead",
        link_url=f"/leads/{lead.id}",
        include_user_ids=[lead.assigned_to_id] if lead.assigned_to_id else None
    )

def notify_lead_updated(db: Session, company_id: int, lead: Lead, actor_name: str, changes_summary: str):
    title = f"Lead Progress: {lead.full_name}"
    message = f"{actor_name} updated lead {lead.lead_id}: {changes_summary}."
    return notify_company_admins(
        db=db,
        company_id=company_id,
        title=title,
        message=message,
        category="lead",
        link_url=f"/leads/{lead.id}",
        include_user_ids=[lead.assigned_to_id] if lead.assigned_to_id else None
    )

def notify_stage_changed(
    db: Session,
    company_id: int,
    lead: Lead,
    old_stage: str,
    new_stage: str,
    actor_name: str,
    win_probability: Optional[int] = None
):
    title = f"Stage Advanced: {lead.full_name} -> {new_stage}"
    win_str = f" (Win Probability: {win_probability}%)" if win_probability is not None else ""
    message = f"{actor_name} moved lead {lead.lead_id} from '{old_stage}' to '{new_stage}'{win_str}."
    return notify_company_admins(
        db=db,
        company_id=company_id,
        title=title,
        message=message,
        category="pipeline",
        link_url=f"/leads/{lead.id}",
        include_user_ids=[lead.assigned_to_id] if lead.assigned_to_id else None
    )

def notify_followup_scheduled(db: Session, company_id: int, lead: Lead, followup: FollowUp, actor_name: str):
    title = f"Follow-up Scheduled: {lead.full_name}"
    date_str = followup.scheduled_date.strftime('%d %b %Y, %I:%M %p') if followup.scheduled_date else "upcoming"
    note_str = f" Note: {followup.notes}" if followup.notes else ""
    message = f"{actor_name} scheduled a {followup.follow_up_type.title()} follow-up for {date_str}.{note_str}"
    return notify_company_admins(
        db=db,
        company_id=company_id,
        title=title,
        message=message,
        category="followup",
        link_url=f"/leads/{lead.id}",
        include_user_ids=[followup.assigned_to_id, lead.assigned_to_id]
    )

def notify_followup_completed(db: Session, company_id: int, lead: Lead, followup: FollowUp, actor_name: str):
    title = f"Follow-up Completed: {lead.full_name}"
    message = f"{actor_name} completed {followup.follow_up_type.title()} follow-up for lead {lead.lead_id} ({lead.full_name})."
    return notify_company_admins(
        db=db,
        company_id=company_id,
        title=title,
        message=message,
        category="followup",
        link_url=f"/leads/{lead.id}",
        include_user_ids=[followup.assigned_to_id, lead.assigned_to_id]
    )

def notify_survey_progress(db: Session, company_id: int, lead: Lead, survey: Survey, action_type: str, actor_name: str):
    title = f"Site Survey {action_type.title()}: {lead.full_name}"
    if action_type.lower() == "completed":
        message = f"Survey {survey.survey_code} completed by {actor_name}. Available roof: {survey.available_roof_area} sqft, Recommended: {survey.recommended_system_size} kW."
    else:
        date_str = survey.scheduled_date.strftime('%d %b %Y') if survey.scheduled_date else "TBD"
        message = f"Rooftop site survey {survey.survey_code} {action_type} by {actor_name} for {date_str}."
    return notify_company_admins(
        db=db,
        company_id=company_id,
        title=title,
        message=message,
        category="survey",
        link_url=f"/leads/{lead.id}",
        include_user_ids=[survey.assigned_engineer_id, lead.assigned_to_id]
    )

def notify_quotation_progress(db: Session, company_id: int, lead: Lead, quotation: Quotation, action_type: str, actor_name: str):
    title = f"Quotation {action_type.title()}: {quotation.quotation_number}"
    price_str = f"₹{quotation.final_price:,.0f}"
    message = f"Solar quotation proposal {quotation.quotation_number} ({quotation.system_size_kw} kW, {price_str}) for {lead.full_name} {action_type} by {actor_name}."
    return notify_company_admins(
        db=db,
        company_id=company_id,
        title=title,
        message=message,
        category="quotation",
        link_url=f"/leads/{lead.id}",
        include_user_ids=[quotation.created_by_id, lead.assigned_to_id]
    )

def notify_lead_note_added(db: Session, company_id: int, lead: Lead, note_content: str, actor_name: str):
    title = f"Note Added: {lead.full_name}"
    preview = note_content[:90] + ("..." if len(note_content) > 90 else "")
    message = f"{actor_name} logged a note on {lead.lead_id}: \"{preview}\""
    return notify_company_admins(
        db=db,
        company_id=company_id,
        title=title,
        message=message,
        category="lead",
        link_url=f"/leads/{lead.id}",
        include_user_ids=[lead.assigned_to_id] if lead.assigned_to_id else None
    )
