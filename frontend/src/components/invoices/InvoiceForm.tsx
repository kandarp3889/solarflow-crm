import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Check,
  Plus,
  Trash2,
  Building2,
  FileText,
  IndianRupee,
  Sparkles,
  Link as LinkIcon,
  Copy,
  Info,
  Calendar,
  Layers
} from 'lucide-react';
import { api } from '../../services/api';
import { Invoice, InvoiceItem, InvoiceStatus } from '../../types';

interface InvoiceFormProps {
  invoiceId?: number; // If provided, edit mode
  initialLeadId?: number;
  onBack: () => void;
  onSuccess: (savedInvoice: Invoice) => void;
}

// Client-side Indian words generator for live preview
function convertToIndianWords(amount: number): string {
  if (!amount || isNaN(amount) || amount === 0) return 'Rupees Zero Only';

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function numBelow1000(n: number): string {
    let str = '';
    if (n >= 100) {
      str += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      str += tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
    } else if (n > 0) {
      str += ones[n];
    }
    return str.trim();
  }

  let rupees = Math.floor(Math.abs(amount));
  const paise = Math.round((Math.abs(amount) - rupees) * 100);

  const parts: string[] = [];

  const crores = Math.floor(rupees / 10000000);
  rupees %= 10000000;
  if (crores > 0) parts.push(`${numBelow1000(crores)} Crore`);

  const lakhs = Math.floor(rupees / 100000);
  rupees %= 100000;
  if (lakhs > 0) parts.push(`${numBelow1000(lakhs)} Lakh`);

  const thousands = Math.floor(rupees / 1000);
  rupees %= 1000;
  if (thousands > 0) parts.push(`${numBelow1000(thousands)} Thousand`);

  if (rupees > 0) parts.push(numBelow1000(rupees));

  let res = parts.length > 0 ? `Rupees ${parts.join(' ')}` : 'Rupees Zero';
  if (paise > 0) {
    res += ` and ${numBelow1000(paise)} Paise`;
  }
  return res + ' Only';
}

