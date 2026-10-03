import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { QuickActionsModal } from './components/layout/QuickActionsModal';
import { AddLeadModal } from './components/leads/AddLeadModal';
import { AIAssistantDrawer } from './components/ai/AIAssistantDrawer';
import { LoginPage } from './components/auth/LoginPage';
import { ShieldAlert, ArrowLeft, Shield } from 'lucide-react';
import { UserRole } from './types';

// Pages
import { DashboardPage } from './components/dashboard/DashboardPage';
import { LeadsPage } from './components/leads/LeadsPage';
import { LeadDetailPage } from './components/leads/LeadDetailPage';
import { KanbanBoard } from './components/pipeline/KanbanBoard';
import { FollowUpList } from './components/followups/FollowUpList';
import { CalendarView } from './components/calendar/CalendarView';
import { SurveyList } from './components/surveys/SurveyList';
import { QuotationList } from './components/quotations/QuotationList';
import { SystemsPage } from './components/systems/SystemsPage';
import { SourceAnalytics } from './components/sources/SourceAnalytics';
import { TeamManagement } from './components/team/TeamManagement';
import { AutomationWorkflow } from './components/automation/AutomationWorkflow';
import { ReportsPage } from './components/reports/ReportsPage';
import { SettingsPage } from './components/settings/SettingsPage';
import { EmailSettingsPage } from './components/settings/EmailSettingsPage';

// Define RBAC allowed roles per module
const TAB_ROLES: Record<string, UserRole[]> = {
  dashboard: ['super_admin', 'company_admin', 'sales_manager', 'sales_rep'],
  leads: ['super_admin', 'company_admin', 'sales_manager', 'sales_rep', 'survey_engineer'],
  pipeline: ['super_admin', 'company_admin', 'sales_manager', 'sales_rep'],
  followups: ['super_admin', 'company_admin', 'sales_manager', 'sales_rep', 'survey_engineer'],
  calendar: ['super_admin', 'company_admin', 'sales_manager', 'sales_rep', 'survey_engineer'],
  surveys: ['super_admin', 'company_admin', 'sales_manager', 'sales_rep', 'survey_engineer'],
  quotations: ['super_admin', 'company_admin', 'sales_manager', 'sales_rep'],
  systems: ['super_admin', 'company_admin', 'sales_manager', 'sales_rep'],
  sources: ['super_admin', 'company_admin', 'sales_manager'],
  team: ['super_admin', 'company_admin', 'sales_manager'],
  automation: ['super_admin', 'company_admin'],
  reports: ['super_admin', 'company_admin', 'sales_manager'],
  'email-settings': ['super_admin', 'company_admin'],
  settings: ['super_admin', 'company_admin'],
};

