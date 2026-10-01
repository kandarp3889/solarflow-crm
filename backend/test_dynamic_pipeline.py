import sys
from fastapi.testclient import TestClient
from app.main import app

def run_pipeline_test():
    print("=" * 60)
    print("TESTING DYNAMIC PIPELINE KANBAN (MULTI-TENANT SAAS)")
    print("=" * 60)

    client = TestClient(app)
    login_res = client.post('/api/auth/login', data={'username': 'admin@truesunenergy.in', 'password': 'SolarAdmin123!'})
    assert login_res.status_code == 200, f'Login failed: {login_res.text}'
    token = login_res.json()['access_token']
    headers = {'Authorization': f'Bearer {token}'}

    # 1. Fetch initial stages
    stages_res = client.get('/api/pipeline/stages', headers=headers)
    assert stages_res.status_code == 200
    stages = stages_res.json()
    print(f'[PASS] Initial stages count: {len(stages)}')

    # 2. Add custom stage
    new_stage_payload = {
        'label': 'Discom Net Metering',
        'color': 'teal',
        'win_probability_pct': 70,
        'is_won': False,
        'is_lost': False
    }
    create_stage_res = client.post('/api/pipeline/stages', headers=headers, json=new_stage_payload)
    assert create_stage_res.status_code == 200, f'Create stage failed: {create_stage_res.text}'
    created_stage = create_stage_res.json()
    stage_id = created_stage['stage_id']
    stage_key = created_stage['key']
    print(f'[PASS] Stage created: {created_stage["label"]} with key "{stage_key}", ID {stage_id}')

    # 3. Create lead in new custom stage
    lead_payload = {
        'full_name': 'Ramesh Patel',
        'phone': '+91 98250 11223',
        'stage': stage_key,
        'estimated_value': 280000.0
    }
    create_lead_res = client.post('/api/leads', headers=headers, json=lead_payload)
    assert create_lead_res.status_code == 200
    lead = create_lead_res.json()
    lead_id = lead['id']
    print(f'[PASS] Created lead {lead["lead_id"]} in custom stage "{lead["stage"]}"')

    # 4. Verify stage card movement & dynamic probability
    move_res = client.patch('/api/pipeline/move-card', headers=headers, json={'lead_id': lead_id, 'new_stage': stage_key})
    assert move_res.status_code == 200
    assert move_res.json()['win_probability_pct'] == 70, f'Expected 70%, got {move_res.json()["win_probability_pct"]}'
    print(f'[PASS] Card movement dynamic win probability verified: {move_res.json()["win_probability_pct"]}%')

    # 5. Edit stage
    edit_res = client.put(f'/api/pipeline/stages/{stage_id}', headers=headers, json={
        'label': 'Discom Approved & Net Metered',
        'color': 'cyan',
        'win_probability_pct': 80
    })
    assert edit_res.status_code == 200
    print(f'[PASS] Edited stage label to: {edit_res.json()["label"]}')

    # 6. Reorder stages
    stage_ids = [s['stage_id'] for s in client.get('/api/pipeline/stages', headers=headers).json()]
    reordered_ids = [stage_ids[-1]] + stage_ids[:-1] # Put newest stage first
    reorder_res = client.put('/api/pipeline/stages/reorder', headers=headers, json={'stage_ids': reordered_ids})
    assert reorder_res.status_code == 200
    print('[PASS] Reordered stages successfully')

    # 7. Delete stage with lead migration safeguard
    del_res = client.delete(f'/api/pipeline/stages/{stage_id}?fallback_stage_key=new_lead', headers=headers)
    assert del_res.status_code == 200
    print(f'[PASS] Deleted stage. Safeguard migration result: {del_res.json()["message"]}')

    # Check that lead was moved to fallback
    check_lead_res = client.get(f'/api/leads/{lead_id}', headers=headers)
    assert check_lead_res.status_code == 200
    assert check_lead_res.json()['stage'] == 'new_lead', f'Lead stage was {check_lead_res.json()["stage"]}'
    print(f'[PASS] Lead successfully migrated to {check_lead_res.json()["stage"]}, zero data loss!')

    # Cleanup test lead
    client.delete(f'/api/leads/{lead_id}', headers=headers)
    print("=" * 60)
    print("ALL TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == '__main__':
    run_pipeline_test()
