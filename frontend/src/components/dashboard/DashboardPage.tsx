import React, { useState, useEffect } from 'react';
import { KpiCards } from './KpiCards';
import { LeadTrendChart } from './LeadTrendChart';
import { LeadSourcesChart } from './LeadSourcesChart';
import { PipelineFunnelChart } from './PipelineFunnelChart';
import { RevenueChart } from './RevenueChart';
import { TeamPerformanceTable } from './TeamPerformanceTable';
import { TasksAndActivities } from './TasksAndActivities';
import { api } from '../../services/api';
import {
  DashboardStats,
  LeadTrendItem,
  LeadSourceItem,
  FunnelStageItem,
  RevenueBreakdownItem,
  TeamPerformanceItem,
  FollowUp,
  Lead
} from '../../types';

interface DashboardPageProps {
  onSelectLead: (id: number) => void;
  onOpenQuickAction: (action: 'lead' | 'followup' | 'survey' | 'quotation') => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onSelectLead,
  onOpenQuickAction
}) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [trendData, setTrendData] = useState<LeadTrendItem[]>([]);
  const [trendDays, setTrendDays] = useState(30);
  const [sourcesData, setSourcesData] = useState<LeadSourceItem[]>([]);
  const [funnelData, setFunnelData] = useState<FunnelStageItem[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueBreakdownItem[]>([]);
  const [teamData, setTeamData] = useState<TeamPerformanceItem[]>([]);
  const [followups, setFollowups] = useState<FollowUp[]>([]);
  const [recentLeads, setRecentLeads] = useState<Lead[]>([]);

  const fetchDashboard = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const [s, sources, funnel, rev, team, fUps, leads] = await Promise.all([
        api.getDashboardStats(),
        api.getLeadSources(),
        api.getPipelineFunnel(),
        api.getRevenueData(),
        api.getTeamPerformance(),
        api.getFollowups(),
        api.getLeads()
      ]);

      setStats(s);
      setSourcesData(sources);
      setFunnelData(funnel);
      setRevenueData(rev);
      setTeamData(team);
      setFollowups(fUps);
      setRecentLeads(leads);
    } catch (err) {
      console.error('Error fetching dashboard:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const fetchTrend = async () => {
    try {
      const t = await api.getLeadTrend(trendDays);
      setTrendData(t);
    } catch (e) {
      console.error('Error fetching trend:', e);
    }
  };

  useEffect(() => {
    fetchDashboard(true);

    const handleDataUpdate = () => {
      fetchDashboard(false);
      fetchTrend();
    };
    window.addEventListener('crm-data-updated', handleDataUpdate);
    return () => {
      window.removeEventListener('crm-data-updated', handleDataUpdate);
    };
  }, []);

  useEffect(() => {
    fetchTrend();
  }, [trendDays]);

  const handleCompleteFollowup = async (id: number) => {
    try {
      await api.completeFollowup(id);
      setFollowups(followups.map(f => f.id === id ? { ...f, status: 'completed' } : f));
      window.dispatchEvent(new CustomEvent('crm-data-updated'));
    } catch (e) {
      alert('Error updating follow-up');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Quick Greeting */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight font-display flex items-center gap-2">
            <span>Solar Operations Command Center</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Live Real-Time
            </span>
          </h2>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            Real-time multi-tenant lead capture, technical site surveys, automated quotation pricing, and solar sales pipeline tracking.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => onOpenQuickAction('lead')}
            className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition-all shadow-md shadow-amber-500/20"
          >
            + Add Solar Lead
          </button>
          <button
            onClick={() => onOpenQuickAction('quotation')}
            className="px-4 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-all"
          >
            + Build Quotation
          </button>
        </div>
      </div>

      {/* Top 8 KPI Cards */}
      <KpiCards stats={stats} loading={loading} />

      {/* Interactive Charts Section - Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <LeadTrendChart
            data={trendData}
            days={trendDays}
            setDays={setTrendDays}
            loading={loading}
          />
        </div>
        <div className="lg:col-span-1">
          <LeadSourcesChart data={sourcesData} loading={loading} />
        </div>
      </div>

      {/* Interactive Charts Section - Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PipelineFunnelChart data={funnelData} loading={loading} />
        <RevenueChart data={revenueData} loading={loading} />
      </div>

      {/* Sales Team Performance Leaderboard */}
      <TeamPerformanceTable data={teamData} loading={loading} />

      {/* Tasks, Overdue, and Recent Leads Widgets */}
      <TasksAndActivities
        followups={followups}
        recentLeads={recentLeads}
        onSelectLead={onSelectLead}
        onOpenQuickAction={onOpenQuickAction}
        onCompleteFollowup={handleCompleteFollowup}
      />
    </div>
  );
};
