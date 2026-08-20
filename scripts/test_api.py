import sys
import os

# Add api directory to sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
API_DIR = os.path.join(os.path.dirname(BASE_DIR), "api")
sys.path.insert(0, API_DIR)

from starlette.testclient import TestClient
from main import app

def run_tests():
    client = TestClient(app)
    
    print("🧪 1. Testing GET /api/v1/overview...")
    resp = client.get("/api/v1/overview")
    assert resp.status_code == 200, f"Overview failed: {resp.text}"
    data = resp.json()
    print(f"   -> Total Value: €{data['total_inventory_value']:,.2f}")
    print(f"   -> Trapped Dead-Stock Capital: €{data['trapped_dead_stock_capital']:,.2f}")
    print(f"   -> High Risk SKUs: {data['high_risk_skus_count']} / {data['total_skus']}")
    print(f"   -> Average Days of Supply: {data['average_days_of_supply']} days")
    assert data["trapped_dead_stock_capital"] > 15000, "Trapped capital should exceed €15,000"

    print("\n🧪 2. Testing GET /api/v1/inventory...")
    resp = client.get("/api/v1/inventory?status=critical_dead")
    assert resp.status_code == 200
    items = resp.json()
    print(f"   -> Found {len(items)} critical dead-stock items.")
    assert len(items) > 0
    sample = items[0]
    print(f"   -> Sample: {sample['title']} | SKU: {sample['sku']} | Trapped: €{sample['trapped_capital']} | DoS: {sample['days_of_supply']}")
    assert sample["dead_stock_status"] == "critical_dead"

    print("\n🧪 3. Testing GET /api/v1/playbooks...")
    resp = client.get("/api/v1/playbooks")
    assert resp.status_code == 200
    playbooks = resp.json()
    for p in playbooks:
        print(f"   -> Campaign: '{p['strategy_name']}' | Items: {p['eligible_items_count']} | Projected Recovery: €{p['total_projected_cash_recovery']:,.2f}")

    print("\n🧪 4. Testing GET /api/v1/export/clearance-csv...")
    resp = client.get("/api/v1/export/clearance-csv")
    assert resp.status_code == 200
    assert "text/csv" in resp.headers["content-type"]
    assert "SKU,Barcode,Product Title" in resp.text
    print("   -> CSV export returned valid clearance format.")

    print("\n🧪 5. Testing POST /api/v1/sync-mock...")
    resp = client.post("/api/v1/sync-mock")
    assert resp.status_code == 200
    sync_data = resp.json()
    print(f"   -> Sync successful: {sync_data['message']} (Synced {sync_data['synced_items_count']} items)")

    print("\n✅ All Backend API verification tests PASSED successfully!")

if __name__ == "__main__":
    run_tests()
