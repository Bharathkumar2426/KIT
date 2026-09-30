"""Comprehensive Test Script for AI Maritime Incident Intelligence Pipeline (SIH 26057)."""

import requests
import json

BASE_URL = "http://127.0.0.1:8000/api"

def test_incident_pipeline():
    print("=== 1. Testing GET /api/incidents ===")
    r = requests.get(f"{BASE_URL}/incidents")
    assert r.status_code == 200, f"Failed: {r.text}"
    incidents = r.json()
    print(f"Total Incidents Ingested: {len(incidents)}")
    assert len(incidents) > 0, "Expected at least 1 incident"

    # Check structure of first incident
    first = incidents[0]
    print(f"Sample Incident: #{first['incident_id']} - {first['title']}")
    print(f"  Type: {first['incident_type']} | Severity: {first['severity']} | Confidence: {first['confidence']}")
    print(f"  Location: {first['location_text']} ({first['location_precision']})")
    print(f"  Coordinates: ({first['latitude']}, {first['longitude']})")
    print(f"  Sources Count: {len(first['sources'])}")
    assert "incident_id" in first
    assert "severity" in first
    assert "confidence" in first
    assert "location_precision" in first

    print("\n=== 2. Testing GET /api/incidents/metrics ===")
    r = requests.get(f"{BASE_URL}/incidents/metrics")
    assert r.status_code == 200
    metrics = r.json()
    print("Dashboard KPIs:", json.dumps(metrics, indent=2))
    assert metrics["total_incidents"] > 0
    assert metrics["sources_online_count"] > 0

    print("\n=== 3. Testing GET /api/incidents/sources/status ===")
    r = requests.get(f"{BASE_URL}/incidents/sources/status")
    assert r.status_code == 200
    sources = r.json()
    print(f"Total Sources Monitored: {len(sources)}")
    assert len(sources) == 9, f"Expected 9 sources, got {len(sources)}"
    for s in sources:
        print(f"  - [{s['status']}] {s['source_name']}: {s['items_fetched']} items ({s['trust_level']})")

    # Find an incident with coordinates to test operator confirmation
    incident_to_confirm = None
    for inc in incidents:
        if inc["latitude"] is not None and inc["longitude"] is not None and not inc["is_mapped"]:
            incident_to_confirm = inc
            break

    if incident_to_confirm:
        inc_id = incident_to_confirm["incident_id"]
        print(f"\n=== 4. Testing POST /api/incidents/{inc_id}/confirm-map ===")
        r = requests.post(
            f"{BASE_URL}/incidents/{inc_id}/confirm-map",
            json={"incident_id": inc_id, "custom_danger_radius_km": 6.5, "operator_notes": "Verified by Coast Guard radar"},
        )
        assert r.status_code == 200, f"Failed to confirm map: {r.text}"
        confirmed = r.json()
        print(f"Confirmed Incident #{inc_id}: is_mapped={confirmed['is_mapped']}, radius={confirmed['affected_area_radius_km']} km")
        assert confirmed["is_mapped"] is True
        assert confirmed["affected_area_radius_km"] == 6.5

        print(f"\n=== 5. Testing GET /api/incidents/{inc_id}/nearby-vessels ===")
        r = requests.get(f"{BASE_URL}/incidents/{inc_id}/nearby-vessels")
        assert r.status_code == 200
        nearby = r.json()
        print(f"Nearby AIS Vessels Correlated: {len(nearby)}")
        if nearby:
            v0 = nearby[0]
            print(f"  Closest Vessel: {v0['ship_name']} (MMSI: {v0['vessel_mmsi']}) - Dist: {v0['distance_km']} km, Speed: {v0['speed_knots']} kn, Risk: {v0['risk_level']}")

    print("\n=== 6. Testing GET /api/incidents/alarms/active ===")
    r = requests.get(f"{BASE_URL}/incidents/alarms/active")
    assert r.status_code == 200, f"Failed: {r.text}"
    alarms = r.json()
    print(f"Active Proximity Alarms: {len(alarms)}")
    if alarms:
        a0 = alarms[0]
        print(f"  Sample Alarm: [{a0['alarm_level']}] Vessel {a0['ship_name']} (MMSI {a0['vessel_mmsi']}) - Dist {a0['distance_km']} km to #{a0['incident_id']}")
        assert "alarm_id" in a0
        assert "alarm_level" in a0
        assert "vessel_mmsi" in a0

    print("\n[SUCCESS] ALL MARITIME INCIDENT INTELLIGENCE API TESTS PASSED PERFECTLY!")

if __name__ == "__main__":
    test_incident_pipeline()
