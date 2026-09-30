import io
import csv
from typing import Optional
from fastapi import APIRouter, Depends, Query, Response, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.database import get_db
from app.models.models import Lead, Quotation, Survey, User, LeadSource, Company
from app.api.deps import get_current_company, require_permission

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("/{report_type}")
def get_report_data(
    report_type: str,
    current_user: User = Depends(require_permission("reports:view")),
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    cid = company.id

    if report_type == "leads":
        items = db.query(Lead).filter(Lead.company_id == cid).order_by(desc(Lead.created_at)).all()
        return [
            {
                "id": l.lead_id,
                "name": l.full_name,
                "phone": l.phone,
                "city": l.city,
                "system_size_kw": l.recommended_kw or l.interested_kw,
                "bill": l.monthly_bill,
                "source": l.lead_source,
                "stage": l.stage,
                "score": l.lead_score,
                "category": l.score_category,
                "created_at": l.created_at.strftime("%Y-%m-%d")
            }
            for l in items
        ]

    elif report_type == "sales":
        items = db.query(Lead).filter(Lead.company_id == cid, Lead.stage == "won").all()
        return [
            {
                "id": l.lead_id,
                "customer": l.full_name,
                "system_size_kw": l.recommended_kw or l.interested_kw,
                "deal_value": l.estimated_value,
                "sales_rep": l.assigned_to.full_name if l.assigned_to else "Unassigned",
                "source": l.lead_source,
                "city": l.city,
                "closed_date": l.updated_at.strftime("%Y-%m-%d")
            }
            for l in items
        ]

    elif report_type == "quotations":
        items = db.query(Quotation).filter(Quotation.company_id == cid).all()
        return [
            {
                "quotation_number": q.quotation_number,
                "customer": q.lead.full_name if q.lead else "Unknown",
                "system_size_kw": q.system_size_kw,
                "panel_brand": q.panel_brand,
                "inverter_brand": q.inverter_brand,
                "subtotal": q.subtotal,
                "subsidy": q.subsidy_amount,
                "final_price": q.final_price,
                "status": q.status,
                "created_at": q.created_at.strftime("%Y-%m-%d")
            }
            for q in items
        ]

    elif report_type == "surveys":
        items = db.query(Survey).filter(Survey.company_id == cid).all()
        return [
            {
                "survey_code": s.survey_code,
                "customer": s.lead.full_name if s.lead else "Unknown",
                "roof_type": s.roof_type,
                "roof_area": s.roof_area,
                "available_area": s.available_roof_area,
                "shading": s.roof_shading,
                "phase": s.phase,
                "recommended_kw": s.recommended_system_size,
                "status": s.status,
                "engineer": s.assigned_engineer.full_name if s.assigned_engineer else "Unassigned"
            }
            for s in items
        ]

    else:
        raise HTTPException(status_code=400, detail="Unknown report type")

@router.get("/{report_type}/export")
def export_report_csv(
    report_type: str,
    current_user: User = Depends(require_permission("reports:export")),
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    data = get_report_data(report_type, current_user, company, db)
    if not data:
        return Response(content="No data available", media_type="text/plain")

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=list(data[0].keys()))
    writer.writeheader()
    writer.writerows(data)

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=solar_{report_type}_report.csv"}
    )
