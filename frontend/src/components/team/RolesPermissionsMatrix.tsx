import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldPlus,
  Trash2,
  Edit2,
  RotateCcw,
  Save,
  Search,
  Check,
  CheckCheck,
  XCircle,
  AlertCircle,
  Sparkles,
  Users,
  Kanban,
  ClipboardCheck,
  FileSpreadsheet,
  PhoneCall,
  BarChart3,
  Bot,
  Zap,
  Lock,
  Sliders,
  CheckCircle2
} from 'lucide-react';
import { RoleMetadata, PermissionCategory, RolePermissionsMatrix } from '../../types';
import { api } from '../../services/api';
import { CustomRoleModal } from './CustomRoleModal';

interface RolesPermissionsMatrixProps {
  roles: RoleMetadata[];
  catalog: PermissionCategory[];
  initialPermissions: RolePermissionsMatrix;
  onRefresh: () => void;
  canManagePermissions: boolean;
}

const CATEGORY_ICONS: Record<string, any> = {
  'Lead Management': Users,
  'Sales Pipeline': Kanban,
  'Rooftop Surveys': ClipboardCheck,
  'Quotations & Pricing': FileSpreadsheet,
  'Follow-ups & Schedule': PhoneCall,
  'Analytics & Reports': BarChart3,
  'GenAI Assistant': Bot,
  'Automation Workflows': Zap,
  'Team & Access Control': Shield,
  'Company Settings': Sliders
};

const ROLE_BADGE_STYLES: Record<string, string> = {
  amber: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  purple: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
  blue: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
  cyan: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
  emerald: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  rose: 'bg-rose-500/10 text-rose-300 border-rose-500/30'
};

