from app.database import SessionLocal, engine, Base
from app.models.models import (
    Company, User, LeadSource, AutomationRule,
    UserRole
)
from app.security import get_password_hash

def run_seed():
    print("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Check if already seeded
    existing_comp = db.query(Company).filter(Company.slug == "truesun-energy").first()
    if existing_comp:
        print("Database already contains company configuration. Skipping creation.")
        db.close()
        return

    print("Creating Company: True Sun Energy...")
    company = Company(
        name="True Sun Energy",
        slug="truesun-energy",
        logo_url="/truesun-logo-white.png",
        phone="+91 99740 45095",
        email="info.truesunenergy@gmail.com",
        address="1st Floor Office No. 13, Prime Complex, Bypass Chokdi, Mangrol, Gujarat 362225",
        website="https://truesunenergy.in",
        gstin="24AAACT8921R1Z8",
        subscription_plan="enterprise",
        solar_settings={
            "panel_brands": ["Adani Solar", "Waaree Energies", "Goldi Solar", "Tata Power Solar", "Vikram Solar"],
            "inverter_brands": ["Sungrow", "Growatt", "Solis", "GoodWe", "Fronius", "Enphase"],
            "base_cost_per_watt": 48.0,
            "default_gst_rate": 13.8,
            "subsidy_rules": {
                "1kw": 30000,
                "2kw": 60000,
                "3kw_plus": 78000
            },
            "score_thresholds": {
                "hot": 80,
                "warm": 50
            }
        }
    )
    db.add(company)
    db.commit()
    db.refresh(company)

    print("Creating Single Company Admin...")
    hashed_pwd = get_password_hash("SolarAdmin123!")

    # Single Primary Company Admin
    admin_user = User(
        company_id=company.id,
        email="admin@truesunenergy.in",
        hashed_password=hashed_pwd,
        full_name="Vikramaditya Sharma",
        phone="+91 99740 45095",
        role=UserRole.COMPANY_ADMIN.value,
        avatar_url="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
        is_active=True
    )
    db.add(admin_user)
    db.commit()
    db.refresh(admin_user)

    print("Configuring Lead Sources...")
    source_defs = [
        ("Website", 0.0, 0.0),
        ("WhatsApp", 0.0, 0.0),
        ("Google Ads", 0.0, 0.0),
        ("Facebook", 0.0, 0.0),
        ("Instagram", 0.0, 0.0),
        ("Referral", 0.0, 0.0),
        ("Phone", 0.0, 0.0),
        ("Manual", 0.0, 0.0)
    ]
    for s_name, cpl, spend in source_defs:
        src = LeadSource(
            company_id=company.id,
            name=s_name,
            cost_per_lead=cpl,
            total_spend=spend
        )
        db.add(src)
    db.commit()

    print("Configuring Automation Workflows...")
    rules = [
        AutomationRule(
            company_id=company.id,
            name="Instant Lead Welcome & Follow-Up Task",
            description="When a new lead arrives, schedule follow-up call task within 24 hours.",
            trigger_event="lead_created",
            conditions={"min_bill": 3000},
            actions=[
                {"type": "create_followup", "followup_type": "call", "days_offset": 1, "notes": "Initial technical qualification call."},
                {"type": "send_notification", "title": "New Solar Lead Assigned", "message": "A new solar rooftop inquiry has been received."}
            ],
            is_active=True
        ),
        AutomationRule(
            company_id=company.id,
            name="Quotation Follow-Up Cadence",
            description="After quotation is sent, automatically schedule follow-up check after 2 days.",
            trigger_event="quotation_sent",
            conditions={},
            actions=[
                {"type": "create_followup", "followup_type": "call", "days_offset": 2, "notes": "Follow up on proposal review and subsidy query."},
                {"type": "send_notification", "title": "Quotation Follow-Up Scheduled", "message": "Quotation proposal follow-up set for in 48 hours."}
            ],
            is_active=True
        ),
        AutomationRule(
            company_id=company.id,
            name="Post-Survey Engineering Alert",
            description="Notify sales team when site survey measurements are recorded.",
            trigger_event="survey_completed",
            conditions={},
            actions=[
                {"type": "send_notification", "title": "Site Survey Ready for Quotation", "message": "Engineering roof measurements recorded. Ready to generate quotation."}
            ],
            is_active=True
        )
    ]
    for r in rules:
        db.add(r)

    db.commit()
    db.close()
    print("Initialization complete: 1 admin user, clean database with 0 demo leads.")

if __name__ == "__main__":
    run_seed()
