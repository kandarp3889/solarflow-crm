import os
import sys
from datetime import datetime, date
from decimal import Decimal

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models.models import Company, User, Invoice, InvoiceStatus
from app.schemas.schemas import (
    InvoiceCreate,
    InvoiceItemCreate,
    InvoicePaymentCreate,
    InvoiceSettingsUpdate,
)
from app.services.invoice_service import (
    get_or_create_invoice_settings,
    update_invoice_settings,
    generate_next_invoice_number,
    create_invoice,
    record_invoice_payment,
    get_invoice_dashboard_metrics,
    export_invoices_backup,
    preview_invoices_backup,
    restore_invoices_backup,
)
from app.services.invoice_pdf_service import generate_invoice_pdf


def test_invoices_full_lifecycle():
    db = SessionLocal()
    try:
        # Find first company and admin user
        company = db.query(Company).first()
        assert company is not None, "At least one company must exist"
        user = db.query(User).filter(User.company_id == company.id).first() or db.query(User).first()
        assert user is not None, "At least one user must exist"

        print(f"[*] Testing for company: {company.name} (ID: {company.id}), User: {user.email}")

        # 1. Test Invoice Settings
        settings = get_or_create_invoice_settings(db, company.id)
        assert settings.company_name == "TRUESUN ENERGY"
        assert settings.bank_name == "State Bank of India"
        assert settings.account_number == "44474952500"
        assert settings.ifsc_code == "SBIN0003268"
        print("[+] 1. Invoice settings pre-filled with TrueSun Energy details verified.")

        # 2. Test Next Invoice Number Generation
        next_num = generate_next_invoice_number(db, company.id)
        print(f"[+] 2. Next invoice number preview: {next_num}")
        assert next_num.startswith("INV-")

        # 3. Create Reference Invoice INV-021
        items_data = [
            InvoiceItemCreate(
                particulars="Adani 3.30KW Ongrid Solar System",
                description="Panels :- Adani 550 * 6 NOS\nMS2607202B3016\nMS2607202B3145\nMS2607202B3149\nMS2607202B3180\nMS2607202B3191\nMS2607202B3194\nInverter :- Polycab 3.6KW\nSN : 3K6050826-2625-397508716P",
                hsn_sac="8541",
                quantity=1.0,
                unit="SITE",
                unit_price=99632.69,
                gst_rate=5.0,
            ),
            InvoiceItemCreate(
                particulars="Adani 3.30KW Solar Structure And Installation",
                description="BOS Kit",
                hsn_sac="9987",
                quantity=1.0,
                unit="SITE",
                unit_price=42699.72,
                gst_rate=18.0,
            ),
        ]

        inv_in = InvoiceCreate(
            invoice_date=datetime(2026, 9, 9),
            bill_to_name="POWERSHINE ENERGY",
            bill_to_address="PLOT NO.22, SR NO.257/258/259/260-2, GOKUL INDUSTRIAL AREA,\nPIPLANA,RAJKOT.360030 (GUJARAT)",
            bill_to_contact="9099080480",
            bill_to_gstin="24AAXFP3293M1ZE",
            bill_to_pos="24-Gujarat",
            ship_to_name="PANDIT ASHOKBHAI BHIKHABHAI",
            ship_to_address="PLOT AREA SANGAVADA",
            ship_to_contact="9913402778",
            ship_to_pos="24-Gujarat",
            payment_terms="Immediate",
            delivery_terms="Immediate",
            terms_and_conditions="Looking forward for your business.",
            items=items_data,
        )

        inv = create_invoice(db, company.id, user.id, inv_in)
        db.refresh(inv)

        print(f"[+] 3. Created invoice: {inv.invoice_number}")
        print(f"       Subtotal: {inv.subtotal}")
        print(f"       Tax: {inv.tax_amount}")
        print(f"       Round Off: {inv.round_off}")
        print(f"       Total: {inv.total_amount}")
        print(f"       In Words: {inv.amount_in_words}")

        assert Decimal(str(round(inv.subtotal, 2))) == Decimal("142332.41")
        assert Decimal(str(round(inv.tax_amount, 2))) == Decimal("12667.58")
        assert Decimal(str(round(inv.round_off, 2))) == Decimal("0.01")
        assert Decimal(str(round(inv.total_amount, 2))) == Decimal("155000.00")
        assert "Lakh Fifty Five Thousand" in inv.amount_in_words

        # 4. Generate PDF
        pdf_bytes = generate_invoice_pdf(inv, "Original Copy")
        assert len(pdf_bytes) > 10000, "PDF should be valid binary data"
        print(f"[+] 4. PDF generated successfully ({len(pdf_bytes)} bytes)")

        # 5. Record Payments
        # Partial Payment ₹50,000
        p1 = record_invoice_payment(
            db,
            company.id,
            inv.id,
            user.id,
            InvoicePaymentCreate(
                payment_date=datetime(2026, 9, 10),
                amount=50000.00,
                payment_method="NEFT",
                transaction_reference="NEFT20260910123",
                notes="Initial advance received",
            ),
        )
        db.refresh(inv)
        assert inv.status == InvoiceStatus.PARTIALLY_PAID.value
        assert Decimal(str(round(inv.paid_amount, 2))) == Decimal("50000.00")
        assert Decimal(str(round(inv.outstanding_amount, 2))) == Decimal("105000.00")
        print("[+] 5a. Partial payment correctly marked invoice as PARTIALLY_PAID")

        # Full Payment balance ₹105,000
        p2 = record_invoice_payment(
            db,
            company.id,
            inv.id,
            user.id,
            InvoicePaymentCreate(
                payment_date=datetime(2026, 9, 15),
                amount=105000.00,
                payment_method="UPI",
                transaction_reference="UPI9988776655",
                notes="Final settlement",
            ),
        )
        db.refresh(inv)
        assert inv.status == InvoiceStatus.PAID.value
        assert Decimal(str(inv.paid_amount)) == Decimal("155000.00")
        assert Decimal(str(inv.outstanding_amount)) == Decimal("0.00")
        print("[+] 5b. Full payment balance correctly marked invoice as PAID with 0 outstanding")

        # 6. Dashboard metrics
        metrics = get_invoice_dashboard_metrics(db, company.id)
        assert metrics["total_invoices"] >= 1
        assert metrics["status_counts"]["paid"] >= 1
        print(f"[+] 6. Dashboard metrics validated: total={metrics['total_invoices']}, revenue={metrics['total_revenue']}")

        # 7. Local Backup Export
        backup_zip = export_invoices_backup(db, company.id)
        assert len(backup_zip) > 500, "ZIP backup should be non-empty"
        print(f"[+] 7. Local ZIP backup exported successfully ({len(backup_zip)} bytes)")

        # 8. Preview Backup
        preview = preview_invoices_backup(db, company.id, backup_zip)
        assert preview["is_valid"] is True
        assert preview["invoices_count"] >= 1
        assert preview["existing_conflicts"] >= 1
        print(f"[+] 8. Backup preview validated: found {preview['invoices_count']} invoices and {preview['existing_conflicts']} conflict(s)")

        # 9. Restore with skip_existing
        restore_result = restore_invoices_backup(db, company.id, backup_zip, strategy="skip_existing")
        print(f"[+] 9. Restore result: {restore_result}")

        print("\n=========================================")
        print("ALL INVOICE MODULE TESTS PASSED PERFECTLY!")
        print("=========================================\n")

    finally:
        db.close()

if __name__ == "__main__":
    test_invoices_full_lifecycle()
