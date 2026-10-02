import enum
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Float, Boolean, DateTime,
    ForeignKey, Enum, JSON
)
from sqlalchemy.orm import relationship
from app.database import Base

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
        "invoices:view", "invoices:create", "invoices:edit", "invoices:payments", "invoices:cancel", "invoices:settings", "invoices:backup_restore",
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
        "invoices:view", "invoices:create", "invoices:edit", "invoices:payments",
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
        "invoices:view", "invoices:create",
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
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    users = relationship("User", back_populates="company", cascade="all, delete-orphan")
    leads = relationship("Lead", back_populates="company", cascade="all, delete-orphan")
    quotations = relationship("Quotation", back_populates="company", cascade="all, delete-orphan")
    surveys = relationship("Survey", back_populates="company", cascade="all, delete-orphan")
    pipeline_stages = relationship("PipelineStage", back_populates="company", cascade="all, delete-orphan", order_by="PipelineStage.order_index")
    loan_processes = relationship("LoanProcess", back_populates="company", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="company", cascade="all, delete-orphan")
    invoice_settings = relationship("InvoiceSettings", back_populates="company", uselist=False, cascade="all, delete-orphan")

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
    created_at = Column(DateTime, default=datetime.utcnow)

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

    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    company = relationship("Company", back_populates="leads")
    assigned_to = relationship("User", back_populates="assigned_leads", foreign_keys=[assigned_to_id])
    activities = relationship("LeadActivity", back_populates="lead", cascade="all, delete-orphan", order_by="desc(LeadActivity.created_at)")
    notes = relationship("LeadNote", back_populates="lead", cascade="all, delete-orphan", order_by="desc(LeadNote.created_at)")
    followups = relationship("FollowUp", back_populates="lead", cascade="all, delete-orphan")
    surveys = relationship("Survey", back_populates="lead", cascade="all, delete-orphan")
    quotations = relationship("Quotation", back_populates="lead", cascade="all, delete-orphan")
    loan_process = relationship("LoanProcess", back_populates="lead", uselist=False, cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="lead", cascade="all, delete-orphan")

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
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    lead = relationship("Lead", back_populates="activities")
    user = relationship("User")

class LeadNote(Base):
    __tablename__ = "lead_notes"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

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
    created_at = Column(DateTime, default=datetime.utcnow)

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

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

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
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

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
    created_at = Column(DateTime, default=datetime.utcnow)

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
    created_at = Column(DateTime, default=datetime.utcnow)

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
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

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
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

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
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    lead = relationship("Lead", back_populates="loan_process")
    company = relationship("Company", back_populates="loan_processes")
    documents = relationship("LoanDocument", back_populates="loan_process", cascade="all, delete-orphan", order_by="desc(LoanDocument.created_at)")


class LoanDocument(Base):
    __tablename__ = "loan_documents"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    loan_process_id = Column(Integer, ForeignKey("loan_processes.id", ondelete="CASCADE"), nullable=False, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Categorization: 'loan_file' | 'installation' | 'net_meter_file' | 'inspection' | 'subsidy'
    stage_category = Column(String(50), nullable=False, index=True)
    
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=False, default=0)
    mime_type = Column(String(100), nullable=True)
    uploaded_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    notes = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    loan_process = relationship("LoanProcess", back_populates="documents")
    uploaded_by = relationship("User")


# -------------------------------------------------------------
# INVOICE MANAGEMENT MODULE (Independent Multi-Tenant)
# -------------------------------------------------------------

class InvoiceStatus(str, enum.Enum):
    DRAFT = "draft"
    ISSUED = "issued"
    PARTIALLY_PAID = "partially_paid"
    PAID = "paid"
    CANCELLED = "cancelled"


