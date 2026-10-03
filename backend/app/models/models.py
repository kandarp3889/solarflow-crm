import enum
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Float, Boolean, DateTime,
    ForeignKey, Enum, JSON
)
from sqlalchemy.orm import relationship
from app.database import Base
from app.core.timezone import now_ist

class UserRole(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
    COMPANY_ADMIN = "company_admin"
    SALES_MANAGER = "sales_manager"
    SALES_REP = "sales_rep"
    SURVEY_ENGINEER = "survey_engineer"

class LeadStage(str, enum.Enum):
    NEW_LEAD = "new_lead"
    CONTACTED = "contacted"
    QUALIFIED = "qualified"
    SURVEY_SCHEDULED = "survey_scheduled"
    SURVEY_COMPLETED = "survey_completed"
    QUOTATION_SENT = "quotation_sent"
    NEGOTIATION = "negotiation"
    WON = "won"
    LOST = "lost"

class ScoreCategory(str, enum.Enum):
    HOT = "hot"
    WARM = "warm"
    COLD = "cold"

class FollowUpType(str, enum.Enum):
    CALL = "call"
    WHATSAPP = "whatsapp"
    EMAIL = "email"
    SITE_VISIT = "site_visit"
    MEETING = "meeting"

class FollowUpStatus(str, enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"

class SurveyStatus(str, enum.Enum):
    REQUESTED = "requested"
    SCHEDULED = "scheduled"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class QuotationStatus(str, enum.Enum):
    DRAFT = "draft"
    SENT = "sent"
    VIEWED = "viewed"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    EXPIRED = "expired"

DEFAULT_ROLE_PERMISSIONS = {
    "company_admin": [
        "leads:view", "leads:create", "leads:edit", "leads:delete", "leads:export", "leads:assign",
        "pipeline:view", "pipeline:move", "pipeline:close_deals", "pipeline:manage_stages",
        "loans:view", "loans:manage", "loans:upload_docs", "loans:delete_docs",
        "surveys:view", "surveys:create", "surveys:complete", "surveys:delete",
        "quotations:view", "quotations:create", "quotations:discount", "quotations:delete",
        "followups:view", "followups:manage",
        "reports:view", "reports:export",
        "ai:use",
        "automation:view", "automation:manage",
        "team:view", "team:manage_users", "team:manage_roles", "team:manage_permissions",
        "settings:view", "settings:edit"
    ],
    "sales_manager": [
        "leads:view", "leads:create", "leads:edit", "leads:export", "leads:assign",
        "pipeline:view", "pipeline:move", "pipeline:close_deals", "pipeline:manage_stages",
        "loans:view", "loans:manage", "loans:upload_docs",
        "surveys:view", "surveys:create",
        "quotations:view", "quotations:create", "quotations:discount",
        "followups:view", "followups:manage",
        "reports:view", "reports:export",
        "ai:use",
        "automation:view",
        "team:view"
    ],
    "sales_rep": [
        "leads:view", "leads:create", "leads:edit",
        "pipeline:view", "pipeline:move",
        "loans:view", "loans:manage", "loans:upload_docs",
        "quotations:view", "quotations:create",
        "followups:view", "followups:manage",
        "ai:use"
    ],
    "survey_engineer": [
        "surveys:view", "surveys:complete",
        "loans:view",
        "followups:view", "followups:manage"
    ]
}

# -------------------------------------------------------------
# MULTI-TENANT ROOT: Company
# -------------------------------------------------------------
class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, index=True, nullable=False)
    logo_url = Column(String(500), nullable=True)
    phone = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)
    address = Column(Text, nullable=True)
    website = Column(String(255), nullable=True)
    gstin = Column(String(50), nullable=True)
    subscription_plan = Column(String(50), default="enterprise")
    is_active = Column(Boolean, default=True)
    
    # Configurable solar hardware & pricing rules
    solar_settings = Column(JSON, default={
        "panel_brands": ["Tata Power Solar", "Waaree", "Adani Solar", "Vikram Solar", "Loom Solar"],
        "inverter_brands": ["Sungrow", "Growatt", "Enphase", "Fronius", "Solis"],
        "base_cost_per_watt": 48.0,
        "default_gst_rate": 13.8,  # Composite solar GST
        "subsidy_rules": {
            "1kw": 30000,
            "2kw": 60000,
            "3kw_plus": 78000
        },
        "score_thresholds": {
            "hot": 80,
            "warm": 50
        }
    })

    # Granular Role-Based Permissions configuration
    role_permissions = Column(JSON, default=DEFAULT_ROLE_PERMISSIONS)
    
    # Tenant-defined custom roles
    custom_roles = Column(JSON, default=list)
    
    created_at = Column(DateTime, default=now_ist)
    updated_at = Column(DateTime, default=now_ist, onupdate=now_ist)

    # Relationships
    users = relationship("User", back_populates="company", cascade="all, delete-orphan")
    leads = relationship("Lead", back_populates="company", cascade="all, delete-orphan")
    quotations = relationship("Quotation", back_populates="company", cascade="all, delete-orphan")
    surveys = relationship("Survey", back_populates="company", cascade="all, delete-orphan")
    pipeline_stages = relationship("PipelineStage", back_populates="company", cascade="all, delete-orphan", order_by="PipelineStage.order_index")
    loan_processes = relationship("LoanProcess", back_populates="company", cascade="all, delete-orphan")

