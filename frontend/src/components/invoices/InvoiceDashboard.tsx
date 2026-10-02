import React, { useState, useEffect } from 'react';
import {
  FileText,
  IndianRupee,
  CheckCircle2,
  Clock,
  Plus,
  Download,
  Settings,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  Eye,
  Calendar
} from 'lucide-react';
import { api, triggerFileDownload } from '../../services/api';
import { InvoiceDashboardData, Invoice, InvoiceStatus } from '../../types';

interface InvoiceDashboardProps {
  onCreateInvoice: () => void;
  onOpenSettings: () => void;
  onOpenBackup: () => void;
  onViewInvoice: (id: number) => void;
  onViewAllInvoices: (statusFilter?: string) => void;
}

export const InvoiceDashboard: React.FC<InvoiceDashboardProps> = ({
  onCreateInvoice,
  onOpenSettings,
  onOpenBackup,
  onViewInvoice,
  onViewAllInvoices
}) => {
  const [data, setData] = useState<InvoiceDashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getInvoiceDashboard();
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case 'paid':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Paid</span>;
      case 'partially_paid':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">Partially Paid</span>;
      case 'issued':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">Issued</span>;
      case 'draft':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/20 text-slate-300 border border-slate-500/30">Draft</span>;
      case 'cancelled':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">Cancelled</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/20 text-slate-300">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
        <p className="text-xs text-slate-400">Loading invoice analytics & summaries...</p>
      </div>
    );
  }

  const counts = data?.status_counts || {};

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in">
      {/* Top Banner with Quick Actions */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#0d1711] via-[#122318] to-[#0d1711] border border-[#1e3423] shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <FileText className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-white tracking-tight">Invoice Operations & Billing Control</h2>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            TrueSun Energy official invoicing portal &bull; GST compliant with auto round-off and bank snapshot lock
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onCreateInvoice}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#106828] to-[#168032] hover:from-[#158032] hover:to-[#1e9a3d] text-white text-xs font-bold transition-all shadow-md shadow-[#106828]/30 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Invoice</span>
          </button>

          <button
            onClick={onOpenBackup}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#142318] hover:bg-[#1a2f20] border border-[#1e3423] text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Backup / Restore</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Settings</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* 4 Core Financial Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Invoices */}
        <div className="p-5 rounded-2xl bg-[#0e1712] border border-[#1e3423] shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Invoices</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-white font-mono">{data?.total_invoices || 0}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Across all billing periods</p>
          </div>
        </div>

        {/* Total Billed Revenue */}
        <div className="p-5 rounded-2xl bg-[#0e1712] border border-[#1e3423] shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Billed</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-white font-mono">
              ₹{(data?.total_revenue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Excluding cancelled invoices</p>
          </div>
        </div>

        {/* Total Collected */}
        <div className="p-5 rounded-2xl bg-[#0e1712] border border-[#1e3423] shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Total Received</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-emerald-400 font-mono">
              ₹{(data?.total_paid || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Settled via Bank / UPI</p>
          </div>
        </div>

        {/* Outstanding Balance */}
        <div className="p-5 rounded-2xl bg-[#0e1712] border border-[#1e3423] shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#FEC426]">Outstanding</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-[#FEC426]">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-[#FEC426] font-mono">
              ₹{(data?.total_outstanding || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Pending customer collection</p>
          </div>
        </div>
      </div>

      {/* Status Distribution Pills */}
      <div className="p-5 rounded-2xl bg-[#0e1712] border border-[#1e3423] shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">Status Breakdown</h3>
          <button
            onClick={() => onViewAllInvoices()}
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
          >
            <span>View All Invoices</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <button
            onClick={() => onViewAllInvoices('draft')}
            className="p-3 rounded-xl bg-[#0a120c] hover:bg-[#142318] border border-[#1e3423] text-left transition-colors cursor-pointer"
          >
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Drafts</p>
            <p className="text-lg font-bold text-slate-200 mt-1">{counts['draft'] || 0}</p>
          </button>

          <button
            onClick={() => onViewAllInvoices('issued')}
            className="p-3 rounded-xl bg-[#0a120c] hover:bg-[#142318] border border-[#1e3423] text-left transition-colors cursor-pointer"
          >
            <p className="text-[11px] font-semibold text-blue-400 uppercase">Issued</p>
            <p className="text-lg font-bold text-blue-400 mt-1">{counts['issued'] || 0}</p>
          </button>

          <button
            onClick={() => onViewAllInvoices('partially_paid')}
            className="p-3 rounded-xl bg-[#0a120c] hover:bg-[#142318] border border-[#1e3423] text-left transition-colors cursor-pointer"
          >
            <p className="text-[11px] font-semibold text-amber-400 uppercase">Partially Paid</p>
            <p className="text-lg font-bold text-amber-400 mt-1">{counts['partially_paid'] || 0}</p>
          </button>

          <button
            onClick={() => onViewAllInvoices('paid')}
            className="p-3 rounded-xl bg-[#0a120c] hover:bg-[#142318] border border-[#1e3423] text-left transition-colors cursor-pointer"
          >
            <p className="text-[11px] font-semibold text-emerald-400 uppercase">Fully Paid</p>
            <p className="text-lg font-bold text-emerald-400 mt-1">{counts['paid'] || 0}</p>
          </button>

          <button
            onClick={() => onViewAllInvoices('cancelled')}
            className="p-3 rounded-xl bg-[#0a120c] hover:bg-[#142318] border border-[#1e3423] text-left transition-colors cursor-pointer"
          >
            <p className="text-[11px] font-semibold text-red-400 uppercase">Cancelled</p>
            <p className="text-lg font-bold text-red-400 mt-1">{counts['cancelled'] || 0}</p>
          </button>
        </div>
      </div>

      {/* Recent Invoices Table */}
      <div className="p-6 rounded-2xl bg-[#0e1712] border border-[#1e3423] shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Recent Invoices</h3>
            <p className="text-xs text-slate-400">Latest billing activity and payment progress</p>
          </div>
          <button
            onClick={() => onViewAllInvoices()}
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
          >
            <span>Go to Invoice Register</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {data?.recent_invoices && data.recent_invoices.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-[#1e3423] bg-[#0a120c]">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#121e17] text-slate-400 border-b border-[#1e3423]">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Invoice No</th>
                  <th className="py-2.5 px-4 font-semibold">Customer (Bill To)</th>
                  <th className="py-2.5 px-4 font-semibold">Date</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Total Amount</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Outstanding</th>
                  <th className="py-2.5 px-4 font-semibold text-center">Status</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e3423]">
                {data.recent_invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-white">
                      <button
                        onClick={() => onViewInvoice(inv.id)}
                        className="hover:text-emerald-400 hover:underline cursor-pointer"
                      >
                        {inv.invoice_number}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-white">{inv.bill_to_name}</p>
                      <p className="text-[11px] text-slate-400">{inv.ship_to_name}</p>
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {new Date(inv.invoice_date).toLocaleDateString('en-GB')}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-white">
                      ₹{inv.total_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-[#FEC426]">
                      ₹{inv.outstanding_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {getStatusBadge(inv.status)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onViewInvoice(inv.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-slate-500">
            No invoices have been generated yet. Click "Create Invoice" to start!
          </div>
        )}
      </div>
    </div>
  );
};
