import React, { useState, useEffect } from 'react';
import { X, UserCheck, Shield, Phone, Mail, Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { User, RoleMetadata } from '../../types';
import { api } from '../../services/api';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userToEdit?: User | null;
  availableRoles: RoleMetadata[];
}

export const UserModal: React.FC<UserModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  userToEdit,
  availableRoles
}) => {
  const isEditing = !!userToEdit;
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    role: 'sales_rep',
    password: '',
    is_active: true
  });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userToEdit) {
      setFormData({
        full_name: userToEdit.full_name || '',
        email: userToEdit.email || '',
        phone: userToEdit.phone || '',
        role: userToEdit.role || 'sales_rep',
        password: '',
        is_active: userToEdit.is_active !== undefined ? userToEdit.is_active : true
      });
    } else {
      setFormData({
        full_name: '',
        email: '',
        phone: '',
        role: availableRoles[2]?.id || 'sales_rep',
        password: 'SolarAdmin123!',
        is_active: true
      });
    }
    setError(null);
  }, [userToEdit, availableRoles, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (isEditing && userToEdit) {
        const updatePayload: any = {
          full_name: formData.full_name.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim(),
          role: formData.role,
          is_active: formData.is_active
        };
        if (formData.password.trim()) {
          updatePayload.password = formData.password.trim();
        }
        await api.updateTeamMember(userToEdit.id, updatePayload);
      } else {
        if (!formData.password.trim()) {
          throw new Error('Initial password is required for new users');
        }
        await api.addTeamMember({
          full_name: formData.full_name.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim(),
          role: formData.role,
          password: formData.password.trim(),
          is_active: formData.is_active
        });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save user account');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedRoleMeta = availableRoles.find((r) => r.id === formData.role);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#0d1711] border border-[#1e3423] rounded-3xl p-6 shadow-2xl relative space-y-5">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#1e3423] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#106828]/20 border border-[#106828]/40 flex items-center justify-center text-[#FEC426]">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-display">
                {isEditing ? `Edit User: ${userToEdit.full_name}` : 'Add New Solar Team Member'}
              </h3>
              <p className="text-xs text-slate-400">
                {isEditing ? 'Update profile, role, access permissions, and status' : 'Create a team member account with role-based platform access'}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="text-slate-300 font-semibold block mb-1.5 flex items-center gap-1.5">
              <span>Full Name</span>
              <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Ramesh Patel"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-[#132218] border border-[#233d2a] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#FEC426]/60 transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="text-slate-300 font-semibold block mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>Email Address</span>
                <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                required
                placeholder="user@truesunenergy.in"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[#132218] border border-[#233d2a] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#FEC426]/60 transition-colors"
              />
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>Phone Number</span>
              </label>
              <input
                type="text"
                placeholder="+91 99740 45095"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[#132218] border border-[#233d2a] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#FEC426]/60 transition-colors"
              />
            </div>
          </div>

          {/* Role Selection */}
          <div>
            <label className="text-slate-300 font-semibold block mb-1.5 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-[#FEC426]" />
              <span>System / Custom Role</span>
              <span className="text-red-400">*</span>
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-[#132218] border border-[#233d2a] rounded-xl text-white focus:outline-none focus:border-[#FEC426]/60 transition-colors"
            >
              {availableRoles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name} {role.is_system ? '(Standard)' : '(Custom Role)'}
                </option>
              ))}
            </select>
            {selectedRoleMeta && (
              <p className="text-[11px] text-slate-400 mt-1.5 italic bg-[#101c13] p-2 rounded-lg border border-[#1b3120]">
                {selectedRoleMeta.description}
              </p>
            )}
          </div>

          {/* Password (Optional on edit, required on create) */}
          <div>
            <label className="text-slate-300 font-semibold block mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>{isEditing ? 'New Password (leave blank to retain current)' : 'Account Password'}</span>
                {!isEditing && <span className="text-red-400">*</span>}
              </span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required={!isEditing}
                placeholder={isEditing ? '••••••••' : 'Min 6 characters'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3.5 py-2.5 pr-10 bg-[#132218] border border-[#233d2a] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#FEC426]/60 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Active Status Toggle */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-[#132218] border border-[#233d2a]">
            <div>
              <span className="font-semibold text-white block">Account Active Status</span>
              <span className="text-[11px] text-slate-400">
                {formData.is_active ? 'Active: User can log in and manage solar operations' : 'Suspended: Login access is disabled'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                formData.is_active ? 'bg-[#106828]' : 'bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  formData.is_active ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Modal Footer */}
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
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>{isEditing ? 'Update Member' : 'Create Account'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
