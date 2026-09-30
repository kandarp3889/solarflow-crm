from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.config import settings
from app.database import engine, Base
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

# Create database tables automatically
Base.metadata.create_all(bind=engine)

def ensure_schema_compatibility():
    from sqlalchemy import text
    try:
        with engine.connect() as conn:
            if engine.dialect.name == "postgresql":
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS custom_permissions JSON DEFAULT '[]'::json;"))
                conn.execute(text("ALTER TABLE companies ADD COLUMN IF NOT EXISTS custom_roles JSON DEFAULT '[]'::json;"))
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

auto_seed_if_empty()

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

@app.get("/")
def root():
    return {
        "status": "online",
        "service": "SolarFlow CRM API",
        "version": settings.VERSION,
        "docs": "/docs"
    }
