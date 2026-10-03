import sys
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo
from fastapi.testclient import TestClient

from app.main import app
from app.core.timezone import (
    APP_TIMEZONE_NAME,
    IST,
    now_ist,
    now_ist_aware,
    to_ist_naive,
    to_ist_aware,
    serialize_ist,
    format_ist_date,
    format_ist_time,
    format_ist_datetime
)
from app.database import SessionLocal
from app.models.models import User, Company, Lead, FollowUp, Notification
from app.schemas.schemas import LeadResponse

client = TestClient(app)

def test_timezone_utilities():
    print("Testing Timezone Core Helpers...")
    assert APP_TIMEZONE_NAME == "Asia/Kolkata", f"Expected Asia/Kolkata, got {APP_TIMEZONE_NAME}"
    
    current_ist = now_ist()
    current_ist_aware = now_ist_aware()
    
    # Check naive vs aware
    assert current_ist.tzinfo is None, "now_ist should return naive datetime for db compatibility"
    assert current_ist_aware.tzinfo is not None, "now_ist_aware should return timezone-aware datetime"
    assert str(current_ist_aware.tzinfo) == "Asia/Kolkata"

    # Test UTC conversion to IST
    # 05:00 UTC = 10:30 IST (+5:30)
    utc_dt = datetime(2026, 10, 3, 5, 0, 0, tzinfo=timezone.utc)
    ist_converted = to_ist_naive(utc_dt)
    assert ist_converted.year == 2026
    assert ist_converted.month == 10
    assert ist_converted.day == 3
    assert ist_converted.hour == 10
    assert ist_converted.minute == 30
    assert ist_converted.tzinfo is None

    # Test serializer
    ser = serialize_ist(current_ist)
    assert "+05:30" in ser, f"Expected +05:30 in serialized string, got {ser}"
    
    # Test formatting
    test_dt = datetime(2026, 10, 3, 15, 45, 0)
    assert format_ist_date(test_dt) == "03-10-2026", f"Got {format_ist_date(test_dt)}"
    assert format_ist_time(test_dt) == "03:45 PM", f"Got {format_ist_time(test_dt)}"
    assert format_ist_datetime(test_dt) == "03-10-2026, 03:45 PM", f"Got {format_ist_datetime(test_dt)}"
    print("[PASS] Timezone core helpers verified.")

def test_database_and_api_ist_flow():
    print("Testing Database and API IST Serialization Flow...")
    # Login admin
    login_res = client.post("/api/auth/login", data={"username": "admin@truesunenergy.in", "password": "SolarAdmin123!"})
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create a lead with next_follow_up_date
    lead_payload = {
        "full_name": "IST Test Customer",
        "phone": "+919876543210",
        "email": "ist_test@example.com",
        "city": "Ahmedabad",
        "state": "Gujarat",
        "roof_area_sqft": 1200,
        "monthly_bill": 4500,
        "next_follow_up_date": "2026-10-05T14:30:00+05:30"
    }
    create_res = client.post("/api/leads", json=lead_payload, headers=headers)
    assert create_res.status_code == 200, f"Create lead failed: {create_res.text}"
    lead_data = create_res.json()
    lead_id = lead_data["id"]

    try:
        # Verify created_at and next_follow_up_date in API response
        created_at_str = lead_data["created_at"]
        follow_up_str = lead_data["next_follow_up_date"]
        
        assert "+05:30" in created_at_str, f"created_at must include +05:30 offset: {created_at_str}"
        assert "+05:30" in follow_up_str, f"next_follow_up_date must include +05:30 offset: {follow_up_str}"
        assert "2026-10-05T14:30:00" in follow_up_str, f"Preserved IST time value failed: {follow_up_str}"
        print(f"[PASS] Lead timestamps serialized with IST offset: created_at={created_at_str}, next_follow_up_date={follow_up_str}")

        # 2. Create a follow-up for this lead
        followup_payload = {
            "lead_id": lead_id,
            "follow_up_type": "call",
            "scheduled_date": "2026-10-05T15:00:00+05:30",
            "notes": "Discuss 5kW solar proposal in IST"
        }
        fu_res = client.post("/api/followups", json=followup_payload, headers=headers)
        assert fu_res.status_code == 200 or fu_res.status_code == 201, f"Create followup failed: {fu_res.text}"
        fu_data = fu_res.json()
        assert "+05:30" in fu_data["scheduled_date"], f"followup scheduled_date must include +05:30: {fu_data['scheduled_date']}"
        assert "2026-10-05T15:00:00" in fu_data["scheduled_date"], f"Expected 15:00:00, got {fu_data['scheduled_date']}"
        print(f"[PASS] Follow-up scheduled date preserved in IST: {fu_data['scheduled_date']}")

        # 3. Create a quotation
        quote_payload = {
            "lead_id": lead_id,
            "system_size_kw": 5.0,
            "panel_brand": "Waaree 540W Mono PERC",
            "panel_wattage": 540,
            "panel_quantity": 10,
            "inverter_brand": "Growatt 5kW",
            "inverter_capacity": "5 kW On-Grid",
            "structure_type": "Elevated GI Structure",
            "system_price": 250000,
            "installation_cost": 25000,
            "discount": 5000,
            "gst_rate": 13.8,
            "subsidy_amount": 78000
        }
        q_res = client.post("/api/quotations", json=quote_payload, headers=headers)
        assert q_res.status_code == 200 or q_res.status_code == 201, f"Create quotation failed: {q_res.text}"
        q_data = q_res.json()
        assert "+05:30" in q_data["created_at"], f"Quotation created_at must have +05:30: {q_data['created_at']}"
        assert "+05:30" in q_data["valid_until"], f"Quotation valid_until must have +05:30: {q_data['valid_until']}"
        print(f"[PASS] Quotation dates serialized with IST offset: created_at={q_data['created_at']}, valid_until={q_data['valid_until']}")

        # 4. Verify notifications
        notif_res = client.get("/api/notifications", headers=headers)
        assert notif_res.status_code == 200, f"Get notifications failed: {notif_res.text}"
        notifs = notif_res.json()
        if notifs:
            first_notif = notifs[0]
            assert "+05:30" in first_notif["created_at"], f"Notification created_at must include +05:30: {first_notif['created_at']}"
            print(f"[PASS] Notification timestamp serialized with IST offset: {first_notif['created_at']}")

    finally:
        # Cleanup
        client.delete(f"/api/leads/{lead_id}", headers=headers)
        print("[PASS] Cleaned up test lead and related records.")

if __name__ == "__main__":
    print("=" * 50)
    print("RUNNING IST TIMEZONE COMPREHENSIVE TEST SUITE")
    print("=" * 50)
    test_timezone_utilities()
    test_database_and_api_ist_flow()
    print("=" * 50)
    print("ALL IST TIMEZONE TESTS PASSED PERFECTLY!")
    print("=" * 50)
