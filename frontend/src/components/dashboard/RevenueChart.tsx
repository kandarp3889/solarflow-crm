import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { RevenueBreakdownItem } from '../../types';

interface RevenueChartProps {
  data: RevenueBreakdownItem[];
  loading: boolean;
}

export const RevenueChart: React.FC<RevenueChartProps> = ({ data, loading }) => {
  return (
    <div className="p-5 rounded-2xl bg-[#0d1711] border border-[#1e3423] flex flex-col justify-between shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-white font-display">Revenue Forecast & Booking</h3>
          <p className="text-xs text-slate-400">Quotation value vs actual signed contracts vs expected closing</p>
        </div>
      </div>

      {loading ? (
        <div className="h-64 rounded-xl bg-[#132218]/50 animate-pulse" />
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1b2e21" vertical={false} />
              <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                tickFormatter={(val) => `₹${(val / 100000).toFixed(0)}L`}
              />
              <Tooltip
                formatter={(val: any) => [`₹${Number(val).toLocaleString()}`, '']}
                contentStyle={{
                  backgroundColor: '#0d1711',
                  borderColor: '#1e3423',
                  borderRadius: '0.75rem',
                  fontSize: '12px',
                  color: '#f8fafc'
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                iconType="circle"
              />
              <Bar dataKey="quotation_value" name="Quotation Value" fill="#38bdf8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expected_revenue" name="Expected Closing" fill="#FEC426" radius={[4, 4, 0, 0]} />
              <Bar dataKey="won_revenue" name="Won Revenue" fill="#106828" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="pt-3 mt-2 border-t border-[#1e3423] text-xs text-slate-400 flex justify-between">
        <span>YTD Won Revenue: <strong className="text-emerald-400">₹48.6 Lakhs</strong></span>
        <span>Avg Ticket Size: <strong className="text-amber-400">₹3.85 Lakhs (7.5 kW)</strong></span>
      </div>
    </div>
  );
};
