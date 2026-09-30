import math
from typing import Tuple

def calculate_lead_score(
    monthly_bill: float = 0.0,
    roof_area_sqft: float = 0.0,
    system_size_kw: float = 0.0,
    property_type: str = "Residential",
    lead_source: str = "Website",
    battery_required: bool = False,
    ev_requirement: bool = False,
    hot_threshold: int = 80,
    warm_threshold: int = 50
) -> Tuple[int, str]:
    """
    Calculate an intelligent, transparent solar lead score between 0 and 100.
    Returns (score, category: 'hot' | 'warm' | 'cold')
    """
    score = 0

    # 1. Electricity Bill (High bills mean rapid ROI for solar) - Max 30 points
    if monthly_bill >= 12000:
        score += 30
    elif monthly_bill >= 7000:
        score += 25
    elif monthly_bill >= 4000:
        score += 20
    elif monthly_bill >= 2000:
        score += 15
    elif monthly_bill > 0:
        score += 10

    # 2. System Size (kW) - Max 20 points
    effective_kw = system_size_kw if system_size_kw > 0 else (monthly_bill / 800 if monthly_bill else 3.0)
    if effective_kw >= 20: # Commercial/Industrial big ticket
        score += 20
    elif effective_kw >= 5: # Ideal residential sweet spot
        score += 18
    elif effective_kw >= 3:
        score += 15
    elif effective_kw > 0:
        score += 10

    # 3. Available Roof Space - Max 20 points
    if roof_area_sqft >= 1500:
        score += 20
    elif roof_area_sqft >= 700:
        score += 16
    elif roof_area_sqft >= 350:
        score += 12
    elif roof_area_sqft > 0:
        score += 8
    else:
        # If roof area not yet provided, assign neutral 10
        score += 10

    # 4. Property Ownership & Type - Max 15 points
    p_type = (property_type or "").lower()
    if "commercial" in p_type or "industrial" in p_type:
        score += 15
    elif "residential" in p_type:
        score += 12
    else:
        score += 8

    # 5. Lead Source Credibility - Max 10 points
    src = (lead_source or "").lower()
    if "referral" in src:
        score += 10
    elif "whatsapp" in src or "phone" in src:
        score += 9
    elif "google" in src or "website" in src:
        score += 8
    elif "facebook" in src or "instagram" in src:
        score += 6
    else:
        score += 5

    # 6. High-Value Addons - Max 5 points
    if battery_required:
        score += 3
    if ev_requirement:
        score += 2

    # Clamp score between 0 and 100
    score = min(100, max(10, score))

    if score >= hot_threshold:
        category = "hot"
    elif score >= warm_threshold:
        category = "warm"
    else:
        category = "cold"

    return score, category
