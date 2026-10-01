from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from sqlalchemy.orm.attributes import flag_modified

from app.database import get_db
from app.models.models import (
    User, Lead, Quotation, Company, UserRole, AuditLog, DEFAULT_ROLE_PERMISSIONS,
    Notification, FollowUp, Survey, LeadActivity, LeadNote
)
from app.schemas.schemas import (
    UserResponse, UserCreate, UserUpdate, RolePermissionsUpdate,
    PasswordResetRequest, CustomRoleCreate, CustomRoleUpdate
)
from app.security import get_password_hash
from app.api.deps import (
    get_current_user, get_current_company, require_roles, require_permission,
    get_user_permissions
)

router = APIRouter(prefix="/team", tags=["Team & Access Management"])

# Master Permission Catalog
PERMISSION_CATALOG = [
    {
        "category": "Lead Management",
        "items": [
            {"key": "leads:view", "name": "View Leads", "description": "Browse and search solar lead directory"},
            {"key": "leads:create", "name": "Create Leads", "description": "Add new solar inquiries and customer records"},
            {"key": "leads:edit", "name": "Edit Leads", "description": "Modify lead profiles, bill data, and roof details"},
            {"key": "leads:delete", "name": "Delete Leads", "description": "Permanently remove lead records"},
            {"key": "leads:export", "name": "Export Leads", "description": "Download filtered lead data to CSV"},
            {"key": "leads:assign", "name": "Reassign Leads", "description": "Assign leads to sales representatives"}
        ]
    },
    {
        "category": "Sales Pipeline",
        "items": [
            {"key": "pipeline:view", "name": "View Pipeline", "description": "Access visual Kanban sales board"},
            {"key": "pipeline:move", "name": "Advance Stages", "description": "Drag and move cards across sales stages"},
            {"key": "pipeline:close_deals", "name": "Close Deals", "description": "Mark pipeline deals as Won or Lost"},
            {"key": "pipeline:manage_stages", "name": "Manage Stages", "description": "Add, edit, reorder, and remove sales pipeline stages"}
        ]
    },
    {
        "category": "Rooftop Surveys",
        "items": [
            {"key": "surveys:view", "name": "View Surveys", "description": "Inspect engineering rooftop surveys"},
            {"key": "surveys:create", "name": "Schedule Surveys", "description": "Book rooftop engineering visits"},
            {"key": "surveys:complete", "name": "Complete Surveys", "description": "Submit technical measurements and shadow checks"},
            {"key": "surveys:delete", "name": "Delete Surveys", "description": "Remove survey appointments and records"}
        ]
    },
    {
        "category": "Quotations & Pricing",
        "items": [
            {"key": "quotations:view", "name": "View Quotes", "description": "Inspect hardware bill of materials and warranties"},
            {"key": "quotations:create", "name": "Generate Quotes", "description": "Calculate system sizing and formal quotations"},
            {"key": "quotations:discount", "name": "Custom Discounts", "description": "Apply special discounts and subsidy adjustments"},
            {"key": "quotations:delete", "name": "Delete Quotes", "description": "Remove formal proposals and solar cost estimates"}
        ]
    },
    {
        "category": "Follow-ups & Schedule",
        "items": [
            {"key": "followups:view", "name": "View Schedule", "description": "View follow-up tasks and operations calendar"},
            {"key": "followups:manage", "name": "Manage Touchpoints", "description": "Schedule calls, WhatsApp chats, and mark done"}
        ]
    },
    {
        "category": "Analytics & Reports",
        "items": [
            {"key": "reports:view", "name": "View Analytics", "description": "View executive KPI dashboard and charts"},
            {"key": "reports:export", "name": "Export Reports", "description": "Download analytical reports and KPI spreadsheets"}
        ]
    },
    {
        "category": "GenAI Assistant",
        "items": [
            {"key": "ai:use", "name": "Run AI Assistant", "description": "Generate technical qualification and WhatsApp pitch"}
        ]
    },
    {
        "category": "Automation Workflows",
        "items": [
            {"key": "automation:view", "name": "View Automations", "description": "Inspect workflow automation triggers"},
            {"key": "automation:manage", "name": "Manage Automations", "description": "Configure rules and trigger actions"}
        ]
    },
    {
        "category": "Team & Access Control",
        "items": [
            {"key": "team:view", "name": "View Team", "description": "Browse team directory and leaderboard stats"},
            {"key": "team:manage_users", "name": "Manage Users", "description": "Add, edit, change roles, and deactivate accounts"},
            {"key": "team:manage_roles", "name": "Manage Custom Roles", "description": "Create, edit, and delete company custom roles"},
            {"key": "team:manage_permissions", "name": "Manage Permissions", "description": "Configure company role permissions matrix"}
        ]
    },
    {
        "category": "Company Settings",
        "items": [
            {"key": "settings:view", "name": "View Settings", "description": "Inspect solar pricing models and integrations"},
            {"key": "settings:edit", "name": "Edit Settings", "description": "Modify base cost per watt, GST, and subsidy tables"}
        ]
    }
]

