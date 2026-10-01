import sys
sys.stdout.reconfigure(encoding='utf-8')
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models.models import User, Company, Notification, Lead, FollowUp
from app.security import create_access_token, get_password_hash

client = TestClient(app)

def test_targeted_notifications():
    db = SessionLocal()
    try:
        # Find or ensure Admin
        company = db.query(Company).first()
        assert company is not None, "Company must exist"

        admin = db.query(User).filter(User.company_id == company.id, User.role == "company_admin").first()
        assert admin is not None, "Admin must exist"

        # Find or create Assigned Rep
        rep1 = db.query(User).filter(User.email == "rep1@truesunenergy.in").first()
        if not rep1:
            rep1 = User(
                company_id=company.id,
                email="rep1@truesunenergy.in",
                full_name="Raj Patel (Sales Rep 1)",
                hashed_password=get_password_hash("password123"),
                role="sales_rep",
                is_active=True
            )
            db.add(rep1)
            db.commit()
            db.refresh(rep1)

        # Find or create Unrelated Rep 2
        rep2 = db.query(User).filter(User.email == "rep2@truesunenergy.in").first()
        if not rep2:
            rep2 = User(
                company_id=company.id,
                email="rep2@truesunenergy.in",
                full_name="Amit Shah (Sales Rep 2)",
                hashed_password=get_password_hash("password123"),
                role="sales_rep",
                is_active=True
            )
            db.add(rep2)
            db.commit()
            db.refresh(rep2)

        print(f"Admin: {admin.email} (ID: {admin.id})")
        print(f"Assigned Rep: {rep1.email} (ID: {rep1.id})")
        print(f"Unrelated Rep: {rep2.email} (ID: {rep2.id})")

        # Create auth headers
        admin_token = create_access_token(data={"sub": str(admin.id), "company_id": company.id})
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        rep1_token = create_access_token(data={"sub": str(rep1.id), "company_id": company.id})
        rep1_headers = {"Authorization": f"Bearer {rep1_token}"}

        rep2_token = create_access_token(data={"sub": str(rep2.id), "company_id": company.id})
        rep2_headers = {"Authorization": f"Bearer {rep2_token}"}

        # Clear existing test notifications for clean baseline
        db.query(Notification).filter(Notification.user_id.in_([admin.id, rep1.id, rep2.id])).delete()
        db.commit()

        # Helper to get unread count
        def get_count(headers):
            res = client.get("/api/notifications", headers=headers)
            return len(res.json())

        assert get_count(admin_headers) == 0
        assert get_count(rep1_headers) == 0
        assert get_count(rep2_headers) == 0

        # --- Test 1: Lead Assigned to Rep1 by Admin ---
        print("\n--- Test 1: Admin creates lead and assigns to Rep1 ---")
        lead_res = client.post("/api/leads", json={
            "full_name": "Targeted Solar Prospect",
            "phone": "9123456780",
            "email": "prospect@gmail.com",
            "city": "Ahmedabad",
            "state": "Gujarat",
            "monthly_bill": 5000,
            "property_type": "Residential",
            "roof_ownership": "Owned",
            "roof_type": "Concrete Flat",
            "lead_source": "Direct",
            "stage": "new_lead",
            "recommended_kw": 4.0,
            "assigned_to_id": rep1.id
        }, headers=admin_headers)
        assert lead_res.status_code == 200, f"Error: {lead_res.text}"
        lead_id = lead_res.json()["id"]

        print("lead_res:", lead_res.json())
        print("admin notifs:", client.get("/api/notifications", headers=admin_headers).json())
        print("rep1 notifs:", client.get("/api/notifications", headers=rep1_headers).json())
        print("rep2 notifs:", client.get("/api/notifications", headers=rep2_headers).json())

        # Check: Admin performed action -> ONLY Rep1 should receive notification
        assert get_count(admin_headers) == 0, "Admin should NOT receive notification for own action"
        assert get_count(rep1_headers) >= 1, "Assigned Rep1 MUST receive notification when Admin creates/assigns lead"
        assert get_count(rep2_headers) == 0, "Unrelated Rep2 must NOT receive notification"
        rep1_notif = client.get("/api/notifications", headers=rep1_headers).json()[0]
        print(f"Rep1 received: '{rep1_notif['title']}' - {rep1_notif['message']}")

        # Clear notifications for next step
        db.query(Notification).filter(Notification.user_id.in_([admin.id, rep1.id, rep2.id])).delete()
        db.commit()

        # --- Test 2: Assigned User (Rep1) moves Lead -> Deal Won ---
        print("\n--- Test 2: Assigned Rep1 moves Lead -> Deal Won ---")
        move_res = client.patch("/api/pipeline/move-card", json={
            "lead_id": lead_id,
            "new_stage": "won"
        }, headers=rep1_headers)
        assert move_res.status_code == 200, f"Error: {move_res.text}"

        # Check: Assigned User performed action -> ONLY Admin should receive notification
        assert get_count(admin_headers) == 1, "Admin MUST receive notification when Assigned Rep moves lead to Won"
        assert get_count(rep1_headers) == 0, "Assigned Rep1 should NOT receive notification for own action"
        assert get_count(rep2_headers) == 0, "Unrelated Rep2 must NOT receive notification"
        admin_notif = client.get("/api/notifications", headers=admin_headers).json()[0]
        print(f"Admin received: '{admin_notif['title']}' - {admin_notif['message']}")
        assert "won" in admin_notif["message"].lower() or "won" in admin_notif["title"].lower()

        # Clear notifications
        db.query(Notification).filter(Notification.user_id.in_([admin.id, rep1.id, rep2.id])).delete()
        db.commit()

        # --- Test 3: Admin moves Lead -> Deal Won (or any other stage) ---
        print("\n--- Test 3: Admin moves Lead -> Negotiation ---")
        move_res2 = client.patch("/api/pipeline/move-card", json={
            "lead_id": lead_id,
            "new_stage": "negotiation"
        }, headers=admin_headers)
        assert move_res2.status_code == 200, f"Error: {move_res2.text}"

        # Check: Admin performed action -> ONLY Assigned Rep1 should receive notification
        assert get_count(admin_headers) == 0, "Admin should NOT receive notification for own action"
        assert get_count(rep1_headers) == 1, "Assigned Rep1 MUST receive notification when Admin moves lead"
        assert get_count(rep2_headers) == 0, "Unrelated Rep2 must NOT receive notification"
        rep1_notif = client.get("/api/notifications", headers=rep1_headers).json()[0]
        print(f"Rep1 received: '{rep1_notif['title']}' - {rep1_notif['message']}")

        # Clear notifications
        db.query(Notification).filter(Notification.user_id.in_([admin.id, rep1.id, rep2.id])).delete()
        db.commit()

        # --- Test 4: Assigned User (Rep1) schedules Follow-up ---
        print("\n--- Test 4: Assigned Rep1 schedules a Follow-up ---")
        fu_res = client.post("/api/followups", json={
            "lead_id": lead_id,
            "assigned_to_id": rep1.id,
            "follow_up_type": "call",
            "scheduled_date": "2026-10-08T15:00:00",
            "notes": "Discuss technical subsidy breakdown"
        }, headers=rep1_headers)
        assert fu_res.status_code == 200, f"Error: {fu_res.text}"
        followup_id = fu_res.json()["id"]

        # Check: Rep1 scheduled follow-up -> ONLY Admin should receive notification
        assert get_count(admin_headers) == 1, "Admin MUST receive notification when Rep1 schedules follow-up"
        assert get_count(rep1_headers) == 0, "Rep1 should NOT receive notification for own action"
        assert get_count(rep2_headers) == 0, "Unrelated Rep2 must NOT receive notification"
        admin_notif = client.get("/api/notifications", headers=admin_headers).json()[0]
        print(f"Admin received: '{admin_notif['title']}' - {admin_notif['message']}")

        # Clear notifications
        db.query(Notification).filter(Notification.user_id.in_([admin.id, rep1.id, rep2.id])).delete()
        db.commit()

        # --- Test 5: Admin updates/completes Follow-up ---
        print("\n--- Test 5: Admin completes Follow-up ---")
        comp_res = client.patch(f"/api/followups/{followup_id}/complete", headers=admin_headers)
        assert comp_res.status_code == 200, f"Error: {comp_res.text}"

        # Check: Admin completed follow-up -> ONLY Assigned Rep1 should receive notification
        assert get_count(admin_headers) == 0, "Admin should NOT receive notification for own action"
        assert get_count(rep1_headers) == 1, "Assigned Rep1 MUST receive notification when Admin completes follow-up"
        assert get_count(rep2_headers) == 0, "Unrelated Rep2 must NOT receive notification"
        rep1_notif = client.get("/api/notifications", headers=rep1_headers).json()[0]
        print(f"Rep1 received: '{rep1_notif['title']}' - {rep1_notif['message']}")

        # Clean up test lead
        client.delete(f"/api/leads/{lead_id}", headers=admin_headers)
        print("\nCleaned up test lead.")

        print("\n>>> ALL TARGETED NOTIFICATION TESTS PASSED PERFECTLY! <<<")

    finally:
        db.close()

if __name__ == "__main__":
    test_targeted_notifications()
