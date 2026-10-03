from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.config import settings
from app.database import engine, Base
from app.core.timezone import now_ist
# Import all models to ensure metadata registers all tables
from app.models import *

# API routers
from app.api.auth import router as auth_router
from app.api.dashboard import router as dashboard_router
from app.api.leads import router as leads_router
from app.api.pipeline import router as pipeline_router
from app.api.followups import router as followups_router
from app.api.surveys import router as surveys_router
from app.api.quotations import router as quotations_router
from app.api.team import router as team_router
from app.api.sources import router as sources_router
from app.api.reports import router as reports_router
from app.api.automation import router as automation_router
from app.api.ai import router as ai_router
from app.api.settings import router as settings_router
from app.api.notifications import router as notifications_router
from app.api.audit_logs import router as audit_logs_router
from app.api.loan_process import router as loan_process_router
from app.api.solar_systems import router as solar_systems_router

# Create database tables automatically
Base.metadata.create_all(bind=engine)

def ensure_schema_compatibility():
    from sqlalchemy import text
    try:
        with engine.connect() as conn:
            if engine.dialect.name == "postgresql":
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS custom_permissions JSON DEFAULT '[]'::json;"))
                conn.execute(text("ALTER TABLE companies ADD COLUMN IF NOT EXISTS custom_roles JSON DEFAULT '[]'::json;"))
                conn.execute(text("ALTER TABLE loan_processes ADD COLUMN IF NOT EXISTS inverter_serial_number VARCHAR(100);"))
                conn.execute(text("ALTER TABLE quotations ADD COLUMN IF NOT EXISTS system_id INTEGER;"))
                conn.execute(text("ALTER TABLE quotations ADD COLUMN IF NOT EXISTS system_name VARCHAR(150);"))
                conn.execute(text("ALTER TABLE quotations ADD COLUMN IF NOT EXISTS solar_panel_name VARCHAR(150);"))
                conn.execute(text("ALTER TABLE quotations ADD COLUMN IF NOT EXISTS inverter_name VARCHAR(150);"))
                conn.execute(text("ALTER TABLE quotations ADD COLUMN IF NOT EXISTS structure_name VARCHAR(150);"))
                conn.execute(text("ALTER TABLE quotations ADD COLUMN IF NOT EXISTS bos_name VARCHAR(150);"))
                conn.execute(text("ALTER TABLE quotations ADD COLUMN IF NOT EXISTS warranty VARCHAR(250);"))

                cols_to_drop = [
                    "consumer_number", "roof_ownership", "roof_type", "lead_score", "score_category", "estimated_value",
                    "whatsapp", "interested_kw", "consumption_kwh", "roof_area_sqft", "electricity_provider",
                    "existing_solar", "battery_required", "battery_capacity_kwh", "ev_requirement",
                    "expected_closing_date", "lost_reason"
                ]
                for col in cols_to_drop:
                    try:
                        conn.execute(text(f"ALTER TABLE leads DROP COLUMN IF EXISTS {col};"))
                    except Exception as drop_err:
                        print(f"[!] Could not drop column {col} from leads: {drop_err}")
                conn.commit()
            elif engine.dialect.name == "sqlite":
                result = conn.execute(text("PRAGMA table_info(users)")).fetchall()
                col_names = [row[1] for row in result]
                if "custom_permissions" not in col_names:
                    conn.execute(text("ALTER TABLE users ADD COLUMN custom_permissions JSON DEFAULT '[]'"))
                comp_result = conn.execute(text("PRAGMA table_info(companies)")).fetchall()
                comp_cols = [row[1] for row in comp_result]
                if "custom_roles" not in comp_cols:
                    conn.execute(text("ALTER TABLE companies ADD COLUMN custom_roles JSON DEFAULT '[]'"))
                lp_result = conn.execute(text("PRAGMA table_info(loan_processes)")).fetchall()
                lp_cols = [row[1] for row in lp_result]
                if "inverter_serial_number" not in lp_cols:
                    conn.execute(text("ALTER TABLE loan_processes ADD COLUMN inverter_serial_number VARCHAR(100)"))
                
                # Quotations table column upgrades
                q_result = conn.execute(text("PRAGMA table_info(quotations)")).fetchall()
                q_cols = [row[1] for row in q_result]
                for q_col_name, q_col_type in [
                    ("system_id", "INTEGER"),
                    ("system_name", "VARCHAR(150)"),
                    ("solar_panel_name", "VARCHAR(150)"),
                    ("inverter_name", "VARCHAR(150)"),
                    ("structure_name", "VARCHAR(150)"),
                    ("bos_name", "VARCHAR(150)"),
                    ("warranty", "VARCHAR(250)")
                ]:
                    if q_col_name not in q_cols:
                        conn.execute(text(f"ALTER TABLE quotations ADD COLUMN {q_col_name} {q_col_type}"))

                lead_result = conn.execute(text("PRAGMA table_info(leads)")).fetchall()
                lead_cols = [row[1] for row in lead_result]
                cols_to_drop = [
                    "consumer_number", "roof_ownership", "roof_type", "lead_score", "score_category", "estimated_value",
                    "whatsapp", "interested_kw", "consumption_kwh", "roof_area_sqft", "electricity_provider",
                    "existing_solar", "battery_required", "battery_capacity_kwh", "ev_requirement",
                    "expected_closing_date", "lost_reason"
                ]
                for col in cols_to_drop:
                    if col in lead_cols:
                        try:
                            conn.execute(text(f"ALTER TABLE leads DROP COLUMN {col}"))
                        except Exception as drop_err:
                            print(f"[!] Could not drop column {col} from leads: {drop_err}")

                conn.commit()
    except Exception as e:
        print(f"[!] Schema compatibility notice: {e}")

