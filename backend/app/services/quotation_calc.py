import math
from typing import Dict, Any

def calculate_solar_quotation(
    system_size_kw: float,
    panel_cost_per_watt: float = 28.0,
    panel_wattage: int = 550,
    inverter_cost: float = 45000.0,
    battery_cost: float = 0.0,
    structure_cost: float = 20000.0,
    installation_cost: float = 25000.0,
    other_costs: float = 5000.0,
    discount: float = 5000.0,
    gst_rate: float = 13.8,
    apply_subsidy: bool = True
) -> Dict[str, Any]:
    """
    Real-time Solar Quotation Formula:
    1. Panels Needed = ceil(kW * 1000 / Panel Wattage)
    2. Panel Total Cost = kW * 1000 * Panel Cost per Watt
    3. Hardware Base = Panels Cost + Inverter + Battery + Structure
    4. Subtotal = Hardware Base + Installation + Other - Discount
    5. GST Amount = Subtotal * (GST Rate / 100)
    6. Subsidy (e.g. PM Surya Ghar Central Subsidy rules):
       - 1 kW: ₹30,000
       - 2 kW: ₹60,000
       - >= 3 kW: ₹78,000
    7. Final Customer Price = Subtotal + GST Amount - Subsidy
    """
    kw = max(0.1, float(system_size_kw))
    wattage = max(300, int(panel_wattage))
    panel_quantity = math.ceil((kw * 1000.0) / wattage)

    panel_total_cost = kw * 1000.0 * float(panel_cost_per_watt)
    system_hardware_price = round(panel_total_cost + inverter_cost + battery_cost + structure_cost, 2)
    
    subtotal = round(system_hardware_price + installation_cost + other_costs - discount, 2)
    gst_amount = round(subtotal * (gst_rate / 100.0), 2)

    subsidy_amount = 0.0
    if apply_subsidy:
        if kw >= 3.0:
            subsidy_amount = 78000.0
        elif kw >= 2.0:
            subsidy_amount = 60000.0
        elif kw >= 1.0:
            subsidy_amount = 30000.0
        else:
            subsidy_amount = kw * 30000.0

    final_price = round(max(0.0, subtotal + gst_amount - subsidy_amount), 2)

    # Solar ROI Estimations
    monthly_generation_kwh = round(kw * 120.0, 1) # Approx 4 units/kW/day * 30 days
    tariff_per_unit = 8.0 # Approx grid rate
    monthly_savings = round(monthly_generation_kwh * tariff_per_unit, 2)
    annual_savings = monthly_savings * 12.0

    payback_years = round(final_price / annual_savings, 1) if annual_savings > 0 else 4.0

    return {
        "system_size_kw": kw,
        "panel_quantity": panel_quantity,
        "system_price": system_hardware_price,
        "installation_cost": installation_cost,
        "other_costs": other_costs,
        "discount": discount,
        "subtotal": subtotal,
        "gst_rate": gst_rate,
        "gst_amount": gst_amount,
        "subsidy_amount": subsidy_amount,
        "final_price": final_price,
        "monthly_generation_kwh": monthly_generation_kwh,
        "monthly_savings": monthly_savings,
        "payback_years": payback_years
    }
