const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';

class ApiClient {
  private getToken(): string | null {
    return localStorage.getItem('solar_token');
  }

  public setToken(token: string) {
    localStorage.setItem('solar_token', token);
  }

  public clearToken() {
    localStorage.removeItem('solar_token');
  }

  public async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    const token = this.getToken();

    const headers: Record<string, string> = {
      'Accept': 'application/json',
      ...(options.headers as Record<string, string> || {})
    };

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (response.status === 401) {
      // If token expired, clear and trigger custom event
      this.clearToken();
      window.dispatchEvent(new Event('auth:unauthorized'));
      throw new Error('Session expired. Please log in again.');
    }

    if (!response.ok) {
      let errorMsg = `Error ${response.status}: ${response.statusText}`;
      try {
        const data = await response.json();
        if (data.detail) {
          errorMsg = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
        }
      } catch (e) {
        // fallback to statusText
      }
      throw new Error(errorMsg);
    }

    // Handle CSV or text responses
    const contentType = response.headers.get('content-type');
    if (contentType && (contentType.includes('text/csv') || contentType.includes('text/plain'))) {
      return response.text() as unknown as T;
    }

    return response.json();
  }

  // Auth
  async login(formData: FormData) {
    return this.request('/auth/login', {
      method: 'POST',
      body: formData
    });
  }

  async getMe() {
    return this.request('/auth/me');
  }

  // Dashboard
  async getDashboardStats() {
    return this.request('/dashboard/stats');
  }

  async getLeadTrend(days: number = 30) {
    return this.request(`/dashboard/trend?days=${days}`);
  }

  async getLeadSources() {
    return this.request('/dashboard/lead-sources');
  }

  async getPipelineFunnel() {
    return this.request('/dashboard/funnel');
  }

  async getRevenueData() {
    return this.request('/dashboard/revenue');
  }

  async getTeamPerformance() {
    return this.request('/dashboard/team-performance');
  }

  // Leads
  async getLeads(params: Record<string, any> = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, String(val));
      }
    });
    return this.request(`/leads?${query.toString()}`);
  }

  async getLead(id: number) {
    return this.request(`/leads/${id}`);
  }

  async createLead(leadData: any) {
    return this.request('/leads', {
      method: 'POST',
      body: JSON.stringify(leadData)
    });
  }

  async updateLead(id: number, leadData: any) {
    return this.request(`/leads/${id}`, {
      method: 'PUT',
      body: JSON.stringify(leadData)
    });
  }

  async deleteLead(id: number) {
    return this.request(`/leads/${id}`, {
      method: 'DELETE'
    });
  }

  async addLeadNote(leadId: number, content: string) {
    return this.request(`/leads/${leadId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ content })
    });
  }

  async bulkAssignLeads(leadIds: number[], assignedToId: number) {
    return this.request('/leads/bulk-assign', {
      method: 'POST',
      body: JSON.stringify({ lead_ids: leadIds, assigned_to_id: assignedToId })
    });
  }

  async bulkUpdateStage(leadIds: number[], stage: string) {
    return this.request('/leads/bulk-status', {
      method: 'POST',
      body: JSON.stringify({ lead_ids: leadIds, stage })
    });
  }

  // Pipeline
  async getPipelineStages() {
    return this.request('/pipeline/stages');
  }

  async getPipelineStageConfig() {
    return this.request('/pipeline/stages/config');
  }

  async createPipelineStage(payload: { label: string; key?: string; color?: string; win_probability_pct?: number; is_won?: boolean; is_lost?: boolean; order_index?: number }) {
    return this.request('/pipeline/stages', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async updatePipelineStage(stageId: number, payload: { label?: string; key?: string; color?: string; win_probability_pct?: number; is_won?: boolean; is_lost?: boolean; order_index?: number }) {
    return this.request(`/pipeline/stages/${stageId}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  async deletePipelineStage(stageId: number, fallbackKey?: string) {
    const query = fallbackKey ? `?fallback_stage_key=${encodeURIComponent(fallbackKey)}` : '';
    return this.request(`/pipeline/stages/${stageId}${query}`, {
      method: 'DELETE'
    });
  }

  async reorderPipelineStages(stageIds: number[]) {
    return this.request('/pipeline/stages/reorder', {
      method: 'PUT',
      body: JSON.stringify({ stage_ids: stageIds })
    });
  }

  async resetPipelineStages() {
    return this.request('/pipeline/stages/reset', {
      method: 'POST'
    });
  }

  async movePipelineCard(leadId: number, newStage: string) {
    return this.request('/pipeline/move-card', {
      method: 'PATCH',
      body: JSON.stringify({ lead_id: leadId, new_stage: newStage })
    });
  }

  // Follow-ups
  async getFollowups(params: Record<string, any> = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, String(val));
      }
    });
    return this.request(`/followups?${query.toString()}`);
  }

  async createFollowup(data: any) {
    return this.request('/followups', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async completeFollowup(id: number) {
    return this.request(`/followups/${id}/complete`, {
      method: 'PATCH'
    });
  }

  async deleteFollowup(id: number) {
    return this.request(`/followups/${id}`, {
      method: 'DELETE'
    });
  }

  // Surveys
  async getSurveys(params: Record<string, any> = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, String(val));
      }
    });
    return this.request(`/surveys?${query.toString()}`);
  }

  async getSurvey(id: number) {
    return this.request(`/surveys/${id}`);
  }

  async createSurvey(data: any) {
    return this.request('/surveys', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateSurvey(id: number, data: any) {
    return this.request(`/surveys/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async uploadSurveyFile(surveyId: number, fileInfo: any) {
    return this.request(`/surveys/${surveyId}/files`, {
      method: 'POST',
      body: JSON.stringify(fileInfo)
    });
  }

  // Quotations
  async getQuotations(params: Record<string, any> = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, String(val));
      }
    });
    return this.request(`/quotations?${query.toString()}`);
  }

  async getQuotation(id: number) {
    return this.request(`/quotations/${id}`);
  }

  async calculateQuotation(data: any) {
    return this.request('/quotations/calculate', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async createQuotation(data: any) {
    return this.request('/quotations', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateQuotation(id: number, data: any) {
    return this.request(`/quotations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async sendQuotation(id: number, channel: 'email' | 'whatsapp' = 'email') {
    return this.request(`/quotations/${id}/send?channel=${channel}`, {
      method: 'POST'
    });
  }

  async deleteQuotation(id: number) {
    return this.request(`/quotations/${id}`, {
      method: 'DELETE'
    });
  }

  // Team & User Management
  async getTeam(params: Record<string, any> = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, String(val));
      }
    });
    const qStr = query.toString();
    return this.request(`/team${qStr ? '?' + qStr : ''}`);
  }

  async getTeamMember(id: number) {
    return this.request(`/team/${id}`);
  }

  async addTeamMember(data: any) {
    return this.request('/team', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateTeamMember(id: number, data: any) {
    return this.request(`/team/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async toggleTeamMemberStatus(id: number, isActive: boolean) {
    return this.request(`/team/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: isActive })
    });
  }

  async resetTeamMemberPassword(id: number, newPassword: string) {
    return this.request(`/team/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ new_password: newPassword })
    });
  }

  async deleteTeamMember(id: number) {
    return this.request(`/team/${id}`, {
      method: 'DELETE'
    });
  }

  // Roles & Permissions Matrix
  async getRolePermissions() {
    return this.request('/team/permissions');
  }

  async updateRolePermissions(permissions: Record<string, string[]>) {
    return this.request('/team/permissions', {
      method: 'PUT',
      body: JSON.stringify({ permissions })
    });
  }

  async resetRolePermissions(roleId?: string) {
    const q = roleId ? `?role_id=${encodeURIComponent(roleId)}` : '';
    return this.request(`/team/permissions/reset${q}`, {
      method: 'POST'
    });
  }

  async createCustomRole(data: { id: string; name: string; description?: string; badge_color?: string; permissions?: string[] }) {
    return this.request('/team/roles', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateCustomRole(id: string, data: { name?: string; description?: string; badge_color?: string }) {
    return this.request(`/team/roles/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteCustomRole(id: string) {
    return this.request(`/team/roles/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  }

  // Sources
  async getSources() {
    return this.request('/sources');
  }

  async createSource(data: any) {
    return this.request('/sources', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Reports
  async getReport(type: string) {
    return this.request(`/reports/${type}`);
  }

  // Automation
  async getAutomationRules() {
    return this.request('/automation/rules');
  }

  async createAutomationRule(data: any) {
    return this.request('/automation/rules', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async toggleAutomationRule(id: number) {
    return this.request(`/automation/rules/${id}/toggle`, {
      method: 'PATCH'
    });
  }

  // AI Assistant
  async qualifyLeadAI(leadId: number) {
    return this.request('/ai/qualify-lead', {
      method: 'POST',
      body: JSON.stringify({ lead_id: leadId })
    });
  }

  async generateWhatsAppAI(leadId: number, purpose: string = 'initial_pitch') {
    return this.request('/ai/generate-whatsapp', {
      method: 'POST',
      body: JSON.stringify({ lead_id: leadId, purpose })
    });
  }

  async summarizeProposalAI(leadId: number) {
    return this.request('/ai/summarize-proposal', {
      method: 'POST',
      body: JSON.stringify({ lead_id: leadId })
    });
  }

  // Settings
  async getCompanySettings() {
    return this.request('/settings/company');
  }

  async updateCompanySettings(data: any) {
    return this.request('/settings/company', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async updateSolarSettings(data: any) {
    return this.request('/settings/solar', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async getIntegrations() {
    return this.request('/settings/integrations');
  }

  // Email / SMTP Settings
  async getEmailSettings() {
    return this.request('/settings/email');
  }

  async updateEmailSettings(data: any) {
    return this.request('/settings/email', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async testEmailSettings(data: any) {
    return this.request('/settings/email/test', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Notifications
  async getNotifications() {
    return this.request('/notifications');
  }

  async markNotificationRead(id: number) {
    return this.request(`/notifications/${id}/read`, {
      method: 'PATCH'
    });
  }

  async markAllNotificationsRead() {
    return this.request('/notifications/read-all', {
      method: 'POST'
    });
  }

  // Audit Logs
  async getAuditLogs() {
    return this.request('/audit-logs');
  }
}

export const api = new ApiClient();