ensure_schema_compatibility()

def auto_seed_if_empty():
    try:
        from app.database import SessionLocal
        from app.models.models import Company
        from app.seeds.seed_data import run_seed
        db = SessionLocal()
        company_count = db.query(Company).count()
        db.close()
        if company_count == 0:
            print("[*] Blank database detected. Auto-seeding initial company and admin accounts...")
            run_seed()
    except Exception as e:
        print(f"[!] Auto-seed check notice: {e}")

def ensure_default_pipeline_stages():
    try:
        from app.database import SessionLocal
        from app.models.models import Company, PipelineStage
        db = SessionLocal()
        companies = db.query(Company).all()
        default_stages = [
            {"key": "new_lead", "label": "New Lead", "color": "blue", "order_index": 0, "win_probability_pct": 15, "is_won": False, "is_lost": False},
            {"key": "contacted", "label": "Contacted", "color": "indigo", "order_index": 1, "win_probability_pct": 25, "is_won": False, "is_lost": False},
            {"key": "qualified", "label": "Qualified", "color": "amber", "order_index": 2, "win_probability_pct": 40, "is_won": False, "is_lost": False},
            {"key": "survey_scheduled", "label": "Site Survey", "color": "purple", "order_index": 3, "win_probability_pct": 50, "is_won": False, "is_lost": False},
            {"key": "survey_completed", "label": "Survey Done", "color": "cyan", "order_index": 4, "win_probability_pct": 60, "is_won": False, "is_lost": False},
            {"key": "quotation_sent", "label": "Quotation Sent", "color": "orange", "order_index": 5, "win_probability_pct": 75, "is_won": False, "is_lost": False},
            {"key": "negotiation", "label": "Negotiation", "color": "pink", "order_index": 6, "win_probability_pct": 85, "is_won": False, "is_lost": False},
            {"key": "won", "label": "Deal Won", "color": "emerald", "order_index": 7, "win_probability_pct": 100, "is_won": True, "is_lost": False},
            {"key": "lost", "label": "Deal Lost", "color": "red", "order_index": 8, "win_probability_pct": 0, "is_won": False, "is_lost": True},
        ]
        for comp in companies:
            cnt = db.query(PipelineStage).filter(PipelineStage.company_id == comp.id).count()
            if cnt == 0:
                print(f"[*] Initializing default pipeline stages for tenant: {comp.name}...")
                for s in default_stages:
                    db.add(PipelineStage(company_id=comp.id, **s))
                db.commit()
        db.close()
    except Exception as e:
        print(f"[!] Pipeline stages initialization notice: {e}")

def ensure_existing_won_leads_have_loan_processes():
    try:
        from app.database import SessionLocal
        from app.models.models import Lead, LoanProcess
        db = SessionLocal()
        won_leads = db.query(Lead).filter(Lead.stage == "won").all()
        created_count = 0
        for lead in won_leads:
            existing = db.query(LoanProcess).filter(LoanProcess.lead_id == lead.id).first()
            if not existing:
                code = f"LP-{lead.lead_id}"
                new_lp = LoanProcess(
                    company_id=lead.company_id,
                    lead_id=lead.id,
                    loan_process_number=code,
                    loan_status="Not Started",
                    installation_status="Not Started",
                    net_meter_status="Not Started",
                    inspection_status="Not Started",
                    subsidy_status="Not Started",
                    overall_progress_pct=0
                )
                db.add(new_lp)
                created_count += 1
        if created_count > 0:
            db.commit()
            print(f"[*] Initialized loan process records for {created_count} won deal(s).")
        db.close()
    except Exception as e:
        print(f"[!] Won leads loan initialization notice: {e}")

