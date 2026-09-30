import React, { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon } from 'lucide-react';
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

  // Form State exactly matching the requested form
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
              { id: 3, full_name: 'Rohan Patel', role: 'sales_rep' },
              { id: 2, full_name: 'Amit Shah', role: 'sales_manager' },
              { id: 4, full_name: 'Vikram Desai', role: 'survey_engineer' }
            ]);
          }
        })
        .catch(() => {
          setExecutives([
            { id: 3, full_name: 'Rohan Patel', role: 'sales_rep' },
            { id: 2, full_name: 'Amit Shah', role: 'sales_manager' },
            { id: 4, full_name: 'Vikram Desai', role: 'survey_engineer' }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-fadeIn">
      {/* Modal Container matching screenshot */}
      <div 
        className="w-full max-w-[500px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight font-sans">
            Add New Lead
          </h2>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="px-6 py-2 overflow-y-auto space-y-4 flex-1">
          {/* Customer Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Customer Name <span className="text-red-500 font-bold">*</span>
            </label>
            <input
              type="text"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm text-slate-800 bg-[#f8fafc] border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Mobile Number & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Mobile Number <span className="text-red-500 font-bold">*</span>
              </label>
              <input
                type="tel"
                required
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm text-slate-800 bg-[#f8fafc] border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm text-slate-800 bg-[#f8fafc] border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm text-slate-800 bg-[#f8fafc] border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Monthly Bill Amount & Follow-up Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Monthly Bill Amount (₹)
              </label>
              <input
                type="number"
                min="0"
                step="100"
                value={monthlyBill}
                onChange={(e) => setMonthlyBill(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm text-slate-800 bg-[#f8fafc] border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Follow-up Date <span className="text-red-500 font-bold">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm text-slate-800 bg-[#f8fafc] border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* State & City */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                State
              </label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm text-slate-800 bg-[#f8fafc] border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
              >
                <option value="">Select State</option>
                {INDIAN_STATES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                City
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm text-slate-800 bg-[#f8fafc] border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Roof Ownership & Roof Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Roof Ownership
              </label>
              <select
                value={roofOwnership}
                onChange={(e) => setRoofOwnership(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm text-slate-800 bg-[#f8fafc] border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
              >
                <option value="">Select</option>
                <option value="Owned">Owned</option>
                <option value="Rented">Rented</option>
                <option value="Leased">Leased</option>
                <option value="Shared">Shared</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Roof Type
              </label>
              <select
                value={roofType}
                onChange={(e) => setRoofType(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm text-slate-800 bg-[#f8fafc] border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
              >
                <option value="">Select</option>
                <option value="Concrete Flat">Concrete Flat / RCC</option>
                <option value="Metal Sheet">Metal Sheet / Tin Shed</option>
                <option value="Tile">Tiled Roof / Slanted</option>
                <option value="Asbestos Sheet">Asbestos Sheet</option>
                <option value="Open Terrace">Open Terrace</option>
              </select>
            </div>
          </div>

          {/* Lead Source & Assigned Executive */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Lead Source
              </label>
              <select
                value={leadSource}
                onChange={(e) => setLeadSource(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm text-slate-800 bg-[#f8fafc] border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
              >
                <option value="">Select Source</option>
                <option value="Website">Website</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Google Ads">Google Ads</option>
                <option value="Facebook Ads">Facebook Ads</option>
                <option value="Referral">Referral</option>
                <option value="Field Executive">Field Executive</option>
                <option value="Direct Walk-in">Direct Walk-in</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Assigned Executive
              </label>
              <select
                value={assignedExecutive}
                onChange={(e) => setAssignedExecutive(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm text-slate-800 bg-[#f8fafc] border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
              >
                <option value="">Select Executive</option>
                {executives.map((exec) => (
                  <option key={exec.id} value={exec.id}>
                    {exec.full_name} ({exec.role ? exec.role.replace('_', ' ') : 'Executive'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Buttons matching screenshot */}
          <div className="flex items-center justify-end gap-3 pt-4 pb-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 text-sm font-semibold text-slate-700 bg-[#e2e8f0] hover:bg-[#cbd5e1] rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-[#2563eb] hover:bg-[#1d4ed8] rounded-xl shadow-md shadow-blue-500/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Saving...' : 'Save Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
