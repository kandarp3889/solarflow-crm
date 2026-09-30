import React, { useState, useEffect } from 'react';
import {
  Kanban as KanbanIcon,
  Plus,
  ArrowRight,
  MoveRight,
  Sun,
  Coins,
  MapPin,
  Calendar,
  Sparkles
} from 'lucide-react';
import { Lead } from '../../types';
import { LeadScoreBadge } from '../leads/LeadScoreBadge';
import { api } from '../../services/api';

interface KanbanBoardProps {
  onSelectLead: (id: number) => void;
  onOpenQuickAction: (action: 'lead' | 'followup' | 'survey' | 'quotation') => void;
  onOpenAIForLead: (leadId: number) => void;
}

const PIPELINE_COLUMNS = [
  { id: 'new_lead', label: 'New Lead', color: 'border-blue-500/40 text-blue-400 bg-blue-500/10' },
  { id: 'contacted', label: 'Contacted', color: 'border-indigo-500/40 text-indigo-400 bg-indigo-500/10' },
  { id: 'qualified', label: 'Qualified', color: 'border-amber-500/40 text-amber-400 bg-amber-500/10' },
  { id: 'survey_scheduled', label: 'Site Survey', color: 'border-purple-500/40 text-purple-400 bg-purple-500/10' },
  { id: 'survey_completed', label: 'Survey Done', color: 'border-cyan-500/40 text-cyan-400 bg-cyan-500/10' },
  { id: 'quotation_sent', label: 'Quotation Sent', color: 'border-orange-500/40 text-orange-400 bg-orange-500/10' },
  { id: 'negotiation', label: 'Negotiation', color: 'border-pink-500/40 text-pink-400 bg-pink-500/10' },
  { id: 'won', label: 'Deal Won', color: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' },
  { id: 'lost', label: 'Deal Lost', color: 'border-red-500/40 text-red-400 bg-red-500/10' }
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  onSelectLead,
  onOpenQuickAction,
  onOpenAIForLead
}) => {
  const [columnsData, setColumnsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedLeadId, setDraggedLeadId] = useState<number | null>(null);

  const fetchStages = async () => {
    setLoading(true);
    try {
      const data = await api.getPipelineStages();
      setColumnsData(data);
    } catch (e) {
      console.error('Error fetching stages:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStages();
  }, []);

  const handleMoveCard = async (leadId: number, newStage: string) => {
    try {
      await api.movePipelineCard(leadId, newStage);
      fetchStages();
    } catch (e: any) {
      alert(e.message || 'Error moving card');
    }
  };

  const handleDragStart = (e: React.DragEvent, leadId: number) => {
    setDraggedLeadId(leadId);
    e.dataTransfer.setData('text/plain', String(leadId));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    const leadIdStr = e.dataTransfer.getData('text/plain');
    if (leadIdStr) {
      const leadId = parseInt(leadIdStr);
      await handleMoveCard(leadId, stageId);
      setDraggedLeadId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-slate-900 border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white font-display flex items-center gap-2">
            <KanbanIcon className="w-5 h-5 text-amber-400" />
            <span>Interactive Sales Pipeline Kanban</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Drag and drop leads between stages or use quick-advance buttons to update opportunity progress.
          </p>
        </div>

        <button
          onClick={() => onOpenQuickAction('lead')}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Lead to Pipeline</span>
        </button>
      </div>

      {/* Kanban Horizontal Scroll Container */}
      <div className="flex gap-4 overflow-x-auto pb-6 pt-2">
        {PIPELINE_COLUMNS.map((colDef) => {
          const colData = columnsData.find(c => c.id === colDef.id) || { count: 0, total_value: 0, leads: [] };
          const colLeads: Lead[] = colData.leads || [];

          return (
            <div
              key={colDef.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, colDef.id)}
              className="flex flex-col w-72 shrink-0 rounded-2xl bg-slate-900/90 border border-slate-800/90 max-h-[75vh]"
            >
              {/* Column Header */}
              <div className="p-3.5 border-b border-slate-800 bg-slate-950/40 rounded-t-2xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-lg text-xs font-bold border ${colDef.color}`}>
                    {colDef.label}
                  </span>
                  <span className="text-xs font-bold text-slate-400">{colData.count}</span>
                </div>
                <span className="text-xs font-semibold text-emerald-400">
                  ₹{(colData.total_value / 100000).toFixed(1)}L
                </span>
              </div>

              {/* Cards List */}
              <div className="flex-1 p-2.5 space-y-2.5 overflow-y-auto min-h-[160px]">
                {colLeads.length === 0 ? (
                  <div className="h-32 border-2 border-dashed border-slate-800/80 rounded-xl flex items-center justify-center text-xs text-slate-500">
                    Drop leads here
                  </div>
                ) : (
                  colLeads.map((lead) => (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, lead.id)}
                      className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80 hover:border-amber-500/50 shadow-sm cursor-grab active:cursor-grabbing transition-all space-y-2.5 group"
                    >
                      {/* Top: Customer & Score */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <button
                            onClick={() => onSelectLead(lead.id)}
                            className="text-xs font-bold text-slate-100 hover:text-amber-400 text-left transition-colors truncate block"
                          >
                            {lead.full_name}
                          </button>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {lead.lead_id} • {lead.city}
                          </span>
                        </div>
                        <LeadScoreBadge score={lead.lead_score} category={lead.score_category} />
                      </div>

                      {/* Middle: System kW & Deal Value */}
                      <div className="flex items-center justify-between text-xs py-1 border-y border-slate-700/50">
                        <span className="text-amber-400 font-bold flex items-center gap-1">
                          <Sun className="w-3.5 h-3.5" />
                          {lead.recommended_kw} kW
                        </span>
                        <span className="text-emerald-400 font-bold">
                          ₹{lead.estimated_value.toLocaleString()}
                        </span>
                      </div>

                      {/* Bottom: Rep & Quick Actions */}
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="truncate max-w-[110px]">
                          {lead.assigned_to_name || 'Unassigned'}
                        </span>

                        <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100">
                          <button
                            onClick={() => onOpenAIForLead(lead.id)}
                            title="AI Qualify & WhatsApp Pitch"
                            className="p-1 rounded text-purple-400 hover:bg-purple-500/20"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                          </button>

                          {/* Quick Advance Dropdown */}
                          <select
                            value={lead.stage}
                            onChange={(e) => handleMoveCard(lead.id, e.target.value)}
                            className="text-[10px] bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-slate-300 focus:outline-none"
                          >
                            <option value="new_lead">New</option>
                            <option value="contacted">Contacted</option>
                            <option value="qualified">Qualified</option>
                            <option value="survey_scheduled">Survey</option>
                            <option value="quotation_sent">Quote</option>
                            <option value="negotiation">Negotiation</option>
                            <option value="won">Won</option>
                            <option value="lost">Lost</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
