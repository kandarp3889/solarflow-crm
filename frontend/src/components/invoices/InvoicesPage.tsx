import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Receipt,
  Plus,
  Settings,
  Download,
  FileText
} from 'lucide-react';
import { InvoiceDashboard } from './InvoiceDashboard';
import { InvoiceList } from './InvoiceList';
import { InvoiceForm } from './InvoiceForm';
import { InvoiceDetail } from './InvoiceDetail';
import { InvoiceBackupRestore } from './InvoiceBackupRestore';
import { InvoiceSettingsModal } from './InvoiceSettingsModal';
import { Invoice } from '../../types';
import { api } from '../../services/api';

interface InvoicesPageProps {
  onSelectLead?: (leadId: number) => void;
}

export const InvoicesPage: React.FC<InvoicesPageProps> = ({ onSelectLead }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'all' | 'create' | 'edit' | 'detail' | 'backup'>(
    'dashboard'
  );
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [loadingInvoice, setLoadingInvoice] = useState<boolean>(false);

  // If selectedInvoiceId changes, load the full invoice
  useEffect(() => {
    if (selectedInvoiceId) {
      loadSelectedInvoice(selectedInvoiceId);
    }
  }, [selectedInvoiceId]);

  const loadSelectedInvoice = async (id: number) => {
    setLoadingInvoice(true);
    try {
      const data = await api.getInvoiceById(id);
      setSelectedInvoice(data);
    } catch (err: any) {
      alert(`Could not load invoice #${id}: ${err.message}`);
      setActiveTab('all');
    } finally {
      setLoadingInvoice(false);
    }
  };

  const handleViewInvoice = (id: number) => {
    setSelectedInvoiceId(id);
    setActiveTab('detail');
  };

  const handleEditInvoice = (id: number) => {
    setSelectedInvoiceId(id);
    setActiveTab('edit');
  };

  const handleViewAllWithFilter = (filter?: string) => {
    setStatusFilter(filter || '');
    setActiveTab('all');
  };

  const handleSavedSuccess = (saved: Invoice) => {
    setSelectedInvoice(saved);
    setSelectedInvoiceId(saved.id);
    setActiveTab('detail');
  };

  return (
    <div className="min-h-screen bg-[#070d09] text-slate-100 p-4 sm:p-6 lg:p-8">
      {/* Sub-Navigation Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-[#1e3423]">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-[#106828] to-[#1e8237] p-2 shadow-md shadow-[#106828]/30 border border-[#FEC426]/30">
            <Receipt className="w-6 h-6 text-[#FEC426]" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight font-display">Invoice Management</h1>
            <p className="text-xs text-slate-400">Independent Invoicing Module for TrueSun Energy</p>
          </div>
        </div>

        {/* Subtabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#0e1712] border border-[#1e3423] rounded-2xl">
          <button
            onClick={() => {
              setActiveTab('dashboard');
              setSelectedInvoiceId(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-[#106828] text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('all');
              setSelectedInvoiceId(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-[#106828] text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>All Invoices</span>
          </button>

          <button
            onClick={() => {
              setSelectedInvoiceId(null);
              setActiveTab('create');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'create'
                ? 'bg-[#106828] text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Plus className="w-3.5 h-3.5 text-[#FEC426]" />
            <span>Create Invoice</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('backup');
              setSelectedInvoiceId(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'backup'
                ? 'bg-[#106828] text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Backup & Restore</span>
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Invoice Settings</span>
          </button>
        </div>
      </div>

      {/* Main Tab Render */}
      {activeTab === 'dashboard' && (
        <InvoiceDashboard
          onCreateInvoice={() => setActiveTab('create')}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenBackup={() => setActiveTab('backup')}
          onViewInvoice={handleViewInvoice}
          onViewAllInvoices={handleViewAllWithFilter}
        />
      )}

      {activeTab === 'all' && (
        <InvoiceList
          initialStatusFilter={statusFilter}
          onCreateInvoice={() => setActiveTab('create')}
          onViewInvoice={handleViewInvoice}
          onEditInvoice={handleEditInvoice}
          onSelectLead={onSelectLead}
        />
      )}

      {activeTab === 'create' && (
        <InvoiceForm
          onBack={() => setActiveTab('all')}
          onSuccess={handleSavedSuccess}
        />
      )}

      {activeTab === 'edit' && selectedInvoiceId && (
        <InvoiceForm
          invoiceId={selectedInvoiceId}
          onBack={() => setActiveTab('detail')}
          onSuccess={handleSavedSuccess}
        />
      )}

      {activeTab === 'detail' && selectedInvoice && (
        <InvoiceDetail
          invoice={selectedInvoice}
          onBack={() => setActiveTab('all')}
          onEdit={handleEditInvoice}
          onRefresh={() => selectedInvoiceId && loadSelectedInvoice(selectedInvoiceId)}
        />
      )}

      {activeTab === 'detail' && loadingInvoice && (
        <div className="py-24 text-center text-slate-400">
          <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto mb-2" />
          Loading invoice details...
        </div>
      )}

      {activeTab === 'backup' && (
        <InvoiceBackupRestore
          onRestoreSuccess={() => {
            setActiveTab('all');
          }}
        />
      )}

      {/* Settings Modal */}
      <InvoiceSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
};
