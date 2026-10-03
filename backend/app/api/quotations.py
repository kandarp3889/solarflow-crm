from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models.models import Quotation, SolarSystem, Lead, LeadActivity, User, Company, QuotationStatus, LeadStage
from app.schemas.schemas import (
    QuotationCreate, QuotationUpdate, QuotationResponse,
    QuotationCalculateRequest, QuotationCalculateResponse
)
from app.services.quotation_calc import calculate_solar_quotation
from app.services.notification_service import notify_quotation_progress
from app.api.deps import get_current_user, get_current_company
from app.core.timezone import now_ist, to_ist_naive

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

    # Check if a configured SolarSystem product is selected
    solar_sys = None
    if quote_in.system_id:
        solar_sys = db.query(SolarSystem).filter(
            SolarSystem.id == quote_in.system_id,
            SolarSystem.company_id == company.id
        ).first()

    system_name = quote_in.system_name or (solar_sys.system_name if solar_sys else None)
    system_size_kw = quote_in.system_size_kw if (quote_in.system_size_kw and quote_in.system_size_kw > 0) else (solar_sys.capacity_kw if solar_sys else 5.0)
    solar_panel_name = quote_in.solar_panel_name or (solar_sys.solar_panel_name if solar_sys else quote_in.panel_brand)
    inverter_name = quote_in.inverter_name or (solar_sys.inverter_name if solar_sys else quote_in.inverter_brand)
    structure_name = quote_in.structure_name or (solar_sys.structure_name if solar_sys else quote_in.structure_type)
    bos_name = quote_in.bos_name or (solar_sys.bos_name if solar_sys else "Standard BOS Kit")
    warranty = quote_in.warranty or (solar_sys.warranty if solar_sys else "25 Years Panels, 5 Years Inverter, 10 Years Structure")

    # If system base price is provided explicitly or from the configured system
    base_price_to_use = None
    if quote_in.system_price and quote_in.system_price > 0 and (solar_sys is None or quote_in.system_price != 240000.0 or solar_sys.base_price == 240000.0):
        base_price_to_use = quote_in.system_price
    elif solar_sys:
        base_price_to_use = solar_sys.base_price

    # Subsidy amount
    subsidy_to_use = None
    if quote_in.subsidy_amount is not None and (solar_sys is None or quote_in.subsidy_amount != 78000.0 or solar_sys.subsidy == 78000.0):
        subsidy_to_use = quote_in.subsidy_amount
    elif solar_sys and solar_sys.subsidy > 0:
        subsidy_to_use = solar_sys.subsidy

    if base_price_to_use is not None and base_price_to_use > 0:
        kw = max(0.1, float(system_size_kw))
        wattage = max(300, int(quote_in.panel_wattage or 550))
        import math
        panel_qty = math.ceil((kw * 1000.0) / wattage)
        inst_cost = quote_in.installation_cost if quote_in.installation_cost is not None else 25000.0
        other_c = quote_in.other_costs if quote_in.other_costs is not None else 5000.0
        disc_c = quote_in.discount if quote_in.discount is not None else 5000.0
        gst_r = quote_in.gst_rate if quote_in.gst_rate is not None else 13.8

        subtotal = round(base_price_to_use + inst_cost + other_c - disc_c, 2)
        gst_amt = round(subtotal * (gst_r / 100.0), 2)

        if subsidy_to_use is not None:
            subsidy_val = round(float(subsidy_to_use), 2)
        else:
            if kw >= 3.0:
                subsidy_val = 78000.0
            elif kw >= 2.0:
                subsidy_val = 60000.0
            elif kw >= 1.0:
                subsidy_val = 30000.0
            else:
                subsidy_val = round(kw * 30000.0, 2)

        final_price_val = round(max(0.0, subtotal + gst_amt - subsidy_val), 2)
        gen_kwh = round(kw * 120.0, 1)
        savings = round(gen_kwh * 8.0, 2)
        annual_sav = savings * 12.0
        payback = round(final_price_val / annual_sav, 1) if annual_sav > 0 else 3.5

        calc = {
            "system_price": base_price_to_use,
            "panel_quantity": panel_qty,
            "installation_cost": inst_cost,
            "other_costs": other_c,
            "discount": disc_c,
            "subtotal": subtotal,
            "gst_rate": gst_r,
            "gst_amount": gst_amt,
            "subsidy_amount": subsidy_val,
            "final_price": final_price_val,
            "monthly_generation_kwh": gen_kwh,
            "monthly_savings": savings,
            "payback_years": payback
        }
    else:
        # Standard component formula
        calc = calculate_solar_quotation(
            system_size_kw=system_size_kw,
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
        "system_id": quote_in.system_id,
        "system_name": system_name,
        "system_size_kw": system_size_kw,
        "solar_panel_name": solar_panel_name,
        "panel_brand": solar_panel_name or quote_in.panel_brand,
        "inverter_name": inverter_name,
        "inverter_brand": inverter_name or quote_in.inverter_brand,
        "structure_name": structure_name,
        "structure_type": structure_name or quote_in.structure_type,
        "bos_name": bos_name,
        "warranty": warranty,
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
        "valid_until": to_ist_naive(quote_in.valid_until) if quote_in.valid_until else (now_ist() + timedelta(days=15))
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

    notify_quotation_progress(
        db=db,
        company_id=company.id,
        lead=lead,
        quotation=new_quote,
        action_type="generated",
        actor=current_user
    )

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
    current_user: User = Depends(get_current_user),
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

    if q.lead:
        notify_quotation_progress(
            db=db,
            company_id=company.id,
            lead=q.lead,
            quotation=q,
            action_type=f"updated (Status: {q.status})",
            actor=current_user
        )

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

    if q.lead:
        notify_quotation_progress(
            db=db,
            company_id=company.id,
            lead=q.lead,
            quotation=q,
            action_type=f"dispatched via {channel.title()}",
            actor=current_user
        )

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
