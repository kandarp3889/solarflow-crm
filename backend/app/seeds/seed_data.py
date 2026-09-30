import random
from datetime import datetime, timedelta
from app.database import SessionLocal, engine, Base
from app.models.models import (
    Company, User, Lead, LeadActivity, LeadNote,
    FollowUp, Survey, Quotation, LeadSource,
    AutomationRule, Notification, AuditLog,
    UserRole, LeadStage, ScoreCategory, FollowUpType,
    FollowUpStatus, SurveyStatus, QuotationStatus
)
from app.security import get_password_hash
from app.services.lead_scoring import calculate_lead_score
from app.services.quotation_calc import calculate_solar_quotation

def run_seed():
    print("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Check if already seeded
    existing_comp = db.query(Company).filter(Company.slug == "truesun-energy").first()
    if existing_comp:
        print("Database already contains True Sun Energy seed data. Skipping creation.")
        db.close()
        return

    print("Seeding Company: True Sun Energy...")
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

    print("Seeding Users & Roles...")
    hashed_pwd = get_password_hash("SolarAdmin123!")

    # Super Admin (Universal platform admin)
    super_admin = User(
        company_id=None,
        email="superadmin@solarplatform.com",
        hashed_password=hashed_pwd,
        full_name="Alexander Sterling",
        phone="+1 555-0199",
        role=UserRole.SUPER_ADMIN.value,
        avatar_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
    )
    db.add(super_admin)

    # 10 Team Members for True Sun Energy
    team_definitions = [
        ("admin@truesunenergy.in", "Vikramaditya Sharma", "+91 99740 45095", UserRole.COMPANY_ADMIN.value, "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80"),
        ("manager@truesunenergy.in", "Ananya Deshmukh", "+91 99740 45096", UserRole.SALES_MANAGER.value, "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80"),
        ("rep@truesunenergy.in", "Rohan Verma", "+91 99740 45097", UserRole.SALES_REP.value, "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80"),
        ("priya@truesunenergy.in", "Priya Nair", "+91 99740 45098", UserRole.SALES_REP.value, "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&auto=format&fit=crop&q=80"),
        ("amit@truesunenergy.in", "Amit Patel", "+91 99740 45099", UserRole.SALES_REP.value, "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80"),
        ("sneha@truesunenergy.in", "Sneha Kulkarni", "+91 99740 45100", UserRole.SALES_REP.value, "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80"),
        ("karan@truesunenergy.in", "Karan Mehta", "+91 99740 45101", UserRole.SALES_REP.value, "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&auto=format&fit=crop&q=80"),
        ("engineer@truesunenergy.in", "Rajesh Kumar", "+91 99740 45102", UserRole.SURVEY_ENGINEER.value, "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&auto=format&fit=crop&q=80"),
        ("suresh@truesunenergy.in", "Suresh Pillai", "+91 99740 45103", UserRole.SURVEY_ENGINEER.value, "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100&auto=format&fit=crop&q=80"),
        ("arun@truesunenergy.in", "Arun Singhal", "+91 99740 45104", UserRole.SALES_REP.value, "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=100&auto=format&fit=crop&q=80")
    ]

    users = []
    for email, name, phone, role, avatar in team_definitions:
        u = User(
            company_id=company.id,
            email=email,
            hashed_password=hashed_pwd,
            full_name=name,
            phone=phone,
            role=role,
            avatar_url=avatar,
            is_active=True
        )
        db.add(u)
        users.append(u)

    db.commit()
    for u in users:
        db.refresh(u)

    sales_reps = [u for u in users if u.role in [UserRole.SALES_REP.value, UserRole.SALES_MANAGER.value]]
    survey_engineers = [u for u in users if u.role == UserRole.SURVEY_ENGINEER.value]

    print("Seeding Lead Sources...")
    source_defs = [
        ("Website", 180.0, 35000.0),
        ("WhatsApp", 120.0, 24000.0),
        ("Google Ads", 450.0, 75000.0),
        ("Facebook", 320.0, 48000.0),
        ("Instagram", 280.0, 32000.0),
        ("Referral", 50.0, 10000.0),
        ("Phone", 150.0, 15000.0),
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

    print("Seeding 50 Realistic Solar Leads & Pipeline Data...")
    indian_names = [
        ("Rajesh Agarwal", "Bengaluru", "Karnataka"),
        ("Siddharth Menon", "Kochi", "Kerala"),
        ("Sunita Reddy", "Hyderabad", "Telangana"),
        ("Manish Gupta", "Delhi", "Delhi"),
        ("Pooja Singhania", "Mumbai", "Maharashtra"),
        ("Vikram Chauhan", "Jaipur", "Rajasthan"),
        ("Deepak Bansal", "Chandigarh", "Punjab"),
        ("Neha Joshi", "Pune", "Maharashtra"),
        ("Rameshwar Rao", "Visakhapatnam", "Andhra Pradesh"),
        ("Ashok Chawla", "Gurugram", "Haryana"),
        ("Divya Balakrishnan", "Chennai", "Tamil Nadu"),
        ("Harish Venkatesh", "Coimbatore", "Tamil Nadu"),
        ("Sanjay Kothari", "Ahmedabad", "Gujarat"),
        ("Kavita Jain", "Indore", "Madhya Pradesh"),
        ("Pradeep Nair", "Thiruvananthapuram", "Kerala"),
        ("Gaurav Kapoor", "Noida", "Uttar Pradesh"),
        ("Alok Srivastava", "Lucknow", "Uttar Pradesh"),
        ("Anuradha Roy", "Kolkata", "West Bengal"),
        ("Tanmay Bhattacharya", "Bhubaneswar", "Odisha"),
        ("Mahesh Varma", "Nagpur", "Maharashtra"),
        ("Rohit Sen", "Surat", "Gujarat"),
        ("Bhavna Pandya", "Vadodara", "Gujarat"),
        ("Naveen Patnaik", "Cuttack", "Odisha"),
        ("Tarun Bajaj", "Faridabad", "Haryana"),
        ("Meenakshi Sundaram", "Madurai", "Tamil Nadu"),
        ("Arvind Swamy", "Mysuru", "Karnataka"),
        ("Satish Hegde", "Mangaluru", "Karnataka"),
        ("Swati Deshmukh", "Nashik", "Maharashtra"),
        ("Ritu Oberoi", "Ludhiana", "Punjab"),
        ("Kunal Ghosh", "Howrah", "West Bengal"),
        ("Vikas Mittal", "Ghaziabad", "Uttar Pradesh"),
        ("Pallavi Kulkarni", "Aurangabad", "Maharashtra"),
        ("Sudhir Kamath", "Udupi", "Karnataka"),
        ("Shweta Tiwari", "Bhopal", "Madhya Pradesh"),
        ("Ajay Mallik", "Patna", "Bihar"),
        ("Nandini Iyer", "Tiruchirappalli", "Tamil Nadu"),
        ("Girish Pai", "Goa", "Goa"),
        ("Geeta Rao", "Vijayawada", "Andhra Pradesh"),
        ("Kishore Shenoy", "Hubballi", "Karnataka"),
        ("Vandana Sethi", "Dehradun", "Uttarakhand"),
        ("Rajan Pillai", "Kollam", "Kerala"),
        ("Anand Mahindra", "Bengaluru", "Karnataka"),
        ("Preeti Kashyap", "Ranchi", "Jharkhand"),
        ("Suresh Raina", "Meerut", "Uttar Pradesh"),
        ("Charu Lata", "Varanasi", "Uttar Pradesh"),
        ("Manoj Tiwari", "Gwalior", "Madhya Pradesh"),
        ("Hemant Soren", "Jamshedpur", "Jharkhand"),
        ("Lata Mangesh", "Kolhapur", "Maharashtra"),
        ("Dinesh Karthik", "Salem", "Tamil Nadu"),
        ("Shalini Bhargava", "Amritsar", "Punjab")
    ]

    roof_types = ["Concrete Flat", "Metal Sheet", "Tile", "Curved Industrial"]
    providers = ["BESCOM", "Tata Power DDL", "BSES Rajdhani", "MSEDCL", "TANGEDCO", "Adani Electricity", "TSSPDCL", "Torrent Power"]
    sources = ["Website", "WhatsApp", "Google Ads", "Facebook", "Instagram", "Referral", "Phone"]
    stages = [
        "new_lead", "new_lead", "contacted", "contacted",
        "qualified", "qualified", "qualified",
        "survey_scheduled", "survey_scheduled",
        "survey_completed", "survey_completed",
        "quotation_sent", "quotation_sent", "quotation_sent",
        "negotiation", "negotiation",
        "won", "won", "won", "won",
        "lost"
    ]

    now = datetime.utcnow()

    for idx, (name, city, state) in enumerate(indian_names):
        lead_code = f"SOL-2026-{idx + 1:04d}"
        rep = random.choice(sales_reps)
        engineer = random.choice(survey_engineers)
        stage = random.choice(stages)
        source = random.choice(sources)
        roof = random.choice(roof_types)
        provider = random.choice(providers)

        # Realistic electrical metrics
        is_commercial = (idx % 8 == 0)
        p_type = "Commercial" if is_commercial else "Residential"
        
        if is_commercial:
            bill = random.choice([25000, 45000, 85000, 150000])
            kw = round(bill / 1200.0, 1) # 20 - 120 kW
            roof_sqft = kw * 110.0
            consumption = kw * 125.0
        else:
            bill = random.choice([3200, 4500, 6800, 9500, 14000])
            kw = round(max(3.0, bill / 950.0), 1) # 3 - 15 kW
            roof_sqft = random.choice([450, 750, 1100, 1500, 2200])
            consumption = kw * 120.0

        battery = random.choice([True, False, False, False])
        ev = random.choice([True, False, False])

        score, category = calculate_lead_score(
            monthly_bill=bill,
            roof_area_sqft=roof_sqft,
            system_size_kw=kw,
            property_type=p_type,
            lead_source=source,
            battery_required=battery,
            ev_requirement=ev
        )

        est_val = round(kw * 50000.0, 2)
        created_days_ago = random.randint(1, 60)
        created_time = now - timedelta(days=created_days_ago, hours=random.randint(1, 12))

        probabilities = {
            "new_lead": 15, "contacted": 25, "qualified": 40,
            "survey_scheduled": 50, "survey_completed": 60,
            "quotation_sent": 75, "negotiation": 85, "won": 100, "lost": 0
        }

        lead = Lead(
            company_id=company.id,
            lead_id=lead_code,
            full_name=name,
            phone=f"+91 9{random.randint(100000000, 999999999)}",
            whatsapp=f"+91 9{random.randint(100000000, 999999999)}",
            email=f"{name.lower().replace(' ', '.')}@example.com",
            address=f"Plot #{random.randint(12, 550)}, Phase {random.randint(1, 5)}, Sector {random.randint(10, 85)}",
            city=city,
            state=state,
            pincode=f"{random.randint(110001, 700099)}",
            property_type=p_type,
            monthly_bill=bill,
            consumption_kwh=consumption,
            recommended_kw=kw,
            interested_kw=kw,
            roof_type=roof,
            roof_area_sqft=roof_sqft,
            electricity_provider=provider,
            existing_solar=False,
            battery_required=battery,
            battery_capacity_kwh=10.0 if battery else 0.0,
            ev_requirement=ev,
            lead_source=source,
            assigned_to_id=rep.id,
            stage=stage,
            lead_score=score,
            score_category=category,
            estimated_value=est_val,
            win_probability_pct=probabilities.get(stage, 40),
            created_at=created_time,
            next_follow_up_date=now + timedelta(days=random.randint(1, 7)) if stage not in ["won", "lost"] else None
        )
        db.add(lead)
        db.commit()
        db.refresh(lead)

        # Add initial activity
        act1 = LeadActivity(
            company_id=company.id,
            lead_id=lead.id,
            user_id=rep.id,
            activity_type="lead_created",
            title="Lead Ingested",
            description=f"Inquiry received via {source}. Calculated {category.upper()} lead score: {score}/100.",
            created_at=created_time
        )
        db.add(act1)

        # Add initial note
        note = LeadNote(
            company_id=company.id,
            lead_id=lead.id,
            user_id=rep.id,
            content=f"Customer has an average electricity bill of ₹{bill:,.0f}/month. Interested in {kw} kW rooftop system under {provider}. Subsidy applicable: ₹78,000.",
            created_at=created_time + timedelta(hours=2)
        )
        db.add(note)

        # If beyond new_lead, add follow-up or survey
        if stage != "new_lead":
            f_type = random.choice([FollowUpType.CALL.value, FollowUpType.WHATSAPP.value, FollowUpType.SITE_VISIT.value])
            f_status = FollowUpStatus.COMPLETED.value if stage in ["won", "negotiation", "quotation_sent"] else random.choice([FollowUpStatus.PENDING.value, FollowUpStatus.COMPLETED.value, FollowUpStatus.OVERDUE.value])
            followup = FollowUp(
                company_id=company.id,
                lead_id=lead.id,
                assigned_to_id=rep.id,
                scheduled_date=now + timedelta(days=random.randint(-3, 5), hours=random.randint(1, 8)),
                follow_up_type=f_type,
                status=f_status,
                notes=f"Discuss system sizing ({kw} kW) and schedule roof assessment.",
                reminder=True
            )
            db.add(followup)

        # If survey stage reached, create Survey record
        if stage in ["survey_scheduled", "survey_completed", "quotation_sent", "negotiation", "won"]:
            srv_status = SurveyStatus.COMPLETED.value if stage in ["survey_completed", "quotation_sent", "negotiation", "won"] else SurveyStatus.SCHEDULED.value
            survey = Survey(
                company_id=company.id,
                lead_id=lead.id,
                survey_code=f"SRV-2026-{idx + 1:04d}",
                assigned_engineer_id=engineer.id,
                status=srv_status,
                scheduled_date=created_time + timedelta(days=2),
                completed_date=created_time + timedelta(days=3) if srv_status == SurveyStatus.COMPLETED.value else None,
                roof_type=roof,
                roof_area=roof_sqft,
                available_roof_area=round(roof_sqft * 0.85, 1),
                roof_direction="South-West",
                roof_shading="None",
                electricity_connection_type="3-Phase" if kw >= 5.0 else "Single Phase",
                phase="3-Phase" if kw >= 5.0 else "Single Phase",
                sanctioned_load_kw=max(5.0, kw),
                meter_number=f"MTR-{random.randint(100000, 999999)}",
                existing_inverter="None",
                existing_solar=False,
                recommended_system_size=kw,
                engineer_notes="Roof structure is solid RCC. South-facing azimuth provides 95%+ shadow-free exposure.",
                files=[
                    {"name": "Roof_South_Facing_Panorama.jpg", "type": "image/jpeg", "size": "2.4 MB"},
                    {"name": "Electricity_Meter_DISCOM.jpg", "type": "image/jpeg", "size": "1.8 MB"},
                    {"name": "DISCOM_Electricity_Bill.pdf", "type": "application/pdf", "size": "450 KB"}
                ]
            )
            db.add(survey)

        # If quotation stage reached, create Quotation
        if stage in ["quotation_sent", "negotiation", "won"]:
            quote_calc = calculate_solar_quotation(
                system_size_kw=kw,
                panel_cost_per_watt=28.0,
                panel_wattage=550,
                inverter_cost=42000.0,
                battery_cost=60000.0 if battery else 0.0,
                structure_cost=18000.0,
                installation_cost=22000.0,
                discount=5000.0,
                gst_rate=13.8,
                apply_subsidy=True
            )

            q_status = QuotationStatus.ACCEPTED.value if stage == "won" else QuotationStatus.SENT.value
            quote = Quotation(
                company_id=company.id,
                lead_id=lead.id,
                quotation_number=f"QT-2026-{idx + 1:04d}",
                status=q_status,
                system_size_kw=kw,
                panel_brand="Tata Power Solar",
                panel_wattage=550,
                panel_quantity=quote_calc["panel_quantity"],
                inverter_brand="Sungrow",
                inverter_capacity=f"{int(kw)} kW High Efficiency",
                battery_backup="10 kWh Lithium-ion" if battery else "None",
                structure_type="Elevated Galvanized Iron (GI)",
                system_price=quote_calc["system_price"],
                installation_cost=quote_calc["installation_cost"],
                other_costs=quote_calc["other_costs"],
                discount=quote_calc["discount"],
                subtotal=quote_calc["subtotal"],
                gst_rate=quote_calc["gst_rate"],
                gst_amount=quote_calc["gst_amount"],
                subsidy_amount=quote_calc["subsidy_amount"],
                final_price=quote_calc["final_price"],
                monthly_generation_kwh=quote_calc["monthly_generation_kwh"],
                monthly_savings=quote_calc["monthly_savings"],
                payback_years=quote_calc["payback_years"],
                valid_until=now + timedelta(days=14),
                notes="Includes 5-year comprehensive free maintenance, net-metering liaison, and 25-year panel performance warranty.",
                created_by_id=rep.id
            )
            db.add(quote)

    db.commit()

    print("Seeding Automation Rules...")
    rules = [
        AutomationRule(
            company_id=company.id,
            name="Instant Lead Assignment & Welcome Pitch",
            description="When new lead arrives, trigger WhatsApp greeting and follow-up call task within 2 hours.",
            trigger_event="lead_created",
            conditions={"min_bill": 3000},
            actions=[
                {"type": "create_followup", "followup_type": "call", "days_offset": 1, "notes": "Initial technical qualification call."},
                {"type": "send_notification", "title": "New High-Value Lead Assigned", "message": "A new solar rooftop inquiry has been assigned to you."},
                {"type": "log_activity", "title": "Auto-Welcome Dispatched", "description": "WhatsApp introductory brochure dispatched to customer."}
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
            description="Notify sales rep immediately when site survey measurements are recorded.",
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

    print("Seeding Notifications...")
    sample_notifs = [
        ("High-Intent Lead Arrived", "Rajesh Agarwal (SOL-2026-0001) requested a 5 kW rooftop quote with ₹6,800/mo bill.", "lead", "/leads/1"),
        ("Site Survey Completed", "Survey SRV-2026-0005 for Pooja Singhania completed by Suresh Pillai.", "survey", "/surveys"),
        ("Quotation Accepted!", "Deal WON: Manish Gupta accepted proposal QT-2026-0004 for ₹229,260.", "quotation", "/quotations"),
        ("Follow-up Due Today", "Call scheduled with Sunita Reddy regarding 8 kW commercial rooftop proposal.", "followup", "/followups")
    ]
    for title, msg, cat, link in sample_notifs:
        notif = Notification(
            company_id=company.id,
            user_id=sales_reps[0].id,
            title=title,
            message=msg,
            category=cat,
            link_url=link,
            is_read=False,
            created_at=now - timedelta(minutes=random.randint(15, 300))
        )
        db.add(notif)

    db.commit()
    db.close()
    print("Seeding complete! 50 realistic solar leads, 10 team members, follow-ups, surveys, quotations, and rules created successfully.")

if __name__ == "__main__":
    run_seed()
