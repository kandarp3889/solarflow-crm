from typing import Optional, List, Any, Dict
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field

# -------------------------------------------------------------
# Auth & User Schemas
# -------------------------------------------------------------
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None
    company_id: Optional[int] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: Optional[str] = None
    role: str = "sales_rep"
    is_active: Optional[bool] = True
    custom_permissions: Optional[List[str]] = None

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    custom_permissions: Optional[List[str]] = None

class PasswordResetRequest(BaseModel):
    new_password: str = Field(..., min_length=6)

class CustomRoleCreate(BaseModel):
    id: str = Field(..., min_length=2, max_length=50)
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None
    badge_color: Optional[str] = None
    permissions: Optional[List[str]] = []

class CustomRoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    badge_color: Optional[str] = None

class RolePermissionsUpdate(BaseModel):
    permissions: Dict[str, List[str]]

class UserResponse(BaseModel):
    id: int
    company_id: Optional[int] = None
    email: str
    full_name: str
    phone: Optional[str] = None
    role: str
    avatar_url: Optional[str] = None
    is_active: bool
    custom_permissions: Optional[List[str]] = None
    permissions: Optional[List[str]] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class CompanyResponse(BaseModel):
    id: int
    name: str
    slug: str
    logo_url: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    website: Optional[str] = None
    gstin: Optional[str] = None
    solar_settings: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True

# -------------------------------------------------------------
# Lead Schemas
# -------------------------------------------------------------
class LeadNoteCreate(BaseModel):
    content: str

class LeadNoteResponse(BaseModel):
    id: int
    lead_id: int
    user_id: int
    user_name: Optional[str] = None
    content: str
    created_at: datetime

    class Config:
        from_attributes = True

class LeadActivityResponse(BaseModel):
    id: int
    lead_id: int
    activity_type: str
    title: str
    description: Optional[str] = None
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class LeadBase(BaseModel):
    full_name: str
    phone: str
    whatsapp: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None

    property_type: Optional[str] = "Residential"
    monthly_bill: Optional[float] = 0.0
    consumption_kwh: Optional[float] = 0.0
    recommended_kw: Optional[float] = 0.0
    interested_kw: Optional[float] = 0.0
    roof_area_sqft: Optional[float] = 0.0
    electricity_provider: Optional[str] = None
    existing_solar: Optional[bool] = False
    battery_required: Optional[bool] = False
    battery_capacity_kwh: Optional[float] = 0.0
    ev_requirement: Optional[bool] = False

    lead_source: Optional[str] = "Website"
    assigned_to_id: Optional[int] = None
    stage: Optional[str] = "new_lead"
    win_probability_pct: Optional[int] = 20
    expected_closing_date: Optional[datetime] = None
    next_follow_up_date: Optional[datetime] = None

class LeadCreate(LeadBase):
    pass

class LeadUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None

    property_type: Optional[str] = None
    monthly_bill: Optional[float] = None
    consumption_kwh: Optional[float] = None
    recommended_kw: Optional[float] = None
    interested_kw: Optional[float] = None
    roof_area_sqft: Optional[float] = None
    electricity_provider: Optional[str] = None
    existing_solar: Optional[bool] = None
    battery_required: Optional[bool] = None
    battery_capacity_kwh: Optional[float] = None
    ev_requirement: Optional[bool] = None

    lead_source: Optional[str] = None
    assigned_to_id: Optional[int] = None
    stage: Optional[str] = None
    win_probability_pct: Optional[int] = None
    expected_closing_date: Optional[datetime] = None
    lost_reason: Optional[str] = None
    next_follow_up_date: Optional[datetime] = None

class LeadResponse(LeadBase):
    id: int
    company_id: int
    lead_id: str
    lost_reason: Optional[str] = None
    next_follow_up_date: Optional[datetime] = None
    assigned_to_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class LeadDetailResponse(LeadResponse):
    activities: List[LeadActivityResponse] = []
    notes: List[LeadNoteResponse] = []

class BulkAssignRequest(BaseModel):
    lead_ids: List[int]
    assigned_to_id: int

class BulkStatusRequest(BaseModel):
    lead_ids: List[int]
    stage: str

# -------------------------------------------------------------
# Follow-Up Schemas
# -------------------------------------------------------------
class FollowUpBase(BaseModel):
    lead_id: int
    assigned_to_id: Optional[int] = None
    scheduled_date: datetime
    follow_up_type: str = "call"
    notes: Optional[str] = None
    reminder: bool = True

