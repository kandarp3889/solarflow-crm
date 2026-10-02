import io
import json
import math
import zipfile
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from app.models.models import (
    Invoice, InvoiceItem, InvoicePayment, InvoiceSettings, InvoiceStatus,
    Company, Lead, User, LeadActivity
)
from app.schemas.schemas import (
    InvoiceCreate, InvoiceUpdate, InvoiceItemCreate, InvoicePaymentCreate,
    InvoiceSettingsUpdate
)

logger = logging.getLogger(__name__)

# ============================================================================
# 1. INDIAN NUMBERING SYSTEM TO WORDS CONVERTER
# ============================================================================

ONES = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen"
]

TENS = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"
]

def _convert_below_thousand(num: int) -> str:
    res = ""
    if num >= 100:
        res += ONES[num // 100] + " Hundred "
        num %= 100
    if num >= 20:
        res += TENS[num // 10] + (" " + ONES[num % 10] if num % 10 != 0 else "")
    elif num > 0:
        res += ONES[num]
    return res.strip()

def number_to_indian_words(amount: float) -> str:
    """
    Converts numbers into standard Indian Rupee notation in words:
    e.g. 155000.00 -> "Rupees One Lakh Fifty Five Thousand Only"
    e.g. 142332.41 -> "Rupees One Lakh Forty Two Thousand Three Hundred Thirty Two and Forty One Paise Only"
    """
    if amount is None or math.isnan(amount):
        return "Rupees Zero Only"

    rupees = int(abs(amount))
    paise = int(round((abs(amount) - rupees) * 100))

    if rupees == 0 and paise == 0:
        return "Rupees Zero Only"

    parts = []

    # Crores (>= 1,00,00,000)
    crores = rupees // 10000000
    rupees %= 10000000
    if crores > 0:
        parts.append(f"{_convert_below_thousand(crores)} Crore")

    # Lakhs (>= 1,00,000)
    lakhs = rupees // 100000
    rupees %= 100000
    if lakhs > 0:
        parts.append(f"{_convert_below_thousand(lakhs)} Lakh")

    # Thousands (>= 1,000)
    thousands = rupees // 1000
    rupees %= 1000
    if thousands > 0:
        parts.append(f"{_convert_below_thousand(thousands)} Thousand")

    # Hundreds and remainder
    if rupees > 0:
        parts.append(_convert_below_thousand(rupees))

    rupees_str = " ".join(parts).strip()
    result = f"Rupees {rupees_str}" if rupees_str else "Rupees Zero"

    if paise > 0:
        paise_str = _convert_below_thousand(paise)
        result += f" and {paise_str} Paise"

    result += " Only"
    return result


# ============================================================================
# 2. INVOICE SETTINGS MANAGEMENT & DEFAULTS
# ============================================================================

def get_or_create_invoice_settings(db: Session, company_id: int) -> InvoiceSettings:
    """Retrieves tenant invoice settings or initializes with reference company defaults."""
    settings = db.query(InvoiceSettings).filter(InvoiceSettings.company_id == company_id).first()
    if not settings:
        comp_name = "TRUESUN ENERGY"
        settings = InvoiceSettings(
            company_id=company_id,
            company_name=comp_name,
            address="New Plot Area, Gam Vistar, Sultanpur",
            contact_number="9974045095",
            email="info.truesunenergy@gmail.com",
            website="truesunenergy.in",
            gstin="24EIVPG5500C1ZI",
            pan="EIVPG5500C",
            state_code="24",
            state_name="Gujarat",
            bank_name="State Bank of India",
            account_number="44474952500",
            ifsc_code="SBIN0003268",
            branch_name="Sultanpur",
            invoice_prefix="INV-",
            next_invoice_number=22,
            default_payment_terms="Immediate / On Delivery",
            default_terms="Looking forward for your business.",
            declaration="We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.",
            signature_label=f"For, {comp_name}"
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)
    elif settings.company_name == "True Sun Energy":
        settings.company_name = "TRUESUN ENERGY"
        db.commit()
        db.refresh(settings)
    return settings

def update_invoice_settings(db: Session, company_id: int, payload: InvoiceSettingsUpdate) -> InvoiceSettings:
    settings = get_or_create_invoice_settings(db, company_id)
    update_data = payload.dict(exclude_unset=True)
    for field, val in update_data.items():
        setattr(settings, field, val)
    db.commit()
    db.refresh(settings)
    return settings


# ============================================================================
# 3. UNIQUE NUMBER GENERATION & TAX CALCULATIONS
# ============================================================================

def generate_next_invoice_number(db: Session, company_id: int) -> str:
    """
    Generates the next sequential invoice number for a tenant (e.g. INV-022)
    and increments the counter while guaranteeing uniqueness.
    """
    settings = get_or_create_invoice_settings(db, company_id)
    prefix = settings.invoice_prefix or "INV-"
    seq = settings.next_invoice_number or 1

    # Check for collisions and advance sequence if already present
    while True:
        candidate = f"{prefix}{seq:03d}" if seq < 1000 else f"{prefix}{seq}"
        exists = db.query(Invoice).filter(
            Invoice.company_id == company_id,
            Invoice.invoice_number == candidate
        ).first()
        if not exists:
            # Advance stored counter to next sequence
            settings.next_invoice_number = seq + 1
            db.commit()
            return candidate
        seq += 1

def calculate_invoice_financials(
    items_data: List[InvoiceItemCreate],
    company_state_code: str,
    place_of_supply: Optional[str]
) -> Tuple[List[Dict[str, Any]], float, float, float, float, str, List[Dict[str, Any]]]:
    """
    Computes GST line-by-line using Indian GST rules:
    - Intra-state (Place of Supply matches Company State, e.g. Gujarat 24 == 24): CGST = GST/2, SGST = GST/2
    - Inter-state: IGST = GST
    - Generates HSN/SAC summary aggregation.
    - Calculates subtotal, total tax, round-off, and amount in words.
    """
    pos_clean = (place_of_supply or "").strip()
    is_intra_state = True
    if pos_clean:
        # Check if POS starts with company state code e.g. "24" or "24-Gujarat"
        if not pos_clean.startswith(company_state_code):
            is_intra_state = False

    processed_items: List[Dict[str, Any]] = []
    subtotal = 0.0
    total_tax = 0.0

    # HSN Accumulator: key is (hsn_sac, gst_rate)
    hsn_buckets: Dict[Tuple[str, float], Dict[str, Any]] = {}

    for idx, item in enumerate(items_data, start=1):
        qty = float(item.quantity)
        rate = float(item.unit_price)
        gst_pct = float(item.gst_rate)
        hsn = (item.hsn_sac or "8541").strip()
        is_tax_incl = bool(getattr(item, "is_tax_inclusive", False))
        disc_type = getattr(item, "discount_type", "percent") or "percent"
        disc_val = float(getattr(item, "discount_value", 0.0) or 0.0)
        item_code = getattr(item, "item_code", None)

        if is_tax_incl:
            # Entered rate includes GST (Hitech Retail / MRP mode)
            gross_raw = round(qty * rate, 2)
            if disc_type == "percent":
                disc_amt = round(gross_raw * (disc_val / 100.0), 2)
            else:
                disc_amt = round(disc_val, 2)
            disc_amt = min(gross_raw, max(0.0, disc_amt))
            gross_after_disc = round(gross_raw - disc_amt, 2)

            # Reverse calculate taxable amount: Taxable = Gross / (1 + GST% / 100)
            if gst_pct > 0:
                taxable = round(gross_after_disc / (1.0 + (gst_pct / 100.0)), 2)
                tax_for_item = round(gross_after_disc - taxable, 2)
            else:
                taxable = gross_after_disc
                tax_for_item = 0.0

            line_total = gross_after_disc
        else:
            # Standard Tax Exclusive: Entered rate is base price
            base_raw = round(qty * rate, 2)
            if disc_type == "percent":
                disc_amt = round(base_raw * (disc_val / 100.0), 2)
            else:
                disc_amt = round(disc_val, 2)
            disc_amt = min(base_raw, max(0.0, disc_amt))
            taxable = round(base_raw - disc_amt, 2)

            if gst_pct > 0:
                tax_for_item = round(taxable * (gst_pct / 100.0), 2)
            else:
                tax_for_item = 0.0
            line_total = round(taxable + tax_for_item, 2)

        subtotal += taxable
        total_tax += tax_for_item

        if is_intra_state:
            cgst_rate = round(gst_pct / 2.0, 2)
            sgst_rate = round(gst_pct / 2.0, 2)
            igst_rate = 0.0
            cgst_amt = round(tax_for_item / 2.0, 2) if is_tax_incl else round(taxable * (cgst_rate / 100.0), 2)
            sgst_amt = round(tax_for_item - cgst_amt, 2)
            igst_amt = 0.0
        else:
            cgst_rate = 0.0
            sgst_rate = 0.0
            igst_rate = gst_pct
            cgst_amt = 0.0
            sgst_amt = 0.0
            igst_amt = tax_for_item

        item_dict = {
            "sort_order": idx,
            "item_code": item_code,
            "particulars": item.particulars,
            "description": item.description,
            "hsn_sac": hsn,
            "quantity": qty,
            "unit": item.unit or "SITE",
            "unit_price": rate,
            "is_tax_inclusive": is_tax_incl,
            "discount_type": disc_type,
            "discount_value": disc_val,
            "discount_amount": disc_amt,
            "gst_rate": gst_pct,
            "taxable_amount": taxable,
            "cgst_rate": cgst_rate,
            "cgst_amount": cgst_amt,
            "sgst_rate": sgst_rate,
            "sgst_amount": sgst_amt,
            "igst_rate": igst_rate,
            "igst_amount": igst_amt,
            "line_total": line_total
        }
        processed_items.append(item_dict)

        # Accumulate HSN breakdown
        bucket_key = (hsn, gst_pct)
        if bucket_key not in hsn_buckets:
            hsn_buckets[bucket_key] = {
                "hsn_sac": hsn,
                "gst_rate": gst_pct,
                "taxable_amount": 0.0,
                "cgst_rate": cgst_rate,
                "cgst_amount": 0.0,
                "sgst_rate": sgst_rate,
                "sgst_amount": 0.0,
                "igst_rate": igst_rate,
                "igst_amount": 0.0,
                "total_tax_amount": 0.0
            }
        hsn_buckets[bucket_key]["taxable_amount"] = round(hsn_buckets[bucket_key]["taxable_amount"] + taxable, 2)
        hsn_buckets[bucket_key]["cgst_amount"] = round(hsn_buckets[bucket_key]["cgst_amount"] + cgst_amt, 2)
        hsn_buckets[bucket_key]["sgst_amount"] = round(hsn_buckets[bucket_key]["sgst_amount"] + sgst_amt, 2)
        hsn_buckets[bucket_key]["igst_amount"] = round(hsn_buckets[bucket_key]["igst_amount"] + igst_amt, 2)
        hsn_buckets[bucket_key]["total_tax_amount"] = round(hsn_buckets[bucket_key]["total_tax_amount"] + tax_for_item, 2)

    subtotal = round(subtotal, 2)
    total_tax = round(total_tax, 2)
    raw_total = subtotal + total_tax
    rounded_total = float(round(raw_total))
    round_off = round(rounded_total - raw_total, 2)
    amount_in_words = number_to_indian_words(rounded_total)

    # Sort HSN summary list
    hsn_summary_list = sorted(list(hsn_buckets.values()), key=lambda x: str(x["hsn_sac"]))

    return processed_items, subtotal, total_tax, round_off, rounded_total, amount_in_words, hsn_summary_list


# ============================================================================
# 4. INVOICE CRUD OPERATIONS
# ============================================================================

def create_invoice(db: Session, company_id: int, user_id: int, payload: InvoiceCreate) -> Invoice:
    settings = get_or_create_invoice_settings(db, company_id)

    # Auto-generate or sanitize invoice number
    inv_num = (payload.invoice_number or "").strip()
    if not inv_num:
        inv_num = generate_next_invoice_number(db, company_id)
    else:
        # Check uniqueness
        existing = db.query(Invoice).filter(
            Invoice.company_id == company_id,
            Invoice.invoice_number == inv_num
        ).first()
        if existing:
            raise ValueError(f"Invoice number '{inv_num}' already exists in this company.")

    company_state_code = settings.state_code or "24"
    processed_items, subtotal, tax_amount, round_off, total_amount, amount_in_words, hsn_summary = calculate_invoice_financials(
        items_data=payload.items,
        company_state_code=company_state_code,
        place_of_supply=payload.bill_to_pos or payload.ship_to_pos
    )

    # Create immutable snapshot of company details
    invoice = Invoice(
        company_id=company_id,
        lead_id=payload.lead_id,
        created_by_id=user_id,
        invoice_number=inv_num,
        invoice_date=payload.invoice_date or datetime.utcnow(),
        due_date=payload.due_date,
        payment_terms=payload.payment_terms or settings.default_payment_terms,
        status=payload.status or "issued",

        # Snapshots
        company_name_snapshot=settings.company_name,
        company_address_snapshot=settings.address,
        company_contact_snapshot=settings.contact_number,
        company_email_snapshot=settings.email,
        company_website_snapshot=settings.website,
        company_gstin_snapshot=settings.gstin,
        company_pan_snapshot=settings.pan,
        company_state_code_snapshot=company_state_code,
        bank_name_snapshot=settings.bank_name,
        bank_account_snapshot=settings.account_number,
        bank_ifsc_snapshot=settings.ifsc_code,
        bank_branch_snapshot=settings.branch_name,
        signature_label_snapshot=settings.signature_label,

        # Bill To
        bill_to_name=payload.bill_to_name.strip(),
        bill_to_address=payload.bill_to_address,
        bill_to_contact=payload.bill_to_contact,
        bill_to_gstin=payload.bill_to_gstin,
        bill_to_pos=payload.bill_to_pos or "24-Gujarat",

        # Ship To
        ship_to_name=payload.ship_to_name.strip(),
        ship_to_address=payload.ship_to_address,
        ship_to_contact=payload.ship_to_contact,
        ship_to_pos=payload.ship_to_pos or "24-Gujarat",

        # Financials
        subtotal=subtotal,
        tax_amount=tax_amount,
        round_off=round_off,
        total_amount=total_amount,
        paid_amount=0.0,
        outstanding_amount=total_amount,
        amount_in_words=amount_in_words,

        # Terms & conditions
        delivery_terms=payload.delivery_terms,
        terms_and_conditions=payload.terms_and_conditions or settings.default_terms,
        notes=payload.notes,
        hsn_summary=hsn_summary
    )
    db.add(invoice)
    db.flush()

    # Create line items
    for item_dict in processed_items:
        db_item = InvoiceItem(
            invoice_id=invoice.id,
            **item_dict
        )
        db.add(db_item)

    # Activity log on lead if linked
    if payload.lead_id:
        act = LeadActivity(
            company_id=company_id,
            lead_id=payload.lead_id,
            user_id=user_id,
            activity_type="invoice_created",
            title=f"Invoice Generated: {inv_num}",
            description=f"Generated Tax Invoice {inv_num} for ₹{total_amount:,.2f}."
        )
        db.add(act)

    db.commit()
    db.refresh(invoice)
    return invoice

def update_invoice(db: Session, invoice_id: int, company_id: int, payload: InvoiceUpdate) -> Invoice:
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id, Invoice.company_id == company_id).first()
    if not invoice:
        raise ValueError("Invoice not found")

    if invoice.status == InvoiceStatus.CANCELLED.value:
        raise ValueError("Cannot update a cancelled invoice.")

    update_dict = payload.dict(exclude_unset=True)

    # If items are updated, recalculate line items and totals
    if "items" in update_dict and update_dict["items"] is not None:
        items_payload = payload.items or []
        company_state_code = invoice.company_state_code_snapshot or "24"
        pos = update_dict.get("bill_to_pos") or invoice.bill_to_pos
        processed_items, subtotal, tax_amount, round_off, total_amount, amount_in_words, hsn_summary = calculate_invoice_financials(
            items_data=items_payload,
            company_state_code=company_state_code,
            place_of_supply=pos
        )

        # Remove old items
        db.query(InvoiceItem).filter(InvoiceItem.invoice_id == invoice.id).delete()
        # Add updated items
        for item_dict in processed_items:
            db_item = InvoiceItem(
                invoice_id=invoice.id,
                **item_dict
            )
            db.add(db_item)

        invoice.subtotal = subtotal
        invoice.tax_amount = tax_amount
        invoice.round_off = round_off
        invoice.total_amount = total_amount
        invoice.amount_in_words = amount_in_words
        invoice.hsn_summary = hsn_summary
        invoice.outstanding_amount = max(0.0, total_amount - invoice.paid_amount)

        # Update status based on payment vs new total
        if invoice.status != InvoiceStatus.CANCELLED.value and invoice.status != InvoiceStatus.DRAFT.value:
            if invoice.paid_amount >= total_amount and total_amount > 0:
                invoice.status = InvoiceStatus.PAID.value
            elif invoice.paid_amount > 0:
                invoice.status = InvoiceStatus.PARTIALLY_PAID.value
            else:
                invoice.status = InvoiceStatus.ISSUED.value

    # Update top-level fields
    for field in [
        "lead_id", "invoice_date", "due_date", "payment_terms", "status",
        "bill_to_name", "bill_to_address", "bill_to_contact", "bill_to_gstin", "bill_to_pos",
        "ship_to_name", "ship_to_address", "ship_to_contact", "ship_to_pos",
        "delivery_terms", "terms_and_conditions", "notes"
    ]:
        if field in update_dict and update_dict[field] is not None:
            setattr(invoice, field, update_dict[field])

    db.commit()
    db.refresh(invoice)
    return invoice

def record_invoice_payment(
    db: Session,
    company_id: int,
    invoice_id: int,
    user_id: int,
    payload: InvoicePaymentCreate
) -> InvoicePayment:
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id, Invoice.company_id == company_id).first()
    if not invoice:
        raise ValueError("Invoice not found")

    if invoice.status == InvoiceStatus.CANCELLED.value:
        raise ValueError("Cannot record payment on a cancelled invoice.")

    payment = InvoicePayment(
        invoice_id=invoice.id,
        company_id=company_id,
        payment_date=payload.payment_date or datetime.utcnow(),
        amount=round(float(payload.amount), 2),
        payment_method=payload.payment_method or "Bank Transfer",
        transaction_reference=payload.transaction_reference,
        notes=payload.notes,
        recorded_by_id=user_id
    )
    db.add(payment)
    db.flush()

    # Recalculate totals
    total_paid = db.query(func.sum(InvoicePayment.amount)).filter(InvoicePayment.invoice_id == invoice.id).scalar() or 0.0
    invoice.paid_amount = round(total_paid, 2)
    invoice.outstanding_amount = max(0.0, round(invoice.total_amount - invoice.paid_amount, 2))

    if invoice.paid_amount >= invoice.total_amount and invoice.total_amount > 0:
        invoice.status = InvoiceStatus.PAID.value
    elif invoice.paid_amount > 0:
        invoice.status = InvoiceStatus.PARTIALLY_PAID.value
    else:
        invoice.status = InvoiceStatus.ISSUED.value

    # Activity log
    if invoice.lead_id:
        act = LeadActivity(
            company_id=company_id,
            lead_id=invoice.lead_id,
            user_id=user_id,
            activity_type="invoice_payment",
            title=f"Payment Received: {invoice.invoice_number}",
            description=f"Received payment of ₹{payload.amount:,.2f} via {payload.payment_method} for invoice {invoice.invoice_number}."
        )
        db.add(act)

    db.commit()
    db.refresh(payment)
    db.refresh(invoice)
    return payment

