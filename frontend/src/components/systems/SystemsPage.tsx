import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  Plus,
  Search,
  SlidersHorizontal,
  Eye,
  Pencil,
  Trash2,
  Sun,
  ShieldCheck,
  AlertTriangle,
  FileSpreadsheet,
  CheckCircle2,
  RefreshCw,
  Box,
  TrendingUp,
  DollarSign
} from 'lucide-react';
import { SolarSystem } from '../../types';
import { api } from '../../services/api';
import { AddEditSystemModal } from './AddEditSystemModal';
import { SystemDetailModal } from './SystemDetailModal';

interface SystemsPageProps {
  onNavigateToQuotations?: () => void;
  onSelectSystemForQuotation?: (system: SolarSystem) => void;
}

export const SystemsPage: React.FC<SystemsPageProps> = ({
  onNavigateToQuotations,
  onSelectSystemForQuotation
}) => {
  const [systems, setSystems] = useState<SolarSystem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [capacityFilter, setCapacityFilter] = useState<'all' | 'small' | 'medium' | 'large'>('all');
  const [sortBy, setSortBy] = useState<'capacity_asc' | 'capacity_desc' | 'price_asc' | 'price_desc' | 'newest'>('capacity_asc');

  // Modals state
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingSystem, setEditingSystem] = useState<SolarSystem | null>(null);
  const [viewingSystem, setViewingSystem] = useState<SolarSystem | null>(null);
  const [deletingSystem, setDeletingSystem] = useState<SolarSystem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchSystems = async () => {
    setLoading(true);
    try {
      const data = await api.getSolarSystems();
      setSystems(data);
    } catch (err) {
      console.error('Error fetching solar systems:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystems();

    const handleDataUpdate = () => fetchSystems();
    window.addEventListener('crm-data-updated', handleDataUpdate);
    return () => window.removeEventListener('crm-data-updated', handleDataUpdate);
  }, []);

  const handleOpenAdd = () => {
    setEditingSystem(null);
    setIsAddEditOpen(true);
  };

  const handleOpenEdit = (system: SolarSystem) => {
    setEditingSystem(system);
    setIsAddEditOpen(true);
  };

  const handleOpenView = (system: SolarSystem) => {
    setViewingSystem(system);
  };

  const confirmDelete = async () => {
    if (!deletingSystem) return;
    setIsDeleting(true);
    try {
      await api.deleteSolarSystem(deletingSystem.id);
      setSystems(prev => prev.filter(s => s.id !== deletingSystem.id));
      setDeletingSystem(null);
      window.dispatchEvent(new CustomEvent('crm-data-updated'));
    } catch (err: any) {
      alert(err.message || 'Failed to delete system');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered and sorted systems
  const filteredSystems = useMemo(() => {
    return systems
      .filter((s) => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = s.system_name?.toLowerCase().includes(q);
          const matchPanel = s.solar_panel_name?.toLowerCase().includes(q);
          const matchInverter = s.inverter_name?.toLowerCase().includes(q);
          const matchStructure = s.structure_name?.toLowerCase().includes(q);
          const matchBOS = s.bos_name?.toLowerCase().includes(q);
          if (!matchName && !matchPanel && !matchInverter && !matchStructure && !matchBOS) {
            return false;
          }
        }

        // Capacity Filter
        if (capacityFilter === 'small' && s.capacity_kw >= 3.0) return false;
        if (capacityFilter === 'medium' && (s.capacity_kw < 3.0 || s.capacity_kw > 5.0)) return false;
        if (capacityFilter === 'large' && s.capacity_kw <= 5.0) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'capacity_asc') return a.capacity_kw - b.capacity_kw;
        if (sortBy === 'capacity_desc') return b.capacity_kw - a.capacity_kw;
        if (sortBy === 'price_asc') return a.base_price - b.base_price;
        if (sortBy === 'price_desc') return b.base_price - a.base_price;
        if (sortBy === 'newest') return (b.id || 0) - (a.id || 0);
        return 0;
      });
  }, [systems, searchQuery, capacityFilter, sortBy]);

  // Aggregate stats
  const totalSystems = systems.length;
  const totalStock = systems.reduce((acc, s) => acc + (s.quantity || 0), 0);
  const avgCapacity = totalSystems > 0 ? (systems.reduce((acc, s) => acc + s.capacity_kw, 0) / totalSystems).toFixed(1) : '0';
  const minPrice = totalSystems > 0 ? Math.min(...systems.map(s => s.base_price)) : 0;
  const maxPrice = totalSystems > 0 ? Math.max(...systems.map(s => s.base_price)) : 0;

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="p-5 md:p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white font-display flex items-center gap-2">
                <span>Solar System Products & Pricing</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  {totalSystems} Packages
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Centralized solar package catalog, component specifications, hardware pricing, and central subsidies.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto flex-wrap">
          {onNavigateToQuotations && (
            <button
              onClick={onNavigateToQuotations}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Go to Quotations</span>
            </button>
          )}

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-md shadow-amber-500/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Solar System</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400 block font-medium">Configured Systems</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-white font-display">{totalSystems}</span>
            <span className="text-xs text-amber-400 font-semibold">Active Catalog</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400 block font-medium">Available Quantity / Stock</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-white font-display">{totalStock}</span>
            <span className="text-xs text-blue-400 font-semibold">Units ready</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400 block font-medium">Average System Capacity</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-white font-display">{avgCapacity} kW</span>
            <span className="text-xs text-emerald-400 font-semibold">On-Grid Rooftop</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400 block font-medium">Price Range (Base Hardware)</span>
          <div className="flex items-baseline gap-1.5 mt-1 truncate">
            <span className="text-base font-bold text-amber-300 font-display">
              ₹{minPrice.toLocaleString('en-IN')} - ₹{maxPrice.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by system name, panel brand, inverter..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-800/80 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500 transition-colors placeholder:text-slate-500"
          />
        </div>

        {/* Filters and Sorters */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700 rounded-xl px-2.5 py-1">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={capacityFilter}
              onChange={(e) => setCapacityFilter(e.target.value as any)}
              className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900 text-white">All Capacities</option>
              <option value="small" className="bg-slate-900 text-white">&lt; 3.0 kW</option>
              <option value="medium" className="bg-slate-900 text-white">3.0 - 5.0 kW</option>
              <option value="large" className="bg-slate-900 text-white">&gt; 5.0 kW</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700 rounded-xl px-2.5 py-1">
            <span className="text-xs text-slate-400 font-medium">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="capacity_asc" className="bg-slate-900 text-white">Capacity: Low to High</option>
              <option value="capacity_desc" className="bg-slate-900 text-white">Capacity: High to Low</option>
              <option value="price_asc" className="bg-slate-900 text-white">Price: Low to High</option>
              <option value="price_desc" className="bg-slate-900 text-white">Price: High to Low</option>
              <option value="newest" className="bg-slate-900 text-white">Recently Added</option>
            </select>
          </div>

          <button
            onClick={fetchSystems}
            title="Refresh Catalog"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Systems Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4 font-bold">System Name / Brand</th>
                <th className="py-3.5 px-3 font-bold">Price</th>
                <th className="py-3.5 px-3 font-bold">Capacity</th>
                <th className="py-3.5 px-3 font-bold">Solar Panel</th>
                <th className="py-3.5 px-3 font-bold">Inverter</th>
                <th className="py-3.5 px-3 font-bold">Structure</th>
                <th className="py-3.5 px-3 font-bold">BOS</th>
                <th className="py-3.5 px-3 font-bold">Quantity</th>
                <th className="py-3.5 px-3 font-bold">Warranty</th>
                <th className="py-3.5 px-3 font-bold">Subsidy</th>
                <th className="py-3.5 px-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={11} className="py-4 px-4">
                      <div className="h-6 rounded bg-slate-800/40 animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : filteredSystems.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-500">
                    No solar system products found. Click "Add Solar System" to configure your first package.
                  </td>
                </tr>
              ) : (
                filteredSystems.map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-slate-800/30 transition-colors group"
                  >
                    {/* System Name / Brand */}
                    <td className="py-3.5 px-4">
                      <div className="min-w-[150px]">
                        <button
                          onClick={() => handleOpenView(s)}
                          className="font-bold text-white hover:text-amber-400 transition-colors text-left block truncate max-w-[200px] cursor-pointer"
                        >
                          {s.system_name}
                        </button>
                        {s.description && (
                          <span className="text-[10px] text-slate-400 block truncate max-w-[200px]">
                            {s.description}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Price */}
                    <td className="py-3.5 px-3">
                      <span className="font-bold text-white font-mono whitespace-nowrap">
                        ₹{s.base_price.toLocaleString('en-IN')}
                      </span>
                    </td>

                    {/* Capacity (kW) */}
                    <td className="py-3.5 px-3">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 whitespace-nowrap inline-flex items-center gap-1 font-mono">
                        <Sun className="w-3 h-3" />
                        {s.capacity_kw} kW
                      </span>
                    </td>

                    {/* Solar Panel */}
                    <td className="py-3.5 px-3">
                      <span className="text-slate-200 block truncate max-w-[140px]" title={s.solar_panel_name}>
                        {s.solar_panel_name}
                      </span>
                    </td>

                    {/* Inverter */}
                    <td className="py-3.5 px-3">
                      <span className="text-slate-200 block truncate max-w-[140px]" title={s.inverter_name}>
                        {s.inverter_name}
                      </span>
                    </td>

                    {/* Structure */}
                    <td className="py-3.5 px-3">
                      <span className="text-slate-300 block truncate max-w-[130px]" title={s.structure_name}>
                        {s.structure_name}
                      </span>
                    </td>

                    {/* BOS */}
                    <td className="py-3.5 px-3">
                      <span className="text-slate-300 block truncate max-w-[130px]" title={s.bos_name}>
                        {s.bos_name}
                      </span>
                    </td>

                    {/* Quantity (Qty) */}
                    <td className="py-3.5 px-3">
                      <span className={`px-2 py-0.5 rounded-lg text-[11px] font-bold border font-mono whitespace-nowrap ${
                        s.quantity > 5
                          ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                          : s.quantity > 0
                          ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                          : 'bg-red-500/15 text-red-400 border-red-500/30'
                      }`}>
                        {s.quantity} Qty
                      </span>
                    </td>

                    {/* Warranty */}
                    <td className="py-3.5 px-3">
                      <span className="text-slate-300 block truncate max-w-[140px]" title={s.warranty}>
                        {s.warranty}
                      </span>
                    </td>

                    {/* Subsidy */}
                    <td className="py-3.5 px-3">
                      <span className="font-bold text-emerald-400 font-mono whitespace-nowrap">
                        {s.subsidy > 0 ? `₹${s.subsidy.toLocaleString('en-IN')}` : '—'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenView(s)}
                          title="View Details"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleOpenEdit(s)}
                          title="Edit System"
                          className="p-1.5 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-amber-500/15 transition-colors cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setDeletingSystem(s)}
                          title="Delete System"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit System Modal */}
      <AddEditSystemModal
        isOpen={isAddEditOpen}
        systemToEdit={editingSystem}
        onClose={() => {
          setIsAddEditOpen(false);
          setEditingSystem(null);
        }}
        onSuccess={() => {
          fetchSystems();
          window.dispatchEvent(new CustomEvent('crm-data-updated'));
        }}
      />

      {/* View System Details Modal */}
      <SystemDetailModal
        isOpen={Boolean(viewingSystem)}
        system={viewingSystem}
        onClose={() => setViewingSystem(null)}
        onEdit={(system) => {
          setViewingSystem(null);
          handleOpenEdit(system);
        }}
        onCreateQuotation={(system) => {
          setViewingSystem(null);
          if (onSelectSystemForQuotation) {
            onSelectSystemForQuotation(system);
          } else if (onNavigateToQuotations) {
            onNavigateToQuotations();
          }
        }}
      />

      {/* Delete Confirmation Modal */}
      {deletingSystem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white font-display">Delete Solar System</h4>
                <p className="text-xs text-slate-400">Confirm permanent deletion from catalog</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to delete <strong className="text-white">"{deletingSystem.system_name}"</strong> ({deletingSystem.capacity_kw} kW)?
            </p>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400">
              <strong className="text-amber-400 block mb-0.5">Safe Deletion Guarantee:</strong>
              Any existing customer quotations referencing this system will safely preserve their saved product specifications, capacity, hardware pricing, and central subsidies.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingSystem(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDelete}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-500 text-white transition-colors shadow-md shadow-red-600/20 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Deleting...' : 'Confirm Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
