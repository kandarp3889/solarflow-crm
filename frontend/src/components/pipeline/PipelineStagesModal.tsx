import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Sliders,
  ArrowUp,
  ArrowDown,
  Edit2,
  Trash2,
  Check,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  Layers,
  Percent,
  CheckCircle2,
  XCircle,
  HelpCircle
} from 'lucide-react';
import { PipelineStageConfig } from '../../types';
import { api } from '../../services/api';

export const STAGE_COLOR_PALETTE: Record<
  string,
  { label: string; badge: string; border: string; bg: string; text: string; hex: string }
> = {
  blue: {
    label: 'Sky Blue',
    badge: 'border-blue-500/40 text-blue-400 bg-blue-500/10',
    border: 'border-blue-500/40',
    bg: 'bg-blue-500',
    text: 'text-blue-400',
    hex: '#3b82f6'
  },
  indigo: {
    label: 'Indigo',
    badge: 'border-indigo-500/40 text-indigo-400 bg-indigo-500/10',
    border: 'border-indigo-500/40',
    bg: 'bg-indigo-500',
    text: 'text-indigo-400',
    hex: '#6366f1'
  },
  amber: {
    label: 'Solar Gold',
    badge: 'border-amber-500/40 text-amber-400 bg-amber-500/10',
    border: 'border-amber-500/40',
    bg: 'bg-amber-500',
    text: 'text-amber-400',
    hex: '#f59e0b'
  },
  purple: {
    label: 'Purple',
    badge: 'border-purple-500/40 text-purple-400 bg-purple-500/10',
    border: 'border-purple-500/40',
    bg: 'bg-purple-500',
    text: 'text-purple-400',
    hex: '#a855f7'
  },
  cyan: {
    label: 'Cyan',
    badge: 'border-cyan-500/40 text-cyan-400 bg-cyan-500/10',
    border: 'border-cyan-500/40',
    bg: 'bg-cyan-500',
    text: 'text-cyan-400',
    hex: '#06b6d4'
  },
  orange: {
    label: 'Orange',
    badge: 'border-orange-500/40 text-orange-400 bg-orange-500/10',
    border: 'border-orange-500/40',
    bg: 'bg-orange-500',
    text: 'text-orange-400',
    hex: '#f97316'
  },
  pink: {
    label: 'Pink',
    badge: 'border-pink-500/40 text-pink-400 bg-pink-500/10',
    border: 'border-pink-500/40',
    bg: 'bg-pink-500',
    text: 'text-pink-400',
    hex: '#ec4899'
  },
  emerald: {
    label: 'Emerald',
    badge: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10',
    border: 'border-emerald-500/40',
    bg: 'bg-emerald-500',
    text: 'text-emerald-400',
    hex: '#10b981'
  },
  red: {
    label: 'Ruby Red',
    badge: 'border-red-500/40 text-red-400 bg-red-500/10',
    border: 'border-red-500/40',
    bg: 'bg-red-500',
    text: 'text-red-400',
    hex: '#ef4444'
  },
  teal: {
    label: 'Teal',
    badge: 'border-teal-500/40 text-teal-400 bg-teal-500/10',
    border: 'border-teal-500/40',
    bg: 'bg-teal-500',
    text: 'text-teal-400',
    hex: '#14b8a6'
  },
  violet: {
    label: 'Violet',
    badge: 'border-violet-500/40 text-violet-400 bg-violet-500/10',
    border: 'border-violet-500/40',
    bg: 'bg-violet-500',
    text: 'text-violet-400',
    hex: '#8b5cf6'
  },
  slate: {
    label: 'Slate Gray',
    badge: 'border-slate-500/40 text-slate-400 bg-slate-500/10',
    border: 'border-slate-500/40',
    bg: 'bg-slate-500',
    text: 'text-slate-400',
    hex: '#64748b'
  }
};

export const getStageColorConfig = (colorKey: string) => {
  return STAGE_COLOR_PALETTE[colorKey] || STAGE_COLOR_PALETTE.blue;
};

