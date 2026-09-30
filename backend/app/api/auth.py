from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database import get_db
from app.security import verify_password, get_password_hash, create_access_token
from app.models.models import User, Company, AuditLog, UserRole
from app.schemas.schemas import Token, LoginRequest, UserCreate, UserResponse
from app.api.deps import get_current_user, get_current_company, get_user_permissions

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == form_data.username.strip().lower()).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password"
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User account is deactivated"
        )

    # Record audit log
    if user.company_id:
        audit = AuditLog(
            company_id=user.company_id,
            user_id=user.id,
            action="login",
            entity="user",
            entity_id=str(user.id),
            details={"email": user.email}
        )
        db.add(audit)
        db.commit()

    access_token = create_access_token(
        data={"sub": str(user.id), "role": user.role, "company_id": user.company_id}
    )
    
    company = db.query(Company).filter(Company.id == user.company_id).first() if user.company_id else None
    perms = get_user_permissions(user, company)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "company_id": user.company_id,
            "email": user.email,
            "full_name": user.full_name,
            "phone": user.phone,
            "role": user.role,
            "avatar_url": user.avatar_url,
            "is_active": user.is_active,
            "permissions": perms
        }
    }

@router.post("/register", response_model=UserResponse)
def register(
    user_in: UserCreate,
    db: Session = Depends(get_db)
):
    existing = db.query(User).filter(User.email == user_in.email.strip().lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Attach to default or primary company
    company = db.query(Company).first()
    if not company:
        company = Company(
            name="SunPower Solar Solutions",
            slug="sunpower-solar",
            phone="+91 98765 43210",
            email="contact@sunpowersolar.com"
        )
        db.add(company)
        db.commit()
        db.refresh(company)

    new_user = User(
        company_id=company.id,
        email=user_in.email.strip().lower(),
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        phone=user_in.phone,
        role=user_in.role or UserRole.SALES_REP.value,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.get("/me", response_model=UserResponse)
def read_current_user(
    current_user: User = Depends(get_current_user),
    company: Company = Depends(get_current_company)
):
    perms = get_user_permissions(current_user, company)
    return {
        "id": current_user.id,
        "company_id": current_user.company_id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "phone": current_user.phone,
        "role": current_user.role,
        "avatar_url": current_user.avatar_url,
        "is_active": current_user.is_active,
        "permissions": perms
    }