export const RolesPermissionsMatrix: React.FC<RolesPermissionsMatrixProps> = ({
  roles,
  catalog,
  initialPermissions,
  onRefresh,
  canManagePermissions
}) => {
  const [selectedRoleId, setSelectedRoleId] = useState<string>(roles[0]?.id || 'company_admin');
  const [permissionsMatrix, setPermissionsMatrix] = useState<RolePermissionsMatrix>(initialPermissions);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCustomRoleModalOpen, setIsCustomRoleModalOpen] = useState(false);
  const [roleToEdit, setRoleToEdit] = useState<RoleMetadata | null>(null);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'focused' | 'matrix'>('focused');

  useEffect(() => {
    setPermissionsMatrix(initialPermissions);
  }, [initialPermissions]);

  // Keep selectedRoleId valid when roles list changes
  useEffect(() => {
    if (roles.length > 0 && !roles.some((r) => r.id === selectedRoleId)) {
      setSelectedRoleId(roles[0].id);
    }
  }, [roles, selectedRoleId]);

  const hasUnsavedChanges = JSON.stringify(permissionsMatrix) !== JSON.stringify(initialPermissions);

  const selectedRole = roles.find((r) => r.id === selectedRoleId) || roles[0];
  const activeRolePerms = new Set(permissionsMatrix[selectedRoleId] || []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleTogglePermission = (roleId: string, permKey: string) => {
    if (!canManagePermissions) return;

    // Lockout protection for company_admin vital permissions
    if (roleId === 'company_admin' && ['team:manage_permissions', 'team:manage_users', 'team:manage_roles'].includes(permKey)) {
      return;
    }

    setPermissionsMatrix((prev) => {
      const currentList = new Set(prev[roleId] || []);
      if (currentList.has(permKey)) {
        currentList.delete(permKey);
      } else {
        currentList.add(permKey);
      }
      return {
        ...prev,
        [roleId]: Array.from(currentList)
      };
    });
  };

  const handleToggleCategory = (roleId: string, category: PermissionCategory, grantAll: boolean) => {
    if (!canManagePermissions) return;

    setPermissionsMatrix((prev) => {
      const currentList = new Set(prev[roleId] || []);
      category.items.forEach((item) => {
        if (roleId === 'company_admin' && ['team:manage_permissions', 'team:manage_users', 'team:manage_roles'].includes(item.key)) {
          currentList.add(item.key);
          return;
        }
        if (grantAll) {
          currentList.add(item.key);
        } else {
          currentList.delete(item.key);
        }
      });
      return {
        ...prev,
        [roleId]: Array.from(currentList)
      };
    });
  };

  const handleSavePermissions = async () => {
    setSaving(true);
    setErrorMessage(null);
    try {
      await api.updateRolePermissions(permissionsMatrix);
      showToast('Role permissions matrix saved and activated!');
      onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save permissions matrix');
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefaults = async () => {
    if (!window.confirm(`Reset permissions for role "${selectedRole?.name}" back to system defaults?`)) {
      return;
    }
    setSaving(true);
    try {
      await api.resetRolePermissions(selectedRoleId);
      showToast(`Permissions for ${selectedRole?.name} reset to defaults.`);
      onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error resetting permissions');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCustomRole = async (roleId: string, roleName: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete custom role "${roleName}"?`)) {
      return;
    }
    try {
      await api.deleteCustomRole(roleId);
      showToast(`Custom role "${roleName}" removed`);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Error deleting custom role');
    }
  };

  const filteredCatalog = catalog.map((cat) => {
    const items = cat.items.filter(
      (item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return { ...cat, items };
  }).filter((cat) => cat.items.length > 0);

  return (
    <div className="space-y-6">
      {/* Toast alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 p-4 rounded-2xl bg-[#106828] border border-[#10b981]/50 text-white shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-3">
          <CheckCircle2 className="w-5 h-5 text-[#FEC426]" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* Header ribbon */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-3xl bg-[#0d1711] border border-[#1e3423]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#FEC426]" />
            <h3 className="text-lg font-bold text-white font-display">
              Role & Permissions Matrix (RBAC)
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            Define system roles, create custom titles, and configure exact operational capabilities across the solar platform.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* View Mode Toggle */}
          <div className="p-1 rounded-xl bg-[#132218] border border-[#233d2a] flex items-center text-xs">
            <button
              onClick={() => setViewMode('focused')}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                viewMode === 'focused' ? 'bg-[#106828] text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Role Focus
            </button>
            <button
              onClick={() => setViewMode('matrix')}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                viewMode === 'matrix' ? 'bg-[#106828] text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Full Grid
            </button>
          </div>

          {canManagePermissions && (
            <button
              onClick={() => {
                setRoleToEdit(null);
                setIsCustomRoleModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-[#106828] hover:bg-[#15803d] text-white shadow-md shadow-[#106828]/20 transition-all cursor-pointer"
            >
              <ShieldPlus className="w-4 h-4" />
              <span>Create Custom Role</span>
            </button>
          )}
        </div>
      </div>

      {/* Role Navigation Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {roles.map((role) => {
          const isSelected = selectedRoleId === role.id;
          const badgeClass = ROLE_BADGE_STYLES[role.badge_color || 'emerald'] || 'bg-slate-800 text-slate-300';
          const permsCount = (permissionsMatrix[role.id] || []).length;

          return (
            <button
              key={role.id}
              onClick={() => setSelectedRoleId(role.id)}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-xs font-bold border transition-all cursor-pointer whitespace-nowrap ${
                isSelected
                  ? 'bg-[#132218] border-[#FEC426] text-white shadow-lg shadow-[#FEC426]/10 scale-102'
                  : 'bg-[#0d1711] border-[#1e3423] text-slate-400 hover:text-white hover:border-[#2a4a32]'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-[#FEC426] animate-pulse' : 'bg-slate-500'}`} />
              <span>{role.name}</span>
              <span className={`px-1.5 py-0.5 rounded-lg text-[10px] font-mono border ${badgeClass}`}>
                {permsCount} perms
              </span>
            </button>
          );
        })}
      </div>

      {/* FOCUSED VIEW: Role Details & Interactive Categories */}
      {viewMode === 'focused' ? (
        <div className="space-y-6">
          {/* Selected Role Meta Banner */}
          {selectedRole && (
            <div className="p-4 rounded-2xl bg-[#0d1711] border border-[#1e3423] flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">{selectedRole.name}</span>
                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border uppercase ${ROLE_BADGE_STYLES[selectedRole.badge_color || 'emerald']}`}>
                    {selectedRole.is_system ? 'Standard System Role' : 'Custom Tenant Role'}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">({selectedRole.id})</span>
                </div>
                <p className="text-xs text-slate-400">{selectedRole.description}</p>
              </div>

              <div className="flex items-center gap-2 self-start md:self-auto">
                {canManagePermissions && !selectedRole.is_system && (
                  <>
                    <button
                      onClick={() => {
                        setRoleToEdit(selectedRole);
                        setIsCustomRoleModalOpen(true);
                      }}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Edit role details"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDeleteCustomRole(selectedRole.id, selectedRole.name)}
                      className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Delete custom role"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </>
                )}

                {canManagePermissions && (
                  <button
                    onClick={handleResetToDefaults}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Reset role permissions to defaults"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Search Toolbar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search permissions by capability or keyword (e.g. leads, export, discount, whatsapp)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#0d1711] border border-[#1e3423] rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FEC426]/60 transition-colors"
            />
          </div>

          {/* Category Cards */}
          <div className="space-y-4">
            {filteredCatalog.map((category) => {
              const IconComp = CATEGORY_ICONS[category.category] || Shield;
              const catKeys = category.items.map((i) => i.key);
              const grantedCount = catKeys.filter((k) => activeRolePerms.has(k)).length;
              const allGranted = grantedCount === catKeys.length;

              return (
                <div
                  key={category.category}
                  className="rounded-2xl bg-[#0d1711] border border-[#1e3423] overflow-hidden shadow-sm"
                >
                  {/* Category Header */}
                  <div className="p-4 bg-[#101c13] border-b border-[#1b3120] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-[#106828]/20 border border-[#106828]/40 flex items-center justify-center text-[#FEC426]">
                        <IconComp className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider font-display">
                          {category.category}
                        </h4>
                        <span className="text-[11px] text-slate-400">
                          {grantedCount} of {catKeys.length} permissions enabled for {selectedRole?.name}
                        </span>
                      </div>
                    </div>

                    {canManagePermissions && (
                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <button
                          type="button"
                          onClick={() => handleToggleCategory(selectedRoleId, category, true)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#132218] hover:bg-[#1a2f21] text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold cursor-pointer transition-colors"
                        >
                          <CheckCheck className="w-3 h-3" />
                          <span>Grant All</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleCategory(selectedRoleId, category, false)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#132218] hover:bg-[#1a2f21] text-slate-400 hover:text-slate-200 border border-slate-700 text-[11px] font-semibold cursor-pointer transition-colors"
                        >
                          <XCircle className="w-3 h-3" />
                          <span>Revoke All</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Category Items */}
                  <div className="divide-y divide-[#16271a]">
                    {category.items.map((item) => {
                      const isGranted = activeRolePerms.has(item.key);
                      const isLocked =
                        selectedRoleId === 'company_admin' &&
                        ['team:manage_permissions', 'team:manage_users', 'team:manage_roles'].includes(item.key);

                      return (
                        <div
                          key={item.key}
                          className="p-3.5 hover:bg-[#101c13]/50 transition-colors flex items-center justify-between gap-4 text-xs"
                        >
                          <div className="space-y-0.5 max-w-xl">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white">{item.name}</span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-500 bg-[#132218] border border-[#203625]">
                                {item.key}
                              </span>
                              {isLocked && (
                                <span className="flex items-center gap-1 text-[10px] text-amber-400/80 font-medium">
                                  <Lock className="w-3 h-3" /> Essential Admin
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400">{item.description}</p>
                          </div>

                          <div>
                            <button
                              type="button"
                              disabled={isLocked || !canManagePermissions}
                              onClick={() => handleTogglePermission(selectedRoleId, item.key)}
                              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                isLocked
                                  ? 'bg-[#106828] opacity-80 cursor-not-allowed'
                                  : isGranted
                                  ? 'bg-[#106828] cursor-pointer'
                                  : 'bg-slate-800 cursor-pointer hover:bg-slate-700'
                              } ${!canManagePermissions ? 'opacity-60 cursor-not-allowed' : ''}`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                  isGranted ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* FULL MATRIX GRID VIEW */
        <div className="overflow-x-auto rounded-3xl bg-[#0d1711] border border-[#1e3423] p-4 shadow-sm scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-[#1e3423] text-slate-400">
                <th className="py-3 px-4 font-bold text-white w-72">Permission Capability</th>
                {roles.map((r) => (
                  <th key={r.id} className="py-3 px-3 text-center">
                    <div className="font-bold text-white text-xs">{r.name}</div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border uppercase mt-0.5 inline-block ${ROLE_BADGE_STYLES[r.badge_color || 'emerald']}`}>
                      {(permissionsMatrix[r.id] || []).length} perms
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#142318]">
              {catalog.map((cat) => (
                <React.Fragment key={cat.category}>
                  <tr className="bg-[#101c13]">
                    <td
                      colSpan={roles.length + 1}
                      className="py-2.5 px-4 font-bold text-[#FEC426] text-[11px] uppercase tracking-wider"
                    >
                      {cat.category}
                    </td>
                  </tr>
                  {cat.items.map((item) => (
                    <tr key={item.key} className="hover:bg-[#132218]/50 transition-colors">
                      <td className="py-2.5 px-4">
                        <div className="font-semibold text-slate-200">{item.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{item.key}</div>
                      </td>
                      {roles.map((r) => {
                        const hasPerm = (permissionsMatrix[r.id] || []).includes(item.key);
                        const isLocked =
                          r.id === 'company_admin' &&
                          ['team:manage_permissions', 'team:manage_users', 'team:manage_roles'].includes(item.key);

                        return (
                          <td key={r.id} className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              disabled={isLocked || !canManagePermissions}
                              onClick={() => handleTogglePermission(r.id, item.key)}
                              className={`w-7 h-7 rounded-lg inline-flex items-center justify-center transition-all ${
                                hasPerm
                                  ? 'bg-[#106828] text-white shadow-sm'
                                  : 'bg-slate-800/60 text-slate-600 hover:text-slate-400'
                              } ${isLocked ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}
                            >
                              {hasPerm ? <Check className="w-4 h-4" /> : null}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* FLOATING ACTION BAR: Unsaved Changes */}
      {hasUnsavedChanges && (
        <div className="sticky bottom-4 z-40 p-4 rounded-2xl bg-[#0d1711]/95 backdrop-blur-md border border-[#FEC426]/40 shadow-2xl flex items-center justify-between gap-4 animate-in slide-in-from-bottom-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">Unsaved Permission Changes</span>
              <span className="text-[11px] text-slate-400">
                You have modified role permissions. Click Save to propagate changes to active team sessions.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setPermissionsMatrix(initialPermissions)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-[#132218] hover:bg-[#1a2f21] transition-colors cursor-pointer"
            >
              Discard Changes
            </button>
            <button
              onClick={handleSavePermissions}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-slate-950 bg-[#FEC426] hover:bg-[#fed35a] shadow-lg shadow-[#FEC426]/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>Save & Publish Permissions</span>
            </button>
          </div>
        </div>
      )}

      {/* Custom Role Modal */}
      <CustomRoleModal
        isOpen={isCustomRoleModalOpen}
        onClose={() => setIsCustomRoleModalOpen(false)}
        onSuccess={() => {
          setIsCustomRoleModalOpen(false);
          onRefresh();
        }}
        roleToEdit={roleToEdit}
        permissionsMatrix={permissionsMatrix}
      />
    </div>
  );
};
