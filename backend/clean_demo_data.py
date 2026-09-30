"""
Utility script to wipe all demo leads, quotations, surveys, follow-ups,
and extra demo users while retaining the primary Company Admin account.
"""
import os
import sys

# Ensure backend directory is in python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine
from sqlalchemy import text

def clean_database():
    print("Connecting to database...")
    with engine.connect() as conn:
        trans = conn.begin()
        try:
            print("Purging demo quotations, surveys, follow-ups, notes, activities, and leads...")
            if engine.dialect.name == "postgresql":
                conn.execute(text("TRUNCATE TABLE quotations, surveys, followups, lead_activities, lead_notes, notifications, audit_logs, leads RESTART IDENTITY CASCADE;"))
                conn.execute(text("DELETE FROM users WHERE email != 'admin@truesunenergy.in';"))
            else:
                conn.execute(text("DELETE FROM quotations;"))
                conn.execute(text("DELETE FROM surveys;"))
                conn.execute(text("DELETE FROM followups;"))
                conn.execute(text("DELETE FROM lead_activities;"))
                conn.execute(text("DELETE FROM lead_notes;"))
                conn.execute(text("DELETE FROM notifications;"))
                conn.execute(text("DELETE FROM audit_logs;"))
                conn.execute(text("DELETE FROM leads;"))
                conn.execute(text("DELETE FROM users WHERE email != 'admin@truesunenergy.in';"))
            
            trans.commit()
            print("SUCCESS: All demo data wiped clean! Only admin@truesunenergy.in retained.")
        except Exception as e:
            trans.rollback()
            print(f"Error purging demo data: {e}")

if __name__ == "__main__":
    clean_database()
