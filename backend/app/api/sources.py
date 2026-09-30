from typing import List
from pydantic import BaseModel
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.models import LeadSource, Lead, Quotation, Company
from app.api.deps import get_current_company

router = APIRouter(prefix="/sources", tags=["Lead Sources"])

class SourceCreate(BaseModel):
    name: str
    cost_per_lead: float = 250.0
    total_spend: float = 10000.0

@router.get("", response_model=List[dict])
def get_sources_analytics(
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    sources = db.query(LeadSource).filter(LeadSource.company_id == company.id).all()
    results = []

    for s in sources:
        leads_cnt = db.query(Lead).filter(Lead.company_id == company.id, Lead.lead_source == s.name).count()
        qualified_cnt = db.query(Lead).filter(
            Lead.company_id == company.id,
            Lead.lead_source == s.name,
            Lead.stage.notin_(["new_lead", "contacted", "lost"])
        ).count()
        won_cnt = db.query(Lead).filter(
            Lead.company_id == company.id,
            Lead.lead_source == s.name,
            Lead.stage == "won"
        ).count()
        quotes_cnt = db.query(Quotation).join(Lead).filter(
            Quotation.company_id == company.id,
            Lead.lead_source == s.name
        ).count()
        revenue = db.query(func.sum(Lead.estimated_value)).filter(
            Lead.company_id == company.id,
            Lead.lead_source == s.name,
            Lead.stage == "won"
        ).scalar() or 0.0

        conv_rate = round((won_cnt / leads_cnt * 100), 1) if leads_cnt > 0 else 0.0
        cac = round(s.total_spend / won_cnt, 2) if won_cnt > 0 else s.total_spend

        results.append({
            "id": s.id,
            "name": s.name,
            "leads": leads_cnt,
            "qualified": qualified_cnt,
            "quotations": quotes_cnt,
            "won_deals": won_cnt,
            "revenue": revenue,
            "conversion_rate": conv_rate,
            "cost_per_lead": s.cost_per_lead,
            "total_spend": s.total_spend,
            "cac": cac
        })

    return results

@router.post("")
def create_source(
    src_in: SourceCreate,
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    new_src = LeadSource(
        company_id=company.id,
        name=src_in.name,
        cost_per_lead=src_in.cost_per_lead,
        total_spend=src_in.total_spend
    )
    db.add(new_src)
    db.commit()
    db.refresh(new_src)
    return new_src