def ensure_default_solar_systems():
    try:
        from app.database import SessionLocal
        from app.models.models import Company, SolarSystem
        db = SessionLocal()
        companies = db.query(Company).all()
        for comp in companies:
            count = db.query(SolarSystem).filter(SolarSystem.company_id == comp.id).count()
            if count == 0:
                defaults = [
                    {
                        "system_name": "Tata Power Solar 3.3 kW Package",
                        "base_price": 157400.0,
                        "capacity_kw": 3.3,
                        "solar_panel_name": "Tata Power 550W Mono PERC",
                        "inverter_name": "Growatt 3.3 kW On-Grid Inverter",
                        "structure_name": "Elevated Galvanized Iron (GI)",
                        "bos_name": "TrueSun Standard BOS Kit (DCDB/ACDB, DC Cables, Earthing)",
                        "quantity": 15,
                        "warranty": "25 Years Panels, 5 Years Inverter, 10 Years Structure",
                        "subsidy": 78000.0,
                        "description": "Popular residential package under PM Surya Ghar Muft Bijli Yojana."
                    },
                    {
                        "system_name": "Adani Solar 5.0 kW TOPCon Bifacial",
                        "base_price": 240000.0,
                        "capacity_kw": 5.0,
                        "solar_panel_name": "Adani Solar 550W TOPCon Bifacial",
                        "inverter_name": "Sungrow 5 kW String Inverter",
                        "structure_name": "Hot-Dip Galvanized Dual-Pole Superstructure",
                        "bos_name": "TrueSun Heavy-Duty Industrial BOS Kit",
                        "quantity": 10,
                        "warranty": "25 Years Panels, 7 Years Inverter, 10 Years Structure",
                        "subsidy": 78000.0,
                        "description": "High-efficiency bifacial solar system designed for medium-to-large bungalows and villas."
                    },
                    {
                        "system_name": "Waaree 1.9 kW Compact Rooftop",
                        "base_price": 95000.0,
                        "capacity_kw": 1.9,
                        "solar_panel_name": "Waaree 540W Mono PERC",
                        "inverter_name": "GoodWe 2 kW Single Phase",
                        "structure_name": "Standard Rooftop Flush Mount Structure",
                        "bos_name": "Compact Rooftop Protection BOS Kit",
                        "quantity": 20,
                        "warranty": "25 Years Panels, 5 Years Inverter, 5 Years Structure",
                        "subsidy": 30000.0,
                        "description": "Economical rooftop solar kit tailored for monthly bills between ₹1,500 and ₹2,500."
                    },
                    {
                        "system_name": "Goldi Solar 3.6 kW Residential Pro",
                        "base_price": 172000.0,
                        "capacity_kw": 3.6,
                        "solar_panel_name": "Goldi 550W Mono PERC Half-Cut",
                        "inverter_name": "Solis 4 kW Dual MPPT Inverter",
                        "structure_name": "Elevated Aluminum Super Structure",
                        "bos_name": "Complete Heavy-Duty IP65 BOS Protection Kit",
                        "quantity": 8,
                        "warranty": "25 Years Panels, 5 Years Inverter, 10 Years Structure",
                        "subsidy": 78000.0,
                        "description": "Optimized for maximum generation in high-temperature Western Indian regions."
                    }
                ]
                for d in defaults:
                    db.add(SolarSystem(company_id=comp.id, **d, created_at=now_ist(), updated_at=now_ist()))
                db.commit()
                print(f"[*] Initialized {len(defaults)} default solar systems for company '{comp.name}'.")
        db.close()
    except Exception as e:
        print(f"[!] Default solar systems initialization notice: {e}")

auto_seed_if_empty()
ensure_default_pipeline_stages()
ensure_existing_won_leads_have_loan_processes()
ensure_default_solar_systems()

app = FastAPI(
    title="SolarFlow CRM SaaS API",
    description="Multi-tenant production CRM and lead management platform for solar installation companies.",
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    import asyncio
    from app.services.websocket_manager import ws_manager
    try:
        loop = asyncio.get_running_loop()
        ws_manager.set_loop(loop)
    except Exception:
        pass

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    import traceback
    traceback.print_exc()
    origin = request.headers.get("origin", "*")
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
        headers={
            "Access-Control-Allow-Origin": origin if origin != "*" else "http://localhost:5173",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        }
    )

# Mount upload directory
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include Routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(dashboard_router, prefix=settings.API_V1_STR)
app.include_router(leads_router, prefix=settings.API_V1_STR)
app.include_router(pipeline_router, prefix=settings.API_V1_STR)
app.include_router(followups_router, prefix=settings.API_V1_STR)
app.include_router(surveys_router, prefix=settings.API_V1_STR)
app.include_router(quotations_router, prefix=settings.API_V1_STR)
app.include_router(team_router, prefix=settings.API_V1_STR)
app.include_router(sources_router, prefix=settings.API_V1_STR)
app.include_router(reports_router, prefix=settings.API_V1_STR)
app.include_router(automation_router, prefix=settings.API_V1_STR)
app.include_router(ai_router, prefix=settings.API_V1_STR)
app.include_router(settings_router, prefix=settings.API_V1_STR)
app.include_router(notifications_router, prefix=settings.API_V1_STR)
app.include_router(audit_logs_router, prefix=settings.API_V1_STR)
app.include_router(loan_process_router, prefix=settings.API_V1_STR)
app.include_router(solar_systems_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "status": "online",
        "service": "SolarFlow CRM API",
        "version": settings.VERSION,
        "docs": "/docs"
    }
