import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building,
  Sun,
  Share2,
  CheckCircle,
  Save,
  MessageSquare,
  Mail,
  Zap,
  Globe
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export const SettingsPage: React.FC = () => {
  const { company } = useAuth();
  const [activeTab, setActiveTab] = useState<'company' | 'solar' | 'integrations'>('company');
  const [saving, setSaving] = useState(false);

  // Company Form State
  const [companyForm, setCompanyForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    website: '',
    gstin: ''
  });

  // Solar Rules State
  const [solarForm, setSolarForm] = useState({
    base_cost_per_watt: 48.0,
    default_gst_rate: 13.8,
    panel_brands: 'Tata Power Solar, Waaree Energies, Adani Solar, Vikram Solar, Goldi Solar',
    inverter_brands: 'Sungrow, Growatt, Enphase, Fronius, Solis, GoodWe'
  });

  // Integrations state
  const [integrations, setIntegrations] = useState<any>(null);

  useEffect(() => {
    if (company) {
      setCompanyForm({
        name: company.name || '',
        phone: company.phone || '',
        email: company.email || '',
        address: company.address || '',
        website: company.website || '',
        gstin: company.gstin || ''
      });

      if (company.solar_settings) {
        setSolarForm({
          base_cost_per_watt: company.solar_settings.base_cost_per_watt || 48.0,
          default_gst_rate: company.solar_settings.default_gst_rate || 13.8,
          panel_brands: (company.solar_settings.panel_brands || []).join(', '),
          inverter_brands: (company.solar_settings.inverter_brands || []).join(', ')
        });
      }
    }

    api.getIntegrations().then(setIntegrations).catch(() => {});
  }, [company]);

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateCompanySettings(companyForm);
      alert('Company profile updated successfully!');
    } catch (e: any) {
      alert(e.message || 'Error updating company profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSolar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateSolarSettings({
        base_cost_per_watt: solarForm.base_cost_per_watt,
        default_gst_rate: solarForm.default_gst_rate,
        panel_brands: solarForm.panel_brands.split(',').map(s => s.trim()),
        inverter_brands: solarForm.inverter_brands.split(',').map(s => s.trim())
      });
      alert('Solar hardware defaults and subsidy rules updated!');
    } catch (e: any) {
      alert(e.message || 'Error updating solar settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-slate-900 border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white font-display flex items-center gap-2">
            <Settings className="w-5 h-5 text-amber-400" />
            <span>Solar Platform & Hardware Settings</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure company legal entity, GSTIN, solar hardware catalogue, pricing defaults, and third-party APIs.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-900/60 p-1.5 rounded-2xl gap-1 overflow-x-auto">
        {[
          { id: 'company', label: 'Company Profile & Entity', icon: Building },
          { id: 'solar', label: 'Solar Pricing & Subsidies', icon: Sun },
          { id: 'integrations', label: 'API Integrations & Webhooks', icon: Share2 }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Company Profile */}
      {activeTab === 'company' && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800">
          <form onSubmit={handleSaveCompany} className="space-y-4 max-w-2xl text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Company Legal Name *</label>
                <input
                  type="text"
                  required
                  value={companyForm.name}
                  onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="text-slate-300 font-semibold block mb-1">GSTIN Number</label>
                <input
                  type="text"
                  placeholder="07AAACS1234F1Z5"
                  value={companyForm.gstin}
                  onChange={(e) => setCompanyForm({ ...companyForm, gstin: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Support Phone</label>
                <input
                  type="text"
                  value={companyForm.phone}
                  onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Official Email</label>
                <input
                  type="email"
                  value={companyForm.email}
                  onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Company Website</label>
              <input
                type="text"
                value={companyForm.website}
                onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Head Office Address</label>
              <textarea
                rows={3}
                value={companyForm.address}
                onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save Company Profile'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 2: Solar Hardware & Subsidies */}
      {activeTab === 'solar' && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800">
          <form onSubmit={handleSaveSolar} className="space-y-4 max-w-2xl text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Base Hardware Cost (₹ per Watt)</label>
                <input
                  type="number"
                  step="0.5"
                  value={solarForm.base_cost_per_watt}
                  onChange={(e) => setSolarForm({ ...solarForm, base_cost_per_watt: parseFloat(e.target.value) || 48 })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Default Solar GST Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={solarForm.default_gst_rate}
                  onChange={(e) => setSolarForm({ ...solarForm, default_gst_rate: parseFloat(e.target.value) || 13.8 })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Supported Solar Panel Brands (comma-separated)</label>
              <textarea
                rows={2}
                value={solarForm.panel_brands}
                onChange={(e) => setSolarForm({ ...solarForm, panel_brands: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Supported Solar Inverter Brands (comma-separated)</label>
              <textarea
                rows={2}
                value={solarForm.inverter_brands}
                onChange={(e) => setSolarForm({ ...solarForm, inverter_brands: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Central Subsidy Reference Card */}
            <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
              <span className="text-xs font-bold text-emerald-400 block">
                Active MNRE Rooftop Solar Subsidy Matrix:
              </span>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700">
                  <span className="text-[10px] text-slate-400 block">1 kW Array</span>
                  <span className="font-bold text-emerald-400">₹30,000 Subsidy</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700">
                  <span className="text-[10px] text-slate-400 block">2 kW Array</span>
                  <span className="font-bold text-emerald-400">₹60,000 Subsidy</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700">
                  <span className="text-[10px] text-slate-400 block">&gt;= 3 kW Array</span>
                  <span className="font-bold text-emerald-400">₹78,000 Max</span>
                </div>
              </div>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Update Solar Hardware Rules'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 3: API Integrations */}
      {activeTab === 'integrations' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* WhatsApp Cloud API */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">WhatsApp Business Cloud API</h3>
                  <p className="text-[11px] text-slate-400">Meta WhatsApp Inbound & Outbound Webhook</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                Connected
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Webhook URL configured to receive instant lead captures from WhatsApp chat ads and click-to-WhatsApp campaigns.
            </p>
            <div className="p-2.5 rounded-xl bg-slate-800/60 font-mono text-[10px] text-slate-300 truncate">
              https://api.truesunenergy.in/api/webhooks/whatsapp
            </div>
          </div>

          {/* Meta Facebook Leads */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Meta / Facebook & Instagram Lead Ads</h3>
                  <p className="text-[11px] text-slate-400">Instant Lead Sync from Facebook & Instagram Ads</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                Synced
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Direct integration captures lead name, phone, rooftop bill, and location immediately when customer submits on Instagram (@truesun_energy_) or Facebook.
            </p>
            <div className="p-2.5 rounded-xl bg-slate-800/60 font-mono text-[10px] text-slate-300 truncate">
              Page: True Sun Energy Official (ID: 61578939676692)
            </div>
          </div>

          {/* Google Ads Webhook */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Google Ads Lead Form Extension</h3>
                  <p className="text-[11px] text-slate-400">Google Search & YouTube Lead Form Webhook</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                Active
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Receives high-intent search leads for "rooftop solar panel installation near me" with Google conversion tracking.
            </p>
          </div>

          {/* SMTP Email Gateway */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">SMTP Email Gateway</h3>
                  <p className="text-[11px] text-slate-400">Quotation Proposals & System Notifications</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                Ready
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Configured with Mailtrap / Sendgrid SMTP relay for automated quotation PDF delivery and site survey reminders.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
