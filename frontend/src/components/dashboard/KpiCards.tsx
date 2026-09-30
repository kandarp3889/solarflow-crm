import React from 'react';
import {
  Users,
  UserPlus,
  CheckCircle,
  ClipboardCheck,
  FileSpreadsheet,
  Trophy,
  XCircle,
  TrendingUp,
  Coins,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { DashboardStats } from '../../types';

interface KpiCardsProps {
  stats: DashboardStats | null;
  loading: boolean;
}

export const KpiCards: React.FC<KpiCardsProps> = ({ stats, loading }) => {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
        {[...Array(9)].map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-slate-800/40 animate-pulse border border-slate-800" />
        ))}
      </div>
    );
  }

  const items = [
    {
      data: stats.total_leads,
      icon: Users,
      accent: 'text-amber-400 bg-amber-400/10 border-amber-400/20'
    },
    {
      data: stats.new_leads,
      icon: UserPlus,
      accent: 'text-blue-400 bg-blue-400/10 border-blue-400/20'
    },
    {
      data: stats.qualified_leads,
      icon: CheckCircle,
      accent: 'text-purple-400 bg-purple-400/10 border-purple-400/20'
    },
    {
      data: stats.site_surveys,
      icon: ClipboardCheck,
      accent: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20'
    },
    {
      data: stats.quotations_sent,
      icon: FileSpreadsheet,
      accent: 'text-orange-400 bg-orange-400/10 border-orange-400/20'
    },
    {
      data: stats.won_deals,
      icon: Trophy,
      accent: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
    },
    {
      data: stats.lost_deals,
      icon: XCircle,
      accent: 'text-red-400 bg-red-400/10 border-red-400/20'
    },
    {
      data: stats.total_pipeline_value,
      icon: Coins,
      accent: 'text-amber-300 bg-amber-500/10 border-amber-500/20'
    },
    {
      data: stats.expected_revenue,
      icon: TrendingUp,
      accent: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
      {items.map((item, index) => {
        const Icon = item.icon;
        const d = item.data;
        const isUp = d.change_pct >= 0;

        return (
          <div
            key={index}
            className="p-4 rounded-2xl bg-[#0d1711] border border-[#1e3423] hover:border-[#FEC426]/40 transition-all shadow-sm flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 truncate">{d.label}</span>
              <div className={`p-2 rounded-xl border ${item.accent} transition-transform group-hover:scale-105`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-2">
              <h3 className="text-xl md:text-2xl font-bold text-white tracking-tight font-display">
                {d.value}
              </h3>
              <div className="flex items-center gap-1.5 mt-1">
                <span
                  className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
                    isUp ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {isUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                  {Math.abs(d.change_pct)}%
                </span>
                <span className="text-[11px] text-slate-500 truncate">{d.description || 'vs last month'}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
