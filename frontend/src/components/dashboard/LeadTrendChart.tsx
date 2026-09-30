import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { LeadTrendItem } from '../../types';

interface LeadTrendChartProps {
  data: LeadTrendItem[];
  days: number;
  setDays: (days: number) => void;
  loading: boolean;
}

export const LeadTrendChart: React.FC<LeadTrendChartProps> = ({
  data,
  days,
  setDays,
  loading
}) => {
  return (
    <div className="p-5 rounded-2xl bg-[#0d1711] border border-[#1e3423] flex flex-col justify-between shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-bold text-white font-display">Lead Volume & Qualification Trend</h3>
          <p className="text-xs text-slate-400">Leads received vs qualified vs won installations</p>
        </div>

        {/* Time Filters */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#132218] border border-[#233d2a] self-start sm:self-auto">
          {[
            { label: '7D', value: 7 },
            { label: '30D', value: 30 },
            { label: '90D', value: 90 },
          ].map((btn) => (
            <button
              key={btn.value}
              onClick={() => setDays(btn.value)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                days === btn.value
                  ? 'bg-[#FEC426] text-[#0a110c] shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-64 rounded-xl bg-[#132218]/50 animate-pulse" />
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FEC426" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#FEC426" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorQualified" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorWon" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#106828" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#106828" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1b2e21" vertical={false} />
              <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0d1711',
                  borderColor: '#1e3423',
                  borderRadius: '0.75rem',
                  fontSize: '12px',
                  color: '#f8fafc',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                }}
              />
              <Area
                type="monotone"
                dataKey="leads_received"
                name="Leads Ingested"
                stroke="#FEC426"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorLeads)"
              />
              <Area
                type="monotone"
                dataKey="qualified_leads"
                name="Qualified"
                stroke="#38bdf8"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorQualified)"
              />
              <Area
                type="monotone"
                dataKey="won_leads"
                name="Deals Won"
                stroke="#106828"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorWon)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-3 pt-3 border-t border-[#1e3423] text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FEC426]" />
          <span className="text-slate-300">Total Leads</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8]" />
          <span className="text-slate-300">Qualified</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#106828]" />
          <span className="text-slate-300">Deals Won</span>
        </div>
      </div>
    </div>
  );
};
