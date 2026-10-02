import sys
sys.stdout.reconfigure(encoding='utf-8')
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models.models import User, Company, Notification, Lead
from app.security import create_access_token, get_password_hash

client = TestClient(app)

def test_admin_notifications_flow():
    db = SessionLocal()
    try:
        # Find an admin user to login as
        admin = db.query(User).filter(User.role == 'company_admin', User.is_active == True).first()
        admin = db.query(User).filter(User.role == 'company_admin', User.is_active == True).first()
        if not admin:
            admin = db.query(User).filter(User.role == 'super_admin', User.is_active == True).first()
        assert admin is not None, "No active admin found"
        print(f"Testing with admin: {admin.email} (ID: {admin.id}, Role: {admin.role})")

        rep = db.query(User).filter(User.role == 'sales_rep', User.is_active == True).first()
        if not rep:
            rep = User(
                company_id=admin.company_id,
                email="rep_test@truesunenergy.in",
                full_name="Rajesh Sharma",
                hashed_password=get_password_hash("password123"),
                role="sales_rep",
                is_active=True
            )
            db.add(rep)
            db.commit()
            db.refresh(rep)

        admin_token = create_access_token(data={"sub": str(admin.id), "company_id": admin.company_id})
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        rep_token = create_access_token(data={"sub": str(rep.id), "company_id": rep.company_id})
        rep_headers = {"Authorization": f"Bearer {rep_token}"}

        headers = rep_headers

        # Initial notification count
        notifs_res = client.get("/api/notifications", headers=admin_headers)
        assert notifs_res.status_code == 200, f"Failed to get notifications: {notifs_res.text}"
        initial_count = len(notifs_res.json())
        print(f"Initial notifications count: {initial_count}")

        # 2. Create Lead
        lead_payload = {
            "full_name": "Test Rooftop Client",
            "phone": "9898989898",
            "email": "testclient@gmail.com",
            "address": "404 Solar Way",
            "city": "Ahmedabad",
            "state": "Gujarat",
            "monthly_bill": 4500,
            "property_type": "Residential",
            "lead_source": "Website",
            "stage": "new_lead",
            "recommended_kw": 5.0
        }
        create_res = client.post("/api/leads", json=lead_payload, headers=headers)
        assert create_res.status_code == 200, f"Failed to create lead: {create_res.text}"
        created_lead = create_res.json()
        lead_id = created_lead["id"]
        print(f"Lead created successfully with ID: {lead_id} ({created_lead['lead_id']})")

        # Check notifications after lead creation
        notifs_res = client.get("/api/notifications", headers=admin_headers)
        notifs = notifs_res.json()
        print(f"Notifications after lead creation: {len(notifs)}")
        assert len(notifs) > initial_count, "No new notification received after lead creation"
        latest_notif = notifs[0]
        print(f"Latest notification: '{latest_notif['title']}' - {latest_notif['message']}")
        assert "Test Rooftop Client" in latest_notif["title"] or "Test Rooftop Client" in latest_notif["message"]

        # 3. Add Lead Note
        note_res = client.post(f"/api/leads/{lead_id}/notes", json={"content": "Customer interested in 5kW with Adani panels and PM Surya Ghar subsidy."}, headers=headers)
        assert note_res.status_code == 200, f"Failed to add note: {note_res.text}"
        print("Note added successfully")

        # Check note notification
        notifs_res = client.get("/api/notifications", headers=admin_headers)
        latest_notif = notifs_res.json()[0]
        print(f"Latest notification after note: '{latest_notif['title']}' - {latest_notif['message']}")
        assert "Note Added" in latest_notif["title"]

        # 4. Move Pipeline Card (Stage Advancement)
        move_res = client.patch(f"/api/pipeline/move-card", json={"lead_id": lead_id, "new_stage": "survey_scheduled"}, headers=headers)
        assert move_res.status_code == 200, f"Failed to move pipeline card: {move_res.text}"
        print("Pipeline card moved to survey_scheduled")

        # Check stage change notification
        notifs_res = client.get("/api/notifications", headers=admin_headers)
        latest_notif = notifs_res.json()[0]
        print(f"Latest notification after stage advance: '{latest_notif['title']}' - {latest_notif['message']}")
        assert "Lead Stage" in latest_notif["title"] or "Stage Advanced" in latest_notif["title"] or "survey_scheduled" in latest_notif["title"]

        # 5. Schedule Follow-up
        fu_res = client.post("/api/followups", json={
            "lead_id": lead_id,
            "follow_up_type": "call",
            "scheduled_date": "2026-10-05T10:00:00",
            "notes": "Discuss shadow analysis and load sanction"
        }, headers=headers)
        assert fu_res.status_code == 200, f"Failed to create followup: {fu_res.text}"
        print("Followup created")

        notifs_res = client.get("/api/notifications", headers=admin_headers)
        latest_notif = notifs_res.json()[0]
        print(f"Latest notification after followup: '{latest_notif['title']}' - {latest_notif['message']}")
        assert "Follow-up Scheduled" in latest_notif["title"]

        # 6. Schedule Survey
        survey_res = client.post("/api/surveys", json={
            "lead_id": lead_id,
            "scheduled_date": "2026-10-06T11:00:00",
            "roof_type": "Concrete Flat",
            "roof_area": 600,
            "phase": "Three Phase",
            "recommended_system_size": 5.0
        }, headers=headers)
        assert survey_res.status_code == 200, f"Failed to create survey: {survey_res.text}"
        print("Survey created")

        notifs_res = client.get("/api/notifications", headers=admin_headers)
        latest_notif = notifs_res.json()[0]
        print(f"Latest notification after survey: '{latest_notif['title']}' - {latest_notif['message']}")
        assert "Survey" in latest_notif["title"]

        # 7. Generate Quotation
        quote_res = client.post("/api/quotations", json={
            "lead_id": lead_id,
            "system_size_kw": 5.0,
            "panel_brand": "Adani Solar",
            "panel_wattage": 550,
            "inverter_brand": "Sungrow",
            "inverter_capacity_kw": 5.0,
            "battery_backup": "None",
            "installation_cost": 25000,
            "other_costs": 5000,
            "discount": 5000
        }, headers=headers)
        assert quote_res.status_code == 200, f"Failed to create quotation: {quote_res.text}"
        quote_id = quote_res.json()["id"]
        print(f"Quotation created with ID: {quote_id}")

        notifs_res = client.get("/api/notifications", headers=admin_headers)
        latest_notif = notifs_res.json()[0]
        print(f"Latest notification after quotation: '{latest_notif['title']}' - {latest_notif['message']}")
        assert "Quotation" in latest_notif["title"]

        # 8. Dispatch Quotation
        send_res = client.post(f"/api/quotations/{quote_id}/send?channel=whatsapp", headers=headers)
        assert send_res.status_code == 200, f"Failed to send quotation: {send_res.text}"
        print("Quotation dispatched via WhatsApp")

        notifs_res = client.get("/api/notifications", headers=admin_headers)
        latest_notif = notifs_res.json()[0]
        print(f"Latest notification after quotation dispatch: '{latest_notif['title']}' - {latest_notif['message']}")
        assert "dispatched via Whatsapp" in latest_notif["message"]

        # Clean up test lead and quote
        client.delete(f"/api/quotations/{quote_id}", headers=headers)
        client.delete(f"/api/leads/{lead_id}", headers=headers)
        print("Cleaned up test entities.")

        print("\nALL ADMIN NOTIFICATION AND PROGRESS TESTS PASSED SUCCESSFULLY!")

    finally:
        db.close()

if __name__ == "__main__":
    test_admin_notifications_flow()
