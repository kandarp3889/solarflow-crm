from typing import Dict, Any, List
import math

class AIAssistantService:
    """
    Solar CRM AI Assistant Service with pluggable provider architecture.
    Provides automated lead qualification, sizing prediction, personalized WhatsApp outreach,
    and proposal executive summaries.
    """

    @staticmethod
    def qualify_lead(lead: Dict[str, Any]) -> Dict[str, Any]:
        bill = float(lead.get("monthly_bill") or 0)
        roof = float(lead.get("roof_area_sqft") or 0)
        p_type = lead.get("property_type") or "Residential"
        source = lead.get("lead_source") or "Website"

        # Calculate optimal solar system size
        # Rule of thumb: Bill / (4 units/day * 30 days * ₹8/unit)
        suggested_kw = round(max(1.0, bill / 960.0), 1) if bill > 0 else 5.0
        min_roof_needed = suggested_kw * 100.0 # 100 sqft per kW

        reasons = []
        if bill >= 5000:
            reasons.append(f"High monthly electricity expenditure (₹{bill:,.0f}) yields rapid payback under 3.5 years.")
        else:
            reasons.append(f"Moderate electricity consumption; 2-3 kW system qualifies for maximum tier-1 rooftop subsidy.")

        if roof >= min_roof_needed and roof > 0:
            reasons.append(f"Roof area ({roof:,.0f} sq.ft) comfortably accommodates the recommended {suggested_kw} kW array.")
        elif roof > 0:
            reasons.append(f"Limited roof space ({roof:,.0f} sq.ft) requires high-efficiency Mono PERC / TOPCon 550W+ bifacial panels.")
        else:
            reasons.append("Roof inspection needed during site survey to confirm shadow-free azimuth.")

        if "referral" in source.lower():
            reasons.append("High-intent referral channel with 3.2x higher conversion probability.")

        key_selling_points = [
            f"Zero electricity bills for the next 25 years with guaranteed performance.",
            f"Direct Central Government Subsidy of up to ₹78,000 applicable on net metering.",
            f"Protection against annual DISCOM tariff hikes of 6-8%."
        ]

        recommended_action = "Schedule Site Survey" if bill >= 4000 else "Send Initial WhatsApp Proposal"

        score = int(lead.get("lead_score") or 75)
        category = "hot" if score >= 80 else ("warm" if score >= 50 else "cold")

        return {
            "score": score,
            "category": category,
            "reasons": reasons,
            "suggested_system_size_kw": suggested_kw,
            "recommended_action": recommended_action,
            "key_selling_points": key_selling_points
        }

    @staticmethod
    def generate_whatsapp_pitch(lead: Dict[str, Any], purpose: str = "initial_pitch") -> str:
        name = lead.get("full_name") or "Valued Customer"
        kw = lead.get("recommended_kw") or lead.get("interested_kw") or 5.0
        bill = lead.get("monthly_bill") or 6000

        if purpose == "initial_pitch":
            return (
                f"Hello {name}! 👋 Thank you for connecting with True Sun Energy (Mangrol, Gujarat).\n\n"
                f"Based on your monthly electricity bill of approx ₹{bill:,.0f}, a {kw}kW rooftop solar system can "
                f"reduce your electricity bills by up to 90% and make you eligible for up to ₹78,000 government subsidy under PM Surya Ghar Yojana! ☀️\n\n"
                f"Would you be open for a free technical site visit by our team this week?"
            )
        elif purpose == "survey_confirmation":
            return (
                f"Hi {name}, our True Sun Energy survey engineer is scheduled to inspect your rooftop for the {kw}kW solar installation. "
                f"We will assess your shadow-free roof area, structural load, and DISCOM meter connection to prepare an exact 3D solar layout. See you soon!"
            )
        elif purpose == "quotation_followup":
            return (
                f"Hello {name}! ☀️ We've prepared your custom True Sun Energy project proposal for the {kw}kW rooftop system. "
                f"It includes Tier-1 Mono PERC panels (Adani/Waaree), a 25-year warranty, and an estimated monthly savings of ₹{kw * 950:,.0f}. "
                f"Can I share the quotation PDF with you on WhatsApp right now?"
            )
        else:
            return (
                f"Hi {name}, following up on your rooftop solar installation with True Sun Energy. "
                f"We have exciting subsidy benefits (up to ₹78,000 DBT) and low-interest solar rooftop financing options available. Let us know if you have any questions!"
            )

    @staticmethod
    def summarize_lead(lead: Dict[str, Any], activities: List[Dict[str, Any]], notes: List[Dict[str, Any]]) -> Dict[str, Any]:
        name = lead.get("full_name") or "Lead"
        stage = lead.get("stage") or "new_lead"
        kw = lead.get("recommended_kw") or 5.0
        bill = lead.get("monthly_bill") or 0

        summary = (
            f"{name} is exploring a {kw}kW solar installation (monthly bill: ₹{bill:,.0f}). "
            f"Currently in the '{stage.replace('_', ' ').title()}' stage with {len(activities)} logged activities "
            f"and {len(notes)} sales notes."
        )

        if stage in ["new_lead", "contacted"]:
            next_step = "Qualify requirement and schedule technical roof site survey."
            urgency = "High (New Lead window < 24 hrs)"
        elif stage in ["survey_scheduled", "survey_completed"]:
            next_step = "Review roof measurements and generate customized quotation with subsidy calculation."
            urgency = "Medium"
        elif stage in ["quotation_sent", "negotiation"]:
            next_step = "Follow up with customer regarding quotation savings, financing options, and discount incentive."
            urgency = "Urgent"
        else:
            next_step = "Maintain regular touchpoint or referral request."
            urgency = "Normal"

        return {
            "summary": summary,
            "next_best_step": next_step,
            "urgency": urgency
        }
