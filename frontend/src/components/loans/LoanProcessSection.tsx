import React, { useState, useEffect, useRef } from 'react';
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
  Download,
  Plus,
  Image as ImageIcon,
  Eye,
  X,
  Cpu,
  RefreshCw,
  Maximize2
} from 'lucide-react';
import { api, getFileUrl } from '../../services/api';
import { LoanProcess, LoanDocument, LoanProcessUpdatePayload } from '../../types';
import { formatISTDate, getISTDateKey, toISTIsoString } from '../../utils/date';

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

  // Track initial load per leadId so we don't accidentally wipe user edits on re-renders
  const loadedLeadIdRef = useRef<number | null>(null);

  // Form states - preserved across uploads and edits
  const [loanStatus, setLoanStatus] = useState('Not Started');
  const [loanBankName, setLoanBankName] = useState('');
  const [loanAmount, setLoanAmount] = useState('');
  const [loanNotes, setLoanNotes] = useState('');

  const [installationStatus, setInstallationStatus] = useState('Not Started');
  const [installerName, setInstallerName] = useState('');
  const [installationDate, setInstallationDate] = useState('');
  const [installationNotes, setInstallationNotes] = useState('');

  // 3. Installation Details (Equipment & Evidence)
  const [inverterSerialNumber, setInverterSerialNumber] = useState('');
  const [panelSerialNumbers, setPanelSerialNumbers] = useState<string[]>(['']);
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; name: string } | null>(null);
  const [replacingDcrDocId, setReplacingDcrDocId] = useState<number | null>(null);
  const dcrFileInputRef = useRef<HTMLInputElement | null>(null);
  const replaceDcrFileInputRef = useRef<HTMLInputElement | null>(null);
  const photosFileInputRef = useRef<HTMLInputElement | null>(null);

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

  // Construct current payload from user's active inputs
  const getCurrentFormPayload = (): LoanProcessUpdatePayload => ({
    loan_status: loanStatus,
    loan_bank_name: loanBankName.trim() || undefined,
    loan_amount: loanAmount ? parseFloat(loanAmount) : undefined,
    loan_notes: loanNotes.trim() || undefined,

    installation_status: installationStatus,
    installer_name: installerName.trim() || undefined,
    installation_date: installationDate ? toISTIsoString(installationDate) : undefined,
    installation_notes: installationNotes.trim() || undefined,

    // Equipment Details
    inverter_serial_number: inverterSerialNumber.trim() || undefined,
    panel_serial_numbers: panelSerialNumbers.map((s) => s.trim()).filter(Boolean),

    net_meter_status: netMeterStatus,
    net_meter_application_number: netMeterAppNum.trim() || undefined,
    discom_name: discomName.trim() || undefined,
    net_meter_notes: netMeterNotes.trim() || undefined,

    inspection_status: inspectionStatus,
    inspector_name: inspectorName.trim() || undefined,
    inspection_date: inspectionDate ? toISTIsoString(inspectionDate) : undefined,
    inspection_notes: inspectionNotes.trim() || undefined,

    subsidy_status: subsidyStatus,
    subsidy_application_number: subsidyAppNum.trim() || undefined,
    subsidy_amount: subsidyAmount ? parseFloat(subsidyAmount) : undefined,
    subsidy_notes: subsidyNotes.trim() || undefined
  });

  // Panel Serial Numbers Handlers
  const handleAddPanelSerial = () => {
    setPanelSerialNumbers((prev) => [...prev, '']);
  };

  const handleRemovePanelSerial = (index: number) => {
    setPanelSerialNumbers((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0 ? next : [''];
    });
  };

  const handlePanelSerialChange = (index: number, value: string) => {
    setPanelSerialNumbers((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  // Dedicated Installed Photos Upload (Multiple)
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fileList = Array.from(files);
    e.target.value = '';

    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    for (const f of fileList) {
      if (f.size > 15 * 1024 * 1024) {
        setErrorMsg(`Photo "${f.name}" exceeds the 15 MB limit. Please upload a smaller image.`);
        return;
      }
      const hasValidExt = validExtensions.some((ext) => f.name.toLowerCase().endsWith(ext));
      if (!hasValidExt) {
        setErrorMsg(`File "${f.name}" has invalid format. Please upload JPG, JPEG, PNG, or WEBP images.`);
        return;
      }
    }

    setUploadingCategory('installed_photo');
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // 1. Sync and persist current form data
      const currentPayload = getCurrentFormPayload();
      await api.updateLoanProcess(leadId, currentPayload);

      // 2. Upload photos sequentially
      for (const f of fileList) {
        await api.uploadLoanDocument(leadId, f, 'installed_photo');
      }

      // 3. Fetch latest loan process metadata without touching user's form inputs
      const latestData: LoanProcess = await api.getLoanProcess(leadId);
      setLoanProcess(latestData);

      setSuccessMsg(
        fileList.length === 1
          ? `Installed photo "${fileList[0].name}" uploaded successfully!`
          : `${fileList.length} installed photos uploaded successfully!`
      );
      setTimeout(() => setSuccessMsg(null), 4000);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error uploading installed photos');
    } finally {
      setUploadingCategory(null);
    }
  };

  // Dedicated DCR Report Upload & Replace
  const handleDcrUpload = async (e: React.ChangeEvent<HTMLInputElement>, oldDocIdToReplace?: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (file.size > 15 * 1024 * 1024) {
      setErrorMsg('DCR Report exceeds the 15 MB limit. Please upload a smaller PDF document.');
      return;
    }
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMsg('Invalid format. DCR Report must be a PDF document.');
      return;
    }

    setUploadingCategory('dcr_report');
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // 1. Sync current form data first
      const currentPayload = getCurrentFormPayload();
      await api.updateLoanProcess(leadId, currentPayload);

      // 2. If replacing old report, delete previous document
      if (oldDocIdToReplace) {
        try {
          await api.deleteLoanDocument(leadId, oldDocIdToReplace);
        } catch (delErr) {
          console.warn('Could not delete old DCR doc during replace:', delErr);
        }
      }

      // 3. Upload new DCR document
      await api.uploadLoanDocument(leadId, file, 'dcr_report');

      // 4. Update documents & progress
      const latestData: LoanProcess = await api.getLoanProcess(leadId);
      setLoanProcess(latestData);

      setSuccessMsg(
        oldDocIdToReplace
          ? `DCR Report replaced with "${file.name}" successfully!`
          : `DCR Report "${file.name}" uploaded successfully!`
      );
      setTimeout(() => setSuccessMsg(null), 4000);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error uploading DCR Report');
    } finally {
      setUploadingCategory(null);
      setReplacingDcrDocId(null);
    }
  };

  // Fetch loan data: isInitial=true populates form fields; isInitial=false only updates metadata & documents without touching form inputs
  const fetchLoanData = async (isInitial = true) => {
    if (isInitial) {
      setLoading(true);
    }
    setErrorMsg(null);
    try {
      const data: LoanProcess = await api.getLoanProcess(leadId);
      setLoanProcess(data);

      if (isInitial) {
        setLoanStatus(data.loan_status || 'Not Started');
        setLoanBankName(data.loan_bank_name || '');
        setLoanAmount(data.loan_amount ? data.loan_amount.toString() : '');
        setLoanNotes(data.loan_notes || '');

        setInstallationStatus(data.installation_status || 'Not Started');
        setInstallerName(data.installer_name || '');
        setInstallationDate(data.installation_date ? getISTDateKey(data.installation_date) : '');
        setInstallationNotes(data.installation_notes || '');

        // 3. Installation Details
        setInverterSerialNumber(data.inverter_serial_number || '');
        setPanelSerialNumbers(
          data.panel_serial_numbers && data.panel_serial_numbers.length > 0
            ? data.panel_serial_numbers
            : ['']
        );

        setNetMeterStatus(data.net_meter_status || 'Not Started');
        setNetMeterAppNum(data.net_meter_application_number || '');
        setDiscomName(data.discom_name || '');
        setNetMeterNotes(data.net_meter_notes || '');

        setInspectionStatus(data.inspection_status || 'Not Started');
        setInspectorName(data.inspector_name || '');
        setInspectionDate(data.inspection_date ? getISTDateKey(data.inspection_date) : '');
        setInspectionNotes(data.inspection_notes || '');

        setSubsidyStatus(data.subsidy_status || 'Not Started');
        setSubsidyAppNum(data.subsidy_application_number || '');
        setSubsidyAmount(data.subsidy_amount ? data.subsidy_amount.toString() : '');
        setSubsidyNotes(data.subsidy_notes || '');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error loading loan process details');
    } finally {
      if (isInitial) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (loadedLeadIdRef.current !== leadId) {
      loadedLeadIdRef.current = leadId;
      fetchLoanData(true);
    }
  }, [leadId]);

  const handleSaveStatuses = async () => {
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const payload = getCurrentFormPayload();
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
      setErrorMsg('File size exceeds the 15 MB limit. Please upload a smaller document.');
      return;
    }

    // Validate file extensions
    const validExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
    const fileNameLower = file.name.toLowerCase();
    const hasValidExt = validExtensions.some(ext => fileNameLower.endsWith(ext));
    if (!hasValidExt) {
      setErrorMsg('Invalid file format. Allowed file types: PDF, JPG, JPEG, PNG, WEBP.');
      return;
    }

    setUploadingCategory(stageCategory);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // 1. Sync and save current form data to database so user-entered values are persisted
      const currentPayload = getCurrentFormPayload();
      await api.updateLoanProcess(leadId, currentPayload);

      // 2. Upload document to backend
      await api.uploadLoanDocument(leadId, file, stageCategory);

      // 3. Fetch latest loan process metadata (documents & progress) WITHOUT resetting user's form inputs
      const latestData: LoanProcess = await api.getLoanProcess(leadId);

      // 4. Update ONLY loanProcess state (documents list & progress gauge)
      setLoanProcess(latestData);

      // If this stage was 'Not Started', auto-advance its dropdown to match active progress
      if (stageCategory === 'loan_file' && loanStatus === 'Not Started') {
        setLoanStatus(latestData.loan_status || 'In Progress');
      } else if (stageCategory === 'installation' && installationStatus === 'Not Started') {
        setInstallationStatus(latestData.installation_status || 'In Progress');
      } else if (stageCategory === 'net_meter_file' && netMeterStatus === 'Not Started') {
        setNetMeterStatus(latestData.net_meter_status || 'In Progress');
      } else if (stageCategory === 'inspection' && inspectionStatus === 'Not Started') {
        setInspectionStatus(latestData.inspection_status || 'In Progress');
      } else if (stageCategory === 'subsidy' && subsidyStatus === 'Not Started') {
        setSubsidyStatus(latestData.subsidy_status || 'In Progress');
      }

      setSuccessMsg(`Document "${file.name}" uploaded successfully!`);
      setTimeout(() => setSuccessMsg(null), 4000);

      // Notify parent without full page reloads
      if (onRefresh) onRefresh();
    } catch (err: any) {
      // 5. On failure, preserve all existing form values and display error
      setErrorMsg(err.message || `Error uploading ${stageCategory} document`);
    } finally {
      setUploadingCategory(null);
    }
  };

  const handleDeleteDocument = async (docId: number) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await api.deleteLoanDocument(leadId, docId);

      // Update only documents without touching form inputs
      setLoanProcess((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          documents: (prev.documents || []).filter((d) => d.id !== docId)
        };
      });

      // Fetch latest progress without touching form inputs
      try {
        const latestData = await api.getLoanProcess(leadId);
        setLoanProcess((prev) => prev ? {
          ...prev,
          overall_progress_pct: latestData.overall_progress_pct,
          documents: latestData.documents
        } : latestData);
      } catch (e) {}

      setSuccessMsg('Document deleted successfully');
      setTimeout(() => setSuccessMsg(null), 3000);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error deleting document');
    }
  };

  if (loading && !loanProcess) {
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
  const installedPhotos = (loanProcess.documents || []).filter(
    (d) => d.stage_category === 'installed_photo' || d.stage_category === 'installation_photo'
  );
  const dcrReports = getDocsForStage('dcr_report');
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
                        href={getFileUrl(doc.file_path)}
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
                        href={getFileUrl(doc.file_path)}
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
                        href={getFileUrl(doc.file_path)}
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
                        href={getFileUrl(doc.file_path)}
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
        {/* 3. INSTALLATION DETAILS */}
        {/* ========================================================================= */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-5 shadow-sm hover:border-slate-700 transition-colors lg:col-span-2">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">3. Installation Details</h3>
                <span className="text-[11px] text-slate-400">Solar equipment serial numbers, site evidence & DCR verification</span>
              </div>
            </div>

            {/* Dynamic Status Indicator */}
            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-1 text-xs font-bold rounded-lg border flex items-center gap-1.5 ${
                  panelSerialNumbers.filter((s) => s.trim()).length > 0 &&
                  inverterSerialNumber.trim() &&
                  dcrReports.length > 0 &&
                  installedPhotos.length > 0
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : panelSerialNumbers.filter((s) => s.trim()).length > 0 ||
                      inverterSerialNumber.trim() ||
                      installedPhotos.length > 0 ||
                      dcrReports.length > 0
                    ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {panelSerialNumbers.filter((s) => s.trim()).length > 0 &&
                inverterSerialNumber.trim() &&
                dcrReports.length > 0 &&
                installedPhotos.length > 0 ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Equipment & Evidence Complete</span>
                  </>
                ) : panelSerialNumbers.filter((s) => s.trim()).length > 0 ||
                  inverterSerialNumber.trim() ||
                  installedPhotos.length > 0 ||
                  dcrReports.length > 0 ? (
                  <>
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    <span>Details Logged ({panelSerialNumbers.filter((s) => s.trim()).length} Panels • {installedPhotos.length} Photos)</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3.5 h-3.5 text-slate-500" />
                    <span>Pending Equipment Details</span>
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Subgrid: Left column for Equipment Serials, Right column for Documents & Photos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* ----------------- LEFT: SERIAL NUMBERS ----------------- */}
            <div className="space-y-4">
              {/* Inverter Serial Number Field */}
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Inverter Serial Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. INV-GROWATT-2026-88129"
                  value={inverterSerialNumber}
                  onChange={(e) => setInverterSerialNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-amber-500 font-mono tracking-wide"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Record the unique manufacturer serial printed on the grid-tie inverter unit.
                </span>
              </div>

              {/* Panel Serial Numbers (Dynamic list) */}
              <div className="p-3.5 rounded-xl bg-slate-850 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-[11px] font-bold text-slate-200 block">
                      Solar Panel Serial Numbers ({panelSerialNumbers.filter((s) => s.trim()).length})
                    </label>
                    <span className="text-[10px] text-slate-400">
                      Add individual serial barcode numbers for each installed PV module.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddPanelSerial}
                    className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Panel</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {panelSerialNumbers.map((serial, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-7 h-7 flex-shrink-0 rounded-md bg-slate-800 border border-slate-700 text-slate-400 text-[10px] font-mono font-bold flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <input
                        type="text"
                        placeholder={`Panel #${idx + 1} serial (e.g. WAA-540W-2026-${String(idx + 1).padStart(3, '0')})`}
                        value={serial}
                        onChange={(e) => handlePanelSerialChange(idx, e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-amber-500 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemovePanelSerial(idx)}
                        disabled={panelSerialNumbers.length === 1 && idx === 0 && !serial}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Remove Serial Field"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {panelSerialNumbers.length > 3 && (
                  <button
                    type="button"
                    onClick={handleAddPanelSerial}
                    className="w-full py-1 text-center text-[11px] text-amber-400 hover:text-amber-300 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add another panel serial number</span>
                  </button>
                )}
              </div>
            </div>

            {/* ----------------- RIGHT: EVIDENCE & DCR REPORT ----------------- */}
            <div className="space-y-4">
              {/* DCR Report Upload */}
              <div className="p-3.5 rounded-xl bg-slate-850 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-slate-200 block">DCR Report (Domestic Content Requirement)</span>
                      <span className="text-[10px] text-slate-400">PDF certificate verifying domestic solar cells & modules</span>
                    </div>
                  </div>

                  {/* Upload button if no report uploaded */}
                  {dcrReports.length === 0 && (
                    <label className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 cursor-pointer transition-colors">
                      <Upload className="w-3 h-3" />
                      <span>{uploadingCategory === 'dcr_report' ? 'Uploading...' : 'Upload DCR Report'}</span>
                      <input
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        disabled={uploadingCategory === 'dcr_report'}
                        onChange={(e) => handleDcrUpload(e)}
                      />
                    </label>
                  )}
                </div>

                {/* Hidden file input for replace action */}
                <input
                  type="file"
                  ref={replaceDcrFileInputRef}
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => handleDcrUpload(e, replacingDcrDocId || undefined)}
                />

                {/* Display uploaded DCR Report(s) */}
                {dcrReports.length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic py-1">
                    No DCR report uploaded yet. Please upload the manufacturer compliance PDF certificate.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {dcrReports.map((doc) => (
                      <div
                        key={doc.id}
                        className="p-2.5 rounded-lg bg-slate-800/80 border border-rose-500/20 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2.5 truncate max-w-[65%]">
                          <FileText className="w-4 h-4 text-rose-400 flex-shrink-0" />
                          <div className="truncate">
                            <a
                              href={getFileUrl(doc.file_path)}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-200 font-medium hover:text-amber-400 truncate hover:underline block"
                              title={doc.file_name}
                            >
                              {doc.file_name}
                            </a>
                            <div className="text-[10px] text-slate-400 flex items-center gap-2">
                              <span>{Math.round(doc.file_size / 1024)} KB</span>
                              <span>•</span>
                              <span>{formatISTDate(doc.created_at)}</span>
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                DCR Verified
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <a
                            href={getFileUrl(doc.file_path)}
                            download={doc.file_name}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
                            title="View / Download"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              setReplacingDcrDocId(doc.id);
                              replaceDcrFileInputRef.current?.click();
                            }}
                            disabled={uploadingCategory === 'dcr_report'}
                            className="p-1.5 rounded-md text-slate-400 hover:text-amber-400 hover:bg-slate-700/50 transition-colors cursor-pointer"
                            title="Replace Report"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="p-1.5 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Delete Report"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Installed Photos Upload Section */}
              <div className="p-3.5 rounded-xl bg-slate-850 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                      <ImageIcon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-slate-200 block">
                        Installed Photos ({installedPhotos.length})
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Inverter mounting, panel arrays, earthing & DCDB photos
                      </span>
                    </div>
                  </div>

                  <label className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 cursor-pointer transition-colors">
                    <Upload className="w-3 h-3" />
                    <span>{uploadingCategory === 'installed_photo' ? 'Uploading...' : 'Upload Photos'}</span>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp"
                      multiple
                      className="hidden"
                      disabled={uploadingCategory === 'installed_photo'}
                      onChange={handlePhotoUpload}
                    />
                  </label>
                </div>

                {installedPhotos.length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic py-2">
                    No installation photos uploaded yet. Upload multiple photos of the completed site installation (JPG, PNG, WebP).
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto pr-1">
                    {installedPhotos.map((photo) => (
                      <div
                        key={photo.id}
                        className="group relative rounded-xl overflow-hidden bg-slate-800 border border-slate-750 hover:border-amber-500/50 transition-all flex flex-col"
                      >
                        {/* Thumbnail */}
                        <div
                          className="h-24 w-full bg-slate-900 relative cursor-pointer overflow-hidden flex items-center justify-center"
                          onClick={() => setPreviewPhoto({ url: getFileUrl(photo.file_path), name: photo.file_name })}
                        >
                          <img
                            src={getFileUrl(photo.file_path)}
                            alt={photo.file_name}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                          {/* Hover action overlay */}
                          <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <button
                              type="button"
                              className="p-1.5 rounded-lg bg-white/20 hover:bg-white/40 text-white backdrop-blur-sm transition-colors cursor-pointer"
                              title="Preview"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewPhoto({ url: getFileUrl(photo.file_path), name: photo.file_name });
                              }}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <a
                              href={getFileUrl(photo.file_path)}
                              download={photo.file_name}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg bg-white/20 hover:bg-white/40 text-white backdrop-blur-sm transition-colors"
                              title="Download"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteDocument(photo.id);
                              }}
                              className="p-1.5 rounded-lg bg-rose-500/30 hover:bg-rose-500/60 text-white backdrop-blur-sm transition-colors cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Details */}
                        <div className="p-2 text-[10px] space-y-0.5 bg-slate-800/90">
                          <p className="text-slate-200 font-medium truncate" title={photo.file_name}>
                            {photo.file_name}
                          </p>
                          <div className="flex items-center justify-between text-slate-500 font-mono text-[9px]">
                            <span>{Math.round(photo.file_size / 1024)} KB</span>
                            <span>{formatISTDate(photo.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. NET METER FILE & STATUS */}
        {/* ========================================================================= */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-sm hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Gauge className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">4. Net Metering</h3>
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
                        href={getFileUrl(doc.file_path)}
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
                        href={getFileUrl(doc.file_path)}
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
        {/* 5. TECHNICAL INSPECTION */}
        {/* ========================================================================= */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-sm hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">5. Technical Inspection</h3>
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
                        href={getFileUrl(doc.file_path)}
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
                        href={getFileUrl(doc.file_path)}
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
        {/* 6. CENTRAL & STATE SUBSIDY TRACKING */}
        {/* ========================================================================= */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-sm hover:border-slate-700 transition-colors lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Coins className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">6. Central & State Subsidy Tracking</h3>
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
                        href={getFileUrl(doc.file_path)}
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
                        href={getFileUrl(doc.file_path)}
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

      {/* Photo Preview Lightbox Modal */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewPhoto(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-750 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/90">
              <div className="flex items-center gap-2 truncate max-w-[80%]">
                <ImageIcon className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span className="text-xs font-semibold text-white truncate">{previewPhoto.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewPhoto.url}
                  download={previewPhoto.name}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  title="Download Original"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewPhoto(null)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                  title="Close Preview"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-3 flex items-center justify-center bg-slate-950/70 max-h-[calc(90vh-60px)] overflow-auto">
              <img
                src={previewPhoto.url}
                alt={previewPhoto.name}
                className="max-h-[78vh] w-auto object-contain rounded-lg shadow-xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
