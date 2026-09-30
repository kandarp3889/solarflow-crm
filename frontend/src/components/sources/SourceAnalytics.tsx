import React, { useState, useEffect } from 'react';
import {
  PieChart,
  TrendingUp,
  DollarSign,
  Users,
  Award,
  ArrowUpRight
} from 'lucide-react';
import { api } from '../../services/api';
import { LeadSourceAnalytics } from '../../types';

export const SourceAnalytics: React.FC = () => {
  const [sources, setSources] = useState<LeadSourceAnalytics[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSources = async () => {
    setLoading(true);
    try {
      const data = await api.getSources();
      setSources(data);
    } catch (e) {
      console.error('Error fetching source analytics:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  const totalSpend = sources.reduce((sum, s) => sum + (s.total_spend || 0), 0);
  const totalRevenue = sources.reduce((sum, s) => sum + (s.revenue || 0), 0);
  const totalLeads = sources.reduce((sum, s) => sum + (s.leads || 0), 0);
  const totalWon = sources.reduce((sum, s) => sum + (s.won_deals || 0), 0);
  const overallROI = totalSpend > 0 ? ((totalRevenue - totalSpend) / totalSpend) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-slate-900 border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white font-display flex items-center gap-2">
            <PieChart className="w-5 h-5 text-amber-400" />
            <span>Lead Acquisition Sources & Marketing ROI</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Track customer acquisition costs (CAC), cost per lead (CPL), and channel conversion efficiency.
          </p>
        </div>
      </div>

      {/* Aggregate KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400">Total Marketing Spend</span>
          <p className="text-xl font-bold text-white mt-1 font-display">₹{totalSpend.toLocaleString()}</p>
          <span className="text-[11px] text-slate-500">Across 8 channels</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400">Generated Solar Revenue</span>
          <p className="text-xl font-bold text-emerald-400 mt-1 font-display">₹{totalRevenue.toLocaleString()}</p>
          <span className="text-[11px] text-emerald-500">Signed contracts</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400">Blended CAC</span>
          <p className="text-xl font-bold text-amber-400 mt-1 font-display">
            ₹{totalWon > 0 ? Math.round(totalSpend / totalWon).toLocaleString() : 'N/A'}
          </p>
          <span className="text-[11px] text-slate-500">Per won installation</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400">Return on Ad Spend (ROAS)</span>
          <p className="text-xl font-bold text-purple-400 mt-1 font-display">
            {totalSpend > 0 ? (totalRevenue / totalSpend).toFixed(1) : '0'}x
          </p>
          <span className="text-[11px] text-purple-400">Revenue / Spend</span>
        </div>
      </div>

      {/* Analytics Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Channel Source</th>
                <th className="py-3.5 px-3 text-center">Inbound Leads</th>
                <th className="py-3.5 px-3 text-center">Qualified</th>
                <th className="py-3.5 px-3 text-center">Quotations</th>
                <th className="py-3.5 px-3 text-center">Won Deals</th>
                <th className="py-3.5 px-3 text-right">Revenue</th>
                <th className="py-3.5 px-3 text-right">Win Rate</th>
                <th className="py-3.5 px-3 text-right">Cost Per Lead</th>
                <th className="py-3.5 px-3 text-right">CAC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={9} className="py-4 px-4">
                      <div className="h-5 rounded bg-slate-800/40 animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : (
                sources.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-200">
                      {s.name}
                    </td>
                    <td className="py-3.5 px-3 text-center text-slate-300 font-semibold">{s.leads}</td>
                    <td className="py-3.5 px-3 text-center text-purple-400 font-medium">{s.qualified}</td>
                    <td className="py-3.5 px-3 text-center text-amber-400 font-medium">{s.quotations}</td>
                    <td className="py-3.5 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {s.won_deals}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right font-bold text-slate-100">
                      ₹{s.revenue.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-3 text-right font-semibold text-emerald-400">
                      {s.conversion_rate}%
                    </td>
                    <td className="py-3.5 px-3 text-right text-slate-300">
                      ₹{s.cost_per_lead}
                    </td>
                    <td className="py-3.5 px-3 text-right font-bold text-amber-400">
                      ₹{s.cac ? s.cac.toLocaleString() : 'N/A'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
