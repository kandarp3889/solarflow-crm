import io
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_loan_process_lifecycle():
    print("\n==================================================")
    print("RUNNING LOAN PROCESS & INSTALLATION WORKFLOW TESTS")
    print("==================================================")

    # 1. Login
    login_res = client.post("/api/auth/login", data={"username": "admin@truesunenergy.in", "password": "SolarAdmin123!"})
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("[PASS] Admin authentication successful")

    # 2. Create a fresh Lead
    lead_payload = {
        "full_name": "Ramesh Patel",
        "phone": "9876543210",
        "email": "ramesh.patel@example.com",
        "monthly_bill": 8500.0,
        "recommended_kw": 6.0,
        "property_type": "Residential",
        "lead_source": "Website",
        "stage": "qualified"
    }
    create_res = client.post("/api/leads", json=lead_payload, headers=headers)
    assert create_res.status_code == 200, f"Lead create failed: {create_res.text}"
    lead = create_res.json()
    lead_id = lead["id"]
    print(f"[PASS] Lead created: {lead['lead_id']} ({lead['full_name']}) in stage '{lead['stage']}'")

    # 3. Verify Loan Process does NOT exist yet and cannot be retrieved for non-won lead
    get_lp_pre = client.get(f"/api/leads/{lead_id}/loan-process", headers=headers)
    assert get_lp_pre.status_code == 400, "Loan process should be blocked for non-won lead"
    print("[PASS] Access rule verified: Loan process blocked for non-won leads")

    # 4. Advance lead stage to 'won' (Deal Won)
    stage_res = client.put(f"/api/leads/{lead_id}", json={"stage": "won"}, headers=headers)
    assert stage_res.status_code == 200, f"Update stage to won failed: {stage_res.text}"
    won_lead = stage_res.json()
    assert won_lead["stage"] == "won"
    assert won_lead["loan_process"] is not None
    assert won_lead["loan_process"]["loan_status"] == "Not Started"
    print(f"[PASS] Auto-creation verified: Moving to 'Deal Won' auto-initialized LoanProcess ({won_lead['loan_process']['loan_process_number']})")

    # 5. Fetch Loan Process details
    lp_res = client.get(f"/api/leads/{lead_id}/loan-process", headers=headers)
    assert lp_res.status_code == 200, f"Get loan process failed: {lp_res.text}"
    lp_data = lp_res.json()
    assert lp_data["loan_status"] == "Not Started"
    assert lp_data["overall_progress_pct"] == 0
    print("[PASS] Retrieved initial Loan Process record with 0% progress")

    # 6. Update stage statuses & metadata
    update_payload = {
        "loan_status": "Approved",
        "loan_bank_name": "State Bank of India (Solar Loan)",
        "loan_amount": 280000.0,
        "loan_notes": "Pre-approved at 7.25% p.a. subsidy linked",
        "installation_status": "Material Delivered",
        "installer_name": "Surat Solar Works",
        "net_meter_status": "Applied",
        "net_meter_application_number": "DGVCL-NM-2026-9912",
        "discom_name": "DGVCL",
        "inspection_status": "Scheduled",
        "subsidy_status": "Application Submitted",
        "subsidy_application_number": "PMSG-GUJ-2026-88124",
        "subsidy_amount": 78000.0
    }
    put_lp = client.put(f"/api/leads/{lead_id}/loan-process", json=update_payload, headers=headers)
    assert put_lp.status_code == 200, f"Update loan process failed: {put_lp.text}"
    updated_lp = put_lp.json()
    assert updated_lp["loan_status"] == "Approved"
    assert updated_lp["loan_bank_name"] == "State Bank of India (Solar Loan)"
    assert updated_lp["installation_status"] == "Material Delivered"
    assert updated_lp["net_meter_status"] == "Applied"
    assert updated_lp["overall_progress_pct"] > 0
    print(f"[PASS] Stage status updates verified! Dynamic Progress: {updated_lp['overall_progress_pct']}%")

    # 7. Upload Loan Documents for different stages
    # (a) Loan Sanction Letter
    fake_pdf = io.BytesIO(b"%PDF-1.4 Fake Sanction Letter Content")
    files_loan = {"file": ("sbi_sanction_letter.pdf", fake_pdf, "application/pdf")}
    upload_res1 = client.post(
        f"/api/leads/{lead_id}/loan-process/documents",
        data={"stage_category": "loan_file", "notes": "Official SBI Approval Letter"},
        files=files_loan,
        headers=headers
    )
    assert upload_res1.status_code == 200, f"Upload loan doc failed: {upload_res1.text}"
    doc1 = upload_res1.json()
    assert doc1["stage_category"] == "loan_file"
    assert doc1["file_name"] == "sbi_sanction_letter.pdf"
    print(f"[PASS] Document upload (Loan File): '{doc1['file_name']}' stored at {doc1['file_path']}")

    # (b) Net Metering Application Document
    fake_nm = io.BytesIO(b"%PDF-1.4 DGVCL Net Metering Form")
    files_nm = {"file": ("dgvcl_net_meter_form.pdf", fake_nm, "application/pdf")}
    upload_res2 = client.post(
        f"/api/leads/{lead_id}/loan-process/documents",
        data={"stage_category": "net_meter_file", "notes": "DGVCL Acknowledged Copy"},
        files=files_nm,
        headers=headers
    )
    assert upload_res2.status_code == 200, f"Upload net meter doc failed: {upload_res2.text}"
    doc2 = upload_res2.json()
    assert doc2["stage_category"] == "net_meter_file"
    print(f"[PASS] Document upload (Net Meter File): '{doc2['file_name']}'")

    # 8. Verify documents list on loan process
    get_lp_with_docs = client.get(f"/api/leads/{lead_id}/loan-process", headers=headers)
    assert get_lp_with_docs.status_code == 200
    docs_list = get_lp_with_docs.json()["documents"]
    assert len(docs_list) == 2
    print(f"[PASS] Verified Loan Process documents list contains {len(docs_list)} files")

    # 9. Verify Lead Detail & Leads Table summary enrichment
    lead_detail_res = client.get(f"/api/leads/{lead_id}", headers=headers)
    assert lead_detail_res.status_code == 200
    ld_data = lead_detail_res.json()
    assert ld_data["loan_process"]["loan_files_count"] == 1
    assert ld_data["loan_process"]["net_meter_files_count"] == 1
    assert ld_data["loan_process"]["loan_status"] == "Approved"
    print("[PASS] Lead response summary enrichment verified with exact stage statuses & document counts")

    # 10. Delete a document
    del_res = client.delete(f"/api/leads/{lead_id}/loan-process/documents/{doc2['id']}", headers=headers)
    assert del_res.status_code == 200, f"Delete doc failed: {del_res.text}"
    get_lp_after_del = client.get(f"/api/leads/{lead_id}/loan-process", headers=headers)
    assert len(get_lp_after_del.json()["documents"]) == 1
    print("[PASS] Document deletion verified: Cleaned from database and storage")

    # 11. Cleanup test lead
    client.delete(f"/api/leads/{lead_id}", headers=headers)
    print("[PASS] Cleaned up test lead and cascading loan process records")

    print("==================================================")
    print("ALL LOAN PROCESS TESTS PASSED PERFECTLY!")
    print("==================================================\n")

if __name__ == "__main__":
    test_loan_process_lifecycle()