def delete_invoice_payment(db: Session, company_id: int, invoice_id: int, payment_id: int) -> bool:
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id, Invoice.company_id == company_id).first()
    if not invoice:
        raise ValueError("Invoice not found")

    payment = db.query(InvoicePayment).filter(
        InvoicePayment.id == payment_id,
        InvoicePayment.invoice_id == invoice.id,
        InvoicePayment.company_id == company_id
    ).first()
    if not payment:
        raise ValueError("Payment record not found")

    db.delete(payment)
    db.flush()

    total_paid = db.query(func.sum(InvoicePayment.amount)).filter(InvoicePayment.invoice_id == invoice.id).scalar() or 0.0
    invoice.paid_amount = round(total_paid, 2)
    invoice.outstanding_amount = max(0.0, round(invoice.total_amount - invoice.paid_amount, 2))

    if invoice.status != InvoiceStatus.CANCELLED.value:
        if invoice.paid_amount >= invoice.total_amount and invoice.total_amount > 0:
            invoice.status = InvoiceStatus.PAID.value
        elif invoice.paid_amount > 0:
            invoice.status = InvoiceStatus.PARTIALLY_PAID.value
        else:
            invoice.status = InvoiceStatus.ISSUED.value

    db.commit()
    return True

def cancel_invoice(db: Session, invoice_id: int, company_id: int, user_id: int, reason: Optional[str] = None) -> Invoice:
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id, Invoice.company_id == company_id).first()
    if not invoice:
        raise ValueError("Invoice not found")

    invoice.status = InvoiceStatus.CANCELLED.value
    if reason:
        invoice.notes = f"{invoice.notes or ''}\n[Cancelled]: {reason}".strip()

    if invoice.lead_id:
        act = LeadActivity(
            company_id=company_id,
            lead_id=invoice.lead_id,
            user_id=user_id,
            activity_type="invoice_cancelled",
            title=f"Invoice Cancelled: {invoice.invoice_number}",
            description=f"Invoice {invoice.invoice_number} was marked as Cancelled. Reason: {reason or 'No reason provided'}."
        )
        db.add(act)

    db.commit()
    db.refresh(invoice)
    return invoice