export const InvoiceForm: React.FC<InvoiceFormProps> = ({
  invoiceId,
  initialLeadId,
  onBack,
  onSuccess
}) => {
  const isEdit = Boolean(invoiceId);

  const [loading, setLoading] = useState<boolean>(isEdit);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Leads list for optional linking & autofill
  const [leads, setLeads] = useState<any[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<number | ''>(initialLeadId || '');

  // Invoice header
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [invoiceDate, setInvoiceDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [dueDate, setDueDate] = useState<string>('');
  const [status, setStatus] = useState<InvoiceStatus>('issued');
  const [paymentTerms, setPaymentTerms] = useState<string>('Immediate');
  const [deliveryTerms, setDeliveryTerms] = useState<string>('Immediate');
  const [termsAndConditions, setTermsAndConditions] = useState<string>(
    'Looking forward for your business.'
  );
  const [notes, setNotes] = useState<string>('');

  // Bill To
  const [billToName, setBillToName] = useState<string>('POWERSHINE ENERGY');
  const [billToAddress, setBillToAddress] = useState<string>(
    'PLOT NO.22, SR NO.257/258/259/260-2, GOKUL INDUSTRIAL AREA,\nPIPLANA,RAJKOT.360030 (GUJARAT)'
  );
  const [billToContact, setBillToContact] = useState<string>('9099080480');
  const [billToGstin, setBillToGstin] = useState<string>('24AAXFP3293M1ZE');
  const [billToPos, setBillToPos] = useState<string>('24-Gujarat');

  // Ship To
  const [shipToName, setShipToName] = useState<string>('PANDIT ASHOKBHAI BHIKHABHAI');
  const [shipToAddress, setShipToAddress] = useState<string>('PLOT AREA SANGAVADA');
  const [shipToContact, setShipToContact] = useState<string>('9913402778');
  const [shipToPos, setShipToPos] = useState<string>('24-Gujarat');

  const [isInterState, setIsInterState] = useState<boolean>(false);

  // Line items
  const [items, setItems] = useState<InvoiceItem[]>([
    {
      particulars: 'Adani 3.30KW Ongrid Solar System',
      description: 'Panels :- Adani 550 * 6 NOS\nMS2607202B3016\nMS2607202B3145\nMS2607202B3149\nMS2607202B3180\nMS2607202B3191\nMS2607202B3194\nInverter :- Polycab 3.6KW\nSN : 3K6050826-2625-397508716P',
      hsn_sac: '8541',
      quantity: 1,
      unit: 'SITE',
      unit_price: 99632.69,
      gst_rate: 5.0
    },
    {
      particulars: 'Adani 3.30KW Solar Structure And Installation',
      description: 'BOS Kit',
      hsn_sac: '9987',
      quantity: 1,
      unit: 'SITE',
      unit_price: 42699.72,
      gst_rate: 18.0
    }
  ]);

  // Load leads and initial sequence
  useEffect(() => {
    loadLeads();
    if (!isEdit) {
      loadNextInvoiceNumber();
    } else if (invoiceId) {
      loadExistingInvoice(invoiceId);
    }
  }, [invoiceId]);

  const loadLeads = async () => {
    try {
      const data = await api.getLeads({ limit: 100 });
      if (Array.isArray(data)) {
        setLeads(data);
      }
    } catch (e) {
      // non-fatal
    }
  };

  const loadNextInvoiceNumber = async () => {
    try {
      const data = await api.getNextInvoiceNumber();
      if (data?.next_invoice_number) {
        setInvoiceNumber(data.next_invoice_number);
      }
    } catch (e) {
      setInvoiceNumber('INV-022');
    }
  };

  const loadExistingInvoice = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const inv = await api.getInvoiceById(id);
      setInvoiceNumber(inv.invoice_number);
      setInvoiceDate(inv.invoice_date ? inv.invoice_date.slice(0, 10) : '');
      setDueDate(inv.due_date ? inv.due_date.slice(0, 10) : '');
      setStatus(inv.status);
      setSelectedLeadId(inv.lead_id || '');
      setPaymentTerms(inv.payment_terms || 'Immediate');
      setDeliveryTerms(inv.delivery_terms || 'Immediate');
      setTermsAndConditions(inv.terms_and_conditions || 'Looking forward for your business.');
      setNotes(inv.notes || '');

      setBillToName(inv.bill_to_name || '');
      setBillToAddress(inv.bill_to_address || '');
      setBillToContact(inv.bill_to_contact || '');
      setBillToGstin(inv.bill_to_gstin || '');
      setBillToPos(inv.bill_to_pos || '24-Gujarat');

      setShipToName(inv.ship_to_name || '');
      setShipToAddress(inv.ship_to_address || '');
      setShipToContact(inv.ship_to_contact || '');
      setShipToPos(inv.ship_to_pos || '24-Gujarat');

      if (inv.items && inv.items.length > 0) {
        setItems(inv.items.map((it: InvoiceItem) => ({
          particulars: it.particulars || it.product_name || '',
          description: it.description || '',
          hsn_sac: it.hsn_sac || '8541',
          quantity: it.quantity || 1,
          unit: it.unit || 'SITE',
          unit_price: it.unit_price || 0,
          gst_rate: it.gst_rate || 18.0
        })));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  // Lead selection autofill
  const handleLeadSelect = (leadIdNum: number | '') => {
    setSelectedLeadId(leadIdNum);
    if (!leadIdNum) return;

    const lead = leads.find(l => l.id === Number(leadIdNum));
    if (lead) {
      setShipToName(lead.full_name || '');
      setShipToAddress(lead.address ? `${lead.address}, ${lead.city || ''}`.trim() : '');
      setShipToContact(lead.phone || '');

      // If Bill To is empty or matches previous lead, auto fill Bill To as well
      if (!billToName || billToName === 'POWERSHINE ENERGY') {
        setBillToName(lead.full_name || '');
        setBillToAddress(lead.address ? `${lead.address}, ${lead.city || ''}`.trim() : '');
        setBillToContact(lead.phone || '');
      }
    }
  };

  const copyBillToToShipTo = () => {
    setShipToName(billToName);
    setShipToAddress(billToAddress);
    setShipToContact(billToContact);
    setShipToPos(billToPos);
  };

  // Items manipulation
  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      {
        particulars: '',
        description: '',
        hsn_sac: '8541',
        quantity: 1,
        unit: 'NOS',
        unit_price: 0,
        gst_rate: 18.0
      }
    ]);
  };

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    setItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      alert('An invoice must contain at least one line item.');
      return;
    }
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  // Preset buttons
  const addPresetItem = (presetType: string) => {
    if (presetType === 'adani_system') {
      setItems(prev => [
        ...prev,
        {
          particulars: 'Adani 3.30KW Ongrid Solar System',
          description: 'Panels :- Adani 550 * 6 NOS\nMS2607202B3016\nMS2607202B3145\nMS2607202B3149\nMS2607202B3180\nMS2607202B3191\nMS2607202B3194\nInverter :- Polycab 3.6KW\nSN : 3K6050826-2625-397508716P',
          hsn_sac: '8541',
          quantity: 1,
          unit: 'SITE',
          unit_price: 99632.69,
          gst_rate: 5.0
        }
      ]);
    } else if (presetType === 'structure') {
      setItems(prev => [
        ...prev,
        {
          particulars: 'Adani 3.30KW Solar Structure And Installation',
          description: 'BOS Kit',
          hsn_sac: '9987',
          quantity: 1,
          unit: 'SITE',
          unit_price: 42699.72,
          gst_rate: 18.0
        }
      ]);
    } else if (presetType === 'inverter') {
      setItems(prev => [
        ...prev,
        {
          particulars: 'Solar Grid-Tie Inverter 5kW',
          description: 'Brand: Polycab / Deye 5kW with Wi-Fi Monitoring Dongle\nSN: 5K893021-998822',
          hsn_sac: '8504',
          quantity: 1,
          unit: 'NOS',
          unit_price: 48000.00,
          gst_rate: 12.0
        }
      ]);
    } else if (presetType === 'bos') {
      setItems(prev => [
        ...prev,
        {
          particulars: 'Balance of System (BOS) Kit & Protection',
          description: 'ACDB, DCDB, DC Cables (4 sq mm), Earthing Electrodes & Chemical Bag',
          hsn_sac: '8537',
          quantity: 1,
          unit: 'SET',
          unit_price: 18500.00,
          gst_rate: 18.0
        }
      ]);
    }
  };

  // Live Calculations
  let subtotal = 0;
  let totalTax = 0;
  items.forEach(item => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unit_price) || 0;
    const taxable = Math.round(qty * price * 100) / 100;
    const rate = Number(item.gst_rate) || 0;
    const tax = Math.round(taxable * (rate / 100) * 100) / 100;
    subtotal += taxable;
    totalTax += tax;
  });

  const rawTotal = subtotal + totalTax;
  const roundedTotal = Math.round(rawTotal);
  const roundOff = Math.round((roundedTotal - rawTotal) * 100) / 100;
  const wordsDisplay = convertToIndianWords(roundedTotal);

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billToName.trim()) {
      setError('Please provide customer or company name in Bill To.');
      return;
    }
    if (items.length === 0) {
      setError('Invoice must have at least one line item.');
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      lead_id: selectedLeadId ? Number(selectedLeadId) : null,
      invoice_number: invoiceNumber.trim() || undefined,
      invoice_date: new Date(invoiceDate).toISOString(),
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
      status: status,
      payment_terms: paymentTerms,
      delivery_terms: deliveryTerms,
      terms_and_conditions: termsAndConditions,
      notes: notes,

      bill_to_name: billToName.trim(),
      bill_to_address: billToAddress.trim() || undefined,
      bill_to_contact: billToContact.trim() || undefined,
      bill_to_gstin: billToGstin.trim() || undefined,
      bill_to_pos: billToPos.trim() || '24-Gujarat',

      ship_to_name: shipToName.trim() || billToName.trim(),
      ship_to_address: shipToAddress.trim() || billToAddress.trim() || undefined,
      ship_to_contact: shipToContact.trim() || billToContact.trim() || undefined,
      ship_to_pos: shipToPos.trim() || billToPos.trim() || '24-Gujarat',

      items: items.map((it, idx) => ({
        particulars: it.particulars.trim(),
        description: it.description?.trim() || undefined,
        hsn_sac: it.hsn_sac || '8541',
        quantity: Number(it.quantity) || 1,
        unit: it.unit || 'NOS',
        unit_price: Number(it.unit_price) || 0,
        gst_rate: Number(it.gst_rate) || 0,
        sort_order: idx + 1
      }))
    };

    try {
      let saved: Invoice;
      if (isEdit && invoiceId) {
        saved = await api.updateInvoice(invoiceId, payload);
      } else {
        saved = await api.createInvoice(payload);
      }
      onSuccess(saved);
    } catch (err: any) {
      setError(err.message || 'Failed to save invoice');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
        <p className="text-xs text-slate-400">Loading invoice form...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl mx-auto pb-16 animate-fade-in">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-[#0e1712] border border-[#1e3423] shadow-lg">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Cancel</span>
          </button>
          <div className="h-5 w-px bg-[#1e3423]" />
          <div>
            <h2 className="text-base font-bold text-white">
              {isEdit ? `Edit Invoice: ${invoiceNumber}` : 'Create New Tax Invoice'}
            </h2>
            <p className="text-[11px] text-slate-400">Reference standard: TrueSun Energy INV-021</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#106828] to-[#168032] hover:from-[#158032] hover:to-[#1e9a3d] text-white text-xs font-bold transition-all shadow-lg shadow-[#106828]/30 cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            <span>{isEdit ? 'Update Invoice' : 'Issue & Save Invoice'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Snapshot Issuer Alert */}
      <div className="p-4 rounded-2xl bg-[#0a120c] border border-[#1e3423] flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#106828]/20 border border-[#106828]/40 text-[#FEC426]">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <p className="font-bold text-white">Invoicing as TRUESUN ENERGY</p>
            <p className="text-slate-400 text-[11px]">
              GSTIN: 24EIVPG5500C1ZI &bull; Bank: State Bank of India (A/C: 44474952500, IFSC: SBIN0003268)
            </p>
          </div>
        </div>
        <span className="text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full font-semibold">
          Company Snapshot Locked
        </span>
      </div>

      {/* Top Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-5 rounded-2xl bg-[#0e1712] border border-[#1e3423]">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Invoice Number *</label>
          <input
            type="text"
            required
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl bg-[#142318] border border-[#1e3423] text-white text-sm font-mono focus:outline-none focus:border-emerald-500 font-bold"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Invoice Date *</label>
          <input
            type="date"
            required
            value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl bg-[#142318] border border-[#1e3423] text-white text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Link CRM Lead (Optional)</label>
          <select
            value={selectedLeadId}
            onChange={(e) => handleLeadSelect(e.target.value ? Number(e.target.value) : '')}
            className="w-full px-3.5 py-2 rounded-xl bg-[#142318] border border-[#1e3423] text-white text-xs focus:outline-none focus:border-emerald-500"
          >
            <option value="">-- No Lead Linked --</option>
            {leads.map(l => (
              <option key={l.id} value={l.id}>
                {l.full_name} ({l.lead_id || `#${l.id}`})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Invoice Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as InvoiceStatus)}
            className="w-full px-3.5 py-2 rounded-xl bg-[#142318] border border-[#1e3423] text-white text-xs focus:outline-none focus:border-emerald-500 capitalize"
          >
            <option value="draft">Draft</option>
            <option value="issued">Issued</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="paid">Paid</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Bill To & Ship To 2-Column Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bill To */}
        <div className="p-5 rounded-2xl bg-[#0e1712] border border-[#1e3423] space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#1e3423]">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <span>Bill To (Customer / Entity)</span>
            </h3>
            <span className="text-[10px] text-slate-400">Mandatory</span>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Company / Customer Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. POWERSHINE ENERGY"
              value={billToName}
              onChange={(e) => setBillToName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#142318] border border-[#1e3423] text-white text-xs font-bold focus:outline-none focus:border-emerald-500 uppercase"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Full Billing Address</label>
            <textarea
              rows={2}
              placeholder="Plot No, Industrial Area, City, Pin, State..."
              value={billToAddress}
              onChange={(e) => setBillToAddress(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl bg-[#142318] border border-[#1e3423] text-white text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Contact Phone</label>
              <input
                type="text"
                placeholder="9099080480"
                value={billToContact}
                onChange={(e) => setBillToContact(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-[#142318] border border-[#1e3423] text-white text-xs font-mono focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">PoS (Place of Supply)</label>
              <input
                type="text"
                placeholder="24-Gujarat"
                value={billToPos}
                onChange={(e) => setBillToPos(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-[#142318] border border-[#1e3423] text-white text-xs focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">GSTIN</label>
              <input
                type="text"
                placeholder="24AAXFP3293M1ZE"
                value={billToGstin}
                onChange={(e) => setBillToGstin(e.target.value.toUpperCase())}
                className="w-full px-3 py-1.5 rounded-xl bg-[#142318] border border-[#1e3423] text-white text-xs font-mono uppercase focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Ship To */}
        <div className="p-5 rounded-2xl bg-[#0e1712] border border-[#1e3423] space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#1e3423]">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <span>Ship To (Installation Site)</span>
            </h3>
            <button
              type="button"
              onClick={copyBillToToShipTo}
              className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold"
            >
              <Copy className="w-3 h-3" />
              <span>Copy from Bill To</span>
            </button>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Site Customer / Contact Person *</label>
            <input
              type="text"
              required
              placeholder="e.g. PANDIT ASHOKBHAI BHIKHABHAI"
              value={shipToName}
              onChange={(e) => setShipToName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#142318] border border-[#1e3423] text-white text-xs font-bold focus:outline-none focus:border-emerald-500 uppercase"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Site Installation Address</label>
            <textarea
              rows={2}
              placeholder="Plot Area, Village / Town, District..."
              value={shipToAddress}
              onChange={(e) => setShipToAddress(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl bg-[#142318] border border-[#1e3423] text-white text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Site Contact Phone</label>
              <input
                type="text"
                placeholder="9913402778"
                value={shipToContact}
                onChange={(e) => setShipToContact(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-[#142318] border border-[#1e3423] text-white text-xs font-mono focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Site PoS</label>
              <input
                type="text"
                placeholder="24-Gujarat"
                value={shipToPos}
                onChange={(e) => setShipToPos(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-[#142318] border border-[#1e3423] text-white text-xs focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Items Table Section */}
      <div className="p-5 rounded-2xl bg-[#0e1712] border border-[#1e3423] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#1e3423]">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Invoice Line Items</span>
            </h3>
            <p className="text-[11px] text-slate-400">Add equipment, serial numbers, solar panels, and structure line items</p>
          </div>

          {/* Quick preset buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-slate-400 mr-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#FEC426]" /> Presets:
            </span>
            <button
              type="button"
              onClick={() => addPresetItem('adani_system')}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold cursor-pointer transition-colors"
            >
              + Adani 3.30kW System
            </button>
            <button
              type="button"
              onClick={() => addPresetItem('structure')}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold cursor-pointer transition-colors"
            >
              + Structure & BOS
            </button>
            <button
              type="button"
              onClick={() => addPresetItem('inverter')}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold cursor-pointer transition-colors"
            >
              + 5kW Inverter
            </button>
            <button
              type="button"
              onClick={() => addPresetItem('bos')}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold cursor-pointer transition-colors"
            >
              + BOS Kit
            </button>
          </div>
        </div>

        {/* Item Rows */}
        <div className="space-y-3">
          {items.map((item, idx) => {
            const itemQty = Number(item.quantity) || 0;
            const itemPrice = Number(item.unit_price) || 0;
            const itemTaxable = Math.round(itemQty * itemPrice * 100) / 100;

            return (
              <div
                key={idx}
                className="p-4 rounded-xl bg-[#0a120c] border border-[#1e3423] space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">Item #{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Remove Item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="md:col-span-5">
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                      Product / Service Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Adani 3.30KW Ongrid Solar System"
                      value={item.particulars}
                      onChange={(e) => handleItemChange(idx, 'particulars', e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#142318] border border-[#1e3423] text-white text-xs font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                      HSN/SAC
                    </label>
                    <input
                      type="text"
                      placeholder="8541"
                      value={item.hsn_sac}
                      onChange={(e) => handleItemChange(idx, 'hsn_sac', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#142318] border border-[#1e3423] text-white text-xs font-mono text-center focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="md:col-span-1">
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                      Qty
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      required
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 rounded-lg bg-[#142318] border border-[#1e3423] text-white text-xs text-center focus:outline-none focus:border-emerald-500 font-bold"
                    />
                  </div>

                  <div className="md:col-span-1">
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                      Unit
                    </label>
                    <select
                      value={item.unit}
                      onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                      className="w-full px-1 py-1.5 rounded-lg bg-[#142318] border border-[#1e3423] text-white text-[11px] focus:outline-none focus:border-emerald-500"
                    >
                      <option value="SITE">SITE</option>
                      <option value="NOS">NOS</option>
                      <option value="SET">SET</option>
                      <option value="KW">KW</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                      Unit Price (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={item.unit_price}
                      onChange={(e) => handleItemChange(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#142318] border border-[#1e3423] text-white text-xs text-right font-mono focus:outline-none focus:border-emerald-500 font-bold"
                    />
                  </div>

                  <div className="md:col-span-1">
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                      GST %
                    </label>
                    <select
                      value={item.gst_rate}
                      onChange={(e) => handleItemChange(idx, 'gst_rate', parseFloat(e.target.value) || 0)}
                      className="w-full px-1 py-1.5 rounded-lg bg-[#142318] border border-[#1e3423] text-white text-xs text-center font-bold focus:outline-none focus:border-emerald-500"
                    >
                      <option value="0">0%</option>
                      <option value="5">5%</option>
                      <option value="12">12%</option>
                      <option value="18">18%</option>
                      <option value="28">28%</option>
                    </select>
                  </div>
                </div>

                {/* Multiline description for panel and inverter serial numbers */}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                    Equipment Specifications & Serial Numbers (Multi-line)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Panels :- Adani 550 * 6 NOS&#10;MS2607202B3016&#10;Inverter :- Polycab 3.6KW&#10;SN : 3K6050826..."
                    value={item.description || ''}
                    onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-[#142318] border border-[#1e3423] text-white text-xs font-mono focus:outline-none placeholder-slate-600"
                  />
                </div>

                <div className="text-right text-xs text-slate-400">
                  Taxable Amount: <span className="text-white font-bold font-mono">₹{itemTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleAddItem}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#142318] hover:bg-[#1a2f20] border border-[#1e3423] text-white text-xs font-semibold cursor-pointer transition-colors"
        >
          <Plus className="w-4 h-4 text-emerald-400" />
          <span>Add Custom Line Item</span>
        </button>
      </div>

      {/* Calculations & Words Live Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-2xl bg-[#0e1712] border border-[#1e3423] shadow-lg">
        {/* Left: Terms and Amount in Words */}
        <div className="space-y-4">
          <div>
            <p className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Amount in Words (Calculated Automatically):</p>
            <div className="p-3.5 rounded-xl bg-[#0a120c] border border-[#1e3423] text-xs font-bold text-[#FEC426] leading-relaxed">
              {wordsDisplay}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Payment Terms</label>
              <input
                type="text"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-[#142318] border border-[#1e3423] text-white text-xs focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Delivery Terms</label>
              <input
                type="text"
                value={deliveryTerms}
                onChange={(e) => setDeliveryTerms(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-[#142318] border border-[#1e3423] text-white text-xs focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Declaration / Terms</label>
            <input
              type="text"
              value={termsAndConditions}
              onChange={(e) => setTermsAndConditions(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-[#142318] border border-[#1e3423] text-white text-xs focus:outline-none"
            />
          </div>
        </div>

        {/* Right: Financial Totals Breakdown */}
        <div className="p-5 rounded-xl bg-[#0a120c] border border-[#1e3423] space-y-3">
          <p className="text-xs font-bold text-white uppercase tracking-wider pb-2 border-b border-[#1e3423]">
            Summary Financial Calculations
          </p>

          <div className="flex justify-between text-xs text-slate-300">
            <span>Sub Total (Taxable Amount):</span>
            <span className="font-mono font-bold text-white">₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>

          <div className="flex justify-between text-xs text-slate-300">
            <span>GST Amount (+):</span>
            <span className="font-mono font-bold text-emerald-400">₹{totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>

          <div className="flex justify-between text-xs text-slate-300">
            <span>Round Off Adjustment ({roundOff >= 0 ? '+' : '-'}):</span>
            <span className="font-mono font-bold text-slate-300">₹{Math.abs(roundOff).toFixed(2)}</span>
          </div>

          <div className="pt-3 border-t border-[#1e3423] flex items-center justify-between">
            <span className="text-sm font-extrabold text-white uppercase">TOTAL AMOUNT (₹):</span>
            <span className="text-xl font-extrabold text-[#FEC426] font-mono">
              ₹{roundedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>
    </form>
  );
};
