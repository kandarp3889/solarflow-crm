import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models.models import Lead, User
from app.security import create_access_token

client = TestClient(app)
db = SessionLocal()

user = db.query(User).filter(User.email == "admin@truesun.in").first() or db.query(User).first()
assert user is not None, "A user must exist"
token = create_access_token(data={"sub": str(user.id), "company_id": user.company_id, "role": user.role})
headers = {"Authorization": f"Bearer {token}"}

lead = db.query(Lead).filter(Lead.company_id == user.company_id).first()
if not lead:
    lead = db.query(Lead).first()
assert lead is not None, "No lead found"
lead_id = lead.id

# 1. Test creating quote with AUTO units (no panel_quantity specified)
res1 = client.post('/api/quotations', headers=headers, json={
    'lead_id': lead_id,
    'system_size_kw': 3.3,
    'panel_wattage': 550
})
assert res1.status_code == 200, res1.text
q1 = res1.json()
print('Auto units quote:', q1['quotation_number'], 'panel_quantity =', q1['panel_quantity'])
assert q1['panel_quantity'] == 6, f"Expected 6, got {q1['panel_quantity']}"

# 2. Test creating quote with MANUAL units (panel_quantity = 8)
res2 = client.post('/api/quotations', headers=headers, json={
    'lead_id': lead_id,
    'system_size_kw': 3.3,
    'panel_wattage': 550,
    'panel_quantity': 8
})
assert res2.status_code == 200, res2.text
q2 = res2.json()
print('Manual units quote:', q2['quotation_number'], 'panel_quantity =', q2['panel_quantity'])
assert q2['panel_quantity'] == 8, f"Expected 8, got {q2['panel_quantity']}"

# 3. Test updating quote panel_quantity to 14
res3 = client.put(f"/api/quotations/{q2['id']}", headers=headers, json={
    'panel_quantity': 14
})
assert res3.status_code == 200, res3.text
q3 = res3.json()
print('Updated units quote:', q3['quotation_number'], 'panel_quantity =', q3['panel_quantity'])
assert q3['panel_quantity'] == 14, f"Expected 14, got {q3['panel_quantity']}"

# Clean up test quotes
client.delete(f"/api/quotations/{q1['id']}", headers=headers)
client.delete(f"/api/quotations/{q2['id']}", headers=headers)

print('ALL QUOTATION UNITS TESTS PASSED PERFECTLY!')
