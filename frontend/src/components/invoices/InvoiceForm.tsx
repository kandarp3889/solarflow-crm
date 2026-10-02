import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Check,
  Plus,
  Trash2,
  Building2,
  FileText,
  IndianRupee,
  Sparkles,
  Copy,
  Info,
  Layers,
  Search,
  Percent,
  ChevronDown,
  ChevronUp,
  Tag,
  Sliders,
  CheckCircle2,
  HelpCircle,
  ArrowUpDown
} from 'lucide-react';
import { api } from '../../services/api';
import { Invoice, InvoiceItem, InvoiceStatus } from '../../types';

interface InvoiceFormProps {
  invoiceId?: number; // If provided, edit mode
  initialLeadId?: number;
  onBack: () => void;
  onSuccess: (savedInvoice: Invoice) => void;
}

// ---------------------------------------------------------------------------
// 1. HSN / SAC Database for Smart Auto-Lookup & Recommendations
// ---------------------------------------------------------------------------
export interface HsnSuggestion {
  code: string;
  category: string;
  description: string;
  defaultGst: number;
}

export const HSN_DATABASE: HsnSuggestion[] = [
  { code: '8541', category: 'Solar Panels', description: 'Photovoltaic Cells, Solar PV Modules / Panels', defaultGst: 5 },
  { code: '8504', category: 'Inverters', description: 'Solar Grid-Tie / Hybrid Inverters, Static Converters', defaultGst: 12 },
  { code: '9987', category: 'Installation', description: 'Solar Structure Erection, BOS & Installation Services', defaultGst: 18 },
  { code: '8537', category: 'Switchgear', description: 'ACDB, DCDB Panels, Distribution Boards & Protection', defaultGst: 18 },
  { code: '7308', category: 'Structures', description: 'Solar Module Mounting Structures (GI / Aluminium)', defaultGst: 18 },
  { code: '8544', category: 'Cables', description: 'Solar DC Cables (4/6 sq mm), AC Wires & Conductors', defaultGst: 18 },
  { code: '8507', category: 'Batteries', description: 'Solar Storage Batteries (Lithium-ion / Lead Acid)', defaultGst: 18 },
  { code: '9030', category: 'Meters', description: 'Net Meters, Bi-Directional Generation Check Meters', defaultGst: 18 },
  { code: '8536', category: 'Protection', description: 'MC4 Connectors, DC Fuses, Surge Protection Devices (SPD)', defaultGst: 18 },
  { code: '8535', category: 'Earthing', description: 'Chemical Earthing Electrodes & Lightning Arresters', defaultGst: 18 },
  { code: '8413', category: 'Pumps', description: 'Solar Submersible / Surface Water Pumping Systems', defaultGst: 12 },
  { code: '9954', category: 'Civil', description: 'General Construction Services & Foundation Casting', defaultGst: 18 },
  { code: '9983', category: 'Engineering', description: 'Consulting, Architectural & Technical Design Services', defaultGst: 18 },
  { code: '9985', category: 'Labor', description: 'Liaisoning, Discom Approvals & Site Labor Services', defaultGst: 18 }
];

// ---------------------------------------------------------------------------
// 2. Standard Indian GST Units of Measurement (UQC)
// ---------------------------------------------------------------------------
export const GST_UNITS = [
  { code: 'NOS', label: 'NOS - Numbers' },
  { code: 'SET', label: 'SET - Sets' },
  { code: 'SITE', label: 'SITE - Site / Turnkey' },
  { code: 'KW', label: 'KW - Kilowatts' },
  { code: 'WATT', label: 'WATT - Watts' },
  { code: 'PCS', label: 'PCS - Pieces' },
  { code: 'MTR', label: 'MTR - Meters' },
  { code: 'KG', label: 'KG - Kilograms' },
  { code: 'BOX', label: 'BOX - Boxes' },
  { code: 'LOT', label: 'LOT - Lots' },
  { code: 'HRS', label: 'HRS - Hours' },
  { code: 'JOB', label: 'JOB - Job Work' },
  { code: 'SQF', label: 'SQF - Square Feet' },
  { code: 'PAC', label: 'PAC - Packs' },
  { code: 'UNT', label: 'UNT - Units' }
];

