import React from 'react';
import { X } from 'lucide-react';
import { LoanProcessSection } from './LoanProcessSection';

interface LoanProcessModalProps {
  isOpen: boolean;
  leadId: number | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export const LoanProcessModal: React.FC<LoanProcessModalProps> = ({
  isOpen,
  leadId,
  onClose,
  onSuccess
}) => {
  if (!isOpen || !leadId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div
        className="w-full max-w-5xl bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col max-h-[94vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <h2 className="text-base font-bold text-white font-display">
              Solar Loan, Installation & Execution Module
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          <LoanProcessSection
            leadId={leadId}
            onRefresh={() => {
              if (onSuccess) onSuccess();
            }}
          />
        </div>
      </div>
    </div>
  );
};
