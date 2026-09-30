import requests
import time

BASE_URL = "http://127.0.0.1:8000"

def test_endpoints():
    print("=== Testing LIVE AIS Endpoints ===")
    r = requests.get(f"{BASE_URL}/api/ais/status")
    print("Live Status:", r.status_code, r.json())
    assert r.status_code == 200

    r = requests.get(f"{BASE_URL}/api/ais/vessels")
    print(f"Live Vessels Count: {len(r.json())}")
    assert r.status_code == 200

    r = requests.get(f"{BASE_URL}/api/ais/tracks")
    print(f"Live Tracks Count: {len(r.json())}")
    assert r.status_code == 200

    print("\n=== Testing DEMO AIS Endpoints ===")
    r = requests.get(f"{BASE_URL}/api/ais/demo/status")
    print("Demo Status:", r.status_code, r.json())
    assert r.status_code == 200
    assert r.json().get("mode") == "DEMO"

    r = requests.get(f"{BASE_URL}/api/ais/demo/vessels")
    demo_vessels = r.json()
    print(f"Demo Vessels Count: {len(demo_vessels)}")
    assert r.status_code == 200
    assert len(demo_vessels) > 0

    # Inspect sample demo vessel
    sample = demo_vessels[0]
    print(f"Sample Demo Vessel: {sample.get('ship_name')} (MMSI: {sample.get('mmsi')}) at ({sample.get('latitude')}, {sample.get('longitude')}), speed: {sample.get('speed_knots')} knots")

    # Test playback controls
    print("\n--- Testing Playback Controls ---")
    r = requests.post(f"{BASE_URL}/api/ais/demo/speed", params={"speed": 2.0})
    print("Set Speed 2.0x:", r.status_code, r.json())
    assert r.status_code == 200

    r = requests.post(f"{BASE_URL}/api/ais/demo/pause")
    print("Pause:", r.status_code, r.json())
    assert r.status_code == 200

    r = requests.post(f"{BASE_URL}/api/ais/demo/play")
    print("Play:", r.status_code, r.json())
    assert r.status_code == 200

    r = requests.post(f"{BASE_URL}/api/ais/demo/reset")
    print("Reset:", r.status_code, r.json())
    assert r.status_code == 200

    print("\n[SUCCESS] ALL LIVE & DEMO AIS ENDPOINT TESTS PASSED PERFECTLY!")

if __name__ == "__main__":
    test_endpoints()
