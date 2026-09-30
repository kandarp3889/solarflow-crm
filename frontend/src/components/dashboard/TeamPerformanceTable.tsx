import React from 'react';
import { Trophy, Award, TrendingUp } from 'lucide-react';
import { TeamPerformanceItem } from '../../types';

interface TeamPerformanceTableProps {
  data: TeamPerformanceItem[];
  loading: boolean;
}

export const TeamPerformanceTable: React.FC<TeamPerformanceTableProps> = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
        <div className="h-48 rounded-xl bg-slate-800/40 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-white font-display">Sales Representatives Leaderboard</h3>
          <p className="text-xs text-slate-400">Team performance across inquiries, proposals, and won revenue</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400">
              <th className="pb-3 font-semibold">Rank & Salesperson</th>
              <th className="pb-3 font-semibold text-center">Leads</th>
              <th className="pb-3 font-semibold text-center">Qualified</th>
              <th className="pb-3 font-semibold text-center">Quotations</th>
              <th className="pb-3 font-semibold text-center">Won Deals</th>
              <th className="pb-3 font-semibold text-right">Revenue Booked</th>
              <th className="pb-3 font-semibold text-right">Win Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {data.map((rep, idx) => {
              const isTop = idx === 0;
              return (
                <tr key={rep.salesperson_id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 text-center font-bold text-slate-400">
                        {isTop ? <Trophy className="w-4 h-4 text-amber-400 mx-auto" /> : `#${idx + 1}`}
                      </span>
                      <img
                        src={rep.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                        alt={rep.name}
                        className="w-7 h-7 rounded-full object-cover border border-slate-700"
                      />
                      <span className="font-semibold text-slate-200">{rep.name}</span>
                    </div>
                  </td>
                  <td className="py-3 text-center text-slate-300">{rep.leads_assigned}</td>
                  <td className="py-3 text-center text-purple-400 font-medium">{rep.qualified}</td>
                  <td className="py-3 text-center text-amber-400 font-medium">{rep.quotations}</td>
                  <td className="py-3 text-center">
                    <span className="px-2 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {rep.won}
                    </span>
                  </td>
                  <td className="py-3 text-right font-bold text-slate-100">
                    ₹{rep.revenue.toLocaleString()}
                  </td>
                  <td className="py-3 text-right">
                    <span className="font-semibold text-emerald-400">{rep.conversion_rate}%</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
