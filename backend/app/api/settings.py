from typing import Dict, Any, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Company, User, UserRole
from app.api.deps import get_current_company, require_roles

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

class IntegrationSettingsUpdate(BaseModel):
    whatsapp_enabled: Optional[bool] = False
    whatsapp_phone_number_id: Optional[str] = None
    whatsapp_access_token: Optional[str] = None
    meta_leads_webhook_url: Optional[str] = None
    google_ads_webhook_url: Optional[str] = None
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_user: Optional[str] = None

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

@router.get("/integrations")
def get_integrations(company: Company = Depends(get_current_company)):
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
            "status": "configured",
            "host": "smtp.mailtrap.io",
            "port": 2525
        }
    }
