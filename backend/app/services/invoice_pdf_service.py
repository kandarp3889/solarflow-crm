import os
import io
from decimal import Decimal
from typing import Optional
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    KeepTogether,
    Image as RLImage,
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Attempt to register true-type fonts for crisp Indian font rendering
FONT_NAME = "Helvetica"
FONT_BOLD = "Helvetica-Bold"

try:
    if os.path.exists("C:/Windows/Fonts/arial.ttf") and os.path.exists("C:/Windows/Fonts/arialbd.ttf"):
        pdfmetrics.registerFont(TTFont("CustomArial", "C:/Windows/Fonts/arial.ttf"))
        pdfmetrics.registerFont(TTFont("CustomArialBold", "C:/Windows/Fonts/arialbd.ttf"))
        FONT_NAME = "CustomArial"
        FONT_BOLD = "CustomArialBold"
except Exception:
    pass


def format_inr(val: Optional[Decimal or float or int]) -> str:
    """Formats numeric values into Indian currency format (e.g. 1,55,000.00)."""
    if val is None:
        return "0.00"
    try:
        d = Decimal(str(val))
    except Exception:
        return str(val)

    s = f"{abs(d):.2f}"
    parts = s.split(".")
    integer_part = parts[0]
    decimal_part = parts[1]

    if len(integer_part) <= 3:
        formatted = integer_part
    else:
        last_three = integer_part[-3:]
        remaining = integer_part[:-3]
        groups = []
        while len(remaining) > 2:
            groups.insert(0, remaining[-2:])
            remaining = remaining[:-2]
        if remaining:
            groups.insert(0, remaining)
        formatted = ",".join(groups) + "," + last_three

    prefix = "-" if d < 0 else ""
    return f"₹ {prefix}{formatted}.{decimal_part}"