SYSTEM_ROLE_METADATA = [
    {
        "id": "company_admin",
        "name": "Company Administrator",
        "description": "Full access to platform settings, team roles, permissions, and pipeline operations.",
        "is_system": True,
        "badge_color": "amber"
    },
    {
        "id": "sales_manager",
        "name": "Sales Manager",
        "description": "Supervises team performance, pipeline velocity, quotation approvals, and revenue.",
        "is_system": True,
        "badge_color": "purple"
    },
    {
        "id": "sales_rep",
        "name": "Sales Representative",
        "description": "Engages solar prospects, schedules follow-ups, and prepares solar sizing quotes.",
        "is_system": True,
        "badge_color": "blue"
    },
    {
        "id": "survey_engineer",
        "name": "Survey Engineer",
        "description": "Conducts rooftop site surveys, electrical load checks, and technical feasibility.",
        "is_system": True,
        "badge_color": "cyan"
    }
]

SYSTEM_ROLE_IDS = {"super_admin", "company_admin", "sales_manager", "sales_rep", "survey_engineer"}

def get_all_roles_metadata(company: Company) -> List[dict]:
    roles = list(SYSTEM_ROLE_METADATA)
    custom_roles = company.custom_roles or []
    for cr in custom_roles:
        roles.append({
            "id": cr.get("id"),
            "name": cr.get("name"),
            "description": cr.get("description", ""),
            "is_system": False,
            "badge_color": cr.get("badge_color", "emerald")
        })
    return roles

