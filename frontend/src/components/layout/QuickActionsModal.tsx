import React, { useState, useEffect } from 'react';
import { X, Plus, Calendar, ClipboardCheck, FileSpreadsheet, Check, Layers } from 'lucide-react';
import { api } from '../../services/api';
import { AddLeadModal } from '../leads/AddLeadModal';
import { getISTNowString, toISTIsoString } from '../../utils/date';
import { SolarSystem } from '../../types';

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

  // Follow-up Form State (default scheduled in IST +24 hours)
  const [followupForm, setFollowupForm] = useState({
    lead_id: 1,
    follow_up_type: 'call',
    scheduled_date: getISTNowString(1440),
    notes: 'Discuss True Sun rooftop solar sizing and PM Surya Ghar subsidy eligibility.'
  });

  // Survey Form State (default scheduled in IST +48 hours)
  const [surveyForm, setSurveyForm] = useState({
    lead_id: 1,
    scheduled_date: getISTNowString(2880),
    roof_type: 'Concrete Flat',
    roof_area: 450,
    phase: 'Single Phase',
    recommended_system_size: 3.3
  });

  // Systems state for quotation
  const [availableSystems, setAvailableSystems] = useState<SolarSystem[]>([]);
  const [selectedSystemId, setSelectedSystemId] = useState<number | undefined>(undefined);
  const [selectedSystem, setSelectedSystem] = useState<SolarSystem | null>(null);

  // Quotation Form State
  const [quoteForm, setQuoteForm] = useState<{
    lead_id: number;
    system_id?: number;
    system_size_kw: number;
    panel_brand: string;
    inverter_brand: string;
    installation_cost: number;
    discount: number;
  }>({
    lead_id: 1,
    system_id: undefined,
    system_size_kw: 3.3,
    panel_brand: 'Adani Solar',
    inverter_brand: 'Sungrow',
    installation_cost: 22000,
    discount: 5000
  });

  useEffect(() => {
    if (isOpen && actionType === 'quotation') {
      api.getSolarSystems().then((data) => {
        setAvailableSystems(data || []);
      }).catch(err => console.error('Failed to load systems for quote modal:', err));
    }
  }, [isOpen, actionType]);

  const handleSelectSystem = (idStr: string) => {
    if (!idStr) {
      setSelectedSystemId(undefined);
      setSelectedSystem(null);
      setQuoteForm(prev => ({ ...prev, system_id: undefined }));
      return;
    }
    const id = parseInt(idStr, 10);
    const sys = availableSystems.find(s => s.id === id);
    if (sys) {
      setSelectedSystemId(id);
      setSelectedSystem(sys);
      setQuoteForm(prev => ({
        ...prev,
        system_id: sys.id,
        system_size_kw: sys.capacity_kw,
        panel_brand: sys.solar_panel_name,
        inverter_brand: sys.inverter_name
      }));
    }
  };

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
        scheduled_date: toISTIsoString(followupForm.scheduled_date)!
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
        scheduled_date: toISTIsoString(surveyForm.scheduled_date)!
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
              {/* Configured Solar System Preset Selector */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-amber-400" />
                    <span>Select Configured System (Package)</span>
                  </span>
                  <span className="text-[10px] text-slate-400">Optional preset</span>
                </label>
                <select
                  value={selectedSystemId || ''}
                  onChange={(e) => handleSelectSystem(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- Custom Configuration (No Package) --</option>
                  {availableSystems.map((sys) => (
                    <option key={sys.id} value={sys.id}>
                      {sys.system_name} ({sys.capacity_kw} kW) — ₹{sys.base_price.toLocaleString('en-IN')} | Subsidy: ₹{sys.subsidy.toLocaleString('en-IN')}
                    </option>
                  ))}
                </select>
                {selectedSystem && (
                  <div className="mt-2 p-2.5 rounded-xl bg-slate-800/60 border border-emerald-500/20 text-[11px] text-slate-300 space-y-1">
                    <div className="flex justify-between font-semibold text-emerald-400">
                      <span>{selectedSystem.system_name}</span>
                      <span>₹{selectedSystem.base_price.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="text-slate-400 text-[10px]">
                      Panel: {selectedSystem.solar_panel_name} • Inverter: {selectedSystem.inverter_name} • Subsidy: ₹{selectedSystem.subsidy.toLocaleString('en-IN')}
                    </div>
                  </div>
                )}
              </div>

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
                    step="any"
                    min="0.1"
                    required
                    value={quoteForm.system_size_kw}
                    onChange={(e) => setQuoteForm({ ...quoteForm, system_size_kw: parseFloat(e.target.value) || 0 })}
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
