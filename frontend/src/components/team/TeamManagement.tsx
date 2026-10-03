import React, { useState, useEffect } from 'react';
import {
  Users,
  UserCheck,
  UserX,
  Plus,
  Mail,
  Phone,
  Shield,
  Search,
  Filter,
  MoreVertical,
  Edit2,
  KeyRound,
  Trash2,
  ShieldAlert,
  SlidersHorizontal,
  LayoutGrid,
  Table as TableIcon,
  CheckCircle2,
  History,
  TrendingUp,
  Award,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { User, RoleMetadata, PermissionCategory, RolePermissionsMatrix } from '../../types';
import { formatISTDateTime } from '../../utils/date';
import { UserModal } from './UserModal';
import { ResetPasswordModal } from './ResetPasswordModal';
import { UserPermissionsModal } from './UserPermissionsModal';
import { RolesPermissionsMatrix } from './RolesPermissionsMatrix';

export const TeamManagement: React.FC = () => {
  const { user: currentUser, hasRole, hasPermission } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'roles' | 'audit'>('users');

  // Team Users State
  const [team, setTeam] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // RBAC Roles & Permissions State
  const [roles, setRoles] = useState<RoleMetadata[]>([]);
  const [catalog, setCatalog] = useState<PermissionCategory[]>([]);
  const [permissionsMatrix, setPermissionsMatrix] = useState<RolePermissionsMatrix>({});
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Modals state
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [userForPasswordReset, setUserForPasswordReset] = useState<User | null>(null);
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [userForPermissions, setUserForPermissions] = useState<User | null>(null);
  const [activeMenuUserId, setActiveMenuUserId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const canManageUsers = hasRole(['company_admin', 'super_admin']) || hasPermission('team:manage_users');
  const canManagePermissions = hasRole(['company_admin', 'super_admin']) || hasPermission('team:manage_permissions');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchTeam = async () => {
    setLoading(true);
    try {
      const data = await api.getTeam({
        search: searchQuery,
        role: roleFilter !== 'all' ? roleFilter : undefined,
        is_active: statusFilter === 'all' ? undefined : statusFilter === 'active'
      });
      setTeam(data);
    } catch (e) {
      console.error('Error fetching team members:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissionsData = async () => {
    try {
      const data = await api.getRolePermissions();
      setRoles(data.roles || []);
      setCatalog(data.catalog || []);
      setPermissionsMatrix(data.permissions || {});
    } catch (e) {
      console.error('Error fetching role permissions:', e);
    }
  };

  const fetchAuditLogs = async () => {
    setLoadingAudit(true);
    try {
      const logs = await api.getAuditLogs();
      setAuditLogs(logs);
    } catch (e) {
      console.error('Error fetching audit logs:', e);
    } finally {
      setLoadingAudit(false);
    }
  };

  useEffect(() => {
    fetchTeam();
    fetchPermissionsData();
  }, []);

  // Re-fetch team on filter change
  useEffect(() => {
    fetchTeam();
  }, [roleFilter, statusFilter]);

  // Handle Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTeam();
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (activeSubTab === 'roles') {
      fetchPermissionsData();
    } else if (activeSubTab === 'audit') {
      fetchAuditLogs();
    }
  }, [activeSubTab]);

  const handleToggleStatus = async (user: User) => {
    if (user.id === currentUser?.id) {
      alert('You cannot deactivate your own administrative account.');
      return;
    }
    const newStatus = !user.is_active;
    try {
      await api.toggleTeamMemberStatus(user.id, newStatus);
      showToast(`User ${user.full_name} is now ${newStatus ? 'active' : 'suspended'}.`);
      fetchTeam();
    } catch (e: any) {
      alert(e.message || 'Error updating user status');
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (user.id === currentUser?.id) {
      alert('You cannot delete your own account.');
      return;
    }
    if (!window.confirm(`Are you sure you want to permanently remove ${user.full_name}? Any assigned leads or surveys will be unassigned.`)) {
      return;
    }
    try {
      const res = await api.deleteTeamMember(user.id);
      showToast(res.message || 'User deleted successfully');
      fetchTeam();
    } catch (e: any) {
      alert(e.message || 'Error removing user');
    }
  };

  // KPIs
  const totalUsers = team.length;
  const activeCount = team.filter((u) => u.is_active).length;
  const inactiveCount = totalUsers - activeCount;
  const totalWonDeals = team.reduce((acc, u) => acc + (u.won_deals || 0), 0);

  const roleColors: Record<string, string> = {
    company_admin: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    sales_manager: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
    sales_rep: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
    survey_engineer: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
    super_admin: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 p-4 rounded-2xl bg-[#106828] border border-[#10b981]/50 text-white shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-3">
          <CheckCircle2 className="w-5 h-5 text-[#FEC426]" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Main Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-3xl bg-[#0d1711] border border-[#1e3423] shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-white font-display flex items-center gap-2.5">
            <Users className="w-5 h-5 text-[#FEC426]" />
            <span>User Management & Access Control</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Manage your solar sales representatives, engineering surveyors, role privileges, and fine-grained permissions matrix.
          </p>
        </div>

        {/* Top Sub-Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#132218] border border-[#233d2a] self-start md:self-auto">
          <button
            onClick={() => setActiveSubTab('users')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'users'
                ? 'bg-[#106828] text-white shadow-md shadow-[#106828]/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Users Directory</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/30 font-mono">
              {team.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('roles')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'roles'
                ? 'bg-[#106828] text-white shadow-md shadow-[#106828]/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Roles & Permissions</span>
          </button>

          <button
            onClick={() => setActiveSubTab('audit')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'audit'
                ? 'bg-[#106828] text-white shadow-md shadow-[#106828]/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Audit Trail</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: USERS DIRECTORY & MANAGEMENT                                   */}
      {/* ========================================================================= */}
      {activeSubTab === 'users' && (
        <div className="space-y-6">
          {/* Executive KPI Stats Ribbon */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-[#0d1711] border border-[#1e3423] flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-[#106828]/20 border border-[#106828]/40 flex items-center justify-center text-[#FEC426]">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Total Team</span>
                <span className="text-xl font-bold text-white font-mono">{totalUsers}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#0d1711] border border-[#1e3423] flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Active Accounts</span>
                <span className="text-xl font-bold text-emerald-400 font-mono flex items-center gap-2">
                  {activeCount}
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#0d1711] border border-[#1e3423] flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                <UserX className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Suspended / Inactive</span>
                <span className="text-xl font-bold text-slate-300 font-mono">{inactiveCount}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#0d1711] border border-[#1e3423] flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Deals Won by Team</span>
                <span className="text-xl font-bold text-amber-400 font-mono">{totalWonDeals}</span>
              </div>
            </div>
          </div>

          {/* Filters & Actions Toolbar */}
          <div className="p-4 rounded-2xl bg-[#0d1711] border border-[#1e3423] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5">
            <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Search input */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search members by name, email, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-[#132218] border border-[#233d2a] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FEC426]/60 transition-colors"
                />
              </div>

              {/* Role filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-3 py-2 bg-[#132218] border border-[#233d2a] rounded-xl text-xs text-white focus:outline-none focus:border-[#FEC426]/60 transition-colors cursor-pointer"
                >
                  <option value="all">All Roles ({roles.length})</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 bg-[#132218] border border-[#233d2a] rounded-xl text-xs text-white focus:outline-none focus:border-[#FEC426]/60 transition-colors cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>

            {/* View Mode & Add User CTA */}
            <div className="flex items-center gap-2.5 self-end md:self-auto">
              <div className="p-1 rounded-xl bg-[#132218] border border-[#233d2a] flex items-center">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    viewMode === 'grid' ? 'bg-[#106828] text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Card Grid View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    viewMode === 'table' ? 'bg-[#106828] text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Detailed Table View"
                >
                  <TableIcon className="w-4 h-4" />
                </button>
              </div>

              {canManageUsers && (
                <button
                  onClick={() => {
                    setUserToEdit(null);
                    setIsUserModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-[#FEC426] hover:bg-[#fed35a] text-slate-950 shadow-md shadow-[#FEC426]/20 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Team Member</span>
                </button>
              )}
            </div>
          </div>

          {/* Members Content (Grid or Table) */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-60 rounded-3xl bg-slate-900/60 border border-slate-800 animate-pulse" />
              ))}
            </div>
          ) : team.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-[#0d1711] border border-[#1e3423] space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500 mx-auto">
                <UserX className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-white">No team members match your filters</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Try resetting your search query or selecting "All Roles" from the filter dropdown.
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            /* ================= GRID VIEW ================= */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {team.map((member) => {
                const rClass = roleColors[member.role] || 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
                const hasCustomPerms = (member.custom_permissions || []).length > 0;
                const isMenuOpen = activeMenuUserId === member.id;

                return (
                  <div
                    key={member.id}
                    className="p-5 rounded-3xl bg-[#0d1711] border border-[#1e3423] hover:border-[#2a4a32] shadow-sm flex flex-col justify-between space-y-4 transition-all relative"
                  >
                    <div>
                      {/* Top row: Avatar + info + kebab menu */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative flex-shrink-0">
                            <img
                              src={member.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.full_name)}&background=106828&color=ffffff`}
                              alt={member.full_name}
                              className="w-11 h-11 rounded-2xl object-cover border border-[#233d2a]"
                            />
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#0d1711] ${
                                member.is_active ? 'bg-emerald-400' : 'bg-slate-600'
                              }`}
                              title={member.is_active ? 'Active User' : 'Suspended'}
                            />
                          </div>

                          <div className="min-w-0">
                            <h3 className="text-sm font-bold text-white truncate">{member.full_name}</h3>
                            <p className="text-xs text-slate-400 truncate flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-500" />
                              <span className="truncate">{member.email}</span>
                            </p>
                          </div>
                        </div>

                        {/* Action Menu button */}
                        {canManageUsers && (
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setActiveMenuUserId(isMenuOpen ? null : member.id)}
                              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {/* Dropdown Menu */}
                            {isMenuOpen && (
                              <div className="absolute right-0 top-8 z-30 w-48 rounded-2xl bg-[#0a120c] border border-[#1e3423] p-1.5 shadow-2xl space-y-1 text-xs animate-in fade-in">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuUserId(null);
                                    setUserToEdit(member);
                                    setIsUserModalOpen(true);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-[#132218] transition-colors"
                                >
                                  <Edit2 className="w-3.5 h-3.5 text-blue-400" />
                                  <span>Edit Profile</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuUserId(null);
                                    setUserForPasswordReset(member);
                                    setIsResetPasswordOpen(true);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-[#132218] transition-colors"
                                >
                                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                                  <span>Reset Password</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuUserId(null);
                                    setUserForPermissions(member);
                                    setIsPermissionsModalOpen(true);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-[#132218] transition-colors"
                                >
                                  <Shield className="w-3.5 h-3.5 text-[#FEC426]" />
                                  <span>Inspect Permissions</span>
                                </button>

                                <div className="border-t border-[#1e3423] my-1" />

                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuUserId(null);
                                    handleToggleStatus(member);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-[#132218] transition-colors"
                                >
                                  {member.is_active ? (
                                    <>
                                      <UserX className="w-3.5 h-3.5 text-amber-400" />
                                      <span>Suspend Access</span>
                                    </>
                                  ) : (
                                    <>
                                      <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                                      <span>Activate Account</span>
                                    </>
                                  )}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuUserId(null);
                                    handleDeleteUser(member);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Remove Member</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Role & Phone info */}
                      <div className="mt-3.5 flex items-center justify-between">
                        <span className={`px-2.5 py-0.5 rounded-xl text-[10px] font-bold border uppercase tracking-wide ${rClass}`}>
                          {member.role.replace('_', ' ')}
                        </span>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                          <Phone className="w-3 h-3 text-slate-500" />
                          {member.phone || 'No phone'}
                        </span>
                      </div>

                      {/* Custom Permissions Tag */}
                      {hasCustomPerms && (
                        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20 w-fit">
                          <Sparkles className="w-3 h-3" />
                          <span>{member.custom_permissions?.length} custom overrides active</span>
                        </div>
                      )}
                    </div>

                    {/* Sales Metrics Ribbon */}
                    <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-[#132218] border border-[#233d2a] text-center text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 block font-medium">Leads</span>
                        <span className="font-bold text-slate-200 font-mono">{member.leads_assigned || 0}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block font-medium">Deals Won</span>
                        <span className="font-bold text-emerald-400 font-mono">{member.won_deals || 0}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block font-medium">Win Rate</span>
                        <span className="font-bold text-amber-400 font-mono">{member.conversion_rate || 0}%</span>
                      </div>
                    </div>

                    {/* Bottom footer: Revenue & Quick Status Switch */}
                    <div className="pt-2 border-t border-[#1e3423] text-xs flex justify-between items-center text-slate-400">
                      <div>
                        <span className="text-[11px]">Revenue Booked:</span>
                        <span className="font-bold text-emerald-400 ml-1 font-mono">
                          ₹{(member.revenue || 0).toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(member)}
                          className={`text-[10px] px-2 py-0.5 rounded-lg border font-semibold transition-colors cursor-pointer ${
                            member.is_active
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {member.is_active ? 'Active' : 'Suspended'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ================= TABLE VIEW ================= */
            <div className="rounded-3xl bg-[#0d1711] border border-[#1e3423] overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#1e3423] text-slate-400 bg-[#101c13]">
                      <th className="py-3.5 px-4 font-bold text-white">Member</th>
                      <th className="py-3.5 px-3 font-bold text-white">Role</th>
                      <th className="py-3.5 px-3 font-bold text-white">Contact</th>
                      <th className="py-3.5 px-3 font-bold text-white text-center">Status</th>
                      <th className="py-3.5 px-3 font-bold text-white text-center">Leads</th>
                      <th className="py-3.5 px-3 font-bold text-white text-center">Won</th>
                      <th className="py-3.5 px-3 font-bold text-white text-center">Win Rate</th>
                      <th className="py-3.5 px-3 font-bold text-white text-right">Revenue</th>
                      <th className="py-3.5 px-4 font-bold text-white text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#16271a]">
                    {team.map((member) => {
                      const rClass = roleColors[member.role] || 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';

                      return (
                        <tr key={member.id} className="hover:bg-[#132218]/50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={member.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.full_name)}&background=106828&color=ffffff`}
                                alt={member.full_name}
                                className="w-9 h-9 rounded-xl object-cover border border-[#233d2a]"
                              />
                              <div>
                                <div className="font-bold text-white">{member.full_name}</div>
                                <div className="text-[11px] text-slate-400">{member.email}</div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold border uppercase tracking-wider ${rClass}`}>
                              {member.role.replace('_', ' ')}
                            </span>
                            {(member.custom_permissions || []).length > 0 && (
                              <span className="block text-[10px] text-emerald-400 font-mono mt-0.5">
                                +{member.custom_permissions?.length} overrides
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-3 text-slate-300 font-mono text-[11px]">
                            {member.phone || '—'}
                          </td>

                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(member)}
                              className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out cursor-pointer ${
                                member.is_active ? 'bg-[#106828]' : 'bg-slate-800'
                              }`}
                              title={member.is_active ? 'Click to suspend' : 'Click to activate'}
                            >
                              <span
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                  member.is_active ? 'translate-x-4' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </td>

                          <td className="py-3 px-3 text-center font-mono text-slate-200">
                            {member.leads_assigned || 0}
                          </td>

                          <td className="py-3 px-3 text-center font-mono font-bold text-emerald-400">
                            {member.won_deals || 0}
                          </td>

                          <td className="py-3 px-3 text-center font-mono font-bold text-amber-400">
                            {member.conversion_rate || 0}%
                          </td>

                          <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">
                            ₹{(member.revenue || 0).toLocaleString()}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setUserToEdit(member);
                                  setIsUserModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                                title="Edit profile"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setUserForPasswordReset(member);
                                  setIsResetPasswordOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                                title="Reset password"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setUserForPermissions(member);
                                  setIsPermissionsModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-[#FEC426] hover:bg-[#FEC426]/10 transition-colors"
                                title="Inspect & override permissions"
                              >
                                <Shield className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(member)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                title="Delete or suspend member"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: ROLES & PERMISSIONS MATRIX                                     */}
      {/* ========================================================================= */}
      {activeSubTab === 'roles' && (
        <RolesPermissionsMatrix
          roles={roles}
          catalog={catalog}
          initialPermissions={permissionsMatrix}
          onRefresh={() => {
            fetchPermissionsData();
            fetchTeam();
          }}
          canManagePermissions={canManagePermissions}
        />
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: AUDIT & SECURITY TRAIL                                         */}
      {/* ========================================================================= */}
      {activeSubTab === 'audit' && (
        <div className="space-y-4">
          <div className="p-5 rounded-3xl bg-[#0d1711] border border-[#1e3423] flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
                <History className="w-5 h-5 text-[#FEC426]" />
                <span>Security & Team Activity Audit Trail</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Timestamped log of user creations, password resets, role privileges updates, and account status toggles.
              </p>
            </div>
            <button
              onClick={fetchAuditLogs}
              className="px-3.5 py-1.5 rounded-xl bg-[#132218] border border-[#233d2a] text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              Refresh Logs
            </button>
          </div>

          <div className="rounded-3xl bg-[#0d1711] border border-[#1e3423] overflow-hidden">
            {loadingAudit ? (
              <div className="p-8 text-center text-xs text-slate-500">Loading audit history...</div>
            ) : auditLogs.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">No audit events recorded yet.</div>
            ) : (
              <div className="divide-y divide-[#16271a] max-h-[600px] overflow-y-auto">
                {auditLogs.map((log: any) => (
                  <div key={log.id} className="p-4 hover:bg-[#101c13]/50 transition-colors flex items-center justify-between gap-4 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white capitalize">{log.action.replace('_', ' ')}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#132218] text-[#FEC426] border border-[#203625]">
                          {log.entity} #{log.entity_id}
                        </span>
                        {log.user_name && (
                          <span className="text-[11px] text-slate-400">
                            by <strong className="text-slate-200">{log.user_name}</strong>
                          </span>
                        )}
                      </div>
                      {log.details && (
                        <div className="text-[11px] text-slate-400 font-mono bg-[#070e09] px-2.5 py-1 rounded-lg border border-[#142318] inline-block">
                          {JSON.stringify(log.details)}
                        </div>
                      )}
                    </div>

                    <div className="text-right text-[11px] text-slate-500 whitespace-nowrap font-mono">
                      {formatISTDateTime(log.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS                                                                    */}
      {/* ========================================================================= */}
      {/* Add / Edit User Modal */}
      <UserModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        onSuccess={() => {
          showToast(userToEdit ? 'Member updated successfully!' : 'New member added successfully!');
          fetchTeam();
        }}
        userToEdit={userToEdit}
        availableRoles={roles}
      />

      {/* Reset Password Modal */}
      <ResetPasswordModal
        isOpen={isResetPasswordOpen}
        onClose={() => setIsResetPasswordOpen(false)}
        onSuccess={() => {
          showToast('Password reset successfully!');
        }}
        user={userForPasswordReset}
      />

      {/* User Specific Permissions Modal */}
      <UserPermissionsModal
        isOpen={isPermissionsModalOpen}
        onClose={() => setIsPermissionsModalOpen(false)}
        onSuccess={() => {
          showToast('User permission overrides saved!');
          fetchTeam();
        }}
        user={userForPermissions}
        catalog={catalog}
        permissionsMatrix={permissionsMatrix}
      />
    </div>
  );
};
