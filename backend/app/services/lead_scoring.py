import math
from typing import Tuple

def calculate_lead_score(
    monthly_bill: float = 0.0,
    system_size_kw: float = 0.0,
    property_type: str = "Residential",
    lead_source: str = "Website",
    hot_threshold: int = 80,
    warm_threshold: int = 50
) -> Tuple[int, str]:
    """
    Calculate an intelligent, transparent solar lead score between 0 and 100.
    Returns (score, category: 'hot' | 'warm' | 'cold')
    """
    score = 0

    # 1. Electricity Bill (High bills mean rapid ROI for solar) - Max 40 points
    if monthly_bill >= 12000:
        score += 40
    elif monthly_bill >= 7000:
        score += 32
    elif monthly_bill >= 4000:
        score += 25
    elif monthly_bill >= 2000:
        score += 18
    elif monthly_bill > 0:
        score += 12

    # 2. System Size (kW) - Max 30 points
    effective_kw = system_size_kw if system_size_kw > 0 else (monthly_bill / 800 if monthly_bill else 3.0)
    if effective_kw >= 20: # Commercial/Industrial big ticket
        score += 30
    elif effective_kw >= 5: # Ideal residential sweet spot
        score += 25
    elif effective_kw >= 3:
        score += 20
    elif effective_kw > 0:
        score += 15

    # 3. Property Type - Max 20 points
    p_type = (property_type or "").lower()
    if "commercial" in p_type or "industrial" in p_type:
        score += 20
    elif "residential" in p_type:
        score += 16
    else:
        score += 10

    # 4. Lead Source Credibility - Max 10 points
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

    # Clamp score between 0 and 100
    score = min(100, max(10, score))

    if score >= hot_threshold:
        category = "hot"
    elif score >= warm_threshold:
        category = "warm"
    else:
        category = "cold"

    return score, category
