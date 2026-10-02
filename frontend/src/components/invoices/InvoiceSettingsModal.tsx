import React, { useState, useEffect } from 'react';
import { X, Check, Building2, Landmark, Settings2, FileText, Shield } from 'lucide-react';
import { api } from '../../services/api';
import { InvoiceSettings } from '../../types';

interface InvoiceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const InvoiceSettingsModal: React.FC<InvoiceSettingsModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<InvoiceSettings>>({
    company_name: 'TRUESUN ENERGY',
    address: 'New Plot Area, Gam Vistar, Sultanpur',
    contact_number: '9974045095',
    email: 'info.truesunenergy@gmail.com',
    website: 'truesunenergy.in',
    gstin: '24EIVPG5500C1ZI',
    pan: 'EIVPG5500C',
    state_code: '24',
    state_name: 'Gujarat',
    bank_name: 'State Bank of India',
    account_number: '44474952500',
    ifsc_code: 'SBIN0003268',
    branch_name: 'Sultanpur',
    invoice_prefix: 'INV-',
    next_invoice_number: 22,
    default_payment_terms: 'Immediate / On Delivery',
    default_terms: 'Looking forward for your business.',
    declaration: 'We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.',
    signature_label: 'For, TRUESUN ENERGY'
  });

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getInvoiceSettings();
      if (data) {
        setFormData(data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load invoice settings');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof InvoiceSettings, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await api.updateInvoiceSettings(formData);
      setSuccessMsg('Invoice settings updated successfully! New invoices will reflect these configurations.');
      if (onSuccess) onSuccess();
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to update invoice settings');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="w-full max-w-3xl my-8 bg-[#0e1712] border border-[#1e3423] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e3423] bg-[#121e17] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#106828]/20 border border-[#106828]/40 text-[#FEC426]">
              <Settings2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Invoice Configuration & Company Details</h3>
              <p className="text-xs text-slate-400">Configure pre-filled company, banking, and numbering rules for TrueSun Energy invoices</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="overflow-y-auto p-6 space-y-6 flex-1">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400 font-semibold flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>{successMsg}</span>
            </div>
          )}

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
              <p className="text-xs text-slate-400">Loading invoice configuration...</p>
            </div>
          ) : (
            <form id="invoice-settings-form" onSubmit={handleSubmit} className="space-y-6">
              {/* 1. Company Profile */}
              <div className="p-5 rounded-2xl bg-[#0a120c] border border-[#1e3423] space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <Building2 className="w-4 h-4 text-emerald-400" />
                  <span>Company Identity & GST Details</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Company Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.company_name || ''}
                      onChange={(e) => handleChange('company_name', e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#142318] border border-[#1e3423] text-white text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">GSTIN Number *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 24EIVPG5500C1ZI"
                      value={formData.gstin || ''}
                      onChange={(e) => handleChange('gstin', e.target.value.toUpperCase())}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#142318] border border-[#1e3423] text-white text-sm font-mono focus:outline-none focus:border-emerald-500 uppercase"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Registered Address *</label>
                    <input
                      type="text"
                      required
                      placeholder="New Plot Area, Gam Vistar, Sultanpur"
                      value={formData.address || ''}
                      onChange={(e) => handleChange('address', e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#142318] border border-[#1e3423] text-white text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Contact Phone *</label>
                    <input
                      type="text"
                      required
                      placeholder="9974045095"
                      value={formData.contact_number || ''}
                      onChange={(e) => handleChange('contact_number', e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#142318] border border-[#1e3423] text-white text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="info.truesunenergy@gmail.com"
                      value={formData.email || ''}
                      onChange={(e) => handleChange('email', e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#142318] border border-[#1e3423] text-white text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Website</label>
                    <input
                      type="text"
                      placeholder="truesunenergy.in"
                      value={formData.website || ''}
                      onChange={(e) => handleChange('website', e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#142318] border border-[#1e3423] text-white text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">State & POS Default</label>
                    <input
                      type="text"
                      placeholder="24-Gujarat"
                      value={`${formData.state_code || '24'}-${formData.state_name || 'Gujarat'}`}
                      onChange={(e) => {
                        const parts = e.target.value.split('-');
                        handleChange('state_code', parts[0] || '24');
                        handleChange('state_name', parts[1] || 'Gujarat');
                      }}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#142318] border border-[#1e3423] text-white text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Bank Details */}
              <div className="p-5 rounded-2xl bg-[#0a120c] border border-[#1e3423] space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <Landmark className="w-4 h-4 text-[#FEC426]" />
                  <span>Bank Account Details (Printed on Invoices)</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Bank Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="State Bank of India"
                      value={formData.bank_name || ''}
                      onChange={(e) => handleChange('bank_name', e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#142318] border border-[#1e3423] text-white text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Account Number *</label>
                    <input
                      type="text"
                      required
                      placeholder="44474952500"
                      value={formData.account_number || ''}
                      onChange={(e) => handleChange('account_number', e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#142318] border border-[#1e3423] text-white text-sm font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Branch & IFSC Code *</label>
                    <input
                      type="text"
                      required
                      placeholder="SBIN0003268"
                      value={formData.ifsc_code || ''}
                      onChange={(e) => handleChange('ifsc_code', e.target.value.toUpperCase())}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#142318] border border-[#1e3423] text-white text-sm font-mono focus:outline-none focus:border-emerald-500 uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Branch Name</label>
                    <input
                      type="text"
                      placeholder="Sultanpur"
                      value={formData.branch_name || ''}
                      onChange={(e) => handleChange('branch_name', e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#142318] border border-[#1e3423] text-white text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Sequence & Numbering */}
              <div className="p-5 rounded-2xl bg-[#0a120c] border border-[#1e3423] space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span>Invoice Sequence & Terms</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Invoice Prefix</label>
                    <input
                      type="text"
                      placeholder="INV-"
                      value={formData.invoice_prefix || 'INV-'}
                      onChange={(e) => handleChange('invoice_prefix', e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#142318] border border-[#1e3423] text-white text-sm focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Next Invoice Sequence Number</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.next_invoice_number || 22}
                      onChange={(e) => handleChange('next_invoice_number', parseInt(e.target.value) || 1)}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#142318] border border-[#1e3423] text-white text-sm focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Default Terms / Declaration</label>
                    <input
                      type="text"
                      placeholder="Looking forward for your business."
                      value={formData.default_terms || ''}
                      onChange={(e) => handleChange('default_terms', e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#142318] border border-[#1e3423] text-white text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Signature Box Label</label>
                    <input
                      type="text"
                      placeholder="For, TRUESUN ENERGY"
                      value={formData.signature_label || 'For, TRUESUN ENERGY'}
                      onChange={(e) => handleChange('signature_label', e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#142318] border border-[#1e3423] text-white text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#1e3423] bg-[#121e17] shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>Changes will apply automatically to newly generated invoices. Historical invoices remain snapshot-protected.</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="invoice-settings-form"
              disabled={saving || loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#106828] to-[#168032] hover:from-[#158032] hover:to-[#1e9a3d] text-white text-xs font-bold transition-all shadow-lg shadow-[#106828]/25 disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>Save Configuration</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
