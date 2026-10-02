import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Phone,
  MessageSquare,
  Mail,
  MapPin,
  Calendar,
  Sun,
  Battery,
  Car,
  Home,
  FileSpreadsheet,
  ClipboardCheck,
  Clock,
  Send,
  Sparkles,
  Edit,
  Trash2
} from 'lucide-react';
import { Lead, LeadActivity, LeadNote } from '../../types';
import { api } from '../../services/api';
import { EditLeadModal } from './EditLeadModal';

interface LeadDetailPageProps {
  leadId: number;
  onBack: () => void;
  onOpenQuickAction: (action: 'lead' | 'followup' | 'survey' | 'quotation') => void;
  onOpenAIForLead: (leadId: number) => void;
}

export const LeadDetailPage: React.FC<LeadDetailPageProps> = ({
  leadId,
  onBack,
  onOpenQuickAction,
  onOpenAIForLead
}) => {
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'timeline' | 'notes' | 'survey' | 'quotes'>('timeline');
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const fetchLead = async () => {
    setLoading(true);
    try {
      const data = await api.getLead(leadId);
      setLead(data);
    } catch (e: any) {
      alert(e.message || 'Error fetching lead details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLead();
  }, [leadId]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    setSavingNote(true);
    try {
      await api.addLeadNote(leadId, newNote.trim());
      setNewNote('');
      fetchLead();
      window.dispatchEvent(new CustomEvent('crm-data-updated'));
    } catch (e: any) {
      alert(e.message || 'Error saving note');
    } finally {
      setSavingNote(false);
    }
  };

  if (loading || !lead) {
    return (
      <div className="p-8 text-center text-slate-400">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm">Loading lead profile...</p>
      </div>
    );
  }

  const stageLabels: Record<string, string> = {
    new_lead: 'New Lead',
    contacted: 'Contacted',
    qualified: 'Qualified',
    survey_scheduled: 'Survey Scheduled',
    survey_completed: 'Survey Completed',
    quotation_sent: 'Quotation Sent',
    negotiation: 'Negotiation',
    won: 'Deal Won',
    lost: 'Deal Lost'
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Leads</span>
        </button>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30 transition-colors cursor-pointer"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>Edit Lead</span>
          </button>

          <button
            onClick={() => onOpenAIForLead(lead.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>AI Qualify & WhatsApp Pitch</span>
          </button>

          <button
            onClick={() => onOpenQuickAction('followup')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 transition-colors"
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Schedule Follow-up</span>
          </button>

          <button
            onClick={() => onOpenQuickAction('survey')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 transition-colors"
          >
            <ClipboardCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Site Survey</span>
          </button>

          <button
            onClick={() => onOpenQuickAction('quotation')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition-colors shadow-sm shadow-amber-500/20"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Generate Quote</span>
          </button>
        </div>
      </div>

      {/* Main Customer Header Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Sun className="w-7 h-7" />
          </div>

          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl md:text-2xl font-bold text-white font-display">
                {lead.full_name}
              </h2>
              <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                {lead.lead_id}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                {stageLabels[lead.stage] || lead.stage}
              </span>
            </div>

            <div className="flex items-center gap-4 mt-2 text-xs text-slate-400 flex-wrap">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                {lead.city}, {lead.state}
              </span>
              <span className="flex items-center gap-1">
                <Home className="w-3.5 h-3.5 text-slate-500" />
                {lead.property_type}
              </span>
              <span className="text-slate-500">•</span>
              <span>Source: <strong className="text-slate-300">{lead.lead_source}</strong></span>
              <span className="text-slate-500">•</span>
              <span>Rep: <strong className="text-amber-400">{lead.assigned_to_name || 'Unassigned'}</strong></span>
            </div>
          </div>
        </div>

        {/* Quick Contact Buttons */}
        <div className="flex items-center gap-2 self-start lg:self-auto">
          <a
            href={`tel:${lead.phone}`}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            <Phone className="w-3.5 h-3.5 text-emerald-400" />
            <span>Call Customer</span>
          </a>
          <a
            href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </a>
        </div>
      </div>

      {/* Grid Section: Customer Info + Solar Requirements + Sales Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Customer Contact Info */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white font-display border-b border-slate-800 pb-2">
            Customer Information
          </h3>
          <div className="space-y-2.5 text-xs">
            <div>
              <span className="text-slate-400 block">Phone Number</span>
              <span className="font-semibold text-slate-200">{lead.phone}</span>
            </div>
            <div>
              <span className="text-slate-400 block">WhatsApp</span>
              <span className="font-semibold text-slate-200">{lead.whatsapp || lead.phone}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Email Address</span>
              <span className="font-semibold text-slate-200">{lead.email || 'Not provided'}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Site Address</span>
              <span className="font-semibold text-slate-200">{lead.address || 'Address pending site survey'}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <span className="text-slate-400 block">City</span>
                <span className="font-semibold text-slate-200">{lead.city}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Pincode</span>
                <span className="font-semibold text-slate-200">{lead.pincode || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Solar Rooftop Specifications */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white font-display border-b border-slate-800 pb-2 flex items-center justify-between">
            <span>Solar & Energy Profile</span>
            <span className="text-amber-400 font-bold">{lead.recommended_kw} kW System</span>
          </h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Monthly Electricity Bill</span>
              <span className="font-bold text-amber-400 text-sm mt-0.5 block">
                ₹{lead.monthly_bill.toLocaleString()}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Estimated Monthly Units</span>
              <span className="font-bold text-slate-200 text-sm mt-0.5 block">
                {lead.consumption_kwh ? `${lead.consumption_kwh} kWh` : `${lead.recommended_kw * 120} kWh`}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Available Roof Area</span>
              <span className="font-bold text-slate-200 mt-0.5 block">
                {lead.roof_area_sqft ? `${lead.roof_area_sqft} sq.ft` : 'Area pending survey'}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-800 flex flex-col justify-between">
              <span className="text-slate-400 block text-[11px]">Property Type</span>
              <span className="font-bold text-slate-200 mt-0.5 block">
                {lead.property_type || 'Residential'}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Battery className="w-4 h-4 text-emerald-400" />
              <span>Battery Storage:</span>
            </span>
            <span className={`font-semibold ${lead.battery_required ? 'text-emerald-400' : 'text-slate-500'}`}>
              {lead.battery_required ? 'Yes (Requested)' : 'Grid-Tied Only'}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Car className="w-4 h-4 text-cyan-400" />
              <span>EV Charger Provision:</span>
            </span>
            <span className={`font-semibold ${lead.ev_requirement ? 'text-cyan-400' : 'text-slate-500'}`}>
              {lead.ev_requirement ? 'Required' : 'None'}
            </span>
          </div>
        </div>

        {/* Card 3: Deal & Probability Metrics */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white font-display border-b border-slate-800 pb-2">
            Opportunity & Financials
          </h3>
          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-400">Win Probability:</span>
                <span className="text-amber-400 font-bold">{lead.win_probability_pct}%</span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full"
                  style={{ width: `${lead.win_probability_pct}%` }}
                />
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-800">
              <span className="text-slate-400">Eligible Central Subsidy:</span>
              <span className="text-emerald-400 font-bold">
                {lead.recommended_kw >= 3 ? '₹78,000' : (lead.recommended_kw >= 2 ? '₹60,000' : '₹30,000')}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400">Expected Annual Savings:</span>
              <span className="text-slate-200 font-semibold">
                ~₹{Math.round(lead.recommended_kw * 120 * 8 * 12).toLocaleString()}/year
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400">Est. Payback Period:</span>
              <span className="text-amber-300 font-bold">~3.8 Years</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Section: Activity Timeline & Notes */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800">
        <div className="flex items-center gap-4 border-b border-slate-800 pb-4">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`text-xs font-bold pb-1 transition-colors border-b-2 ${
              activeTab === 'timeline'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Activity Timeline ({lead.activities?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`text-xs font-bold pb-1 transition-colors border-b-2 ${
              activeTab === 'notes'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Sales Notes ({lead.notes?.length || 0})
          </button>
        </div>

        {/* Tab 1: Activity Timeline */}
        {activeTab === 'timeline' && (
          <div className="mt-6 space-y-4">
            {(!lead.activities || lead.activities.length === 0) ? (
              <p className="text-xs text-slate-500 py-6 text-center">No logged activities yet.</p>
            ) : (
              <div className="relative pl-6 border-l border-slate-800 space-y-6">
                {lead.activities.map((act) => (
                  <div key={act.id} className="relative group">
                    <span className="absolute -left-[31px] top-0.5 w-3.5 h-3.5 rounded-full bg-slate-800 border-2 border-amber-500" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{act.title}</span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(act.created_at).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      {act.description && (
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                          {act.description}
                        </p>
                      )}
                      {act.user_name && (
                        <span className="text-[10px] text-amber-400/80 mt-0.5 block">
                          By {act.user_name}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Notes */}
        {activeTab === 'notes' && (
          <div className="mt-6 space-y-5">
            {/* Add Note Input */}
            <form onSubmit={handleAddNote} className="space-y-2">
              <textarea
                rows={3}
                required
                placeholder="Add customer interaction notes, subsidy details, roof accessibility, customer objections..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="w-full p-3 text-xs bg-slate-800 border border-slate-700 rounded-2xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={savingNote}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{savingNote ? 'Posting...' : 'Post Sales Note'}</span>
                </button>
              </div>
            </form>

            {/* Notes List */}
            <div className="space-y-3 pt-4 border-t border-slate-800">
              {(!lead.notes || lead.notes.length === 0) ? (
                <p className="text-xs text-slate-500 py-4 text-center">No notes recorded yet.</p>
              ) : (
                lead.notes.map((n) => (
                  <div key={n.id} className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-amber-400">{n.user_name || 'Sales Rep'}</span>
                      <span className="text-slate-500">
                        {new Date(n.created_at).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line">
                      {n.content}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Edit Lead Modal */}
      {isEditModalOpen && (
        <EditLeadModal
          isOpen={isEditModalOpen}
          lead={lead}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={() => {
            setIsEditModalOpen(false);
            fetchLead();
            window.dispatchEvent(new CustomEvent('crm-data-updated'));
          }}
        />
      )}
    </div>
  );
};
