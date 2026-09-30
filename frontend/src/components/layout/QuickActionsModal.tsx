import React, { useState } from 'react';
import { X, Plus, Calendar, ClipboardCheck, FileSpreadsheet, Check } from 'lucide-react';
import { api } from '../../services/api';
import { AddLeadModal } from '../leads/AddLeadModal';

interface QuickActionsModalProps {
  isOpen: boolean;
  actionType: 'lead' | 'followup' | 'survey' | 'quotation' | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const QuickActionsModal: React.FC<QuickActionsModalProps> = ({
  isOpen,
  actionType,
  onClose,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);

  // Follow-up Form State
  const [followupForm, setFollowupForm] = useState({
    lead_id: 1,
    follow_up_type: 'call',
    scheduled_date: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
    notes: 'Discuss True Sun rooftop solar sizing and PM Surya Ghar subsidy eligibility.'
  });

  // Survey Form State
  const [surveyForm, setSurveyForm] = useState({
    lead_id: 1,
    scheduled_date: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 16),
    roof_type: 'Concrete Flat',
    roof_area: 450,
    phase: 'Single Phase',
    recommended_system_size: 3.3
  });

  // Quotation Form State
  const [quoteForm, setQuoteForm] = useState({
    lead_id: 1,
    system_size_kw: 3.3,
    panel_brand: 'Adani Solar',
    inverter_brand: 'Sungrow',
    installation_cost: 22000,
    discount: 5000
  });

  if (!isOpen || !actionType) return null;

  // If opening the Add Lead form, render the exact requested Lead Modal
  if (actionType === 'lead') {
    return <AddLeadModal isOpen={isOpen} onClose={onClose} onSuccess={onSuccess} />;
  }

  const handleCreateFollowup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.createFollowup({
        ...followupForm,
        scheduled_date: new Date(followupForm.scheduled_date).toISOString()
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Error scheduling follow-up');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSurvey = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.createSurvey({
        ...surveyForm,
        scheduled_date: new Date(surveyForm.scheduled_date).toISOString()
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Error scheduling survey');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.createQuotation(quoteForm);
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Error creating quotation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              {actionType === 'followup' && <Calendar className="w-4 h-4" />}
              {actionType === 'survey' && <ClipboardCheck className="w-4 h-4" />}
              {actionType === 'quotation' && <FileSpreadsheet className="w-4 h-4" />}
            </span>
            <h3 className="text-base font-bold text-white font-display">
              {actionType === 'followup' && 'Schedule Customer Follow-up'}
              {actionType === 'survey' && 'Schedule Roof Site Survey'}
              {actionType === 'quotation' && 'Generate Solar Quotation'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Forms */}
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {/* Action 2: Schedule Follow-up */}
          {actionType === 'followup' && (
            <form onSubmit={handleCreateFollowup} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Lead ID *</label>
                <input
                  type="number"
                  required
                  value={followupForm.lead_id}
                  onChange={(e) => setFollowupForm({ ...followupForm, lead_id: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Type</label>
                  <select
                    value={followupForm.follow_up_type}
                    onChange={(e) => setFollowupForm({ ...followupForm, follow_up_type: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="call">Phone Call</option>
                    <option value="whatsapp">WhatsApp Message</option>
                    <option value="email">Email</option>
                    <option value="site_visit">Site Visit</option>
                    <option value="meeting">Office Meeting</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={followupForm.scheduled_date}
                    onChange={(e) => setFollowupForm({ ...followupForm, scheduled_date: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Agenda / Notes</label>
                <textarea
                  rows={3}
                  value={followupForm.notes}
                  onChange={(e) => setFollowupForm({ ...followupForm, notes: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition-all shadow-md shadow-amber-500/20 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Schedule Follow-up'}
                </button>
              </div>
            </form>
          )}

          {/* Action 3: Schedule Survey */}
          {actionType === 'survey' && (
            <form onSubmit={handleCreateSurvey} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Lead ID *</label>
                  <input
                    type="number"
                    required
                    value={surveyForm.lead_id}
                    onChange={(e) => setSurveyForm({ ...surveyForm, lead_id: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Scheduled Date</label>
                  <input
                    type="datetime-local"
                    value={surveyForm.scheduled_date}
                    onChange={(e) => setSurveyForm({ ...surveyForm, scheduled_date: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Estimated Roof Area (sq.ft)</label>
                  <input
                    type="number"
                    value={surveyForm.roof_area}
                    onChange={(e) => setSurveyForm({ ...surveyForm, roof_area: parseFloat(e.target.value) || 500 })}
                    className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Target kW Array</label>
                  <input
                    type="number"
                    step="0.5"
                    value={surveyForm.recommended_system_size}
                    onChange={(e) => setSurveyForm({ ...surveyForm, recommended_system_size: parseFloat(e.target.value) || 5 })}
                    className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition-all shadow-md shadow-amber-500/20 disabled:opacity-50"
                >
                  {loading ? 'Scheduling...' : 'Assign Survey'}
                </button>
              </div>
            </form>
          )}

          {/* Action 4: Create Quotation */}
          {actionType === 'quotation' && (
            <form onSubmit={handleCreateQuotation} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Lead ID *</label>
                  <input
                    type="number"
                    required
                    value={quoteForm.lead_id}
                    onChange={(e) => setQuoteForm({ ...quoteForm, lead_id: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">System Size (kW) *</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={quoteForm.system_size_kw}
                    onChange={(e) => setQuoteForm({ ...quoteForm, system_size_kw: parseFloat(e.target.value) || 5 })}
                    className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Panel Brand</label>
                  <select
                    value={quoteForm.panel_brand}
                    onChange={(e) => setQuoteForm({ ...quoteForm, panel_brand: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Tata Power Solar">Tata Power Solar (550W Mono PERC)</option>
                    <option value="Waaree Energies">Waaree Energies (Bifacial)</option>
                    <option value="Adani Solar">Adani Solar (TOPCon)</option>
                    <option value="Vikram Solar">Vikram Solar</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Inverter Brand</label>
                  <select
                    value={quoteForm.inverter_brand}
                    onChange={(e) => setQuoteForm({ ...quoteForm, inverter_brand: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Sungrow">Sungrow (Grid-Tied)</option>
                    <option value="Growatt">Growatt High Yield</option>
                    <option value="Enphase">Enphase Microinverter</option>
                    <option value="Fronius">Fronius Primo</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 rounded-xl transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50"
                >
                  {loading ? 'Calculating...' : 'Generate Quote with Subsidy'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
