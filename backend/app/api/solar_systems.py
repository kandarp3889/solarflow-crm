from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_

from app.database import get_db
from app.models.models import SolarSystem, Quotation, Company, User
from app.schemas.schemas import (
    SolarSystemCreate,
    SolarSystemUpdate,
    SolarSystemResponse
)
from app.api.deps import get_current_user, get_current_company
from app.core.timezone import now_ist

router = APIRouter(prefix="/solar-systems", tags=["Solar Systems Catalog"])

@router.get("", response_model=List[SolarSystemResponse])
def get_solar_systems(
    search: Optional[str] = Query(None, description="Search by system name, panel brand, inverter, etc."),
    min_kw: Optional[float] = Query(None, description="Minimum capacity (kW)"),
    max_kw: Optional[float] = Query(None, description="Maximum capacity (kW)"),
    is_active: Optional[bool] = Query(None, description="Filter active status"),
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    query = db.query(SolarSystem).filter(SolarSystem.company_id == company.id)

    if is_active is not None:
        query = query.filter(SolarSystem.is_active == is_active)

    if min_kw is not None:
        query = query.filter(SolarSystem.capacity_kw >= min_kw)

    if max_kw is not None:
        query = query.filter(SolarSystem.capacity_kw <= max_kw)

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            or_(
                SolarSystem.system_name.ilike(s),
                SolarSystem.solar_panel_name.ilike(s),
                SolarSystem.inverter_name.ilike(s),
                SolarSystem.structure_name.ilike(s),
                SolarSystem.bos_name.ilike(s),
                SolarSystem.description.ilike(s)
            )
        )

    systems = query.order_by(SolarSystem.capacity_kw.asc(), SolarSystem.base_price.asc()).all()

    result = []
    for sys_obj in systems:
        res = SolarSystemResponse.from_orm(sys_obj)
        if sys_obj.created_by:
            res.created_by_name = sys_obj.created_by.full_name
        
        # Count referencing quotations
        res.quotations_count = db.query(Quotation).filter(
            Quotation.system_id == sys_obj.id,
            Quotation.company_id == company.id
        ).count()
        result.append(res)

    return result

