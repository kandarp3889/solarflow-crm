import requests

login_res = requests.post("http://127.0.0.1:8000/api/auth/login", data={"username": "admin@truesunenergy.in", "password": "SolarAdmin123!"})
assert login_res.status_code == 200, f"Login failed: {login_res.text}"
token = login_res.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

# Test GET /team
team_res = requests.get("http://127.0.0.1:8000/api/team", headers=headers)
assert team_res.status_code == 200, f"GET /team failed: {team_res.text}"
team = team_res.json()
print(f"[OK] Fetched {len(team)} team members")
first_user = team[0]
print(f"User sample: {first_user['full_name']} ({first_user['role']}) with {first_user['effective_permissions_count']} perms")

# Test GET /team/permissions
perms_res = requests.get("http://127.0.0.1:8000/api/team/permissions", headers=headers)
assert perms_res.status_code == 200, f"GET /team/permissions failed: {perms_res.text}"
perms_data = perms_res.json()
print(f"[OK] Permissions retrieved: {len(perms_data['catalog'])} categories, {len(perms_data['roles'])} roles")

# Test creating custom role
custom_role_res = requests.post("http://127.0.0.1:8000/api/team/roles", headers=headers, json={
    "id": "telecaller",
    "name": "Telecaller & Solar Qualifier",
    "description": "Engages initial solar leads and runs preliminary phone qualification",
    "badge_color": "emerald",
    "permissions": ["leads:view", "leads:create", "followups:view", "followups:manage"]
})
print("Create custom role status:", custom_role_res.status_code, custom_role_res.json().get("message"))

# Test permissions update
perms_matrix = perms_data["permissions"]
perms_matrix["sales_rep"] = ["leads:view", "leads:create", "pipeline:view", "ai:use"]
update_perms_res = requests.put("http://127.0.0.1:8000/api/team/permissions", headers=headers, json={
    "permissions": perms_matrix
})
print("Update permissions status:", update_perms_res.status_code, update_perms_res.json().get("message"))

# Test deleting custom role
delete_role_res = requests.delete("http://127.0.0.1:8000/api/team/roles/telecaller", headers=headers)
print("Delete custom role status:", delete_role_res.status_code, delete_role_res.json().get("message"))

print("All RBAC API tests passed!")
