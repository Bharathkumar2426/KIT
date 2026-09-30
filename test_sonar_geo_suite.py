"""Comprehensive Test Suite for Sonar Georeferencer and Anomaly Reporting."""

import csv
import json
import math
import os
import sys
import tempfile
import unittest
from pathlib import Path
import requests

from backend.services.sonar_geo import (
    Ping,
    SonarGeoreferencer,
    bearing,
    build_report,
    destination,
    from_endpoints,
    haversine,
    load_nav_csv,
    write_csv,
    write_json,
)


class TestSonarGeoreferencing(unittest.TestCase):

    def test_01_geodesy_helpers(self):
        """Verify haversine distance, bearing calculations in all quadrants, and destination projections."""
        # 1. Haversine distance (1 degree lat ~= 111.19 km)
        dist = haversine(0.0, 0.0, 1.0, 0.0)
        self.assertTrue(110000.0 < dist < 112000.0, f"Unexpected haversine distance: {dist}")

        # 2. Quadrant bearings
        brg_north = bearing(9.0, 78.0, 10.0, 78.0)
        self.assertAlmostEqual(brg_north, 0.0, delta=0.1)

        brg_east = bearing(9.0, 78.0, 9.0, 79.0)
        self.assertAlmostEqual(brg_east, 90.0, delta=0.1)

        brg_south = bearing(10.0, 78.0, 9.0, 78.0)
        self.assertAlmostEqual(brg_south, 180.0, delta=0.1)

        brg_west = bearing(9.0, 79.0, 9.0, 78.0)
        self.assertAlmostEqual(brg_west, 270.0, delta=0.1)

        # 3. Destination projection
        lat2, lon2 = destination(0.0, 0.0, 0.0, 111195.0)
        self.assertAlmostEqual(lat2, 1.0, delta=0.01)
        self.assertAlmostEqual(lon2, 0.0, delta=0.01)
        print("  ✅ [PASS] Geodesy helpers verified.")

    def test_02_north_heading_track_port_starboard(self):
        """North-heading track puts starboard detection east of track and port detection west."""
        start_lat, lon = 9.9000, 78.1000
        end_lat = 9.9100
        pings = from_endpoints((start_lat, lon), (end_lat, lon), n_pings=1000, altitude=15.0)

        img_w, img_h = 1000, 1000
        swath_range_m = 50.0  # 50m port / 50m starboard
        geo = SonarGeoreferencer(pings, img_w=img_w, img_h=img_h, swath_range_m=swath_range_m, slant_corrected=True)

        # Starboard target: column 750 (right side of center 500)
        box_starboard = (700, 450, 800, 550)
        loc_starboard = geo.locate(box_starboard)

        self.assertEqual(loc_starboard["side"], "starboard")
        self.assertGreater(loc_starboard["range_from_nadir_m"], 0.0)
        # Heading north (0 deg) -> starboard is east (90 deg) -> longitude must be greater than track
        self.assertGreater(loc_starboard["longitude"], lon)

        # Port target: column 250 (left side of center 500)
        box_port = (200, 450, 300, 550)
        loc_port = geo.locate(box_port)

        self.assertEqual(loc_port["side"], "port")
        self.assertGreater(loc_port["range_from_nadir_m"], 0.0)
        # Heading north (0 deg) -> port is west (270 deg) -> longitude must be less than track
        self.assertLess(loc_port["longitude"], lon)
        print("  ✅ [PASS] Starboard (East) & Port (West) bearings verified.")

    def test_03_range_and_dimensions_in_metres(self):
        """Verify across-track and along-track dimensions are scaled in physical metres."""
        pings = from_endpoints((10.0, 80.0), (10.01, 80.0), n_pings=1000, altitude=10.0)
        img_w, img_h = 1000, 1000
        swath_range_m = 50.0
        geo = SonarGeoreferencer(pings, img_w=img_w, img_h=img_h, swath_range_m=swath_range_m, slant_corrected=True)

        # 100px wide box on 1000px image with 50m half-swath (500px = 50m -> 100px = 10m)
        box = (600, 400, 700, 450)
        loc = geo.locate(box)

        self.assertAlmostEqual(loc["width_m"], 10.0, delta=0.1)
        # Center x = 650 -> (650-500)/500 * 50 = 15.0m
        self.assertAlmostEqual(loc["range_from_nadir_m"], 15.0, delta=0.1)
        self.assertGreater(loc["length_m"], 0.0)
        print("  ✅ [PASS] Physical swath dimensions & nadir range in metres verified.")

    def test_04_nav_csv_loader(self):
        """Verify load_nav_csv correctly reads coordinate streams."""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False, newline="") as f:
            writer = csv.writer(f)
            writer.writerow(["lat", "lon", "heading", "altitude"])
            writer.writerow([9.3142, 79.1821, 45.0, 20.0])
            writer.writerow([9.3152, 79.1831, 45.0, 20.5])
            csv_path = f.name

        try:
            pings = load_nav_csv(csv_path)
            self.assertEqual(len(pings), 2)
            self.assertEqual(pings[0].lat, 9.3142)
            self.assertEqual(pings[0].lon, 79.1821)
            self.assertEqual(pings[0].heading, 45.0)
            self.assertEqual(pings[0].altitude, 20.0)
            print("  ✅ [PASS] CSV Navigation parser verified.")
        finally:
            if os.path.exists(csv_path):
                os.remove(csv_path)

    def test_05_build_report_and_write_json_csv(self):
        """Verify anomaly report assembly and writing to JSON and CSV formats."""
        pings = from_endpoints((9.9000, 78.1000), (9.9100, 78.1000), n_pings=1000)
        geo = SonarGeoreferencer(pings, img_w=1024, img_h=1000, swath_range_m=50.0)

        detections = [
            {"class": "ghost_net", "confidence": 0.88, "bbox": [700, 400, 760, 470]},
            {"class": "metal_drum", "confidence": 0.92, "bbox": [200, 100, 250, 150]},
        ]

        rep = build_report("test_scan_001", detections, geo=geo)
        self.assertEqual(rep["scan_id"], "test_scan_001")
        self.assertEqual(rep["total_detections"], 2)
        self.assertEqual(rep["detections"][0]["classification"], "ghost_net")
        self.assertIsNotNone(rep["detections"][0]["latitude"])
        self.assertEqual(rep["detections"][0]["side"], "starboard")
        self.assertEqual(rep["detections"][1]["side"], "port")

        # Test writing JSON
        with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
            json_path = f.name
        try:
            write_json(rep, json_path)
            with open(json_path, "r") as f:
                data = json.load(f)
            self.assertEqual(data["scan_id"], "test_scan_001")
            self.assertEqual(len(data["detections"]), 2)
        finally:
            if os.path.exists(json_path):
                os.remove(json_path)

        # Test writing CSV
        with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False) as f:
            csv_path = f.name
        try:
            write_csv(rep, csv_path)
            with open(csv_path, "r", newline="") as f:
                reader = list(csv.DictReader(f))
            self.assertEqual(len(reader), 2)
            self.assertEqual(reader[0]["classification"], "ghost_net")
            self.assertEqual(float(reader[0]["confidence_pct"]), 88.0)
            self.assertEqual(reader[0]["side"], "starboard")
            print("  ✅ [PASS] JSON & CSV report export writers verified.")
        finally:
            if os.path.exists(csv_path):
                os.remove(csv_path)

    def test_06_live_api_geotagging_and_report_endpoints(self):
        """Verify REST API /detect with track coordinates, and report downloads in JSON and CSV."""
        base_url = "http://127.0.0.1:8000"
        sample_path = Path("data/samples/sample_sonar.png")
        if not sample_path.exists():
            sample_path = Path("data/samples/sample_sonar_image.jpg")

        self.assertTrue(sample_path.exists(), "Sample test image not found.")

        # 1. Test Detect with Start / End fallback coordinates
        with open(sample_path, "rb") as f:
            params = {
                "start_lat": 9.3142,
                "start_lon": 79.1821,
                "end_lat": 9.3242,
                "end_lon": 79.1821,
                "swath_range_m": 50.0,
                "altitude": 28.0,
            }
            resp = requests.post(f"{base_url}/api/detect", files={"file": (sample_path.name, f, "image/png")}, params=params)

        self.assertEqual(resp.status_code, 200, f"Detect failed: {resp.text}")
        data = resp.json()
        self.assertIn("image_id", data)
        image_id = data["image_id"]

        if data["detections"]:
            first_det = data["detections"][0]
            self.assertIsNotNone(first_det.get("latitude"))
            self.assertIsNotNone(first_det.get("longitude"))
            self.assertIn(first_det.get("side"), ["port", "starboard"])
            self.assertIsNotNone(first_det.get("width_m"))
            self.assertIsNotNone(first_det.get("length_m"))

        # 2. Test JSON Report endpoint
        rep_json_res = requests.get(f"{base_url}/api/scans/{image_id}/report?format=json")
        self.assertEqual(rep_json_res.status_code, 200)
        self.assertIn("application/json", rep_json_res.headers.get("content-type", ""))
        rep_data = rep_json_res.json()
        self.assertEqual(rep_data["scan_id"], image_id)

        # 3. Test CSV Report endpoint
        rep_csv_res = requests.get(f"{base_url}/api/scans/{image_id}/report?format=csv")
        self.assertEqual(rep_csv_res.status_code, 200)
        self.assertIn("text/csv", rep_csv_res.headers.get("content-type", ""))
        self.assertIn("id,classification,confidence_pct", rep_csv_res.text)
        print("  ✅ [PASS] Live FastAPI detection and JSON/CSV anomaly report endpoints verified.")


if __name__ == "__main__":
    unittest.main(verbosity=2)