# ============================================================================
# 5. DASHBOARD METRICS & RECENT ACTIVITY
# ============================================================================

def get_invoice_dashboard_metrics(db: Session, company_id: int) -> Dict[str, Any]:
    invoices = db.query(Invoice).filter(Invoice.company_id == company_id).all()
    total_invoices = len(invoices)

    active_invoices = [inv for inv in invoices if inv.status != InvoiceStatus.CANCELLED.value]
    total_revenue = sum(inv.total_amount for inv in active_invoices)
    total_paid = sum(inv.paid_amount for inv in active_invoices)
    total_outstanding = sum(inv.outstanding_amount for inv in active_invoices)

    status_counts = {
        "all": total_invoices,
        "draft": sum(1 for inv in invoices if inv.status == InvoiceStatus.DRAFT.value),
        "issued": sum(1 for inv in invoices if inv.status == InvoiceStatus.ISSUED.value),
        "partially_paid": sum(1 for inv in invoices if inv.status == InvoiceStatus.PARTIALLY_PAID.value),
        "paid": sum(1 for inv in invoices if inv.status == InvoiceStatus.PAID.value),
        "cancelled": sum(1 for inv in invoices if inv.status == InvoiceStatus.CANCELLED.value),
    }

    recent_invoices = db.query(Invoice).filter(
        Invoice.company_id == company_id
    ).order_by(desc(Invoice.created_at)).limit(6).all()

    # Monthly Trend (last 6 months)
    monthly_trend = []
    # Simple month aggregation
    months_map: Dict[str, Dict[str, float]] = {}
    for inv in active_invoices:
        m_key = inv.invoice_date.strftime("%b %Y") if inv.invoice_date else "Unknown"
        if m_key not in months_map:
            months_map[m_key] = {"month": m_key, "billed": 0.0, "collected": 0.0}
        months_map[m_key]["billed"] += inv.total_amount
        months_map[m_key]["collected"] += inv.paid_amount

    monthly_trend = list(months_map.values())[-6:]

    return {
        "total_invoices": total_invoices,
        "total_revenue": round(total_revenue, 2),
        "total_paid": round(total_paid, 2),
        "total_outstanding": round(total_outstanding, 2),
        "status_counts": status_counts,
        "recent_invoices": recent_invoices,
        "monthly_trend": monthly_trend
    }


