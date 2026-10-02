import React, { useState, useRef } from 'react';
import {
  Download,
  Upload,
  ShieldCheck,
  AlertTriangle,
  FileArchive,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  Layers,
  ArrowRight
} from 'lucide-react';
import { api, triggerFileDownload } from '../../services/api';
import { InvoiceBackupPreview } from '../../types';

interface InvoiceBackupRestoreProps {
  onRestoreSuccess?: () => void;
}

export const InvoiceBackupRestore: React.FC<InvoiceBackupRestoreProps> = ({ onRestoreSuccess }) => {
  // Download states
  const [downloading, setDownloading] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // Restore states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [inspecting, setInspecting] = useState<boolean>(false);
  const [preview, setPreview] = useState<InvoiceBackupPreview | null>(null);
  const [strategy, setStrategy] = useState<'skip_existing' | 'replace_all'>('skip_existing');
  const [confirmText, setConfirmText] = useState<string>('');
  const [restoring, setRestoring] = useState<boolean>(false);
  const [restoreResult, setRestoreResult] = useState<any | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Download Backup to Local Machine
  const handleDownloadBackup = async () => {
    setDownloading(true);
    setDownloadSuccess(null);
    setDownloadError(null);
    try {
      const blob = await api.downloadInvoiceBackupZip();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `truesun_invoices_backup_${timestamp}.zip`;
      triggerFileDownload(blob, filename);
      setDownloadSuccess(`Successfully generated and downloaded ${filename} to your local computer!`);
    } catch (err: any) {
      setDownloadError(err.message || 'Failed to generate local backup');
    } finally {
      setDownloading(false);
    }
  };

  // 2. Select & Inspect File
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.endsWith('.zip')) {
        setRestoreError('Please select a valid .zip invoice backup archive.');
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setPreview(null);
      setRestoreResult(null);
      setRestoreError(null);
    }
  };

  const handleInspectBackup = async () => {
    if (!selectedFile) return;
    setInspecting(true);
    setRestoreError(null);
    try {
      const data = await api.previewInvoiceBackup(selectedFile);
      if (!data.is_valid) {
        setRestoreError(data.message || 'Invalid or corrupted backup archive.');
        setPreview(null);
      } else {
        setPreview(data);
      }
    } catch (err: any) {
      setRestoreError(err.message || 'Failed to inspect backup file');
      setPreview(null);
    } finally {
      setInspecting(false);
    }
  };

  // 3. Execute Restore
  const handleExecuteRestore = async () => {
    if (!selectedFile || !preview) return;

    if (strategy === 'replace_all' && confirmText.trim().toUpperCase() !== 'CONFIRM') {
      setRestoreError('You must type CONFIRM to proceed with replacing all existing invoice data.');
      return;
    }

    setRestoring(true);
    setRestoreError(null);
    setRestoreResult(null);
    try {
      const res = await api.restoreInvoiceBackup(selectedFile, strategy);
      setRestoreResult(res);
      setSelectedFile(null);
      setPreview(null);
      setConfirmText('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      if (onRestoreSuccess) {
        onRestoreSuccess();
      }
    } catch (err: any) {
      setRestoreError(err.message || 'Failed to restore invoice backup');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#0d1711] via-[#122318] to-[#0d1711] border border-[#1e3423] shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-white tracking-tight">Invoice Local Backup & Disaster Recovery</h2>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Protect TrueSun Energy financial records by downloading encrypted JSON + manifest backups directly to your local workstation. Backups can be restored anytime with collision safety and transaction rollbacks.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 self-start md:self-auto">
          <CheckCircle2 className="w-4 h-4" />
          <span>Real Browser Download Verified</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Create Backup */}
        <div className="p-6 rounded-2xl bg-[#0e1712] border border-[#1e3423] shadow-lg flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#106828]/20 border border-[#106828]/40 text-[#FEC426]">
                <Download className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">1. Export to Local Machine</h3>
                <p className="text-xs text-slate-400">Creates a downloadable ZIP archive containing complete invoice datasets</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#0a120c] border border-[#1e3423] space-y-2.5 text-xs text-slate-300">
              <p className="font-semibold text-white">What is included in the backup ZIP:</p>
              <ul className="space-y-1.5 list-disc pl-4 text-slate-400">
                <li><span className="text-white font-medium">manifest.json</span>: Backup timestamp, version & verification hashes</li>
                <li><span className="text-white font-medium">invoices.json</span>: All invoices with snapshots & financial totals</li>
                <li><span className="text-white font-medium">invoice_items.json</span>: Multi-line product descriptions & HSN items</li>
                <li><span className="text-white font-medium">invoice_payments.json</span>: Complete payment tracking & UTR references</li>
                <li><span className="text-white font-medium">invoice_settings.json</span>: TrueSun Energy company & bank configuration</li>
              </ul>
            </div>

            {downloadSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{downloadSuccess}</span>
              </div>
            )}

            {downloadError && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{downloadError}</span>
              </div>
            )}
          </div>

          <button
            onClick={handleDownloadBackup}
            disabled={downloading}
            className="w-full flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl bg-gradient-to-r from-[#106828] to-[#168032] hover:from-[#158032] hover:to-[#1e9a3d] text-white text-sm font-bold transition-all shadow-lg shadow-[#106828]/30 cursor-pointer disabled:opacity-50"
          >
            {downloading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>Preparing Archive...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download Local Machine Backup (.ZIP)</span>
              </>
            )}
          </button>
        </div>

        {/* Card 2: Restore from Local Computer */}
        <div className="p-6 rounded-2xl bg-[#0e1712] border border-[#1e3423] shadow-lg flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[#FEC426]">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">2. Restore from Local File</h3>
                <p className="text-xs text-slate-400">Restore invoices from a previously saved local backup ZIP file</p>
              </div>
            </div>

            {/* File Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#1e3423] hover:border-emerald-500/60 rounded-xl p-5 text-center cursor-pointer transition-colors bg-[#0a120c]"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip"
                onChange={handleFileChange}
                className="hidden"
              />
              <FileArchive className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              {selectedFile ? (
                <div>
                  <p className="text-xs font-bold text-emerald-400">{selectedFile.name}</p>
                  <p className="text-[11px] text-slate-400">{(selectedFile.size / 1024).toFixed(1)} KB &bull; Click to change</p>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-semibold text-slate-300">Click to select backup ZIP from your computer</p>
                  <p className="text-[11px] text-slate-500 mt-1">Accepts standard TrueSun Energy .zip backups</p>
                </div>
              )}
            </div>

            {selectedFile && !preview && (
              <button
                type="button"
                onClick={handleInspectBackup}
                disabled={inspecting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#142318] hover:bg-[#1a2f20] border border-[#1e3423] text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                {inspecting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>Verifying Archive Structure...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Verify & Preview Backup Contents</span>
                  </>
                )}
              </button>
            )}

            {restoreError && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{restoreError}</span>
              </div>
            )}

            {restoreResult && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Restore Completed Successfully</span>
                </div>
                <p className="text-xs text-slate-300">{restoreResult.message}</p>
                {restoreResult.details && (
                  <p className="text-[11px] text-slate-400">
                    Restored {restoreResult.details.restored_invoices} invoice(s), {restoreResult.details.restored_items} item(s), and {restoreResult.details.restored_payments} payment(s).
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="p-3 rounded-xl bg-[#0a120c] border border-[#1e3423] text-[11px] text-slate-400 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Restore verifies archive signatures and preserves audit trail automatically.</span>
          </div>
        </div>
      </div>

      {/* Backup Preview & Conflict Confirmation Drawer */}
      {preview && (
        <div className="p-6 rounded-2xl bg-[#0e1712] border border-[#1e3423] shadow-2xl space-y-6 animate-fade-in">
          <div className="flex items-center justify-between pb-4 border-b border-[#1e3423]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Backup Archive Verification Preview</h3>
                <p className="text-xs text-slate-400">
                  Created on <span className="text-slate-300 font-semibold">{preview.backup_date || 'Unknown'}</span> &bull; Version: {preview.backup_version || '1.0'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setPreview(null)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cancel Preview
            </button>
          </div>

          {/* Counts Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3.5 rounded-xl bg-[#142318] border border-[#1e3423]">
              <p className="text-[11px] text-slate-400 uppercase font-semibold">Invoices</p>
              <p className="text-lg font-bold text-white mt-1">{preview.invoices_count}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-[#142318] border border-[#1e3423]">
              <p className="text-[11px] text-slate-400 uppercase font-semibold">Line Items</p>
              <p className="text-lg font-bold text-white mt-1">{preview.items_count}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-[#142318] border border-[#1e3423]">
              <p className="text-[11px] text-slate-400 uppercase font-semibold">Payment Records</p>
              <p className="text-lg font-bold text-white mt-1">{preview.payments_count}</p>
            </div>
            <div className={`p-3.5 rounded-xl border ${
              preview.existing_conflicts > 0
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            }`}>
              <p className="text-[11px] uppercase font-semibold">Existing In DB</p>
              <p className="text-lg font-bold mt-1">{preview.existing_conflicts} Conflict(s)</p>
            </div>
          </div>

          {/* Conflict & Strategy Selection */}
          <div className="p-5 rounded-xl bg-[#0a120c] border border-[#1e3423] space-y-4">
            <p className="text-xs font-bold text-white uppercase tracking-wider">Select Restore Strategy</p>

            <div className="space-y-3">
              <label className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                strategy === 'skip_existing'
                  ? 'bg-emerald-500/10 border-emerald-500/50 text-white'
                  : 'bg-[#142318] border-[#1e3423] text-slate-300 hover:border-slate-600'
              }`}>
                <input
                  type="radio"
                  name="restore_strategy"
                  value="skip_existing"
                  checked={strategy === 'skip_existing'}
                  onChange={() => setStrategy('skip_existing')}
                  className="mt-1"
                />
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-emerald-400">Safe Import (Skip Existing Invoices - Recommended)</p>
                  <p className="text-[11px] text-slate-400">
                    Restores only invoices that are missing from your database. Existing invoices with the same invoice number will NOT be overwritten or duplicated.
                  </p>
                </div>
              </label>

              <label className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                strategy === 'replace_all'
                  ? 'bg-red-500/10 border-red-500/50 text-white'
                  : 'bg-[#142318] border-[#1e3423] text-slate-300 hover:border-slate-600'
              }`}>
                <input
                  type="radio"
                  name="restore_strategy"
                  value="replace_all"
                  checked={strategy === 'replace_all'}
                  onChange={() => setStrategy('replace_all')}
                  className="mt-1"
                />
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-red-400">Full Replacement (Overwrite All Invoices)</p>
                  <p className="text-[11px] text-slate-400">
                    Wipes the current invoice database for TrueSun Energy and restores exactly what is inside this backup file.
                  </p>
                </div>
              </label>
            </div>

            {strategy === 'replace_all' && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/40 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-red-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Destructive Operation Confirmation Required</span>
                </div>
                <p className="text-xs text-slate-300">
                  To confirm full replacement of your existing invoice database, type <strong className="text-white font-mono">CONFIRM</strong> in the box below:
                </p>
                <input
                  type="text"
                  placeholder="Type CONFIRM to authorize"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="w-full max-w-xs px-3 py-2 rounded-lg bg-[#0e1712] border border-red-500/50 text-white text-xs font-mono focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Invoices Preview Table */}
          {preview.invoices_preview && preview.invoices_preview.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-300">Invoices inside this archive:</p>
              <div className="max-h-52 overflow-y-auto rounded-xl border border-[#1e3423] bg-[#0a120c]">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-[#121e17] text-slate-400 border-b border-[#1e3423]">
                    <tr>
                      <th className="py-2 px-3 font-semibold">Invoice No</th>
                      <th className="py-2 px-3 font-semibold">Customer (Bill To)</th>
                      <th className="py-2 px-3 font-semibold">Date</th>
                      <th className="py-2 px-3 font-semibold text-right">Total</th>
                      <th className="py-2 px-3 font-semibold text-center">Status In DB</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e3423]">
                    {preview.invoices_preview.map((inv, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.02]">
                        <td className="py-2 px-3 font-mono font-bold text-white">{inv.invoice_number}</td>
                        <td className="py-2 px-3">{inv.bill_to_name}</td>
                        <td className="py-2 px-3 text-slate-400">{inv.date}</td>
                        <td className="py-2 px-3 text-right font-semibold text-emerald-400">
                          ₹{inv.total_amount?.toLocaleString('en-IN')}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {inv.exists ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              Already in DB
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              New Record
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1e3423]">
            <button
              type="button"
              onClick={() => setPreview(null)}
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExecuteRestore}
              disabled={restoring || (strategy === 'replace_all' && confirmText.trim().toUpperCase() !== 'CONFIRM')}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-900/30 cursor-pointer disabled:opacity-50"
            >
              {restoring ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Restoring Database...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>Confirm & Restore Invoices</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
