import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Download,
  Plus,
  Users,
  ChevronRight,
  Phone,
  MessageSquare,
  Trash2,
  CheckSquare,
  Square,
  ArrowUpDown,
  Sparkles,
  Edit,
  FileText,
  CheckCircle2,
  Clock,
  Layers
} from 'lucide-react';
import { Lead } from '../../types';
import { api } from '../../services/api';
import { EditLeadModal } from './EditLeadModal';
import { getStageColorConfig } from '../pipeline/PipelineStagesModal';
import { LoanProcessModal } from '../loans/LoanProcessModal';
import { getStatusBadgeColor } from '../loans/LoanProcessSection';
import { formatISTDate, formatISTDateTime, getISTTodayString } from '../../utils/date';

interface LeadsPageProps {
  onSelectLead: (id: number) => void;
  onOpenQuickAction: (action: 'lead' | 'followup' | 'survey' | 'quotation') => void;
  onOpenAIForLead: (leadId: number) => void;
  refreshTrigger?: number;
}

export const LeadsPage: React.FC<LeadsPageProps> = ({
  onSelectLead,
  onOpenQuickAction,
  onOpenAIForLead,
  refreshTrigger
}) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  // Loan Process Modal state
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [selectedLoanLeadId, setSelectedLoanLeadId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'all' | 'won'>('all');

  // Filter states
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');

  // Bulk actions state
  const [bulkRepId, setBulkRepId] = useState<number>(3);
  const [bulkStage, setBulkStage] = useState('qualified');
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [pipelineStages, setPipelineStages] = useState<any[]>([]);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const data = await api.getLeads({
        search: search.trim() || undefined,
        stage: stageFilter || undefined,
        source: sourceFilter || undefined
      });
      setLeads(data);
    } catch (e) {
      console.error('Error fetching leads:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeam = async () => {
    try {
      const team = await api.getTeam();
      setTeamMembers(team);
    } catch (e) {}
  };

  const fetchPipelineStages = async () => {
    try {
      const data = await api.getPipelineStageConfig();
      if (Array.isArray(data) && data.length > 0) {
        setPipelineStages(data);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchLeads();
    fetchTeam();
    fetchPipelineStages();
  }, [stageFilter, sourceFilter, refreshTrigger]);

  useEffect(() => {
    const handleDataUpdate = () => {
      fetchLeads();
    };
    window.addEventListener('crm-data-updated', handleDataUpdate);
    return () => {
      window.removeEventListener('crm-data-updated', handleDataUpdate);
    };
  }, [stageFilter, sourceFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLeads();
  };

  const handleSelectAll = () => {
    if (selectedIds.length === leads.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(leads.map(l => l.id));
    }
  };

  const handleToggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkAssign = async () => {
    if (selectedIds.length === 0) return;
    try {
      await api.bulkAssignLeads(selectedIds, bulkRepId);
      setSelectedIds([]);
      fetchLeads();
      window.dispatchEvent(new CustomEvent('crm-data-updated'));
      alert(`Assigned ${selectedIds.length} leads successfully!`);
    } catch (e: any) {
      alert(e.message || 'Bulk assign failed');
    }
  };

  const handleBulkStatus = async () => {
    if (selectedIds.length === 0) return;
    try {
      await api.bulkUpdateStage(selectedIds, bulkStage);
      setSelectedIds([]);
      fetchLeads();
      window.dispatchEvent(new CustomEvent('crm-data-updated'));
      alert(`Updated stage for ${selectedIds.length} leads successfully!`);
    } catch (e: any) {
      alert(e.message || 'Bulk status update failed');
    }
  };

  const handleExportCSV = async () => {
    try {
      const csvText = await api.request('/leads/export/csv');
      const blob = new Blob([csvText], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `solar_leads_${getISTTodayString()}.csv`;
      a.click();
    } catch (e: any) {
      alert(e.message || 'Export failed');
    }
  };

  const handleDeleteLead = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete lead for ${name}?`)) return;
    try {
      await api.deleteLead(id);
      setLeads(leads.filter(l => l.id !== id));
      window.dispatchEvent(new CustomEvent('crm-data-updated'));
    } catch (e: any) {
      alert(e.message || 'Failed to delete lead');
    }
  };

  const stageBadges: Record<string, string> = {
    new_lead: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    contacted: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
    qualified: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    survey_scheduled: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    survey_completed: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    quotation_sent: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    negotiation: 'bg-pink-500/15 text-pink-400 border-pink-500/30',
    won: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    lost: 'bg-red-500/15 text-red-400 border-red-500/30'
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-slate-900 border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white font-display">Solar Inquiries & Leads CRM</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage, qualify, and assign rooftop solar prospects with real-time status and tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => onOpenQuickAction('lead')}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Solar Lead</span>
          </button>
        </div>
      </div>

      {/* View Mode Switcher: All Inquiries vs Won Deals & Loan Workflow */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            setViewMode('all');
            setStageFilter('');
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
            viewMode === 'all' && stageFilter !== 'won'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>All Inquiries & Leads</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-950/40 text-slate-300">
            {leads.length}
          </span>
        </button>

        <button
          onClick={() => {
            setViewMode('won');
            setStageFilter('won');
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
            viewMode === 'won' || stageFilter === 'won'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-slate-950" />
          <span>Deal Won & Loan Workflow</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-950/60 text-emerald-200">
            Installation & Subsidy
          </span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by customer name, phone, email, lead code or city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Stage Filter */}
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="">All Stages</option>
              {pipelineStages.length > 0 ? (
                pipelineStages.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))
              ) : (
                <>
                  <option value="new_lead">New Lead</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="survey_scheduled">Survey Scheduled</option>
                  <option value="survey_completed">Survey Completed</option>
                  <option value="quotation_sent">Quotation Sent</option>
                  <option value="negotiation">Negotiation</option>
                  <option value="won">Won Deals</option>
                  <option value="lost">Lost</option>
                </>
              )}
            </select>

            {/* Source Filter */}
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="">All Sources</option>
              <option value="Website">Website Form</option>
              <option value="WhatsApp">WhatsApp Inbound</option>
              <option value="Google Ads">Google Ads</option>
              <option value="Facebook">Facebook Ads</option>
              <option value="Referral">Customer Referral</option>
              <option value="Phone">Direct Phone</option>
            </select>

            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700"
            >
              Apply Filter
            </button>
          </div>
        </form>

        {/* Bulk Actions Panel (active when rows are selected) */}
        {selectedIds.length > 0 && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
            <span className="font-bold text-amber-400 flex items-center gap-2">
              <CheckSquare className="w-4 h-4" />
              <span>{selectedIds.length} leads selected</span>
            </span>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Bulk Assign */}
              <div className="flex items-center gap-1.5">
                <select
                  value={bulkRepId}
                  onChange={(e) => setBulkRepId(parseInt(e.target.value))}
                  className="px-2 py-1 text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-200"
                >
                  {teamMembers.map(m => (
                    <option key={m.id} value={m.id}>{m.full_name}</option>
                  ))}
                </select>
                <button
                  onClick={handleBulkAssign}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-400"
                >
                  Assign Rep
                </button>
              </div>

              {/* Bulk Status */}
              <div className="flex items-center gap-1.5">
                <select
                  value={bulkStage}
                  onChange={(e) => setBulkStage(e.target.value)}
                  className="px-2 py-1 text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-200"
                >
                  {pipelineStages.length > 0 ? (
                    pipelineStages.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.label}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="contacted">Contacted</option>
                      <option value="qualified">Qualified</option>
                      <option value="survey_scheduled">Survey Scheduled</option>
                      <option value="quotation_sent">Quotation Sent</option>
                      <option value="won">Mark Won</option>
                      <option value="lost">Mark Lost</option>
                    </>
                  )}
                </select>
                <button
                  onClick={handleBulkStatus}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700"
                >
                  Update Stage
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Leads Data Table */}
      {(() => {
        const isWonView = viewMode === 'won' || stageFilter === 'won';

        return (
          <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  {isWonView ? (
                    <tr className="border-b border-slate-800 bg-emerald-950/20 text-slate-300 uppercase tracking-wider text-[10px]">
                      <th className="py-3.5 px-4 w-10">
                        <button onClick={handleSelectAll} className="text-slate-400 hover:text-white">
                          {selectedIds.length === leads.length && leads.length > 0 ? (
                            <CheckSquare className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </th>
                      <th className="py-3.5 px-3">Lead ID</th>
                      <th className="py-3.5 px-3">Customer & Location</th>
                      <th className="py-3.5 px-3">Loan Status</th>
                      <th className="py-3.5 px-3">Installation</th>
                      <th className="py-3.5 px-3">Net Meter</th>
                      <th className="py-3.5 px-3">Inspection</th>
                      <th className="py-3.5 px-3">Subsidy</th>
                      <th className="py-3.5 px-3 text-right">Actions</th>
                    </tr>
                  ) : (
                    <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px]">
                      <th className="py-3.5 px-4 w-10">
                        <button onClick={handleSelectAll} className="text-slate-400 hover:text-white">
                          {selectedIds.length === leads.length && leads.length > 0 ? (
                            <CheckSquare className="w-4 h-4 text-amber-500" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </th>
                      <th className="py-3.5 px-3">Lead ID</th>
                      <th className="py-3.5 px-3">Customer & Location</th>
                      <th className="py-3.5 px-3">Phone & Source</th>
                      <th className="py-3.5 px-3">System Size</th>
                      <th className="py-3.5 px-3">Monthly Bill</th>
                      <th className="py-3.5 px-3">Assigned Rep</th>
                      <th className="py-3.5 px-3">Stage</th>
                      <th className="py-3.5 px-3 text-right">Actions</th>
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {loading ? (
                    [...Array(6)].map((_, i) => (
                      <tr key={i}>
                        <td colSpan={isWonView ? 11 : 9} className="py-4 px-4">
                          <div className="h-6 rounded bg-slate-800/40 animate-pulse" />
                        </td>
                      </tr>
                    ))
                  ) : leads.length === 0 ? (
                    <tr>
                      <td colSpan={isWonView ? 11 : 9} className="py-12 text-center text-slate-500">
                        {isWonView
                          ? 'No won deals yet. When a lead reaches "Deal Won", its complete loan and execution workflow appears here.'
                          : 'No solar leads matching your filters. Try clearing filters or adding a new lead.'}
                      </td>
                    </tr>
                  ) : (
                    leads.map((l) => {
                      const isChecked = selectedIds.includes(l.id);

                      if (isWonView) {
                        return (
                          <tr
                            key={l.id}
                            className={`hover:bg-slate-800/30 transition-colors ${
                              isChecked ? 'bg-emerald-500/5' : ''
                            }`}
                          >
                            <td className="py-3.5 px-4">
                              <button onClick={() => handleToggleSelect(l.id)} className="text-slate-400 hover:text-white">
                                {isChecked ? (
                                  <CheckSquare className="w-4 h-4 text-emerald-500" />
                                ) : (
                                  <Square className="w-4 h-4" />
                                )}
                              </button>
                            </td>

                            <td className="py-3.5 px-3 font-mono font-bold text-slate-300">
                              <button
                                onClick={() => onSelectLead(l.id)}
                                className="hover:text-emerald-400 text-left transition-colors"
                              >
                                {l.lead_id}
                              </button>
                            </td>

                            <td className="py-3.5 px-3">
                              <div className="min-w-[130px]">
                                <button
                                  onClick={() => onSelectLead(l.id)}
                                  className="font-bold text-slate-100 hover:text-emerald-400 text-left transition-colors truncate block max-w-[160px]"
                                >
                                  {l.full_name}
                                </button>
                                <span className="text-[11px] text-slate-400 truncate block">
                                  {l.city || 'State Capital'} • {l.recommended_kw || 3.0} kW
                                </span>
                              </div>
                            </td>

                            {/* 1. Loan Status */}
                            <td className="py-3.5 px-3">
                              <button
                                onClick={() => {
                                  setSelectedLoanLeadId(l.id);
                                  setIsLoanModalOpen(true);
                                }}
                                className="cursor-pointer text-left"
                                title="Update Loan Status"
                              >
                                <span
                                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap ${getStatusBadgeColor(
                                    l.loan_process?.loan_status || 'Not Started'
                                  )}`}
                                >
                                  {l.loan_process?.loan_status || 'Not Started'}
                                </span>
                              </button>
                            </td>

                            {/* 2. Installation */}
                            <td className="py-3.5 px-3">
                              <button
                                onClick={() => {
                                  setSelectedLoanLeadId(l.id);
                                  setIsLoanModalOpen(true);
                                }}
                                className="cursor-pointer text-left"
                                title="Update Installation Status"
                              >
                                <span
                                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap ${getStatusBadgeColor(
                                    l.loan_process?.installation_status || 'Not Started'
                                  )}`}
                                >
                                  {l.loan_process?.installation_status || 'Not Started'}
                                </span>
                              </button>
                            </td>

                            {/* 3. Net Meter */}
                            <td className="py-3.5 px-3">
                              <button
                                onClick={() => {
                                  setSelectedLoanLeadId(l.id);
                                  setIsLoanModalOpen(true);
                                }}
                                className="cursor-pointer text-left"
                                title="Update Net Meter Status"
                              >
                                <span
                                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap ${getStatusBadgeColor(
                                    l.loan_process?.net_meter_status || 'Not Started'
                                  )}`}
                                >
                                  {l.loan_process?.net_meter_status || 'Not Started'}
                                </span>
                              </button>
                            </td>

                            {/* 4. Inspection */}
                            <td className="py-3.5 px-3">
                              <button
                                onClick={() => {
                                  setSelectedLoanLeadId(l.id);
                                  setIsLoanModalOpen(true);
                                }}
                                className="cursor-pointer text-left"
                                title="Update Inspection Status"
                              >
                                <span
                                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap ${getStatusBadgeColor(
                                    l.loan_process?.inspection_status || 'Not Started'
                                  )}`}
                                >
                                  {l.loan_process?.inspection_status || 'Not Started'}
                                </span>
                              </button>
                            </td>

                            {/* 5. Subsidy */}
                            <td className="py-3.5 px-3">
                              <button
                                onClick={() => {
                                  setSelectedLoanLeadId(l.id);
                                  setIsLoanModalOpen(true);
                                }}
                                className="cursor-pointer text-left"
                                title="Update Subsidy Status"
                              >
                                <span
                                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap ${getStatusBadgeColor(
                                    l.loan_process?.subsidy_status || 'Not Started'
                                  )}`}
                                >
                                  {l.loan_process?.subsidy_status || 'Not Started'}
                                </span>
                              </button>
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    setSelectedLoanLeadId(l.id);
                                    setIsLoanModalOpen(true);
                                  }}
                                  title="Open Loan Process & Documents"
                                  className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 transition-colors flex items-center gap-1.5 font-bold text-[11px] cursor-pointer"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  <span>Manage Process</span>
                                </button>
                                <button
                                  onClick={() => onSelectLead(l.id)}
                                  title="View Full CRM Details"
                                  className="p-1 rounded-lg text-amber-400 hover:bg-amber-500/20 transition-colors"
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteLead(l.id, l.full_name)}
                                  title="Delete Lead"
                                  className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      // Standard Leads Table Row
                      return (
                        <tr
                          key={l.id}
                          className={`hover:bg-slate-800/30 transition-colors ${
                            isChecked ? 'bg-amber-500/5' : ''
                          }`}
                        >
                          <td className="py-3.5 px-4">
                            <button onClick={() => handleToggleSelect(l.id)} className="text-slate-400 hover:text-white">
                              {isChecked ? (
                                <CheckSquare className="w-4 h-4 text-amber-500" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          </td>

                          <td className="py-3.5 px-3 font-mono font-bold text-slate-300">
                            <button
                              onClick={() => onSelectLead(l.id)}
                              className="hover:text-amber-400 text-left transition-colors"
                            >
                              {l.lead_id}
                            </button>
                          </td>

                          <td className="py-3.5 px-3">
                            <div className="min-w-[130px]">
                              <button
                                onClick={() => onSelectLead(l.id)}
                                className="font-bold text-slate-100 hover:text-amber-400 text-left transition-colors truncate block max-w-[160px]"
                              >
                                {l.full_name}
                              </button>
                              <span className="text-[11px] text-slate-400 truncate block">
                                {l.city || 'State Capital'} • {formatISTDate(l.created_at)}
                              </span>
                              {l.next_follow_up_date && (
                                <span className="text-[10px] text-amber-400/90 font-medium block truncate">
                                  Follow-up: {formatISTDate(l.next_follow_up_date)}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-3">
                            <span className="text-slate-200 font-medium block">{l.phone}</span>
                            <span className="text-[10px] text-slate-400 block">{l.lead_source}</span>
                          </td>

                          <td className="py-3.5 px-3">
                            <span className="font-bold text-amber-400">{l.recommended_kw} kW</span>
                          </td>

                          <td className="py-3.5 px-3 font-semibold text-slate-200">
                            ₹{l.monthly_bill.toLocaleString()}
                          </td>

                          <td className="py-3.5 px-3 text-slate-300">
                            {l.assigned_to_name || <span className="text-slate-500 italic">Unassigned</span>}
                          </td>

                          <td className="py-3.5 px-3">
                            {(() => {
                              if (l.stage === 'won') {
                                return (
                                  <div className="flex flex-col items-start gap-1">
                                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold border bg-emerald-500/15 text-emerald-400 border-emerald-500/30 whitespace-nowrap">
                                      Deal Won
                                    </span>
                                    <button
                                      onClick={() => {
                                        setSelectedLoanLeadId(l.id);
                                        setIsLoanModalOpen(true);
                                      }}
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-500/30 transition-colors cursor-pointer"
                                      title="Open Loan & Execution Workflow"
                                    >
                                      <FileText className="w-2.5 h-2.5" />
                                      <span>Loan: {l.loan_process?.loan_status || 'Active'} ({l.loan_process?.overall_progress_pct || 0}%)</span>
                                    </button>
                                  </div>
                                );
                              }

                              const stageObj = pipelineStages.find((s) => s.key === l.stage);
                              const stageLabel = stageObj ? stageObj.label : l.stage.replace('_', ' ');
                              const badgeClass = stageObj
                                ? getStageColorConfig(stageObj.color).badge
                                : (stageBadges[l.stage] || 'bg-slate-800 text-slate-300 border-slate-700');
                              return (
                                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border capitalize whitespace-nowrap ${badgeClass}`}>
                                  {stageLabel}
                                </span>
                              );
                            })()}
                          </td>

                          <td className="py-3.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {l.stage === 'won' && (
                                <button
                                  onClick={() => {
                                    setSelectedLoanLeadId(l.id);
                                    setIsLoanModalOpen(true);
                                  }}
                                  title="Manage Loan Process"
                                  className="p-1 rounded-lg text-emerald-400 hover:bg-emerald-500/20 transition-colors cursor-pointer"
                                >
                                  <FileText className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => onOpenAIForLead(l.id)}
                                title="AI Qualify & WhatsApp Pitch"
                                className="p-1 rounded-lg text-purple-400 hover:bg-purple-500/20 transition-colors"
                              >
                                <Sparkles className="w-4 h-4" />
                              </button>
                              <a
                                href={`https://wa.me/${l.phone.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="WhatsApp Chat"
                                className="p-1 rounded-lg text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                              >
                                <MessageSquare className="w-4 h-4" />
                              </a>
                              <button
                                onClick={() => setEditingLead(l)}
                                title="Edit Lead Details"
                                className="p-1 rounded-lg text-blue-400 hover:bg-blue-500/20 transition-colors cursor-pointer"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => onSelectLead(l.id)}
                                title="View Full CRM Details"
                                className="p-1 rounded-lg text-amber-400 hover:bg-amber-500/20 transition-colors"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteLead(l.id, l.full_name)}
                                title="Delete Lead"
                                className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="px-4 py-3 bg-slate-950/60 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
              <span>Showing {leads.length} solar leads</span>
              <span>Sorted by newest captured</span>
            </div>
          </div>
        );
      })()}

      {/* Edit Lead Modal */}
      {editingLead && (
        <EditLeadModal
          isOpen={!!editingLead}
          lead={editingLead}
          onClose={() => setEditingLead(null)}
          onSuccess={() => {
            setEditingLead(null);
            fetchLeads();
            window.dispatchEvent(new CustomEvent('crm-data-updated'));
          }}
        />
      )}

      {/* Loan Process Modal */}
      {isLoanModalOpen && selectedLoanLeadId && (
        <LoanProcessModal
          isOpen={isLoanModalOpen}
          leadId={selectedLoanLeadId}
          onClose={() => {
            setIsLoanModalOpen(false);
            setSelectedLoanLeadId(null);
          }}
          onSuccess={() => {
            fetchLeads();
            window.dispatchEvent(new CustomEvent('crm-data-updated'));
          }}
        />
      )}
    </div>
  );
};
