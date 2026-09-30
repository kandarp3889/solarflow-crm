from typing import Generator, Optional, List
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.security import decode_access_token
from app.models.models import User, Company, UserRole, DEFAULT_ROLE_PERMISSIONS

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def get_user_permissions(user: User, company: Optional[Company] = None) -> List[str]:
    if user.role == UserRole.SUPER_ADMIN.value or user.role == UserRole.COMPANY_ADMIN.value:
        # Admins have full access
        admin_perms = set(DEFAULT_ROLE_PERMISSIONS.get("company_admin", []))
        if getattr(user, "custom_permissions", None):
            admin_perms.update(user.custom_permissions)
        return sorted(list(admin_perms))
    
    perms_map = (company.role_permissions if company else None) or DEFAULT_ROLE_PERMISSIONS
    base_perms = set(perms_map.get(user.role, []))
    if getattr(user, "custom_permissions", None):
        for p in user.custom_permissions:
            if p.startswith("-"):
                base_perms.discard(p[1:])
            else:
                base_perms.add(p)
    return sorted(list(base_perms))

def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    user_id: Optional[str] = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None or not user.is_active:
        raise credentials_exception

    return user

def get_current_company(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Company:
    if current_user.company_id is None:
        # Super admin might not belong to a specific company; fallback to first company or error
        company = db.query(Company).first()
        if not company:
            raise HTTPException(status_code=404, detail="No active company tenant found")
        return company

    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if not company or not company.is_active:
        raise HTTPException(status_code=403, detail="Company tenant is inactive or not found")

    return company

def require_roles(allowed_roles: List[str]):
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role == UserRole.SUPER_ADMIN.value:
            return current_user # Super Admin has universal access
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted for role: {current_user.role}"
            )
        return current_user
    return role_checker

def require_permission(permission: str):
    def permission_checker(
        current_user: User = Depends(get_current_user),
        company: Company = Depends(get_current_company)
    ) -> User:
        if current_user.role in [UserRole.SUPER_ADMIN.value, UserRole.COMPANY_ADMIN.value]:
            return current_user # Universal Admin access
        
        user_perms = get_user_permissions(current_user, company)
        if permission not in user_perms:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Missing required permission '{permission}'"
            )
        return current_user
    return permission_checker
