from typing import List, Optional
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, Response, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_

from app.database import get_db
from app.models.models import (
    Invoice,
    InvoiceItem,
    InvoicePayment,
    InvoiceSettings,
    InvoiceStatus,
    User,
    Company,
    Lead,
)
from app.schemas.schemas import (
    InvoiceCreate,
    InvoiceUpdate,
    InvoiceResponse,
    InvoicePaymentCreate,
    InvoicePaymentResponse,
    InvoiceSettingsResponse,
    InvoiceSettingsUpdate,
    InvoiceDashboardResponse,
    InvoiceBackupPreviewResponse,
    InvoiceRestoreRequest,
)
from app.services.invoice_service import (
    get_or_create_invoice_settings,
    update_invoice_settings,
    generate_next_invoice_number,
    create_invoice,
    update_invoice,
    record_invoice_payment,
    delete_invoice_payment,
    cancel_invoice,
    get_invoice_dashboard_metrics,
    export_invoices_backup,
    preview_invoices_backup,
    restore_invoices_backup,
)
from app.services.invoice_pdf_service import generate_invoice_pdf
from app.api.deps import (
    get_current_user,
    get_current_company,
    require_permission,
)

router = APIRouter(prefix="/invoices", tags=["Invoice Management"])


# ==========================================
# 1. Dashboard & Next Number
# ==========================================

@router.get("/dashboard", response_model=InvoiceDashboardResponse)
def get_dashboard(
    current_user: User = Depends(require_permission("invoices:view")),
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db),
):
    """Returns invoice metrics, summaries, and recent activity."""
    return get_invoice_dashboard_metrics(db, company.id)


@router.get("/next-number")
def get_next_number(
    current_user: User = Depends(require_permission("invoices:view")),
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db),
):
    """Returns the preview of the next auto-generated sequential invoice number."""
    next_num = generate_next_invoice_number(db, company.id)
    return {"next_invoice_number": next_num}


# ==========================================
# 2. Invoices List & Search
# ==========================================

@router.get("", response_model=List[InvoiceResponse])
def get_invoices(
    search: Optional[str] = Query(None, description="Search by invoice number, customer name, GSTIN"),
    status: Optional[str] = Query(None, description="Filter by InvoiceStatus"),
    lead_id: Optional[int] = Query(None, description="Filter by linked lead ID"),
    start_date: Optional[date] = Query(None, description="Filter invoices from date"),
    end_date: Optional[date] = Query(None, description="Filter invoices to date"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(require_permission("invoices:view")),
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db),
):
    """Retrieve invoices with flexible search, filtering, and pagination."""
    query = db.query(Invoice).filter(Invoice.company_id == company.id)

    if status:
        query = query.filter(Invoice.status == status)

    if lead_id:
        query = query.filter(Invoice.lead_id == lead_id)

    if start_date:
        query = query.filter(Invoice.invoice_date >= start_date)

    if end_date:
        query = query.filter(Invoice.invoice_date <= end_date)

    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Invoice.invoice_number.ilike(search_pattern),
                Invoice.bill_to_name.ilike(search_pattern),
                Invoice.ship_to_name.ilike(search_pattern),
                Invoice.bill_to_phone.ilike(search_pattern),
                Invoice.bill_to_gstin.ilike(search_pattern),
            )
        )

    invoices = query.order_by(desc(Invoice.invoice_date), desc(Invoice.id)).offset(skip).limit(limit).all()
    return invoices


# ==========================================
# 3. Create Invoice
# ==========================================

@router.post("", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
def create_new_invoice(
    invoice_in: InvoiceCreate,
    current_user: User = Depends(require_permission("invoices:create")),
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db),
):
    """Creates a new invoice with itemized calculations and snapshot company details."""
    try:
        inv = create_invoice(db, company.id, current_user.id, invoice_in)
        return inv
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to create invoice: {str(e)}")


# ==========================================
# 4. Invoice Details & CRUD
# ==========================================

@router.get("/{invoice_id}", response_model=InvoiceResponse)
def get_invoice_by_id(
    invoice_id: int,
    current_user: User = Depends(require_permission("invoices:view")),
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db),
):
    """Retrieve complete invoice details including line items, payments, and snapshots."""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id, Invoice.company_id == company.id).first()
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
    return invoice


@router.put("/{invoice_id}", response_model=InvoiceResponse)
def update_existing_invoice(
    invoice_id: int,
    invoice_in: InvoiceUpdate,
    current_user: User = Depends(require_permission("invoices:edit")),
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db),
):
    """Updates an existing invoice, recalculates financial totals, and updates items."""
    try:
        inv = update_invoice(db, company.id, invoice_id, invoice_in)
        return inv
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to update invoice: {str(e)}")


