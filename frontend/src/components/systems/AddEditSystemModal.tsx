import React, { useState, useEffect } from 'react';
import { X, Layers, AlertCircle, CheckCircle2, Shield, Zap, DollarSign, Box } from 'lucide-react';
import { SolarSystem } from '../../types';
import { api } from '../../services/api';

interface AddEditSystemModalProps {
  isOpen: boolean;
  systemToEdit?: SolarSystem | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddEditSystemModal: React.FC<AddEditSystemModalProps> = ({
  isOpen,
  systemToEdit,
  onClose,
  onSuccess
}) => {
  const isEditing = Boolean(systemToEdit);

  // 10 Core Required Fields
  const [systemName, setSystemName] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [capacityKw, setCapacityKw] = useState('');
  const [solarPanelName, setSolarPanelName] = useState('');
  const [inverterName, setInverterName] = useState('');
  const [structureName, setStructureName] = useState('');
  const [bosName, setBosName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [warranty, setWarranty] = useState('25 Years Panels, 5 Years Inverter, 10 Years Structure');
  const [subsidy, setSubsidy] = useState('');
  const [description, setDescription] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      if (systemToEdit) {
        setSystemName(systemToEdit.system_name || '');
        setBasePrice(systemToEdit.base_price ? systemToEdit.base_price.toString() : '0');
        setCapacityKw(systemToEdit.capacity_kw ? systemToEdit.capacity_kw.toString() : '');
        setSolarPanelName(systemToEdit.solar_panel_name || '');
        setInverterName(systemToEdit.inverter_name || '');
        setStructureName(systemToEdit.structure_name || '');
        setBosName(systemToEdit.bos_name || '');
        setQuantity(systemToEdit.quantity !== undefined ? systemToEdit.quantity.toString() : '1');
        setWarranty(systemToEdit.warranty || '25 Years Panels, 5 Years Inverter, 10 Years Structure');
        setSubsidy(systemToEdit.subsidy !== undefined ? systemToEdit.subsidy.toString() : '0');
        setDescription(systemToEdit.description || '');
      } else {
        // Reset defaults for Add mode
        setSystemName('');
        setBasePrice('');
        setCapacityKw('');
        setSolarPanelName('');
        setInverterName('');
        setStructureName('Elevated Galvanized Iron (GI)');
        setBosName('Standard BOS Kit (DCDB/ACDB, DC Cables, Earthing)');
        setQuantity('1');
        setWarranty('25 Years Panels, 5 Years Inverter, 10 Years Structure');
        setSubsidy('');
        setDescription('');
      }
    }
  }, [isOpen, systemToEdit]);

  // Dynamic PM Surya Ghar Subsidy Suggestion when Capacity is entered
  const handleCapacityChange = (val: string) => {
    setCapacityKw(val);
    const kw = parseFloat(val);
    if (!isNaN(kw) && kw > 0 && (!subsidy || subsidy === '0' || subsidy === '78000' || subsidy === '60000' || subsidy === '30000')) {
      if (kw >= 3.0) setSubsidy('78000');
      else if (kw >= 2.0) setSubsidy('60000');
      else if (kw >= 1.0) setSubsidy('30000');
      else setSubsidy(Math.round(kw * 30000).toString());
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Validations
    if (!systemName.trim()) {
      setErrorMsg('Please enter a System Name / Brand.');
      return;
    }

    const parsedPrice = parseFloat(basePrice);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      setErrorMsg('Please enter a valid non-negative Base Price in ₹.');
      return;
    }

    const parsedKw = parseFloat(capacityKw);
    if (isNaN(parsedKw) || parsedKw <= 0) {
      setErrorMsg('Please enter a valid positive decimal System Capacity in kW (e.g. 1.9, 3.3, 3.6, 5).');
      return;
    }

    if (!solarPanelName.trim()) {
      setErrorMsg('Please specify the Solar Panel Name / Model.');
      return;
    }

    if (!inverterName.trim()) {
      setErrorMsg('Please specify the Inverter Name / Model.');
      return;
    }

    if (!structureName.trim()) {
      setErrorMsg('Please specify the Mounting Structure Name / Type.');
      return;
    }

    if (!bosName.trim()) {
      setErrorMsg('Please specify the BOS (Balance of System) description.');
      return;
    }

    const parsedQty = parseInt(quantity, 10);
    if (isNaN(parsedQty) || parsedQty < 0) {
      setErrorMsg('Please enter a valid non-negative Quantity.');
      return;
    }

    const parsedSubsidy = subsidy.trim() !== '' ? parseFloat(subsidy) : 0;
    if (isNaN(parsedSubsidy) || parsedSubsidy < 0) {
      setErrorMsg('Please enter a valid non-negative Subsidy amount in ₹.');
      return;
    }

    const payload = {
      system_name: systemName.trim(),
      base_price: parsedPrice,
      capacity_kw: parsedKw,
      solar_panel_name: solarPanelName.trim(),
      inverter_name: inverterName.trim(),
      structure_name: structureName.trim(),
      bos_name: bosName.trim(),
      quantity: parsedQty,
      warranty: warranty.trim() || '25 Years Panels, 5 Years Inverter, 10 Years Structure',
      subsidy: parsedSubsidy,
      description: description.trim() || undefined,
      is_active: true
    };

    setLoading(true);
    try {
      if (isEditing && systemToEdit) {
        await api.updateSolarSystem(systemToEdit.id, payload);
      } else {
        await api.createSolarSystem(payload);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save solar system. Please check input values.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-2xl bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-display">
                {isEditing ? 'Edit Solar System Product' : 'Add New Solar System Product'}
              </h3>
              <p className="text-xs text-slate-400">
                Configure solar packages, components, hardware pricing, and central subsidies.
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Core System Specifications */}
          <div className="space-y-3.5">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              <span>1. General & Pricing Overview</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  System Name / Brand <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tata Power Solar 3.3 kW Package"
                  value={systemName}
                  onChange={(e) => setSystemName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs text-white bg-slate-800/80 border border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Capacity (kW) <span className="text-red-400">*</span></span>
                  <span className="text-[10px] text-amber-400 font-mono">Decimals OK</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.1"
                  required
                  placeholder="e.g. 1.9, 3.3, 3.6, 5"
                  value={capacityKw}
                  onChange={(e) => handleCapacityChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs text-white bg-slate-800/80 border border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Base Price (₹) <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    required
                    placeholder="157400"
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                    className="w-full pl-7 pr-3.5 py-2.5 text-xs text-white bg-slate-800/80 border border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Govt. Subsidy (₹)</span>
                  <span className="text-[10px] text-emerald-400 font-mono">PM Surya Ghar</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-400 text-xs font-bold">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    placeholder="78000"
                    value={subsidy}
                    onChange={(e) => setSubsidy(e.target.value)}
                    className="w-full pl-7 pr-3.5 py-2.5 text-xs text-white bg-slate-800/80 border border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Available Quantity (Qty) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  placeholder="e.g. 10"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs text-white bg-slate-800/80 border border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all placeholder:text-slate-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Components Specification */}
          <div className="space-y-3.5 pt-3 border-t border-slate-800/80">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Box className="w-3.5 h-3.5" />
              <span>2. Solar Hardware Components</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Solar Panel Name / Model <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tata Power 550W Mono PERC"
                  value={solarPanelName}
                  onChange={(e) => setSolarPanelName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs text-white bg-slate-800/80 border border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Inverter Name / Model <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Growatt 3.3 kW On-Grid Inverter"
                  value={inverterName}
                  onChange={(e) => setInverterName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs text-white bg-slate-800/80 border border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Mounting Structure Name / Type <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Elevated Galvanized Iron (GI) Structure"
                  value={structureName}
                  onChange={(e) => setStructureName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs text-white bg-slate-800/80 border border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  BOS Kit Name / Description <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TrueSun Complete BOS Kit (ACDB/DCDB, Cables, Earthing)"
                  value={bosName}
                  onChange={(e) => setBosName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs text-white bg-slate-800/80 border border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all placeholder:text-slate-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Warranty & Remarks */}
          <div className="space-y-3.5 pt-3 border-t border-slate-800/80">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              <span>3. Warranty & Package Details</span>
            </h4>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Warranty Terms <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="25 Years Panels, 5 Years Inverter, 10 Years Structure"
                value={warranty}
                onChange={(e) => setWarranty(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs text-white bg-slate-800/80 border border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Description / Notes (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Add package inclusions, DISCOM feasibility guidelines, or special promotion notes..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs text-white bg-slate-800/80 border border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all placeholder:text-slate-500 resize-none"
              />
            </div>
          </div>

          {/* Modal Footer Buttons */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition-all shadow-md shadow-amber-500/20 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{loading ? 'Saving System...' : isEditing ? 'Update Solar System' : 'Save Solar System'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
