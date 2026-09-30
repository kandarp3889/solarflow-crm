import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip
} from 'recharts';
import { LeadSourceItem } from '../../types';

interface LeadSourcesChartProps {
  data: LeadSourceItem[];
  loading: boolean;
}

const COLORS = [
  '#106828', // True Sun Forest Green (Website)
  '#FEC426', // True Sun Solar Gold (Referral)
  '#25D366', // WhatsApp Green
  '#3b82f6', // Google Ads Blue
  '#1877F2', // Facebook Blue
  '#ec4899', // Instagram Pink
  '#f97316', // Phone Orange
  '#64748b'  // Manual
];

export const LeadSourcesChart: React.FC<LeadSourcesChartProps> = ({ data, loading }) => {
  return (
    <div className="p-5 rounded-2xl bg-[#0d1711] border border-[#1e3423] flex flex-col justify-between shadow-sm">
      <div>
        <h3 className="text-sm font-bold text-white font-display">Lead Acquisition Sources</h3>
        <p className="text-xs text-slate-400">Distribution across digital & referral channels</p>
      </div>

      {loading ? (
        <div className="h-64 rounded-xl bg-slate-800/40 animate-pulse" />
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-4 my-2">
          <div className="h-56 w-full sm:w-1/2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="count"
                >
                  {data.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any, name: any, item: any) => [
                    `${val} leads (${item.payload.percentage}%)`,
                    item.payload.source
                  ]}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    fontSize: '12px',
                    color: '#f8fafc'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Sources List Legend */}
          <div className="w-full sm:w-1/2 space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {data.map((item, idx) => (
              <div key={item.source} className="flex items-center justify-between text-xs py-1 border-b border-slate-800/60 last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                  />
                  <span className="text-slate-300 font-medium truncate">{item.source}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-slate-100 font-bold">{item.count}</span>
                  <span className="text-slate-400 text-[11px] w-10 text-right">{item.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex justify-between">
        <span>Highest Converting: <strong className="text-emerald-400">Referral (42%)</strong></span>
        <span>Top Inbound: <strong className="text-amber-400">Website & WhatsApp</strong></span>
      </div>
    </div>
  );
};
