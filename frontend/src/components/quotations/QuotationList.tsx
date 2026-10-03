import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Printer,
  Mail,
  MessageSquare,
  Copy,
  Trash2,
  CheckCircle,
  Sun,
  ShieldCheck,
  TrendingUp,
  Percent,
  Layers,
  X
} from 'lucide-react';
import { Quotation } from '../../types';
import { api } from '../../services/api';
import { formatISTDate } from '../../utils/date';
import { CreateQuotationModal } from './CreateQuotationModal';

interface QuotationListProps {
  onSelectLead: (id: number) => void;
  onOpenQuickAction: (action: 'lead' | 'followup' | 'survey' | 'quotation') => void;
  onNavigateToSystems?: () => void;
}

export const QuotationList: React.FC<QuotationListProps> = ({
  onSelectLead,
  onOpenQuickAction,
  onNavigateToSystems
}) => {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeQuote, setActiveQuote] = useState<Quotation | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isCreateQuoteModalOpen, setIsCreateQuoteModalOpen] = useState(false);

  const fetchQuotes = async () => {
    setLoading(true);
    try {
      const data = await api.getQuotations();
      setQuotations(data);
    } catch (e) {
      console.error('Error fetching quotations:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();

    const handleDataUpdate = () => {
      fetchQuotes();
    };
    window.addEventListener('crm-data-updated', handleDataUpdate);
    return () => {
      window.removeEventListener('crm-data-updated', handleDataUpdate);
    };
  }, []);

  const handlePrintProposal = (q: Quotation) => {
    setActiveQuote(q);
    setIsPrintModalOpen(true);
  };

  const handleSendDispatch = async (id: number, channel: 'email' | 'whatsapp') => {
    try {
      await api.sendQuotation(id, channel);
      fetchQuotes();
      window.dispatchEvent(new CustomEvent('crm-data-updated'));
      alert(`Quotation proposal dispatched via ${channel.toUpperCase()}!`);
    } catch (e: any) {
      alert(e.message || 'Dispatch failed');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this quotation?')) return;
    try {
      await api.deleteQuotation(id);
      setQuotations(quotations.filter(q => q.id !== id));
      window.dispatchEvent(new CustomEvent('crm-data-updated'));
    } catch (e: any) {
      alert(e.message || 'Delete failed');
    }
  };

  const statusBadges: Record<string, string> = {
    draft: 'bg-slate-700/30 text-slate-300 border-slate-700',
    sent: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    viewed: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    accepted: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 font-bold',
    rejected: 'bg-red-500/15 text-red-400 border-red-500/30',
    expired: 'bg-slate-800 text-slate-500 border-slate-700'
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-slate-900 border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white font-display flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <span>Solar Quotation Engine & Proposals</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Automated pricing formula with Tier-1 solar panels, inverters, GST, and PM Surya Ghar central subsidies.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          {onNavigateToSystems && (
            <button
              onClick={onNavigateToSystems}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
              title="Manage configured solar packages & component pricing"
            >
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Add / Manage Systems</span>
            </button>
          )}

          <button
            onClick={() => setIsCreateQuoteModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Solar Quotation</span>
          </button>
        </div>
      </div>

      {/* Quotations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="h-64 rounded-2xl bg-slate-800/40 animate-pulse" />
          ))
        ) : quotations.length === 0 ? (
          <div className="col-span-3 p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-500 text-xs">
            No quotations found. Click "Create Solar Quotation" to generate one.
          </div>
        ) : (
          quotations.map((q) => {
            const statusClass = statusBadges[q.status] || 'bg-slate-800 text-slate-300';

            return (
              <div
                key={q.id}
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 shadow-sm transition-all flex flex-col justify-between space-y-4"
              >
                {/* Quotation Header */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-amber-400">{q.quotation_number}</span>
                      <button
                        onClick={() => onSelectLead(q.lead_id)}
                        className="text-sm font-bold text-white hover:text-amber-400 text-left block truncate"
                      >
                        {q.lead_name}
                      </button>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${statusClass}`}>
                        {q.status}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">{formatISTDate(q.created_at)}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
                      <Sun className="w-3.5 h-3.5 text-amber-400" />
                      <span className="font-semibold text-slate-200">{q.system_size_kw} kW System</span>
                      {q.system_name && (
                        <>
                          <span>•</span>
                          <span className="text-amber-400 font-medium truncate max-w-[150px]" title={q.system_name}>{q.system_name}</span>
                        </>
                      )}
                      <span>•</span>
                      <span className="truncate">{q.solar_panel_name || q.panel_brand}</span>
                    </div>
                    {q.structure_name && (
                      <p className="text-[10px] text-slate-400 truncate">
                        Structure: <span className="text-slate-300">{q.structure_name}</span> {q.inverter_name ? `• ${q.inverter_name}` : ''}
                      </p>
                    )}
                  </div>
                </div>

                {/* Financial Calculation Breakdown Card */}
                <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Base System Hardware:</span>
                    <span className="text-slate-200 font-semibold">₹{q.system_price.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-emerald-400 font-semibold">
                    <span>Central Subsidy Applied:</span>
                    <span>- ₹{q.subsidy_amount.toLocaleString()}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-700 flex justify-between items-center">
                    <span className="font-bold text-white">Final Customer Price:</span>
                    <span className="text-base font-bold text-emerald-400 font-display">
                      ₹{q.final_price.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Solar ROI Snapshot */}
                <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-950/40 p-2.5 rounded-xl border border-slate-800 text-slate-400">
                  <div>
                    <span>Monthly Savings:</span>
                    <p className="font-bold text-emerald-400">₹{q.monthly_savings?.toLocaleString()}/mo</p>
                  </div>
                  <div>
                    <span>Estimated Payback:</span>
                    <p className="font-bold text-amber-400">{q.payback_years || '3.8'} Years</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handlePrintProposal(q)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                  >
                    <Printer className="w-3.5 h-3.5 text-amber-400" />
                    <span>Print PDF</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleSendDispatch(q.id, 'whatsapp')}
                      title="Send via WhatsApp"
                      className="p-2 rounded-xl bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleSendDispatch(q.id, 'email')}
                      title="Send via Email"
                      className="p-2 rounded-xl bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30"
                    >
                      <Mail className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(q.id)}
                      title="Delete Quotation"
                      className="p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Professional Printable Quotation Proposal Modal */}
      {isPrintModalOpen && activeQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-3xl bg-white text-slate-900 rounded-3xl shadow-2xl p-8 space-y-6 my-8 print:p-0 print:shadow-none print:w-full print:max-w-full">
            {/* Modal Print Top Bar */}
            <div className="flex items-center justify-between border-b pb-4 no-print">
              <span className="text-xs font-bold text-slate-500">Official Solar Quotation Proposal</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-amber-500 text-slate-950 rounded-xl hover:bg-amber-400 shadow"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Document</span>
                </button>
                <button
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Document Header */}
            <div className="flex items-start justify-between border-b pb-6">
              <div className="flex items-start gap-4">
                <img
                  src="/truesun-logo.png"
                  alt="True Sun Energy"
                  className="h-14 w-auto object-contain mt-0.5"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <div>
                  <h1 className="text-2xl font-black text-[#106828] tracking-tight">
                    True Sun Energy
                  </h1>
                  <p className="text-xs font-semibold text-slate-700 mt-0.5">
                    Complete Solar Solution & Service • MNRE & GUVNL Empanelled Channel Partner
                  </p>
                  <p className="text-[11px] text-slate-500">
                    1st Floor Office No. 13, Prime Complex, Bypass Chokdi, Mangrol, Gujarat 362225
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono">
                    GSTIN: 24AAACT8921R1Z8 • Phone: +91 99740 45095 • info.truesunenergy@gmail.com
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs uppercase font-bold text-slate-400 block">Proposal No.</span>
                <span className="text-lg font-bold text-[#106828] font-mono">{activeQuote.quotation_number}</span>
                <span className="text-xs text-slate-500 block mt-1">
                  Date: {formatISTDate(activeQuote.created_at)}
                </span>
                <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#FEC426]/20 text-amber-800 border border-[#FEC426]/40">
                  PM Surya Ghar Scheme
                </span>
              </div>
            </div>

            {/* Customer Details */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl border text-xs">
              <div>
                <span className="font-bold text-slate-500 uppercase text-[10px] block">Customer Details:</span>
                <p className="text-sm font-bold text-slate-900 mt-1">{activeQuote.lead_name}</p>
                <p className="text-slate-600">{activeQuote.lead_address || 'Address on file'}</p>
                <p className="text-slate-600">Phone: {activeQuote.lead_phone}</p>
              </div>
              <div className="text-right">
                <span className="font-bold text-slate-500 uppercase text-[10px] block">System Capacity:</span>
                <p className="text-xl font-black text-[#106828] mt-1">{activeQuote.system_size_kw} kW On-Grid</p>
                {activeQuote.system_name && (
                  <p className="text-xs font-semibold text-slate-800">{activeQuote.system_name}</p>
                )}
                <p className="text-slate-600">Structure: {activeQuote.structure_name || activeQuote.structure_type}</p>
              </div>
            </div>

            {/* Hardware Bill of Materials */}
            <div>
              <h3 className="text-xs font-bold uppercase text-slate-600 tracking-wider mb-2">
                Technical Bill of Materials (BOM)
              </h3>
              <table className="w-full text-xs text-left border rounded-xl overflow-hidden">
                <thead className="bg-slate-100 border-b text-slate-700">
                  <tr>
                    <th className="p-2.5">Component</th>
                    <th className="p-2.5">Specification</th>
                    <th className="p-2.5 text-center">Quantity</th>
                    <th className="p-2.5 text-right">Warranty</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-slate-800">
                  <tr>
                    <td className="p-2.5 font-bold">Solar PV Modules</td>
                    <td className="p-2.5">{activeQuote.solar_panel_name || `${activeQuote.panel_brand} (${activeQuote.panel_wattage}W Mono PERC DCR)`}</td>
                    <td className="p-2.5 text-center">{activeQuote.panel_quantity} Units</td>
                    <td className="p-2.5 text-right font-semibold text-emerald-700">25 Years</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold">Grid Inverter</td>
                    <td className="p-2.5">{activeQuote.inverter_name || `${activeQuote.inverter_brand} (${activeQuote.inverter_capacity})`}</td>
                    <td className="p-2.5 text-center">1 Unit</td>
                    <td className="p-2.5 text-right font-semibold text-emerald-700">10 Years</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold">Mounting Structure</td>
                    <td className="p-2.5">{activeQuote.structure_name || activeQuote.structure_type}</td>
                    <td className="p-2.5 text-center">Complete Set</td>
                    <td className="p-2.5 text-right font-semibold text-emerald-700">10-15 Years</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold">Balance of System (BOS)</td>
                    <td className="p-2.5">{activeQuote.bos_name || "ACDB, DCDB, Dual Copper Earthing & Lightning Arrestor"}</td>
                    <td className="p-2.5 text-center">Complete Set</td>
                    <td className="p-2.5 text-right font-semibold text-emerald-700">5 Years Comprehensive</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Financial Formula Breakdown */}
            <div className="border rounded-2xl p-5 bg-slate-50 space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Total System Hardware (PV + Inverter + Structure):</span>
                <span className="font-semibold text-slate-900">₹{activeQuote.system_price.toLocaleString()}</span>
              </div>
              {activeQuote.gst_amount > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Applicable GST ({activeQuote.gst_rate || 13.8}%):</span>
                  <span className="font-semibold text-slate-900">₹{activeQuote.gst_amount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-emerald-800 font-bold bg-emerald-50 p-2.5 rounded-lg border border-emerald-300">
                <span>PM Surya Ghar Muft Bijli Yojana Central Subsidy:</span>
                <span>- ₹{activeQuote.subsidy_amount.toLocaleString()} (Direct Bank Transfer)</span>
              </div>
              <div className="pt-3 border-t flex justify-between items-center text-slate-950 font-display">
                <span className="text-sm font-bold">Net Final Customer Payable:</span>
                <span className="text-2xl font-black text-[#106828]">
                  ₹{activeQuote.final_price.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Terms & Footer */}
            <div className="pt-4 border-t text-[10px] text-slate-500 space-y-1">
              <p>• Quotation valid for 15 days from issuance. Central subsidy (up to ₹78,000) credited via Direct Benefit Transfer under PM Surya Ghar Yojana.</p>
              <p>• Net-metering approval, solar meter testing, and DISCOM commissioning handled end-to-end by True Sun Energy with PGVCL/DGVCL/MGVCL/UGVCL.</p>
              <p>• Rooftop solar financing & 0% / low-interest EMI assistance available through nationalized bank partners.</p>
            </div>
          </div>
        </div>
      )}

      {/* Create Solar Quotation Modal */}
      <CreateQuotationModal
        isOpen={isCreateQuoteModalOpen}
        onClose={() => setIsCreateQuoteModalOpen(false)}
        onSuccess={() => {
          fetchQuotes();
          window.dispatchEvent(new CustomEvent('crm-data-updated'));
        }}
        onNavigateToSystems={onNavigateToSystems}
      />
    </div>
  );
};
