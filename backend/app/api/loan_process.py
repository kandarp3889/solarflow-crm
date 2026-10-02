from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models.models import Lead, LoanProcess, LoanDocument, User, Company, LeadActivity
from app.schemas.schemas import (
    LoanProcessResponse, LoanProcessUpdate, LoanDocumentResponse, LeadResponse
)
from app.api.deps import get_current_user, get_current_company, require_permission
from app.services.loan_service import (
    ensure_loan_process_for_lead,
    calculate_overall_progress,
    save_loan_document,
    delete_loan_document,
    build_loan_process_summary
)
from app.services.notification_service import dispatch_targeted_notification

router = APIRouter(tags=["Loan Process & Execution"])

def _format_loan_response(lp: LoanProcess, lead: Lead) -> LoanProcessResponse:
    res = LoanProcessResponse.from_orm(lp)
    res.lead_name = lead.full_name
    res.lead_code = lead.lead_id
    res.lead_phone = lead.phone
    res.system_size_kw = lead.recommended_kw
    res.monthly_bill = lead.monthly_bill

    # Enrich document uploaders
    doc_res_list = []
    for d in (lp.documents or []):
        d_dict = LoanDocumentResponse.from_orm(d)
        if d.uploaded_by:
            d_dict.uploaded_by_name = d.uploaded_by.full_name
        doc_res_list.append(d_dict)
    res.documents = doc_res_list
    return res


@router.get("/leads/{lead_id}/loan-process", response_model=LoanProcessResponse)
def get_lead_loan_process(
    lead_id: int,
    company: Company = Depends(get_current_company),
    current_user: User = Depends(require_permission("loans:view")),
    db: Session = Depends(get_db)
):
    lead = db.query(Lead).filter(Lead.id == lead_id, Lead.company_id == company.id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    lp = db.query(LoanProcess).filter(
        LoanProcess.lead_id == lead.id,
        LoanProcess.company_id == company.id
    ).first()

    # Rule: Loan Process is available for Deal Won leads (or existing records)
    if not lp:
        if lead.stage != "won":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Loan Process is only accessible for leads marked as 'Deal Won'."
            )
        # Auto-create seamlessly for won leads without duplicates
        lp = ensure_loan_process_for_lead(db, company.id, lead, current_user.id)

    # Recalculate progress dynamically
    progress = calculate_overall_progress(lp)
    if lp.overall_progress_pct != progress:
        lp.overall_progress_pct = progress
        db.commit()
        db.refresh(lp)

    return _format_loan_response(lp, lead)


@router.put("/leads/{lead_id}/loan-process", response_model=LoanProcessResponse)
def update_lead_loan_process(
    lead_id: int,
    payload: LoanProcessUpdate,
    company: Company = Depends(get_current_company),
    current_user: User = Depends(require_permission("loans:manage")),
    db: Session = Depends(get_db)
):
    lead = db.query(Lead).filter(Lead.id == lead_id, Lead.company_id == company.id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    lp = db.query(LoanProcess).filter(
        LoanProcess.lead_id == lead.id,
        LoanProcess.company_id == company.id
    ).first()

    if not lp:
        if lead.stage != "won":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot update Loan Process: Lead is not marked as 'Deal Won'."
            )
        lp = ensure_loan_process_for_lead(db, company.id, lead, current_user.id)

    update_dict = payload.dict(exclude_unset=True)

    # Track status changes for targeted activity logs and notifications
    status_fields = {
        "loan_status": "Loan Application",
        "installation_status": "Rooftop Installation",
        "net_meter_status": "Net Metering",
        "inspection_status": "Technical Inspection",
        "subsidy_status": "Government Subsidy"
    }

    changed_stages = []
    for field, stage_label in status_fields.items():
        if field in update_dict:
            old_val = getattr(lp, field)
            new_val = update_dict[field]
            if new_val and new_val != old_val:
                changed_stages.append((stage_label, old_val, new_val))

    # Apply updates
    for field, val in update_dict.items():
        setattr(lp, field, val)

    # Recalculate overall progress
    lp.overall_progress_pct = calculate_overall_progress(lp)

    # Log activities and notify
    for stage_label, old_s, new_s in changed_stages:
        act = LeadActivity(
            company_id=company.id,
            lead_id=lead.id,
            user_id=current_user.id,
            activity_type="loan_status_changed",
            title=f"{stage_label}: {new_s}",
            description=f"{current_user.full_name} updated {stage_label} status from '{old_s}' to '{new_s}'."
        )
        db.add(act)

        # Notify assigned sales rep
        dispatch_targeted_notification(
            db=db,
            company_id=company.id,
            actor=current_user,
            assigned_user_id=lead.assigned_to_id,
            title=f"Workflow Update: {stage_label}",
            message=f"{lead.lead_id} ({lead.full_name}) - {stage_label} updated to '{new_s}'. Overall completion: {lp.overall_progress_pct}%.",
            category="lead",
            link_url=f"/leads/{lead.id}"
        )

    db.commit()
    db.refresh(lp)
    return _format_loan_response(lp, lead)


@router.post("/leads/{lead_id}/loan-process/documents", response_model=LoanDocumentResponse)
def upload_loan_process_document(
    lead_id: int,
    stage_category: str = Form(...),
    file: UploadFile = File(...),
    notes: Optional[str] = Form(None),
    company: Company = Depends(get_current_company),
    current_user: User = Depends(require_permission("loans:upload_docs")),
    db: Session = Depends(get_db)
):
    lead = db.query(Lead).filter(Lead.id == lead_id, Lead.company_id == company.id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    lp = db.query(LoanProcess).filter(
        LoanProcess.lead_id == lead.id,
        LoanProcess.company_id == company.id
    ).first()

    if not lp:
        if lead.stage != "won":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Loan documents can only be uploaded for 'Deal Won' leads."
            )
        lp = ensure_loan_process_for_lead(db, company.id, lead, current_user.id)

    doc = save_loan_document(
        db=db,
        company_id=company.id,
        lead=lead,
        loan_process=lp,
        stage_category=stage_category,
        file=file,
        notes=notes,
        uploaded_by=current_user
    )

    # Automatically advance stage status if it was 'Not Started'
    stage_map = {
        "loan_file": "loan_status",
        "installation": "installation_status",
        "net_meter_file": "net_meter_status",
        "inspection": "inspection_status",
        "subsidy": "subsidy_status"
    }
    target_status_col = stage_map.get(stage_category)
    if target_status_col and getattr(lp, target_status_col) == "Not Started":
        setattr(lp, target_status_col, "In Progress")
        lp.overall_progress_pct = calculate_overall_progress(lp)
        db.commit()

    res = LoanDocumentResponse.from_orm(doc)
    res.uploaded_by_name = current_user.full_name
    return res


@router.delete("/leads/{lead_id}/loan-process/documents/{document_id}")
def remove_loan_process_document(
    lead_id: int,
    document_id: int,
    company: Company = Depends(get_current_company),
    current_user: User = Depends(require_permission("loans:delete_docs")),
    db: Session = Depends(get_db)
):
    lead = db.query(Lead).filter(Lead.id == lead_id, Lead.company_id == company.id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    delete_loan_document(
        db=db,
        company_id=company.id,
        lead=lead,
        document_id=document_id,
        user=current_user
    )
    return {"message": "Document deleted successfully"}
