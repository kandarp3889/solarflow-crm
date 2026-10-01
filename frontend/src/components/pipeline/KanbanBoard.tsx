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
  Sparkles,
  Sliders,
  Settings2,
  TrendingUp,
  Percent,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RefreshCw
} from 'lucide-react';
import { Lead, PipelineStageConfig } from '../../types';
import { LeadScoreBadge } from '../leads/LeadScoreBadge';
import { api } from '../../services/api';
import { PipelineStagesModal, getStageColorConfig } from './PipelineStagesModal';

interface KanbanBoardProps {
  onSelectLead: (id: number) => void;
  onOpenQuickAction: (action: 'lead' | 'followup' | 'survey' | 'quotation') => void;
  onOpenAIForLead: (leadId: number) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  onSelectLead,
  onOpenQuickAction,
  onOpenAIForLead
}) => {
  const [columnsData, setColumnsData] = useState<PipelineStageConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedLeadId, setDraggedLeadId] = useState<number | null>(null);
  const [dragOverStageKey, setDragOverStageKey] = useState<string | null>(null);
  const [isStageModalOpen, setIsStageModalOpen] = useState(false);

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

    const handleDataUpdate = () => {
      fetchStages();
    };
    window.addEventListener('crm-data-updated', handleDataUpdate);
    return () => {
      window.removeEventListener('crm-data-updated', handleDataUpdate);
    };
  }, []);

  const handleMoveCard = async (leadId: number, newStageKey: string) => {
    try {
      await api.movePipelineCard(leadId, newStageKey);
      fetchStages();
      window.dispatchEvent(new CustomEvent('crm-data-updated'));
    } catch (e: any) {
      alert(e.message || 'Error moving card');
    }
  };

  const handleDragStart = (e: React.DragEvent, leadId: number) => {
    setDraggedLeadId(leadId);
    e.dataTransfer.setData('text/plain', String(leadId));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, stageKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverStageKey !== stageKey) {
      setDragOverStageKey(stageKey);
    }
  };

  const handleDragLeave = (e: React.DragEvent, stageKey: string) => {
    if (dragOverStageKey === stageKey) {
      setDragOverStageKey(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, stageKey: string) => {
    e.preventDefault();
    setDragOverStageKey(null);
    const leadIdStr = e.dataTransfer.getData('text/plain');
    if (leadIdStr) {
      const leadId = parseInt(leadIdStr);
      await handleMoveCard(leadId, stageKey);
      setDraggedLeadId(null);
    }
  };

  // Aggregated Pipeline Metrics
  const totalLeads = columnsData.reduce((acc, col) => acc + (col.count || 0), 0);
  const totalPipelineValue = columnsData.reduce((acc, col) => acc + (col.total_value || 0), 0);

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <KanbanIcon className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-white font-display">
              Sales Pipeline Kanban
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
              {columnsData.length} Stages
            </span>
          </div>

          <p className="text-xs text-slate-400 mt-1">
            Drag and drop leads between customized pipeline stages or use quick-advance buttons to advance opportunities.
          </p>
        </div>

        {/* Action Controls & Metrics */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Quick Metrics */}
          <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
            <div>
              <span className="text-slate-500 text-[10px] block uppercase font-mono">Total Deals</span>
              <span className="font-bold text-white">{totalLeads}</span>
            </div>
            <div className="w-px h-6 bg-slate-800" />
            <div>
              <span className="text-slate-500 text-[10px] block uppercase font-mono">Value</span>
              <span className="font-bold text-emerald-400">₹{(totalPipelineValue / 100000).toFixed(1)}L</span>
            </div>
          </div>

          {/* Manage Stages Button */}
          <button
            onClick={() => setIsStageModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-amber-500/40 transition-all cursor-pointer shadow-sm"
            title="Configure columns, probabilities, and sequence"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span>Customize Stages</span>
          </button>

          {/* Add Lead to Pipeline Button */}
          <button
            onClick={() => onOpenQuickAction('lead')}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Lead</span>
          </button>
        </div>
      </div>

      {/* Kanban Board Horizontal Scroll Container */}
      <div className="flex gap-4 overflow-x-auto pb-6 pt-1 select-none">
        {loading && columnsData.length === 0 ? (
          <div className="w-full py-16 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
            <span>Loading dynamic sales pipeline stages...</span>
          </div>
        ) : (
          columnsData.map((colDef, idx) => {
            const stageKey = colDef.key || colDef.id;
            const colLeads: Lead[] = colDef.leads || [];
            const colorConfig = getStageColorConfig(colDef.color);
            const isDragOver = dragOverStageKey === stageKey;

            return (
              <div
                key={stageKey}
                onDragOver={(e) => handleDragOver(e, stageKey)}
                onDragLeave={(e) => handleDragLeave(e, stageKey)}
                onDrop={(e) => handleDrop(e, stageKey)}
                className={`flex flex-col w-72 shrink-0 rounded-2xl bg-slate-900/90 border transition-all max-h-[75vh] ${
                  isDragOver
                    ? 'border-amber-500 ring-2 ring-amber-500/20 bg-slate-900'
                    : 'border-slate-800/90'
                }`}
              >
                {/* Column Header */}
                <div className="p-3.5 border-b border-slate-800 bg-slate-950/50 rounded-t-2xl flex items-center justify-between gap-2">
                  <div className="min-w-0 flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-lg text-xs font-bold border truncate ${colorConfig.badge}`}
                      title={colDef.label}
                    >
                      {colDef.label}
                    </span>
                    <span className="text-xs font-bold text-slate-400 shrink-0 font-mono">
                      {colDef.count ?? colLeads.length}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-semibold text-emerald-400 font-mono">
                      ₹{((colDef.total_value || 0) / 100000).toFixed(1)}L
                    </span>

                    <button
                      onClick={() => setIsStageModalOpen(true)}
                      title="Edit stage settings"
                      className="p-1 rounded text-slate-500 hover:text-amber-400 hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <Settings2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Cards List */}
                <div className="flex-1 p-2.5 space-y-2.5 overflow-y-auto min-h-[180px]">
                  {colLeads.length === 0 ? (
                    <div
                      className={`h-32 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-xs transition-colors ${
                        isDragOver
                          ? 'border-amber-500/60 bg-amber-500/5 text-amber-300 font-semibold'
                          : 'border-slate-800/80 text-slate-500'
                      }`}
                    >
                      <span>{isDragOver ? 'Drop card here' : 'No deals in this stage'}</span>
                    </div>
                  ) : (
                    colLeads.map((lead) => (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, lead.id)}
                        className={`p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80 hover:border-amber-500/50 shadow-sm cursor-grab active:cursor-grabbing transition-all space-y-2.5 group ${
                          draggedLeadId === lead.id ? 'opacity-40 scale-95 border-amber-500' : ''
                        }`}
                      >
                        {/* Top: Customer & Score */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <button
                              onClick={() => onSelectLead(lead.id)}
                              className="text-xs font-bold text-slate-100 hover:text-amber-400 text-left transition-colors truncate block max-w-[170px]"
                            >
                              {lead.full_name}
                            </button>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {lead.lead_id} {lead.city ? `• ${lead.city}` : ''}
                            </span>
                          </div>
                          <LeadScoreBadge score={lead.lead_score} category={lead.score_category} />
                        </div>

                        {/* Middle: System kW & Deal Value */}
                        <div className="flex items-center justify-between text-xs py-1 border-y border-slate-700/50">
                          <span className="text-amber-400 font-bold flex items-center gap-1">
                            <Sun className="w-3.5 h-3.5" />
                            {lead.recommended_kw || lead.interested_kw || 3.0} kW
                          </span>
                          <span className="text-emerald-400 font-bold font-mono">
                            ₹{(lead.estimated_value || 0).toLocaleString()}
                          </span>
                        </div>

                        {/* Bottom: Rep & Quick Advance Actions */}
                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                          <span className="truncate max-w-[100px]" title={lead.assigned_to_name || 'Unassigned'}>
                            {lead.assigned_to_name || 'Unassigned'}
                          </span>

                          <div className="flex items-center gap-1.5 opacity-90 group-hover:opacity-100">
                            <button
                              onClick={() => onOpenAIForLead(lead.id)}
                              title="AI Qualify & WhatsApp Pitch"
                              className="p-1 rounded text-purple-400 hover:bg-purple-500/20 transition-colors"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                            </button>

                            {/* Dynamic Quick Advance Dropdown */}
                            <select
                              value={lead.stage}
                              onChange={(e) => handleMoveCard(lead.id, e.target.value)}
                              className="text-[10px] bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-slate-300 focus:outline-none focus:border-amber-500 cursor-pointer max-w-[105px] truncate"
                              title="Advance to stage"
                            >
                              {columnsData.map((c) => {
                                const cKey = c.key || c.id;
                                return (
                                  <option key={cKey} value={cKey} className="bg-slate-900 text-slate-200">
                                    {c.label}
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Quick Add Stage Column Button at End of Kanban */}
        {!loading && (
          <div
            onClick={() => setIsStageModalOpen(true)}
            className="w-64 shrink-0 rounded-2xl border-2 border-dashed border-slate-800/80 hover:border-amber-500/50 bg-slate-900/40 hover:bg-slate-900/80 p-6 flex flex-col items-center justify-center text-center gap-2.5 transition-all cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 group-hover:border-amber-500/50 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-300 group-hover:text-amber-400 transition-colors block">
                Add New Pipeline Stage
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Customize solar funnel steps for your company
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Pipeline Stages Modal */}
      <PipelineStagesModal
        isOpen={isStageModalOpen}
        onClose={() => setIsStageModalOpen(false)}
        onStagesUpdated={() => {
          fetchStages();
        }}
        currentStages={columnsData}
      />
    </div>
  );
};
