import React, { useState, useEffect } from 'react';
import {
  Mail,
  Server,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Send,
  Save,
  HelpCircle,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface EmailSettings {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password?: string;
  has_password?: boolean;
  from_email: string;
  from_name: string;
  use_tls: boolean;
  is_enabled: boolean;
}

export const EmailSettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form State
  const [form, setForm] = useState<EmailSettings>({
    smtp_host: 'smtp.gmail.com',
    smtp_port: 587,
    smtp_user: '',
    smtp_password: '',
    has_password: false,
    from_email: 'info.truesunenergy@gmail.com',
    from_name: 'True Sun Energy',
    use_tls: true,
    is_enabled: true
  });

  // Test Email State
  const [testEmail, setTestEmail] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    fetchEmailSettings();
    if (user?.email) {
      setTestEmail(user.email);
    }
  }, [user]);

  const fetchEmailSettings = async () => {
    setLoading(true);
    try {
      const data = await api.getEmailSettings();
      setForm({
        smtp_host: data.smtp_host || 'smtp.gmail.com',
        smtp_port: data.smtp_port || 587,
        smtp_user: data.smtp_user || '',
        smtp_password: data.smtp_password || '',
        has_password: data.has_password || false,
        from_email: data.from_email || 'info.truesunenergy@gmail.com',
        from_name: data.from_name || 'True Sun Energy',
        use_tls: data.use_tls !== undefined ? data.use_tls : true,
        is_enabled: data.is_enabled !== undefined ? data.is_enabled : true
      });
    } catch (e: any) {
      console.error('Failed to load email settings:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleProviderPreset = (provider: 'gmail' | 'hostinger' | 'outlook' | 'mailtrap') => {
    if (provider === 'gmail') {
      setForm(prev => ({
        ...prev,
        smtp_host: 'smtp.gmail.com',
        smtp_port: 587,
        use_tls: true
      }));
    } else if (provider === 'hostinger') {
      setForm(prev => ({
        ...prev,
        smtp_host: 'smtp.hostinger.com',
        smtp_port: 587,
        use_tls: true
      }));
    } else if (provider === 'outlook') {
      setForm(prev => ({
        ...prev,
        smtp_host: 'smtp.office365.com',
        smtp_port: 587,
        use_tls: true
      }));
    } else if (provider === 'mailtrap') {
      setForm(prev => ({
        ...prev,
        smtp_host: 'sandbox.smtp.mailtrap.io',
        smtp_port: 2525,
        use_tls: false
      }));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccessMessage(null);
    try {
      const payload: any = { ...form };
      if (!payload.smtp_password || payload.smtp_password === '••••••••') {
        delete payload.smtp_password;
      }
      await api.updateEmailSettings(payload);
      setSaveSuccessMessage('SMTP mail settings saved and activated successfully!');
      setTimeout(() => setSaveSuccessMessage(null), 5000);
      fetchEmailSettings();
    } catch (err: any) {
      alert(err.message || 'Failed to update email settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail) {
      alert('Please enter a recipient email address for testing.');
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const payload: any = {
        to_email: testEmail.trim(),
        smtp_host: form.smtp_host,
        smtp_port: form.smtp_port,
        smtp_user: form.smtp_user,
        from_email: form.from_email,
        from_name: form.from_name,
        use_tls: form.use_tls
      };
      if (form.smtp_password && form.smtp_password !== '••••••••') {
        payload.smtp_password = form.smtp_password;
      }

      const res = await api.testEmailSettings(payload);
      setTestResult({
        success: true,
        message: res.message || `Test email dispatched successfully to ${testEmail}!`
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'SMTP Connection failed. Please check credentials and port settings.'
      });
    } finally {
      setTesting(false);
    }
  };

  const isConfigured = Boolean(form.smtp_host && form.smtp_user && (form.has_password || form.smtp_password));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin text-[#FEC426]" />
          <p className="text-sm font-medium">Loading SMTP Email Configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-[#0d1711] via-[#112316] to-[#0d1711] border border-[#1e3423] shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-[#FEC426]/10 text-[#FEC426] border border-[#FEC426]/20">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-white font-display flex items-center gap-2">
                <span>Email & SMTP Gateway</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-[#106828]/30 text-emerald-400 border border-[#106828]/50">
                  Admin Control
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Configure outgoing mail server for automated lead notifications, follow-up alerts, and customer quotation delivery.
              </p>
            </div>
          </div>
        </div>

        {/* Status Pill */}
        <div className="flex items-center gap-2 self-start sm:self-auto px-3.5 py-2 rounded-2xl bg-[#09120b] border border-[#1e3423]">
          <div className={`w-2.5 h-2.5 rounded-full ${form.is_enabled && isConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          <div className="text-xs">
            <span className="text-slate-400 block text-[10px]">Server Status</span>
            <span className="font-bold text-white">
              {!form.is_enabled ? 'Notifications Paused' : isConfigured ? 'SMTP Live & Ready' : 'Sandbox (Console Only)'}
            </span>
          </div>
        </div>
      </div>

      {saveSuccessMessage && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-semibold">{saveSuccessMessage}</span>
        </div>
      )}

      {/* Main Grid: Form Left, Test & Presets Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: SMTP Server Configuration Form */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSave} className="p-6 rounded-3xl bg-[#0d1711] border border-[#1e3423] space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e3423]">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-[#FEC426]" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Outgoing Mail Server (SMTP)</h3>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs text-slate-400 font-medium">Enable Sending</span>
                <input
                  type="checkbox"
                  checked={form.is_enabled}
                  onChange={(e) => setForm({ ...form, is_enabled: e.target.checked })}
                  className="w-4 h-4 rounded text-[#106828] focus:ring-0 cursor-pointer accent-[#106828]"
                />
              </label>
            </div>

            {/* Quick Provider Presets */}
            <div>
              <span className="text-xs text-slate-400 block mb-2 font-medium">1-Click Provider Presets:</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'gmail', label: 'Gmail / Google', port: 587 },
                  { id: 'hostinger', label: 'Hostinger', port: 587 },
                  { id: 'outlook', label: 'Outlook / 365', port: 587 },
                  { id: 'mailtrap', label: 'Mailtrap', port: 2525 }
                ].map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleProviderPreset(p.id as any)}
                    className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-[#132218] hover:bg-[#1a3022] border border-[#233d2a] hover:border-[#FEC426]/50 text-slate-200 transition-all cursor-pointer text-center group"
                  >
                    <span className="text-xs font-bold group-hover:text-[#FEC426]">{p.label}</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Port {p.port}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Host & Port */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  SMTP Host Server <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. smtp.gmail.com"
                  value={form.smtp_host}
                  onChange={(e) => setForm({ ...form, smtp_host: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#132218] border border-[#233d2a] rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#FEC426] text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Port <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  required
                  placeholder="587"
                  value={form.smtp_port}
                  onChange={(e) => setForm({ ...form, smtp_port: parseInt(e.target.value) || 587 })}
                  className="w-full px-3.5 py-2.5 bg-[#132218] border border-[#233d2a] rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#FEC426] text-xs font-mono"
                />
              </div>
            </div>

            {/* Username / Email */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                SMTP Username / Mailbox Email <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. info.truesunenergy@gmail.com"
                value={form.smtp_user}
                onChange={(e) => setForm({ ...form, smtp_user: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[#132218] border border-[#233d2a] rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#FEC426] text-xs font-mono"
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-300">
                  SMTP Password / App Password <span className="text-red-400">*</span>
                </label>
                {form.has_password && (
                  <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Password is saved
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder={form.has_password ? '•••••••••••••••• (leave blank to keep current)' : 'Enter mailbox password or 16-character Google App Password'}
                  value={form.smtp_password}
                  onChange={(e) => setForm({ ...form, smtp_password: e.target.value })}
                  className="w-full pl-3.5 pr-10 py-2.5 bg-[#132218] border border-[#233d2a] rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#FEC426] text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                For Gmail or Google Workspace accounts, generate a <strong>16-character App Password</strong> from your Google Account Security settings.
              </p>
            </div>

            {/* From Name & From Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#1e3423]">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Sender From Name
                </label>
                <input
                  type="text"
                  placeholder="True Sun Energy"
                  value={form.from_name}
                  onChange={(e) => setForm({ ...form, from_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#132218] border border-[#233d2a] rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#FEC426] text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Sender From Email Address
                </label>
                <input
                  type="email"
                  placeholder="info.truesunenergy@gmail.com"
                  value={form.from_email}
                  onChange={(e) => setForm({ ...form, from_email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#132218] border border-[#233d2a] rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#FEC426] text-xs font-mono"
                />
              </div>
            </div>

            {/* TLS Checkbox */}
            <div className="flex items-center gap-2 p-3 rounded-xl bg-[#132218] border border-[#233d2a]">
              <input
                type="checkbox"
                id="tls_toggle"
                checked={form.use_tls}
                onChange={(e) => setForm({ ...form, use_tls: e.target.checked })}
                className="w-4 h-4 rounded text-[#106828] focus:ring-0 cursor-pointer accent-[#106828]"
              />
              <label htmlFor="tls_toggle" className="text-xs text-slate-200 cursor-pointer select-none">
                Enable <strong>STARTTLS / TLS</strong> encryption (recommended for port 587 and modern email hosts)
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-3 flex items-center justify-between">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold rounded-xl bg-[#FEC426] hover:bg-[#e5af1f] text-[#0a110c] shadow-lg shadow-[#FEC426]/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{saving ? 'Saving...' : 'Save & Activate Mail Settings'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowGuide(!showGuide)}
                className="text-xs text-[#FEC426] hover:underline flex items-center gap-1 font-medium"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>{showGuide ? 'Hide Setup Help' : 'Gmail Setup Guide'}</span>
              </button>
            </div>
          </form>

          {/* Setup Guide Card */}
          {showGuide && (
            <div className="p-5 rounded-3xl bg-[#101e14] border border-[#1e3423] space-y-3 animate-in fade-in">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#FEC426]" />
                <span>How to Set Up Gmail / Google Workspace SMTP</span>
              </h4>
              <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
                <li>Log in to your Google Account (<a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer" className="text-[#FEC426] underline">myaccount.google.com/security</a>).</li>
                <li>Ensure <strong>2-Step Verification</strong> is turned <strong>ON</strong>.</li>
                <li>Search for or navigate to <strong>App Passwords</strong> (<a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-[#FEC426] underline">myaccount.google.com/apppasswords</a>).</li>
                <li>Enter app name as <code>SolarFlow CRM</code> and click <strong>Create</strong>.</li>
                <li>Google will generate a 16-character password (e.g. <code>abcd efgh ijkl mnop</code>).</li>
                <li>Paste this 16-character password into the <strong>SMTP Password</strong> field above and click Save.</li>
              </ol>
            </div>
          )}
        </div>

        {/* Right Col: Live Send Test Email Box */}
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-[#0d1711] border border-[#1e3423] space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#1e3423]">
              <Send className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Test Mail Connection</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Verify that your outgoing SMTP credentials can establish a handshake and deliver real HTML emails.
            </p>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                Send Test Email To:
              </label>
              <input
                type="email"
                placeholder="your-email@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#132218] border border-[#233d2a] rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#FEC426] text-xs font-mono"
              />
            </div>

            <button
              type="button"
              onClick={handleTestEmail}
              disabled={testing || !testEmail}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#106828] hover:bg-[#147a30] text-white text-xs font-bold shadow-lg shadow-[#106828]/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {testing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>{testing ? 'Testing SMTP Connection...' : 'Send Test Email Now'}</span>
            </button>

            {/* Test Result Message Box */}
            {testResult && (
              <div
                className={`p-3.5 rounded-2xl text-xs space-y-1 ${
                  testResult.success
                    ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300'
                    : 'bg-red-950/40 border border-red-500/40 text-red-300'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold">
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  )}
                  <span>{testResult.success ? 'Success!' : 'Connection Failed'}</span>
                </div>
                <p className="text-[11px] leading-relaxed break-words">{testResult.message}</p>
              </div>
            )}
          </div>

          {/* Automated Notification Triggers Card */}
          <div className="p-6 rounded-3xl bg-[#09120b] border border-[#1e3423] space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#FEC426]" />
              <span>Active Automated Notifications</span>
            </h4>
            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex items-start gap-2">
                <span className="text-[#FEC426]">&bull;</span>
                <span><strong>Admin Notifications:</strong> Instant alert whenever a sales rep moves a lead stage (e.g. Deal Won) or completes a follow-up.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-400">&bull;</span>
                <span><strong>Sales Rep Notifications:</strong> Alerts whenever an Admin assigns a new lead or schedules a site survey.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-400">&bull;</span>
                <span><strong>Customer Proposals:</strong> Official solar quotation PDFs and status updates dispatched directly to customers.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