# ============================================================================
# 6. LOCAL MACHINE BACKUP & RESTORE ENGINE (ZIP PACKAGE)
# ============================================================================

def export_invoices_backup(db: Session, company_id: int) -> bytes:
    """
    Creates a full ZIP backup package for the tenant containing:
    - manifest.json
    - invoices.json
    - invoice_items.json
    - invoice_payments.json
    - invoice_settings.json
    """
    company = db.query(Company).filter(Company.id == company_id).first()
    comp_name = company.name if company else "TrueSun Energy"

    invoices = db.query(Invoice).filter(Invoice.company_id == company_id).all()
    invoice_ids = [inv.id for inv in invoices]

    items = db.query(InvoiceItem).filter(InvoiceItem.invoice_id.in_(invoice_ids)).all() if invoice_ids else []
    payments = db.query(InvoicePayment).filter(InvoicePayment.company_id == company_id).all()
    settings = db.query(InvoiceSettings).filter(InvoiceSettings.company_id == company_id).first()

    # Serialization
    def serialize_dt(dt: Optional[datetime]) -> Optional[str]:
        return dt.isoformat() if dt else None

    invoices_data = []
    for inv in invoices:
        invoices_data.append({
            "id": inv.id,
            "invoice_number": inv.invoice_number,
            "invoice_date": serialize_dt(inv.invoice_date),
            "due_date": serialize_dt(inv.due_date),
            "payment_terms": inv.payment_terms,
            "status": inv.status,
            "company_name_snapshot": inv.company_name_snapshot,
            "company_address_snapshot": inv.company_address_snapshot,
            "company_contact_snapshot": inv.company_contact_snapshot,
            "company_email_snapshot": inv.company_email_snapshot,
            "company_website_snapshot": inv.company_website_snapshot,
            "company_gstin_snapshot": inv.company_gstin_snapshot,
            "company_pan_snapshot": inv.company_pan_snapshot,
            "company_state_code_snapshot": inv.company_state_code_snapshot,
            "bank_name_snapshot": inv.bank_name_snapshot,
            "bank_account_snapshot": inv.bank_account_snapshot,
            "bank_ifsc_snapshot": inv.bank_ifsc_snapshot,
            "bank_branch_snapshot": inv.bank_branch_snapshot,
            "signature_label_snapshot": inv.signature_label_snapshot,
            "bill_to_name": inv.bill_to_name,
            "bill_to_address": inv.bill_to_address,
            "bill_to_contact": inv.bill_to_contact,
            "bill_to_gstin": inv.bill_to_gstin,
            "bill_to_pos": inv.bill_to_pos,
            "ship_to_name": inv.ship_to_name,
            "ship_to_address": inv.ship_to_address,
            "ship_to_contact": inv.ship_to_contact,
            "ship_to_pos": inv.ship_to_pos,
            "subtotal": inv.subtotal,
            "tax_amount": inv.tax_amount,
            "round_off": inv.round_off,
            "total_amount": inv.total_amount,
            "paid_amount": inv.paid_amount,
            "outstanding_amount": inv.outstanding_amount,
            "amount_in_words": inv.amount_in_words,
            "delivery_terms": inv.delivery_terms,
            "terms_and_conditions": inv.terms_and_conditions,
            "notes": inv.notes,
            "hsn_summary": inv.hsn_summary,
            "created_at": serialize_dt(inv.created_at)
        })

    items_data = []
    for it in items:
        items_data.append({
            "id": it.id,
            "invoice_id": it.invoice_id,
            "sort_order": it.sort_order,
            "particulars": it.particulars,
            "description": it.description,
            "hsn_sac": it.hsn_sac,
            "quantity": it.quantity,
            "unit": it.unit,
            "unit_price": it.unit_price,
            "gst_rate": it.gst_rate,
            "taxable_amount": it.taxable_amount,
            "cgst_rate": it.cgst_rate,
            "cgst_amount": it.cgst_amount,
            "sgst_rate": it.sgst_rate,
            "sgst_amount": it.sgst_amount,
            "igst_rate": it.igst_rate,
            "igst_amount": it.igst_amount,
            "line_total": it.line_total,
            "created_at": serialize_dt(it.created_at)
        })

    payments_data = []
    for p in payments:
        payments_data.append({
            "id": p.id,
            "invoice_id": p.invoice_id,
            "payment_date": serialize_dt(p.payment_date),
            "amount": p.amount,
            "payment_method": p.payment_method,
            "transaction_reference": p.transaction_reference,
            "notes": p.notes,
            "created_at": serialize_dt(p.created_at)
        })

    settings_data = {}
    if settings:
        settings_data = {
            "company_name": settings.company_name,
            "address": settings.address,
            "contact_number": settings.contact_number,
            "email": settings.email,
            "website": settings.website,
            "gstin": settings.gstin,
            "pan": settings.pan,
            "state_code": settings.state_code,
            "state_name": settings.state_name,
            "bank_name": settings.bank_name,
            "account_number": settings.account_number,
            "ifsc_code": settings.ifsc_code,
            "branch_name": settings.branch_name,
            "invoice_prefix": settings.invoice_prefix,
            "next_invoice_number": settings.next_invoice_number,
            "default_payment_terms": settings.default_payment_terms,
            "default_terms": settings.default_terms,
            "declaration": settings.declaration,
            "signature_label": settings.signature_label
        }

    manifest = {
        "version": "1.0",
        "format": "solarflow_invoice_backup",
        "created_at": datetime.utcnow().isoformat(),
        "company_id": company_id,
        "company_name": comp_name,
        "counts": {
            "invoices": len(invoices_data),
            "items": len(items_data),
            "payments": len(payments_data),
            "settings": 1 if settings_data else 0
        }
    }

    # Construct ZIP stream
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, mode="w", compression=zipfile.ZIP_DEFLATED) as zip_file:
        zip_file.writestr("manifest.json", json.dumps(manifest, indent=2))
        zip_file.writestr("invoices.json", json.dumps(invoices_data, indent=2))
        zip_file.writestr("invoice_items.json", json.dumps(items_data, indent=2))
        zip_file.writestr("invoice_payments.json", json.dumps(payments_data, indent=2))
        zip_file.writestr("invoice_settings.json", json.dumps(settings_data, indent=2))

    zip_buffer.seek(0)
    return zip_buffer.getvalue()

