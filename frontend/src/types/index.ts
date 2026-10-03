export type UserRole = 
  | 'super_admin' 
  | 'company_admin' 
  | 'sales_manager' 
  | 'sales_rep' 
  | 'survey_engineer'
  | string;

export interface PermissionItem {
  key: string;
  name: string;
  description: string;
}

export interface PermissionCategory {
  category: string;
  items: PermissionItem[];
}

export interface RoleMetadata {
  id: string;
  name: string;
  description: string;
  is_system: boolean;
  badge_color?: string;
}

export type RolePermissionsMatrix = Record<string, string[]>;

export interface RolePermissionsResponse {
  permissions: RolePermissionsMatrix;
  roles: RoleMetadata[];
  catalog: PermissionCategory[];
}

export interface CustomRoleCreatePayload {
  id: string;
  name: string;
  description?: string;
  badge_color?: string;
  permissions?: string[];
}

export interface User {
  id: number;
  company_id?: number;
  email: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  avatar_url?: string;
  is_active: boolean;
  custom_permissions?: string[];
  permissions?: string[];
  effective_permissions?: string[];
  effective_permissions_count?: number;
  created_at?: string;
  leads_assigned?: number;
  qualified_leads?: number;
  quotations_sent?: number;
  won_deals?: number;
  revenue?: number;
  conversion_rate?: number;
}

export interface Company {
  id: number;
  name: string;
  slug: string;
  logo_url?: string;
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
  gstin?: string;
  subscription_plan?: string;
  solar_settings?: {
    panel_brands?: string[];
    inverter_brands?: string[];
    base_cost_per_watt?: number;
    default_gst_rate?: number;
    subsidy_rules?: Record<string, number>;
    score_thresholds?: {
      hot: number;
      warm: number;
    };
  };
}

export type LeadStage = 
  | 'new_lead' 
  | 'contacted' 
  | 'qualified' 
  | 'survey_scheduled' 
  | 'survey_completed' 
  | 'quotation_sent' 
  | 'negotiation' 
  | 'won' 
  | 'lost'
  | string;

export interface PipelineStageConfig {
  id: string;
  stage_id: number;
  key: string;
  label: string;
  color: string;
  order_index: number;
  win_probability_pct: number;
  is_won: boolean;
  is_lost: boolean;
  count?: number;
  total_value?: number;
  leads?: Lead[];
}

export interface PipelineStageCreatePayload {
  label: string;
  key?: string;
  color?: string;
  win_probability_pct?: number;
  is_won?: boolean;
  is_lost?: boolean;
  order_index?: number;
}

export interface PipelineStageUpdatePayload {
  label?: string;
  key?: string;
  color?: string;
  win_probability_pct?: number;
  is_won?: boolean;
  is_lost?: boolean;
  order_index?: number;
}

export type ScoreCategory = 'hot' | 'warm' | 'cold';

export interface LeadActivity {
  id: number;
  lead_id: number;
  activity_type: string;
  title: string;
  description?: string;
  user_id?: number;
  user_name?: string;
  created_at: string;
}

export interface LeadNote {
  id: number;
  lead_id: number;
  user_id: number;
  user_name?: string;
  content: string;
  created_at: string;
}

export interface LoanDocument {
  id: number;
  company_id: number;
  loan_process_id: number;
  lead_id: number;
  stage_category: 'loan_file' | 'installation' | 'net_meter_file' | 'inspection' | 'subsidy' | 'installed_photo' | 'dcr_report' | string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type?: string;
  uploaded_by_id?: number;
  uploaded_by_name?: string;
  notes?: string;
  created_at: string;
}

export interface LoanPanelSerial {
  id: number;
  loan_process_id: number;
  lead_id: number;
  serial_number: string;
  order_index: number;
  created_at: string;
}

export interface LoanProcessSummary {
  id: number;
  loan_process_number?: string;
  loan_status: string;
  installation_status: string;
  net_meter_status: string;
  inspection_status: string;
  subsidy_status: string;
  overall_progress_pct: number;
  loan_files_count: number;
  installation_docs_count: number;
  net_meter_files_count: number;
  inspection_docs_count: number;
  subsidy_docs_count: number;
  installed_photos_count?: number;
  dcr_reports_count?: number;
  panel_serials_count?: number;
}

export interface LoanProcess {
  id: number;
  company_id: number;
  lead_id: number;
  lead_name?: string;
  lead_code?: string;
  lead_phone?: string;
  system_size_kw?: number;
  monthly_bill?: number;
  loan_process_number?: string;

  loan_status: string;
  loan_bank_name?: string;
  loan_amount?: number;
  loan_notes?: string;

  installation_status: string;
  installer_name?: string;
  installation_date?: string;
  installation_notes?: string;

  // Equipment & Installation Details
  inverter_serial_number?: string;
  panel_serial_numbers?: string[];
  panel_serials?: LoanPanelSerial[];

  net_meter_status: string;
  net_meter_application_number?: string;
  discom_name?: string;
  net_meter_notes?: string;

  inspection_status: string;
  inspector_name?: string;
  inspection_date?: string;
  inspection_notes?: string;

  subsidy_status: string;
  subsidy_application_number?: string;
  subsidy_amount?: number;
  subsidy_notes?: string;

  overall_progress_pct: number;
  documents: LoanDocument[];
  created_at: string;
  updated_at: string;
}

export interface LoanProcessUpdatePayload {
  loan_status?: string;
  loan_bank_name?: string;
  loan_amount?: number;
  loan_notes?: string;

