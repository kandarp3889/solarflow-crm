import React from 'react';
import {
  Clock,
  AlertCircle,
  Flame,
  Activity,
  PhoneCall,
  Calendar,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { FollowUp, Lead } from '../../types';

interface TasksAndActivitiesProps {
  followups: FollowUp[];
  recentLeads: Lead[];
  onSelectLead: (id: number) => void;
  onOpenQuickAction: (action: 'lead' | 'followup' | 'survey' | 'quotation') => void;
  onCompleteFollowup: (id: number) => void;
}

export const TasksAndActivities: React.FC<TasksAndActivitiesProps> = ({
  followups,
  recentLeads,
  onSelectLead,
  onOpenQuickAction,
  onCompleteFollowup
}) => {
  const overdueItems = followups.filter(f => f.status === 'overdue' || (f.status === 'pending' && new Date(f.scheduled_date) < new Date()));
  const todayItems = followups.filter(f => f.status === 'pending');

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {/* Widget 1: Today's Tasks & Follow-ups */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Today's Follow-up Schedule</span>
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400">
              {todayItems.length} Due
            </span>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {todayItems.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">All caught up for today!</p>
            ) : (
              todayItems.slice(0, 5).map(item => (
                <div key={item.id} className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-800 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-200 truncate">{item.lead_name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{item.notes || 'Follow-up call'}</p>
                    <span className="text-[10px] text-amber-400 font-medium">
                      {new Date(item.scheduled_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <button
                    onClick={() => onCompleteFollowup(item.id)}
                    title="Mark Done"
                    className="p-1 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors shrink-0"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <button
          onClick={() => onOpenQuickAction('followup')}
          className="mt-3 pt-3 border-t border-slate-800 text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center justify-center gap-1"
        >
          <span>Schedule New Task</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Widget 2: Overdue Action Alerts */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span>Overdue Follow-ups</span>
            </h3>
            {overdueItems.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-500/10 text-red-400">
                {overdueItems.length} Overdue
              </span>
            )}
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {overdueItems.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No overdue follow-ups. Outstanding!</p>
            ) : (
              overdueItems.slice(0, 5).map(item => (
                <div key={item.id} className="p-2.5 rounded-xl bg-red-500/5 border border-red-500/20 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-red-200 truncate">{item.lead_name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{item.lead_phone}</p>
                    <span className="text-[10px] text-red-400 font-medium">
                      Scheduled: {new Date(item.scheduled_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <button
                    onClick={() => onCompleteFollowup(item.id)}
                    className="px-2 py-1 rounded-md text-[10px] font-bold bg-red-500 text-slate-950 hover:bg-red-400 shrink-0"
                  >
                    Resolve
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 text-center">
          Overdue follow-ups reduce conversion by <strong className="text-red-400">45%</strong>
        </div>
      </div>

      {/* Widget 3: Recent Solar Inquiries */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-400" />
              <span>Recent Solar Inquiries</span>
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-500/10 text-orange-400">
              Active
            </span>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {recentLeads.slice(0, 5).map(lead => (
              <div
                key={lead.id}
                onClick={() => onSelectLead(lead.id)}
                className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-800 hover:border-amber-500/40 cursor-pointer transition-all flex items-center justify-between"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-200 truncate">{lead.full_name}</p>
                  <p className="text-[11px] text-slate-400 truncate">
                    ₹{lead.monthly_bill.toLocaleString()}/mo • {lead.city || 'Location N/A'}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-bold text-amber-400">
                    {lead.recommended_kw} kW
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => onOpenQuickAction('lead')}
          className="mt-3 pt-3 border-t border-slate-800 text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center justify-center gap-1"
        >
          <span>Capture New Solar Lead</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
