import React, { useState, useEffect } from 'react';
import { X, Edit3, Layers, Sun, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import { Quotation, SolarSystem, QuotationStatus } from '../../types';
import { api } from '../../services/api';

interface EditQuotationModalProps {
  isOpen: boolean;
  quotation: Quotation | null;
  onClose: () => void;
  onSuccess: () => void;
  onNavigateToSystems?: () => void;
}

const QUOTATION_STATUSES: { value: QuotationStatus; label: string; color: string }[] = [
  { value: 'draft', label: 'Draft', color: 'text-slate-400 bg-slate-800 border-slate-700' },
  { value: 'sent', label: 'Sent', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  { value: 'viewed', label: 'Viewed', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  { value: 'accepted', label: 'Accepted', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  { value: 'rejected', label: 'Rejected', color: 'text-red-400 bg-red-500/10 border-red-500/30' },
  { value: 'expired', label: 'Expired', color: 'text-slate-500 bg-slate-800 border-slate-700' }
];

export const EditQuotationModal: React.FC<EditQuotationModalProps> = ({
  isOpen,
  quotation,
  onClose,
  onSuccess,
  onNavigateToSystems
}) => {
  const [systems, setSystems] = useState<SolarSystem[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form states
  const [selectedSystemId, setSelectedSystemId] = useState<number | ''>('');
  const [status, setStatus] = useState<QuotationStatus>('draft');

  // Populated / Adjustable Specifications
  const [systemName, setSystemName] = useState('');
  const [systemSizeKw, setSystemSizeKw] = useState('3.3');
  const [panelName, setPanelName] = useState('');
  const [panelQuantity, setPanelQuantity] = useState('6');
  const [isManualUnits, setIsManualUnits] = useState(false);
  const [inverterName, setInverterName] = useState('');
  const [structureName, setStructureName] = useState('');
  const [bosName, setBosName] = useState('');
  const [warranty, setWarranty] = useState('');
  const [notes, setNotes] = useState('');

  // Financial components
  const [basePrice, setBasePrice] = useState('0');
  const [subsidyAmount, setSubsidyAmount] = useState('0');

  // Helper to extract wattage and auto calculate panel units
  const getWattageFromPanel = (name: string): number => {
    const match = name.match(/(\d{3,4})\s*w/i);
    return match ? parseInt(match[1], 10) : 550;
  };

  const calculateAutoUnits = (kwVal: number, panelStr: string): number => {
    const w = getWattageFromPanel(panelStr);
    return Math.ceil((Math.max(0.1, kwVal) * 1000) / (w || 550));
  };

  // Load configured solar systems list
  useEffect(() => {
    if (isOpen) {
      setLoadingInitial(true);
      api.getSolarSystems()
        .then((systemsData) => {
          setSystems(systemsData || []);
        })
        .catch((err) => {
          console.error('Failed to load solar systems:', err);
        })
        .finally(() => {
          setLoadingInitial(false);
        });
    }
  }, [isOpen]);

  // Pre-populate form values when quotation changes
  useEffect(() => {
    if (quotation && isOpen) {
      setErrorMsg('');
      setSelectedSystemId(quotation.system_id || '');
      setStatus(quotation.status || 'draft');
      setSystemName(quotation.system_name || '');
      
      const kwVal = quotation.system_size_kw || 3.3;
      const kwStr = kwVal.toString();
      setSystemSizeKw(kwStr);

      const pName = quotation.solar_panel_name || quotation.panel_brand || '';
      setPanelName(pName);

      const autoUnits = calculateAutoUnits(kwVal, pName);
      if (quotation.panel_quantity && quotation.panel_quantity > 0) {
        setPanelQuantity(quotation.panel_quantity.toString());
        // If the units differ from auto calculation, mark as manual override
        setIsManualUnits(quotation.panel_quantity !== autoUnits);
      } else {
        setPanelQuantity(autoUnits.toString());
        setIsManualUnits(false);
      }

      setInverterName(quotation.inverter_name || quotation.inverter_brand || '');
      setStructureName(quotation.structure_name || quotation.structure_type || 'Elevated Galvanized Iron');
      setBosName(quotation.bos_name || 'Standard BOS Kit');
      setWarranty(quotation.warranty || '25 Years Panels, 8-10 Years Inverter');
      setBasePrice(quotation.system_price !== undefined ? quotation.system_price.toString() : '0');
      setSubsidyAmount(quotation.subsidy_amount !== undefined ? quotation.subsidy_amount.toString() : '0');
      setNotes(quotation.notes || '');
    }
  }, [quotation, isOpen]);

  const applySystemData = (sys: SolarSystem) => {
    setSelectedSystemId(sys.id);
    setSystemName(sys.system_name || '');
    const newKwStr = sys.capacity_kw ? sys.capacity_kw.toString() : '3.3';
    setSystemSizeKw(newKwStr);
    const newPanel = sys.solar_panel_name || '';
    setPanelName(newPanel);
    setInverterName(sys.inverter_name || '');
    setStructureName(sys.structure_name || 'Elevated Galvanized Iron');
    setBosName(sys.bos_name || 'Standard BOS Kit');
    setWarranty(sys.warranty || '25 Years Panels, 8-10 Years Inverter');
    setBasePrice(sys.base_price ? sys.base_price.toString() : '0');
    setSubsidyAmount(sys.subsidy !== undefined ? sys.subsidy.toString() : '0');

    if (!isManualUnits) {
      const autoUnits = calculateAutoUnits(parseFloat(newKwStr) || 3.3, newPanel);
      setPanelQuantity(autoUnits.toString());
    }
  };

  const handleSystemDropdownChange = (val: string) => {
    if (val === '') {
      setSelectedSystemId('');
      return;
    }
    const sysId = parseInt(val, 10);
    const found = systems.find(s => s.id === sysId);
    if (found) {
      applySystemData(found);
    }
  };

  const handleSystemSizeChange = (val: string) => {
    setSystemSizeKw(val);
    const parsed = parseFloat(val);
    if (!isManualUnits && !isNaN(parsed) && parsed > 0) {
      setPanelQuantity(calculateAutoUnits(parsed, panelName).toString());
    }
  };

  const handlePanelNameChange = (val: string) => {
    setPanelName(val);
    if (!isManualUnits) {
      const parsedKw = parseFloat(systemSizeKw) || 0;
      if (parsedKw > 0) {
        setPanelQuantity(calculateAutoUnits(parsedKw, val).toString());
      }
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

  if (!isOpen || !quotation) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (isNaN(kw) || kw <= 0) {
      setErrorMsg('Please enter a valid positive decimal system size (kW).');
      return;
    }

    if (hardwarePrice < 0) {
      setErrorMsg('Base system hardware price cannot be negative.');
      return;
    }

    const parsedQty = parseInt(panelQuantity, 10);
    const effectiveQty = (!isNaN(parsedQty) && parsedQty > 0) ? parsedQty : calculateAutoUnits(kw, panelName);

    setSubmitting(true);
    try {
      const payload = {
        system_id: selectedSystemId !== '' ? Number(selectedSystemId) : null,
        system_name: systemName.trim() || undefined,
        system_size_kw: kw,
        solar_panel_name: panelName.trim() || undefined,
        panel_brand: panelName.trim() || quotation.panel_brand || 'Tata Power Solar',
        panel_wattage: getWattageFromPanel(panelName),
        panel_quantity: effectiveQty,
        inverter_name: inverterName.trim() || undefined,
        inverter_brand: inverterName.trim() || quotation.inverter_brand || 'Sungrow',
        structure_name: structureName.trim() || undefined,
        structure_type: structureName.trim() || quotation.structure_type || 'Elevated Galvanized Iron',
        bos_name: bosName.trim() || undefined,
        warranty: warranty.trim() || undefined,
        system_price: hardwarePrice,
        subtotal: hardwarePrice,
        subsidy_amount: subAmt,
        final_price: finalPrice,
        monthly_generation_kwh: monthlyUnits,
        monthly_savings: monthlySavings,
        payback_years: parseFloat(paybackYears) || 3.5,
        status: status,
        notes: notes.trim() || undefined
      };

      await api.updateQuotation(quotation.id, payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating quotation. Please verify all inputs.');
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
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white font-display">
                  Edit Solar Quotation
                </h3>
                <span className="px-2 py-0.5 rounded-lg text-xs font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {quotation.quotation_number}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Modify hardware specifications, solar units, pricing, subsidy, or status.
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

          {/* Customer & Status Bar */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Customer Lead
              </span>
              <p className="text-sm font-bold text-white">
                {quotation.lead_name || `Lead #${quotation.lead_id}`}
              </p>
              <p className="text-xs text-slate-400">
                {quotation.lead_phone && <span className="mr-2">📞 {quotation.lead_phone}</span>}
                {quotation.lead_address && <span>📍 {quotation.lead_address}</span>}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-400">Status:</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as QuotationStatus)}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                {QUOTATION_STATUSES.map((st) => (
                  <option key={st.value} value={st.value} className="bg-slate-900 text-white">
                    {st.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Configured System Preset Option */}
          <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>Switch to Configured Solar System Preset (Optional)</span>
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
                  Manage Products
                </button>
              )}
            </div>
            <select
              value={selectedSystemId}
              onChange={(e) => handleSystemDropdownChange(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs text-white bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:border-amber-500 transition-colors cursor-pointer"
            >
              <option value="" className="bg-slate-900 text-slate-400">-- Custom / Current Specifications --</option>
              {systems.map((s) => (
                <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                  {s.system_name} ({s.capacity_kw} kW) • ₹{s.base_price.toLocaleString('en-IN')} (Subsidy: ₹{s.subsidy.toLocaleString('en-IN')})
                </option>
              ))}
            </select>
          </div>

          {/* Section: Specifications */}
          <div className="space-y-3.5">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5" />
              <span>Solar Package Specifications</span>
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
                  placeholder="e.g. Adani 3.78KW Ongrid Solar System"
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
                  onChange={(e) => handleSystemSizeChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs text-white bg-slate-800/80 border border-slate-700 rounded-xl focus:outline-none focus:border-amber-500 transition-colors font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Solar Panel Name / Model
                </label>
                <input
                  type="text"
                  value={panelName}
                  onChange={(e) => handlePanelNameChange(e.target.value)}
                  placeholder="e.g. Adani 630wp"
                  className="w-full px-3.5 py-2.5 text-xs text-white bg-slate-800/80 border border-slate-700 rounded-xl focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                    <span>PV Modules (Units) *</span>
                  </label>
                  {isManualUnits ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsManualUnits(false);
                        setPanelQuantity(calculateAutoUnits(kw, panelName).toString());
                      }}
                      className="text-[10px] text-amber-400 hover:text-amber-300 underline font-medium cursor-pointer"
                      title="Reset to automatically calculated units"
                    >
                      Reset Auto ({calculateAutoUnits(kw, panelName)})
                    </button>
                  ) : (
                    <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                      ⚡ Auto
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="999"
                    required
                    value={panelQuantity}
                    onChange={(e) => {
                      setIsManualUnits(true);
                      setPanelQuantity(e.target.value);
                    }}
                    placeholder={calculateAutoUnits(kw, panelName).toString()}
                    className="w-full px-3.5 py-2.5 text-xs text-white bg-slate-800/80 border border-slate-700 rounded-xl focus:outline-none focus:border-amber-500 transition-colors pr-14 font-semibold"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium pointer-events-none">
                    Units
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  {isManualUnits
                    ? `Manual: ${panelQuantity} units (Auto: ${calculateAutoUnits(kw, panelName)})`
                    : `Auto: ${calculateAutoUnits(kw, panelName)} units (${kw} kW)`}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Inverter Name / Model
                </label>
                <input
                  type="text"
                  value={inverterName}
                  onChange={(e) => setInverterName(e.target.value)}
                  placeholder="e.g. Polycab 4kw"
                  className="w-full px-3.5 py-2.5 text-xs text-white bg-slate-800/80 border border-slate-700 rounded-xl focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Mounting Structure
                </label>
                <input
                  type="text"
                  value={structureName}
                  onChange={(e) => setStructureName(e.target.value)}
                  placeholder="e.g. HOT DIP GI (60 x 40)"
                  className="w-full px-3.5 py-2.5 text-xs text-white bg-slate-800/80 border border-slate-700 rounded-xl focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  BOS Kit Details
                </label>
                <input
                  type="text"
                  value={bosName}
                  onChange={(e) => setBosName(e.target.value)}
                  placeholder="e.g. Polycab DC/AC Cables, Earthing Kit, DCDB/ACDB"
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
                  placeholder="e.g. 25 Years Panels, 8-10 Years Inverter"
                  className="w-full px-3.5 py-2.5 text-xs text-white bg-slate-800/80 border border-slate-700 rounded-xl focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Section: Financials & Central Subsidy Calculation */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center justify-between">
              <span>Financials & Central Subsidy</span>
              <span className="text-[11px] text-slate-400 font-normal">Pricing Overview</span>
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
                <span>Total System Hardware:</span>
                <span className="font-semibold text-white">₹{hardwarePrice.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-emerald-400 font-semibold">
                <span>Central Subsidy Applied:</span>
                <span>- ₹{subAmt.toLocaleString('en-IN')}</span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                <span className="font-bold text-white text-sm">Final Customer Price:</span>
                <span className="font-extrabold text-emerald-400 text-lg font-mono">
                  ₹{finalPrice.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span>Monthly Gen: ~{monthlyUnits} kWh • Savings: ~₹{monthlySavings.toLocaleString('en-IN')}/mo</span>
                <span className="text-amber-300 font-medium">Est. Payback: ~{paybackYears} Years</span>
              </div>
            </div>
          </div>

          {/* Section: Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Special Notes / Proposal Terms
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any specific customer requirements, warranty conditions, or payment milestones..."
              className="w-full px-3.5 py-2 text-xs text-white bg-slate-800/80 border border-slate-700 rounded-xl focus:outline-none focus:border-amber-500 transition-colors"
            />
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
              className="px-5 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-all shadow-md shadow-amber-400/20 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{submitting ? 'Saving Changes...' : 'Save Quotation Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