# -------------------------------------------------------------
# Team Members List & Creation
# -------------------------------------------------------------
@router.get("", response_model=List[dict])
def get_team_members(
    search: Optional[str] = Query(None, description="Search by name, email, or phone"),
    role: Optional[str] = Query(None, description="Filter by role id"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    query = db.query(User).filter(User.company_id == company.id)

    if search and search.strip():
        s = f"%{search.strip().lower()}%"
        query = query.filter(
            or_(
                func.lower(User.full_name).like(s),
                func.lower(User.email).like(s),
                User.phone.like(s)
            )
        )

    if role and role.strip():
        query = query.filter(User.role == role.strip())

    if is_active is not None:
        query = query.filter(User.is_active == is_active)

    users = query.order_by(User.id.asc()).all()
    results = []

    for u in users:
        leads_cnt = db.query(Lead).filter(Lead.company_id == company.id, Lead.assigned_to_id == u.id).count()
        qualified_cnt = db.query(Lead).filter(
            Lead.company_id == company.id,
            Lead.assigned_to_id == u.id,
            Lead.stage.notin_(["new_lead", "contacted", "lost"])
        ).count()
        quotes_cnt = db.query(Quotation).filter(Quotation.company_id == company.id, Quotation.created_by_id == u.id).count()
        won_cnt = db.query(Lead).filter(Lead.company_id == company.id, Lead.assigned_to_id == u.id, Lead.stage == "won").count()
        rev = db.query(func.sum(Lead.estimated_value)).filter(
            Lead.company_id == company.id, Lead.assigned_to_id == u.id, Lead.stage == "won"
        ).scalar() or 0.0

        conv_rate = round((won_cnt / leads_cnt * 100), 1) if leads_cnt > 0 else 0.0
        perms = get_user_permissions(u, company)

        results.append({
            "id": u.id,
            "company_id": u.company_id,
            "email": u.email,
            "full_name": u.full_name,
            "phone": u.phone,
            "role": u.role,
            "avatar_url": u.avatar_url,
            "is_active": u.is_active,
            "custom_permissions": u.custom_permissions or [],
            "effective_permissions": perms,
            "effective_permissions_count": len(perms),
            "created_at": u.created_at,
            "leads_assigned": leads_cnt,
            "qualified_leads": qualified_cnt,
            "quotations_sent": quotes_cnt,
            "won_deals": won_cnt,
            "revenue": rev,
            "conversion_rate": conv_rate
        })
    return results

@router.post("", response_model=UserResponse)
def add_team_member(
    user_in: UserCreate,
    current_user: User = Depends(require_roles([UserRole.COMPANY_ADMIN.value, UserRole.SUPER_ADMIN.value])),
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    existing = db.query(User).filter(User.email == user_in.email.strip().lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    new_user = User(
        company_id=company.id,
        email=user_in.email.strip().lower(),
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        phone=user_in.phone,
        role=user_in.role or "sales_rep",
        is_active=True if user_in.is_active is None else user_in.is_active,
        custom_permissions=user_in.custom_permissions or []
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    audit = AuditLog(
        company_id=company.id,
        user_id=current_user.id,
        action="create",
        entity="user",
        entity_id=str(new_user.id),
        details={"name": new_user.full_name, "role": new_user.role, "email": new_user.email}
    )
    db.add(audit)
    db.commit()

    return new_user

# -------------------------------------------------------------
# Static Role & Permission Management (MUST come before /{user_id})
# -------------------------------------------------------------
@router.get("/permissions")
def get_role_permissions(
    company: Company = Depends(get_current_company),
    current_user: User = Depends(get_current_user)
):
    active_perms = company.role_permissions or DEFAULT_ROLE_PERMISSIONS
    roles = get_all_roles_metadata(company)
    return {
        "permissions": active_perms,
        "roles": roles,
        "catalog": PERMISSION_CATALOG
    }

@router.put("/permissions")
def update_role_permissions(
    perms_in: RolePermissionsUpdate,
    company: Company = Depends(get_current_company),
    current_user: User = Depends(require_roles([UserRole.COMPANY_ADMIN.value, UserRole.SUPER_ADMIN.value])),
    db: Session = Depends(get_db)
):
    submitted_perms = dict(perms_in.permissions)
    
    # Guarantee company_admin never gets locked out of vital access
    admin_list = set(submitted_perms.get("company_admin", []))
    admin_list.add("team:manage_permissions")
    admin_list.add("team:manage_users")
    admin_list.add("team:manage_roles")
    admin_list.add("settings:edit")
    submitted_perms["company_admin"] = sorted(list(admin_list))

    company.role_permissions = submitted_perms
    flag_modified(company, "role_permissions")
    db.commit()

    audit = AuditLog(
        company_id=company.id,
        user_id=current_user.id,
        action="update",
        entity="permissions",
        entity_id=str(company.id),
        details={"updated_roles": list(submitted_perms.keys())}
    )
    db.add(audit)
    db.commit()

    return {
        "status": "success",
        "message": "Role permissions matrix updated successfully",
        "permissions": company.role_permissions
    }

@router.post("/permissions/reset")
def reset_role_permissions(
    role_id: Optional[str] = Query(None, description="Optional role to reset; if omitted, resets all"),
    company: Company = Depends(get_current_company),
    current_user: User = Depends(require_roles([UserRole.COMPANY_ADMIN.value, UserRole.SUPER_ADMIN.value])),
    db: Session = Depends(get_db)
):
    current_perms = dict(company.role_permissions or {})
    if role_id:
        if role_id in DEFAULT_ROLE_PERMISSIONS:
            current_perms[role_id] = list(DEFAULT_ROLE_PERMISSIONS[role_id])
        else:
            current_perms[role_id] = []
        msg = f"Permissions for role '{role_id}' reset to defaults"
    else:
        current_perms = dict(DEFAULT_ROLE_PERMISSIONS)
        msg = "All role permissions reset to factory defaults"

    company.role_permissions = current_perms
    flag_modified(company, "role_permissions")
    db.commit()

    audit = AuditLog(
        company_id=company.id,
        user_id=current_user.id,
        action="reset",
        entity="permissions",
        entity_id=str(company.id),
        details={"target_role": role_id or "all"}
    )
    db.add(audit)
    db.commit()

    return {
        "status": "success",
        "message": msg,
        "permissions": company.role_permissions
    }

# -------------------------------------------------------------
# Custom Roles Management
# -------------------------------------------------------------
@router.post("/roles")
def create_custom_role(
    role_in: CustomRoleCreate,
    company: Company = Depends(get_current_company),
    current_user: User = Depends(require_roles([UserRole.COMPANY_ADMIN.value, UserRole.SUPER_ADMIN.value])),
    db: Session = Depends(get_db)
):
    role_id = role_in.id.strip().lower().replace(" ", "_")
    if role_id in SYSTEM_ROLE_IDS:
        raise HTTPException(status_code=400, detail=f"Cannot create custom role with reserved system ID '{role_id}'")

    existing_roles = list(company.custom_roles or [])
    if any(r.get("id") == role_id for r in existing_roles):
        raise HTTPException(status_code=400, detail=f"Custom role with ID '{role_id}' already exists")

    new_role_entry = {
        "id": role_id,
        "name": role_in.name.strip(),
        "description": role_in.description or "",
        "badge_color": role_in.badge_color or "emerald"
    }
    existing_roles.append(new_role_entry)
    company.custom_roles = existing_roles
    flag_modified(company, "custom_roles")

    # Initialize role permissions
    active_perms = dict(company.role_permissions or DEFAULT_ROLE_PERMISSIONS)
    active_perms[role_id] = role_in.permissions or []
    company.role_permissions = active_perms
    flag_modified(company, "role_permissions")

    db.commit()

    audit = AuditLog(
        company_id=company.id,
        user_id=current_user.id,
        action="create",
        entity="role",
        entity_id=role_id,
        details={"name": new_role_entry["name"]}
    )
    db.add(audit)
    db.commit()

    return {
        "status": "success",
        "message": f"Custom role '{role_in.name}' created successfully",
        "role": new_role_entry,
        "roles": get_all_roles_metadata(company)
    }

@router.put("/roles/{role_id}")
def update_custom_role(
    role_id: str,
    role_in: CustomRoleUpdate,
    company: Company = Depends(get_current_company),
    current_user: User = Depends(require_roles([UserRole.COMPANY_ADMIN.value, UserRole.SUPER_ADMIN.value])),
    db: Session = Depends(get_db)
):
    if role_id in SYSTEM_ROLE_IDS:
        raise HTTPException(status_code=400, detail="System default roles cannot be modified through this endpoint")

    existing_roles = list(company.custom_roles or [])
    target = None
    for r in existing_roles:
        if r.get("id") == role_id:
            target = r
            break

    if not target:
        raise HTTPException(status_code=404, detail="Custom role not found")

    if role_in.name is not None:
        target["name"] = role_in.name.strip()
    if role_in.description is not None:
        target["description"] = role_in.description
    if role_in.badge_color is not None:
        target["badge_color"] = role_in.badge_color

    company.custom_roles = existing_roles
    flag_modified(company, "custom_roles")
    db.commit()

    return {
        "status": "success",
        "message": f"Custom role '{target['name']}' updated",
        "role": target,
        "roles": get_all_roles_metadata(company)
    }

@router.delete("/roles/{role_id}")
def delete_custom_role(
    role_id: str,
    company: Company = Depends(get_current_company),
    current_user: User = Depends(require_roles([UserRole.COMPANY_ADMIN.value, UserRole.SUPER_ADMIN.value])),
    db: Session = Depends(get_db)
):
    if role_id in SYSTEM_ROLE_IDS:
        raise HTTPException(status_code=400, detail="Cannot delete core system roles")

    # Verify no users are assigned to this role
    users_with_role = db.query(User).filter(User.company_id == company.id, User.role == role_id).count()
    if users_with_role > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete role: {users_with_role} team member(s) are currently assigned to this role. Reassign them first."
        )

    existing_roles = list(company.custom_roles or [])
    filtered_roles = [r for r in existing_roles if r.get("id") != role_id]
    if len(filtered_roles) == len(existing_roles):
        raise HTTPException(status_code=404, detail="Custom role not found")

    company.custom_roles = filtered_roles
    flag_modified(company, "custom_roles")

    # Remove from role permissions
    active_perms = dict(company.role_permissions or {})
    if role_id in active_perms:
        del active_perms[role_id]
        company.role_permissions = active_perms
        flag_modified(company, "role_permissions")

    db.commit()

    audit = AuditLog(
        company_id=company.id,
        user_id=current_user.id,
        action="delete",
        entity="role",
        entity_id=role_id,
        details={"deleted_role_id": role_id}
    )
    db.add(audit)
    db.commit()

    return {
        "status": "success",
        "message": f"Custom role '{role_id}' deleted successfully",
        "roles": get_all_roles_metadata(company)
    }

# -------------------------------------------------------------
# Dynamic Member Routes by ID
# -------------------------------------------------------------
@router.get("/{user_id}")
def get_team_member(
    user_id: int,
    company: Company = Depends(get_current_company),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    target_user = db.query(User).filter(User.id == user_id, User.company_id == company.id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Team member not found")

    perms = get_user_permissions(target_user, company)
    assigned_leads = db.query(Lead).filter(Lead.company_id == company.id, Lead.assigned_to_id == target_user.id).limit(10).all()

    return {
        "id": target_user.id,
        "company_id": target_user.company_id,
        "email": target_user.email,
        "full_name": target_user.full_name,
        "phone": target_user.phone,
        "role": target_user.role,
        "avatar_url": target_user.avatar_url,
        "is_active": target_user.is_active,
        "custom_permissions": target_user.custom_permissions or [],
        "effective_permissions": perms,
        "created_at": target_user.created_at,
        "leads_sample": [{"id": l.id, "lead_id": l.lead_id, "name": l.full_name, "stage": l.stage} for l in assigned_leads]
    }

@router.put("/{user_id}", response_model=UserResponse)
def update_team_member(
    user_id: int,
    user_in: UserUpdate,
    current_user: User = Depends(require_roles([UserRole.COMPANY_ADMIN.value, UserRole.SUPER_ADMIN.value])),
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    target_user = db.query(User).filter(User.id == user_id, User.company_id == company.id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Team member not found")

    # If updating email, check for duplicate
    if user_in.email and user_in.email.strip().lower() != target_user.email:
        existing = db.query(User).filter(User.email == user_in.email.strip().lower()).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email is already in use by another user")
        target_user.email = user_in.email.strip().lower()

    if user_in.full_name is not None:
        target_user.full_name = user_in.full_name
    if user_in.phone is not None:
        target_user.phone = user_in.phone
    if user_in.is_active is not None:
        if target_user.id == current_user.id and not user_in.is_active:
            raise HTTPException(status_code=400, detail="You cannot deactivate your own account")
        target_user.is_active = user_in.is_active

    # Role update
    if user_in.role is not None:
        if user_in.role == UserRole.SUPER_ADMIN.value and current_user.role != UserRole.SUPER_ADMIN.value:
            raise HTTPException(status_code=403, detail="Only Super Admins can assign Super Admin role")
        target_user.role = user_in.role

    # Password reset if requested
    if user_in.password and user_in.password.strip():
        target_user.hashed_password = get_password_hash(user_in.password)

    # Custom permissions override
    if user_in.custom_permissions is not None:
        target_user.custom_permissions = user_in.custom_permissions
        flag_modified(target_user, "custom_permissions")

    db.commit()
    db.refresh(target_user)

    audit = AuditLog(
        company_id=company.id,
        user_id=current_user.id,
        action="update",
        entity="user",
        entity_id=str(target_user.id),
        details={"name": target_user.full_name, "role": target_user.role, "active": target_user.is_active}
    )
    db.add(audit)
    db.commit()

    return target_user

@router.patch("/{user_id}/status")
def toggle_team_member_status(
    user_id: int,
    is_active: bool = Body(..., embed=True),
    current_user: User = Depends(require_roles([UserRole.COMPANY_ADMIN.value, UserRole.SUPER_ADMIN.value])),
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    if user_id == current_user.id and not is_active:
        raise HTTPException(status_code=400, detail="You cannot deactivate your own account")

    target_user = db.query(User).filter(User.id == user_id, User.company_id == company.id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Team member not found")

    target_user.is_active = is_active
    db.commit()
    db.refresh(target_user)

    audit = AuditLog(
        company_id=company.id,
        user_id=current_user.id,
        action="update_status",
        entity="user",
        entity_id=str(user_id),
        details={"is_active": is_active}
    )
    db.add(audit)
    db.commit()

    return {
        "status": "success",
        "message": f"User {'activated' if is_active else 'deactivated'} successfully",
        "user": {
            "id": target_user.id,
            "full_name": target_user.full_name,
            "is_active": target_user.is_active
        }
    }

@router.post("/{user_id}/reset-password")
def reset_team_member_password(
    user_id: int,
    req: PasswordResetRequest,
    current_user: User = Depends(require_roles([UserRole.COMPANY_ADMIN.value, UserRole.SUPER_ADMIN.value])),
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    target_user = db.query(User).filter(User.id == user_id, User.company_id == company.id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Team member not found")

    target_user.hashed_password = get_password_hash(req.new_password)
    db.commit()

    audit = AuditLog(
        company_id=company.id,
        user_id=current_user.id,
        action="reset_password",
        entity="user",
        entity_id=str(user_id),
        details={"target_email": target_user.email}
    )
    db.add(audit)
    db.commit()

    return {
        "status": "success",
        "message": f"Password reset successfully for {target_user.full_name}"
    }

@router.delete("/{user_id}")
def delete_team_member(
    user_id: int,
    current_user: User = Depends(require_roles([UserRole.COMPANY_ADMIN.value, UserRole.SUPER_ADMIN.value])),
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")

    target_user = db.query(User).filter(User.id == user_id, User.company_id == company.id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Team member not found")

    if target_user.role == UserRole.SUPER_ADMIN.value and current_user.role != UserRole.SUPER_ADMIN.value:
        raise HTTPException(status_code=403, detail="Only Super Admins can delete Super Admin accounts")

    target_name = target_user.full_name
    target_email = target_user.email

    try:
        # Nullify foreign key references in related tables that allow NULL
        db.query(AuditLog).filter(AuditLog.user_id == user_id).update({AuditLog.user_id: None}, synchronize_session=False)
        db.query(LeadActivity).filter(LeadActivity.user_id == user_id).update({LeadActivity.user_id: None}, synchronize_session=False)
        db.query(FollowUp).filter(FollowUp.assigned_to_id == user_id).update({FollowUp.assigned_to_id: None}, synchronize_session=False)
        db.query(Survey).filter(Survey.assigned_engineer_id == user_id).update({Survey.assigned_engineer_id: None}, synchronize_session=False)
        db.query(Lead).filter(Lead.assigned_to_id == user_id).update({Lead.assigned_to_id: None}, synchronize_session=False)
        db.query(Quotation).filter(Quotation.created_by_id == user_id).update({Quotation.created_by_id: None}, synchronize_session=False)

        # Reassign notes written by this user to current_user to retain notes on customer profiles
        db.query(LeadNote).filter(LeadNote.user_id == user_id).update({LeadNote.user_id: current_user.id}, synchronize_session=False)

        # Delete user's notifications
        db.query(Notification).filter(Notification.user_id == user_id).delete(synchronize_session=False)

        # Permanently delete user record
        db.delete(target_user)
        db.commit()

        # Log audit entry under the current performing admin's ID
        audit = AuditLog(
            company_id=company.id,
            user_id=current_user.id,
            action="delete",
            entity="user",
            entity_id=str(user_id),
            details={"deleted_user": target_name, "email": target_email}
        )
        db.add(audit)
        db.commit()

        return {"status": "success", "message": f"Team member {target_name} permanently removed"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to remove team member: {str(e)}")
