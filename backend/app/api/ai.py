from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Lead, Company
from app.schemas.schemas import (
    AIQualifyRequest, AIQualifyResponse,
    AIWhatsAppRequest, AIWhatsAppResponse,
    AISummarizeRequest, AISummarizeResponse
)
from app.services.ai_service import AIAssistantService
from app.api.deps import get_current_company

router = APIRouter(prefix="/ai", tags=["AI Assistant"])

@router.post("/qualify-lead", response_model=AIQualifyResponse)
def qualify_lead_ai(
    req: AIQualifyRequest,
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    lead = db.query(Lead).filter(Lead.id == req.lead_id, Lead.company_id == company.id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    lead_dict = {
        "monthly_bill": lead.monthly_bill,
        "roof_area_sqft": lead.roof_area_sqft,
        "property_type": lead.property_type,
        "lead_source": lead.lead_source,
        "lead_score": lead.lead_score
    }
    result = AIAssistantService.qualify_lead(lead_dict)
    return AIQualifyResponse(**result)

@router.post("/generate-whatsapp", response_model=AIWhatsAppResponse)
def generate_whatsapp_pitch_ai(
    req: AIWhatsAppRequest,
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    lead = db.query(Lead).filter(Lead.id == req.lead_id, Lead.company_id == company.id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    lead_dict = {
        "full_name": lead.full_name,
        "recommended_kw": lead.recommended_kw or lead.interested_kw,
        "monthly_bill": lead.monthly_bill,
        "phone": lead.phone
    }
    message = AIAssistantService.generate_whatsapp_pitch(lead_dict, req.purpose)
    return AIWhatsAppResponse(
        message=message,
        language="en",
        placeholders={"customer_name": lead.full_name, "phone": lead.phone}
    )

@router.post("/summarize-proposal", response_model=AISummarizeResponse)
def summarize_proposal_ai(
    req: AISummarizeRequest,
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    lead = db.query(Lead).filter(Lead.id == req.lead_id, Lead.company_id == company.id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    lead_dict = {
        "full_name": lead.full_name,
        "stage": lead.stage,
        "recommended_kw": lead.recommended_kw or lead.interested_kw,
        "monthly_bill": lead.monthly_bill
    }
    activities = [{"title": a.title} for a in lead.activities]
    notes = [{"content": n.content} for n in lead.notes]

    result = AIAssistantService.summarize_lead(lead_dict, activities, notes)
    return AISummarizeResponse(**result)
