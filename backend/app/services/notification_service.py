import logging
from typing import List, Optional, Union
from sqlalchemy.orm import Session
from app.models.models import Notification, User, UserRole, Lead, FollowUp, Survey, Quotation, Company
from app.services.email_service import send_notification_email
from app.services.websocket_manager import emit_realtime_notification
from app.core.timezone import format_ist_datetime, format_ist_date, serialize_ist

logger = logging.getLogger(__name__)

ADMIN_ROLES = {
    UserRole.COMPANY_ADMIN.value,
    UserRole.SUPER_ADMIN.value,
    "company_admin",
    "super_admin"
}

MANAGEMENT_ROLES = {
    UserRole.COMPANY_ADMIN.value,
    UserRole.SUPER_ADMIN.value,
    UserRole.SALES_MANAGER.value,
    "company_admin",
    "super_admin",
    "sales_manager"
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
    1. Assigned User / Non-Admin performs an action:
       -> In-app notification + Email sent to company Admin(s).
       -> If assigned to another user, that user also receives it.
    2. Admin / Manager performs an action:
       -> If assigned to a sales rep / team member, that member receives it.
       -> For milestones (Deal Won, New Lead) or unassigned leads, other company admins receive it.
       -> If actor is the only user or no other recipient exists, logs in-app notification for actor.
    3. External/System event (incoming inquiry, automated cron):
       -> Notifies all company admins and assigned user (if any).
    """
    try:
        actor_id = actor.id if actor else None
        is_actor_admin = bool(actor and actor.role in ADMIN_ROLES)
        is_actor_manager = bool(actor and actor.role in MANAGEMENT_ROLES)

        admins = db.query(User).filter(
            User.company_id == company_id,
            User.is_active == True,
            User.role.in_(ADMIN_ROLES)
        ).all()

        assigned_user = None
        if assigned_user_id:
            assigned_user = db.query(User).filter(
                User.id == assigned_user_id,
                User.company_id == company_id,
                User.is_active == True
            ).first()

        target_map = {}

        if actor is None:
            # System or external intake: notify admins and assigned user (if any)
            for u in admins:
                target_map[u.id] = u
            if assigned_user:
                target_map[assigned_user.id] = assigned_user

        elif is_actor_admin or is_actor_manager:
            # Admin or Manager performed the action
            # 1. If assigned to a team member (and not the actor), notify them
            if assigned_user and assigned_user.id != actor_id:
                target_map[assigned_user.id] = assigned_user

            # 2. Check if this is a company milestone or unassigned/self-assigned action
            is_company_milestone = (
                category in ["pipeline", "lead", "quotation", "survey"] and
                any(w in title.lower() or w in message.lower() for w in ["deal won", "won", "new lead", "approved", "completed"])
            )
            has_other_rep = bool(assigned_user and assigned_user.id != actor_id)

            # If there's no other rep assigned, or if it's a company milestone: notify other admins
            if not has_other_rep or is_company_milestone:
                for u in admins:
                    if u.id != actor_id:
                        target_map[u.id] = u

            # 3. Fallback: If no other recipients exist in the system (e.g. sole admin, testing, or self-work),
            # include actor so in-app notifications and bell activity don't stay completely blank!
            if not target_map and actor:
                target_map[actor.id] = actor

        else:
            # Non-admin (Sales rep, survey engineer, installer) performed the action
            # 1. Notify company admins (excluding actor)
            for u in admins:
                if u.id != actor_id:
                    target_map[u.id] = u

            # 2. If assigned to another user (e.g. survey engineer updates lead of sales rep), notify that user
            if assigned_user and assigned_user.id != actor_id:
                target_map[assigned_user.id] = assigned_user

        target_users = list(target_map.values())

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

            # 2. Email Notification (only for other users, never send self-notification emails to actor)
            if recipient.email and (actor_id is None or recipient.id != actor_id):
                try:
                    send_notification_email(
                        to_email=recipient.email,
                        recipient_name=recipient.full_name or "Team Member",
                        subject=f"[SolarFlow CRM] {title}",
                        title=title,
                        message=message,
                        link_url=link_url,
                        company_settings=company_settings
                    )
                except Exception as mail_err:
                    logger.warning(f"Could not dispatch email to {recipient.email}: {mail_err}")

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
                                "created_at": serialize_ist(notif.created_at) if notif.created_at else None
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
    date_str = format_ist_datetime(followup.scheduled_date) if followup.scheduled_date else "upcoming"
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
        date_str = format_ist_date(survey.scheduled_date) if survey.scheduled_date else "TBD"
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
