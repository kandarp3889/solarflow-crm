import requests
import json
import sys

BASE_URL = "http://127.0.0.1:8000/api"

def run_tests():
    print("==================================================")
    print("   SolarFlow CRM: RBAC & User Management E2E Tests")
    print("==================================================")

    # 1. Login as Company Admin
    login_res = requests.post(f"{BASE_URL}/auth/login", data={
        "username": "admin@truesunenergy.in",
        "password": "SolarAdmin123!"
    })
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    token = login_res.json()["access_token"]
    user_info = login_res.json()["user"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"[OK] Logged in as: {user_info['full_name']} ({user_info['role']})")
    assert len(user_info.get("permissions", [])) > 0, "Admin should have permissions"

    # 2. Get Team Members
    team_res = requests.get(f"{BASE_URL}/team", headers=headers)
    assert team_res.status_code == 200, f"Get team failed: {team_res.text}"
    members = team_res.json()
    print(f"[OK] Total team members returned: {len(members)}")
    assert len(members) >= 10

    # 3. Test Filters (Search, Role, Status)
    search_res = requests.get(f"{BASE_URL}/team?search=Priya", headers=headers)
    assert search_res.status_code == 200
    assert any("Priya" in m["full_name"] for m in search_res.json())
    print("[OK] Search filter by name verified")

    rep_filter_res = requests.get(f"{BASE_URL}/team?role=sales_rep", headers=headers)
    assert rep_filter_res.status_code == 200
    assert all(m["role"] == "sales_rep" for m in rep_filter_res.json())
    print(f"[OK] Role filter verified ({len(rep_filter_res.json())} sales reps)")

    active_filter_res = requests.get(f"{BASE_URL}/team?is_active=true", headers=headers)
    assert active_filter_res.status_code == 200
    assert all(m["is_active"] for m in active_filter_res.json())
    print("[OK] Status filter verified")

    # 4. Create New Team Member
    new_user_email = "test.auditor@truesunenergy.in"
    # Clean up existing test user if any from previous run
    existing = [m for m in members if m["email"] == new_user_email]
    for ex in existing:
        requests.delete(f"{BASE_URL}/team/{ex['id']}", headers=headers)

    create_res = requests.post(f"{BASE_URL}/team", headers=headers, json={
        "full_name": "Kavita Sen",
        "email": new_user_email,
        "phone": "+91 98765 11223",
        "role": "sales_rep",
        "password": "InitialPassword123!",
        "is_active": True,
        "custom_permissions": ["quotations:discount"]
    })
    assert create_res.status_code == 200, f"Create user failed: {create_res.text}"
    created_user = create_res.json()
    test_user_id = created_user["id"]
    print(f"[OK] Created new user: {created_user['full_name']} (ID: {test_user_id})")

    # 5. Get Single User Details
    user_detail_res = requests.get(f"{BASE_URL}/team/{test_user_id}", headers=headers)
    assert user_detail_res.status_code == 200
    user_detail = user_detail_res.json()
    assert "quotations:discount" in user_detail["effective_permissions"]
    print("[OK] User custom permissions override verified in effective permissions")

    # 6. Update User Profile
    update_res = requests.put(f"{BASE_URL}/team/{test_user_id}", headers=headers, json={
        "full_name": "Kavita Sen-Sharma",
        "phone": "+91 98765 99887",
        "role": "survey_engineer"
    })
    assert update_res.status_code == 200
    assert update_res.json()["full_name"] == "Kavita Sen-Sharma"
    assert update_res.json()["role"] == "survey_engineer"
    print("[OK] Updated user profile and changed role to survey_engineer")

    # 7. Toggle User Status
    status_res = requests.patch(f"{BASE_URL}/team/{test_user_id}/status", headers=headers, json={
        "is_active": False
    })
    assert status_res.status_code == 200
    assert status_res.json()["user"]["is_active"] is False
    print("[OK] User status toggled to suspended")

    reactivate_res = requests.patch(f"{BASE_URL}/team/{test_user_id}/status", headers=headers, json={
        "is_active": True
    })
    assert reactivate_res.status_code == 200
    assert reactivate_res.json()["user"]["is_active"] is True
    print("[OK] User status reactivated")

    # 8. Reset User Password
    reset_res = requests.post(f"{BASE_URL}/team/{test_user_id}/reset-password", headers=headers, json={
        "new_password": "NewSolarPassword2026!"
    })
    assert reset_res.status_code == 200
    print("[OK] Admin password reset successful")

    # Test login with the new password
    test_login_res = requests.post(f"{BASE_URL}/auth/login", data={
        "username": new_user_email,
        "password": "NewSolarPassword2026!"
    })
    assert test_login_res.status_code == 200, f"Login with new password failed: {test_login_res.text}"
    print("[OK] Logged in successfully with the newly reset password")

    # 9. Role & Permission Management
    perms_res = requests.get(f"{BASE_URL}/team/permissions", headers=headers)
    assert perms_res.status_code == 200
    perms_data = perms_res.json()
    assert len(perms_data["catalog"]) >= 10
    assert len(perms_data["roles"]) >= 4
    print(f"[OK] Permissions catalog retrieved ({len(perms_data['catalog'])} categories)")

    # 10. Create Custom Role
    custom_role_res = requests.post(f"{BASE_URL}/team/roles", headers=headers, json={
        "id": "solar_auditor",
        "name": "Solar Quality Auditor",
        "description": "Reviews completed surveys and quotation compliance",
        "badge_color": "emerald",
        "permissions": ["surveys:view", "quotations:view", "reports:view"]
    })
    assert custom_role_res.status_code == 200
    print("[OK] Created custom role 'Solar Quality Auditor'")

    # 11. Update Permissions Matrix
    matrix = perms_data["permissions"]
    matrix["solar_auditor"] = ["surveys:view", "quotations:view", "reports:view", "reports:export"]
    matrix_res = requests.put(f"{BASE_URL}/team/permissions", headers=headers, json={
        "permissions": matrix
    })
    assert matrix_res.status_code == 200
    assert "reports:export" in matrix_res.json()["permissions"]["solar_auditor"]
    print("[OK] Updated role permissions matrix with new capabilities")

    # 12. Delete Custom Role
    del_role_res = requests.delete(f"{BASE_URL}/team/roles/solar_auditor", headers=headers)
    assert del_role_res.status_code == 200
    print("[OK] Deleted custom role")

    # 13. Delete Test User
    del_user_res = requests.delete(f"{BASE_URL}/team/{test_user_id}", headers=headers)
    assert del_user_res.status_code == 200
    print("[OK] Deleted test user successfully")

    # 14. Verify Audit Logs
    audit_res = requests.get(f"{BASE_URL}/audit-logs", headers=headers)
    assert audit_res.status_code == 200
    logs = audit_res.json()
    assert len(logs) > 0
    print(f"[OK] Audit logs retrieved: {len(logs)} security events verified")

    print("\n==================================================")
    print("   ALL 14 RBAC & USER MANAGEMENT TESTS PASSED!    ")
    print("==================================================")

if __name__ == "__main__":
    try:
        run_tests()
    except Exception as e:
        print(f"\n[FAILED]: {e}")
        sys.exit(1)
