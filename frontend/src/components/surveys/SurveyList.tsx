import React, { useState, useEffect } from 'react';
import {
  ClipboardCheck,
  Plus,
  Compass,
  Zap,
  Home,
  CheckCircle,
  Clock,
  FileText,
  Upload,
  Image as ImageIcon,
  Check,
  X
} from 'lucide-react';
import { Survey } from '../../types';
import { api } from '../../services/api';

interface SurveyListProps {
  onSelectLead: (id: number) => void;
  onOpenQuickAction: (action: 'lead' | 'followup' | 'survey' | 'quotation') => void;
}

export const SurveyList: React.FC<SurveyListProps> = ({
  onSelectLead,
  onOpenQuickAction
}) => {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const [statusFilter, setStatusFilter] = useState('');

  // Engineer update modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>({});

  const fetchSurveys = async () => {
    setLoading(true);
    try {
      const data = await api.getSurveys({
        status: statusFilter || undefined
      });
      setSurveys(data);
    } catch (e) {
      console.error('Error fetching surveys:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSurveys();
  }, [statusFilter]);

  const handleOpenEdit = (s: Survey) => {
    setSelectedSurvey(s);
    setEditForm({
      status: s.status,
      roof_type: s.roof_type,
      roof_area: s.roof_area,
      available_roof_area: s.available_roof_area,
      roof_direction: s.roof_direction,
      roof_shading: s.roof_shading,
      phase: s.phase,
      meter_number: s.meter_number || '',
      recommended_system_size: s.recommended_system_size,
      engineer_notes: s.engineer_notes || ''
    });
    setIsEditModalOpen(true);
  };

  const handleSaveSurvey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSurvey) return;
    try {
      await api.updateSurvey(selectedSurvey.id, editForm);
      setIsEditModalOpen(false);
      fetchSurveys();
      alert('Survey technical specifications updated!');
    } catch (e: any) {
      alert(e.message || 'Error updating survey');
    }
  };

  const handleSimulateUpload = async (surveyId: number) => {
    const dummyFiles = [
      { name: 'Drone_Thermal_Roof_Scan.jpg', type: 'image/jpeg', size: '3.2 MB' },
      { name: 'DISCOM_Bi-Directional_Meter.jpg', type: 'image/jpeg', size: '1.4 MB' },
      { name: 'Shadow_Analysis_3D_Sim.pdf', type: 'application/pdf', size: '820 KB' }
    ];
    const file = dummyFiles[Math.floor(Math.random() * dummyFiles.length)];
    try {
      await api.uploadSurveyFile(surveyId, file);
      fetchSurveys();
      alert(`Attached document: ${file.name}`);
    } catch (e) {
      alert('Upload failed');
    }
  };

  const statusBadges: Record<string, string> = {
    requested: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    scheduled: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    assigned: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    in_progress: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    completed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    cancelled: 'bg-red-500/15 text-red-400 border-red-500/30'
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-slate-900 border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white font-display flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-cyan-400" />
            <span>Site Survey & Technical Engineering Hub</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Record shadow-free roof area, azimuth direction, electrical sanctioned load, meter numbers, and photos.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="">All Statuses</option>
            <option value="requested">Requested</option>
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>

          <button
            onClick={() => onOpenQuickAction('survey')}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Schedule Survey</span>
          </button>
        </div>
      </div>

      {/* Survey Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="h-64 rounded-2xl bg-slate-800/40 animate-pulse" />
          ))
        ) : surveys.length === 0 ? (
          <div className="col-span-3 p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-500 text-xs">
            No site surveys found matching filter.
          </div>
        ) : (
          surveys.map((s) => {
            const statusClass = statusBadges[s.status] || 'bg-slate-800 text-slate-300';

            return (
              <div
                key={s.id}
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-cyan-500/40 shadow-sm transition-all flex flex-col justify-between space-y-4"
              >
                {/* Card Header */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-slate-400">{s.survey_code}</span>
                      <button
                        onClick={() => onSelectLead(s.lead_id)}
                        className="text-sm font-bold text-white hover:text-cyan-400 text-left block truncate"
                      >
                        {s.lead_name}
                      </button>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${statusClass}`}>
                      {s.status.replace('_', ' ')}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 truncate">
                    {s.lead_address || 'Address pending verification'}
                  </p>
                </div>

                {/* Technical Specifications Matrix */}
                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-800/40 p-3 rounded-xl border border-slate-800/80">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Recommended kW</span>
                    <span className="font-bold text-amber-400">{s.recommended_system_size} kW</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Shadow-Free Area</span>
                    <span className="font-bold text-slate-200">{s.available_roof_area || s.roof_area} sq.ft</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Roof Type</span>
                    <span className="font-medium text-slate-300 truncate block">{s.roof_type}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Electrical Phase</span>
                    <span className="font-medium text-slate-300">{s.phase}</span>
                  </div>
                </div>

                {/* Attached Files & Documents */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Uploaded Documents ({s.files?.length || 0})</span>
                    <button
                      onClick={() => handleSimulateUpload(s.id)}
                      className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Attach Photo</span>
                    </button>
                  </div>

                  <div className="flex gap-1.5 overflow-x-auto py-1">
                    {(!s.files || s.files.length === 0) ? (
                      <span className="text-[10px] text-slate-500 italic">No photos uploaded yet</span>
                    ) : (
                      s.files.map((f, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 rounded-md text-[10px] font-medium bg-slate-800 border border-slate-700 text-slate-300 flex items-center gap-1 shrink-0"
                        >
                          <ImageIcon className="w-3 h-3 text-cyan-400" />
                          <span className="max-w-[120px] truncate">{f.name}</span>
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* Footer & Actions */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[11px]">
                    Eng: <strong className="text-slate-200">{s.assigned_engineer_name || 'Assigned'}</strong>
                  </span>
                  <button
                    onClick={() => handleOpenEdit(s)}
                    className="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700"
                  >
                    Edit Technical Specs
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Edit Technical Specs Modal */}
      {isEditModalOpen && selectedSurvey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white font-display">
                Update Technical Survey: {selectedSurvey.survey_code}
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSurvey} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Survey Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed & Verified</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Recommended kW</label>
                  <input
                    type="number"
                    step="0.5"
                    value={editForm.recommended_system_size}
                    onChange={(e) => setEditForm({ ...editForm, recommended_system_size: parseFloat(e.target.value) || 5 })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Usable Roof Area (sq.ft)</label>
                  <input
                    type="number"
                    value={editForm.available_roof_area}
                    onChange={(e) => setEditForm({ ...editForm, available_roof_area: parseFloat(e.target.value) || 500 })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Roof Shading</label>
                  <select
                    value={editForm.roof_shading}
                    onChange={(e) => setEditForm({ ...editForm, roof_shading: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                  >
                    <option value="None">None (Shadow Free 100%)</option>
                    <option value="Partial">Partial (Parapet Shadow)</option>
                    <option value="Heavy">Heavy Shading</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">DISCOM Meter Number</label>
                <input
                  type="text"
                  placeholder="e.g. MTR-982312"
                  value={editForm.meter_number}
                  onChange={(e) => setEditForm({ ...editForm, meter_number: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Engineer Findings & Structural Notes</label>
                <textarea
                  rows={3}
                  value={editForm.engineer_notes}
                  onChange={(e) => setEditForm({ ...editForm, engineer_notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                />
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-400 hover:text-white rounded-xl bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-xl shadow-md shadow-cyan-400/20"
                >
                  Save Technical Findings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
