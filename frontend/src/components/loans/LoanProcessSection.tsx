import React, { useState, useEffect } from 'react';
import {
  FileText,
  Upload,
  Trash2,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCheck,
  Building,
  Wrench,
  Gauge,
  ShieldCheck,
  Coins,
  ChevronRight,
  Save,
  Loader2,
  Paperclip,
  Calendar,
  AlertTriangle,
  Download
} from 'lucide-react';
import { api } from '../../services/api';
import { LoanProcess, LoanDocument, LoanProcessUpdatePayload } from '../../types';

interface LoanProcessSectionProps {
  leadId: number;
  onRefresh?: () => void;
}

const LOAN_STATUS_OPTIONS = [
  'Not Started',
  'Pending Documents',
  'Submitted',
  'Under Review',
  'Approved',
  'Rejected',
  'Disbursed'
];

const INSTALLATION_STATUS_OPTIONS = [
  'Not Started',
  'In Progress',
  'Material Delivered',
  'Structure Erected',
  'Panels Installed',
  'Wiring Completed',
  'Completed'
];

const NET_METER_STATUS_OPTIONS = [
  'Not Started',
  'Applied',
  'Inspection Pending',
  'Meter Issued',
  'Meter Installed',
  'Completed',
  'Rejected'
];

const INSPECTION_STATUS_OPTIONS = [
  'Not Started',
  'Scheduled',
  'Pending Review',
  'Passed',
  'Failed',
  'Completed'
];

const SUBSIDY_STATUS_OPTIONS = [
  'Not Started',
  'Application Submitted',
  'Document Verification',
  'Inspection Approved',
  'Disbursed',
  'Rejected',
  'Completed'
];

export const getStatusBadgeColor = (status: string) => {
  const s = (status || '').toLowerCase();
  if (['completed', 'approved', 'disbursed', 'passed', 'meter installed'].includes(s)) {
    return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
  }
  if (['rejected', 'failed'].includes(s)) {
    return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
  }
  if (['in progress', 'material delivered', 'structure erected', 'panels installed', 'wiring completed'].includes(s)) {
    return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
  }
  if (['pending documents', 'scheduled', 'applied', 'inspection pending', 'meter issued'].includes(s)) {
    return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
  }
  if (['submitted', 'under review', 'document verification', 'application submitted', 'inspection approved'].includes(s)) {
    return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
  }
  return 'bg-slate-800 text-slate-400 border-slate-700';
};