# -------------------------------------------------------------
# User (Multi-Tenant)
# -------------------------------------------------------------
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=True)
    role = Column(String(50), default=UserRole.SALES_REP.value)
    avatar_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)
    custom_permissions = Column(JSON, default=list)
    created_at = Column(DateTime, default=now_ist)

    company = relationship("Company", back_populates="users")
    assigned_leads = relationship("Lead", back_populates="assigned_to", foreign_keys="[Lead.assigned_to_id]")

# -------------------------------------------------------------
# Lead (Core CRM entity)
# -------------------------------------------------------------
class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    lead_id = Column(String(50), index=True, nullable=False) # e.g. SOL-2026-001

    # Customer Contact Info
    full_name = Column(String(255), nullable=False, index=True)
    phone = Column(String(50), nullable=False, index=True)
    email = Column(String(255), nullable=True, index=True)
    address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True, index=True)
    state = Column(String(100), nullable=True)
    pincode = Column(String(20), nullable=True)

    # Solar Requirements
    property_type = Column(String(50), default="Residential") # Residential, Commercial, Industrial, Agricultural
    monthly_bill = Column(Float, default=0.0) # In currency, e.g. INR ₹
    recommended_kw = Column(Float, default=0.0)

    # Sales & Pipeline Info
    lead_source = Column(String(50), default="Website", index=True) # Website, WhatsApp, Facebook, Google Ads, etc.
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    stage = Column(String(50), default=LeadStage.NEW_LEAD.value, index=True)
    win_probability_pct = Column(Integer, default=20)
    next_follow_up_date = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=now_ist, index=True)
    updated_at = Column(DateTime, default=now_ist, onupdate=now_ist)

    # Relationships
    company = relationship("Company", back_populates="leads")
    assigned_to = relationship("User", back_populates="assigned_leads", foreign_keys=[assigned_to_id])
    activities = relationship("LeadActivity", back_populates="lead", cascade="all, delete-orphan", order_by="desc(LeadActivity.created_at)")
    notes = relationship("LeadNote", back_populates="lead", cascade="all, delete-orphan", order_by="desc(LeadNote.created_at)")
    followups = relationship("FollowUp", back_populates="lead", cascade="all, delete-orphan")
    surveys = relationship("Survey", back_populates="lead", cascade="all, delete-orphan")
    quotations = relationship("Quotation", back_populates="lead", cascade="all, delete-orphan")
    loan_process = relationship("LoanProcess", back_populates="lead", uselist=False, cascade="all, delete-orphan")

# -------------------------------------------------------------
# Lead Activity Timeline & Notes
# -------------------------------------------------------------
class LeadActivity(Base):
    __tablename__ = "lead_activities"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    activity_type = Column(String(50), nullable=False) # call, whatsapp, stage_changed, survey_scheduled, note_added, etc.
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=now_ist, index=True)

    lead = relationship("Lead", back_populates="activities")
    user = relationship("User")

class LeadNote(Base):
    __tablename__ = "lead_notes"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=now_ist, index=True)

    lead = relationship("Lead", back_populates="notes")
    user = relationship("User")

# -------------------------------------------------------------
# Follow-Up Task
# -------------------------------------------------------------
class FollowUp(Base):
    __tablename__ = "followups"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False, index=True)
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    scheduled_date = Column(DateTime, nullable=False, index=True)
    follow_up_type = Column(String(50), default=FollowUpType.CALL.value) # call, whatsapp, email, site_visit, meeting
    status = Column(String(50), default=FollowUpStatus.PENDING.value, index=True) # pending, completed, overdue, cancelled
    notes = Column(Text, nullable=True)
    reminder = Column(Boolean, default=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=now_ist)

    lead = relationship("Lead", back_populates="followups")
    assigned_to = relationship("User")