@router.post("", response_model=SolarSystemResponse, status_code=status.HTTP_201_CREATED)
def create_solar_system(
    system_in: SolarSystemCreate,
    current_user: User = Depends(get_current_user),
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    # Validation checks
    if not system_in.system_name.strip():
        raise HTTPException(status_code=400, detail="System Name / Brand is required.")
    if system_in.base_price < 0:
        raise HTTPException(status_code=400, detail="Base price cannot be negative.")
    if system_in.capacity_kw <= 0:
        raise HTTPException(status_code=400, detail="System Capacity must be greater than 0 kW.")
    if system_in.quantity < 0:
        raise HTTPException(status_code=400, detail="Quantity cannot be negative.")
    if system_in.subsidy < 0:
        raise HTTPException(status_code=400, detail="Subsidy amount cannot be negative.")

    new_system = SolarSystem(
        company_id=company.id,
        system_name=system_in.system_name.strip(),
        base_price=round(float(system_in.base_price), 2),
        capacity_kw=round(float(system_in.capacity_kw), 2),
        solar_panel_name=system_in.solar_panel_name.strip(),
        inverter_name=system_in.inverter_name.strip(),
        structure_name=system_in.structure_name.strip(),
        bos_name=system_in.bos_name.strip(),
        quantity=int(system_in.quantity),
        warranty=system_in.warranty.strip(),
        subsidy=round(float(system_in.subsidy), 2),
        description=system_in.description.strip() if system_in.description else None,
        is_active=system_in.is_active,
        created_by_id=current_user.id,
        created_at=now_ist(),
        updated_at=now_ist()
    )

    db.add(new_system)
    db.commit()
    db.refresh(new_system)

    res = SolarSystemResponse.from_orm(new_system)
    res.created_by_name = current_user.full_name
    res.quotations_count = 0
    return res

@router.get("/{system_id}", response_model=SolarSystemResponse)
def get_solar_system(
    system_id: int,
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    system = db.query(SolarSystem).filter(
        SolarSystem.id == system_id,
        SolarSystem.company_id == company.id
    ).first()

    if not system:
        raise HTTPException(status_code=404, detail="Solar system not found")

    res = SolarSystemResponse.from_orm(system)
    if system.created_by:
        res.created_by_name = system.created_by.full_name
    res.quotations_count = db.query(Quotation).filter(
        Quotation.system_id == system.id,
        Quotation.company_id == company.id
    ).count()
    return res

@router.put("/{system_id}", response_model=SolarSystemResponse)
def update_solar_system(
    system_id: int,
    system_update: SolarSystemUpdate,
    current_user: User = Depends(get_current_user),
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    system = db.query(SolarSystem).filter(
        SolarSystem.id == system_id,
        SolarSystem.company_id == company.id
    ).first()

    if not system:
        raise HTTPException(status_code=404, detail="Solar system not found")

    update_data = system_update.dict(exclude_unset=True)

    old_system_name = system.system_name

    if "system_name" in update_data:
        name = (update_data["system_name"] or "").strip()
        if not name:
            raise HTTPException(status_code=400, detail="System Name cannot be empty.")
        system.system_name = name

    if "base_price" in update_data and update_data["base_price"] is not None:
        if update_data["base_price"] < 0:
            raise HTTPException(status_code=400, detail="Base price cannot be negative.")
        system.base_price = round(float(update_data["base_price"]), 2)

    if "capacity_kw" in update_data and update_data["capacity_kw"] is not None:
        if update_data["capacity_kw"] <= 0:
            raise HTTPException(status_code=400, detail="Capacity must be greater than 0 kW.")
        system.capacity_kw = round(float(update_data["capacity_kw"]), 2)

    if "solar_panel_name" in update_data:
        system.solar_panel_name = (update_data["solar_panel_name"] or "").strip()

    if "inverter_name" in update_data:
        system.inverter_name = (update_data["inverter_name"] or "").strip()

    if "structure_name" in update_data:
        system.structure_name = (update_data["structure_name"] or "").strip()

    if "bos_name" in update_data:
        system.bos_name = (update_data["bos_name"] or "").strip()

    if "quantity" in update_data and update_data["quantity"] is not None:
        if update_data["quantity"] < 0:
            raise HTTPException(status_code=400, detail="Quantity cannot be negative.")
        system.quantity = int(update_data["quantity"])

    if "warranty" in update_data:
        system.warranty = (update_data["warranty"] or "").strip()

    if "subsidy" in update_data and update_data["subsidy"] is not None:
        if update_data["subsidy"] < 0:
            raise HTTPException(status_code=400, detail="Subsidy cannot be negative.")
        system.subsidy = round(float(update_data["subsidy"]), 2)

    if "description" in update_data:
        system.description = (update_data["description"] or "").strip() or None

    if "is_active" in update_data and update_data["is_active"] is not None:
        system.is_active = bool(update_data["is_active"])

    system.updated_at = now_ist()

    # Synchronize updated hardware specifications and warranty terms to matching quotations
    matching_quotes = db.query(Quotation).filter(
        Quotation.company_id == company.id,
        or_(
            Quotation.system_id == system.id,
            Quotation.system_name == old_system_name,
            Quotation.system_name == system.system_name
        )
    ).all()
    for q in matching_quotes:
        if q.system_id is None:
            q.system_id = system.id
        if "system_name" in update_data and system.system_name:
            q.system_name = system.system_name
        if "warranty" in update_data and system.warranty:
            q.warranty = system.warranty
        if "solar_panel_name" in update_data and system.solar_panel_name:
            q.solar_panel_name = system.solar_panel_name
        if "inverter_name" in update_data and system.inverter_name:
            q.inverter_name = system.inverter_name
        if "structure_name" in update_data and system.structure_name:
            q.structure_name = system.structure_name
        if "bos_name" in update_data and system.bos_name:
            q.bos_name = system.bos_name

    db.commit()
    db.refresh(system)

    res = SolarSystemResponse.from_orm(system)
    if system.created_by:
        res.created_by_name = system.created_by.full_name
    res.quotations_count = db.query(Quotation).filter(
        Quotation.system_id == system.id,
        Quotation.company_id == company.id
    ).count()
    return res

@router.delete("/{system_id}")
def delete_solar_system(
    system_id: int,
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    system = db.query(SolarSystem).filter(
        SolarSystem.id == system_id,
        SolarSystem.company_id == company.id
    ).first()

    if not system:
        raise HTTPException(status_code=404, detail="Solar system not found")

    # Business Rule: Do not delete a system referenced by existing quotations without handling those references safely.
    # Preserve existing quotations and their saved product details & pricing!
    referenced_quotes = db.query(Quotation).filter(
        Quotation.system_id == system.id,
        Quotation.company_id == company.id
    ).all()

    quote_count = len(referenced_quotes)
    for q in referenced_quotes:
        # Detach foreign key reference while preserving all saved snapshot specs
        q.system_id = None

    db.delete(system)
    db.commit()

    return {
        "success": True,
        "message": f"Solar system '{system.system_name}' deleted successfully. {quote_count} existing quotation(s) safely preserved."
    }
