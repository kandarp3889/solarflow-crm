import React from 'react';
import { X, Layers, Sun, ShieldCheck, Cpu, HardDrive, Wrench, Package, FileSpreadsheet, CheckCircle2, TrendingUp } from 'lucide-react';
import { SolarSystem } from '../../types';
import { formatISTDate } from '../../utils/date';

interface SystemDetailModalProps {
  isOpen: boolean;
  system: SolarSystem | null;
  onClose: () => void;
  onEdit: (system: SolarSystem) => void;
  onCreateQuotation?: (system: SolarSystem) => void;
}

export const SystemDetailModal: React.FC<SystemDetailModalProps> = ({
  isOpen,
  system,
  onClose,
  onEdit,
  onCreateQuotation
}) => {
  if (!isOpen || !system) return null;

  // Real-time calculations for ROI preview
  const estimatedDailyUnits = (system.capacity_kw * 4).toFixed(1);
  const estimatedMonthlyUnits = Math.round(system.capacity_kw * 120);
  const estimatedMonthlySavings = Math.round(estimatedMonthlyUnits * 8.0);
  const netPayablePrice = Math.max(0, system.base_price - system.subsidy);
  const paybackYears = (netPayablePrice / (estimatedMonthlySavings * 12)).toFixed(1);

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
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white font-display">
                  {system.system_name}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  {system.capacity_kw} kW
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Configured Solar Package Specifications & Pricing Blueprint
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

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Key Metrics Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-800">
              <span className="text-[11px] text-slate-400 block font-medium">Base Package Price</span>
              <span className="text-base font-bold text-white mt-1 block">
                ₹{system.base_price.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-[11px] text-emerald-300 block font-medium">Govt. Subsidy</span>
              <span className="text-base font-bold text-emerald-400 mt-1 block">
                - ₹{system.subsidy.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
              <span className="text-[11px] text-amber-300 block font-medium">Net Price Approx</span>
              <span className="text-base font-bold text-amber-400 mt-1 block">
                ₹{netPayablePrice.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20">
              <span className="text-[11px] text-blue-300 block font-medium">Available Quantity</span>
              <span className="text-base font-bold text-blue-400 mt-1 block">
                {system.quantity} {system.quantity === 1 ? 'Unit' : 'Units'}
              </span>
            </div>
          </div>

          {/* Component Specifications Grid */}
          <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800 space-y-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <HardDrive className="w-3.5 h-3.5 text-amber-400" />
              <span>Solar Hardware & Balance of System (BOS) Breakdown</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>Solar PV Panel</span>
                </span>
                <p className="font-bold text-slate-100 pl-5">{system.solar_panel_name}</p>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Solar Inverter</span>
                </span>
                <p className="font-bold text-slate-100 pl-5">{system.inverter_name}</p>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                  <Wrench className="w-3.5 h-3.5 text-orange-400" />
                  <span>Mounting Structure</span>
                </span>
                <p className="font-bold text-slate-100 pl-5">{system.structure_name}</p>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                  <Package className="w-3.5 h-3.5 text-purple-400" />
                  <span>Balance of System (BOS)</span>
                </span>
                <p className="font-bold text-slate-100 pl-5">{system.bos_name}</p>
              </div>
            </div>
          </div>

          {/* Warranty & Guarantee */}
          <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800 space-y-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Warranty & Protection Coverage</span>
            </h4>
            <p className="text-xs text-slate-300 font-medium">
              {system.warranty}
            </p>
          </div>

          {/* Estimated Solar Generation & Payback */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-slate-900 border border-amber-500/20 space-y-2">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Solar Energy Generation & ROI Projection</span>
            </h4>
            <div className="grid grid-cols-3 gap-2 text-center pt-2">
              <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Daily Generation</span>
                <span className="text-xs font-bold text-slate-200 mt-0.5 block">~{estimatedDailyUnits} Units</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Monthly Savings</span>
                <span className="text-xs font-bold text-emerald-400 mt-0.5 block">~₹{estimatedMonthlySavings.toLocaleString('en-IN')}</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Estimated Payback</span>
                <span className="text-xs font-bold text-amber-400 mt-0.5 block">~{paybackYears} Years</span>
              </div>
            </div>
          </div>

          {/* Description / Notes if available */}
          {system.description && (
            <div className="text-xs text-slate-400 bg-slate-800/30 p-3 rounded-xl border border-slate-800">
              <strong className="text-slate-300 block mb-1">Package Notes:</strong>
              {system.description}
            </div>
          )}

          {/* Quotations usage counter */}
          <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
            <span>Configured on: {formatISTDate(system.created_at)}</span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 font-mono">
              Referenced by {system.quotations_count || 0} Quotation(s)
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between gap-3">
          <button
            onClick={() => {
              onClose();
              onEdit(system);
            }}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
          >
            Edit System
          </button>

          <div className="flex items-center gap-2">
            {onCreateQuotation && (
              <button
                onClick={() => {
                  onClose();
                  onCreateQuotation(system);
                }}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors shadow-md shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Create Quote with this System</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