def preview_invoices_backup(db: Session, company_id: int, zip_bytes: bytes) -> Dict[str, Any]:
    """Inspects and validates an uploaded backup ZIP without writing to the database."""
    try:
        with zipfile.ZipFile(io.BytesIO(zip_bytes), mode="r") as z:
            file_list = z.namelist()
            if "manifest.json" not in file_list or "invoices.json" not in file_list:
                return {
                    "is_valid": False,
                    "message": "Invalid backup file: manifest.json or invoices.json missing."
                }

            manifest = json.loads(z.read("manifest.json").decode("utf-8"))
            invoices_data = json.loads(z.read("invoices.json").decode("utf-8"))
            items_data = json.loads(z.read("invoice_items.json").decode("utf-8")) if "invoice_items.json" in file_list else []
            payments_data = json.loads(z.read("invoice_payments.json").decode("utf-8")) if "invoice_payments.json" in file_list else []

            # Check conflicts with existing invoices
            existing_numbers = set(
                db.query(Invoice.invoice_number).filter(Invoice.company_id == company_id).all()
            )
            existing_flat = {row[0] for row in existing_numbers}
            conflicts = sum(1 for inv in invoices_data if inv.get("invoice_number") in existing_flat)

            invoices_preview = []
            for inv in invoices_data[:10]:
                invoices_preview.append({
                    "invoice_number": inv.get("invoice_number"),
                    "bill_to_name": inv.get("bill_to_name"),
                    "total_amount": inv.get("total_amount"),
                    "date": inv.get("invoice_date", "")[:10],
                    "status": inv.get("status"),
                    "exists": inv.get("invoice_number") in existing_flat
                })

            return {
                "is_valid": True,
                "message": "Backup verified successfully.",
                "backup_date": manifest.get("created_at"),
                "backup_version": manifest.get("version"),
                "invoices_count": len(invoices_data),
                "items_count": len(items_data),
                "payments_count": len(payments_data),
                "existing_conflicts": conflicts,
                "settings_included": "invoice_settings.json" in file_list,
                "invoices_preview": invoices_preview
            }
    except Exception as e:
        logger.error(f"Error previewing invoice backup: {e}")
        return {
            "is_valid": False,
            "message": f"Corrupted or invalid backup archive: {str(e)}"
        }

