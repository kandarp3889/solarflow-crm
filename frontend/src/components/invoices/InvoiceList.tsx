import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  Download,
  IndianRupee,
  Ban,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight,
  FileText,
  User,
  ArrowUpDown
} from 'lucide-react';
import { api, triggerFileDownload } from '../../services/api';
import { Invoice, InvoiceStatus } from '../../types';
import { RecordPaymentModal } from './RecordPaymentModal';

interface InvoiceListProps {
  initialStatusFilter?: string;
  onCreateInvoice: () => void;
  onViewInvoice: (id: number) => void;
  onEditInvoice: (id: number) => void;
  onSelectLead?: (leadId: number) => void;
}

export const InvoiceList: React.FC<InvoiceListProps> = ({
  initialStatusFilter,
  onCreateInvoice,
  onViewInvoice,
  onEditInvoice,
  onSelectLead
}) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>(initialStatusFilter || '');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Payment modal state
  const [activePaymentInvoice, setActivePaymentInvoice] = useState<Invoice | null>(null);

  // Pagination
  const [page, setPage] = useState<number>(0);
  const limit = 25;

  useEffect(() => {
    loadInvoices();
  }, [search, statusFilter, startDate, endDate, page]);

  const loadInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getInvoices({
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        skip: page * limit,
        limit
      });
      if (Array.isArray(data)) {
        setInvoices(data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async (invoice: Invoice) => {
    try {
      const blob = await api.downloadInvoicePdf(invoice.id, 'Original Copy');
      const filename = `${invoice.invoice_number}_original_copy.pdf`;
      triggerFileDownload(blob, filename);
    } catch (err: any) {
      alert(`Download failed: ${err.message}`);
    }
  };

  const handleCancelInvoice = async (invoice: Invoice) => {
    const reason = window.prompt(`Enter cancellation reason for ${invoice.invoice_number}:`);
    if (reason === null) return;
    try {
      await api.cancelInvoice(invoice.id, reason || undefined);
      loadInvoices();
    } catch (err: any) {
      alert(`Cancellation failed: ${err.message}`);
    }
  };

  const getStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case 'paid':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Paid</span>;
      case 'partially_paid':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">Partially Paid</span>;
      case 'issued':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">Issued</span>;
      case 'draft':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/20 text-slate-300 border border-slate-500/30">Draft</span>;
      case 'cancelled':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">Cancelled</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/20 text-slate-300">{status}</span>;
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto animate-fade-in">
      {/* Top Header & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#0e1712] border border-[#1e3423] shadow-lg">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            <span>Tax Invoices Register</span>
          </h2>
          <p className="text-xs text-slate-400">Manage, preview, download, and track customer invoice settlements</p>
        </div>

        <button
          onClick={onCreateInvoice}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#106828] to-[#168032] hover:from-[#158032] hover:to-[#1e9a3d] text-white text-xs font-bold transition-all shadow-md shadow-[#106828]/30 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Invoice</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-[#0e1712] border border-[#1e3423] space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by invoice number, customer name, GSTIN..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#0a120c] border border-[#1e3423] text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Date range */}
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <div className="flex items-center gap-1.5 bg-[#0a120c] border border-[#1e3423] rounded-xl px-2.5 py-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(0);
                }}
                className="bg-transparent text-white text-xs focus:outline-none"
              />
            </div>
            <span>to</span>
            <div className="flex items-center gap-1.5 bg-[#0a120c] border border-[#1e3423] rounded-xl px-2.5 py-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(0);
                }}
                className="bg-transparent text-white text-xs focus:outline-none"
              />
            </div>
          </div>

          {/* Reset Filters */}
          {(search || statusFilter || startDate || endDate) && (
            <button
              onClick={() => {
                setSearch('');
                setStatusFilter('');
                setStartDate('');
                setEndDate('');
                setPage(0);
              }}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-white/5 transition-colors"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#1e3423]">
          <span className="text-[11px] font-semibold text-slate-500 uppercase mr-1">Status:</span>
          {[
            { id: '', label: 'All Invoices' },
            { id: 'issued', label: 'Issued' },
            { id: 'partially_paid', label: 'Partially Paid' },
            { id: 'paid', label: 'Paid' },
            { id: 'draft', label: 'Draft' },
            { id: 'cancelled', label: 'Cancelled' }
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => {
                setStatusFilter(st.id);
                setPage(0);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === st.id
                  ? 'bg-[#106828] text-white shadow-sm shadow-[#106828]/40'
                  : 'bg-[#0a120c] text-slate-400 hover:text-white border border-[#1e3423]'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Invoices Table */}
      <div className="rounded-2xl bg-[#0e1712] border border-[#1e3423] shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#121e17] text-slate-400 border-b border-[#1e3423]">
              <tr>
                <th className="py-3 px-4 font-semibold">Invoice No</th>
                <th className="py-3 px-3 font-semibold">Date</th>
                <th className="py-3 px-4 font-semibold">Customer (Bill To)</th>
                <th className="py-3 px-3 font-semibold">Linked Lead</th>
                <th className="py-3 px-3 font-semibold text-right">Taxable</th>
                <th className="py-3 px-3 font-semibold text-right">GST</th>
                <th className="py-3 px-3 font-semibold text-right">Total Amount</th>
                <th className="py-3 px-3 font-semibold text-right">Paid</th>
                <th className="py-3 px-3 font-semibold text-right">Outstanding</th>
                <th className="py-3 px-3 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e3423]">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-16 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto mb-2" />
                    Loading invoices...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-16 text-center text-slate-500">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                    No invoices match your selected filters.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-white/[0.02] transition-colors">
                    {/* Invoice Number */}
                    <td className="py-3 px-4 font-mono font-bold text-white whitespace-nowrap">
                      <button
                        onClick={() => onViewInvoice(inv.id)}
                        className="hover:text-emerald-400 hover:underline cursor-pointer"
                      >
                        {inv.invoice_number}
                      </button>
                    </td>

                    {/* Date */}
                    <td className="py-3 px-3 whitespace-nowrap text-slate-400">
                      {new Date(inv.invoice_date).toLocaleDateString('en-GB')}
                    </td>

                    {/* Customer */}
                    <td className="py-3 px-4 max-w-xs">
                      <p className="font-semibold text-white truncate">{inv.bill_to_name}</p>
                      <p className="text-[11px] text-slate-400 truncate">{inv.ship_to_name}</p>
                    </td>

                    {/* Linked Lead */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      {inv.lead_id ? (
                        <button
                          type="button"
                          onClick={() => onSelectLead && onSelectLead(inv.lead_id!)}
                          className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:underline"
                        >
                          <User className="w-3 h-3" />
                          <span>Lead #{inv.lead_id}</span>
                        </button>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>

                    {/* Taxable */}
                    <td className="py-3 px-3 text-right font-mono text-slate-300 whitespace-nowrap">
                      ₹{inv.subtotal?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    {/* GST */}
                    <td className="py-3 px-3 text-right font-mono text-emerald-400/90 whitespace-nowrap">
                      ₹{inv.tax_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    {/* Total Amount */}
                    <td className="py-3 px-3 text-right font-mono font-bold text-white whitespace-nowrap">
                      ₹{inv.total_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    {/* Paid Amount */}
                    <td className="py-3 px-3 text-right font-mono font-semibold text-emerald-400 whitespace-nowrap">
                      ₹{inv.paid_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    {/* Outstanding */}
                    <td className="py-3 px-3 text-right font-mono font-semibold text-[#FEC426] whitespace-nowrap">
                      ₹{inv.outstanding_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      {getStatusBadge(inv.status)}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        {/* View Preview */}
                        <button
                          onClick={() => onViewInvoice(inv.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                          title="View / Print Invoice"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Download PDF */}
                        <button
                          onClick={() => handleDownloadPdf(inv)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-white/5 transition-colors cursor-pointer"
                          title="Download PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>

                        {/* Record Payment */}
                        {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                          <button
                            onClick={() => setActivePaymentInvoice(inv)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-[#FEC426] hover:bg-amber-500/10 transition-colors cursor-pointer"
                            title="Record Payment"
                          >
                            <IndianRupee className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Edit */}
                        {inv.status !== 'cancelled' && (
                          <button
                            onClick={() => onEditInvoice(inv.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                            title="Edit Invoice"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Cancel */}
                        {inv.status !== 'cancelled' && (
                          <button
                            onClick={() => handleCancelInvoice(inv)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                            title="Cancel Invoice"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between p-3.5 bg-[#0a120c] border-t border-[#1e3423] text-xs text-slate-400">
          <span>Showing page {page + 1} ({invoices.length} invoices loaded)</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={invoices.length < limit}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Record Payment Modal */}
      {activePaymentInvoice && (
        <RecordPaymentModal
          invoice={activePaymentInvoice}
          isOpen={Boolean(activePaymentInvoice)}
          onClose={() => setActivePaymentInvoice(null)}
          onSuccess={() => loadInvoices()}
        />
      )}
    </div>
  );
};
