import React from 'react';
import {
  LayoutDashboard,
  Users,
  Kanban,
  PhoneCall,
  Calendar,
  ClipboardCheck,
  FileSpreadsheet,
  Receipt,
  PieChart,
  UserCheck,
  Zap,
  BarChart3,
  Settings,
  Mail,
  ChevronRight,
  LogOut
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  isMobileOpen,
  setIsMobileOpen
}) => {
  const { user, company, logout } = useAuth();

  // Role-Based Navigation Configuration
  const allNavItems: { id: string; label: string; icon: any; roles: UserRole[] }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['super_admin', 'company_admin', 'sales_manager', 'sales_rep'] },
    { id: 'leads', label: 'Leads CRM', icon: Users, roles: ['super_admin', 'company_admin', 'sales_manager', 'sales_rep', 'survey_engineer'] },
    { id: 'pipeline', label: 'Sales Pipeline', icon: Kanban, roles: ['super_admin', 'company_admin', 'sales_manager', 'sales_rep'] },
    { id: 'followups', label: 'Follow-ups', icon: PhoneCall, roles: ['super_admin', 'company_admin', 'sales_manager', 'sales_rep', 'survey_engineer'] },
    { id: 'calendar', label: 'Calendar', icon: Calendar, roles: ['super_admin', 'company_admin', 'sales_manager', 'sales_rep', 'survey_engineer'] },
    { id: 'surveys', label: 'Site Surveys', icon: ClipboardCheck, roles: ['super_admin', 'company_admin', 'sales_manager', 'sales_rep', 'survey_engineer'] },
    { id: 'quotations', label: 'Quotations', icon: FileSpreadsheet, roles: ['super_admin', 'company_admin', 'sales_manager', 'sales_rep'] },
    { id: 'invoices', label: 'Invoices', icon: Receipt, roles: ['super_admin', 'company_admin', 'sales_manager', 'sales_rep'] },
    { id: 'sources', label: 'Lead Sources', icon: PieChart, roles: ['super_admin', 'company_admin', 'sales_manager'] },
    { id: 'team', label: 'Sales Team', icon: UserCheck, roles: ['super_admin', 'company_admin', 'sales_manager'] },
    { id: 'automation', label: 'Automation', icon: Zap, roles: ['super_admin', 'company_admin'] },
    { id: 'reports', label: 'Reports & Export', icon: BarChart3, roles: ['super_admin', 'company_admin', 'sales_manager'] },
    { id: 'email-settings', label: 'Email Configuration', icon: Mail, roles: ['super_admin', 'company_admin'] },
    { id: 'settings', label: 'Company Settings', icon: Settings, roles: ['super_admin', 'company_admin'] },
  ];

  // Filter accessible tabs strictly based on authenticated user's role
  const visibleNavItems = allNavItems.filter(item =>
    user?.role === 'super_admin' || (user?.role && item.roles.includes(user.role as UserRole))
  );

  const handleNavClick = (id: string) => {
    setCurrentTab(id);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col w-64 bg-[#0d1711] border-r border-[#1e3423] transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header with True Sun Energy Logo */}
        <div className="flex flex-col gap-2 px-5 py-4 border-b border-[#1e3423] bg-[#0a120c]">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-[#106828] to-[#1e8237] p-1 shadow-md shadow-[#106828]/30 border border-[#FEC426]/30">
              <img
                src="/truesun-icon.png"
                alt="True Sun Logo Icon"
                className="w-8 h-8 object-contain rounded-lg"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-extrabold text-white tracking-tight truncate font-display">
                {company?.name || 'True Sun Energy'}
              </h1>
              <p className="text-[11px] text-[#FEC426] font-medium tracking-wide flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse"></span>
                Complete Solar Solutions
              </p>
            </div>
          </div>
          {/* True Sun White Logo Banner */}
          <div className="mt-1 px-1 py-1 rounded-lg bg-black/20 flex items-center justify-center">
            <img
              src="/truesun-logo-white.png"
              alt="TrueSun Energy"
              className="h-6 w-auto object-contain opacity-90 hover:opacity-100 transition-opacity"
            />
          </div>
        </div>

        {/* Role-Filtered Navigation Strictly Based on Authentication */}
        <div className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
          <div className="px-2 pb-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Menu Navigation
          </div>
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                  isActive
                    ? 'bg-[#106828]/25 text-[#FEC426] border border-[#FEC426]/30 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-[#142319]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-[#FEC426]' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-[#FEC426]" />}
              </button>
            );
          })}
        </div>

        {/* User Info & Footer */}
        <div className="p-3 border-t border-[#1e3423] bg-[#09120b]">
          <div className="flex items-center justify-between p-2 rounded-lg bg-[#132218]/70 border border-[#1e3423]/50">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={user?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                alt={user?.full_name || 'User'}
                className="w-8 h-8 rounded-full object-cover border border-[#106828]"
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-200 truncate">{user?.full_name}</p>
                <p className="text-[10px] text-[#FEC426] capitalize truncate">
                  {user?.role.replace('_', ' ')}
                </p>
              </div>
            </div>
            <button
              onClick={logout}
              title="Sign Out to Login Page"
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
