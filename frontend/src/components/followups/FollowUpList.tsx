import React, { useState, useEffect } from 'react';
import {
  PhoneCall,
  Calendar as CalendarIcon,
  Clock,
  AlertCircle,
  CheckCircle2,
  Plus,
  Trash2,
  MessageSquare,
  Mail,
  MapPin,
  Users
} from 'lucide-react';
import { FollowUp } from '../../types';
import { api } from '../../services/api';

interface FollowUpListProps {
  onSelectLead: (id: number) => void;
  onOpenQuickAction: (action: 'lead' | 'followup' | 'survey' | 'quotation') => void;
}

export const FollowUpList: React.FC<FollowUpListProps> = ({
  onSelectLead,
  onOpenQuickAction
}) => {
  const [followups, setFollowups] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'all' | 'today' | 'overdue' | 'upcoming' | 'completed'>('today');

  const fetchFollowups = async () => {
    setLoading(true);
    try {
      const data = await api.getFollowups();
      setFollowups(data);
    } catch (e) {
      console.error('Error fetching follow-ups:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFollowups();

    const handleDataUpdate = () => {
      fetchFollowups();
    };
    window.addEventListener('crm-data-updated', handleDataUpdate);
    return () => {
      window.removeEventListener('crm-data-updated', handleDataUpdate);
    };
  }, []);

  const handleComplete = async (id: number) => {
    try {
      await api.completeFollowup(id);
      fetchFollowups();
      window.dispatchEvent(new CustomEvent('crm-data-updated'));
    } catch (e: any) {
      alert(e.message || 'Error completing follow-up');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this follow-up?')) return;
    try {
      await api.deleteFollowup(id);
      setFollowups(followups.filter(f => f.id !== id));
      window.dispatchEvent(new CustomEvent('crm-data-updated'));
    } catch (e: any) {
      alert(e.message || 'Error deleting follow-up');
    }
  };

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  const filteredItems = followups.filter(f => {
    const dStr = f.scheduled_date.slice(0, 10);
    const isPast = new Date(f.scheduled_date) < now;

    if (tab === 'today') {
      return f.status === 'pending' && dStr === todayStr;
    }
    if (tab === 'overdue') {
      return f.status === 'overdue' || (f.status === 'pending' && isPast && dStr !== todayStr);
    }
    if (tab === 'upcoming') {
      return f.status === 'pending' && !isPast && dStr !== todayStr;
    }
    if (tab === 'completed') {
      return f.status === 'completed';
    }
    return true;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'call': return <PhoneCall className="w-4 h-4 text-amber-400" />;
      case 'whatsapp': return <MessageSquare className="w-4 h-4 text-emerald-400" />;
      case 'email': return <Mail className="w-4 h-4 text-blue-400" />;
      case 'site_visit': return <MapPin className="w-4 h-4 text-cyan-400" />;
      case 'meeting': return <Users className="w-4 h-4 text-purple-400" />;
      default: return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-slate-900 border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white font-display">Sales Follow-up & Touchpoint Hub</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Never lose a solar deal. Track calls, WhatsApp check-ins, technical visits, and proposal reviews.
          </p>
        </div>

        <button
          onClick={() => onOpenQuickAction('followup')}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Schedule Follow-up</span>
        </button>
      </div>

      {/* Segmented Filter Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-900/60 p-1.5 rounded-2xl gap-1 overflow-x-auto">
        {[
          { id: 'today', label: "Today's Schedule", count: followups.filter(f => f.status === 'pending' && f.scheduled_date.slice(0, 10) === todayStr).length },
          { id: 'overdue', label: 'Overdue Follow-ups', count: followups.filter(f => f.status === 'overdue' || (f.status === 'pending' && new Date(f.scheduled_date) < now && f.scheduled_date.slice(0, 10) !== todayStr)).length },
          { id: 'upcoming', label: 'Upcoming Touchpoints', count: followups.filter(f => f.status === 'pending' && new Date(f.scheduled_date) > now).length },
          { id: 'completed', label: 'Completed', count: followups.filter(f => f.status === 'completed').length },
          { id: 'all', label: 'All Tasks', count: followups.length }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              tab === t.id
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span>{t.label}</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              tab === t.id ? 'bg-slate-950/20 text-slate-900' : 'bg-slate-800 text-slate-400'
            }`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Follow-up Items */}
      <div className="space-y-3">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-slate-800/40 animate-pulse" />
          ))
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-500 text-xs">
            No follow-ups in this view. Excellent work!
          </div>
        ) : (
          filteredItems.map(item => {
            const isCompleted = item.status === 'completed';

            return (
              <div
                key={item.id}
                className={`p-4 rounded-2xl bg-slate-900 border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isCompleted ? 'border-slate-800/60 opacity-60' : 'border-slate-800 hover:border-amber-500/40 shadow-sm'
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 shrink-0">
                    {getTypeIcon(item.follow_up_type)}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => onSelectLead(item.lead_id)}
                        className="text-sm font-bold text-white hover:text-amber-400 transition-colors truncate"
                      >
                        {item.lead_name}
                      </button>
                      <span className="text-xs text-slate-400">{item.lead_phone}</span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-800 text-amber-400">
                        {item.follow_up_type}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      {item.notes || 'Routine follow-up discussion regarding solar project layout and finance options.'}
                    </p>

                    <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400 flex-wrap">
                      <span className="flex items-center gap-1 text-slate-300">
                        <CalendarIcon className="w-3.5 h-3.5 text-amber-400" />
                        {new Date(item.scheduled_date).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      <span>•</span>
                      <span>Assigned to: <strong className="text-slate-200">{item.assigned_to_name || 'Sales Rep'}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {!isCompleted && (
                    <button
                      onClick={() => handleComplete(item.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30 transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Mark Done</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
