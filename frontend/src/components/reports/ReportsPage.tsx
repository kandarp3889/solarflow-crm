import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  Users,
  Coins,
  ClipboardCheck,
  Calendar,
  Lock
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { getISTTodayString } from '../../utils/date';

export const ReportsPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const canExport = hasPermission('reports:export');
  const [reportType, setReportType] = useState<'leads' | 'sales' | 'quotations' | 'surveys'>('leads');
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const data = await api.getReport(reportType);
      setReportData(data);
    } catch (e) {
      console.error('Error fetching report:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [reportType]);

  const handleExport = async () => {
    try {
      const csvText = await api.request(`/reports/${reportType}/export`);
      const blob = new Blob([csvText], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `solar_${reportType}_report_${getISTTodayString()}.csv`;
      a.click();
    } catch (e: any) {
      alert(e.message || 'Export failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-slate-900 border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white font-display flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-amber-400" />
            <span>Executive Reports & Data Export</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Download comprehensive solar sales, engineering survey audits, quotation margins, and customer pipeline reports.
          </p>
        </div>

        {canExport ? (
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 self-start sm:self-auto cursor-pointer transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export {reportType.toUpperCase()} (CSV)</span>
          </button>
        ) : (
          <div 
            title="Your role does not have the 'reports:export' permission" 
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-400 self-start sm:self-auto cursor-not-allowed"
          >
            <Lock className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Restricted</span>
          </div>
        )}
      </div>

      {/* Report Type Selector Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-900/60 p-1.5 rounded-2xl gap-1 overflow-x-auto">
        {[
          { id: 'leads', label: 'Leads Ingestion & Qualification', icon: Users },
          { id: 'sales', label: 'Closed Won Solar Contracts', icon: Coins },
          { id: 'quotations', label: 'Quotation Proposals & Subsidies', icon: FileSpreadsheet },
          { id: 'surveys', label: 'Site Survey Engineering Logs', icon: ClipboardCheck }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = reportType === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setReportType(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Report Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-slate-500 text-xs">Generating report data...</div>
          ) : reportData.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">No records available for this report type.</div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px]">
                  {Object.keys(reportData[0]).map((col) => (
                    <th key={col} className="py-3 px-4 capitalize">
                      {col.replace(/_/g, ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {reportData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                    {Object.values(row).map((val: any, cIdx) => (
                      <td key={cIdx} className="py-3 px-4 text-slate-200">
                        {typeof val === 'number' && val > 1000 ? `₹${val.toLocaleString()}` : String(val ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