class FollowUpCreate(FollowUpBase):
    pass

class FollowUpUpdate(BaseModel):
    scheduled_date: Optional[datetime] = None
    follow_up_type: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    reminder: Optional[bool] = None

class FollowUpResponse(FollowUpBase):
    id: int
    company_id: int
    status: str
    completed_at: Optional[datetime] = None
    lead_name: Optional[str] = None
    lead_phone: Optional[str] = None
    assigned_to_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# -------------------------------------------------------------
# Survey Schemas
# -------------------------------------------------------------
class SurveyBase(BaseModel):
    lead_id: int
    assigned_engineer_id: Optional[int] = None
    scheduled_date: Optional[datetime] = None
    status: str = "requested"
    roof_type: str = "Concrete Flat"
    roof_area: float = 0.0
    available_roof_area: float = 0.0
    roof_direction: str = "South"
    roof_shading: str = "None"
    electricity_connection_type: str = "Single Phase"
    phase: str = "Single Phase"
    sanctioned_load_kw: float = 5.0
    meter_number: Optional[str] = None
    existing_inverter: Optional[str] = None
    existing_solar: bool = False
    recommended_system_size: float = 5.0
    engineer_notes: Optional[str] = None
    files: List[Dict[str, Any]] = []

class SurveyCreate(SurveyBase):
    pass

class SurveyUpdate(BaseModel):
    assigned_engineer_id: Optional[int] = None
    scheduled_date: Optional[datetime] = None
    status: Optional[str] = None
    roof_type: Optional[str] = None
    roof_area: Optional[float] = None
    available_roof_area: Optional[float] = None
    roof_direction: Optional[str] = None
    roof_shading: Optional[str] = None
    electricity_connection_type: Optional[str] = None
    phase: Optional[str] = None
    sanctioned_load_kw: Optional[float] = None
    meter_number: Optional[str] = None
    existing_inverter: Optional[str] = None
    existing_solar: Optional[bool] = None
    recommended_system_size: Optional[float] = None
    engineer_notes: Optional[str] = None
    files: Optional[List[Dict[str, Any]]] = None

class SurveyResponse(SurveyBase):
    id: int
    company_id: int
    survey_code: str
    completed_date: Optional[datetime] = None
    lead_name: Optional[str] = None
    lead_phone: Optional[str] = None
    lead_address: Optional[str] = None
    assigned_engineer_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# -------------------------------------------------------------
# Solar Quotation Schemas
# -------------------------------------------------------------
class QuotationCalculateRequest(BaseModel):
    system_size_kw: float
    panel_cost_per_watt: Optional[float] = 28.0
    panel_wattage: Optional[int] = 550
    inverter_cost: Optional[float] = 45000.0
    battery_cost: Optional[float] = 0.0
    structure_cost: Optional[float] = 20000.0
    installation_cost: Optional[float] = 25000.0
    other_costs: Optional[float] = 5000.0
    discount: Optional[float] = 5000.0
    gst_rate: Optional[float] = 13.8 # %
    apply_subsidy: Optional[bool] = True

class QuotationCalculateResponse(BaseModel):
    system_size_kw: float
    panel_quantity: int
    system_price: float
    installation_cost: float
    other_costs: float
    discount: float
    subtotal: float
    gst_rate: float
    gst_amount: float
    subsidy_amount: float
    final_price: float
    monthly_generation_kwh: float
    monthly_savings: float
    payback_years: float

class QuotationBase(BaseModel):
    lead_id: int
    system_size_kw: float = 5.0
    panel_brand: str = "Tata Power Solar"
    panel_wattage: int = 550
    panel_quantity: int = 10
    inverter_brand: str = "Sungrow"
    inverter_capacity: str = "5 kW On-Grid"
    battery_backup: str = "None"
    structure_type: str = "Elevated Galvanized Iron"

    system_price: float = 240000.0
    installation_cost: float = 25000.0
    other_costs: float = 10000.0
    discount: float = 5000.0
    subtotal: float = 270000.0
    gst_rate: float = 13.8
    gst_amount: float = 37260.0
    subsidy_amount: float = 78000.0
    final_price: float = 229260.0

    monthly_generation_kwh: float = 600.0
    monthly_savings: float = 4800.0
    payback_years: float = 3.9

    valid_until: Optional[datetime] = None
    notes: Optional[str] = None
    status: str = "draft"

class QuotationCreate(QuotationBase):
    pass