  installation_status?: string;
  installer_name?: string;
  installation_date?: string;
  installation_notes?: string;

  // Equipment & Installation Details
  inverter_serial_number?: string;
  panel_serial_numbers?: string[];

  net_meter_status?: string;
  net_meter_application_number?: string;
  discom_name?: string;
  net_meter_notes?: string;

  inspection_status?: string;
  inspector_name?: string;
  inspection_date?: string;
  inspection_notes?: string;

  subsidy_status?: string;
  subsidy_application_number?: string;
  subsidy_amount?: number;
  subsidy_notes?: string;
}

export interface Lead {
  id: number;
  company_id: number;
  lead_id: string;
  full_name: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;

  property_type: string;
  monthly_bill: number;
  recommended_kw: number;
  system_size_kw?: number;

  lead_source: string;
  assigned_to_id?: number;
  assigned_to_name?: string;
  stage: LeadStage;
  win_probability_pct: number;
  next_follow_up_date?: string;

  created_at: string;
  updated_at: string;

  activities?: LeadActivity[];
  notes?: LeadNote[];
  loan_process?: LoanProcessSummary;
}

export type FollowUpType = 'call' | 'whatsapp' | 'email' | 'site_visit' | 'meeting';
export type FollowUpStatus = 'pending' | 'completed' | 'overdue' | 'cancelled';

export interface FollowUp {
  id: number;
  company_id: number;
  lead_id: number;
  assigned_to_id?: number;
  scheduled_date: string;
  follow_up_type: FollowUpType;
  status: FollowUpStatus;
  notes?: string;
  reminder: boolean;
  completed_at?: string;
  lead_name?: string;
  lead_phone?: string;
  assigned_to_name?: string;
  created_at: string;
}

export type SurveyStatus = 
  | 'requested' 
  | 'scheduled' 
  | 'assigned' 
  | 'in_progress' 
  | 'completed' 
  | 'cancelled';

export interface SurveyFile {
  name: string;
  type: string;
  size: string;
  url?: string;
  uploaded_at?: string;
}

export interface Survey {
  id: number;
  company_id: number;
  lead_id: number;
  survey_code: string;
  assigned_engineer_id?: number;
  assigned_engineer_name?: string;
  status: SurveyStatus;
  scheduled_date?: string;
  completed_date?: string;

  roof_type: string;
  roof_area: number;
  available_roof_area: number;
  roof_direction: string;
  roof_shading: string;
  electricity_connection_type: string;
  phase: string;
  sanctioned_load_kw: number;
  meter_number?: string;
  existing_inverter?: string;
  existing_solar: boolean;
  recommended_system_size: number;
  engineer_notes?: string;
  files: SurveyFile[];

  lead_name?: string;
  lead_phone?: string;
  lead_address?: string;
  created_at: string;
  updated_at: string;
}

export type QuotationStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired';

export interface Quotation {
  id: number;
  company_id: number;
  lead_id: number;
  quotation_number: string;
  status: QuotationStatus;

  system_size_kw: number;
  panel_brand: string;
  panel_wattage: number;
  panel_quantity: number;
  inverter_brand: string;
  inverter_capacity: string;
  battery_backup: string;
  structure_type: string;

  system_price: number;
  installation_cost: number;
  other_costs: number;
  discount: number;
  subtotal: number;
  gst_rate: number;
  gst_amount: number;
  subsidy_amount: number;
  final_price: number;

  monthly_generation_kwh: number;
  monthly_savings: number;
  payback_years: number;

  valid_until?: string;
  notes?: string;
  created_by_id?: number;
  created_by_name?: string;
  lead_name?: string;
  lead_phone?: string;
  lead_email?: string;
  lead_address?: string;
  created_at: string;
  updated_at: string;
}

export interface KpiCardData {
  label: string;
  value: string;
  numeric_value: number;
  change_pct: number;
  is_positive: boolean;
  description?: string;
}

export interface DashboardStats {
  total_leads: KpiCardData;
  new_leads: KpiCardData;
  site_surveys: KpiCardData;
  quotations_sent: KpiCardData;
  won_deals: KpiCardData;
  lost_deals: KpiCardData;
  total_pipeline_value: KpiCardData;
  expected_revenue: KpiCardData;
}

export interface LeadTrendItem {
  date: string;
  leads_received: number;
  qualified_leads: number;
  won_leads: number;
}

export interface LeadSourceItem {
  source: string;
  count: number;
  percentage: number;
  revenue: number;
}

export interface FunnelStageItem {
  stage: string;
  label: string;
  count: number;
  value: number;
  conversion_rate: number;
}

export interface RevenueBreakdownItem {
  month: string;
  quotation_value: number;
  won_revenue: number;
  expected_revenue: number;
}

export interface TeamPerformanceItem {
  salesperson_id: number;
  name: string;
  avatar_url?: string;
  leads_assigned: number;
  qualified: number;
  quotations: number;
  won: number;
  revenue: number;
  conversion_rate: number;
}

export interface LeadSourceAnalytics {
  id: number;
  name: string;
  leads: number;
  qualified: number;
  quotations: number;
  won_deals: number;
  revenue: number;
  conversion_rate: number;
  cost_per_lead: number;
  total_spend: number;
  cac: number;
}

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  category: string;
  link_url?: string;
  is_read: boolean;
  created_at: string;
}

export interface AutomationRule {
  id: number;
  name: string;
  description?: string;
  trigger_event: string;
  conditions: Record<string, any>;
  actions: Array<Record<string, any>>;
  is_active: boolean;
  created_at: string;
}
