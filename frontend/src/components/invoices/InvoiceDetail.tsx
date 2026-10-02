import React, { useState } from 'react';
import {
  ArrowLeft,
  Printer,
  Download,
  IndianRupee,
  Edit,
  Ban,
  CheckCircle2,
  Clock,
  Trash2,
  FileText,
  Copy,
  Building,
  Landmark,
  ShieldCheck
} from 'lucide-react';
import { Invoice, InvoiceStatus } from '../../types';
import { api, triggerFileDownload } from '../../services/api';
import { RecordPaymentModal } from './RecordPaymentModal';

interface InvoiceDetailProps {
  invoice: Invoice;
  onBack: () => void;
  onEdit: (invoiceId: number) => void;
  onRefresh: () => void;
}

export const InvoiceDetail: React.FC<InvoiceDetailProps> = ({
  invoice,
  onBack,
  onEdit,
  onRefresh
}) => {
  const [copyType, setCopyType] = useState<'Original Copy' | 'Duplicate Copy'>('Original Copy');
  const [downloadingPdf, setDownloadingPdf] = useState<boolean>(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [cancelNotes, setCancelNotes] = useState<string>('');
  const [showCancelPrompt, setShowCancelPrompt] = useState<boolean>(false);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async (type: 'Original Copy' | 'Duplicate Copy') => {
    setDownloadingPdf(true);
    try {
      const blob = await api.downloadInvoicePdf(invoice.id, type);
      const filename = `${invoice.invoice_number}_${type.replace(' ', '_').toLowerCase()}.pdf`;
      triggerFileDownload(blob, filename);
    } catch (err: any) {
      alert(`Failed to download PDF: ${err.message || 'Unknown error'}`);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleCancelInvoice = async () => {
    setIsCancelling(true);
    try {
      await api.cancelInvoice(invoice.id, cancelNotes || undefined);
      setShowCancelPrompt(false);
      onRefresh();
    } catch (err: any) {
      alert(`Failed to cancel invoice: ${err.message || 'Unknown error'}`);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleDeletePayment = async (paymentId: number) => {
    if (!window.confirm('Are you sure you want to delete this payment record? The invoice outstanding balance will be recalculated.')) {
      return;
    }
    try {
      await api.deleteInvoicePayment(invoice.id, paymentId);
      onRefresh();
    } catch (err: any) {
      alert(`Failed to delete payment: ${err.message}`);
    }
  };

  const getStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case 'paid':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Paid</span>;
      case 'partially_paid':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">Partially Paid</span>;
      case 'issued':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">Issued</span>;
      case 'draft':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-500/20 text-slate-300 border border-slate-500/30">Draft</span>;
      case 'cancelled':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30">Cancelled</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-500/20 text-slate-300">{status}</span>;
    }
  };

  const isInterState = invoice.hsn_summary?.some(h => (h.igst_amount || 0) > 0);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 animate-fade-in">
      {/* Top Action Bar (Hidden in Browser Print) */}
      <div className="print:hidden flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-[#0e1712] border border-[#1e3423] shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>All Invoices</span>
          </button>
          <div className="h-5 w-px bg-[#1e3423]" />
          <h2 className="text-base font-bold text-white font-mono">{invoice.invoice_number}</h2>
          {getStatusBadge(invoice.status)}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Copy Type Toggle */}
          <div className="inline-flex rounded-xl bg-[#0a120c] p-0.5 border border-[#1e3423] text-xs">
            <button
              onClick={() => setCopyType('Original Copy')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                copyType === 'Original Copy' ? 'bg-[#106828] text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Original Copy
            </button>
            <button
              onClick={() => setCopyType('Duplicate Copy')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                copyType === 'Duplicate Copy' ? 'bg-[#106828] text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Duplicate Copy
            </button>
          </div>

          {/* Record Payment Button */}
          {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
            <button
              onClick={() => setIsPaymentModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#FEC426] hover:bg-[#e0ab1e] text-black text-xs font-bold transition-all shadow-md shadow-[#FEC426]/20 cursor-pointer"
            >
              <IndianRupee className="w-3.5 h-3.5" />
              <span>Record Payment</span>
            </button>
          )}

          {/* Download PDF Dropdown/Button */}
          <button
            onClick={() => handleDownloadPdf(copyType)}
            disabled={downloadingPdf}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#142318] hover:bg-[#1a2f20] border border-[#1e3423] text-white text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>{downloadingPdf ? 'Generating PDF...' : `Download ${copyType.split(' ')[0]} PDF`}</span>
          </button>

          {/* Print (Browser Native) */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#142318] hover:bg-[#1a2f20] border border-[#1e3423] text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-300" />
            <span>Print Invoice</span>
          </button>

          {/* Edit */}
          {invoice.status !== 'cancelled' && (
            <button
              onClick={() => onEdit(invoice.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold transition-colors"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
          )}

          {/* Cancel */}
          {invoice.status !== 'cancelled' && (
            <button
              onClick={() => setShowCancelPrompt(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold border border-red-500/20 transition-colors"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>
          )}
        </div>
      </div>

      {/* Cancel Prompt Dialog */}
      {showCancelPrompt && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 space-y-3 animate-fade-in print:hidden">
          <p className="text-xs font-bold text-red-400">Are you sure you want to cancel Invoice {invoice.invoice_number}?</p>
          <input
            type="text"
            placeholder="Cancellation reason (optional)..."
            value={cancelNotes}
            onChange={(e) => setCancelNotes(e.target.value)}
            className="w-full max-w-md px-3 py-2 rounded-xl bg-[#0a120c] border border-red-500/40 text-white text-xs"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={handleCancelInvoice}
              disabled={isCancelling}
              className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
            >
              {isCancelling ? 'Cancelling...' : 'Yes, Cancel Invoice'}
            </button>
            <button
              onClick={() => setShowCancelPrompt(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Nevermind
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PRINTABLE INVOICE SHEET (MATCHING REFERENCE INV021 LAYOUT EXACTLY) */}
      {/* ========================================================================= */}
      <div
        id="invoice-printable-sheet"
        className="bg-white text-black p-8 rounded-xl shadow-2xl border border-slate-300 font-sans text-[11px] leading-tight print:p-0 print:border-none print:shadow-none"
        style={{ minHeight: '1050px' }}
      >
        {/* Top Banner: TAX INVOICE & Copy Type */}
        <div className="flex items-center justify-between pb-2 mb-2">
          <div className="w-1/3"></div>
          <div className="w-1/3 text-center">
            <h1 className="text-base font-extrabold tracking-wider uppercase text-black">TAX INVOICE</h1>
          </div>
          <div className="w-1/3 text-right">
            <span className="text-xs text-slate-700 font-medium">({copyType})</span>
          </div>
        </div>

        {/* Box 1: Company Details & Invoice Info (Bordered Box) */}
        <div className="border border-black flex divide-x divide-black mb-0">
          {/* Left: Company Profile */}
          <div className="w-7/12 p-3 space-y-0.5">
            <h2 className="text-sm font-extrabold uppercase text-black">
              {invoice.company_name_snapshot || 'TRUESUN ENERGY'}
            </h2>
            <p className="text-slate-800">{invoice.company_address_snapshot || 'New Plot Area, Gam Vistar, Sultanpur'}</p>
            <p className="text-slate-800">Contact : {invoice.company_contact_snapshot || '9974045095'}</p>
            <p className="text-slate-800">Email : {invoice.company_email_snapshot || 'info.truesunenergy@gmail.com'}</p>
            <p className="text-slate-800">Website : {invoice.company_website_snapshot || 'truesunenergy.in'}</p>
            <p className="font-bold text-black mt-1">
              GSTIN : {invoice.company_gstin_snapshot || '24EIVPG5500C1ZI'}
            </p>
          </div>

          {/* Right: Invoice No & Date */}
          <div className="w-5/12 p-3 flex flex-col justify-between">
            <div>
              <p className="text-[10px] text-slate-600 uppercase font-semibold">Invoice No.</p>
              <p className="text-sm font-extrabold text-black font-mono">{invoice.invoice_number}</p>
            </div>
            <div className="mt-3">
              <p className="text-[10px] text-slate-600 uppercase font-semibold">Date</p>
              <p className="text-xs font-bold text-black">
                {new Date(invoice.invoice_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </p>
            </div>
          </div>
        </div>

        {/* Box 2: Bill To & Ship To (Bordered Box, touching above) */}
        <div className="border-x border-b border-black flex divide-x divide-black mb-0">
          {/* Bill To */}
          <div className="w-1/2 p-3 space-y-1">
            <p className="font-bold text-black text-xs">Bill To :</p>
            <p className="font-extrabold text-black text-xs uppercase">{invoice.bill_to_name}</p>
            <p className="text-slate-800 whitespace-pre-line text-[10px] leading-normal">{invoice.bill_to_address}</p>
            <div className="pt-1 text-[10px] text-slate-800 space-y-0.5">
              <p>
                <span className="font-semibold">Contact:</span> {invoice.bill_to_contact || '-'} &nbsp;&nbsp;&nbsp;&nbsp;
                <span className="font-semibold">PoS:</span> {invoice.bill_to_pos || '24-Gujarat'}
              </p>
              {invoice.bill_to_gstin && (
                <p className="font-bold text-black">
                  <span>GSTIN:</span> {invoice.bill_to_gstin}
                </p>
              )}
            </div>
          </div>

          {/* Ship To */}
          <div className="w-1/2 p-3 space-y-1">
            <p className="font-bold text-black text-xs">Ship To</p>
            <p className="font-extrabold text-black text-xs uppercase">{invoice.ship_to_name || invoice.bill_to_name}</p>
            <p className="text-slate-800 whitespace-pre-line text-[10px] leading-normal">
              {invoice.ship_to_address || invoice.bill_to_address}
            </p>
            <div className="pt-1 text-[10px] text-slate-800">
              <p>
                <span className="font-semibold">Contact:</span> {invoice.ship_to_contact || invoice.bill_to_contact || '-'} &nbsp;&nbsp;&nbsp;&nbsp;
                <span className="font-semibold">PoS:</span> {invoice.ship_to_pos || invoice.bill_to_pos || '24-Gujarat'}
              </p>
            </div>
          </div>
        </div>

        {/* Box 3: Items Table */}
        <div className="border-x border-b border-black overflow-hidden mb-0">
          <table className="w-full text-[10px] border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-black text-black font-bold uppercase">
                <th className="py-2 px-2 text-center border-r border-black w-10">S.No.</th>
                <th className="py-2 px-3 text-left border-r border-black">PARTICULARS</th>
                <th className="py-2 px-2 text-center border-r border-black w-16">HSN/SAC</th>
                <th className="py-2 px-2 text-center border-r border-black w-16">QTY</th>
                <th className="py-2 px-2 text-right border-r border-black w-24">UNIT PRICE</th>
                <th className="py-2 px-2 text-center border-r border-black w-12">GST</th>
                <th className="py-2 px-3 text-right w-24">AMOUNT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black">
              {invoice.items?.map((item, idx) => (
                <tr key={idx} className="align-top">
                  <td className="py-2 px-2 text-center border-r border-black font-bold">{idx + 1}</td>
                  <td className="py-2 px-3 border-r border-black space-y-1">
                    <p className="font-extrabold text-black text-[11px]">{item.particulars || item.product_name}</p>
                    {item.description && (
                      <p className="text-[9.5px] text-slate-800 whitespace-pre-line leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </td>
                  <td className="py-2 px-2 text-center border-r border-black font-medium">{item.hsn_sac || '-'}</td>
                  <td className="py-2 px-2 text-center border-r border-black font-medium">
                    {item.quantity} {item.unit || 'NOS'}
                  </td>
                  <td className="py-2 px-2 text-right border-r border-black font-medium">
                    <div>
                      ₹{item.unit_price?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      {item.is_tax_inclusive && (
                        <span className="block text-[8.5px] text-slate-600 font-normal">(Tax Incl.)</span>
                      )}
                      {Boolean(item.discount_amount && item.discount_amount > 0) && (
                        <span className="block text-[8.5px] text-amber-700 font-medium">
                          Disc: -₹{item.discount_amount?.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-2 text-center border-r border-black font-medium">{item.gst_rate}%</td>
                  <td className="py-2 px-3 text-right font-bold text-black">
                    ₹{item.taxable_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}

              {/* TOTAL ROW UNDER ITEMS */}
              <tr className="bg-slate-100 border-t border-black font-bold text-[10.5px]">
                <td className="py-1.5 px-2 text-center border-r border-black">TOTAL</td>
                <td className="py-1.5 px-3 border-r border-black"></td>
                <td className="py-1.5 px-2 text-center border-r border-black"></td>
                <td className="py-1.5 px-2 text-center border-r border-black">
                  {invoice.items?.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0)}
                </td>
                <td className="py-1.5 px-2 border-r border-black"></td>
                <td className="py-1.5 px-2 text-center border-r border-black"></td>
                <td className="py-1.5 px-3 text-right font-extrabold">
                  ₹{invoice.subtotal?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Box 4: Financial Summary (Delivery Terms on Left, Sub Total / Tax / Round off on Right) */}
        <div className="border-x border-b border-black flex divide-x divide-black mb-0">
          <div className="w-7/12 p-3 text-slate-800">
            <p><span className="font-bold text-black">Delivery Terms :</span> {invoice.delivery_terms || invoice.payment_terms || 'Immediate / As agreed'}</p>
          </div>
          <div className="w-5/12 p-0 divide-y divide-slate-300">
            <div className="flex justify-between py-1.5 px-3">
              <span className="font-medium text-slate-700">Sub Total</span>
              <span className="font-bold text-black">₹{invoice.subtotal?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between py-1.5 px-3">
              <span className="font-medium text-slate-700">Tax Amount (+)</span>
              <span className="font-bold text-black">₹{invoice.tax_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between py-1.5 px-3">
              <span className="font-medium text-slate-700">Round Off ({invoice.round_off >= 0 ? '+' : '-'})</span>
              <span className="font-bold text-black">₹{Math.abs(invoice.round_off || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Box 5: Amount in Words & TOTAL AMOUNT */}
        <div className="border-x border-b border-black flex divide-x divide-black bg-slate-50 mb-0">
          <div className="w-7/12 p-3">
            <p className="font-bold text-black text-[10px]">Amount in Words :</p>
            <p className="font-extrabold text-black text-[11px] mt-0.5">
              Amount (in words) : {invoice.amount_in_words}
            </p>
          </div>
          <div className="w-5/12 p-3 flex items-center justify-between">
            <span className="text-xs font-bold text-black uppercase">TOTAL AMOUNT</span>
            <span className="text-sm font-extrabold text-black font-mono">
              ₹{invoice.total_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Box 6: HSN/SAC Tax Summary Table */}
        <div className="border-x border-b border-black overflow-hidden mb-0">
          <table className="w-full text-[10px] border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-black text-black font-bold">
                <th className="py-1.5 px-2 text-center border-r border-black" rowSpan={isInterState ? 1 : 2}>HSN/SAC</th>
                <th className="py-1.5 px-3 text-right border-r border-black" rowSpan={isInterState ? 1 : 2}>Taxable Amount</th>
                {!isInterState ? (
                  <>
                    <th className="py-1 px-2 text-center border-r border-black" colSpan={2}>CGST</th>
                    <th className="py-1 px-2 text-center border-r border-black" colSpan={2}>SGST</th>
                  </>
                ) : (
                  <>
                    <th className="py-1.5 px-2 text-center border-r border-black">IGST Rate</th>
                    <th className="py-1.5 px-3 text-right border-r border-black">IGST Amount</th>
                  </>
                )}
                <th className="py-1.5 px-3 text-right" rowSpan={isInterState ? 1 : 2}>Total Tax Amount</th>
              </tr>
              {!isInterState && (
                <tr className="bg-slate-100 border-b border-black text-black font-bold text-[9px]">
                  <th className="py-1 px-2 text-center border-r border-black">Rate</th>
                  <th className="py-1 px-3 text-right border-r border-black">Amount</th>
                  <th className="py-1 px-2 text-center border-r border-black">Rate</th>
                  <th className="py-1 px-3 text-right border-r border-black">Amount</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-black">
              {invoice.hsn_summary?.map((h, idx) => (
                <tr key={idx}>
                  <td className="py-1.5 px-2 text-center border-r border-black font-medium">{h.hsn_sac}</td>
                  <td className="py-1.5 px-3 text-right border-r border-black font-medium">
                    ₹{h.taxable_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  {!isInterState ? (
                    <>
                      <td className="py-1.5 px-2 text-center border-r border-black">{(h.gst_rate / 2)}%</td>
                      <td className="py-1.5 px-3 text-right border-r border-black">
                        ₹{h.cgst_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-1.5 px-2 text-center border-r border-black">{(h.gst_rate / 2)}%</td>
                      <td className="py-1.5 px-3 text-right border-r border-black">
                        ₹{h.sgst_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="py-1.5 px-2 text-center border-r border-black">{h.gst_rate}%</td>
                      <td className="py-1.5 px-3 text-right border-r border-black">
                        ₹{h.igst_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </>
                  )}
                  <td className="py-1.5 px-3 text-right font-medium">
                    ₹{h.total_tax?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}

              {/* Total HSN row */}
              <tr className="bg-slate-100 border-t border-black font-bold">
                <td className="py-1.5 px-2 text-center border-r border-black">Total</td>
                <td className="py-1.5 px-3 text-right border-r border-black">
                  ₹{invoice.subtotal?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                {!isInterState ? (
                  <>
                    <td className="py-1.5 px-2 border-r border-black"></td>
                    <td className="py-1.5 px-3 text-right border-r border-black">
                      ₹{(invoice.tax_amount / 2).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-1.5 px-2 border-r border-black"></td>
                    <td className="py-1.5 px-3 text-right border-r border-black">
                      ₹{(invoice.tax_amount / 2).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </>
                ) : (
                  <>
                    <td className="py-1.5 px-2 border-r border-black"></td>
                    <td className="py-1.5 px-3 text-right border-r border-black">
                      ₹{invoice.tax_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </>
                )}
                <td className="py-1.5 px-3 text-right font-extrabold">
                  ₹{invoice.tax_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Box 7: Terms, Declaration, Bank Details & Signature Box */}
        <div className="border-x border-b border-black flex divide-x divide-black mb-0">
          {/* Left: Terms and Bank details */}
          <div className="w-7/12 p-3 space-y-2">
            <div>
              <p className="font-bold text-black text-[10.5px]">Terms / Declaration</p>
              <p className="text-slate-800 text-[10px]">
                {invoice.terms_and_conditions || 'Looking forward for your business.'}
              </p>
            </div>

            <div className="pt-2 text-[10px] space-y-0.5">
              <p className="font-bold text-black">Bank Details -</p>
              <p className="text-slate-800">Bank Name &nbsp;&nbsp;: {invoice.bank_name_snapshot || 'State Bank of India'}</p>
              <p className="text-slate-800 font-mono">Account No. &nbsp;: {invoice.bank_account_snapshot || '44474952500'}</p>
              <p className="text-slate-800 font-mono">Branch & IFSC : {invoice.bank_ifsc_snapshot || 'SBIN0003268'}</p>
            </div>
          </div>

          {/* Right: Signature Box */}
          <div className="w-5/12 p-3 flex flex-col justify-end text-center">
            <div className="mt-14 pt-2 border-t border-slate-300">
              <p className="font-extrabold text-black text-[11px]">
                {invoice.signature_label_snapshot || `For, ${invoice.company_name_snapshot || 'TRUESUN ENERGY'}`}
              </p>
              <p className="text-[9px] text-slate-600 mt-0.5">Authorized Signatory</p>
            </div>
          </div>
        </div>

        {/* Sub-footer credits */}
        <div className="text-right text-[8px] text-slate-400 mt-2">
          Powered By TrueSun Energy Invoice Portal
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RECORDED PAYMENTS AUDIT SECTION (Below Invoice) */}
      {/* ========================================================================= */}
      <div className="print:hidden p-6 rounded-2xl bg-[#0e1712] border border-[#1e3423] shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <IndianRupee className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Payment Receipts & Settlement History</h3>
              <p className="text-xs text-slate-400">
                Total Paid: <span className="text-emerald-400 font-bold">₹{invoice.paid_amount?.toLocaleString('en-IN')}</span> &bull; 
                Balance: <span className="text-[#FEC426] font-bold">₹{invoice.outstanding_amount?.toLocaleString('en-IN')}</span>
              </p>
            </div>
          </div>

          {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
            <button
              onClick={() => setIsPaymentModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#106828] hover:bg-[#158032] text-white text-xs font-bold transition-all shadow-md shadow-[#106828]/20 cursor-pointer"
            >
              <IndianRupee className="w-3.5 h-3.5" />
              <span>Record Payment</span>
            </button>
          )}
        </div>

        {invoice.payments && invoice.payments.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-[#1e3423] bg-[#0a120c]">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#121e17] text-slate-400 border-b border-[#1e3423]">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Payment Date</th>
                  <th className="py-2.5 px-4 font-semibold">Amount Received</th>
                  <th className="py-2.5 px-4 font-semibold">Payment Method</th>
                  <th className="py-2.5 px-4 font-semibold">Reference / UTR</th>
                  <th className="py-2.5 px-4 font-semibold">Notes</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e3423]">
                {invoice.payments.map((p) => (
                  <tr key={p.id} className="hover:bg-white/[0.02]">
                    <td className="py-2.5 px-4 text-white font-medium">
                      {new Date(p.payment_date).toLocaleDateString('en-GB')}
                    </td>
                    <td className="py-2.5 px-4 text-emerald-400 font-bold font-mono">
                      ₹{p.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-4">{p.payment_method}</td>
                    <td className="py-2.5 px-4 font-mono text-slate-400">{p.transaction_reference || '-'}</td>
                    <td className="py-2.5 px-4 text-slate-400 max-w-xs truncate">{p.notes || '-'}</td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        onClick={() => handleDeletePayment(p.id)}
                        className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Delete Payment Record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-slate-500">
            No payments have been recorded for this invoice yet.
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {isPaymentModalOpen && (
        <RecordPaymentModal
          invoice={invoice}
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          onSuccess={() => onRefresh()}
        />
      )}
    </div>
  );
};
