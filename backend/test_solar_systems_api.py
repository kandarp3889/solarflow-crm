import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from app.main import app
from app.database import get_db, SessionLocal
from app.models.models import User, Company, SolarSystem, Quotation
from app.security import create_access_token

client = TestClient(app)

def run_tests():
    print("=== Testing Solar Systems Module ===")
    
    # 1. Setup authenticated session
    db = SessionLocal()
    user = db.query(User).filter(User.email == "admin@truesun.in").first()
    if not user:
        # Fallback to any user
        user = db.query(User).first()
    assert user is not None, "A user must exist in the database for auth"
    
    token = create_access_token(data={"sub": str(user.id), "company_id": user.company_id, "role": user.role})
    headers = {"Authorization": f"Bearer {token}"}
    print(f"Authenticated as {user.email} (Role: {user.role}, Company ID: {user.company_id})")
    
    # 2. Test GET /api/solar-systems
    res = client.get("/api/solar-systems", headers=headers)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    systems = res.json()
    print(f"GET /api/solar-systems returned {len(systems)} systems")
    assert len(systems) >= 4, f"Expected at least 4 seeded systems, got {len(systems)}"
    
    system_names = [s["system_name"] for s in systems]
    print(f"Existing systems: {system_names}")
    assert any("Tata Power" in name for name in system_names), "Tata Power system should be present"
    assert any("Adani Solar" in name for name in system_names), "Adani Solar system should be present"
    
    # 3. Test POST /api/solar-systems with decimal capacity (e.g., 7.2 kW)
    new_system_payload = {
        "system_name": "Vikram Solar Commercial Ultra",
        "base_price": 315000.0,
        "capacity_kw": 7.2,
        "solar_panel_name": "Vikram Solar Somera 550W Mono PERC",
        "inverter_name": "Sungrow 7.5kW Three Phase Grid-Tie",
        "structure_name": "High-Grade Pre-Galvanized Elevated Truss",
        "bos_name": "Heavy-Duty IP65 ACDB/DCDB, 6 sq.mm Copper Solar Wire, Pure Cu Earthing",
        "quantity": 15,
        "warranty": "27 Years Linear Panel Performance, 8 Years Inverter, 12 Years Structure",
        "subsidy": 78000.0,
        "description": "Commercial / large residential system designed for high solar harvest."
    }
    
    res = client.post("/api/solar-systems", json=new_system_payload, headers=headers)
    assert res.status_code == 201, f"Expected 201 created, got {res.status_code}: {res.text}"
    created_system = res.json()
    sys_id = created_system["id"]
    print(f"Created system #{sys_id}: {created_system['system_name']} ({created_system['capacity_kw']} kW)")
    assert created_system["capacity_kw"] == 7.2
    assert created_system["base_price"] == 315000.0
    assert created_system["quantity"] == 15
    assert created_system["subsidy"] == 78000.0
    
    # 4. Test validation: negative price or capacity <= 0
    bad_payload = new_system_payload.copy()
    bad_payload["capacity_kw"] = -1.5
    res = client.post("/api/solar-systems", json=bad_payload, headers=headers)
    assert res.status_code == 422, f"Expected 422 for negative capacity, got {res.status_code}"
    print("Validation passed: negative capacity rejected")
    
    bad_payload2 = new_system_payload.copy()
    bad_payload2["base_price"] = -500
    res = client.post("/api/solar-systems", json=bad_payload2, headers=headers)
    assert res.status_code == 422, f"Expected 422 for negative price, got {res.status_code}"
    print("Validation passed: negative price rejected")

    # 5. Test PUT /api/solar-systems/{id}
    update_payload = {
        "base_price": 320000.0,
        "quantity": 18,
        "subsidy": 78000.0
    }
    res = client.put(f"/api/solar-systems/{sys_id}", json=update_payload, headers=headers)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    updated = res.json()
    assert updated["base_price"] == 320000.0
    assert updated["quantity"] == 18
    print(f"Updated system #{sys_id} successfully")
    
    # 6. Test Quotation creation using this configured system
    # Check if a lead exists, else create one
    from app.models.models import Lead, LeadStage
    lead = db.query(Lead).first()
    if not lead:
        company = db.query(Company).first()
        lead = Lead(
            first_name="Test",
            last_name="Customer",
            phone="9876543210",
            email="testcustomer@example.com",
            company_id=company.id if company else 1,
            stage=LeadStage.NEW_LEAD,
            system_size_kw=7.2
        )
        db.add(lead)
        db.commit()
        db.refresh(lead)
    assert lead is not None, "Lead must exist to attach quote"
    
    quote_payload = {
        "lead_id": lead.id,
        "system_id": sys_id,
        "system_size_kw": 7.2,
        "panel_brand": "Vikram Solar",
        "inverter_brand": "Sungrow",
        "installation_cost": 30000.0,
        "other_costs": 5000.0,
        "discount": 10000.0,
        "subsidy_amount": 78000.0,
        "notes": "Testing quotation linked to configured solar system."
    }
    res = client.post("/api/quotations", json=quote_payload, headers=headers)
    assert res.status_code in (200, 201), f"Expected 200/201, got {res.status_code}: {res.text}"
    quote = res.json()
    quote_id = quote["id"]
    print(f"Created quotation #{quote_id} with quotation_number={quote.get('quotation_number')}")
    assert quote["system_id"] == sys_id
    assert quote["system_name"] == "Vikram Solar Commercial Ultra"
    assert quote["system_size_kw"] == 7.2
    assert quote["system_price"] == 320000.0
    assert quote["solar_panel_name"] == "Vikram Solar Somera 550W Mono PERC"
    assert quote["inverter_name"] == "Sungrow 7.5kW Three Phase Grid-Tie"
    assert quote["structure_name"] == "High-Grade Pre-Galvanized Elevated Truss"
    assert quote["bos_name"] == "Heavy-Duty IP65 ACDB/DCDB, 6 sq.mm Copper Solar Wire, Pure Cu Earthing"
    assert quote["warranty"] == "27 Years Linear Panel Performance, 8 Years Inverter, 12 Years Structure"
    assert quote["subsidy_amount"] == 78000.0
    print("Quotation successfully auto-populated all 9 system specifications!")
    
    # 7. Test Safe Deletion:
    # Delete the solar system #{sys_id}
    res = client.delete(f"/api/solar-systems/{sys_id}", headers=headers)
    assert res.status_code in (200, 204), f"Expected 200/204, got {res.status_code}: {res.text}"
    print(f"System #{sys_id} deleted from catalog. Response: {res.json() if res.status_code == 200 else '204'}")
    
    # Verify system is gone from /api/solar-systems
    res = client.get(f"/api/solar-systems/{sys_id}", headers=headers)
    assert res.status_code == 404, f"Expected 404, got {res.status_code}"
    
    # Verify that quotation #{quote_id} is STILL INTACT with all its saved details!
    res = client.get(f"/api/quotations/{quote_id}", headers=headers)
    assert res.status_code == 200, f"Expected 200 for existing quote, got {res.status_code}"
    preserved_quote = res.json()
    assert preserved_quote["id"] == quote_id
    assert preserved_quote["system_id"] is None, "system_id should be safely set to None"
    assert preserved_quote["system_name"] == "Vikram Solar Commercial Ultra", "system_name must be preserved!"
    assert preserved_quote["system_size_kw"] == 7.2, "system_size_kw must be preserved!"
    assert preserved_quote["system_price"] == 320000.0, "system_price must be preserved!"
    assert preserved_quote["solar_panel_name"] == "Vikram Solar Somera 550W Mono PERC", "panel name must be preserved!"
    assert preserved_quote["inverter_name"] == "Sungrow 7.5kW Three Phase Grid-Tie", "inverter name must be preserved!"
    assert preserved_quote["structure_name"] == "High-Grade Pre-Galvanized Elevated Truss", "structure name must be preserved!"
    assert preserved_quote["subsidy_amount"] == 78000.0, "subsidy amount must be preserved!"
    print("Safe deletion test passed: Quotation preserved all pricing and specifications intact!")
    
    # Cleanup test quote
    client.delete(f"/api/quotations/{quote_id}", headers=headers)
    db.close()
    print("=== All Solar System Module Tests Passed Successfully! ===")

if __name__ == "__main__":
    run_tests()
