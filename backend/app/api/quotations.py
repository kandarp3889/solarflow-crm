from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models.models import Quotation, Lead, LeadActivity, User, Company, QuotationStatus, LeadStage
from app.schemas.schemas import (
    QuotationCreate, QuotationUpdate, QuotationResponse,
    QuotationCalculateRequest, QuotationCalculateResponse
)
from app.services.quotation_calc import calculate_solar_quotation
from app.api.deps import get_current_user, get_current_company

router = APIRouter(prefix="/quotations", tags=["Solar Quotations"])

@router.post("/calculate", response_model=QuotationCalculateResponse)
def calculate_quote(req: QuotationCalculateRequest):
    result = calculate_solar_quotation(
        system_size_kw=req.system_size_kw,
        panel_cost_per_watt=req.panel_cost_per_watt or 28.0,
        panel_wattage=req.panel_wattage or 550,
        inverter_cost=req.inverter_cost or 45000.0,
        battery_cost=req.battery_cost or 0.0,
        structure_cost=req.structure_cost or 20000.0,
        installation_cost=req.installation_cost or 25000.0,
        other_costs=req.other_costs or 5000.0,
        discount=req.discount or 5000.0,
        gst_rate=req.gst_rate or 13.8,
        apply_subsidy=req.apply_subsidy if req.apply_subsidy is not None else True
    )
    return QuotationCalculateResponse(**result)

