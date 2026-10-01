from typing import Dict, Any, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Company, User, UserRole
from app.api.deps import get_current_company, require_roles
from app.services.email_service import get_company_email_config, test_smtp_connection

router = APIRouter(prefix="/settings", tags=["Settings"])

class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    website: Optional[str] = None
    gstin: Optional[str] = None

class SolarSettingsUpdate(BaseModel):
    panel_brands: Optional[list] = None
    inverter_brands: Optional[list] = None
    base_cost_per_watt: Optional[float] = None
    default_gst_rate: Optional[float] = None
    subsidy_rules: Optional[dict] = None
    score_thresholds: Optional[dict] = None

class EmailSettingsUpdate(BaseModel):
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = 587
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    from_email: Optional[str] = None
    from_name: Optional[str] = None
    use_tls: Optional[bool] = True
    is_enabled: Optional[bool] = True

class EmailTestRequest(BaseModel):
    to_email: str
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    from_email: Optional[str] = None
    from_name: Optional[str] = None
    use_tls: Optional[bool] = None

@router.get("/company")
def get_company_settings(company: Company = Depends(get_current_company)):
    return {
        "id": company.id,
        "name": company.name,
        "slug": company.slug,
        "logo_url": company.logo_url,
        "phone": company.phone,
        "email": company.email,
        "address": company.address,
        "website": company.website,
        "gstin": company.gstin,
        "subscription_plan": company.subscription_plan,
        "solar_settings": company.solar_settings
    }

@router.put("/company")
def update_company_settings(
    settings_in: CompanyUpdate,
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    update_data = settings_in.dict(exclude_unset=True)
    for k, v in update_data.items():
        setattr(company, k, v)
    db.commit()
    db.refresh(company)
    return company

@router.put("/solar")
def update_solar_settings(
    settings_in: SolarSettingsUpdate,
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    current = dict(company.solar_settings or {})
    update_data = settings_in.dict(exclude_unset=True)
    current.update(update_data)
    company.solar_settings = current

    db.commit()
    return company.solar_settings

@router.get("/email")
def get_email_settings(
    company: Company = Depends(get_current_company),
    current_user: User = Depends(require_roles([UserRole.COMPANY_ADMIN, UserRole.SUPER_ADMIN]))
):
    cfg = get_company_email_config(company.solar_settings)
    masked_pw = "••••••••" if cfg.get("smtp_password") else ""
    return {
        "smtp_host": cfg.get("smtp_host", ""),
        "smtp_port": cfg.get("smtp_port", 587),
        "smtp_user": cfg.get("smtp_user", ""),
        "smtp_password": masked_pw,
        "has_password": bool(cfg.get("smtp_password")),
        "from_email": cfg.get("from_email", ""),
        "from_name": cfg.get("from_name", ""),
        "use_tls": cfg.get("use_tls", True),
        "is_enabled": cfg.get("is_enabled", True)
    }

@router.put("/email")
def update_email_settings(
    email_in: EmailSettingsUpdate,
    company: Company = Depends(get_current_company),
    current_user: User = Depends(require_roles([UserRole.COMPANY_ADMIN, UserRole.SUPER_ADMIN])),
    db: Session = Depends(get_db)
):
    current_solar = dict(company.solar_settings or {})
    current_email = dict(current_solar.get("email") or {})

    update_data = email_in.dict(exclude_unset=True)

    # Don't overwrite if password is empty or still masked
    if not update_data.get("smtp_password") or update_data.get("smtp_password") == "••••••••":
        if "smtp_password" in update_data:
            del update_data["smtp_password"]

    current_email.update(update_data)
    current_solar["email"] = current_email
    company.solar_settings = current_solar

    db.commit()
    db.refresh(company)

    cfg = get_company_email_config(company.solar_settings)
    return {
        "status": "success",
        "message": "Email settings saved successfully!",
        "settings": {
            "smtp_host": cfg.get("smtp_host"),
            "smtp_port": cfg.get("smtp_port"),
            "smtp_user": cfg.get("smtp_user"),
            "has_password": bool(cfg.get("smtp_password")),
            "from_email": cfg.get("from_email"),
            "from_name": cfg.get("from_name"),
            "use_tls": cfg.get("use_tls"),
            "is_enabled": cfg.get("is_enabled")
        }
    }

@router.post("/email/test")
def test_email_settings_endpoint(
    test_req: EmailTestRequest,
    company: Company = Depends(get_current_company),
    current_user: User = Depends(require_roles([UserRole.COMPANY_ADMIN, UserRole.SUPER_ADMIN]))
):
    cfg = get_company_email_config(company.solar_settings)

    host = test_req.smtp_host or cfg.get("smtp_host")
    port = test_req.smtp_port or cfg.get("smtp_port") or 587
    user = test_req.smtp_user or cfg.get("smtp_user")

    password = test_req.smtp_password
    if not password or password == "••••••••":
        password = cfg.get("smtp_password")

    from_email = test_req.from_email or cfg.get("from_email")
    from_name = test_req.from_name or cfg.get("from_name")
    use_tls = test_req.use_tls if test_req.use_tls is not None else cfg.get("use_tls", True)

    success, message = test_smtp_connection(
        host=host,
        port=int(port),
        user=user,
        password=password,
        from_email=from_email,
        from_name=from_name,
        to_email=test_req.to_email,
        use_tls=use_tls
    )

    if not success:
        raise HTTPException(status_code=400, detail=message)

    return {
        "success": True,
        "message": message
    }

@router.get("/integrations")
def get_integrations(company: Company = Depends(get_current_company)):
    cfg = get_company_email_config(company.solar_settings)
    return {
        "whatsapp": {
            "status": "connected",
            "phone_number": "+91 98765 43210",
            "webhook_status": "active"
        },
        "meta_leads": {
            "status": "connected",
            "page_name": "SunPower Solar Official",
            "last_sync": "10 minutes ago"
        },
        "google_ads": {
            "status": "connected",
            "conversion_action": "Solar Quote Lead Form"
        },
        "smtp": {
            "status": "configured" if cfg.get("smtp_user") and cfg.get("smtp_password") else "sandbox",
            "host": cfg.get("smtp_host", "smtp.mailtrap.io"),
            "port": cfg.get("smtp_port", 2525),
            "from_email": cfg.get("from_email")
        }
    }