def generate_invoice_pdf(invoice, copy_type: str = "Original Copy") -> bytes:
    """
    Generates a structured, bordered PDF matching the TrueSun Energy reference layout
    (INV021 PANDIT ASHOKBHAI BHIKHABHAI.pdf).
    """
    buffer = io.BytesIO()
    
    # 8mm margins around page
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=8 * mm,
        rightMargin=8 * mm,
        topMargin=8 * mm,
        bottomMargin=8 * mm,
    )

    printable_width = 194 * mm # ~550 pt

    # Styles
    base_styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        "InvoiceTitle",
        parent=base_styles["Normal"],
        fontName=FONT_BOLD,
        fontSize=12,
        leading=14,
        alignment=1, # Center
        textColor=colors.black,
    )
    
    copy_style = ParagraphStyle(
        "CopyStyle",
        parent=base_styles["Normal"],
        fontName=FONT_NAME,
        fontSize=9,
        leading=11,
        alignment=2, # Right
        textColor=colors.black,
    )

    company_title_style = ParagraphStyle(
        "CompanyTitle",
        parent=base_styles["Normal"],
        fontName=FONT_BOLD,
        fontSize=11,
        leading=13,
        textColor=colors.black,
    )

    regular_style = ParagraphStyle(
        "RegularSmall",
        parent=base_styles["Normal"],
        fontName=FONT_NAME,
        fontSize=8,
        leading=10.5,
        textColor=colors.black,
    )

    bold_small_style = ParagraphStyle(
        "BoldSmall",
        parent=base_styles["Normal"],
        fontName=FONT_BOLD,
        fontSize=8,
        leading=10.5,
        textColor=colors.black,
    )

    table_header_style = ParagraphStyle(
        "TableHeader",
        parent=base_styles["Normal"],
        fontName=FONT_BOLD,
        fontSize=7.5,
        leading=9.5,
        alignment=1, # Center
        textColor=colors.black,
    )

    table_cell_style = ParagraphStyle(
        "TableCell",
        parent=base_styles["Normal"],
        fontName=FONT_NAME,
        fontSize=7.5,
        leading=9.5,
        textColor=colors.black,
    )

    table_cell_bold = ParagraphStyle(
        "TableCellBold",
        parent=base_styles["Normal"],
        fontName=FONT_BOLD,
        fontSize=7.5,
        leading=9.5,
        textColor=colors.black,
    )

    table_cell_right = ParagraphStyle(
        "TableCellRight",
        parent=base_styles["Normal"],
        fontName=FONT_NAME,
        fontSize=7.5,
        leading=9.5,
        alignment=2,
        textColor=colors.black,
    )

    table_cell_right_bold = ParagraphStyle(
        "TableCellRightBold",
        parent=base_styles["Normal"],
        fontName=FONT_BOLD,
        fontSize=7.5,
        leading=9.5,
        alignment=2,
        textColor=colors.black,
    )

    story = []

    # 1. Header Banner: TAX INVOICE & Copy Type
    header_data = [
        [
            "",
            Paragraph("<b>TAX INVOICE</b>", title_style),
            Paragraph(f"({copy_type})", copy_style)
        ]
    ]
    header_table = Table(
        header_data,
        colWidths=[40 * mm, 114 * mm, 40 * mm],
        rowHeights=[16]
    )
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 2 * mm))

    # 2. Company Details + Invoice Metadata Box
    inv_date = getattr(invoice, "invoice_date", None)
    inv_date_str = inv_date.strftime("%d-%m-%Y") if hasattr(inv_date, "strftime") else str(inv_date or "")
    
    comp_name = getattr(invoice, "company_name_snapshot", None) or getattr(invoice, "company_name", None) or "TRUESUN ENERGY"
    comp_addr = getattr(invoice, "company_address_snapshot", None) or getattr(invoice, "company_address", None) or "New Plot Area, Gam Vistar, Sultanpur"
    comp_phone = getattr(invoice, "company_contact_snapshot", None) or getattr(invoice, "company_phone", None) or "9974045095"
    comp_email = getattr(invoice, "company_email_snapshot", None) or getattr(invoice, "company_email", None) or "info.truesunenergy@gmail.com"
    comp_web = getattr(invoice, "company_website_snapshot", None) or getattr(invoice, "company_website", None) or "truesunenergy.in"
    comp_gstin = getattr(invoice, "company_gstin_snapshot", None) or getattr(invoice, "company_gstin", None) or "24EIVPG5500C1ZI"

    comp_lines = [
        f"<b>{comp_name}</b>",
        f"{comp_addr}",
        f"Contact : {comp_phone}",
        f"Email : {comp_email}",
        f"Website : {comp_web}",
        f"<b>GSTIN : {comp_gstin}</b>",
    ]
    company_cell = Paragraph("<br/>".join(comp_lines), regular_style)

    inv_meta_lines = [
        "<font size=8 color='#555555'>Invoice No.</font><br/>"
        f"<b><font size=9>{invoice.invoice_number}</font></b>",
        "<br/>",
        "<font size=8 color='#555555'>Date</font><br/>"
        f"<b><font size=9>{inv_date_str}</font></b>",
    ]
    meta_cell = Paragraph("".join(inv_meta_lines), regular_style)

    company_box_table = Table(
        [[company_cell, meta_cell]],
        colWidths=[134 * mm, 60 * mm],
    )
    company_box_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 1, colors.black),
        ('LINEBEFORE', (1, 0), (1, -1), 1, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(company_box_table)

    # 3. Bill To & Ship To Box
    b_phone = getattr(invoice, "bill_to_contact", None) or getattr(invoice, "bill_to_phone", None) or ""
    b_state = getattr(invoice, "bill_to_pos", None) or getattr(invoice, "bill_to_state", None) or "24-Gujarat"
    bill_to_content = [
        "<b>Bill To :</b>",
        f"<b>{invoice.bill_to_name or ''}</b>",
        f"{(invoice.bill_to_address or '').replace(chr(10), '<br/>')}",
        f"Contact: {b_phone} &nbsp;&nbsp;&nbsp;&nbsp; PoS: {b_state}"
        + (f" &nbsp;&nbsp;&nbsp;&nbsp; <b>GSTIN: {invoice.bill_to_gstin}</b>" if invoice.bill_to_gstin else ""),
    ]
    bill_to_cell = Paragraph("<br/>".join([c for c in bill_to_content if c]), regular_style)

    s_phone = getattr(invoice, "ship_to_contact", None) or getattr(invoice, "ship_to_phone", None) or ""
    s_state = getattr(invoice, "ship_to_pos", None) or getattr(invoice, "ship_to_state", None) or b_state
    ship_to_content = [
        "<b>Ship To</b>",
        f"<b>{invoice.ship_to_name or invoice.bill_to_name or ''}</b>",
        f"{(invoice.ship_to_address or invoice.bill_to_address or '').replace(chr(10), '<br/>')}",
        f"Contact: {s_phone} &nbsp;&nbsp;&nbsp;&nbsp; PoS: {s_state}",
    ]
    ship_to_cell = Paragraph("<br/>".join([c for c in ship_to_content if c]), regular_style)

    party_box_table = Table(
        [[bill_to_cell, ship_to_cell]],
        colWidths=[97 * mm, 97 * mm],
    )
    party_box_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 1, colors.black),
        ('LINEBEFORE', (1, 0), (1, -1), 1, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(party_box_table)

    # 4. Item Table
    # Columns: S.No., PARTICULARS, HSN/SAC, QTY, UNIT PRICE, GST, AMOUNT
    col_widths = [11 * mm, 80 * mm, 20 * mm, 18 * mm, 26 * mm, 14 * mm, 25 * mm]
    item_rows = [
        [
            Paragraph("S.No.", table_header_style),
            Paragraph("PARTICULARS", table_header_style),
            Paragraph("HSN/SAC", table_header_style),
            Paragraph("QTY", table_header_style),
            Paragraph("UNIT PRICE", table_header_style),
            Paragraph("GST", table_header_style),
            Paragraph("AMOUNT", table_header_style),
        ]
    ]

    total_qty = Decimal("0")
    for idx, item in enumerate(invoice.items, start=1):
        total_qty += Decimal(str(item.quantity or 0))
        
        # Particulars with multi-line specification
        item_title = getattr(item, "particulars", None) or getattr(item, "product_name", None) or ""
        part_lines = [f"<b>{item_title}</b>"]
        if item.description:
            formatted_desc = item.description.replace("\r\n", "\n").replace("\n", "<br/>")
            part_lines.append(f"<font size=7 color='#222222'>{formatted_desc}</font>")
        
        particulars_p = Paragraph("<br/>".join(part_lines), table_cell_style)
        
        qty_str = f"{int(item.quantity) if item.quantity == int(item.quantity) else item.quantity} {item.unit or 'NOS'}"
        
        t_amt = getattr(item, "taxable_amount", None) or getattr(item, "amount", None) or 0
        item_rows.append([
            Paragraph(str(idx), table_header_style),
            particulars_p,
            Paragraph(item.hsn_sac or "-", table_header_style),
            Paragraph(qty_str, table_header_style),
            Paragraph(format_inr(item.unit_price), table_cell_right),
            Paragraph(f"{item.gst_rate}%", table_header_style),
            Paragraph(format_inr(t_amt), table_cell_right_bold),
        ])

    # TOTAL row under items
    qty_total_display = str(int(total_qty) if total_qty == int(total_qty) else total_qty)
    subtot_amt = getattr(invoice, "subtotal", None) if getattr(invoice, "subtotal", None) is not None else getattr(invoice, "taxable_amount", 0)
    item_rows.append([
        Paragraph("<b>TOTAL</b>", table_header_style),
        Paragraph("", table_cell_style),
        Paragraph("", table_cell_style),
        Paragraph(f"<b>{qty_total_display}</b>", table_header_style),
        Paragraph("", table_cell_style),
        Paragraph("", table_cell_style),
        Paragraph(f"<b>{format_inr(subtot_amt)}</b>", table_cell_right_bold),
    ])

    items_table = Table(item_rows, colWidths=col_widths, repeatRows=1)
    items_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 1, colors.black),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.black),
        ('BACKGROUND', (0, 0), (-1, 0), colors.whitesmoke),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 3),
        ('RIGHTPADDING', (0, 0), (-1, -1), 3),
        ('BACKGROUND', (0, -1), (-1, -1), colors.whitesmoke),
    ]))
    story.append(items_table)

    # 5. Financial Summary Box (Delivery Terms & Subtotal / Tax / Round off)
    delivery_terms_val = getattr(invoice, "delivery_terms", None) or getattr(invoice, "payment_terms", None) or "Immediate / As agreed"
    delivery_terms_text = f"<b>Delivery Terms :</b> {delivery_terms_val}"
    terms_p = Paragraph(delivery_terms_text, regular_style)

    tax_amt = getattr(invoice, "tax_amount", None) if getattr(invoice, "tax_amount", None) is not None else getattr(invoice, "total_tax", 0)
    summary_rows = [
        [
            terms_p,
            Paragraph("Sub Total", regular_style),
            Paragraph(f"<b>{format_inr(subtot_amt)}</b>", table_cell_right_bold),
        ],
        [
            "",
            Paragraph("Tax Amount (+)", regular_style),
            Paragraph(f"<b>{format_inr(tax_amt)}</b>", table_cell_right_bold),
        ],
        [
            "",
            Paragraph(f"Round Off ({'+' if (invoice.round_off or 0) >= 0 else '-'})", regular_style),
            Paragraph(f"<b>{format_inr(abs(invoice.round_off or 0))}</b>", table_cell_right_bold),
        ],
    ]
    summary_table = Table(
        summary_rows,
        colWidths=[110 * mm, 45 * mm, 39 * mm],
    )
    summary_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 1, colors.black),
        ('INNERGRID', (1, 0), (-1, -1), 0.5, colors.lightgrey),
        ('LINEBEFORE', (1, 0), (1, -1), 1, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 2.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(summary_table)

    # 6. Amount in words + TOTAL AMOUNT row
    amount_words_p = Paragraph(
        f"<b>Amount in Words :</b><br/>"
        f"Amount (in words) : <b>{invoice.amount_in_words}</b>",
        regular_style,
    )
    total_amount_p = Paragraph(
        f"<font size=8 color='#333333'>TOTAL AMOUNT</font><br/>"
        f"<b><font size=11>{format_inr(invoice.total_amount)}</font></b>",
        table_cell_right_bold,
    )
    total_table = Table(
        [[amount_words_p, total_amount_p]],
        colWidths=[130 * mm, 64 * mm],
    )
    total_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 1, colors.black),
        ('LINEBEFORE', (1, 0), (1, -1), 1, colors.black),
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8F9FA')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(total_table)

    # 7. HSN/SAC Tax Summary Table
    is_inter_state = bool(getattr(invoice, "is_inter_state", False))
    hsn_summary = getattr(invoice, "hsn_summary", None) or []
    if not is_inter_state and hsn_summary:
        is_inter_state = any(float(h.get("igst_amount", 0) or 0) > 0 for h in hsn_summary)

    if not is_inter_state:
        # Columns: HSN/SAC, Taxable Amount, CGST Rate, CGST Amount, SGST Rate, SGST Amount, Total Tax Amount
        hsn_cols = [24 * mm, 32 * mm, 18 * mm, 30 * mm, 18 * mm, 30 * mm, 42 * mm]
        hsn_rows = [
            [
                Paragraph("HSN/SAC", table_header_style),
                Paragraph("Taxable Amount", table_header_style),
                Paragraph("CGST<br/>Rate", table_header_style),
                Paragraph("CGST<br/>Amount", table_header_style),
                Paragraph("SGST<br/>Rate", table_header_style),
                Paragraph("SGST<br/>Amount", table_header_style),
                Paragraph("Total Tax Amount", table_header_style),
            ]
        ]
        sum_taxable = Decimal("0")
        sum_cgst = Decimal("0")
        sum_sgst = Decimal("0")
        sum_total_tax = Decimal("0")

        for h in hsn_summary:
            t_amt = Decimal(str(h.get("taxable_amount", 0)))
            cg_amt = Decimal(str(h.get("cgst_amount", 0)))
            sg_amt = Decimal(str(h.get("sgst_amount", 0)))
            tot_tax = Decimal(str(h.get("total_tax", 0)))
            rate = Decimal(str(h.get("gst_rate", 0)))
            half_rate = rate / Decimal("2")

            sum_taxable += t_amt
            sum_cgst += cg_amt
            sum_sgst += sg_amt
            sum_total_tax += tot_tax

            hsn_rows.append([
                Paragraph(str(h.get("hsn_sac", "-")), table_header_style),
                Paragraph(format_inr(t_amt), table_cell_right),
                Paragraph(f"{half_rate}%", table_header_style),
                Paragraph(format_inr(cg_amt), table_cell_right),
                Paragraph(f"{half_rate}%", table_header_style),
                Paragraph(format_inr(sg_amt), table_cell_right),
                Paragraph(format_inr(tot_tax), table_cell_right),
            ])

        # Total row
        hsn_rows.append([
            Paragraph("<b>Total</b>", table_header_style),
            Paragraph(f"<b>{format_inr(sum_taxable)}</b>", table_cell_right_bold),
            Paragraph("", table_header_style),
            Paragraph(f"<b>{format_inr(sum_cgst)}</b>", table_cell_right_bold),
            Paragraph("", table_header_style),
            Paragraph(f"<b>{format_inr(sum_sgst)}</b>", table_cell_right_bold),
            Paragraph(f"<b>{format_inr(sum_total_tax)}</b>", table_cell_right_bold),
        ])
    else:
        # Inter-state: IGST
        hsn_cols = [34 * mm, 45 * mm, 25 * mm, 45 * mm, 45 * mm]
        hsn_rows = [
            [
                Paragraph("HSN/SAC", table_header_style),
                Paragraph("Taxable Amount", table_header_style),
                Paragraph("IGST Rate", table_header_style),
                Paragraph("IGST Amount", table_header_style),
                Paragraph("Total Tax Amount", table_header_style),
            ]
        ]
        sum_taxable = Decimal("0")
        sum_igst = Decimal("0")
        sum_total_tax = Decimal("0")

        for h in hsn_summary:
            t_amt = Decimal(str(h.get("taxable_amount", 0)))
            ig_amt = Decimal(str(h.get("igst_amount", 0)))
            tot_tax = Decimal(str(h.get("total_tax", 0)))
            rate = Decimal(str(h.get("gst_rate", 0)))

            sum_taxable += t_amt
            sum_igst += ig_amt
            sum_total_tax += tot_tax

            hsn_rows.append([
                Paragraph(str(h.get("hsn_sac", "-")), table_header_style),
                Paragraph(format_inr(t_amt), table_cell_right),
                Paragraph(f"{rate}%", table_header_style),
                Paragraph(format_inr(ig_amt), table_cell_right),
                Paragraph(format_inr(tot_tax), table_cell_right),
            ])

        hsn_rows.append([
            Paragraph("<b>Total</b>", table_header_style),
            Paragraph(f"<b>{format_inr(sum_taxable)}</b>", table_cell_right_bold),
            Paragraph("", table_header_style),
            Paragraph(f"<b>{format_inr(sum_igst)}</b>", table_cell_right_bold),
            Paragraph(f"<b>{format_inr(sum_total_tax)}</b>", table_cell_right_bold),
        ])

    hsn_table = Table(hsn_rows, colWidths=hsn_cols)
    hsn_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 1, colors.black),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.black),
        ('BACKGROUND', (0, 0), (-1, 0), colors.whitesmoke),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('LEFTPADDING', (0, 0), (-1, -1), 3),
        ('RIGHTPADDING', (0, 0), (-1, -1), 3),
        ('BACKGROUND', (0, -1), (-1, -1), colors.whitesmoke),
    ]))
    story.append(hsn_table)

    # 8. Terms, Bank Details & Signature Section
    terms_text = getattr(invoice, "terms_and_conditions", None) or "Looking forward for your business."
    b_name = getattr(invoice, "bank_name_snapshot", None) or getattr(invoice, "bank_name", None) or "State Bank of India"
    b_acc = getattr(invoice, "bank_account_snapshot", None) or getattr(invoice, "bank_account_number", None) or "44474952500"
    b_ifsc = getattr(invoice, "bank_ifsc_snapshot", None) or getattr(invoice, "bank_ifsc", None) or "SBIN0003268"

    bank_lines = [
        "<b>Terms / Declaration</b>",
        f"{terms_text}",
        "",
        "<b>Bank Details -</b>",
        f"Bank Name &nbsp;&nbsp;: {b_name}",
        f"Account No. &nbsp;: {b_acc}",
        f"Branch & IFSC : {b_ifsc}",
    ]
    bank_cell = Paragraph("<br/>".join(bank_lines), regular_style)

    sig_label = getattr(invoice, "signature_label_snapshot", None) or f"For, {comp_name}"
    signature_lines = [
        "<br/><br/><br/>",
        f"<b>{sig_label}</b>",
        "<br/>",
        "<font size=7 color='#666666'>Authorized Signatory</font>",
    ]
    sig_cell = Paragraph("".join(signature_lines), ParagraphStyle(
        "SigStyle",
        parent=base_styles["Normal"],
        fontName=FONT_NAME,
        fontSize=8,
        leading=11,
        alignment=1, # Center
        textColor=colors.black,
    ))

    footer_box = Table(
        [[bank_cell, sig_cell]],
        colWidths=[114 * mm, 80 * mm],
    )
    footer_box.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 1, colors.black),
        ('LINEBEFORE', (1, 0), (1, -1), 1, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(footer_box)

    # Build the document
    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
