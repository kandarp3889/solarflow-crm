import sys
from fastapi.testclient import TestClient
from app.main import app
from app.database import get_db, SessionLocal
from app.models.models import User, UserRole, Company
from app.security import create_access_token
from app.services.email_service import clean_smtp_password, _format_smtp_error

client = TestClient(app)

def test_email_settings():
    db = SessionLocal()
    admin = db.query(User).filter(User.role.in_([UserRole.COMPANY_ADMIN, UserRole.SUPER_ADMIN]), User.is_active == True).first()
    assert admin is not None, "Admin user required"
    token = create_access_token(data={"sub": str(admin.id)})
    headers = {"Authorization": f"Bearer {token}"}

    print("==================================================")
    print("RUNNING SMTP & EMAIL GATEWAY COMPREHENSIVE TESTS")
    print("==================================================")

    # 1. Password normalization helper
    norm1 = clean_smtp_password("smtp.gmail.com", "abcd efgh ijkl mnop")
    assert norm1 == "abcdefghijklmnop", "Google App Password spaces should be stripped"
    norm2 = clean_smtp_password("smtp.other.com", "my secret pass")
    assert norm2 == "my secret pass", "Non-Google passwords should preserve spaces"
    print("[PASS] Google App Password normalization verified.")

    # 2. Granular error formatting helper
    import errno
    err_linux_101 = OSError(101, "Network is unreachable")
    msg_101 = _format_smtp_error(err_linux_101, "smtp.gmail.com", 587, "user@gmail.com")
    assert "Network is unreachable" in msg_101
    assert "Render" in msg_101
    print("[PASS] Linux Errno 101 error formatting and hosting guidance verified.")

    # 3. GET /api/settings/email
    res = client.get("/api/settings/email", headers=headers)
    assert res.status_code == 200
    print("[PASS] GET /api/settings/email verified.")

    # 4. PUT /api/settings/email with Google App Password (spaced)
    update_payload = {
        "smtp_host": "smtp.gmail.com",
        "smtp_port": 587,
        "smtp_user": "test.solarflow@gmail.com",
        "smtp_password": "abcd efgh ijkl mnop",
        "from_email": "test.solarflow@gmail.com",
        "from_name": "SolarFlow CRM Notifications",
        "use_tls": True,
        "is_enabled": True
    }
    res = client.put("/api/settings/email", json=update_payload, headers=headers)
    assert res.status_code == 200
    data = res.json()["settings"]
    assert data["smtp_host"] == "smtp.gmail.com"
    assert data["smtp_port"] == 587
    assert data["has_password"] is True
    print("[PASS] PUT /api/settings/email verified.")

    # 5. GET again to ensure masked password returned (never leaked)
    res2 = client.get("/api/settings/email", headers=headers)
    data2 = res2.json()
    assert data2["smtp_password"] == "••••••••"
    assert data2["has_password"] is True
    print("[PASS] Secret masking verified: SMTP password is never exposed.")

    # 6. POST /api/settings/email/diagnose
    res_diag = client.post("/api/settings/email/diagnose", json={"smtp_host": "smtp.gmail.com", "smtp_port": 587}, headers=headers)
    assert res_diag.status_code == 200
    diag_data = res_diag.json()
    assert "dns_ipv4" in diag_data
    assert "tcp_port_587_reachable" in diag_data
    assert "tcp_port_465_reachable" in diag_data
    print(f"[PASS] Network diagnostics endpoint verified: IPv4 DNS = {diag_data['dns_ipv4']}, Port 587 reachable = {diag_data['tcp_port_587_reachable']}")

    # 7. POST /api/settings/email/test with invalid recipient
    res_invalid_recip = client.post("/api/settings/email/test", json={"to_email": "not-an-email"}, headers=headers)
    assert res_invalid_recip.status_code == 400
    assert "recipient email address" in res_invalid_recip.json()["detail"].lower()
    print("[PASS] Recipient email validation verified.")

    # 8. POST /api/settings/email/test with missing credentials
    res_missing_cred = client.post("/api/settings/email/test", json={"to_email": "valid@gmail.com", "smtp_user": ""}, headers=headers)
    assert res_missing_cred.status_code == 400
    print("[PASS] Missing credentials rejection verified.")

    print("==================================================")
    print("ALL SMTP & EMAIL GATEWAY TESTS PASSED PERFECTLY!")
    print("==================================================")
    db.close()

if __name__ == "__main__":
    test_email_settings()
