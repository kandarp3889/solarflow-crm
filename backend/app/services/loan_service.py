import os
import uuid
import shutil
from typing import Optional, List, Dict, Any
from datetime import datetime
from fastapi import UploadFile, HTTPException
from sqlalchemy.orm import Session

from app.config import settings
from app.models.models import LoanProcess, LoanDocument, Lead, LeadActivity, User
from app.schemas.schemas import LoanProcessSummary
from app.services.notification_service import dispatch_targeted_notification

ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_DCR_EXTENSIONS = {".pdf"}
MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024  # 15 MB

def calculate_overall_progress(lp: LoanProcess) -> int:
    """
    Computes weighted progress (0 to 100%) across the workflow milestones:
    1. Loan (18%)
    2. Rooftop Installation (18%)
    3. Installation Details: equipment serials & evidence (18%)
    4. Net Meter (16%)
    5. Technical Inspection (15%)
    6. Subsidy (15%)
    """
    score = 0

    # 1. Loan (18%)
    loan_s = (lp.loan_status or "").lower()
    if loan_s in ["approved", "disbursed", "completed"]:
        score += 18
    elif loan_s in ["submitted", "under review", "pending documents", "in progress"]:
        score += 9

    # 2. Installation (18%)
    inst_s = (lp.installation_status or "").lower()
    if inst_s in ["completed"]:
        score += 18
    elif inst_s in ["panels installed", "wiring completed"]:
        score += 14
    elif inst_s in ["material delivered", "structure erected", "in progress"]:
        score += 9

    # 3. Installation Details (18%)
    # - Inverter Serial (4%)
    if lp.inverter_serial_number and lp.inverter_serial_number.strip():
        score += 4
    # - Panel Serial Numbers (4%)
    if lp.panel_serials and len(lp.panel_serials) > 0:
        score += 4
    # - Installed Site Photos (5%)
    docs = lp.documents or []
    if any(d.stage_category in ("installed_photo", "installation_photo") for d in docs):
        score += 5
    # - DCR Report (5%)
    if any(d.stage_category == "dcr_report" for d in docs):
        score += 5

    # 4. Net Meter (16%)
    nm_s = (lp.net_meter_status or "").lower()
    if nm_s in ["completed", "meter installed"]:
        score += 16
    elif nm_s in ["meter issued", "inspection pending"]:
        score += 10
    elif nm_s in ["applied", "in progress"]:
        score += 6

    # 5. Inspection (15%)
    insp_s = (lp.inspection_status or "").lower()
    if insp_s in ["completed", "passed"]:
        score += 15
    elif insp_s in ["scheduled", "pending review", "in progress"]:
        score += 8

    # 6. Subsidy (15%)
    sub_s = (lp.subsidy_status or "").lower()
    if sub_s in ["completed", "disbursed"]:
        score += 15
    elif sub_s in ["inspection approved", "document verification"]:
        score += 10
    elif sub_s in ["application submitted", "in progress"]:
        score += 6

    return min(100, max(0, score))


