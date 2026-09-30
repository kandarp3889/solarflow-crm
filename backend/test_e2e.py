import urllib.request
import json
import urllib.parse
import sys

sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://127.0.0.1:8000/api"

def make_req(endpoint, method="GET", data=None, headers=None):
    url = f"{BASE_URL}{endpoint}"
    req_headers = headers or {}
    req_data = None

    if data is not None:
        if isinstance(data, dict):
            req_data = json.dumps(data).encode("utf-8")
            req_headers["Content-Type"] = "application/json"
        elif isinstance(data, str):
            req_data = data.encode("utf-8")

    req = urllib.request.Request(url, data=req_data, headers=req_headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            content_type = resp.headers.get("Content-Type", "")
            if "application/json" in content_type:
                return resp.status, json.loads(resp.read().decode("utf-8"))
            return resp.status, resp.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        return e.code, body

def run_tests():
    print("========================================")
    print("RUNNING E2E API AUTOMATED TEST SUITE")
    print("========================================")

    # 1. Test Login
    login_data = urllib.parse.urlencode({
        "username": "admin@truesunenergy.in",
        "password": "SolarAdmin123!"
    })
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    status, res = make_req("/auth/login", method="POST", data=login_data, headers=headers)
    assert status == 200, f"Login failed: {res}"
    token = res["access_token"]
    auth_headers = {"Authorization": f"Bearer {token}"}
    print("[PASS] Authentication & JWT Login: Verified")

    # 2. Test Dashboard Stats
    status, stats = make_req("/dashboard/stats", headers=auth_headers)
    assert status == 200
    assert "total_leads" in stats
    assert "expected_revenue" in stats
    print(f"[PASS] Dashboard KPIs: Verified ({stats['total_leads']['value']} leads, Pipeline: {stats['total_pipeline_value']['value']})")

    # 3. Test Dashboard Trend, Sources, Funnel, Revenue
    status, trend = make_req("/dashboard/trend?days=30", headers=auth_headers)
    assert status == 200 and len(trend) > 0
    status, sources = make_req("/dashboard/lead-sources", headers=auth_headers)
    assert status == 200 and len(sources) > 0
    status, funnel = make_req("/dashboard/funnel", headers=auth_headers)
    assert status == 200 and len(funnel) == 7
    status, rev = make_req("/dashboard/revenue", headers=auth_headers)
    assert status == 200 and len(rev) == 6
    print("[PASS] Dashboard Charts (Trend, Sources Donut, Funnel, Revenue): Verified")

    # 4. Test Lead Creation & Scoring
    new_lead_payload = {
        "full_name": "Test Solar Customer",
        "phone": "+91 99887 76655",
        "email": "test.solar@example.com",
        "city": "Bengaluru",
        "property_type": "Residential",
        "monthly_bill": 8500.0,
        "recommended_kw": 8.0,
        "roof_type": "Concrete Flat",
        "roof_area_sqft": 900.0,
        "lead_source": "WhatsApp",
        "battery_required": True
    }
    status, lead = make_req("/leads", method="POST", data=new_lead_payload, headers=auth_headers)
    assert status == 200
    lead_id = lead["id"]
    assert lead["lead_score"] >= 80, f"Score was {lead['lead_score']}, expected hot"
    assert lead["score_category"] == "hot"
    print(f"[PASS] Lead Creation & Smart Scoring: Verified ({lead['lead_id']}, Score: {lead['lead_score']} HOT)")

    # 5. Test Add Note on Lead
    status, note = make_req(f"/leads/{lead_id}/notes", method="POST", data={"content": "Customer requested 8kW rooftop with 10kWh battery."}, headers=auth_headers)
    assert status == 200
    print("[PASS] Lead Activity & Notes Logging: Verified")

    # 6. Test Pipeline Kanban Movement
    status, moved = make_req("/pipeline/move-card", method="PATCH", data={"lead_id": lead_id, "new_stage": "qualified"}, headers=auth_headers)
    assert status == 200
    assert moved["stage"] == "qualified"
    print("[PASS] Pipeline Card Movement: Verified (Moved to Qualified)")

    # 7. Test Quotation Formula Calculation
    calc_payload = {
        "system_size_kw": 5.0,
        "panel_cost_per_watt": 28.0,
        "panel_wattage": 550,
        "inverter_cost": 45000.0,
        "battery_cost": 0.0,
        "structure_cost": 20000.0,
        "installation_cost": 25000.0,
        "other_costs": 5000.0,
        "discount": 5000.0,
        "gst_rate": 13.8,
        "apply_subsidy": True
    }
    status, quote_calc = make_req("/quotations/calculate", method="POST", data=calc_payload, headers=auth_headers)
    assert status == 200
    expected_subsidy = 78000.0
    assert quote_calc["subsidy_amount"] == expected_subsidy
    # Verify final price formula
    assert quote_calc["final_price"] == round(quote_calc["subtotal"] + quote_calc["gst_amount"] - quote_calc["subsidy_amount"], 2)
    print(f"[PASS] Quotation Calculation Engine: Verified (Final Price: ₹{quote_calc['final_price']:,} with ₹{quote_calc['subsidy_amount']:,} Subsidy)")

    # 8. Test AI Assistant Endpoints
    status, ai_qual = make_req("/ai/qualify-lead", method="POST", data={"lead_id": lead_id}, headers=auth_headers)
    assert status == 200 and "suggested_system_size_kw" in ai_qual
    status, ai_wa = make_req("/ai/generate-whatsapp", method="POST", data={"lead_id": lead_id, "purpose": "initial_pitch"}, headers=auth_headers)
    assert status == 200 and "message" in ai_wa
    status, ai_sum = make_req("/ai/summarize-proposal", method="POST", data={"lead_id": lead_id}, headers=auth_headers)
    assert status == 200 and "summary" in ai_sum
    print("[PASS] AI Assistant (Qualification, WhatsApp Pitch, Proposal Summary): Verified")

    # 9. Test Follow-ups Creation & Complete
    status, f_up = make_req("/followups", method="POST", data={
        "lead_id": lead_id,
        "follow_up_type": "call",
        "scheduled_date": "2026-09-20T14:00:00",
        "notes": "Follow-up on subsidy eligibility"
    }, headers=auth_headers)
    assert status == 200
    f_id = f_up["id"]
    status, _ = make_req(f"/followups/{f_id}/complete", method="PATCH", headers=auth_headers)
    assert status == 200
    print("[PASS] Follow-up Workflow & Completion: Verified")

    # 10. Test Reports CSV Export
    status, csv_data = make_req("/reports/leads/export", headers=auth_headers)
    assert status == 200 and "id" in csv_data
    print("[PASS] CSV Report Export: Verified")

    print("========================================")
    print("ALL 10 TEST SUITES PASSED FLAWLESSLY!")
    print("========================================")

if __name__ == "__main__":
    run_tests()
