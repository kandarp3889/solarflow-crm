import React, { useState, useEffect } from 'react';
import { X, ShieldPlus, Check, Sparkles } from 'lucide-react';
import { RoleMetadata, RolePermissionsMatrix } from '../../types';
import { api } from '../../services/api';

interface CustomRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  roleToEdit?: RoleMetadata | null;
  permissionsMatrix: RolePermissionsMatrix;
}

const BADGE_COLORS = [
  { id: 'emerald', name: 'Emerald Green', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  { id: 'purple', name: 'Purple Violet', bg: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  { id: 'cyan', name: 'Cyan Aqua', bg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
  { id: 'blue', name: 'Royal Blue', bg: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  { id: 'amber', name: 'Amber Gold', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  { id: 'rose', name: 'Rose Red', bg: 'bg-rose-500/20 text-rose-300 border-rose-500/30' }
];

export const CustomRoleModal: React.FC<CustomRoleModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  roleToEdit,
  permissionsMatrix
}) => {
  const isEditing = !!roleToEdit;
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [badgeColor, setBadgeColor] = useState('emerald');
  const [templateRole, setTemplateRole] = useState('sales_rep');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (roleToEdit) {
      setName(roleToEdit.name);
      setSlug(roleToEdit.id);
      setDescription(roleToEdit.description || '');
      setBadgeColor(roleToEdit.badge_color || 'emerald');
    } else {
      setName('');
      setSlug('');
      setDescription('');
      setBadgeColor('emerald');
      setTemplateRole('sales_rep');
    }
    setError(null);
  }, [roleToEdit, isOpen]);

  if (!isOpen) return null;

  const handleNameChange = (val: string) => {
    setName(val);
    if (!isEditing) {
      const generatedSlug = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
      setSlug(generatedSlug);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Role name is required');
      return;
    }
    if (!isEditing && !slug.trim()) {
      setError('Role identifier is required');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (isEditing && roleToEdit) {
        await api.updateCustomRole(roleToEdit.id, {
          name: name.trim(),
          description: description.trim(),
          badge_color: badgeColor
        });
      } else {
        const initialPerms = templateRole === 'none' ? [] : (permissionsMatrix[templateRole] || []);
        await api.createCustomRole({
          id: slug.trim().toLowerCase(),
          name: name.trim(),
          description: description.trim(),
          badge_color: badgeColor,
          permissions: initialPerms
        });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save custom role');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#0d1711] border border-[#1e3423] rounded-3xl p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1e3423] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#106828]/20 border border-[#106828]/40 flex items-center justify-center text-[#FEC426]">
              <ShieldPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-display">
                {isEditing ? `Edit Role: ${roleToEdit.name}` : 'Create Custom Role'}
              </h3>
              <p className="text-xs text-slate-400">
                {isEditing ? 'Modify custom role details' : 'Define a new tailored team role with custom permissions'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-slate-800/50 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="text-slate-300 font-semibold block mb-1.5">
              Role Display Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Telecaller / Solar Qualifier"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#132218] border border-[#233d2a] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#FEC426]/60 transition-colors"
            />
          </div>

          {!isEditing && (
            <div>
              <label className="text-slate-300 font-semibold block mb-1.5 flex items-center justify-between">
                <span>Unique Role Identifier (Slug) *</span>
                <span className="text-[11px] text-slate-500">lowercase, no spaces</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. telecaller"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                className="w-full px-3.5 py-2.5 bg-[#132218] border border-[#233d2a] rounded-xl text-white font-mono placeholder-slate-500 focus:outline-none focus:border-[#FEC426]/60 transition-colors"
              />
            </div>
          )}

          <div>
            <label className="text-slate-300 font-semibold block mb-1.5">
              Description & Purpose
            </label>
            <textarea
              rows={2}
              placeholder="Describe what responsibilities this role handles..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#132218] border border-[#233d2a] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#FEC426]/60 transition-colors resize-none"
            />
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-2">
              Badge Color Accent
            </label>
            <div className="grid grid-cols-3 gap-2">
              {BADGE_COLORS.map((col) => (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => setBadgeColor(col.id)}
                  className={`px-2.5 py-2 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${col.bg} ${
                    badgeColor === col.id ? 'ring-2 ring-white scale-102' : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  {badgeColor === col.id && <Check className="w-3 h-3" />}
                  <span>{col.name.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {!isEditing && (
            <div>
              <label className="text-slate-300 font-semibold block mb-1.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#FEC426]" />
                <span>Clone Initial Permissions From Template</span>
              </label>
              <select
                value={templateRole}
                onChange={(e) => setTemplateRole(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#132218] border border-[#233d2a] rounded-xl text-white focus:outline-none focus:border-[#FEC426]/60 transition-colors"
              >
                <option value="sales_rep">Copy Sales Representative permissions</option>
                <option value="sales_manager">Copy Sales Manager permissions</option>
                <option value="survey_engineer">Copy Survey Engineer permissions</option>
                <option value="none">Start with Zero permissions</option>
              </select>
            </div>
          )}

          <div className="pt-3 flex justify-end gap-3 border-t border-[#1e3423]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-semibold text-slate-400 hover:text-white rounded-xl bg-[#132218] hover:bg-[#1a2f21] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2 font-bold text-slate-950 bg-[#FEC426] hover:bg-[#fed35a] disabled:opacity-50 rounded-xl transition-all shadow-md shadow-[#FEC426]/20 cursor-pointer"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>{isEditing ? 'Save Changes' : 'Create Role'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