def restore_invoices_backup(
    db: Session,
    company_id: int,
    zip_bytes: bytes,
    user_id: Optional[int] = None,
    strategy: str = "skip_existing"
) -> Dict[str, Any]:
    """
    Restores invoices, items, payments, and settings from a validated backup archive.
    Runs inside a safe transactional boundary.
    Supported strategies:
    - 'skip_existing': Imports only invoices whose invoice_number does not exist in the database.
    - 'replace_all': Deletes all existing invoice records for this company and loads the backup cleanly.
    """
    try:
        with zipfile.ZipFile(io.BytesIO(zip_bytes), mode="r") as z:
            manifest = json.loads(z.read("manifest.json").decode("utf-8"))
            invoices_data = json.loads(z.read("invoices.json").decode("utf-8"))
            items_data = json.loads(z.read("invoice_items.json").decode("utf-8")) if "invoice_items.json" in z.namelist() else []
            payments_data = json.loads(z.read("invoice_payments.json").decode("utf-8")) if "invoice_payments.json" in z.namelist() else []
            settings_data = json.loads(z.read("invoice_settings.json").decode("utf-8")) if "invoice_settings.json" in z.namelist() else {}

        if strategy == "replace_all":
            # Delete existing invoices (cascading deletes items and payments)
            db.query(Invoice).filter(Invoice.company_id == company_id).delete()
            db.flush()

        existing_numbers = {
            row[0] for row in db.query(Invoice.invoice_number).filter(Invoice.company_id == company_id).all()
        }

        # Map original backup invoice ID -> new restored invoice DB ID
        id_mapping: Dict[int, int] = {}
        restored_invoices_count = 0
        restored_items_count = 0
        restored_payments_count = 0

        # 1. Restore Invoices
        for inv_dict in invoices_data:
            num = inv_dict.get("invoice_number")
            if not num:
                continue

            if strategy == "skip_existing" and num in existing_numbers:
                continue

            old_id = inv_dict.get("id")

            def parse_dt(dt_str: Optional[str]) -> Optional[datetime]:
                if not dt_str:
                    return None
                try:
                    return datetime.fromisoformat(dt_str)
                except Exception:
                    return None

            new_inv = Invoice(
                company_id=company_id,
                created_by_id=user_id,
                invoice_number=num,
                invoice_date=parse_dt(inv_dict.get("invoice_date")) or datetime.utcnow(),
                due_date=parse_dt(inv_dict.get("due_date")),
                payment_terms=inv_dict.get("payment_terms"),
                status=inv_dict.get("status") or "issued",

                company_name_snapshot=inv_dict.get("company_name_snapshot"),
                company_address_snapshot=inv_dict.get("company_address_snapshot"),
                company_contact_snapshot=inv_dict.get("company_contact_snapshot"),
                company_email_snapshot=inv_dict.get("company_email_snapshot"),
                company_website_snapshot=inv_dict.get("company_website_snapshot"),
                company_gstin_snapshot=inv_dict.get("company_gstin_snapshot"),
                company_pan_snapshot=inv_dict.get("company_pan_snapshot"),
                company_state_code_snapshot=inv_dict.get("company_state_code_snapshot") or "24",
                bank_name_snapshot=inv_dict.get("bank_name_snapshot"),
                bank_account_snapshot=inv_dict.get("bank_account_snapshot"),
                bank_ifsc_snapshot=inv_dict.get("bank_ifsc_snapshot"),
                bank_branch_snapshot=inv_dict.get("bank_branch_snapshot"),
                signature_label_snapshot=inv_dict.get("signature_label_snapshot"),

                bill_to_name=inv_dict.get("bill_to_name", "Customer"),
                bill_to_address=inv_dict.get("bill_to_address"),
                bill_to_contact=inv_dict.get("bill_to_contact"),
                bill_to_gstin=inv_dict.get("bill_to_gstin"),
                bill_to_pos=inv_dict.get("bill_to_pos", "24-Gujarat"),

                ship_to_name=inv_dict.get("ship_to_name", "Customer"),
                ship_to_address=inv_dict.get("ship_to_address"),
                ship_to_contact=inv_dict.get("ship_to_contact"),
                ship_to_pos=inv_dict.get("ship_to_pos", "24-Gujarat"),

                subtotal=float(inv_dict.get("subtotal", 0.0)),
                tax_amount=float(inv_dict.get("tax_amount", 0.0)),
                round_off=float(inv_dict.get("round_off", 0.0)),
                total_amount=float(inv_dict.get("total_amount", 0.0)),
                paid_amount=float(inv_dict.get("paid_amount", 0.0)),
                outstanding_amount=float(inv_dict.get("outstanding_amount", 0.0)),
                amount_in_words=inv_dict.get("amount_in_words"),

                delivery_terms=inv_dict.get("delivery_terms"),
                terms_and_conditions=inv_dict.get("terms_and_conditions"),
                notes=inv_dict.get("notes"),
                hsn_summary=inv_dict.get("hsn_summary", [])
            )
            db.add(new_inv)
            db.flush()
            if old_id:
                id_mapping[old_id] = new_inv.id
            existing_numbers.add(num)
            restored_invoices_count += 1

        # 2. Restore Line Items
        for it in items_data:
            old_parent_id = it.get("invoice_id")
            if old_parent_id in id_mapping:
                new_parent_id = id_mapping[old_parent_id]
                new_item = InvoiceItem(
                    invoice_id=new_parent_id,
                    sort_order=it.get("sort_order", 1),
                    particulars=it.get("particulars", "Solar Equipment"),
                    description=it.get("description"),
                    hsn_sac=it.get("hsn_sac", "8541"),
                    quantity=float(it.get("quantity", 1.0)),
                    unit=it.get("unit", "SITE"),
                    unit_price=float(it.get("unit_price", 0.0)),
                    gst_rate=float(it.get("gst_rate", 18.0)),
                    taxable_amount=float(it.get("taxable_amount", 0.0)),
                    cgst_rate=float(it.get("cgst_rate", 0.0)),
                    cgst_amount=float(it.get("cgst_amount", 0.0)),
                    sgst_rate=float(it.get("sgst_rate", 0.0)),
                    sgst_amount=float(it.get("sgst_amount", 0.0)),
                    igst_rate=float(it.get("igst_rate", 0.0)),
                    igst_amount=float(it.get("igst_amount", 0.0)),
                    line_total=float(it.get("line_total", 0.0))
                )
                db.add(new_item)
                restored_items_count += 1

        # 3. Restore Payments
        for p in payments_data:
            old_parent_id = p.get("invoice_id")
            if old_parent_id in id_mapping:
                new_parent_id = id_mapping[old_parent_id]
                def parse_dt_local(s: Optional[str]) -> datetime:
                    try:
                        return datetime.fromisoformat(s) if s else datetime.utcnow()
                    except Exception:
                        return datetime.utcnow()

                new_pay = InvoicePayment(
                    invoice_id=new_parent_id,
                    company_id=company_id,
                    payment_date=parse_dt_local(p.get("payment_date")),
                    amount=float(p.get("amount", 0.0)),
                    payment_method=p.get("payment_method", "Bank Transfer"),
                    transaction_reference=p.get("transaction_reference"),
                    notes=p.get("notes"),
                    recorded_by_id=user_id
                )
                db.add(new_pay)
                restored_payments_count += 1

        # 4. Restore Settings if provided
        if settings_data:
            settings = get_or_create_invoice_settings(db, company_id)
            for k, v in settings_data.items():
                if hasattr(settings, k) and v is not None:
                    setattr(settings, k, v)

        db.commit()

        return {
            "success": True,
            "message": f"Successfully restored {restored_invoices_count} invoices, {restored_items_count} line items, and {restored_payments_count} payments.",
            "restored_invoices": restored_invoices_count,
            "restored_items": restored_items_count,
            "restored_payments": restored_payments_count
        }

    except Exception as e:
        db.rollback()
        logger.error(f"Error restoring invoice backup: {e}")
        raise ValueError(f"Restore failed: {str(e)}")