class InvoiceSettings(Base):
    __tablename__ = "invoice_settings"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)

    # Reference Company Details (Pre-filled for TrueSun Energy)
    company_name = Column(String(255), default="TRUESUN ENERGY", nullable=False)
    address = Column(Text, default="New Plot Area, Gam Vistar, Sultanpur")
    contact_number = Column(String(50), default="9974045095")
    email = Column(String(255), default="info.truesunenergy@gmail.com")
    website = Column(String(255), default="truesunenergy.in")
    gstin = Column(String(50), default="24EIVPG5500C1ZI")
    pan = Column(String(50), default="EIVPG5500C")
    state_code = Column(String(10), default="24")
    state_name = Column(String(50), default="Gujarat")

    # Bank Details
    bank_name = Column(String(255), default="State Bank of India")
    account_number = Column(String(100), default="44474952500")
    ifsc_code = Column(String(50), default="SBIN0003268")
    branch_name = Column(String(255), default="Sultanpur")

    # Numbering & Defaults
    invoice_prefix = Column(String(20), default="INV-")
    next_invoice_number = Column(Integer, default=22)
    default_payment_terms = Column(String(100), default="Immediate / On Delivery")
    default_terms = Column(Text, default="Looking forward for your business.")
    declaration = Column(Text, default="We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.")
    
    # Assets & Signatures
    logo_url = Column(String(500), nullable=True)
    signature_url = Column(String(500), nullable=True)
    signature_label = Column(String(255), default="For, TRUESUN ENERGY")

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    company = relationship("Company", back_populates="invoice_settings")


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id", ondelete="SET NULL"), nullable=True, index=True)
    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    invoice_number = Column(String(50), nullable=False, index=True) # e.g. INV-021, INV-022
    invoice_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    due_date = Column(DateTime, nullable=True)
    payment_terms = Column(String(100), nullable=True)
    status = Column(String(30), default="issued", index=True) # draft, issued, partially_paid, paid, cancelled

    # Immutable Company Snapshot at time of invoice creation
    company_name_snapshot = Column(String(255), nullable=True)
    company_address_snapshot = Column(Text, nullable=True)
    company_contact_snapshot = Column(String(50), nullable=True)
    company_email_snapshot = Column(String(255), nullable=True)
    company_website_snapshot = Column(String(255), nullable=True)
    company_gstin_snapshot = Column(String(50), nullable=True)
    company_pan_snapshot = Column(String(50), nullable=True)
    company_state_code_snapshot = Column(String(10), default="24")
    bank_name_snapshot = Column(String(255), nullable=True)
    bank_account_snapshot = Column(String(100), nullable=True)
    bank_ifsc_snapshot = Column(String(50), nullable=True)
    bank_branch_snapshot = Column(String(255), nullable=True)
    signature_label_snapshot = Column(String(255), nullable=True)

    # Bill To
    bill_to_name = Column(String(255), nullable=False)
    bill_to_address = Column(Text, nullable=True)
    bill_to_contact = Column(String(50), nullable=True)
    bill_to_gstin = Column(String(50), nullable=True)
    bill_to_pos = Column(String(100), default="24-Gujarat")

    # Ship To
    ship_to_name = Column(String(255), nullable=False)
    ship_to_address = Column(Text, nullable=True)
    ship_to_contact = Column(String(50), nullable=True)
    ship_to_pos = Column(String(100), default="24-Gujarat")

    # Financial Summary
    subtotal = Column(Float, default=0.0) # Taxable amount sum
    tax_amount = Column(Float, default=0.0) # Total GST
    round_off = Column(Float, default=0.0) # Round off adjustment
    total_amount = Column(Float, default=0.0) # Final amount
    paid_amount = Column(Float, default=0.0)
    outstanding_amount = Column(Float, default=0.0)
    amount_in_words = Column(String(500), nullable=True)

    # Notes & Conditions
    delivery_terms = Column(String(255), nullable=True)
    terms_and_conditions = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)

    # Aggregated HSN Tax Summary Cache (list of dicts)
    hsn_summary = Column(JSON, default=list)

    pdf_path = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    company = relationship("Company", back_populates="invoices")
    lead = relationship("Lead", back_populates="invoices")
    created_by = relationship("User")
    items = relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan", order_by="InvoiceItem.sort_order")
    payments = relationship("InvoicePayment", back_populates="invoice", cascade="all, delete-orphan", order_by="desc(InvoicePayment.payment_date)")


class InvoiceItem(Base):
    __tablename__ = "invoice_items"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    sort_order = Column(Integer, default=1)

    item_code = Column(String(50), nullable=True)
    particulars = Column(String(500), nullable=False)
    description = Column(Text, nullable=True) # Multiline panel serial numbers, inverter brand/SN, etc.
    hsn_sac = Column(String(20), default="8541")
    quantity = Column(Float, default=1.0)
    unit = Column(String(20), default="SITE") # SITE, NOS, SET, KW, WATT, PCS, MTR, KG, BOX, LOT, HRS, JOB
    unit_price = Column(Float, default=0.0)
    is_tax_inclusive = Column(Boolean, default=False)
    discount_type = Column(String(20), default="percent") # percent, amount
    discount_value = Column(Float, default=0.0)
    discount_amount = Column(Float, default=0.0)
    gst_rate = Column(Float, default=18.0) # 0%, 5%, 12%, 18%, 28%

    taxable_amount = Column(Float, default=0.0)
    cgst_rate = Column(Float, default=0.0)
    cgst_amount = Column(Float, default=0.0)
    sgst_rate = Column(Float, default=0.0)
    sgst_amount = Column(Float, default=0.0)
    igst_rate = Column(Float, default=0.0)
    igst_amount = Column(Float, default=0.0)
    line_total = Column(Float, default=0.0)

    created_at = Column(DateTime, default=datetime.utcnow)

    invoice = relationship("Invoice", back_populates="items")


class InvoicePayment(Base):
    __tablename__ = "invoice_payments"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)

    payment_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    amount = Column(Float, nullable=False)
    payment_method = Column(String(50), nullable=False, default="Bank Transfer") # Bank Transfer, NEFT/RTGS, UPI, Cheque, Cash
    transaction_reference = Column(String(100), nullable=True) # UTR or Cheque No
    notes = Column(Text, nullable=True)
    recorded_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    invoice = relationship("Invoice", back_populates="payments")
    recorded_by = relationship("User")