export const LoanProcessSection: React.FC<LoanProcessSectionProps> = ({ leadId, onRefresh }) => {
  const [loanProcess, setLoanProcess] = useState<LoanProcess | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingCategory, setUploadingCategory] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states
  const [loanStatus, setLoanStatus] = useState('Not Started');
  const [loanBankName, setLoanBankName] = useState('');
  const [loanAmount, setLoanAmount] = useState('');
  const [loanNotes, setLoanNotes] = useState('');

  const [installationStatus, setInstallationStatus] = useState('Not Started');
  const [installerName, setInstallerName] = useState('');
  const [installationDate, setInstallationDate] = useState('');
  const [installationNotes, setInstallationNotes] = useState('');

  const [netMeterStatus, setNetMeterStatus] = useState('Not Started');
  const [netMeterAppNum, setNetMeterAppNum] = useState('');
  const [discomName, setDiscomName] = useState('');
  const [netMeterNotes, setNetMeterNotes] = useState('');

  const [inspectionStatus, setInspectionStatus] = useState('Not Started');
  const [inspectorName, setInspectorName] = useState('');
  const [inspectionDate, setInspectionDate] = useState('');
  const [inspectionNotes, setInspectionNotes] = useState('');

  const [subsidyStatus, setSubsidyStatus] = useState('Not Started');
  const [subsidyAppNum, setSubsidyAppNum] = useState('');
  const [subsidyAmount, setSubsidyAmount] = useState('');
  const [subsidyNotes, setSubsidyNotes] = useState('');

  const fetchLoanData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data: LoanProcess = await api.getLoanProcess(leadId);
      setLoanProcess(data);

      setLoanStatus(data.loan_status || 'Not Started');
      setLoanBankName(data.loan_bank_name || '');
      setLoanAmount(data.loan_amount ? data.loan_amount.toString() : '');
      setLoanNotes(data.loan_notes || '');

      setInstallationStatus(data.installation_status || 'Not Started');
      setInstallerName(data.installer_name || '');
      setInstallationDate(data.installation_date ? data.installation_date.split('T')[0] : '');
      setInstallationNotes(data.installation_notes || '');

      setNetMeterStatus(data.net_meter_status || 'Not Started');
      setNetMeterAppNum(data.net_meter_application_number || '');
      setDiscomName(data.discom_name || '');
      setNetMeterNotes(data.net_meter_notes || '');

      setInspectionStatus(data.inspection_status || 'Not Started');
      setInspectorName(data.inspector_name || '');
      setInspectionDate(data.inspection_date ? data.inspection_date.split('T')[0] : '');
      setInspectionNotes(data.inspection_notes || '');

      setSubsidyStatus(data.subsidy_status || 'Not Started');
      setSubsidyAppNum(data.subsidy_application_number || '');
      setSubsidyAmount(data.subsidy_amount ? data.subsidy_amount.toString() : '');
      setSubsidyNotes(data.subsidy_notes || '');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error loading loan process details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoanData();
  }, [leadId]);

  const handleSaveStatuses = async () => {
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const payload: LoanProcessUpdatePayload = {
        loan_status: loanStatus,
        loan_bank_name: loanBankName.trim() || undefined,
        loan_amount: loanAmount ? parseFloat(loanAmount) : undefined,
        loan_notes: loanNotes.trim() || undefined,

        installation_status: installationStatus,
        installer_name: installerName.trim() || undefined,
        installation_date: installationDate ? new Date(installationDate).toISOString() : undefined,
        installation_notes: installationNotes.trim() || undefined,

        net_meter_status: netMeterStatus,
        net_meter_application_number: netMeterAppNum.trim() || undefined,
        discom_name: discomName.trim() || undefined,
        net_meter_notes: netMeterNotes.trim() || undefined,

        inspection_status: inspectionStatus,
        inspector_name: inspectorName.trim() || undefined,
        inspection_date: inspectionDate ? new Date(inspectionDate).toISOString() : undefined,
        inspection_notes: inspectionNotes.trim() || undefined,

        subsidy_status: subsidyStatus,
        subsidy_application_number: subsidyAppNum.trim() || undefined,
        subsidy_amount: subsidyAmount ? parseFloat(subsidyAmount) : undefined,
        subsidy_notes: subsidyNotes.trim() || undefined
      };

      const updated = await api.updateLoanProcess(leadId, payload);
      setLoanProcess(updated);
      setSuccessMsg('Loan workflow and installation progress saved successfully!');
      setTimeout(() => setSuccessMsg(null), 4000);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving loan process');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (stageCategory: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so same file can be re-uploaded if desired
    e.target.value = '';

    // Validate size (15MB)
    if (file.size > 15 * 1024 * 1024) {
      alert('File size exceeds the 15 MB limit. Please upload a smaller document.');
      return;
    }

    setUploadingCategory(stageCategory);
    setErrorMsg(null);
    try {
      await api.uploadLoanDocument(leadId, file, stageCategory);
      await fetchLoanData();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || `Error uploading ${stageCategory} document`);
    } finally {
      setUploadingCategory(null);
    }
  };

  const handleDeleteDocument = async (docId: number) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      await api.deleteLoanDocument(leadId, docId);
      await fetchLoanData();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.message || 'Error deleting document');
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-500 mb-3" />
        <p className="text-sm">Loading Solar Loan & Execution Workflow...</p>
      </div>
    );
  }

  if (!loanProcess) {
    return (
      <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-3">
        <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
        <h4 className="text-base font-bold text-white">Loan Process Not Available</h4>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          The Loan and Execution module is enabled only for leads marked as <strong>Deal Won</strong>. 
          When this lead converts, all document checklists, loan tracking, and installation milestones will unlock automatically.
        </p>
      </div>
    );
  }

  // Filter documents by stage
  const getDocsForStage = (category: string) => {
    return (loanProcess.documents || []).filter((d) => d.stage_category === category);
  };

  const loanDocs = getDocsForStage('loan_file');
  const installDocs = getDocsForStage('installation');
  const netMeterDocs = getDocsForStage('net_meter_file');
  const inspectionDocs = getDocsForStage('inspection');
  const subsidyDocs = getDocsForStage('subsidy');

  return (
    <div className="space-y-6">
      {/* Top Banner & Progress Header */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-850 border border-slate-800 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                {loanProcess.loan_process_number || 'LP-WORKFLOW'}
              </span>
              <span className="text-xs text-slate-400">
                {loanProcess.lead_name} • {loanProcess.system_size_kw || 3.0} kW System
              </span>
            </div>
            <h2 className="text-lg font-bold text-white font-display">
              Solar Loan, Installation & Execution Workflow
            </h2>
            <p className="text-xs text-slate-400">
              Track loan approvals, rooftop installation progress, net meter commissioning, DISCOM inspections, and central subsidy disbursals.
            </p>
          </div>

          {/* Overall Progress Gauge & Save Action */}
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="text-right">
              <div className="flex items-center gap-2 justify-end">
                <span className="text-xs text-slate-400 font-medium">Overall Completion:</span>
                <span className="text-lg font-bold text-amber-400 font-mono">
                  {loanProcess.overall_progress_pct}%
                </span>
              </div>
              <div className="w-40 sm:w-48 h-2.5 bg-slate-800 rounded-full overflow-hidden mt-1.5 border border-slate-700/50">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: `${loanProcess.overall_progress_pct}%` }}
                />
              </div>
            </div>

            <button
              onClick={handleSaveStatuses}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{saving ? 'Saving...' : 'Save Workflow'}</span>
            </button>
          </div>
        </div>

        {/* Status Alerts */}
        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
      </div>

      {/* 5 Milestone Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ========================================================================= */}
        {/* 1. LOAN FILE & LOAN STATUS */}
        {/* ========================================================================= */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-sm hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Building className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">1. Loan Application & File</h3>
                <span className="text-[11px] text-slate-400">Bank sanction & documentation</span>
              </div>
            </div>
            <select
              value={loanStatus}
              onChange={(e) => setLoanStatus(e.target.value)}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg border focus:outline-none cursor-pointer ${getStatusBadgeColor(
                loanStatus
              )}`}
            >
              {LOAN_STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt} className="bg-slate-900 text-slate-200">
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Financing Bank / Partner</label>
              <input
                type="text"
                placeholder="e.g. SBI Solar, Tata Capital, Metafin"
                value={loanBankName}
                onChange={(e) => setLoanBankName(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Sanctioned Amount (₹)</label>
              <input
                type="number"
                placeholder="e.g. 250000"
                value={loanAmount}
                onChange={(e) => setLoanAmount(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Loan Remarks / Notes</label>
            <input
              type="text"
              placeholder="e.g. KYC approved, loan agreement signed"
              value={loanNotes}
              onChange={(e) => setLoanNotes(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Upload Documents Zone */}
          <div className="pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                <span>Loan Application Documents ({loanDocs.length})</span>
              </span>
              <label className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 cursor-pointer transition-colors">
                <Upload className="w-3 h-3" />
                <span>{uploadingCategory === 'loan_file' ? 'Uploading...' : 'Upload Loan Doc'}</span>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  className="hidden"
                  disabled={uploadingCategory === 'loan_file'}
                  onChange={(e) => handleFileUpload('loan_file', e)}
                />
              </label>
            </div>

            {/* List of uploaded documents */}
            {loanDocs.length === 0 ? (
              <p className="text-[11px] text-slate-500 italic py-2">No loan documents uploaded yet (Sanction letter, Aadhaar, PAN).</p>
            ) : (
              <div className="space-y-1.5">
                {loanDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-2 rounded-lg bg-slate-800/60 border border-slate-750 flex items-center justify-between text-xs group"
                  >
                    <div className="flex items-center gap-2 truncate max-w-[70%]">
                      <Paperclip className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                      <a
                        href={doc.file_path}
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-200 font-medium hover:text-amber-400 truncate hover:underline"
                        title={doc.file_name}
                      >
                        {doc.file_name}
                      </a>
                      <span className="text-[10px] text-slate-500 font-mono flex-shrink-0">
                        ({Math.round(doc.file_size / 1024)} KB)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={doc.file_path}
                        download={doc.file_name}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 rounded text-slate-400 hover:text-white transition-colors"
                        title="View / Download"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                      <button
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                        title="Delete Document"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. ROOFTOP INSTALLATION */}
        {/* ========================================================================= */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-sm hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Wrench className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">2. Rooftop Installation</h3>
                <span className="text-[11px] text-slate-400">Structure, panels, and inverter</span>
              </div>
            </div>
            <select
              value={installationStatus}
              onChange={(e) => setInstallationStatus(e.target.value)}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg border focus:outline-none cursor-pointer ${getStatusBadgeColor(
                installationStatus
              )}`}
            >
              {INSTALLATION_STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt} className="bg-slate-900 text-slate-200">
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Installer / Execution Team</label>
              <input
                type="text"
                placeholder="e.g. Apex Solar Tech / In-house Team A"
                value={installerName}
                onChange={(e) => setInstallerName(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Installation / Target Date</label>
              <input
                type="date"
                value={installationDate}
                onChange={(e) => setInstallationDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Installation Notes</label>
            <input
              type="text"
              placeholder="e.g. Structure anchored, earthing pits completed"
              value={installationNotes}
              onChange={(e) => setInstallationNotes(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Upload Documents Zone */}
          <div className="pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                <FileCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Installation Docs & Site Photos ({installDocs.length})</span>
              </span>
              <label className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 cursor-pointer transition-colors">
                <Upload className="w-3 h-3" />
                <span>{uploadingCategory === 'installation' ? 'Uploading...' : 'Upload Photos / Docs'}</span>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  className="hidden"
                  disabled={uploadingCategory === 'installation'}
                  onChange={(e) => handleFileUpload('installation', e)}
                />
              </label>
            </div>

            {installDocs.length === 0 ? (
              <p className="text-[11px] text-slate-500 italic py-2">No site photos or installation reports uploaded yet.</p>
            ) : (
              <div className="space-y-1.5">
                {installDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-2 rounded-lg bg-slate-800/60 border border-slate-750 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 truncate max-w-[70%]">
                      <Paperclip className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                      <a
                        href={doc.file_path}
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-200 font-medium hover:text-amber-400 truncate hover:underline"
                        title={doc.file_name}
                      >
                        {doc.file_name}
                      </a>
                      <span className="text-[10px] text-slate-500 font-mono flex-shrink-0">
                        ({Math.round(doc.file_size / 1024)} KB)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={doc.file_path}
                        download={doc.file_name}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 rounded text-slate-400 hover:text-white transition-colors"
                        title="View / Download"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                      <button
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                        title="Delete Document"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. NET METER FILE & STATUS */}
        {/* ========================================================================= */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-sm hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Gauge className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">3. Net Metering</h3>
                <span className="text-[11px] text-slate-400">DISCOM application & bi-directional meter</span>
              </div>
            </div>
            <select
              value={netMeterStatus}
              onChange={(e) => setNetMeterStatus(e.target.value)}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg border focus:outline-none cursor-pointer ${getStatusBadgeColor(
                netMeterStatus
              )}`}
            >
              {NET_METER_STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt} className="bg-slate-900 text-slate-200">
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Electricity Provider (DISCOM)</label>
              <input
                type="text"
                placeholder="e.g. DGVCL, UGVCL, BESCOM, MSEDCL"
                value={discomName}
                onChange={(e) => setDiscomName(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Net Meter Application No.</label>
              <input
                type="text"
                placeholder="e.g. NM-2026-88129"
                value={netMeterAppNum}
                onChange={(e) => setNetMeterAppNum(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Net Meter Notes</label>
            <input
              type="text"
              placeholder="e.g. Meter tested and sealed by sub-divisional engineer"
              value={netMeterNotes}
              onChange={(e) => setNetMeterNotes(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Upload Documents Zone */}
          <div className="pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-cyan-400" />
                <span>Net Meter Documents & Agreements ({netMeterDocs.length})</span>
              </span>
              <label className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20 cursor-pointer transition-colors">
                <Upload className="w-3 h-3" />
                <span>{uploadingCategory === 'net_meter_file' ? 'Uploading...' : 'Upload Net Meter File'}</span>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  className="hidden"
                  disabled={uploadingCategory === 'net_meter_file'}
                  onChange={(e) => handleFileUpload('net_meter_file', e)}
                />
              </label>
            </div>

            {netMeterDocs.length === 0 ? (
              <p className="text-[11px] text-slate-500 italic py-2">No net meter files uploaded yet (Application form, test report, synchronization receipt).</p>
            ) : (
              <div className="space-y-1.5">
                {netMeterDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-2 rounded-lg bg-slate-800/60 border border-slate-750 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 truncate max-w-[70%]">
                      <Paperclip className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                      <a
                        href={doc.file_path}
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-200 font-medium hover:text-amber-400 truncate hover:underline"
                        title={doc.file_name}
                      >
                        {doc.file_name}
                      </a>
                      <span className="text-[10px] text-slate-500 font-mono flex-shrink-0">
                        ({Math.round(doc.file_size / 1024)} KB)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={doc.file_path}
                        download={doc.file_name}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 rounded text-slate-400 hover:text-white transition-colors"
                        title="View / Download"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                      <button
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                        title="Delete Document"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. TECHNICAL INSPECTION */}
        {/* ========================================================================= */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-sm hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">4. Technical Inspection</h3>
                <span className="text-[11px] text-slate-400">CEIG / Electrical inspector clearance</span>
              </div>
            </div>
            <select
              value={inspectionStatus}
              onChange={(e) => setInspectionStatus(e.target.value)}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg border focus:outline-none cursor-pointer ${getStatusBadgeColor(
                inspectionStatus
              )}`}
            >
              {INSPECTION_STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt} className="bg-slate-900 text-slate-200">
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Inspector / Agency</label>
              <input
                type="text"
                placeholder="e.g. Chief Electrical Inspectorate"
                value={inspectorName}
                onChange={(e) => setInspectorName(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Inspection Date</label>
              <input
                type="date"
                value={inspectionDate}
                onChange={(e) => setInspectionDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Inspection Notes</label>
            <input
              type="text"
              placeholder="e.g. Protection relays verified, plant cleared for charging"
              value={inspectionNotes}
              onChange={(e) => setInspectionNotes(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Upload Documents Zone */}
          <div className="pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                <FileCheck className="w-3.5 h-3.5 text-purple-400" />
                <span>Inspection Certificates & Reports ({inspectionDocs.length})</span>
              </span>
              <label className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/30 hover:bg-purple-500/20 cursor-pointer transition-colors">
                <Upload className="w-3 h-3" />
                <span>{uploadingCategory === 'inspection' ? 'Uploading...' : 'Upload Inspection Doc'}</span>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  className="hidden"
                  disabled={uploadingCategory === 'inspection'}
                  onChange={(e) => handleFileUpload('inspection', e)}
                />
              </label>
            </div>

            {inspectionDocs.length === 0 ? (
              <p className="text-[11px] text-slate-500 italic py-2">No inspection certificates uploaded yet.</p>
            ) : (
              <div className="space-y-1.5">
                {inspectionDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-2 rounded-lg bg-slate-800/60 border border-slate-750 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 truncate max-w-[70%]">
                      <Paperclip className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                      <a
                        href={doc.file_path}
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-200 font-medium hover:text-amber-400 truncate hover:underline"
                        title={doc.file_name}
                      >
                        {doc.file_name}
                      </a>
                      <span className="text-[10px] text-slate-500 font-mono flex-shrink-0">
                        ({Math.round(doc.file_size / 1024)} KB)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={doc.file_path}
                        download={doc.file_name}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 rounded text-slate-400 hover:text-white transition-colors"
                        title="View / Download"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                      <button
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                        title="Delete Document"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 5. GOVERNMENT SUBSIDY */}
        {/* ========================================================================= */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-sm hover:border-slate-700 transition-colors lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Coins className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">5. Central & State Subsidy Tracking</h3>
                <span className="text-[11px] text-slate-400">PM Surya Ghar National Portal & direct bank disbursal</span>
              </div>
            </div>
            <select
              value={subsidyStatus}
              onChange={(e) => setSubsidyStatus(e.target.value)}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg border focus:outline-none cursor-pointer ${getStatusBadgeColor(
                subsidyStatus
              )}`}
            >
              {SUBSIDY_STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt} className="bg-slate-900 text-slate-200">
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">National Portal Application No.</label>
              <input
                type="text"
                placeholder="e.g. PMSG-2026-10492"
                value={subsidyAppNum}
                onChange={(e) => setSubsidyAppNum(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Expected Subsidy (₹)</label>
              <input
                type="number"
                placeholder="e.g. 78000"
                value={subsidyAmount}
                onChange={(e) => setSubsidyAmount(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Disbursal Notes</label>
              <input
                type="text"
                placeholder="e.g. Bank account verified, awaiting DBT credit"
                value={subsidyNotes}
                onChange={(e) => setSubsidyNotes(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Upload Documents Zone */}
          <div className="pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Subsidy Receipts & Bank Verification Proofs ({subsidyDocs.length})</span>
              </span>
              <label className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 cursor-pointer transition-colors">
                <Upload className="w-3 h-3" />
                <span>{uploadingCategory === 'subsidy' ? 'Uploading...' : 'Upload Subsidy Proof'}</span>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  className="hidden"
                  disabled={uploadingCategory === 'subsidy'}
                  onChange={(e) => handleFileUpload('subsidy', e)}
                />
              </label>
            </div>

            {subsidyDocs.length === 0 ? (
              <p className="text-[11px] text-slate-500 italic py-2">No subsidy claim documents uploaded yet (National Portal registration, electricity bill, cancelled cheque).</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {subsidyDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-2 rounded-lg bg-slate-800/60 border border-slate-750 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 truncate max-w-[70%]">
                      <Paperclip className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <a
                        href={doc.file_path}
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-200 font-medium hover:text-amber-400 truncate hover:underline"
                        title={doc.file_name}
                      >
                        {doc.file_name}
                      </a>
                      <span className="text-[10px] text-slate-500 font-mono flex-shrink-0">
                        ({Math.round(doc.file_size / 1024)} KB)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={doc.file_path}
                        download={doc.file_name}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 rounded text-slate-400 hover:text-white transition-colors"
                        title="View / Download"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                      <button
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                        title="Delete Document"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