// ---------------------------------------------------------------------------
// 3. Indian Words Generator for Live Currency Preview
// ---------------------------------------------------------------------------
function convertToIndianWords(amount: number): string {
  if (!amount || isNaN(amount) || amount === 0) return 'Rupees Zero Only';

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
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

// ---------------------------------------------------------------------------
// 4. Line Item Math Calculation (Handles Tax Inclusive & Exclusive + Discounts)
// ---------------------------------------------------------------------------
export function computeItemMath(item: InvoiceItem) {
  const qty = Number(item.quantity) || 0;
  const unitPrice = Number(item.unit_price) || 0;
  const gstRate = Number(item.gst_rate) || 0;
  const isTaxInclusive = Boolean(item.is_tax_inclusive);
  const discountType = item.discount_type || 'percent';
  const discountValue = Number(item.discount_value) || 0;

  const rawTotal = Math.round(qty * unitPrice * 100) / 100;
  let discountAmount = 0;
  if (discountType === 'percent') {
    discountAmount = Math.round((rawTotal * (discountValue / 100)) * 100) / 100;
  } else {
    discountAmount = Math.round(discountValue * 100) / 100;
  }
  discountAmount = Math.min(rawTotal, Math.max(0, discountAmount));

  let taxableAmount = 0;
  let taxAmount = 0;
  let lineTotal = 0;

  if (isTaxInclusive) {
    // Price entered includes GST (MRP / Retail pricing mode)
    const grossAfterDisc = Math.round((rawTotal - discountAmount) * 100) / 100;
    if (gstRate > 0) {
      taxableAmount = Math.round((grossAfterDisc / (1 + (gstRate / 100))) * 100) / 100;
      taxAmount = Math.round((grossAfterDisc - taxableAmount) * 100) / 100;
    } else {
      taxableAmount = grossAfterDisc;
      taxAmount = 0;
    }
    lineTotal = grossAfterDisc;
  } else {
    // Price entered is base rate (Standard GST pricing mode)
    taxableAmount = Math.round((rawTotal - discountAmount) * 100) / 100;
    if (gstRate > 0) {
      taxAmount = Math.round((taxableAmount * (gstRate / 100)) * 100) / 100;
    } else {
      taxAmount = 0;
    }
    lineTotal = Math.round((taxableAmount + taxAmount) * 100) / 100;
  }

  // Calculate effective base rate per unit for display
  const effectiveBaseRate = isTaxInclusive && gstRate > 0
    ? Math.round((unitPrice / (1 + (gstRate / 100))) * 100) / 100
    : unitPrice;

  return {
    rawTotal,
    discountAmount,
    taxableAmount,
    taxAmount,
    lineTotal,
    effectiveBaseRate
  };
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

  // Active HSN dropdown index & expanded specs indices
  const [activeHsnIndex, setActiveHsnIndex] = useState<number | null>(null);
  const [expandedSpecs, setExpandedSpecs] = useState<Record<number, boolean>>({ 0: true, 1: true });
  const hsnDropdownRef = useRef<HTMLDivElement>(null);

  // Line items state
  const [items, setItems] = useState<InvoiceItem[]>([
    {
      particulars: 'Adani 3.30KW Ongrid Solar System',
      description: 'Panels :- Adani 550 * 6 NOS\nMS2607202B3016\nMS2607202B3145\nMS2607202B3149\nMS2607202B3180\nMS2607202B3191\nMS2607202B3194\nInverter :- Polycab 3.6KW\nSN : 3K6050826-2625-397508716P',
      hsn_sac: '8541',
      quantity: 1,
      unit: 'SITE',
      unit_price: 99632.69,
      is_tax_inclusive: false,
      discount_type: 'percent',
      discount_value: 0,
      gst_rate: 5.0
    },
    {
      particulars: 'Adani 3.30KW Solar Structure And Installation',
      description: 'BOS Kit',
      hsn_sac: '9987',
      quantity: 1,
      unit: 'SITE',
      unit_price: 42699.72,
      is_tax_inclusive: false,
      discount_type: 'percent',
      discount_value: 0,
      gst_rate: 18.0
    }
  ]);

  // Close HSN dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (hsnDropdownRef.current && !hsnDropdownRef.current.contains(event.target as Node)) {
        setActiveHsnIndex(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
          item_code: it.item_code || '',
          description: it.description || '',
          hsn_sac: it.hsn_sac || '8541',
          quantity: it.quantity || 1,
          unit: it.unit || 'SITE',
          unit_price: it.unit_price || 0,
          is_tax_inclusive: Boolean(it.is_tax_inclusive),
          discount_type: it.discount_type || 'percent',
          discount_value: it.discount_value || 0,
          discount_amount: it.discount_amount || 0,
          gst_rate: it.gst_rate ?? 18.0
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

      // If Bill To is empty or default, autofill
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
        is_tax_inclusive: false,
        discount_type: 'percent',
        discount_value: 0,
        gst_rate: 18.0
      }
    ]);
    setExpandedSpecs(prev => ({ ...prev, [items.length]: true }));
  };

  const handleDuplicateItem = (index: number) => {
    const itemToClone = items[index];
    setItems(prev => {
      const updated = [...prev];
      updated.splice(index + 1, 0, {
        ...itemToClone,
        particulars: `${itemToClone.particulars} (Copy)`
      });
      return updated;
    });
    setExpandedSpecs(prev => ({ ...prev, [index + 1]: true }));
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

  // Set all items to either Tax Inclusive or Tax Exclusive
  const handleSetAllRateMode = (inclusive: boolean) => {
    setItems(prev => prev.map(item => ({ ...item, is_tax_inclusive: inclusive })));
  };

  // Apply HSN selection to a row
  const handleSelectHsn = (index: number, suggestion: HsnSuggestion) => {
    handleItemChange(index, 'hsn_sac', suggestion.code);
    handleItemChange(index, 'gst_rate', suggestion.defaultGst);
    setActiveHsnIndex(null);
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
          is_tax_inclusive: false,
          discount_type: 'percent',
          discount_value: 0,
          gst_rate: 5.0
        }
      ]);
    } else if (presetType === 'structure') {
      setItems(prev => [
        ...prev,
        {
          particulars: 'Adani 3.30KW Solar Structure And Installation',
          description: 'BOS Kit & HDGI Fasteners',
          hsn_sac: '9987',
          quantity: 1,
          unit: 'SITE',
          unit_price: 42699.72,
          is_tax_inclusive: false,
          discount_type: 'percent',
          discount_value: 0,
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
          is_tax_inclusive: false,
          discount_type: 'percent',
          discount_value: 0,
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
          is_tax_inclusive: false,
          discount_type: 'percent',
          discount_value: 0,
          gst_rate: 18.0
        }
      ]);
    } else if (presetType === 'cables') {
      setItems(prev => [
        ...prev,
        {
          particulars: 'Solar DC Cable 4 sq mm (Red & Black)',
          description: 'UV Protected, XLPO Insulated Annealed Tinned Copper Conductor',
          hsn_sac: '8544',
          quantity: 100,
          unit: 'MTR',
          unit_price: 45.00,
          is_tax_inclusive: false,
          discount_type: 'percent',
          discount_value: 0,
          gst_rate: 18.0
        }
      ]);
    }
  };

  // Toggle specification visibility
  const toggleSpecs = (index: number) => {
    setExpandedSpecs(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // Live Calculations across items
  let totalRaw = 0;
  let totalDiscount = 0;
  let subtotal = 0;
  let totalTax = 0;
  let totalQuantity = 0;

  items.forEach(item => {
    const math = computeItemMath(item);
    totalRaw += math.rawTotal;
    totalDiscount += math.discountAmount;
    subtotal += math.taxableAmount;
    totalTax += math.taxAmount;
    totalQuantity += Number(item.quantity) || 0;
  });

  subtotal = Math.round(subtotal * 100) / 100;
  totalTax = Math.round(totalTax * 100) / 100;
  totalDiscount = Math.round(totalDiscount * 100) / 100;

  const rawTotal = Math.round((subtotal + totalTax) * 100) / 100;
  const roundedTotal = Math.round(rawTotal);
  const roundOff = Math.round((roundedTotal - rawTotal) * 100) / 100;
  const wordsDisplay = convertToIndianWords(roundedTotal);

  // Auto detect Intra-state (Gujarat 24 to 24) vs Inter-state (IGST)
  const isInterState = !(billToPos || shipToPos || '24').trim().startsWith('24');
  const cgstAmount = isInterState ? 0 : Math.round((totalTax / 2) * 100) / 100;
  const sgstAmount = isInterState ? 0 : Math.round((totalTax - cgstAmount) * 100) / 100;
  const igstAmount = isInterState ? totalTax : 0;

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
        item_code: it.item_code?.trim() || undefined,
        description: it.description?.trim() || undefined,
        hsn_sac: it.hsn_sac || '8541',
        quantity: Number(it.quantity) || 1,
        unit: it.unit || 'NOS',
        unit_price: Number(it.unit_price) || 0,
        is_tax_inclusive: Boolean(it.is_tax_inclusive),
        discount_type: it.discount_type || 'percent',
        discount_value: Number(it.discount_value) || 0,
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
      {/* Top Header Bar */}
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
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">
                {isEdit ? `Edit Invoice: ${invoiceNumber}` : 'Create New GST Tax Invoice'}
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FEC426]/10 text-[#FEC426] border border-[#FEC426]/30">
                Hitech Grid
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Tax Inclusive/Exclusive rates &bull; HSN Lookup &bull; Per-Item Discounts &bull; Multi-Unit UQC
            </p>
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
      <div className="p-4 rounded-2xl bg-[#0a120c] border border-[#1e3423] flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#106828]/20 border border-[#106828]/40 text-[#FEC426]">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <p className="font-bold text-white">Invoicing as TRUESUN ENERGY (Gujarat - 24)</p>
            <p className="text-slate-400 text-[11px]">
              GSTIN: 24EIVPG5500C1ZI &bull; Bank: State Bank of India (A/C: 44474952500, IFSC: SBIN0003268)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[11px] px-3 py-1 rounded-full font-semibold border ${
            isInterState 
              ? 'text-amber-400 bg-amber-500/10 border-amber-500/30' 
              : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
          }`}>
            {isInterState ? 'Inter-State (IGST 100%)' : 'Intra-State (CGST 50% + SGST 50%)'}
          </span>
        </div>
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
              className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold cursor-pointer"
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

      {/* ===================================================================== */}
      {/* 5. ENHANCED HITECH ITEM BILLING GRID SECTION */}
      {/* ===================================================================== */}
      <div className="p-5 rounded-2xl bg-[#0e1712] border border-[#1e3423] space-y-4 shadow-xl">
        {/* Toolbar Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#1e3423]">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Item Billing Grid</h3>
              <span className="text-[11px] text-slate-400 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/10">
                {items.length} items &bull; Total Qty: {totalQuantity}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Hitech BillSoft grid: Tax Inclusive/Exclusive rate switch, discount (%/₹), HSN lookup, and multi-unit support
            </p>
          </div>

          {/* Quick Rate Mode Switcher for All Rows */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">All Rows:</span>
            <div className="inline-flex rounded-xl bg-[#142318] border border-[#1e3423] p-0.5 text-[10.5px]">
              <button
                type="button"
                onClick={() => handleSetAllRateMode(false)}
                className="px-2.5 py-1 rounded-lg text-slate-300 hover:text-white font-semibold transition-colors cursor-pointer"
                title="Rates are before GST (Tax Exclusive)"
              >
                Tax Exclusive
              </button>
              <button
                type="button"
                onClick={() => handleSetAllRateMode(true)}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30 transition-colors cursor-pointer"
                title="Rates include GST (Tax Inclusive / MRP)"
              >
                Tax Inclusive (MRP)
              </button>
            </div>
          </div>
        </div>

        {/* Quick Presets Bar */}
        <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-[#0a120c] border border-[#1e3423]/60 text-xs">
          <span className="text-[11px] text-slate-400 mr-1 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-[#FEC426]" /> Quick Presets:
          </span>
          <button
            type="button"
            onClick={() => addPresetItem('adani_system')}
            className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold cursor-pointer transition-colors"
          >
            + Adani 3.30kW System (5%)
          </button>
          <button
            type="button"
            onClick={() => addPresetItem('structure')}
            className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold cursor-pointer transition-colors"
          >
            + Structure & Installation (18%)
          </button>
          <button
            type="button"
            onClick={() => addPresetItem('inverter')}
            className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold cursor-pointer transition-colors"
          >
            + 5kW Inverter (12%)
          </button>
          <button
            type="button"
            onClick={() => addPresetItem('bos')}
            className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold cursor-pointer transition-colors"
          >
            + BOS Kit (18%)
          </button>
          <button
            type="button"
            onClick={() => addPresetItem('cables')}
            className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold cursor-pointer transition-colors"
          >
            + DC Cables (18%)
          </button>
        </div>

        {/* Line Item Cards */}
        <div className="space-y-3.5">
          {items.map((item, idx) => {
            const math = computeItemMath(item);
            const isSpecsOpen = expandedSpecs[idx] ?? false;
            const isHsnOpen = activeHsnIndex === idx;

            // Filter HSN Suggestions based on current input
            const filteredHsn = HSN_DATABASE.filter(h =>
              h.code.includes(item.hsn_sac || '') ||
              h.category.toLowerCase().includes((item.hsn_sac || '').toLowerCase()) ||
              h.description.toLowerCase().includes((item.hsn_sac || '').toLowerCase())
            );

            return (
              <div
                key={idx}
                className="p-4 rounded-xl bg-[#0a120c] border border-[#1e3423] space-y-3 relative hover:border-[#2d4d35] transition-colors"
              >
                {/* Row Header Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#1e3423]/60">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-[#142318] text-white text-[11px] font-bold border border-[#1e3423]">
                      #{idx + 1}
                    </span>
                    <span className="text-xs font-bold text-white truncate max-w-[280px]">
                      {item.particulars || 'New Product / Line Item'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Rate Mode Toggle Chip */}
                    <button
                      type="button"
                      onClick={() => handleItemChange(idx, 'is_tax_inclusive', !item.is_tax_inclusive)}
                      className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                        item.is_tax_inclusive
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                          : 'bg-slate-800/60 text-slate-300 border-slate-700 hover:border-slate-500'
                      }`}
                      title="Click to toggle between Tax Exclusive and Tax Inclusive (MRP) pricing"
                    >
                      <Tag className="w-3 h-3" />
                      <span>{item.is_tax_inclusive ? 'Tax Inclusive (MRP)' : 'Tax Exclusive (Base)'}</span>
                    </button>

                    {/* Duplicate Row */}
                    <button
                      type="button"
                      onClick={() => handleDuplicateItem(idx)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-colors cursor-pointer"
                      title="Duplicate this line item"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    {/* Remove Row */}
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-colors cursor-pointer"
                      title="Delete item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Primary Row Grid: Name, HSN, Qty, Unit */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  {/* Particulars / Product Name */}
                  <div className="md:col-span-6">
                    <label className="block text-[10.5px] font-semibold text-slate-400 mb-1">
                      Product / Particulars *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Adani 3.30KW Ongrid Solar System"
                      value={item.particulars}
                      onChange={(e) => handleItemChange(idx, 'particulars', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#142318] border border-[#1e3423] text-white text-xs font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* HSN / SAC with Auto-Lookup Popover */}
                  <div className="md:col-span-3 relative">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10.5px] font-semibold text-slate-400 flex items-center gap-1">
                        <span>HSN / SAC</span>
                        <Search className="w-2.5 h-2.5 text-emerald-400" />
                      </label>
                      <button
                        type="button"
                        onClick={() => setActiveHsnIndex(isHsnOpen ? null : idx)}
                        className="text-[9.5px] text-emerald-400 hover:underline cursor-pointer"
                      >
                        {isHsnOpen ? 'Close list' : 'Lookup'}
                      </button>
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        placeholder="8541"
                        value={item.hsn_sac}
                        onFocus={() => setActiveHsnIndex(idx)}
                        onChange={(e) => handleItemChange(idx, 'hsn_sac', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#142318] border border-[#1e3423] text-white text-xs font-mono font-bold focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* HSN Suggestions Dropdown */}
                    {isHsnOpen && (
                      <div
                        ref={hsnDropdownRef}
                        className="absolute left-0 top-full mt-1.5 w-72 max-h-56 overflow-y-auto z-40 bg-[#0e1712] border border-emerald-500/40 rounded-xl shadow-2xl p-2 space-y-1"
                      >
                        <div className="px-2 py-1 text-[10px] text-slate-400 font-bold uppercase tracking-wider border-b border-[#1e3423] flex justify-between">
                          <span>Select Solar HSN Code</span>
                          <span>GST %</span>
                        </div>
                        {filteredHsn.length > 0 ? (
                          filteredHsn.map((hsn) => (
                            <button
                              key={hsn.code}
                              type="button"
                              onClick={() => handleSelectHsn(idx, hsn)}
                              className="w-full text-left p-1.5 rounded-lg hover:bg-emerald-500/10 hover:border-emerald-500/30 border border-transparent flex items-center justify-between gap-2 text-xs transition-colors cursor-pointer group"
                            >
                              <div>
                                <span className="font-mono font-bold text-white group-hover:text-emerald-400 mr-1.5">
                                  {hsn.code}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-300">
                                  {hsn.category}
                                </span>
                                <p className="text-[10px] text-slate-400 line-clamp-1">{hsn.description}</p>
                              </div>
                              <span className="font-bold text-emerald-400 font-mono text-xs">
                                {hsn.defaultGst}%
                              </span>
                            </button>
                          ))
                        ) : (
                          <div className="p-2 text-xs text-slate-400 text-center">
                            No match found. Free entry preserved.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Quantity */}
                  <div className="md:col-span-1">
                    <label className="block text-[10.5px] font-semibold text-slate-400 mb-1">
                      Qty
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      required
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-2 rounded-xl bg-[#142318] border border-[#1e3423] text-white text-xs text-center font-mono font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Multi-Unit Selector (Standard Indian UQC) */}
                  <div className="md:col-span-2">
                    <label className="block text-[10.5px] font-semibold text-slate-400 mb-1">
                      Unit (UQC)
                    </label>
                    <select
                      value={item.unit}
                      onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl bg-[#142318] border border-[#1e3423] text-white text-xs font-semibold focus:outline-none focus:border-emerald-500"
                    >
                      {GST_UNITS.map(u => (
                        <option key={u.code} value={u.code}>
                          {u.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Secondary Row Grid: Rate, Discount, Taxable, GST %, Tax Amount, Line Total */}
                <div className="grid grid-cols-2 md:grid-cols-12 gap-3 pt-1">
                  {/* Rate / Unit Price */}
                  <div className="col-span-1 md:col-span-3">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10.5px] font-semibold text-slate-400">
                        {item.is_tax_inclusive ? 'Price (MRP Incl.) ₹' : 'Base Rate (Excl.) ₹'}
                      </label>
                      {item.is_tax_inclusive && (
                        <span className="text-[9.5px] text-emerald-400 font-mono">
                          Base: ₹{math.effectiveBaseRate.toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={item.unit_price}
                      onChange={(e) => handleItemChange(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-xl bg-[#142318] border border-[#1e3423] text-white text-xs font-mono font-bold focus:outline-none focus:border-emerald-500 text-right"
                    />
                  </div>

                  {/* Discount (% or ₹) */}
                  <div className="col-span-1 md:col-span-3">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10.5px] font-semibold text-slate-400">
                        Discount
                      </label>
                      {math.discountAmount > 0 && (
                        <span className="text-[9.5px] text-amber-400 font-mono">
                          -₹{math.discountAmount.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0"
                        value={item.discount_value || ''}
                        onChange={(e) => handleItemChange(idx, 'discount_value', parseFloat(e.target.value) || 0)}
                        className="w-full px-2.5 py-2 rounded-xl bg-[#142318] border border-[#1e3423] text-white text-xs font-mono font-semibold focus:outline-none focus:border-emerald-500 text-right"
                      />
                      <button
                        type="button"
                        onClick={() => handleItemChange(idx, 'discount_type', item.discount_type === 'amount' ? 'percent' : 'amount')}
                        className={`px-2.5 py-2 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                          item.discount_type === 'amount'
                            ? 'bg-[#FEC426]/10 text-[#FEC426] border-[#FEC426]/30'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        }`}
                        title="Toggle percentage (%) vs flat amount (₹)"
                      >
                        {item.discount_type === 'amount' ? '₹' : '%'}
                      </button>
                    </div>
                  </div>

                  {/* Taxable Amount (Readonly) */}
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-[10.5px] font-semibold text-slate-400 mb-1">
                      Taxable Value (₹)
                    </label>
                    <div className="px-3 py-2 rounded-xl bg-[#080e0a] border border-[#1e3423] text-white text-xs font-mono font-bold text-right truncate">
                      ₹{math.taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>

                  {/* GST Rate */}
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-[10.5px] font-semibold text-slate-400 mb-1">
                      GST %
                    </label>
                    <select
                      value={item.gst_rate}
                      onChange={(e) => handleItemChange(idx, 'gst_rate', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-2 rounded-xl bg-[#142318] border border-[#1e3423] text-white text-xs font-bold focus:outline-none focus:border-emerald-500 text-center"
                    >
                      <option value="0">0% (Nil)</option>
                      <option value="5">5% (Solar PV)</option>
                      <option value="12">12% (Inverter)</option>
                      <option value="18">18% (Service/BOS)</option>
                      <option value="28">28% (Battery/Luxury)</option>
                    </select>
                  </div>

                  {/* Line Total */}
                  <div className="col-span-2 md:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10.5px] font-semibold text-slate-400">
                        Line Total (₹)
                      </label>
                      <span className="text-[9.5px] text-slate-400 font-mono">
                        Tax: ₹{math.taxAmount.toFixed(2)}
                      </span>
                    </div>
                    <div className="px-3 py-2 rounded-xl bg-[#142318] border border-[#1e3423] text-[#FEC426] text-xs font-mono font-extrabold text-right truncate shadow-inner">
                      ₹{math.lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                {/* Equipment Specifications & Multi-line Serial Numbers (Collapsible) */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => toggleSpecs(idx)}
                    className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-emerald-400 font-semibold cursor-pointer transition-colors"
                  >
                    {isSpecsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    <span>Equipment Specifications & Serial Numbers</span>
                    {item.description ? (
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    ) : null}
                  </button>

                  {isSpecsOpen && (
                    <div className="mt-2 animate-fade-in">
                      <textarea
                        rows={2}
                        placeholder="e.g. Panels :- Adani 550 * 6 NOS&#10;MS2607202B3016&#10;Inverter :- Polycab 3.6KW (SN: 3K6050826-2625)..."
                        value={item.description || ''}
                        onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#142318] border border-[#1e3423] text-white text-xs font-mono focus:outline-none focus:border-emerald-500 placeholder-slate-600 leading-relaxed"
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Row Button & Live Subtotal summary */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={handleAddItem}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#106828] to-[#147a2f] hover:from-[#158032] hover:to-[#1e9a3d] border border-emerald-500/30 text-white text-xs font-bold cursor-pointer transition-all shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Add Line Item</span>
          </button>

          <span className="text-[11px] text-slate-400 font-mono">
            Subtotal: ₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 6. CALCULATIONS & WORDS LIVE SUMMARY (Hitech Format) */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-2xl bg-[#0e1712] border border-[#1e3423] shadow-lg">
        {/* Left: Terms and Amount in Words */}
        <div className="space-y-4">
          <div>
            <p className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Amount in Words (Auto Generated):</span>
            </p>
            <div className="p-3.5 rounded-xl bg-[#0a120c] border border-[#1e3423] text-xs font-bold text-[#FEC426] leading-relaxed shadow-inner">
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
                className="w-full px-3 py-1.5 rounded-xl bg-[#142318] border border-[#1e3423] text-white text-xs focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Delivery Terms</label>
              <input
                type="text"
                value={deliveryTerms}
                onChange={(e) => setDeliveryTerms(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-[#142318] border border-[#1e3423] text-white text-xs focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Declaration / Terms</label>
            <input
              type="text"
              value={termsAndConditions}
              onChange={(e) => setTermsAndConditions(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl bg-[#142318] border border-[#1e3423] text-white text-xs focus:outline-none"
            />
          </div>
        </div>

        {/* Right: Financial Totals Breakdown */}
        <div className="p-5 rounded-xl bg-[#0a120c] border border-[#1e3423] space-y-3">
          <p className="text-xs font-bold text-white uppercase tracking-wider pb-2 border-b border-[#1e3423] flex items-center justify-between">
            <span>Summary Financial Calculations</span>
            <span className="text-[10px] text-slate-400 font-normal">Standard Indian GST</span>
          </p>

          <div className="flex justify-between text-xs text-slate-300">
            <span>Total Gross Price:</span>
            <span className="font-mono font-medium text-slate-300">₹{totalRaw.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>

          {totalDiscount > 0 && (
            <div className="flex justify-between text-xs text-amber-400">
              <span>Item Discounts (-):</span>
              <span className="font-mono font-bold">-₹{totalDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          )}

          <div className="flex justify-between text-xs text-slate-300">
            <span>Taxable Amount (Sub Total):</span>
            <span className="font-mono font-bold text-white">₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>

          {!isInterState ? (
            <>
              <div className="flex justify-between text-xs text-slate-400 pl-3 border-l-2 border-emerald-500/40">
                <span>CGST (Central Tax):</span>
                <span className="font-mono text-emerald-400">₹{cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400 pl-3 border-l-2 border-emerald-500/40">
                <span>SGST (State Tax):</span>
                <span className="font-mono text-emerald-400">₹{sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between text-xs text-slate-400 pl-3 border-l-2 border-amber-500/40">
              <span>IGST (Integrated Inter-State Tax):</span>
              <span className="font-mono text-amber-400">₹{igstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          )}

          <div className="flex justify-between text-xs text-slate-300">
            <span>Round Off Adjustment ({roundOff >= 0 ? '+' : '-'}):</span>
            <span className="font-mono font-medium text-slate-300">₹{Math.abs(roundOff).toFixed(2)}</span>
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