# -------------------------------------------------------------
# Site Survey
# -------------------------------------------------------------
class Survey(Base):
    __tablename__ = "surveys"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False, index=True)
    survey_code = Column(String(50), index=True) # e.g. SRV-2026-001
    assigned_engineer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(String(50), default=SurveyStatus.REQUESTED.value, index=True)
    scheduled_date = Column(DateTime, nullable=True)
    completed_date = Column(DateTime, nullable=True)

    # Technical Survey Specifications
    roof_type = Column(String(100), default="Concrete Flat")
    roof_area = Column(Float, default=0.0) # Total sq ft
    available_roof_area = Column(Float, default=0.0) # Usable shadow-free sq ft
    roof_direction = Column(String(50), default="South") # South, South-West, East, etc.
    roof_shading = Column(String(50), default="None") # None, Partial, Heavy
    electricity_connection_type = Column(String(50), default="Single Phase")
    phase = Column(String(50), default="Single Phase") # Single Phase, 3-Phase
    sanctioned_load_kw = Column(Float, default=5.0)
    meter_number = Column(String(100), nullable=True)
    existing_inverter = Column(String(100), nullable=True)
    existing_solar = Column(Boolean, default=False)
    recommended_system_size = Column(Float, default=5.0)
    engineer_notes = Column(Text, nullable=True)

    # Stored uploaded files metadata: list of {name, url, type, size, uploaded_at}
    files = Column(JSON, default=[])

    created_at = Column(DateTime, default=now_ist)
    updated_at = Column(DateTime, default=now_ist, onupdate=now_ist)

    lead = relationship("Lead", back_populates="surveys")
    assigned_engineer = relationship("User")
    company = relationship("Company", back_populates="surveys")

# -------------------------------------------------------------
# Solar Quotation
# -------------------------------------------------------------
class Quotation(Base):
    __tablename__ = "quotations"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False, index=True)
    quotation_number = Column(String(50), index=True, nullable=False) # e.g. QT-2026-001
    status = Column(String(50), default=QuotationStatus.DRAFT.value, index=True)
    
    # Solar Hardware Specifications
    system_size_kw = Column(Float, nullable=False, default=5.0)
    panel_brand = Column(String(100), default="Tata Power Solar")
    panel_wattage = Column(Integer, default=550) # Wp
    panel_quantity = Column(Integer, default=10)
    inverter_brand = Column(String(100), default="Sungrow")
    inverter_capacity = Column(String(100), default="5 kW On-Grid")
    battery_backup = Column(String(100), default="None")
    structure_type = Column(String(100), default="Elevated Galvanized Iron")

    # Financial Breakdown Formula:
    # (Base System Price + Installation + Other - Discount) + GST - Subsidy = Final Price
    system_price = Column(Float, default=240000.0) # Hardware base
    installation_cost = Column(Float, default=25000.0)
    other_costs = Column(Float, default=10000.0)
    discount = Column(Float, default=5000.0)
    subtotal = Column(Float, default=270000.0)
    gst_rate = Column(Float, default=13.8) # Percentage
    gst_amount = Column(Float, default=37260.0)
    subsidy_amount = Column(Float, default=78000.0) # Central / State subsidy
    final_price = Column(Float, default=229260.0) # Customer payable

    # Estimated Solar Returns
    monthly_generation_kwh = Column(Float, default=600.0)
    monthly_savings = Column(Float, default=4800.0)
    payback_years = Column(Float, default=3.9)

    valid_until = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=now_ist)
    updated_at = Column(DateTime, default=now_ist, onupdate=now_ist)

    lead = relationship("Lead", back_populates="quotations")
    created_by = relationship("User")
    company = relationship("Company", back_populates="quotations")

# -------------------------------------------------------------
# Dynamic Pipeline Stages (Multi-Tenant Kanban)
# -------------------------------------------------------------
class PipelineStage(Base):
    __tablename__ = "pipeline_stages"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    key = Column(String(50), nullable=False, index=True) # e.g. 'new_lead', 'contacted', 'custom_stage'
    label = Column(String(100), nullable=False) # e.g. "Site Feasibility"
    color = Column(String(50), default="blue") # e.g. "blue", "indigo", "amber", "purple", "cyan", "orange", "pink", "emerald", "red", "teal", "violet", "slate"
    order_index = Column(Integer, default=0, nullable=False)
    win_probability_pct = Column(Integer, default=50) # 0 to 100
    is_won = Column(Boolean, default=False)
    is_lost = Column(Boolean, default=False)
    created_at = Column(DateTime, default=now_ist)

    company = relationship("Company", back_populates="pipeline_stages")

# -------------------------------------------------------------
# Lead Source Analytics
# -------------------------------------------------------------
class LeadSource(Base):
    __tablename__ = "lead_sources"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    name = Column(String(100), nullable=False) # Website, WhatsApp, Facebook, Google Ads, etc.
    cost_per_lead = Column(Float, default=250.0)
    total_spend = Column(Float, default=10000.0)
    is_active = Column(Boolean, default=True)

# -------------------------------------------------------------
# Workflow Automation Rules
# -------------------------------------------------------------
class AutomationRule(Base):
    __tablename__ = "automation_rules"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    trigger_event = Column(String(100), nullable=False) # e.g. lead_created, quotation_sent, lead_inactive_7d
    conditions = Column(JSON, default={})
    actions = Column(JSON, default=[]) # list of action objects
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=now_ist)

