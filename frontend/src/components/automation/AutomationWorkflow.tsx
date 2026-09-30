import React, { useState, useEffect } from 'react';
import {
  Zap,
  Plus,
  ToggleLeft,
  ToggleRight,
  Clock,
  MessageSquare,
  Bell,
  CheckCircle,
  X,
  Play
} from 'lucide-react';
import { AutomationRule } from '../../types';
import { api } from '../../services/api';

export const AutomationWorkflow: React.FC = () => {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRule, setNewRule] = useState({
    name: '',
    description: '',
    trigger_event: 'lead_created',
    action_type: 'create_followup',
    followup_type: 'call',
    days_offset: 1
  });

  const fetchRules = async () => {
    setLoading(true);
    try {
      const data = await api.getAutomationRules();
      setRules(data);
    } catch (e) {
      console.error('Error fetching rules:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleToggle = async (id: number) => {
    try {
      const res = await api.toggleAutomationRule(id);
      setRules(rules.map(r => r.id === id ? { ...r, is_active: res.is_active } : r));
    } catch (e: any) {
      alert(e.message || 'Error toggling automation rule');
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createAutomationRule({
        name: newRule.name,
        description: newRule.description,
        trigger_event: newRule.trigger_event,
        conditions: {},
        actions: [
          {
            type: newRule.action_type,
            followup_type: newRule.followup_type,
            days_offset: newRule.days_offset,
            notes: `Auto triggered by ${newRule.name}`
          }
        ]
      });
      setIsModalOpen(false);
      setNewRule({
        name: '',
        description: '',
        trigger_event: 'lead_created',
        action_type: 'create_followup',
        followup_type: 'call',
        days_offset: 1
      });
      fetchRules();
      alert('Automation rule created and activated!');
    } catch (e: any) {
      alert(e.message || 'Error creating rule');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-slate-900 border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white font-display flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <span>Workflow Automation & Auto-Responder Rules</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure automatic sales rep assignment, WhatsApp introductory messages, and quotation follow-up cadences.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Workflow</span>
        </button>
      </div>

      {/* Rules List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="h-44 rounded-2xl bg-slate-800/40 animate-pulse" />
          ))
        ) : (
          rules.map((r) => (
            <div
              key={r.id}
              className={`p-5 rounded-2xl bg-slate-900 border transition-all flex flex-col justify-between space-y-4 ${
                r.is_active ? 'border-slate-800 hover:border-amber-500/40 shadow-sm' : 'border-slate-800/40 opacity-60'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>{r.name}</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      {r.description || 'Automated sales workflow.'}
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggle(r.id)}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    {r.is_active ? (
                      <ToggleRight className="w-7 h-7 text-amber-500" />
                    ) : (
                      <ToggleLeft className="w-7 h-7 text-slate-600" />
                    )}
                  </button>
                </div>

                {/* Workflow Trigger -> Action pills */}
                <div className="mt-4 p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-1.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400">When:</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-300 font-mono font-bold">
                      {r.trigger_event}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Then:</span>
                    <span className="text-slate-300 font-medium">
                      {(r.actions || []).length} Automated Actions (Follow-up + WhatsApp + Notifications)
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${r.is_active ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                  <span>{r.is_active ? 'Active & Monitoring' : 'Paused'}</span>
                </span>
                <span className="text-[11px] text-slate-500">Live Production Trigger</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* New Workflow Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white font-display">Create Solar Automation Rule</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRule} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Workflow Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Inactive Lead Re-engagement"
                  value={newRule.name}
                  onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Trigger Event *</label>
                <select
                  value={newRule.trigger_event}
                  onChange={(e) => setNewRule({ ...newRule, trigger_event: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                >
                  <option value="lead_created">WHEN New Lead Arrives</option>
                  <option value="stage_changed">WHEN Stage Changes</option>
                  <option value="quotation_sent">WHEN Quotation is Dispatched</option>
                  <option value="survey_completed">WHEN Site Survey is Completed</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Action to Execute</label>
                <select
                  value={newRule.action_type}
                  onChange={(e) => setNewRule({ ...newRule, action_type: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                >
                  <option value="create_followup">Schedule Follow-up Task</option>
                  <option value="send_notification">Send Rep Notification Alert</option>
                  <option value="log_activity">Log CRM Activity</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Days Offset</label>
                  <input
                    type="number"
                    min="0"
                    max="14"
                    value={newRule.days_offset}
                    onChange={(e) => setNewRule({ ...newRule, days_offset: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Follow-up Channel</label>
                  <select
                    value={newRule.followup_type}
                    onChange={(e) => setNewRule({ ...newRule, followup_type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                  >
                    <option value="call">Phone Call</option>
                    <option value="whatsapp">WhatsApp Check-in</option>
                    <option value="email">Email</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-400 hover:text-white rounded-xl bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl shadow-md shadow-amber-500/20"
                >
                  Activate Workflow
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
