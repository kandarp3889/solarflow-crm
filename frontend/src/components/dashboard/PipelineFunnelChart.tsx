import React from 'react';
import { ChevronRight } from 'lucide-react';
import { FunnelStageItem } from '../../types';

interface PipelineFunnelChartProps {
  data: FunnelStageItem[];
  loading: boolean;
}

const STAGE_COLORS: Record<string, { bar: string; text: string; bg: string }> = {
  new_lead: { bar: 'bg-blue-500', text: 'text-blue-400', bg: 'bg-blue-500/10' },
  contacted: { bar: 'bg-indigo-500', text: 'text-indigo-400', bg: 'bg-indigo-500/10' },
  qualified: { bar: 'bg-[#FEC426]', text: 'text-[#FEC426]', bg: 'bg-[#FEC426]/10' },
  survey_scheduled: { bar: 'bg-purple-500', text: 'text-purple-400', bg: 'bg-purple-500/10' },
  quotation_sent: { bar: 'bg-orange-500', text: 'text-orange-400', bg: 'bg-orange-500/10' },
  negotiation: { bar: 'bg-pink-500', text: 'text-pink-400', bg: 'bg-pink-500/10' },
  won: { bar: 'bg-[#106828]', text: 'text-emerald-400', bg: 'bg-[#106828]/20' }
};

export const PipelineFunnelChart: React.FC<PipelineFunnelChartProps> = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="p-5 rounded-2xl bg-[#0d1711] border border-[#1e3423]">
        <div className="h-64 rounded-xl bg-[#132218]/40 animate-pulse" />
      </div>
    );
  }

  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <div className="p-5 rounded-2xl bg-[#0d1711] border border-[#1e3423] flex flex-col justify-between shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-white font-display">Sales Pipeline Velocity & Funnel</h3>
          <p className="text-xs text-slate-400">Step-by-step conversion from inquiry to signed contract</p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          Healthy Velocity
        </span>
      </div>

      <div className="space-y-2.5">
        {data.map((stage, idx) => {
          const styling = STAGE_COLORS[stage.stage] || {
            bar: 'bg-amber-500',
            text: 'text-amber-400',
            bg: 'bg-amber-500/10'
          };
          const pctWidth = Math.max(12, Math.round((stage.count / maxCount) * 100));

          return (
            <div key={stage.stage} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${styling.bar}`} />
                  {stage.label}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 text-[11px]">
                    ₹{(stage.value / 100000).toFixed(1)}L pipeline
                  </span>
                  <span className="font-bold text-white">{stage.count} leads</span>
                  <span className={`text-[11px] font-semibold w-10 text-right ${styling.text}`}>
                    {stage.conversion_rate}%
                  </span>
                </div>
              </div>

              {/* Funnel Progress Bar */}
              <div className="h-2.5 w-full bg-slate-800/80 rounded-full overflow-hidden flex">
                <div
                  className={`h-full rounded-full ${styling.bar} transition-all duration-500`}
                  style={{ width: `${pctWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-3 mt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <span>Inquiry to Survey: <strong className="text-white">48 hrs</strong> avg</span>
        <span>Survey to Quotation: <strong className="text-white">24 hrs</strong> avg</span>
        <span>Overall Win Rate: <strong className="text-emerald-400">28.4%</strong></span>
      </div>
    </div>
  );
};