# -------------------------------------------------------------
# Notifications
# -------------------------------------------------------------
class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    category = Column(String(50), default="lead") # lead, followup, survey, quotation
    link_url = Column(String(255), nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=now_ist, index=True)

# -------------------------------------------------------------
# Audit Logs
# -------------------------------------------------------------
class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False) # login, lead_created, stage_change, quotation_approved, etc.
    entity = Column(String(100), nullable=False) # lead, quotation, survey, user, settings
    entity_id = Column(String(100), nullable=True)
    ip_address = Column(String(50), nullable=True)
    details = Column(JSON, default={})
    created_at = Column(DateTime, default=now_ist, index=True)

# -------------------------------------------------------------
# Loan & Project Execution Workflow (For Won Deals)
# -------------------------------------------------------------
class LoanProcess(Base):
    __tablename__ = "loan_processes"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    loan_process_number = Column(String(50), nullable=True) # e.g. LP-2026-0001

    # Stage 1: Loan Application & Sanction
    loan_status = Column(String(50), default="Not Started", index=True) # Not Started, Pending Documents, Submitted, Under Review, Approved, Rejected, Disbursed
    loan_bank_name = Column(String(100), nullable=True)
    loan_amount = Column(Float, nullable=True)
    loan_notes = Column(Text, nullable=True)

    # Stage 2: Installation
    installation_status = Column(String(50), default="Not Started", index=True) # Not Started, In Progress, Material Delivered, Structure Erected, Panels Installed, Wiring Completed, Completed
    installer_name = Column(String(100), nullable=True)
    installation_date = Column(DateTime, nullable=True)
    installation_notes = Column(Text, nullable=True)

    # Equipment & Installation Details
    inverter_serial_number = Column(String(100), nullable=True)

    # Stage 3: Net Metering
    net_meter_status = Column(String(50), default="Not Started", index=True) # Not Started, Applied, Inspection Pending, Meter Issued, Meter Installed, Completed, Rejected
    net_meter_application_number = Column(String(100), nullable=True)
    discom_name = Column(String(100), nullable=True)
    net_meter_notes = Column(Text, nullable=True)

    # Stage 4: Inspection & Approvals
    inspection_status = Column(String(50), default="Not Started", index=True) # Not Started, Scheduled, Pending Review, Passed, Failed, Completed
    inspector_name = Column(String(100), nullable=True)
    inspection_date = Column(DateTime, nullable=True)
    inspection_notes = Column(Text, nullable=True)

    # Stage 5: Subsidy Claim & Disbursal
    subsidy_status = Column(String(50), default="Not Started", index=True) # Not Started, Application Submitted, Document Verification, Inspection Approved, Disbursed, Rejected, Completed
    subsidy_application_number = Column(String(100), nullable=True)
    subsidy_amount = Column(Float, nullable=True)
    subsidy_notes = Column(Text, nullable=True)

    overall_progress_pct = Column(Integer, default=0) # 0 to 100
    created_at = Column(DateTime, default=now_ist)
    updated_at = Column(DateTime, default=now_ist, onupdate=now_ist)

    # Relationships
    lead = relationship("Lead", back_populates="loan_process")
    company = relationship("Company", back_populates="loan_processes")
    documents = relationship("LoanDocument", back_populates="loan_process", cascade="all, delete-orphan", order_by="desc(LoanDocument.created_at)")
    panel_serials = relationship("LoanPanelSerial", back_populates="loan_process", cascade="all, delete-orphan", order_by="LoanPanelSerial.order_index")


class LoanPanelSerial(Base):
    __tablename__ = "loan_panel_serials"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    loan_process_id = Column(Integer, ForeignKey("loan_processes.id", ondelete="CASCADE"), nullable=False, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id", ondelete="CASCADE"), nullable=False, index=True)
    
    serial_number = Column(String(100), nullable=False)
    order_index = Column(Integer, default=0)
    created_at = Column(DateTime, default=now_ist)

    loan_process = relationship("LoanProcess", back_populates="panel_serials")
    company = relationship("Company")
    lead = relationship("Lead")


class LoanDocument(Base):
    __tablename__ = "loan_documents"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    loan_process_id = Column(Integer, ForeignKey("loan_processes.id", ondelete="CASCADE"), nullable=False, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Categorization: 'loan_file' | 'installation' | 'net_meter_file' | 'inspection' | 'subsidy' | 'installed_photo' | 'dcr_report'
    stage_category = Column(String(50), nullable=False, index=True)
    
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=False, default=0)
    mime_type = Column(String(100), nullable=True)
    uploaded_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    notes = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=now_ist)

    loan_process = relationship("LoanProcess", back_populates="documents")
    uploaded_by = relationship("User")





