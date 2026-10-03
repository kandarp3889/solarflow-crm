import sys
from fastapi.testclient import TestClient
from app.main import app

def test_manual_system_size():
    print("=" * 60)
    print("TESTING MANUAL SYSTEM SIZE (kW) FIELD IN LEADS CRM")
    print("=" * 60)

    client = TestClient(app)
    login_res = client.post('/api/auth/login', data={'username': 'admin@truesunenergy.in', 'password': 'SolarAdmin123!'})
    assert login_res.status_code == 200, f'Login failed: {login_res.text}'
    token = login_res.json()['access_token']
    headers = {'Authorization': f'Bearer {token}'}

    # 1. Create lead with decimal system size 1.9 kW and monthly_bill 4500
    # Must NOT overwrite 1.9 with any bill-based calculation
    print("\n1. Testing Add Lead with 1.9 kW...")
    payload_1 = {
        'full_name': 'Manual KW Test 1.9',
        'phone': '+91 99999 19000',
        'monthly_bill': 4500,
        'system_size_kw': 1.9,
        'property_type': 'Residential',
        'city': 'Surat',
        'state': 'Gujarat'
    }
    create_res1 = client.post('/api/leads', headers=headers, json=payload_1)
    assert create_res1.status_code == 200, f'Create lead failed: {create_res1.text}'
    lead1 = create_res1.json()
    assert lead1['system_size_kw'] == 1.9, f"Expected system_size_kw=1.9, got {lead1['system_size_kw']}"
    assert lead1['recommended_kw'] == 1.9, f"Expected recommended_kw=1.9, got {lead1['recommended_kw']}"
    lead1_id = lead1['id']
    print(f"  [PASS] Lead created successfully: ID {lead1_id}, system_size_kw={lead1['system_size_kw']} kW")

    # 2. Create lead with recommended_kw = 3.6 kW
    print("\n2. Testing Add Lead with 3.6 kW (via recommended_kw)...")
    payload_2 = {
        'full_name': 'Manual KW Test 3.6',
        'phone': '+91 99999 36000',
        'monthly_bill': 6000,
        'recommended_kw': 3.6,
        'property_type': 'Residential'
    }
    create_res2 = client.post('/api/leads', headers=headers, json=payload_2)
    assert create_res2.status_code == 200, f'Create lead failed: {create_res2.text}'
    lead2 = create_res2.json()
    assert lead2['system_size_kw'] == 3.6, f"Expected system_size_kw=3.6, got {lead2['system_size_kw']}"
    assert lead2['recommended_kw'] == 3.6, f"Expected recommended_kw=3.6, got {lead2['recommended_kw']}"
    lead2_id = lead2['id']
    print(f"  [PASS] Lead created successfully: ID {lead2_id}, system_size_kw={lead2['system_size_kw']} kW")

    # 3. Create lead with 6.6 kW
    print("\n3. Testing Add Lead with 6.6 kW...")
    payload_3 = {
        'full_name': 'Manual KW Test 6.6',
        'phone': '+91 99999 66000',
        'monthly_bill': 12000,
        'system_size_kw': 6.6,
        'property_type': 'Residential'
    }
    create_res3 = client.post('/api/leads', headers=headers, json=payload_3)
    assert create_res3.status_code == 200, f'Create lead failed: {create_res3.text}'
    lead3 = create_res3.json()
    assert lead3['system_size_kw'] == 6.6
    print(f"  [PASS] Lead created with 6.6 kW: ID {lead3['id']}")

    # 4. Update Lead: Edit Lead 1 from 1.9 kW to 10.5 kW
    print("\n4. Testing Edit Lead (updating 1.9 kW -> 10.5 kW)...")
    update_res = client.put(f'/api/leads/{lead1_id}', headers=headers, json={
        'system_size_kw': 10.5,
        'monthly_bill': 9000
    })
    assert update_res.status_code == 200, f'Update failed: {update_res.text}'
    updated_lead1 = update_res.json()
    assert updated_lead1['system_size_kw'] == 10.5, f"Expected 10.5, got {updated_lead1['system_size_kw']}"
    assert updated_lead1['recommended_kw'] == 10.5, f"Expected 10.5, got {updated_lead1['recommended_kw']}"
    print(f"  [PASS] Lead updated successfully: system_size_kw={updated_lead1['system_size_kw']} kW")

    # 5. Fetch Lead via GET /api/leads/{id} and confirm persistent value
    print("\n5. Verifying persistence via GET /api/leads/{id}...")
    fetch_res = client.get(f'/api/leads/{lead1_id}', headers=headers)
    assert fetch_res.status_code == 200
    fetched_data = fetch_res.json()
    assert fetched_data['system_size_kw'] == 10.5
    assert fetched_data['recommended_kw'] == 10.5
    print("  [PASS] Fetched lead matches updated value: 10.5 kW")

    # 6. Verify in GET /api/leads table listing
    print("\n6. Verifying in GET /api/leads table listing...")
    list_res = client.get('/api/leads', headers=headers)
    assert list_res.status_code == 200
    leads_list = list_res.json()
    found_1 = next((l for l in leads_list if l['id'] == lead1_id), None)
    assert found_1 is not None
    assert found_1['system_size_kw'] == 10.5
    assert found_1['recommended_kw'] == 10.5
    print("  [PASS] Found in leads table list with correct system size 10.5 kW")

    # 7. Validation test: negative kW should fail with 422
    print("\n7. Testing negative validation (should be rejected with 422)...")
    invalid_res = client.post('/api/leads', headers=headers, json={
        'full_name': 'Invalid Negative KW',
        'phone': '+91 99999 00000',
        'system_size_kw': -3.5
    })
    assert invalid_res.status_code == 422, f"Expected 422 for negative kW, got {invalid_res.status_code}"
    print(f"  [PASS] Negative kW properly rejected with status code 422")

    # 8. Test Quotation with decimal kW (e.g. 1.9 kW)
    print("\n8. Testing Quotation Calculation for 1.9 kW...")
    quote_res = client.post('/api/quotations/calculate', headers=headers, json={
        'system_size_kw': 1.9,
        'panel_brand': 'Tata Power Solar',
        'inverter_brand': 'Growatt'
    })
    assert quote_res.status_code == 200, f"Quote calculation failed: {quote_res.text}"
    quote_calc = quote_res.json()
    assert quote_calc['system_size_kw'] == 1.9
    print(f"  [PASS] Quotation calculated for 1.9 kW: final_price={quote_calc['final_price']}, subsidy={quote_calc['subsidy_amount']}")

    # 9. Clean up test leads
    client.delete(f'/api/leads/{lead1_id}', headers=headers)
    client.delete(f'/api/leads/{lead2_id}', headers=headers)
    client.delete(f'/api/leads/{lead3["id"]}', headers=headers)
    print("\n  [CLEANUP] Deleted test leads.")

    print("\n" + "=" * 60)
    print("ALL MANUAL SYSTEM SIZE TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == '__main__':
    test_manual_system_size()
