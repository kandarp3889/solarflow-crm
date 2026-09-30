import React, { useState, useEffect } from 'react';
import { X, UserPlus, Calendar as CalendarIcon } from 'lucide-react';
import { api } from '../../services/api';

interface AddLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const INDIAN_STATES = [
  'Gujarat',
  'Maharashtra',
  'Rajasthan',
  'Madhya Pradesh',
  'Karnataka',
  'Delhi',
  'Uttar Pradesh',
  'Haryana',
  'Punjab',
  'Tamil Nadu',
  'Andhra Pradesh',
  'Telangana',
  'Kerala',
  'West Bengal',
  'Bihar',
  'Odisha',
  'Goa',
  'Chhattisgarh',
  'Jharkhand',
  'Assam',
  'Uttarakhand',
  'Himachal Pradesh'
];

export const AddLeadModal: React.FC<AddLeadModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [executives, setExecutives] = useState<any[]>([]);

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [monthlyBill, setMonthlyBill] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [roofOwnership, setRoofOwnership] = useState('');
  const [roofType, setRoofType] = useState('');
  const [leadSource, setLeadSource] = useState('');
  const [assignedExecutive, setAssignedExecutive] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Set default follow up date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const yyyy = tomorrow.getFullYear();
      const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const dd = String(tomorrow.getDate()).padStart(2, '0');
      setFollowUpDate(`${yyyy}-${mm}-${dd}`);

      // Fetch team executives
      api.getTeam()
        .then((team: any[]) => {
          if (Array.isArray(team) && team.length > 0) {
            setExecutives(team);
          } else {
            setExecutives([
              { id: 1, full_name: 'Admin', role: 'company_admin' }
            ]);
          }
        })
        .catch(() => {
          setExecutives([
            { id: 1, full_name: 'Admin', role: 'company_admin' }
          ]);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const billAmount = parseFloat(monthlyBill) || 0;
      // Estimate realistic solar rooftop system size from monthly bill (average ₹8/unit, 1kW produces 120 units/mo)
      const estimatedKw = billAmount > 0 ? Math.max(1, Math.round((billAmount / (8 * 120)) * 10) / 10) : 3.0;

      const payload = {
        full_name: customerName.trim(),
        phone: mobileNumber.trim(),
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        monthly_bill: billAmount,
        next_follow_up_date: followUpDate ? new Date(followUpDate).toISOString() : undefined,
        state: state || undefined,
        city: city.trim() || undefined,
        roof_ownership: roofOwnership || 'Owned',
        roof_type: roofType || 'Concrete Flat',
        lead_source: leadSource || 'Website',
        assigned_to_id: assignedExecutive ? parseInt(assignedExecutive) : undefined,
        property_type: 'Residential',
        recommended_kw: estimatedKw,
        stage: 'new_lead'
      };

      await api.createLead(payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Error saving lead. Please check all fields.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm animate-fadeIn">
      {/* Modal Container with consistent dark theme styling */}
      <div 
        className="w-full max-w-lg bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <UserPlus className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight font-display">
                Add New Solar Lead
              </h2>
              <p className="text-xs text-slate-400">
                Capture prospective customer details & rooftop inquiry
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5 stroke-[2]" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4 overflow-y-auto space-y-4 flex-1">
          {/* Customer Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Customer Name <span className="text-red-400 font-bold">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Rajesh Sharma"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs text-white bg-slate-800/80 border border-slate-700 rounded-xl focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all placeholder:text-slate-500"
            />
          </div>

          {/* Mobile Number & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Mobile Number <span className="text-red-400 font-bold">*</span>
              </label>
              <input
                type="tel"
                required
                placeholder="+91 98765 43210"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs text-white bg-slate-800/80 border border-slate-700 rounded-xl focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all placeholder:text-slate-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Email
              </label>
              <input
                type="email"
                placeholder="customer@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs text-white bg-slate-800/80 border border-slate-700 rounded-xl focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Address
            </label>
            <input
              type="text"
              placeholder="House/Plot no, street, locality"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs text-white bg-slate-800/80 border border-slate-700 rounded-xl focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all placeholder:text-slate-500"
            />
          </div>

          {/* Monthly Bill Amount & Follow-up Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Monthly Bill Amount (₹)
              </label>
              <input
                type="number"
                min="0"
                step="100"
                placeholder="e.g. 4500"
                value={monthlyBill}
                onChange={(e) => setMonthlyBill(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs text-white bg-slate-800/80 border border-slate-700 rounded-xl focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all placeholder:text-slate-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Follow-up Date</span>
                <span className="text-red-400 font-bold">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs text-white bg-slate-800/80 border border-slate-700 rounded-xl focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all cursor-pointer [color-scheme:dark]"
                />
              </div>
            </div>
          </div>

          {/* State & City */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                State
              </label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs text-white bg-slate-800 border border-slate-700 rounded-xl focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all cursor-pointer"
              >
                <option value="" className="bg-slate-900 text-slate-400">Select State</option>
                {INDIAN_STATES.map((st) => (
                  <option key={st} value={st} className="bg-slate-900 text-white">
                    {st}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                City
              </label>
              <input
                type="text"
                placeholder="e.g. Surat"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs text-white bg-slate-800/80 border border-slate-700 rounded-xl focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* Roof Ownership & Roof Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Roof Ownership
              </label>
              <select
                value={roofOwnership}
                onChange={(e) => setRoofOwnership(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs text-white bg-slate-800 border border-slate-700 rounded-xl focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all cursor-pointer"
              >
                <option value="" className="bg-slate-900 text-slate-400">Select Ownership</option>
                <option value="Owned" className="bg-slate-900 text-white">Owned</option>
                <option value="Rented" className="bg-slate-900 text-white">Rented</option>
                <option value="Leased" className="bg-slate-900 text-white">Leased</option>
                <option value="Shared" className="bg-slate-900 text-white">Shared</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Roof Type
              </label>
              <select
                value={roofType}
                onChange={(e) => setRoofType(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs text-white bg-slate-800 border border-slate-700 rounded-xl focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all cursor-pointer"
              >
                <option value="" className="bg-slate-900 text-slate-400">Select Roof Type</option>
                <option value="Concrete Flat" className="bg-slate-900 text-white">Concrete Flat / RCC</option>
                <option value="Metal Sheet" className="bg-slate-900 text-white">Metal Sheet / Tin Shed</option>
                <option value="Tile" className="bg-slate-900 text-white">Tiled Roof / Slanted</option>
                <option value="Asbestos Sheet" className="bg-slate-900 text-white">Asbestos Sheet</option>
                <option value="Open Terrace" className="bg-slate-900 text-white">Open Terrace</option>
              </select>
            </div>
          </div>

          {/* Lead Source & Assigned Executive */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Lead Source
              </label>
              <select
                value={leadSource}
                onChange={(e) => setLeadSource(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs text-white bg-slate-800 border border-slate-700 rounded-xl focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all cursor-pointer"
              >
                <option value="" className="bg-slate-900 text-slate-400">Select Source</option>
                <option value="Website" className="bg-slate-900 text-white">Website</option>
                <option value="WhatsApp" className="bg-slate-900 text-white">WhatsApp</option>
                <option value="Google Ads" className="bg-slate-900 text-white">Google Ads</option>
                <option value="Facebook Ads" className="bg-slate-900 text-white">Facebook Ads</option>
                <option value="Referral" className="bg-slate-900 text-white">Referral</option>
                <option value="Field Executive" className="bg-slate-900 text-white">Field Executive</option>
                <option value="Direct Walk-in" className="bg-slate-900 text-white">Direct Walk-in</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Assigned Executive
              </label>
              <select
                value={assignedExecutive}
                onChange={(e) => setAssignedExecutive(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs text-white bg-slate-800 border border-slate-700 rounded-xl focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all cursor-pointer"
              >
                <option value="" className="bg-slate-900 text-slate-400">Select Executive</option>
                {executives.map((exec) => (
                  <option key={exec.id} value={exec.id} className="bg-slate-900 text-white">
                    {exec.full_name} ({exec.role ? exec.role.replace('_', ' ') : 'Executive'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 pb-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 rounded-xl shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Saving...' : 'Save Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
