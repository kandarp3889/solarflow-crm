import sys
sys.stdout.reconfigure(encoding='utf-8')
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models.models import User, Company, Notification, Lead
from app.security import create_access_token

client = TestClient(app)

def test_websocket_realtime_notifications():
    db = SessionLocal()
    try:
        company = db.query(Company).first()
        admin = db.query(User).filter(User.company_id == company.id, User.role == "company_admin").first()
        rep = db.query(User).filter(User.company_id == company.id, User.role == "sales_rep").first()
        assert admin is not None and rep is not None

        admin_token = create_access_token(data={"sub": str(admin.id), "company_id": company.id})
        rep_token = create_access_token(data={"sub": str(rep.id), "company_id": company.id})

        # 1. Connect Admin WebSocket
        print(f"Connecting Admin WebSocket for user_id={admin.id}...")
        with client.websocket_connect(f"/api/notifications/ws?token={admin_token}") as admin_ws:
            handshake = admin_ws.receive_json()
            print("Admin WS Handshake received:", handshake)
            assert handshake["type"] == "connected"
            assert handshake["user_id"] == admin.id

            # Create a test lead assigned to rep
            lead = Lead(
                company_id=company.id,
                full_name="Realtime Solar Client",
                phone="9988776655",
                lead_id="SOL-WS-001",
                assigned_to_id=rep.id,
                stage="new_lead"
            )
            db.add(lead)
            db.commit()
            db.refresh(lead)

            # 2. Sales Rep moves lead to Won via API
            rep_headers = {"Authorization": f"Bearer {rep_token}"}
            print(f"Sales Rep (ID {rep.id}) moves card to 'won'...")
            move_res = client.patch("/api/pipeline/move-card", json={
                "lead_id": lead.id,
                "new_stage": "won"
            }, headers=rep_headers)
            assert move_res.status_code == 200

            # 3. Check Admin WebSocket receives real-time payload immediately
            print("Awaiting real-time message on Admin WebSocket...")
            ws_msg = admin_ws.receive_json()
            print("Real-time payload received by Admin:", ws_msg)

            assert ws_msg["type"] == "new_notification"
            notif = ws_msg["notification"]
            assert "Deal Won" in notif["title"] or "won" in notif["title"].lower() or "won" in notif["message"].lower()
            print(f"Notification successfully received in real-time by Admin: '{notif['title']}' - '{notif['message']}'")

            # Clean up test lead
            client.delete(f"/api/leads/{lead.id}", headers={"Authorization": f"Bearer {admin_token}"})
            print("\n>>> WEBSOCKET REAL-TIME NOTIFICATION VERIFICATION PASSED! <<<")

    finally:
        db.close()

if __name__ == "__main__":
    test_websocket_realtime_notifications()
