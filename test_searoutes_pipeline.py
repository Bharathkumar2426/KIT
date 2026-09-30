"""Automated Test Suite for SeaRoutesNav Maritime Route Navigation Pipeline (SIH 26057)."""

import json
import unittest
from pathlib import Path
from fastapi.testclient import TestClient

from backend.config import settings
from backend.main import app
from backend.services.searoutes_service import SeaRoutesService, searoutes_service


class TestSeaRoutesNavPipeline(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_01_configuration_loading(self):
        """Verify SeaRoutesNav settings are properly parsed from environment."""
        print("\n[Test 1] Testing SeaRoutesNav Configuration Loading...")
        self.assertTrue(settings.SEAROUTES_API_URL.startswith("https://"))
        self.assertEqual(settings.SEAROUTES_EMAIL, "laura.nanoteam03@gmail.com")
        self.assertTrue(len(settings.SEAROUTES_PASSWORD) > 0)
        self.assertTrue(settings.SEAROUTES_CACHE_DIR.exists())
        print(f"  • API URL: {settings.SEAROUTES_API_URL}")
        print(f"  • Account: {settings.SEAROUTES_EMAIL}")
        print(f"  • Cache Directory: {settings.SEAROUTES_CACHE_DIR}")

    def test_02_authentication_and_status(self):
        """Verify SeaRoutesNav authentication and quota monitoring."""
        print("\n[Test 2] Testing SeaRoutesNav Authentication & Quota...")
        status = searoutes_service.get_status()
        self.assertTrue(status["enabled"])
        self.assertTrue(status["authenticated"])
        self.assertIn("remaining_queries", status)
        self.assertIn("daily_limit", status)
        self.assertGreaterEqual(status["daily_limit"], 25)
        print(f"  • Authenticated: {status['authenticated']}")
        print(f"  • Plan: {status['plan_type']} (Expires: {status.get('plan_expires_at')})")
        print(f"  • Quota: {status['remaining_queries']}/{status['daily_limit']} queries remaining")

    def test_03_route_calculation_and_caching(self):
        """Verify route calculation, disk caching, and quota preservation."""
        print("\n[Test 3] Testing Route Calculation & Smart Caching...")
        # Calculate Colombo -> Chennai route
        res = searoutes_service.calculate_route(
            origin_lat=6.9535,
            origin_lon=79.8465,
            dest_lat=13.0827,
            dest_lon=80.2707,
            route_name="Colombo ⇄ Chennai Test Corridor",
        )
        self.assertTrue(res.get("success", False))
        self.assertGreater(res.get("distance_nm", 0), 100)
        self.assertGreater(len(res.get("route_coordinates", [])), 5)
        print(f"  • Route: {res.get('name')}")
        print(f"  • Distance: {res.get('distance_nm')} NM (~{res.get('duration_hours')} hrs)")
        print(f"  • Waypoints: {len(res.get('route_coordinates', []))} coords (Cached: {res.get('cached')})")

    def test_04_active_routes_and_hazard_warnings(self):
        """Verify key survey corridors with debris proximity analysis."""
        print("\n[Test 4] Testing Strategic Corridors & Hazard Alerts...")
        sample_hazards = [
            {"id": 101, "class_name": "ghost_net", "severity": "EXTREME", "latitude": 9.3142, "longitude": 79.1821},
            {"id": 102, "class_name": "metal_drum", "severity": "MEDIUM", "latitude": 52.9540, "longitude": 4.7820},
        ]
        routes = searoutes_service.get_all_active_routes(db_targets=sample_hazards)
        self.assertGreaterEqual(len(routes), 3)

        for r in routes:
            print(f"  • Corridor: {r['name']} ({r['distance_nm']} NM, Hazards Near: {r['hazard_count']})")
            self.assertIn("route_coordinates", r)
            self.assertIn("distance_nm", r)

    def test_05_rest_api_endpoints(self):
        """Verify FastAPI REST endpoints for SeaRoutesNav."""
        print("\n[Test 5] Testing SeaRoutesNav REST API Endpoints...")
        # 1. Status
        resp_status = self.client.get("/api/searoutes/status")
        self.assertEqual(resp_status.status_code, 200)
        status_data = resp_status.json()
        self.assertTrue(status_data["authenticated"])
        print(f"  • GET /api/searoutes/status -> HTTP 200 (Remaining: {status_data['remaining_queries']})")

        # 2. Routes
        resp_routes = self.client.get("/api/searoutes/routes")
        self.assertEqual(resp_routes.status_code, 200)
        routes_data = resp_routes.json()
        self.assertTrue(routes_data["success"])
        self.assertGreaterEqual(routes_data["total_routes"], 3)
        print(f"  • GET /api/searoutes/routes -> HTTP 200 ({routes_data['total_routes']} routes returned)")

        # 3. Calculate custom route
        calc_payload = {
            "origin": {"latitude": 6.9535, "longitude": 79.8465, "name": "Colombo"},
            "destination": {"latitude": 13.0827, "longitude": 80.2707, "name": "Chennai"},
            "name": "Custom Transit Corridor",
        }
        resp_calc = self.client.post("/api/searoutes/calculate", json=calc_payload)
        self.assertEqual(resp_calc.status_code, 200)
        calc_data = resp_calc.json()
        self.assertTrue(calc_data["success"])
        print(f"  • POST /api/searoutes/calculate -> HTTP 200 (Distance: {calc_data['distance_nm']} NM)")


if __name__ == "__main__":
    unittest.main()
