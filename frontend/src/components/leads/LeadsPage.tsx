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
  Sparkles
} from 'lucide-react';
import { Lead } from '../../types';
import { LeadScoreBadge } from './LeadScoreBadge';
import { api } from '../../services/api';

interface LeadsPageProps {
  onSelectLead: (id: number) => void;
  onOpenQuickAction: (action: 'lead' | 'followup' | 'survey' | 'quotation') => void;
  onOpenAIForLead: (leadId: number) => void;
}

export const LeadsPage: React.FC<LeadsPageProps> = ({
  onSelectLead,
  onOpenQuickAction,
  onOpenAIForLead
}) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Filter states
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [scoreFilter, setScoreFilter] = useState('');

  // Bulk actions state
  const [bulkRepId, setBulkRepId] = useState<number>(3);
  const [bulkStage, setBulkStage] = useState('qualified');
  const [teamMembers, setTeamMembers] = useState<any[]>([]);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const data = await api.getLeads({
        search: search.trim() || undefined,
        stage: stageFilter || undefined,
        source: sourceFilter || undefined,
        score_category: scoreFilter || undefined
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

  useEffect(() => {
    fetchLeads();
    fetchTeam();
  }, [stageFilter, sourceFilter, scoreFilter]);

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
      a.download = `solar_leads_${new Date().toISOString().slice(0, 10)}.csv`;
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
            Manage, qualify, and assign rooftop solar prospects with automated scoring and tracking.
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
              <option value="new_lead">New Lead</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="survey_scheduled">Survey Scheduled</option>
              <option value="survey_completed">Survey Completed</option>
              <option value="quotation_sent">Quotation Sent</option>
              <option value="negotiation">Negotiation</option>
              <option value="won">Won Deals</option>
              <option value="lost">Lost</option>
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

            {/* Score Filter */}
            <select
              value={scoreFilter}
              onChange={(e) => setScoreFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="">All Scores</option>
              <option value="hot">🔥 Hot Leads (&gt;80)</option>
              <option value="warm">☀️ Warm Leads (50-79)</option>
              <option value="cold">❄️ Cold Leads (&lt;50)</option>
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
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="survey_scheduled">Survey Scheduled</option>
                  <option value="quotation_sent">Quotation Sent</option>
                  <option value="won">Mark Won</option>
                  <option value="lost">Mark Lost</option>
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
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
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
                <th className="py-3.5 px-3">Est. Value</th>
                <th className="py-3.5 px-3">Assigned Rep</th>
                <th className="py-3.5 px-3">Stage</th>
                <th className="py-3.5 px-3">Lead Score</th>
                <th className="py-3.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={11} className="py-4 px-4">
                      <div className="h-6 rounded bg-slate-800/40 animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-500">
                    No solar leads matching your filters. Try clearing filters or adding a new lead.
                  </td>
                </tr>
              ) : (
                leads.map((l) => {
                  const isChecked = selectedIds.includes(l.id);
                  const stageClass = stageBadges[l.stage] || 'bg-slate-800 text-slate-300';

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
                            {l.city || 'State Capital'} • {l.property_type}
                          </span>
                          {l.consumer_number && (
                            <span className="text-[10px] font-mono text-amber-400/90 truncate block mt-0.5">
                              CA: {l.consumer_number}
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
                        <span className="text-[10px] text-slate-400 block">{l.roof_type}</span>
                      </td>

                      <td className="py-3.5 px-3 font-semibold text-slate-200">
                        ₹{l.monthly_bill.toLocaleString()}
                      </td>

                      <td className="py-3.5 px-3 font-bold text-emerald-400">
                        ₹{(l.estimated_value / 100000).toFixed(1)}L
                      </td>

                      <td className="py-3.5 px-3 text-slate-300">
                        {l.assigned_to_name || <span className="text-slate-500 italic">Unassigned</span>}
                      </td>

                      <td className="py-3.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border capitalize whitespace-nowrap ${stageClass}`}>
                          {l.stage.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="py-3.5 px-3">
                        <LeadScoreBadge score={l.lead_score} category={l.score_category} />
                      </td>

                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
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
    </div>
  );
};
