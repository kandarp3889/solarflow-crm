import React, { useState } from 'react';
import { X, Check, IndianRupee, Calendar, CreditCard, FileText } from 'lucide-react';
import { api } from '../../services/api';
import { Invoice } from '../../types';

interface RecordPaymentModalProps {
  invoice: Invoice;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  invoice,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [amount, setAmount] = useState<number>(invoice.outstanding_amount || 0);
  const [paymentMethod, setPaymentMethod] = useState<string>('Bank Transfer');
  const [reference, setReference] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      setError('Please enter a valid payment amount greater than zero.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.recordInvoicePayment(invoice.id, {
        payment_date: paymentDate,
        amount: Number(amount),
        payment_method: paymentMethod,
        transaction_reference: reference.trim() || undefined,
        notes: notes.trim() || undefined
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-[#0e1712] border border-[#1e3423] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e3423] bg-[#121e17]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#106828]/20 border border-[#106828]/40 text-[#FEC426]">
              <IndianRupee className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Record Invoice Payment</h3>
              <p className="text-xs text-slate-400">
                Invoice <span className="font-semibold text-emerald-400">{invoice.invoice_number}</span> &bull; {invoice.bill_to_name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Invoice Summary Card */}
        <div className="p-6 bg-[#0a120c] border-b border-[#1e3423] grid grid-cols-3 gap-3 text-center">
          <div className="p-3 rounded-xl bg-[#142318] border border-[#1e3423]">
            <p className="text-[11px] text-slate-400 uppercase font-semibold">Total Amount</p>
            <p className="text-sm font-bold text-white mt-1">₹{invoice.total_amount?.toLocaleString('en-IN')}</p>
          </div>
          <div className="p-3 rounded-xl bg-[#142318] border border-[#1e3423]">
            <p className="text-[11px] text-emerald-400 uppercase font-semibold">Paid to Date</p>
            <p className="text-sm font-bold text-emerald-400 mt-1">₹{invoice.paid_amount?.toLocaleString('en-IN')}</p>
          </div>
          <div className="p-3 rounded-xl bg-[#1f1b13] border border-amber-500/30">
            <p className="text-[11px] text-[#FEC426] uppercase font-semibold">Balance Due</p>
            <p className="text-sm font-bold text-[#FEC426] mt-1">₹{invoice.outstanding_amount?.toLocaleString('en-IN')}</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <IndianRupee className="w-3.5 h-3.5 text-emerald-400" /> Amount Received (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#142318] border border-[#1e3423] text-white text-sm focus:outline-none focus:border-emerald-500 font-semibold"
              />
              <button
                type="button"
                onClick={() => setAmount(invoice.outstanding_amount || 0)}
                className="text-[11px] text-emerald-400 hover:underline mt-1 block"
              >
                Set full outstanding balance (₹{invoice.outstanding_amount?.toLocaleString('en-IN')})
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" /> Payment Date *
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#142318] border border-[#1e3423] text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-emerald-400" /> Payment Method *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#142318] border border-[#1e3423] text-white text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="Bank Transfer">Bank Transfer (NEFT / RTGS / IMPS)</option>
                <option value="UPI">UPI / QR Code</option>
                <option value="Cheque">Cheque</option>
                <option value="Cash">Cash</option>
                <option value="Credit / Debit Card">Credit / Debit Card</option>
                <option value="Solar Loan Disbursement">Solar Loan Disbursement</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-400" /> Reference / UTR / Cheque No.
              </label>
              <input
                type="text"
                placeholder="e.g. UTR12345678 or CHQ9876"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#142318] border border-[#1e3423] text-white text-sm focus:outline-none focus:border-emerald-500 placeholder-slate-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Payment Remarks / Notes
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Advance 30% received for Adani 3.30kW rooftop installation..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-[#142318] border border-[#1e3423] text-white text-sm focus:outline-none focus:border-emerald-500 placeholder-slate-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1e3423]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#106828] to-[#168032] hover:from-[#158032] hover:to-[#1e9a3d] text-white text-xs font-bold transition-all shadow-lg shadow-[#106828]/25 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>Record Payment</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
