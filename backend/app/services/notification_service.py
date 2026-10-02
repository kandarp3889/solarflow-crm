import logging
from typing import List, Optional, Union
from sqlalchemy.orm import Session
from app.models.models import Notification, User, UserRole, Lead, FollowUp, Survey, Quotation, Company
from app.services.email_service import send_notification_email
from app.services.websocket_manager import emit_realtime_notification

logger = logging.getLogger(__name__)

ADMIN_ROLES = {
    UserRole.COMPANY_ADMIN.value,
    UserRole.SUPER_ADMIN.value,
    "company_admin",
    "super_admin"
}

def _get_actor_name(actor: Optional[Union[User, str]]) -> str:
    if isinstance(actor, str):
        return actor
    if actor:
        return actor.full_name or actor.email or "User"
    return "System"

def _get_actor_user(actor: Optional[Union[User, str]]) -> Optional[User]:
    if isinstance(actor, User):
        return actor
    return None

def dispatch_targeted_notification(
    db: Session,
    company_id: int,
    actor: Optional[User],
    assigned_user_id: Optional[int],
    title: str,
    message: str,
    category: str = "lead",
    link_url: Optional[str] = None
) -> List[Notification]:
    """
    Role-specific, targeted notification engine:
    1. Assigned User / Non-Admin performs an action (e.g. moves lead to Deal Won, updates follow-up):
       -> In-app notification + Email sent ONLY to the company Admin(s).
       -> Other team members do NOT receive it.
       -> Actor does not receive self-notifications.
    2. Admin performs an action (e.g. moves lead, schedules follow-up):
       -> In-app notification + Email sent ONLY to the user assigned to that lead.
       -> Does NOT notify the entire team or other admins.
    3. Unauthenticated/System event (e.g. incoming website inquiry):
       -> Notifies company Admin(s) and assigned user (if assigned).
    """
    try:
        is_actor_admin = False
        actor_id = None
        if actor:
            actor_id = actor.id
            is_actor_admin = actor.role in ADMIN_ROLES

        target_users: List[User] = []

        if actor is None:
            # System or external intake: notify admins and assigned user (if any)
            admins = db.query(User).filter(
                User.company_id == company_id,
                User.is_active == True,
                User.role.in_(ADMIN_ROLES)
            ).all()
            target_map = {u.id: u for u in admins}
            if assigned_user_id:
                rep = db.query(User).filter(
                    User.id == assigned_user_id,
                    User.company_id == company_id,
                    User.is_active == True
                ).first()
                if rep:
                    target_map[rep.id] = rep
            target_users = list(target_map.values())

        elif is_actor_admin:
            # Requirement 2: Admin performs action -> Send ONLY to the assigned user
            if assigned_user_id and assigned_user_id != actor_id:
                rep = db.query(User).filter(
                    User.id == assigned_user_id,
                    User.company_id == company_id,
                    User.is_active == True
                ).first()
                if rep:
                    target_users = [rep]
            # If no user assigned or assigned to the admin himself, no other team member is notified
        else:
            # Requirement 1: Non-admin assigned user performs action -> Send ONLY to the Admin(s)
            admins = db.query(User).filter(
                User.company_id == company_id,
                User.is_active == True,
                User.role.in_(ADMIN_ROLES),
                User.id != actor_id
            ).all()
            target_users = admins

        company = db.query(Company).filter(Company.id == company_id).first()
        company_settings = company.solar_settings if company else None

        created_notifs = []
        for recipient in target_users:
            # 1. In-App Notification
            notif = Notification(
                company_id=company_id,
                user_id=recipient.id,
                title=title,
                message=message,
                category=category,
                link_url=link_url,
                is_read=False
            )
            db.add(notif)
            created_notifs.append(notif)

            # 2. Email Notification
            if recipient.email:
                send_notification_email(
                    to_email=recipient.email,
                    recipient_name=recipient.full_name or "Team Member",
                    subject=f"[SolarFlow CRM] {title}",
                    title=title,
                    message=message,
                    link_url=link_url,
                    company_settings=company_settings
                )

        if created_notifs:
            db.commit()
            for notif in created_notifs:
                try:
                    db.refresh(notif)
                    emit_realtime_notification(
                        user_id=notif.user_id,
                        payload={
                            "type": "new_notification",
                            "notification": {
                                "id": notif.id,
                                "title": notif.title,
                                "message": notif.message,
                                "category": notif.category,
                                "link_url": notif.link_url,
                                "is_read": notif.is_read,
                                "created_at": notif.created_at.isoformat() if notif.created_at else None
                            }
                        }
                    )
                except Exception as ex:
                    logger.warning(f"Failed to emit realtime ws notification: {ex}")

        logger.info(f"Targeted dispatch: {len(created_notifs)} recipient(s) for event '{title}'")
        return created_notifs

    except Exception as e:
        logger.error(f"Error in dispatch_targeted_notification: {e}")
        db.rollback()
        return []

