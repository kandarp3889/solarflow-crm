import React, { useState, useEffect } from 'react';
import { X, Shield, Search, Check, Plus, Minus, Info } from 'lucide-react';
import { User, PermissionCategory, RolePermissionsMatrix } from '../../types';
import { api } from '../../services/api';

interface UserPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: User | null;
  catalog: PermissionCategory[];
  permissionsMatrix: RolePermissionsMatrix;
}

export const UserPermissionsModal: React.FC<UserPermissionsModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  user,
  catalog,
  permissionsMatrix
}) => {
  const [search, setSearch] = useState('');
  const [customPerms, setCustomPerms] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setCustomPerms(user.custom_permissions || []);
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const roleBasePerms = new Set(permissionsMatrix[user.role] || []);

  const handleToggleExtraPermission = (key: string) => {
    if (customPerms.includes(key)) {
      setCustomPerms(customPerms.filter((k) => k !== key));
    } else {
      setCustomPerms([...customPerms, key]);
    }
  };

  const handleSave = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await api.updateTeamMember(user.id, {
        custom_permissions: customPerms
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update custom permissions');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCatalog = catalog.map((cat) => {
    const items = cat.items.filter(
      (item) =>
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.key.toLowerCase().includes(search.toLowerCase()) ||
        item.description.toLowerCase().includes(search.toLowerCase())
    );
    return { ...cat, items };
  }).filter((cat) => cat.items.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#0d1711] border border-[#1e3423] rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1e3423] pb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#106828]/20 border border-[#106828]/40 flex items-center justify-center text-[#FEC426]">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-display">
                Permissions & Overrides: {user.full_name}
              </h3>
              <p className="text-xs text-slate-400">
                Assigned Role: <span className="text-[#FEC426] capitalize font-medium">{user.role.replace('_', ' ')}</span>
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

        {/* Info Ribbon */}
        <div className="p-3 rounded-2xl bg-[#132218] border border-[#233d2a] flex items-start gap-2.5 text-xs text-slate-300 flex-shrink-0">
          <Info className="w-4 h-4 text-[#FEC426] flex-shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            Permissions with <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-semibold border border-blue-500/30">From Role</span> are automatically granted by this user's role. You can grant extra permissions specifically to this user below.
          </div>
        </div>

        {/* Search */}
        <div className="relative flex-shrink-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search permissions by name or capability..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#132218] border border-[#233d2a] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FEC426]/60 transition-colors"
          />
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex-shrink-0">
            {error}
          </div>
        )}

        {/* Permission List Grouped by Category */}
        <div className="overflow-y-auto pr-1 space-y-4 flex-1">
          {filteredCatalog.map((category) => (
            <div key={category.category} className="space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-[#1b3120]">
                <span className="text-xs font-bold text-[#FEC426] tracking-wide uppercase">
                  {category.category}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  {category.items.length} items
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {category.items.map((item) => {
                  const isRoleGranted = roleBasePerms.has(item.key) || user.role === 'company_admin' || user.role === 'super_admin';
                  const isCustomGranted = customPerms.includes(item.key);

                  return (
                    <div
                      key={item.key}
                      className="p-3 rounded-xl bg-[#101c13] border border-[#1e3423] flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">{item.name}</span>
                          <span className="font-mono text-[10px] text-slate-500">{item.key}</span>
                          {isRoleGranted && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                              From Role
                            </span>
                          )}
                          {isCustomGranted && !isRoleGranted && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Custom Override
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400">{item.description}</p>
                      </div>

                      <div>
                        {isRoleGranted ? (
                          <div className="flex items-center gap-1 text-blue-400 px-2 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[11px] font-medium">
                            <Check className="w-3.5 h-3.5" />
                            <span>Granted</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleToggleExtraPermission(item.key)}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all border ${
                              isCustomGranted
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                                : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:text-white hover:border-slate-600'
                            }`}
                          >
                            {isCustomGranted ? (
                              <>
                                <Minus className="w-3.5 h-3.5" />
                                <span>Remove</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5" />
                                <span>Grant Extra</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="pt-3 flex items-center justify-between border-t border-[#1e3423] flex-shrink-0">
          <div className="text-xs text-slate-400">
            Custom Overrides: <strong className="text-white">{customPerms.length}</strong> extra permissions
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-semibold text-slate-400 hover:text-white rounded-xl bg-[#132218] hover:bg-[#1a2f21] transition-colors text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleSave}
              className="px-5 py-2 font-bold text-slate-950 bg-[#FEC426] hover:bg-[#fed35a] disabled:opacity-50 rounded-xl transition-all shadow-md shadow-[#FEC426]/20 cursor-pointer text-xs flex items-center gap-2"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>Save User Overrides</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
