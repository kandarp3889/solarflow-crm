import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Zap,
  MessageSquare,
  FileText,
  Calculator,
  Copy,
  Check,
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import { api } from '../../services/api';

interface AIAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLeadId?: number;
}

export const AIAssistantDrawer: React.FC<AIAssistantDrawerProps> = ({
  isOpen,
  onClose,
  selectedLeadId = 1
}) => {
  const [activeTab, setActiveTab] = useState<'qualify' | 'whatsapp' | 'summary' | 'calculator'>('qualify');
  const [loading, setLoading] = useState(false);
  const [leadIdInput, setLeadIdInput] = useState<number>(selectedLeadId);
  const [copied, setCopied] = useState(false);

  // Results
  const [qualifyResult, setQualifyResult] = useState<any>(null);
  const [whatsappResult, setWhatsappResult] = useState<any>(null);
  const [summaryResult, setSummaryResult] = useState<any>(null);
  const [whatsappPurpose, setWhatsappPurpose] = useState('initial_pitch');

  // Interactive bill calculator
  const [calcBill, setCalcBill] = useState(6500);
  const [calcRoof, setCalcRoof] = useState(650);

  const handleQualify = async () => {
    setLoading(true);
    try {
      const res = await api.qualifyLeadAI(leadIdInput);
      setQualifyResult(res);
    } catch (e: any) {
      alert(e.message || 'Error running AI qualification');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateWhatsApp = async () => {
    setLoading(true);
    try {
      const res = await api.generateWhatsAppAI(leadIdInput, whatsappPurpose);
      setWhatsappResult(res);
    } catch (e: any) {
      alert(e.message || 'Error generating WhatsApp draft');
    } finally {
      setLoading(false);
    }
  };

  const handleSummarize = async () => {
    setLoading(true);
    try {
      const res = await api.summarizeProposalAI(leadIdInput);
      setSummaryResult(res);
    } catch (e: any) {
      alert(e.message || 'Error generating summary');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Instant rooftop estimator math
  const estimatedKw = Math.max(1, Math.round((calcBill / 950) * 10) / 10);
  const estimatedGeneration = Math.round(estimatedKw * 120);
  const estimatedSubsidy = estimatedKw >= 3 ? 78000 : (estimatedKw >= 2 ? 60000 : 30000);
  const estimatedSavings = Math.round(estimatedGeneration * 8);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-500 to-purple-600 text-white">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white font-display flex items-center gap-1.5">
                  AI Solar Assistant
                  <span className="px-1.5 py-0.2 text-[10px] font-bold rounded bg-amber-500/20 text-amber-400">
                    GenAI
                  </span>
                </h3>
                <p className="text-xs text-slate-400">Solar intelligence & outreach copilot</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-800 bg-slate-950/40 px-2 pt-2 gap-1 overflow-x-auto">
            {[
              { id: 'qualify', label: 'Qualify Lead', icon: Zap },
              { id: 'whatsapp', label: 'WhatsApp AI', icon: MessageSquare },
              { id: 'summary', label: 'Proposal Summary', icon: FileText },
              { id: 'calculator', label: 'Solar Sizer', icon: Calculator }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 whitespace-nowrap ${
                    isActive
                      ? 'border-amber-500 text-amber-400 bg-slate-800/60'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Drawer Body */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4">
            {/* Target Lead Selector */}
            {activeTab !== 'calculator' && (
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/80">
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Target Lead ID for AI Context:
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={leadIdInput}
                    onChange={(e) => setLeadIdInput(parseInt(e.target.value) || 1)}
                    className="w-24 px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-amber-500"
                    placeholder="Lead ID"
                  />
                  <span className="text-xs text-slate-400 self-center">
                    (e.g., ID 1 for Rajesh Agarwal)
                  </span>
                </div>
              </div>
            )}

            {/* TAB 1: Lead Qualification */}
            {activeTab === 'qualify' && (
              <div className="space-y-4">
                <button
                  onClick={handleQualify}
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{loading ? 'Analyzing Lead...' : 'Run AI Technical Qualification'}</span>
                </button>

                {qualifyResult && (
                  <div className="space-y-3 p-4 rounded-xl bg-slate-800/80 border border-slate-700">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">Score & Tier:</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                          qualifyResult.category === 'hot'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}
                      >
                        {qualifyResult.score}/100 • {qualifyResult.category}
                      </span>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-slate-300">Recommended Array:</p>
                      <p className="text-sm font-bold text-amber-400">
                        {qualifyResult.suggested_system_size_kw} kW Rooftop Solar
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-slate-300">Action Recommendation:</p>
                      <p className="text-xs text-emerald-400 font-medium">
                        {qualifyResult.recommended_action}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-slate-300 mb-1">Key AI Findings:</p>
                      <ul className="space-y-1">
                        {qualifyResult.reasons.map((r: string, idx: number) => (
                          <li key={idx} className="text-xs text-slate-300 flex items-start gap-1.5">
                            <span className="text-amber-400 mt-0.5">•</span>
                            <span>{r}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: WhatsApp Pitch Generator */}
            {activeTab === 'whatsapp' && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Select Outreach Objective:
                  </label>
                  <select
                    value={whatsappPurpose}
                    onChange={(e) => setWhatsappPurpose(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="initial_pitch">Initial Solar Pitch & Subsidy Hook</option>
                    <option value="survey_confirmation">Site Survey Confirmation & Arrival</option>
                    <option value="quotation_followup">Quotation Proposal Dispatch</option>
                    <option value="deal_closing">0% EMI Incentive & Closing Push</option>
                  </select>
                </div>

                <button
                  onClick={handleGenerateWhatsApp}
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>{loading ? 'Drafting Message...' : 'Draft Personalized WhatsApp Pitch'}</span>
                </button>

                {whatsappResult && (
                  <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5" /> WhatsApp Draft
                      </span>
                      <button
                        onClick={() => copyToClipboard(whatsappResult.message)}
                        className="flex items-center gap-1 text-[11px] font-semibold text-slate-300 hover:text-white bg-slate-800 px-2 py-1 rounded-md"
                      >
                        {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copied ? 'Copied!' : 'Copy'}</span>
                      </button>
                    </div>

                    <p className="text-xs text-slate-200 whitespace-pre-line bg-slate-900/80 p-3 rounded-lg border border-slate-800 leading-relaxed font-sans">
                      {whatsappResult.message}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: Proposal Summary */}
            {activeTab === 'summary' && (
              <div className="space-y-4">
                <button
                  onClick={handleSummarize}
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 disabled:opacity-50 cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  <span>{loading ? 'Summarizing...' : 'Summarize Lead & Next Steps'}</span>
                </button>

                {summaryResult && (
                  <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-400">Lead Health & History:</p>
                      <p className="text-xs text-slate-200 mt-1 leading-relaxed">
                        {summaryResult.summary}
                      </p>
                    </div>
                    <div className="pt-2 border-t border-slate-700">
                      <p className="text-xs font-semibold text-amber-400">Next Best Action:</p>
                      <p className="text-xs text-slate-100 font-medium mt-0.5">
                        {summaryResult.next_best_step}
                      </p>
                    </div>
                    <div className="pt-2 border-t border-slate-700 flex justify-between items-center text-xs">
                      <span className="text-slate-400">Urgency:</span>
                      <span className="text-amber-300 font-bold">{summaryResult.urgency}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: Instant Sizing Calculator */}
            {activeTab === 'calculator' && (
              <div className="space-y-4">
                <div className="space-y-3 p-4 rounded-xl bg-slate-800/60 border border-slate-700">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 flex justify-between">
                      <span>Monthly Electricity Bill:</span>
                      <span className="text-amber-400 font-bold">₹{calcBill.toLocaleString()}</span>
                    </label>
                    <input
                      type="range"
                      min="1500"
                      max="50000"
                      step="500"
                      value={calcBill}
                      onChange={(e) => setCalcBill(parseInt(e.target.value))}
                      className="w-full mt-2 accent-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 flex justify-between">
                      <span>Roof Space Available:</span>
                      <span className="text-amber-400 font-bold">{calcRoof} sq.ft</span>
                    </label>
                    <input
                      type="range"
                      min="200"
                      max="3000"
                      step="50"
                      value={calcRoof}
                      onChange={(e) => setCalcRoof(parseInt(e.target.value))}
                      className="w-full mt-2 accent-amber-500"
                    />
                  </div>
                </div>

                {/* Calculation Outputs */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Recommended</span>
                    <p className="text-base font-bold text-amber-400 mt-0.5">{estimatedKw} kW</p>
                    <span className="text-[10px] text-slate-400">Requires ~{estimatedKw * 100} sq.ft</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Govt. Subsidy</span>
                    <p className="text-base font-bold text-emerald-400 mt-0.5">₹{estimatedSubsidy.toLocaleString()}</p>
                    <span className="text-[10px] text-slate-400">Direct Central Dbt</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Monthly Generation</span>
                    <p className="text-base font-bold text-slate-200 mt-0.5">{estimatedGeneration} kWh</p>
                    <span className="text-[10px] text-slate-400">~{Math.round(estimatedGeneration / 30)} units/day</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Monthly Bill Savings</span>
                    <p className="text-base font-bold text-emerald-400 mt-0.5">₹{estimatedSavings.toLocaleString()}</p>
                    <span className="text-[10px] text-slate-400">~90% reduction</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