def notify_lead_created(db: Session, company_id: int, lead: Lead, actor: Optional[Union[User, str]] = None):
    actor_user = _get_actor_user(actor)
    actor_name = _get_actor_name(actor)
    title = f"New Lead: {lead.full_name}"
    kw_str = f" ({lead.recommended_kw} kW)" if lead.recommended_kw else ""
    message = f"New solar rooftop lead {lead.lead_id} ({lead.full_name}) captured by {actor_name} via {lead.lead_source}{kw_str}."
    return dispatch_targeted_notification(
        db=db,
        company_id=company_id,
        actor=actor_user,
        assigned_user_id=lead.assigned_to_id,
        title=title,
        message=message,
        category="lead",
        link_url=f"/leads/{lead.id}"
    )

def notify_lead_updated(db: Session, company_id: int, lead: Lead, actor: Optional[Union[User, str]], changes_summary: str):
    actor_user = _get_actor_user(actor)
    actor_name = _get_actor_name(actor)
    title = f"Lead Updated: {lead.full_name}"
    message = f"{actor_name} updated lead {lead.lead_id} ({lead.full_name}): {changes_summary}."
    return dispatch_targeted_notification(
        db=db,
        company_id=company_id,
        actor=actor_user,
        assigned_user_id=lead.assigned_to_id,
        title=title,
        message=message,
        category="lead",
        link_url=f"/leads/{lead.id}"
    )

def notify_stage_changed(
    db: Session,
    company_id: int,
    lead: Lead,
    old_stage: str,
    new_stage: str,
    actor: Optional[Union[User, str]],
    win_probability: Optional[int] = None
):
    actor_user = _get_actor_user(actor)
    actor_name = _get_actor_name(actor)
    title = f"Lead Stage: {lead.full_name} -> {new_stage}"
    win_str = f" (Win Probability: {win_probability}%)" if win_probability is not None else ""
    message = f"{actor_name} moved lead {lead.lead_id} ({lead.full_name}) from '{old_stage}' to '{new_stage}'{win_str}."
    return dispatch_targeted_notification(
        db=db,
        company_id=company_id,
        actor=actor_user,
        assigned_user_id=lead.assigned_to_id,
        title=title,
        message=message,
        category="pipeline",
        link_url=f"/leads/{lead.id}"
    )

def notify_followup_scheduled(db: Session, company_id: int, lead: Lead, followup: FollowUp, actor: Optional[Union[User, str]]):
    actor_user = _get_actor_user(actor)
    actor_name = _get_actor_name(actor)
    title = f"Follow-up Scheduled: {lead.full_name if lead else 'Customer'}"
    date_str = followup.scheduled_date.strftime('%d %b %Y, %I:%M %p') if followup.scheduled_date else "upcoming"
    note_str = f" Note: {followup.notes}" if followup.notes else ""
    message = f"{actor_name} scheduled a {followup.follow_up_type.title()} follow-up for {date_str}.{note_str}"
    target_assigned_id = followup.assigned_to_id or (lead.assigned_to_id if lead else None)
    return dispatch_targeted_notification(
        db=db,
        company_id=company_id,
        actor=actor_user,
        assigned_user_id=target_assigned_id,
        title=title,
        message=message,
        category="followup",
        link_url=f"/leads/{lead.id}" if lead else None
    )

