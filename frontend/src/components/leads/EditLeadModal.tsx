import React, { useState, useEffect } from 'react';
import { X, Edit, Save } from 'lucide-react';
import { api } from '../../services/api';
import { Lead } from '../../types';
import { toISTIsoString, getISTDateKey } from '../../utils/date';

interface EditLeadModalProps {
  isOpen: boolean;
  lead: Lead | null;
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

export const EditLeadModal: React.FC<EditLeadModalProps> = ({
  isOpen,
  lead,
  onClose,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [executives, setExecutives] = useState<any[]>([]);
  const [availableStages, setAvailableStages] = useState<any[]>([]);

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [monthlyBill, setMonthlyBill] = useState('');
  const [recommendedKw, setRecommendedKw] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [propertyType, setPropertyType] = useState('Residential');
  const [leadSource, setLeadSource] = useState('Website');
  const [stage, setStage] = useState('new_lead');
  const [assignedExecutive, setAssignedExecutive] = useState('');

  useEffect(() => {
    if (isOpen && lead) {
      setCustomerName(lead.full_name || '');
      setMobileNumber(lead.phone || '');
      setEmail(lead.email || '');
      setAddress(lead.address || '');
      setCity(lead.city || '');
      setState(lead.state || '');
      setPincode(lead.pincode || '');
      setMonthlyBill(lead.monthly_bill ? lead.monthly_bill.toString() : '');
      setRecommendedKw(lead.recommended_kw ? lead.recommended_kw.toString() : '');
      setPropertyType(lead.property_type || 'Residential');
      setLeadSource(lead.lead_source || 'Website');
      setStage(lead.stage || 'new_lead');
      setAssignedExecutive(lead.assigned_to_id ? lead.assigned_to_id.toString() : '');

      if (lead.next_follow_up_date) {
        setFollowUpDate(getISTDateKey(lead.next_follow_up_date));
      } else {
        setFollowUpDate('');
      }

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

        // Fetch dynamic company pipeline stages
        api.getPipelineStageConfig()
          .then((stagesData: any[]) => {
            if (Array.isArray(stagesData) && stagesData.length > 0) {
              setAvailableStages(stagesData);
            }
          })
          .catch(() => {});
    }
  }, [isOpen, lead]);

  if (!isOpen || !lead) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const billAmount = parseFloat(monthlyBill) || 0;
      const kw = parseFloat(recommendedKw) || (billAmount > 0 ? Math.max(1, Math.round((billAmount / (8 * 120)) * 10) / 10) : 3.0);

      const payload = {
        full_name: customerName.trim(),
        phone: mobileNumber.trim(),
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        state: state || undefined,
        pincode: pincode.trim() || undefined,
        monthly_bill: billAmount,
        recommended_kw: kw,
        property_type: propertyType || 'Residential',
        lead_source: leadSource || 'Website',
        stage: stage || 'new_lead',
        assigned_to_id: assignedExecutive ? parseInt(assignedExecutive) : undefined,
        next_follow_up_date: followUpDate ? toISTIsoString(followUpDate) : undefined
      };

      await api.updateLead(lead.id, payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Error updating lead. Please check all fields.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm animate-fadeIn">
      {/* Modal Container */}
      <div 
        className="w-full max-w-xl bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Edit className="w-4 h-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight font-display">
                  Edit Solar Lead
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                  {lead.lead_id}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Update customer contact info, property specs, and stage.
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

          {/* State, City & Pincode */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
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
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Pincode
              </label>
              <input
                type="text"
                placeholder="395007"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs text-white bg-slate-800/80 border border-slate-700 rounded-xl focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* Monthly Bill & System Size */}
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
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Recommended System (kW)
              </label>
              <input
                type="number"
                min="0.5"
                step="0.1"
                placeholder="e.g. 3.3"
                value={recommendedKw}
                onChange={(e) => setRecommendedKw(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs text-white bg-slate-800/80 border border-slate-700 rounded-xl focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* Property Type & Lead Source */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Property Type
              </label>
              <select
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs text-white bg-slate-800 border border-slate-700 rounded-xl focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all cursor-pointer"
              >
                <option value="Residential" className="bg-slate-900 text-white">Residential</option>
                <option value="Commercial" className="bg-slate-900 text-white">Commercial</option>
                <option value="Industrial" className="bg-slate-900 text-white">Industrial</option>
                <option value="Agricultural" className="bg-slate-900 text-white">Agricultural</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Lead Source
              </label>
              <select
                value={leadSource}
                onChange={(e) => setLeadSource(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs text-white bg-slate-800 border border-slate-700 rounded-xl focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all cursor-pointer"
              >
                <option value="Website" className="bg-slate-900 text-white">Website</option>
                <option value="WhatsApp" className="bg-slate-900 text-white">WhatsApp</option>
                <option value="Google Ads" className="bg-slate-900 text-white">Google Ads</option>
                <option value="Facebook Ads" className="bg-slate-900 text-white">Facebook Ads</option>
                <option value="Instagram" className="bg-slate-900 text-white">Instagram</option>
                <option value="Referral" className="bg-slate-900 text-white">Referral</option>
                <option value="Direct Walk-in" className="bg-slate-900 text-white">Direct Walk-in</option>
              </select>
            </div>
          </div>

          {/* Lead Stage & Assigned Executive */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Lead Pipeline Stage
              </label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs text-white bg-slate-800 border border-slate-700 rounded-xl focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all cursor-pointer capitalize"
              >
                {availableStages.length > 0 ? (
                  availableStages.map((s) => (
                    <option key={s.key} value={s.key} className="bg-slate-900 text-white">
                      {s.label}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="new_lead" className="bg-slate-900 text-white">New Lead</option>
                    <option value="contacted" className="bg-slate-900 text-white">Contacted</option>
                    <option value="qualified" className="bg-slate-900 text-white">Qualified</option>
                    <option value="survey_scheduled" className="bg-slate-900 text-white">Survey Scheduled</option>
                    <option value="survey_completed" className="bg-slate-900 text-white">Survey Completed</option>
                    <option value="quotation_sent" className="bg-slate-900 text-white">Quotation Sent</option>
                    <option value="negotiation" className="bg-slate-900 text-white">Negotiation</option>
                    <option value="won" className="bg-slate-900 text-emerald-400">Won (Contract Signed)</option>
                    <option value="lost" className="bg-slate-900 text-red-400">Lost</option>
                  </>
                )}
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

          {/* Follow-up Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Next Follow-up Date
            </label>
            <input
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs text-white bg-slate-800/80 border border-slate-700 rounded-xl focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all cursor-pointer [color-scheme:dark]"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Saving Changes...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