class QuotationUpdate(BaseModel):
    system_size_kw: Optional[float] = None
    panel_brand: Optional[str] = None
    panel_wattage: Optional[int] = None
    panel_quantity: Optional[int] = None
    inverter_brand: Optional[str] = None
    inverter_capacity: Optional[str] = None
    battery_backup: Optional[str] = None
    structure_type: Optional[str] = None
    system_price: Optional[float] = None
    installation_cost: Optional[float] = None
    other_costs: Optional[float] = None
    discount: Optional[float] = None
    subtotal: Optional[float] = None
    gst_rate: Optional[float] = None
    gst_amount: Optional[float] = None
    subsidy_amount: Optional[float] = None
    final_price: Optional[float] = None
    monthly_generation_kwh: Optional[float] = None
    monthly_savings: Optional[float] = None
    payback_years: Optional[float] = None
    valid_until: Optional[datetime] = None
    notes: Optional[str] = None
    status: Optional[str] = None

class QuotationResponse(QuotationBase):
    id: int
    company_id: int
    quotation_number: str
    lead_name: Optional[str] = None
    lead_phone: Optional[str] = None
    lead_email: Optional[str] = None
    lead_address: Optional[str] = None
    created_by_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# -------------------------------------------------------------
# Dashboard & Analytics Schemas
# -------------------------------------------------------------
class KpiCard(BaseModel):
    label: str
    value: str
    numeric_value: float
    change_pct: float
    is_positive: bool
    description: Optional[str] = None

class DashboardStatsResponse(BaseModel):
    total_leads: KpiCard
    new_leads: KpiCard
    qualified_leads: KpiCard
    site_surveys: KpiCard
    quotations_sent: KpiCard
    won_deals: KpiCard
    lost_deals: KpiCard
    total_pipeline_value: KpiCard
    expected_revenue: KpiCard

class LeadTrendItem(BaseModel):
    date: str
    leads_received: int
    qualified_leads: int
    won_leads: int

class LeadSourceItem(BaseModel):
    source: str
    count: int
    percentage: float
    revenue: float

class FunnelStageItem(BaseModel):
    stage: str
    label: str
    count: int
    value: float
    conversion_rate: float

class RevenueBreakdownItem(BaseModel):
    month: str
    quotation_value: float
    won_revenue: float
    expected_revenue: float

class TeamPerformanceItem(BaseModel):
    salesperson_id: int
    name: str
    avatar_url: Optional[str] = None
    leads_assigned: int
    qualified: int
    quotations: int
    won: int
    revenue: float
    conversion_rate: float

# -------------------------------------------------------------
# Lead Source Schemas
# -------------------------------------------------------------
class SourceAnalyticsItem(BaseModel):
    id: int
    name: str
    leads: int
    qualified: int
    quotations: int
    won_deals: int
    revenue: float
    conversion_rate: float
    cost_per_lead: float
    total_spend: float
    cac: float

# -------------------------------------------------------------
# AI Schemas
# -------------------------------------------------------------
class AIQualifyRequest(BaseModel):
    lead_id: int

class AIQualifyResponse(BaseModel):
    score: int
    category: str
    reasons: List[str]
    suggested_system_size_kw: float
    recommended_action: str
    key_selling_points: List[str]

class AIWhatsAppRequest(BaseModel):
    lead_id: int
    purpose: str = "initial_pitch" # initial_pitch, survey_confirmation, quotation_followup, deal_closing

class AIWhatsAppResponse(BaseModel):
    message: str
    language: str = "en"
    placeholders: Dict[str, str] = {}

class AISummarizeRequest(BaseModel):
    lead_id: int

class AISummarizeResponse(BaseModel):
    summary: str
    next_best_step: str
    urgency: str

# -------------------------------------------------------------
# Notification Schema
# -------------------------------------------------------------
class NotificationResponse(BaseModel):
    id: int
    title: str
    message: str
    category: str
    link_url: Optional[str] = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

# -------------------------------------------------------------
# Automation Rule Schemas
# -------------------------------------------------------------
class AutomationRuleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    trigger_event: str
    conditions: Optional[Dict[str, Any]] = {}
    actions: List[Dict[str, Any]]

class AutomationRuleResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    trigger_event: str
    conditions: Dict[str, Any]
    actions: List[Dict[str, Any]]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# -------------------------------------------------------------
# Audit Log Schema
# -------------------------------------------------------------
class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    action: str
    entity: str
    entity_id: Optional[str] = None
    ip_address: Optional[str] = None
    details: Dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True