def notify_followup_completed(db: Session, company_id: int, lead: Lead, followup: FollowUp, actor: Optional[Union[User, str]]):
    actor_user = _get_actor_user(actor)
    actor_name = _get_actor_name(actor)
    cust_name = lead.full_name if lead else "Customer"
    lead_code = f" ({lead.lead_id})" if lead else ""
    title = f"Follow-up Completed: {cust_name}"
    message = f"{actor_name} completed {followup.follow_up_type.title()} follow-up for {cust_name}{lead_code}."
    target_assigned_id = followup.assigned_to_id or (lead.assigned_to_id if lead else None)
    return dispatch_targeted_notification(
        db=db,
        company_id=company_id,
        actor=actor_user,
        assigned_user_id=target_assigned_id,
        title=title,
        message=message,
        category="followup",
        link_url=f"/leads/{lead.id}" if lead else None
    )

def notify_survey_progress(db: Session, company_id: int, lead: Lead, survey: Survey, action_type: str, actor: Optional[Union[User, str]]):
    actor_user = _get_actor_user(actor)
    actor_name = _get_actor_name(actor)
    cust_name = lead.full_name if lead else "Customer"
    title = f"Site Survey {action_type.title()}: {cust_name}"
    if action_type.lower() == "completed":
        message = f"Rooftop survey {survey.survey_code} completed by {actor_name}. Available roof: {survey.available_roof_area} sqft, Recommended: {survey.recommended_system_size} kW."
    else:
        date_str = survey.scheduled_date.strftime('%d %b %Y') if survey.scheduled_date else "TBD"
        message = f"Rooftop site survey {survey.survey_code} {action_type} by {actor_name} for {date_str}."
    target_assigned_id = survey.assigned_engineer_id or (lead.assigned_to_id if lead else None)
    return dispatch_targeted_notification(
        db=db,
        company_id=company_id,
        actor=actor_user,
        assigned_user_id=target_assigned_id,
        title=title,
        message=message,
        category="survey",
        link_url=f"/leads/{lead.id}" if lead else None
    )

def notify_quotation_progress(db: Session, company_id: int, lead: Lead, quotation: Quotation, action_type: str, actor: Optional[Union[User, str]]):
    actor_user = _get_actor_user(actor)
    actor_name = _get_actor_name(actor)
    cust_name = lead.full_name if lead else "Customer"
    title = f"Quotation {action_type.title()}: {quotation.quotation_number}"
    price_str = f"₹{quotation.final_price:,.0f}"
    message = f"Solar quotation proposal {quotation.quotation_number} ({quotation.system_size_kw} kW, {price_str}) for {cust_name} {action_type} by {actor_name}."
    target_assigned_id = lead.assigned_to_id if lead else quotation.created_by_id
    return dispatch_targeted_notification(
        db=db,
        company_id=company_id,
        actor=actor_user,
        assigned_user_id=target_assigned_id,
        title=title,
        message=message,
        category="quotation",
        link_url=f"/leads/{lead.id}" if lead else None
    )

def notify_lead_note_added(db: Session, company_id: int, lead: Lead, note_content: str, actor: Optional[Union[User, str]]):
    actor_user = _get_actor_user(actor)
    actor_name = _get_actor_name(actor)
    title = f"Note Added: {lead.full_name}"
    preview = note_content[:90] + ("..." if len(note_content) > 90 else "")
    message = f"{actor_name} logged a note on {lead.lead_id} ({lead.full_name}): \"{preview}\""
    return dispatch_targeted_notification(
        db=db,
        company_id=company_id,
        actor=actor_user,
        assigned_user_id=lead.assigned_to_id,
        title=title,
        message=message,
        category="lead",
        link_url=f"/leads/{lead.id}"
    )

def notify_lead_assigned(db: Session, company_id: int, lead: Lead, assigned_to_user_id: int, actor: Optional[Union[User, str]]):
    actor_user = _get_actor_user(actor)
    actor_name = _get_actor_name(actor)
    title = f"Lead Assigned: {lead.full_name}"
    message = f"{actor_name} assigned solar rooftop lead {lead.lead_id} ({lead.full_name}) to you."
    return dispatch_targeted_notification(
        db=db,
        company_id=company_id,
        actor=actor_user,
        assigned_user_id=assigned_to_user_id,
        title=title,
        message=message,
        category="lead",
        link_url=f"/leads/{lead.id}"
    )
