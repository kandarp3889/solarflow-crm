"""
Script to clear all operational pipeline data from the database
(Leads, Surveys, Quotations, Follow-ups, Notes, Activities, Notifications, Audit Logs)
while safely preserving Companies, Users, Lead Sources, and Settings.
"""
import sys

if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from sqlalchemy import text
from app.database import SessionLocal, engine
from app.models.models import (
    Lead, LeadActivity, LeadNote, FollowUp, Survey, Quotation,
    Notification, AuditLog, User, Company, LeadSource, AutomationRule
)

def clear_data():
    print("[*] Connecting to database...")
    db = SessionLocal()
    try:
        # Count current records
        counts = {
            "quotations": db.query(Quotation).count(),
            "surveys": db.query(Survey).count(),
            "followups": db.query(FollowUp).count(),
            "lead_notes": db.query(LeadNote).count(),
            "lead_activities": db.query(LeadActivity).count(),
            "notifications": db.query(Notification).count(),
            "audit_logs": db.query(AuditLog).count(),
            "leads": db.query(Lead).count(),
        }

        print("\n[*] Records to be cleared:")
        for tbl, cnt in counts.items():
            print(f"  - {tbl}: {cnt} records")

        # Delete dependent records first
        db.query(Quotation).delete(synchronize_session=False)
        db.query(Survey).delete(synchronize_session=False)
        db.query(FollowUp).delete(synchronize_session=False)
        db.query(LeadNote).delete(synchronize_session=False)
        db.query(LeadActivity).delete(synchronize_session=False)
        db.query(Notification).delete(synchronize_session=False)
        db.query(AuditLog).delete(synchronize_session=False)
        db.query(Lead).delete(synchronize_session=False)
        db.commit()

        # Reset sequences if PostgreSQL
        if engine.dialect.name == "postgresql":
            print("\n[*] Resetting PostgreSQL sequences...")
            tables_to_reset = [
                ("quotations", "quotations_id_seq"),
                ("surveys", "surveys_id_seq"),
                ("followups", "followups_id_seq"),
                ("lead_notes", "lead_notes_id_seq"),
                ("lead_activities", "lead_activities_id_seq"),
                ("notifications", "notifications_id_seq"),
                ("audit_logs", "audit_logs_id_seq"),
                ("leads", "leads_id_seq"),
            ]
            for tbl, seq in tables_to_reset:
                try:
                    db.execute(text(f"ALTER SEQUENCE {seq} RESTART WITH 1;"))
                except Exception:
                    pass
            db.commit()

        # Verify remaining preserved entities
        preserved_companies = db.query(Company).count()
        preserved_users = db.query(User).count()
        preserved_sources = db.query(LeadSource).count()
        preserved_rules = db.query(AutomationRule).count()

        print("\n[OK] Pipeline data cleared successfully!")
        print("\n[*] Preserved System Configuration:")
        print(f"  - Companies: {preserved_companies}")
        print(f"  - Users / Accounts: {preserved_users}")
        print(f"  - Lead Sources: {preserved_sources}")
        print(f"  - Automation Rules: {preserved_rules}")
        print("\n[*] System is ready for fresh production lead entries starting from SOL-2026-0001.")

    except Exception as e:
        db.rollback()
        print(f"[!] Error while clearing data: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    clear_data()