interface PipelineStagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStagesUpdated: () => void;
  currentStages: PipelineStageConfig[];
}

export const PipelineStagesModal: React.FC<PipelineStagesModalProps> = ({
  isOpen,
  onClose,
  onStagesUpdated,
  currentStages
}) => {
  const [stages, setStages] = useState<PipelineStageConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list');
  const [editingStage, setEditingStage] = useState<PipelineStageConfig | null>(null);

  // Form State
  const [formLabel, setFormLabel] = useState('');
  const [formKey, setFormKey] = useState('');
  const [formColor, setFormColor] = useState('blue');
  const [formWinProb, setFormWinProb] = useState(50);
  const [formIsWon, setFormIsWon] = useState(false);
  const [formIsLost, setFormIsLost] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete Safeguard State
  const [stageToDelete, setStageToDelete] = useState<PipelineStageConfig | null>(null);
  const [fallbackStageKey, setFallbackStageKey] = useState('');

  useEffect(() => {
    if (isOpen) {
      setStages(currentStages);
      setMode('list');
      setEditingStage(null);
      setStageToDelete(null);
    }
  }, [isOpen, currentStages]);

  if (!isOpen) return null;

  const handleStartCreate = () => {
    setFormLabel('');
    setFormKey('');
    setFormColor('amber');
    setFormWinProb(50);
    setFormIsWon(false);
    setFormIsLost(false);
    setFormError('');
    setEditingStage(null);
    setMode('create');
  };

  const handleStartEdit = (stage: PipelineStageConfig) => {
    setEditingStage(stage);
    setFormLabel(stage.label);
    setFormKey(stage.key);
    setFormColor(stage.color || 'blue');
    setFormWinProb(stage.win_probability_pct ?? 50);
    setFormIsWon(stage.is_won || false);
    setFormIsLost(stage.is_lost || false);
    setFormError('');
    setMode('edit');
  };

  const handleSaveStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formLabel.trim()) {
      setFormError('Please enter a stage label/name');
      return;
    }

    setLoading(true);
    setFormError('');
    try {
      if (mode === 'create') {
        await api.createPipelineStage({
          label: formLabel.trim(),
          key: formKey.trim() || undefined,
          color: formColor,
          win_probability_pct: formWinProb,
          is_won: formIsWon,
          is_lost: formIsLost
        });
      } else if (mode === 'edit' && editingStage) {
        await api.updatePipelineStage(editingStage.stage_id, {
          label: formLabel.trim(),
          key: formKey.trim() || undefined,
          color: formColor,
          win_probability_pct: formWinProb,
          is_won: formIsWon,
          is_lost: formIsLost
        });
      }

      onStagesUpdated();
      setMode('list');
    } catch (err: any) {
      setFormError(err.message || 'Error saving stage');
    } finally {
      setLoading(false);
    }
  };

  const handleMoveStage = async (index: number, direction: 'up' | 'down') => {
    const newIdx = direction === 'up' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= stages.length) return;

    const reordered = [...stages];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(newIdx, 0, moved);
    setStages(reordered);

    try {
      await api.reorderPipelineStages(reordered.map((s) => s.stage_id));
      onStagesUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to reorder stages');
      setStages(currentStages);
    }
  };

  const handleConfirmDelete = async () => {
    if (!stageToDelete) return;
    setLoading(true);
    try {
      await api.deletePipelineStage(stageToDelete.stage_id, fallbackStageKey || undefined);
      setStageToDelete(null);
      onStagesUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to delete stage');
    } finally {
      setLoading(false);
    }
  };

  const handleResetDefaults = async () => {
    if (
      !confirm(
        'Are you sure you want to reset all pipeline stages to Solar Industry Defaults? Any leads with custom stages will be migrated to "New Lead".'
      )
    )
      return;

    setLoading(true);
    try {
      await api.resetPipelineStages();
      onStagesUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to reset stages');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-3xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white font-display flex items-center gap-2">
                <span>Sales Pipeline Stages</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  {stages.length} Stages
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Customize your solar sales workflow columns, win probabilities, colors, and order.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {mode === 'list' && !stageToDelete && (
            <>
              {/* Action Bar */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="text-xs text-slate-400">
                  Drag or use arrows to adjust stage sequence in the Kanban board.
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleResetDefaults}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Defaults</span>
                  </button>

                  <button
                    onClick={handleStartCreate}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add New Stage</span>
                  </button>
                </div>
              </div>

              {/* Stages List */}
              <div className="space-y-2.5">
                {stages.map((stage, idx) => {
                  const colorConfig = getStageColorConfig(stage.color);
                  const leadsCount = stage.count ?? (stage.leads ? stage.leads.length : 0);

                  return (
                    <div
                      key={stage.stage_id}
                      className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/70 hover:border-slate-600 transition-all flex items-center justify-between gap-3 group"
                    >
                      {/* Left: Reorder & Number */}
                      <div className="flex items-center gap-2.5">
                        <div className="flex flex-col gap-0.5">
                          <button
                            onClick={() => handleMoveStage(idx, 'up')}
                            disabled={idx === 0}
                            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                            title="Move Up in Funnel"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleMoveStage(idx, 'down')}
                            disabled={idx === stages.length - 1}
                            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                            title="Move Down in Funnel"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <span className="w-6 h-6 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-[11px] font-mono font-bold text-slate-400">
                          {idx + 1}
                        </span>

                        {/* Color Dot & Stage Label */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${colorConfig.badge}`}
                            >
                              {stage.label}
                            </span>

                            {stage.is_won && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Deal Won</span>
                              </span>
                            )}

                            {stage.is_lost && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/30">
                                <XCircle className="w-3 h-3" />
                                <span>Deal Lost</span>
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                            <span>slug: {stage.key}</span>
                            <span>•</span>
                            <span className="text-amber-400/90 font-semibold">
                              {stage.win_probability_pct}% Win Probability
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Metrics & Actions */}
                      <div className="flex items-center gap-3">
                        <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 font-mono">
                          {leadsCount} {leadsCount === 1 ? 'lead' : 'leads'}
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleStartEdit(stage)}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-amber-400 hover:bg-slate-700/80 transition-colors cursor-pointer"
                            title="Edit Stage"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => {
                              const remaining = stages.filter((s) => s.stage_id !== stage.stage_id);
                              setStageToDelete(stage);
                              setFallbackStageKey(remaining.length > 0 ? remaining[0].key : '');
                            }}
                            disabled={stages.length <= 1}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                            title={stages.length <= 1 ? 'Cannot delete the only stage' : 'Delete Stage'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Create or Edit Form */}
          {(mode === 'create' || mode === 'edit') && !stageToDelete && (
            <form onSubmit={handleSaveStage} className="space-y-5 animate-fadeIn">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h4 className="text-sm font-bold text-white font-display flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>{mode === 'create' ? 'Create New Pipeline Stage' : `Edit Stage: ${editingStage?.label}`}</span>
                </h4>

                <button
                  type="button"
                  onClick={() => setMode('list')}
                  className="text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Back to Stages List
                </button>
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Stage Name & Key */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Stage Name / Label *
                  </label>
                  <input
                    type="text"
                    required
                    value={formLabel}
                    onChange={(e) => {
                      setFormLabel(e.target.value);
                      if (mode === 'create' && !formKey) {
                        // Preview slug
                      }
                    }}
                    placeholder="e.g. Feasibility Study, Net Metering"
                    className="w-full px-3.5 py-2.5 text-xs text-white bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    The title shown on the column header and lead cards.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    System Identifier / Key (Optional)
                  </label>
                  <input
                    type="text"
                    value={formKey}
                    onChange={(e) => setFormKey(e.target.value)}
                    placeholder="Auto-generated if left blank"
                    className="w-full px-3.5 py-2.5 text-xs text-white bg-slate-800 border border-slate-700 rounded-xl font-mono focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Unique code for automations and lead filtering (e.g. site_feasibility).
                  </p>
                </div>
              </div>

              {/* Color Theme Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Stage Color Theme
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {Object.entries(STAGE_COLOR_PALETTE).map(([cKey, cObj]) => {
                    const isSelected = formColor === cKey;
                    return (
                      <button
                        key={cKey}
                        type="button"
                        onClick={() => setFormColor(cKey)}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-slate-800 border-amber-500 text-white shadow-sm ring-1 ring-amber-500/50'
                            : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0"
                          style={{ backgroundColor: cObj.hex }}
                        />
                        <span className="truncate">{cObj.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Win Probability Slider */}
              <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Percent className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-white">Deal Win Probability</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-400 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20">
                    {formWinProb}%
                  </span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={formWinProb}
                  onChange={(e) => setFormWinProb(parseInt(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />

                <p className="text-[11px] text-slate-400">
                  When a solar lead moves to this stage, its estimated deal closing probability will
                  automatically update to this value for forecasting.
                </p>
              </div>

              {/* Terminal Classification (Won/Lost flags) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <label
                  className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    formIsWon
                      ? 'bg-emerald-500/10 border-emerald-500/40'
                      : 'bg-slate-800/40 border-slate-700/60'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formIsWon}
                    onChange={(e) => {
                      setFormIsWon(e.target.checked);
                      if (e.target.checked) {
                        setFormIsLost(false);
                        setFormWinProb(100);
                      }
                    }}
                    className="mt-0.5 accent-emerald-500 rounded"
                  />
                  <div>
                    <span className="block text-xs font-bold text-slate-200">
                      Closed Won Deal
                    </span>
                    <span className="block text-[11px] text-slate-400 mt-0.5">
                      Customer has signed contract, paid deposit, or deal is confirmed won.
                    </span>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    formIsLost
                      ? 'bg-red-500/10 border-red-500/40'
                      : 'bg-slate-800/40 border-slate-700/60'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formIsLost}
                    onChange={(e) => {
                      setFormIsLost(e.target.checked);
                      if (e.target.checked) {
                        setFormIsWon(false);
                        setFormWinProb(0);
                      }
                    }}
                    className="mt-0.5 accent-red-500 rounded"
                  />
                  <div>
                    <span className="block text-xs font-bold text-slate-200">
                      Closed Lost Deal
                    </span>
                    <span className="block text-[11px] text-slate-400 mt-0.5">
                      Customer cancelled, declined quote, roof ineligible, or dropped out.
                    </span>
                  </div>
                </label>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setMode('list')}
                  className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl shadow-md shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{mode === 'create' ? 'Create Stage' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Delete Safeguard Modal / View */}
          {stageToDelete && (
            <div className="p-5 rounded-2xl bg-red-500/10 border border-red-500/30 space-y-4 animate-fadeIn">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    Delete Stage: &ldquo;{stageToDelete.label}&rdquo;?
                  </h4>
                  <p className="text-xs text-slate-300 mt-1">
                    {stageToDelete.count && stageToDelete.count > 0 ? (
                      <>
                        This stage currently contains{' '}
                        <strong className="text-amber-400">{stageToDelete.count} active lead(s)</strong>.
                        Please select which stage to migrate these leads to:
                      </>
                    ) : (
                      'Are you sure you want to remove this column from your pipeline? This cannot be undone.'
                    )}
                  </p>
                </div>
              </div>

              {/* Fallback stage selector */}
              {stages.filter((s) => s.stage_id !== stageToDelete.stage_id).length > 0 && (
                <div className="pt-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Move existing leads to:
                  </label>
                  <select
                    value={fallbackStageKey}
                    onChange={(e) => setFallbackStageKey(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs text-white bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    {stages
                      .filter((s) => s.stage_id !== stageToDelete.stage_id)
                      .map((s) => (
                        <option key={s.key} value={s.key}>
                          {s.label} ({s.key})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStageToDelete(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 rounded-xl border border-slate-700 cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={loading}
                  className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-500 rounded-xl shadow-md shadow-red-600/30 transition-all cursor-pointer"
                >
                  {loading ? 'Deleting...' : 'Confirm & Delete'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