@router.post("/{invoice_id}/cancel", response_model=InvoiceResponse)
def cancel_existing_invoice(
    invoice_id: int,
    notes: Optional[str] = Query(None, description="Reason for cancellation"),
    current_user: User = Depends(require_permission("invoices:cancel")),
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db),
):
    """Cancels an invoice safely while preserving historical records."""
    try:
        inv = cancel_invoice(db, company.id, invoice_id, notes)
        return inv
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# ==========================================
# 5. Payments
# ==========================================

@router.post("/{invoice_id}/payments", response_model=InvoicePaymentResponse)
def record_payment(
    invoice_id: int,
    payment_in: InvoicePaymentCreate,
    current_user: User = Depends(require_permission("invoices:payments")),
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db),
):
    """Records a payment against an invoice and updates its paid/outstanding balance."""
    try:
        payment = record_invoice_payment(db, company.id, invoice_id, current_user.id, payment_in)
        return payment
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/{invoice_id}/payments/{payment_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_payment(
    invoice_id: int,
    payment_id: int,
    current_user: User = Depends(require_permission("invoices:payments")),
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db),
):
    """Deletes a recorded payment and recalculates invoice payment balances."""
    try:
        delete_invoice_payment(db, company.id, invoice_id, payment_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# ==========================================
# 6. PDF Generation (Original / Duplicate)
# ==========================================

@router.get("/{invoice_id}/pdf")
def download_invoice_pdf(
    invoice_id: int,
    copy_type: str = Query("Original Copy", description="Copy label: 'Original Copy' or 'Duplicate Copy'"),
    download: bool = Query(False, description="Whether to trigger file download or inline view"),
    current_user: User = Depends(require_permission("invoices:view")),
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db),
):
    """Generates and serves a crisp, print-ready PDF matching TrueSun Energy invoice layout."""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id, Invoice.company_id == company.id).first()
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")

    pdf_bytes = generate_invoice_pdf(invoice, copy_type=copy_type)
    
    filename = f"{invoice.invoice_number}_{copy_type.replace(' ', '_').lower()}.pdf"
    disposition = "attachment" if download else "inline"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'{disposition}; filename="{filename}"',
            "Cache-Control": "no-cache",
        },
    )


# ==========================================
# 7. Invoice Settings
# ==========================================

@router.get("/settings/current", response_model=InvoiceSettingsResponse)
def get_settings(
    current_user: User = Depends(require_permission("invoices:view")),
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db),
):
    """Retrieves current invoice settings for the company."""
    return get_or_create_invoice_settings(db, company.id)


@router.put("/settings/current", response_model=InvoiceSettingsResponse)
def update_settings(
    settings_in: InvoiceSettingsUpdate,
    current_user: User = Depends(require_permission("invoices:settings")),
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db),
):
    """Updates company details, bank details, prefix, and invoice layout preferences."""
    return update_invoice_settings(db, company.id, settings_in)


# ==========================================
# 8. Local Backup & Restore
# ==========================================

@router.get("/backup/download")
def download_backup_zip(
    current_user: User = Depends(require_permission("invoices:backup_restore")),
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db),
):
    """Exports all invoice records, items, payments, and settings into a downloadable ZIP archive."""
    try:
        zip_bytes = export_invoices_backup(db, company.id)
        now_str = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"truesun_invoices_backup_{now_str}.zip"

        return Response(
            content=zip_bytes,
            media_type="application/zip",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Cache-Control": "no-cache",
            },
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Backup export failed: {str(e)}")


@router.post("/backup/preview", response_model=InvoiceBackupPreviewResponse)
async def preview_backup(
    file: UploadFile = File(...),
    current_user: User = Depends(require_permission("invoices:backup_restore")),
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db),
):
    """Validates an uploaded invoice backup ZIP and previews existing vs new records before restore."""
    if not file.filename.endswith(".zip"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file must be a valid .zip archive")

    try:
        content = await file.read()
        preview_data = preview_invoices_backup(db, company.id, content)
        return preview_data
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to inspect backup file: {str(e)}")


@router.post("/backup/restore")
async def restore_backup(
    file: UploadFile = File(...),
    strategy: str = Form("skip_existing", description="'skip_existing' or 'replace_all'"),
    current_user: User = Depends(require_permission("invoices:backup_restore")),
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db),
):
    """Restores invoice data from a validated local ZIP backup archive with safety checks."""
    if not file.filename.endswith(".zip"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file must be a valid .zip archive")

    if strategy not in ["skip_existing", "replace_all"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Strategy must be 'skip_existing' or 'replace_all'")

    try:
        content = await file.read()
        result = restore_invoices_backup(db, company.id, content, strategy=strategy)
        return {
            "status": "success",
            "message": "Invoice data restored successfully",
            "details": result,
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Restore operation failed: {str(e)}")
