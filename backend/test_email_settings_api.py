import sys
from fastapi.testclient import TestClient
from app.main import app
from app.database import get_db, SessionLocal
from app.models.models import User, UserRole, Company
from app.security import create_access_token

client = TestClient(app)

def test_email_settings():
    db = SessionLocal()
    admin = db.query(User).filter(User.role.in_([UserRole.COMPANY_ADMIN, UserRole.SUPER_ADMIN]), User.is_active == True).first()
    assert admin is not None, "Admin user required"
    token = create_access_token(data={"sub": str(admin.id)})
    headers = {"Authorization": f"Bearer {token}"}

    # 1. GET /api/settings/email
    res = client.get("/api/settings/email", headers=headers)
    print("GET /api/settings/email status:", res.status_code, res.json())
    assert res.status_code == 200

    # 2. PUT /api/settings/email
    update_payload = {
        "smtp_host": "smtp.gmail.com",
        "smtp_port": 587,
        "smtp_user": "admin@truesunenergy.in",
        "smtp_password": "testapppassword123",
        "from_email": "notifications@truesunenergy.in",
        "from_name": "True Sun Energy Automated",
        "use_tls": True,
        "is_enabled": True
    }
    res = client.put("/api/settings/email", json=update_payload, headers=headers)
    print("PUT /api/settings/email status:", res.status_code, res.json())
    assert res.status_code == 200
    assert res.json()["settings"]["smtp_host"] == "smtp.gmail.com"
    assert res.json()["settings"]["has_password"] is True

    # 3. GET again to ensure masked password returned
    res2 = client.get("/api/settings/email", headers=headers)
    data = res2.json()
    print("GET after update:", data)
    assert data["smtp_host"] == "smtp.gmail.com"
    assert data["smtp_password"] == "••••••••"
    assert data["has_password"] is True

    print(">>> EMAIL SETTINGS API TEST PASSED! <<<")
    db.close()

if __name__ == "__main__":
    test_email_settings()