def ensure_loan_process_for_lead(
    db: Session,
    company_id: int,
    lead: Lead,
    actor_user_id: Optional[int] = None,
    notify: bool = False
) -> LoanProcess:
    """
    Ensures a single LoanProcess record is initialized for a won lead without duplicates.
    Safe to call repeatedly on status updates.
    """
    existing = db.query(LoanProcess).filter(
        LoanProcess.lead_id == lead.id,
        LoanProcess.company_id == company_id
    ).first()

    if existing:
        return existing

    code = f"LP-{lead.lead_id}"
    new_lp = LoanProcess(
        company_id=company_id,
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
    db.flush()

    # Log activity on the lead timeline
    act = LeadActivity(
        company_id=company_id,
        lead_id=lead.id,
        user_id=actor_user_id,
        activity_type="loan_process_created",
        title="Loan & Execution Workflow Enabled",
        description=f"Solar rooftop deal won! Initialized loan documentation, installation, net metering, inspection, and subsidy tracking ({code})."
    )
    db.add(act)

    # Targeted notification if explicitly requested
    if notify:
        actor_user = db.query(User).filter(User.id == actor_user_id).first() if actor_user_id else None
        actor_name = actor_user.full_name if actor_user else "System"
        dispatch_targeted_notification(
            db=db,
            company_id=company_id,
            actor=actor_user,
            assigned_user_id=lead.assigned_to_id,
            title=f"Loan Workflow Active: {lead.full_name}",
            message=f"{actor_name} marked {lead.lead_id} ({lead.full_name}) as Deal Won. Loan application, installation, net metering, and subsidy workflow is now ready.",
            category="lead",
            link_url=f"/leads/{lead.id}"
        )

    db.commit()
    db.refresh(new_lp)
    return new_lp


def build_loan_process_summary(lp: Optional[LoanProcess]) -> Optional[LoanProcessSummary]:
    if not lp:
        return None

    # Count documents per stage
    docs = lp.documents or []
    loan_cnt = sum(1 for d in docs if d.stage_category == "loan_file")
    inst_cnt = sum(1 for d in docs if d.stage_category == "installation")
    nm_cnt = sum(1 for d in docs if d.stage_category == "net_meter_file")
    insp_cnt = sum(1 for d in docs if d.stage_category == "inspection")
    sub_cnt = sum(1 for d in docs if d.stage_category == "subsidy")
    installed_photos_cnt = sum(1 for d in docs if d.stage_category in ("installed_photo", "installation_photo"))
    dcr_cnt = sum(1 for d in docs if d.stage_category == "dcr_report")
    panel_cnt = len(lp.panel_serials) if lp.panel_serials else 0

    return LoanProcessSummary(
        id=lp.id,
        loan_process_number=lp.loan_process_number,
        loan_status=lp.loan_status or "Not Started",
        installation_status=lp.installation_status or "Not Started",
        net_meter_status=lp.net_meter_status or "Not Started",
        inspection_status=lp.inspection_status or "Not Started",
        subsidy_status=lp.subsidy_status or "Not Started",
        overall_progress_pct=lp.overall_progress_pct or 0,
        loan_files_count=loan_cnt,
        installation_docs_count=inst_cnt,
        net_meter_files_count=nm_cnt,
        inspection_docs_count=insp_cnt,
        subsidy_docs_count=sub_cnt,
        installed_photos_count=installed_photos_cnt,
        dcr_reports_count=dcr_cnt,
        panel_serials_count=panel_cnt
    )


def save_loan_document(
    db: Session,
    company_id: int,
    lead: Lead,
    loan_process: LoanProcess,
    stage_category: str,
    file: UploadFile,
    notes: Optional[str],
    uploaded_by: User
) -> LoanDocument:
    # 1. Validate category
    valid_categories = {
        "loan_file", "installation", "net_meter_file", "inspection", "subsidy",
        "installed_photo", "installation_photo", "dcr_report"
    }
    if stage_category not in valid_categories:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid stage category '{stage_category}'. Must be one of: {', '.join(sorted(valid_categories))}"
        )

    # 2. Validate extension according to category
    orig_name = file.filename or "document"
    ext = os.path.splitext(orig_name)[1].lower()

    if stage_category in {"installed_photo", "installation_photo"}:
        if ext not in ALLOWED_IMAGE_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Installed photos must be in JPG, JPEG, PNG, or WebP format. Provided: '{ext}'"
            )
    elif stage_category == "dcr_report":
        if ext not in ALLOWED_DCR_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"DCR Report must be a PDF document. Provided: '{ext}'"
            )
    else:
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"File format '{ext}' is not supported. Please upload PDF, JPG, JPEG, PNG, or WEBP."
            )

    # 3. Create company directory
    target_dir = os.path.join(settings.UPLOAD_DIR, "loans", str(company_id))
    os.makedirs(target_dir, exist_ok=True)

    unique_filename = f"{uuid.uuid4().hex}_{os.path.basename(orig_name)}"
    full_disk_path = os.path.join(target_dir, unique_filename)

    # 4. Stream file and validate size
    bytes_written = 0
    with open(full_disk_path, "wb") as f_out:
        while True:
            chunk = file.file.read(1024 * 1024) # 1MB chunks
            if not chunk:
                break
            bytes_written += len(chunk)
            if bytes_written > MAX_FILE_SIZE_BYTES:
                f_out.close()
                if os.path.exists(full_disk_path):
                    os.remove(full_disk_path)
                raise HTTPException(
                    status_code=400,
                    detail=f"File exceeds maximum allowed size of 15 MB."
                )
            f_out.write(chunk)

    # 5. DB record with public web path
    web_path = f"/uploads/loans/{company_id}/{unique_filename}"
    new_doc = LoanDocument(
        company_id=company_id,
        loan_process_id=loan_process.id,
        lead_id=lead.id,
        stage_category=stage_category,
        file_name=orig_name,
        file_path=web_path,
        file_size=bytes_written,
        mime_type=file.content_type or "application/octet-stream",
        uploaded_by_id=uploaded_by.id,
        notes=notes
    )
    db.add(new_doc)
    db.flush()

    # 6. Log lead activity
    category_label = stage_category.replace("_", " ").title()
    size_kb = round(bytes_written / 1024, 1)
    act = LeadActivity(
        company_id=company_id,
        lead_id=lead.id,
        user_id=uploaded_by.id,
        activity_type="loan_doc_uploaded",
        title=f"Document Uploaded: {category_label}",
        description=f"{uploaded_by.full_name} uploaded '{orig_name}' ({size_kb} KB) to {category_label} stage."
    )
    db.add(act)

    # 7. Notify assigned sales rep
    dispatch_targeted_notification(
        db=db,
        company_id=company_id,
        actor=uploaded_by,
        assigned_user_id=lead.assigned_to_id,
        title=f"New Document Uploaded ({category_label})",
        message=f"{uploaded_by.full_name} uploaded {orig_name} for {lead.full_name} ({lead.lead_id}).",
        category="lead",
        link_url=f"/leads/{lead.id}"
    )

    db.commit()
    db.refresh(new_doc)
    return new_doc


def delete_loan_document(
    db: Session,
    company_id: int,
    lead: Lead,
    document_id: int,
    user: User
) -> bool:
    doc = db.query(LoanDocument).filter(
        LoanDocument.id == document_id,
        LoanDocument.company_id == company_id,
        LoanDocument.lead_id == lead.id
    ).first()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Remove file from disk safely
    try:
        rel_path = doc.file_path.lstrip("/")
        # If path starts with uploads/, map to UPLOAD_DIR
        if rel_path.startswith("uploads/"):
            disk_rel = rel_path[len("uploads/"):]
            full_disk_path = os.path.join(settings.UPLOAD_DIR, disk_rel)
            if os.path.exists(full_disk_path):
                os.remove(full_disk_path)
    except Exception as e:
        print(f"[!] Warning: could not delete file from disk: {e}")

    # Log activity
    cat_label = doc.stage_category.replace("_", " ").title()
    act = LeadActivity(
        company_id=company_id,
        lead_id=lead.id,
        user_id=user.id,
        activity_type="loan_doc_deleted",
        title=f"Document Removed: {doc.file_name}",
        description=f"{user.full_name} deleted document '{doc.file_name}' from {cat_label} stage."
    )
    db.add(act)

    db.delete(doc)
    db.commit()
    return True