const SolarCRMApp: React.FC = () => {
  const { user, isLoading, hasRole } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);

  // Quick Action Modal State
  const [quickActionType, setQuickActionType] = useState<'lead' | 'followup' | 'survey' | 'quotation' | null>(null);

  // AI Assistant Drawer State
  const [isAIDrawerOpen, setIsAIDrawerOpen] = useState(false);
  const [aiLeadId, setAiLeadId] = useState<number>(1);

  // Global search input
  const [globalSearch, setGlobalSearch] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#070e09] text-slate-400">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-[#FEC426] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold tracking-wide">Connecting to True Sun Energy CRM...</p>
        </div>
      </div>
    );
  }

  // If user is not logged in, render the dedicated LoginPage
  if (!user) {
    return <LoginPage />;
  }

  const handleSelectLead = (id: number) => {
    setSelectedLeadId(id);
    setCurrentTab('leads');
  };

  const handleOpenAIForLead = (id: number) => {
    setAiLeadId(id);
    setIsAIDrawerOpen(true);
  };

  const handleQuickActionSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
    window.dispatchEvent(new CustomEvent('crm-data-updated'));
  };

  // Check RBAC permission for currentTab
  const allowedRoles = TAB_ROLES[currentTab] || ['super_admin', 'company_admin'];
  const isTabPermitted = user.role === 'super_admin' || allowedRoles.includes(user.role);

  return (
    <div className="min-h-screen bg-[#0a110c] text-slate-100 flex">
      {/* Sidebar */}
      <Sidebar
        currentTab={selectedLeadId ? 'leads' : currentTab}
        setCurrentTab={(tab) => {
          setSelectedLeadId(null);
          setCurrentTab(tab);
        }}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <Header
          setIsMobileOpen={setIsMobileOpen}
          onOpenQuickAction={(action) => setQuickActionType(action)}
          onToggleAIDrawer={() => setIsAIDrawerOpen(!isAIDrawerOpen)}
          globalSearch={globalSearch}
          setGlobalSearch={(q) => {
            setGlobalSearch(q);
            if (q && currentTab !== 'leads') {
              setCurrentTab('leads');
            }
          }}
        />

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-x-hidden">
          {/* Detailed Lead View */}
          {selectedLeadId ? (
            <LeadDetailPage
              leadId={selectedLeadId}
              onBack={() => setSelectedLeadId(null)}
              onOpenQuickAction={(action) => setQuickActionType(action)}
              onOpenAIForLead={handleOpenAIForLead}
            />
          ) : !isTabPermitted ? (
            /* RBAC Access Restricted Banner */
            <div className="p-8 rounded-3xl bg-[#0d1711] border border-red-500/30 text-center max-w-xl mx-auto my-12 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/30 flex items-center justify-center mx-auto">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Access Restricted (RBAC)</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Your current role (<strong className="text-white capitalize">{user.role.replace('_', ' ')}</strong>) 
                  does not have permission to view the <strong className="text-[#FEC426]">{currentTab}</strong> module.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-[#132218] border border-[#233d2a] text-xs text-slate-300 text-left">
                <div className="font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-[#FEC426]" /> Authorized Roles for this module:
                </div>
                <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-slate-400">
                  {allowedRoles.map(r => (
                    <li key={r} className="capitalize">{r.replace('_', ' ')}</li>
                  ))}
                </ul>
              </div>
              <button
                onClick={() => setCurrentTab(user.role === 'survey_engineer' ? 'surveys' : 'dashboard')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#106828] hover:bg-[#15803d] text-white text-xs font-bold transition-all cursor-pointer shadow-md shadow-[#106828]/30"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Go to Accessible Module</span>
              </button>
            </div>
          ) : (
            /* Tab Views */
            <>
              {currentTab === 'dashboard' && (
                <DashboardPage
                  onSelectLead={handleSelectLead}
                  onOpenQuickAction={(action) => setQuickActionType(action)}
                />
              )}

              {currentTab === 'leads' && (
                <LeadsPage
                  onSelectLead={handleSelectLead}
                  onOpenQuickAction={(action) => setQuickActionType(action)}
                  onOpenAIForLead={handleOpenAIForLead}
                  refreshTrigger={refreshTrigger}
                />
              )}

              {currentTab === 'pipeline' && (
                <KanbanBoard
                  onSelectLead={handleSelectLead}
                  onOpenQuickAction={(action) => setQuickActionType(action)}
                  onOpenAIForLead={handleOpenAIForLead}
                />
              )}

              {currentTab === 'followups' && (
                <FollowUpList
                  onSelectLead={handleSelectLead}
                  onOpenQuickAction={(action) => setQuickActionType(action)}
                />
              )}

              {currentTab === 'calendar' && (
                <CalendarView
                  onSelectLead={handleSelectLead}
                  onOpenQuickAction={(action) => setQuickActionType(action)}
                />
              )}

              {currentTab === 'surveys' && (
                <SurveyList
                  onSelectLead={handleSelectLead}
                  onOpenQuickAction={(action) => setQuickActionType(action)}
                />
              )}

              {currentTab === 'quotations' && (
                <QuotationList
                  onSelectLead={handleSelectLead}
                  onOpenQuickAction={(action) => setQuickActionType(action)}
                  onNavigateToSystems={() => setCurrentTab('systems')}
                />
              )}

              {currentTab === 'systems' && (
                <SystemsPage
                  onNavigateToQuotations={() => setCurrentTab('quotations')}
                />
              )}

              {currentTab === 'sources' && <SourceAnalytics />}

              {currentTab === 'team' && <TeamManagement />}

              {currentTab === 'automation' && <AutomationWorkflow />}

              {currentTab === 'reports' && <ReportsPage />}

              {currentTab === 'email-settings' && <EmailSettingsPage />}

              {currentTab === 'settings' && <SettingsPage />}
            </>
          )}
        </main>
      </div>

      {/* Add New Lead Modal (exact form matching screenshot) */}
      <AddLeadModal
        isOpen={quickActionType === 'lead'}
        onClose={() => setQuickActionType(null)}
        onSuccess={handleQuickActionSuccess}
      />

      {/* Quick Actions Modal for followup, survey, quotation */}
      <QuickActionsModal
        isOpen={quickActionType !== null && quickActionType !== 'lead'}
        actionType={quickActionType}
        onClose={() => setQuickActionType(null)}
        onSuccess={handleQuickActionSuccess}
      />

      {/* AI Assistant Drawer */}
      <AIAssistantDrawer
        isOpen={isAIDrawerOpen}
        onClose={() => setIsAIDrawerOpen(false)}
        selectedLeadId={aiLeadId}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <SolarCRMApp />
    </AuthProvider>
  );
}