@router.get("", response_model=List[QuotationResponse])
def get_quotations(
    status: Optional[str] = None,
    lead_id: Optional[int] = None,
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    query = db.query(Quotation).filter(Quotation.company_id == company.id)
    if status:
        query = query.filter(Quotation.status == status)
    if lead_id:
        query = query.filter(Quotation.lead_id == lead_id)

    quotes = query.order_by(desc(Quotation.created_at)).all()

    result = []
    for q in quotes:
        res = QuotationResponse.from_orm(q)
        if q.lead:
            res.lead_name = q.lead.full_name
            res.lead_phone = q.lead.phone
            res.lead_email = q.lead.email
            res.lead_address = f"{q.lead.address or ''}, {q.lead.city or ''}".strip(", ")
        if q.created_by:
            res.created_by_name = q.created_by.full_name
        result.append(res)
    return result

@router.post("", response_model=QuotationResponse)
def create_quotation(
    quote_in: QuotationCreate,
    current_user: User = Depends(get_current_user),
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    lead = db.query(Lead).filter(Lead.id == quote_in.lead_id, Lead.company_id == company.id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    count = db.query(Quotation).filter(Quotation.company_id == company.id).count() + 1
    quote_num = f"QT-2026-{count:04d}"

    # Calculate authoritative pricing
    calc = calculate_solar_quotation(
        system_size_kw=quote_in.system_size_kw,
        panel_cost_per_watt=28.0,
        panel_wattage=quote_in.panel_wattage or 550,
        inverter_cost=45000.0,
        battery_cost=60000.0 if quote_in.battery_backup != "None" else 0.0,
        structure_cost=20000.0,
        installation_cost=quote_in.installation_cost or 25000.0,
        other_costs=quote_in.other_costs or 5000.0,
        discount=quote_in.discount or 5000.0,
        gst_rate=quote_in.gst_rate or 13.8,
        apply_subsidy=True
    )

    data = quote_in.dict()
    data.update({
        "system_price": calc["system_price"],
        "panel_quantity": calc["panel_quantity"],
        "installation_cost": calc["installation_cost"],
        "other_costs": calc["other_costs"],
        "discount": calc["discount"],
        "subtotal": calc["subtotal"],
        "gst_rate": calc["gst_rate"],
        "gst_amount": calc["gst_amount"],
        "subsidy_amount": calc["subsidy_amount"],
        "final_price": calc["final_price"],
        "monthly_generation_kwh": calc["monthly_generation_kwh"],
        "monthly_savings": calc["monthly_savings"],
        "payback_years": calc["payback_years"],
        "valid_until": datetime.utcnow() + timedelta(days=15)
    })

    new_quote = Quotation(
        **data,
        company_id=company.id,
        quotation_number=quote_num,
        created_by_id=current_user.id
    )
    db.add(new_quote)

    # Advance lead stage to quotation_sent if in earlier stage
    if lead.stage in [LeadStage.NEW_LEAD.value, LeadStage.CONTACTED.value, LeadStage.QUALIFIED.value, LeadStage.SURVEY_COMPLETED.value]:
        lead.stage = LeadStage.QUOTATION_SENT.value
    lead.estimated_value = calc["final_price"]

    # Log activity
    act = LeadActivity(
        company_id=company.id,
        lead_id=lead.id,
        user_id=current_user.id,
        activity_type="quotation_created",
        title=f"Quotation Generated ({quote_num})",
        description=f"{quote_in.system_size_kw} kW system for final customer price of ₹{calc['final_price']:,.0f} (Subsidy: ₹{calc['subsidy_amount']:,.0f})."
    )
    db.add(act)

    db.commit()
    db.refresh(new_quote)

    res = QuotationResponse.from_orm(new_quote)
    res.lead_name = lead.full_name
    res.lead_phone = lead.phone
    res.lead_email = lead.email
    res.lead_address = f"{lead.address or ''}, {lead.city or ''}".strip(", ")
    res.created_by_name = current_user.full_name
    return res

@router.get("/{quotation_id}", response_model=QuotationResponse)
def get_quotation_detail(
    quotation_id: int,
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    q = db.query(Quotation).filter(Quotation.id == quotation_id, Quotation.company_id == company.id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Quotation not found")

    res = QuotationResponse.from_orm(q)
    if q.lead:
        res.lead_name = q.lead.full_name
        res.lead_phone = q.lead.phone
        res.lead_email = q.lead.email
        res.lead_address = f"{q.lead.address or ''}, {q.lead.city or ''}".strip(", ")
    if q.created_by:
        res.created_by_name = q.created_by.full_name
    return res

@router.put("/{quotation_id}", response_model=QuotationResponse)
def update_quotation(
    quotation_id: int,
    quote_in: QuotationUpdate,
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    q = db.query(Quotation).filter(Quotation.id == quotation_id, Quotation.company_id == company.id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Quotation not found")

    update_data = quote_in.dict(exclude_unset=True)
    for k, v in update_data.items():
        setattr(q, k, v)

    db.commit()
    db.refresh(q)

    res = QuotationResponse.from_orm(q)
    if q.lead:
        res.lead_name = q.lead.full_name
        res.lead_phone = q.lead.phone
        res.lead_email = q.lead.email
        res.lead_address = f"{q.lead.address or ''}, {q.lead.city or ''}".strip(", ")
    if q.created_by:
        res.created_by_name = q.created_by.full_name
    return res

@router.post("/{quotation_id}/send")
def send_quotation(
    quotation_id: int,
    channel: str = "email", # email, whatsapp
    current_user: User = Depends(get_current_user),
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    q = db.query(Quotation).filter(Quotation.id == quotation_id, Quotation.company_id == company.id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Quotation not found")

    q.status = QuotationStatus.SENT.value

    act = LeadActivity(
        company_id=company.id,
        lead_id=q.lead_id,
        user_id=current_user.id,
        activity_type="quotation_sent",
        title=f"Quotation Dispatched via {channel.title()}",
        description=f"Sent quotation {q.quotation_number} (₹{q.final_price:,.0f}) to {q.lead.full_name}."
    )
    db.add(act)
    db.commit()

    return {"message": f"Quotation dispatched via {channel}", "status": "sent"}

@router.delete("/{quotation_id}")
def delete_quotation(
    quotation_id: int,
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    q = db.query(Quotation).filter(Quotation.id == quotation_id, Quotation.company_id == company.id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Quotation not found")
    db.delete(q)
    db.commit()
    return {"message": "Quotation deleted"}
