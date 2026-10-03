import React, { useState, useEffect } from 'react';
import { X, FileSpreadsheet, Layers, Sun, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { SolarSystem, Lead } from '../../types';
import { api } from '../../services/api';

interface CreateQuotationModalProps {
  isOpen: boolean;
  initialLeadId?: number | null;
  initialSystemId?: number | null;
  onClose: () => void;
  onSuccess: () => void;
  onNavigateToSystems?: () => void;
}

export const CreateQuotationModal: React.FC<CreateQuotationModalProps> = ({
  isOpen,
  initialLeadId,
  initialSystemId,
  onClose,
  onSuccess,
  onNavigateToSystems
}) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [systems, setSystems] = useState<SolarSystem[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form states
  const [selectedLeadId, setSelectedLeadId] = useState<number | ''>('');
  const [selectedSystemId, setSelectedSystemId] = useState<number | ''>('');

  // Populated / Adjustable Specifications
  const [systemName, setSystemName] = useState('');
  const [systemSizeKw, setSystemSizeKw] = useState('3.3');
  const [panelName, setPanelName] = useState('Tata Power Solar (550W Mono PERC)');
  const [inverterName, setInverterName] = useState('Growatt High Yield');
  const [structureName, setStructureName] = useState('Elevated Galvanized Iron');
  const [bosName, setBosName] = useState('Standard BOS Kit (ACDB/DCDB, Cables, Earthing)');
  const [warranty, setWarranty] = useState('25 Years Panels, 5 Years Inverter, 10 Years Structure');

  // Financial components
  const [basePrice, setBasePrice] = useState('157400');
  const [subsidyAmount, setSubsidyAmount] = useState('78000');

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setLoadingInitial(true);

      Promise.all([api.getLeads(), api.getSolarSystems()])
        .then(([leadsData, systemsData]) => {
          setLeads(leadsData || []);
          setSystems(systemsData || []);

          if (initialLeadId) {
            setSelectedLeadId(initialLeadId);
          } else if (leadsData && leadsData.length > 0) {
            setSelectedLeadId(leadsData[0].id);
          }

          if (initialSystemId) {
            const found = (systemsData || []).find((s: SolarSystem) => s.id === initialSystemId);
            if (found) {
              applySystemData(found);
            }
          } else if (systemsData && systemsData.length > 0) {
            applySystemData(systemsData[0]);
          }
        })
        .catch((err) => {
          console.error('Failed to load leads or systems:', err);
        })
        .finally(() => {
          setLoadingInitial(false);
        });
    }
  }, [isOpen, initialLeadId, initialSystemId]);

  const applySystemData = (sys: SolarSystem) => {
    setSelectedSystemId(sys.id);
    setSystemName(sys.system_name || '');
    setSystemSizeKw(sys.capacity_kw ? sys.capacity_kw.toString() : '3.3');
    setPanelName(sys.solar_panel_name || '');
    setInverterName(sys.inverter_name || '');
    setStructureName(sys.structure_name || 'Elevated Galvanized Iron');
    setBosName(sys.bos_name || 'Standard BOS Kit');
    setWarranty(sys.warranty || '25 Years Panels, 5 Years Inverter, 10 Years Structure');
    setBasePrice(sys.base_price ? sys.base_price.toString() : '0');
    setSubsidyAmount(sys.subsidy !== undefined ? sys.subsidy.toString() : '0');
  };

  const handleSystemDropdownChange = (val: string) => {
    if (val === '') {
      setSelectedSystemId('');
      setSystemName('Custom System');
      return;
    }
    const sysId = parseInt(val, 10);
    const found = systems.find(s => s.id === sysId);
    if (found) {
      applySystemData(found);
    }
  };

  // Real-time authoritative financial breakdown
  const kw = parseFloat(systemSizeKw) || 0.1;
  const hardwarePrice = parseFloat(basePrice) || 0;
  const subAmt = parseFloat(subsidyAmount) || 0;
  const finalPrice = Math.max(0, Math.round(hardwarePrice - subAmt));

  // ROI Projections
  const monthlyUnits = Math.round(kw * 120);
  const monthlySavings = Math.round(monthlyUnits * 8.0);
  const paybackYears = monthlySavings > 0 ? (finalPrice / (monthlySavings * 12)).toFixed(1) : '3.5';

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedLeadId) {
      setErrorMsg('Please select a customer lead.');
      return;
    }

    if (isNaN(kw) || kw <= 0) {
      setErrorMsg('Please enter a valid positive decimal system size (kW).');
      return;
    }

    if (hardwarePrice < 0) {
      setErrorMsg('Base system hardware price cannot be negative.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        lead_id: Number(selectedLeadId),
        system_id: selectedSystemId !== '' ? Number(selectedSystemId) : undefined,
        system_name: systemName.trim() || undefined,
        system_size_kw: kw,
        solar_panel_name: panelName.trim() || undefined,
        panel_brand: panelName.trim() || 'Tata Power Solar',
        inverter_name: inverterName.trim() || undefined,
        inverter_brand: inverterName.trim() || 'Sungrow',
        structure_name: structureName.trim() || undefined,
        structure_type: structureName.trim() || 'Elevated Galvanized Iron',
        bos_name: bosName.trim() || undefined,
        warranty: warranty.trim() || undefined,
        system_price: hardwarePrice,
        installation_cost: 0,
        other_costs: 0,
        discount: 0,
        subtotal: hardwarePrice,
        gst_rate: 0,
        gst_amount: 0,
        subsidy_amount: subAmt,
        final_price: finalPrice,
        monthly_generation_kwh: monthlyUnits,
        monthly_savings: monthlySavings,
        payback_years: parseFloat(paybackYears) || 3.5
      };

      await api.createQuotation(payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error generating quotation. Please verify all inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-3xl bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-display">
                Create Solar Quotation Proposal
              </h3>
              <p className="text-xs text-slate-400">
                Select a configured solar system product to auto-populate hardware specs, pricing, and central subsidies.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Customer Lead & Configured System Selector */}
          <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800 space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Lead Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Select Customer Lead <span className="text-red-400">*</span>
                </label>
                <select
                  required
                  value={selectedLeadId}
                  onChange={(e) => setSelectedLeadId(e.target.value ? parseInt(e.target.value) : '')}
                  className="w-full px-3.5 py-2.5 text-xs text-white bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:border-amber-500 transition-colors cursor-pointer"
                >
                  <option value="" className="bg-slate-900 text-slate-400">Select a Lead...</option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id} className="bg-slate-900 text-white">
                      {l.full_name} ({l.lead_id}) • {l.city || 'Location N/A'} • ₹{l.monthly_bill?.toLocaleString() || 0}/mo
                    </option>
                  ))}
                </select>
              </div>

              {/* Solar System Product Selector */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-amber-400" />
                    <span>Configured Solar System</span>
                  </label>
                  {onNavigateToSystems && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onNavigateToSystems();
                      }}
                      className="text-[11px] text-amber-400 hover:text-amber-300 underline font-medium cursor-pointer"
                    >
                      + Add / Manage Products
                    </button>
                  )}
                </div>
                <select
                  value={selectedSystemId}
                  onChange={(e) => handleSystemDropdownChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs text-white bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:border-amber-500 transition-colors cursor-pointer"
                >
                  <option value="" className="bg-slate-900 text-slate-400">-- Custom System / Manual Entry --</option>
                  {systems.map((s) => (
                    <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                      {s.system_name} ({s.capacity_kw} kW) • ₹{s.base_price.toLocaleString('en-IN')} (Subsidy: ₹{s.subsidy.toLocaleString('en-IN')})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Auto-populated Specifications (Editable by User) */}
          <div className="space-y-3.5">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5" />
              <span>Solar Package Specifications (Auto-Populated)</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  System Name / Package Title
                </label>
                <input
                  type="text"
                  value={systemName}
                  onChange={(e) => setSystemName(e.target.value)}
                  placeholder="e.g. Tata Power Solar 3.3 kW On-Grid"
                  className="w-full px-3.5 py-2.5 text-xs text-white bg-slate-800/80 border border-slate-700 rounded-xl focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Capacity (kW) *</span>
                  <span className="text-[10px] text-amber-400 font-mono">Supports Decimals</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.1"
                  required
                  value={systemSizeKw}
                  onChange={(e) => setSystemSizeKw(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs text-white bg-slate-800/80 border border-slate-700 rounded-xl focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Solar Panel Name / Model
                </label>
                <input
                  type="text"
                  value={panelName}
                  onChange={(e) => setPanelName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs text-white bg-slate-800/80 border border-slate-700 rounded-xl focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Inverter Name / Model
                </label>
                <input
                  type="text"
                  value={inverterName}
                  onChange={(e) => setInverterName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs text-white bg-slate-800/80 border border-slate-700 rounded-xl focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Mounting Structure
                </label>
                <input
                  type="text"
                  value={structureName}
                  onChange={(e) => setStructureName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs text-white bg-slate-800/80 border border-slate-700 rounded-xl focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  BOS Kit Details
                </label>
                <input
                  type="text"
                  value={bosName}
                  onChange={(e) => setBosName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs text-white bg-slate-800/80 border border-slate-700 rounded-xl focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Warranty Duration
                </label>
                <input
                  type="text"
                  value={warranty}
                  onChange={(e) => setWarranty(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs text-white bg-slate-800/80 border border-slate-700 rounded-xl focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Pricing & Central Subsidy Calculation */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center justify-between">
              <span>Financials & Central Subsidy</span>
              <span className="text-[11px] text-slate-400 font-normal">Package Pricing</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Base System Hardware (₹) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  required
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs text-white bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Central Subsidy (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={subsidyAmount}
                  onChange={(e) => setSubsidyAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs text-emerald-400 font-bold bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
            </div>

            {/* Live Authoritative Breakdown Card */}
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Total System Hardware (Complete Package):</span>
                <span className="font-semibold text-white">₹{hardwarePrice.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-emerald-400 font-semibold">
                <span>Central Subsidy Applied:</span>
                <span>- ₹{subAmt.toLocaleString('en-IN')}</span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                <span className="font-bold text-white text-sm">Final Customer Price Payable:</span>
                <span className="font-extrabold text-amber-400 text-lg font-mono">
                  ₹{finalPrice.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span>Monthly Gen: ~{monthlyUnits} kWh • Savings: ~₹{monthlySavings.toLocaleString('en-IN')}/mo</span>
                <span className="text-amber-300 font-medium">Est. Payback: ~{paybackYears} Years</span>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 rounded-xl transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{submitting ? 'Creating Quotation...' : 'Generate Solar Quotation'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
