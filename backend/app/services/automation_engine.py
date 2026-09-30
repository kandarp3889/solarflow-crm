from datetime import datetime, timedelta
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.models.models import AutomationRule, FollowUp, Notification, LeadActivity, User, Lead

def process_automation_event(
    event_name: str,
    lead: Lead,
    db: Session,
    company_id: int,
    additional_context: Dict[str, Any] = None
):
    """
    Process triggers:
    - 'lead_created'
    - 'stage_changed'
    - 'quotation_sent'
    - 'survey_completed'
    """
    rules = db.query(AutomationRule).filter(
        AutomationRule.company_id == company_id,
        AutomationRule.trigger_event == event_name,
        AutomationRule.is_active == True
    ).all()

    for rule in rules:
        actions = rule.actions or []
        for action in actions:
            action_type = action.get("type")

            if action_type == "create_followup":
                days_offset = int(action.get("days_offset", 1))
                followup_type = action.get("followup_type", "call")
                notes = action.get("notes", f"Automated follow-up triggered by {rule.name}")

                followup = FollowUp(
                    company_id=company_id,
                    lead_id=lead.id,
                    assigned_to_id=lead.assigned_to_id,
                    scheduled_date=datetime.utcnow() + timedelta(days=days_offset),
                    follow_up_type=followup_type,
                    status="pending",
                    notes=notes,
                    reminder=True
                )
                db.add(followup)

            elif action_type == "send_notification":
                title = action.get("title", f"Workflow Alert: {rule.name}")
                message = action.get("message", f"Event {event_name} triggered on {lead.full_name} ({lead.lead_id})")
                user_id = lead.assigned_to_id
                if user_id:
                    notif = Notification(
                        company_id=company_id,
                        user_id=user_id,
                        title=title,
                        message=message,
                        category="lead",
                        link_url=f"/leads/{lead.id}"
                    )
                    db.add(notif)

            elif action_type == "log_activity":
                activity_title = action.get("title", f"Automation Rule: {rule.name}")
                activity_desc = action.get("description", f"Automatic workflow executed.")
                act = LeadActivity(
                    company_id=company_id,
                    lead_id=lead.id,
                    activity_type="automation",
                    title=activity_title,
                    description=activity_desc
                )
                db.add(act)

    db.commit()
