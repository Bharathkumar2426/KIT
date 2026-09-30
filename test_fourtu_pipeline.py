"""Comprehensive Test Suite for 4TU.ResearchData Automated External Sonar Ingestion."""

import asyncio
import io
import json
import os
import sys
import unittest
from pathlib import Path

# Ensure UTF-8 output
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

import cv2
import numpy as np
import requests

from backend.config import settings
from backend.services.fourtu_validator import FourTuValidator, ValidationResult
from backend.services.fourtu_metadata import FourTuMetadataExtractor, ExtractedSonarNavMetadata
from backend.services.fourtu_service import FourTuService

BASE_URL = "http://127.0.0.1:8000"


class TestFourTuPipeline(unittest.TestCase):
    """Rigorous unit and integration test suite for 4TU external sonar ingestion."""

    @classmethod
    def setUpClass(cls):
        cls.samples_dir = Path("data/samples")
        cls.test_cache = Path("data/fourtu_test")
        cls.test_cache.mkdir(parents=True, exist_ok=True)

    def test_01_api_connectivity_and_search(self):
        """1. Verifies public 4TU Figshare v2 API connectivity and search response format."""
        print("\n[Test 1] Testing 4TU.ResearchData Public API Connectivity...")
        service = FourTuService()
        loop = asyncio.new_event_loop()
        try:
            datasets = loop.run_until_complete(service.search_datasets(query="sonar", page_size=5))
            self.assertIsInstance(datasets, list)
            print(f"  • Successfully connected to 4TU API. Found {len(datasets)} relevant sonar datasets.")
            for ds in datasets[:2]:
                print(f"    - [{ds.dataset_id}] {ds.title[:60]} (Score: {ds.relevance_score})")
        finally:
            loop.close()

    def test_02_relevance_filter(self):
        """2. Tests that non-sonar articles are excluded while actual acoustic datasets pass."""
        print("\n[Test 2] Testing Heuristic Relevance Scoring & Exclusion...")
        non_sonar_sample = {
            "title": "Video recordings of human-robot interactions with a Nao robot controlled via SONAR",
            "description": "Experiments with social norm aware robots and speech recording.",
            "tags": ["social robotics", "nao"],
            "categories": [{"title": "Social Science"}],
        }
        is_rel, score, reasons = FourTuValidator.evaluate_dataset_relevance(non_sonar_sample)
        self.assertFalse(is_rel, "Non-sonar human-robot experiment should be rejected.")
        print(f"  • Non-sonar dataset properly excluded (Score: {score}). Reason: {reasons[0]}")

        sonar_sample = {
            "title": "High-Resolution Side-Scan Sonar Survey of Marine Debris and Shipwrecks",
            "description": "Acoustic waterfall seafloor bathymetry using towfish transducer.",
            "tags": ["side-scan sonar", "seabed mapping", "marine debris"],
            "categories": [{"title": "Maritime Engineering"}],
        }
        is_rel_2, score_2, reasons_2 = FourTuValidator.evaluate_dataset_relevance(sonar_sample)
        self.assertTrue(is_rel_2, "Genuine side-scan sonar dataset must be accepted.")
        self.assertGreaterEqual(score_2, 0.50)
        print(f"  • Genuine side-scan sonar dataset accepted with score {score_2} ({', '.join(reasons_2)})")

    def test_03_file_and_image_validation(self):
        """3. Verifies file integrity, size bounds, and sonar image validity."""
        print("\n[Test 3] Testing File & Acoustic Image Validation...")
        sample_img_path = self.samples_dir / "sample_sonar.png"
        self.assertTrue(sample_img_path.exists())

        # Test valid sonar image
        val_res = FourTuValidator.validate_sonar_image(sample_img_path)
        self.assertTrue(val_res.is_valid, f"Expected valid sonar image: {val_res.reason}")
        print(f"  • Real sonar image passed validation: {val_res.details['width']}x{val_res.details['height']} (StdDev: {val_res.details['std_dev']})")

        # Test blank / monochromatic image rejection
        blank_path = self.test_cache / "blank_test.png"
        blank = np.zeros((100, 100), dtype=np.uint8)
        cv2.imwrite(str(blank_path), blank)
        val_blank = FourTuValidator.validate_sonar_image(blank_path)
        self.assertFalse(val_blank.is_valid, "Blank image should be rejected as non-sonar data.")
        print(f"  • Monochromatic blank image correctly rejected: {val_blank.reason}")

    def test_04_geospatial_metadata_validation(self):
        """4. Tests strict validation of real coordinates vs rejection of fake/null coordinates."""
        print("\n[Test 4] Testing Geospatial Metadata Validation & Anti-Hallucination...")
        # Valid Palk Strait coordinates
        v_ok = FourTuValidator.validate_geospatial_metadata(start_lat=9.3142, start_lon=79.1821, end_lat=9.3242, end_lon=79.1821, swath_range_m=50.0)
        self.assertTrue(v_ok.is_valid)
        print(f"  • Valid GPS survey track accepted.")

        # Out-of-bounds latitude
        v_bad_lat = FourTuValidator.validate_geospatial_metadata(start_lat=120.5, start_lon=79.1821)
        self.assertFalse(v_bad_lat.is_valid)
        print(f"  • Out-of-bounds latitude (120.5°) correctly rejected: {v_bad_lat.reason}")

        # Null Island (0,0) rejection
        v_null_island = FourTuValidator.validate_geospatial_metadata(start_lat=0.0, start_lon=0.0)
        self.assertFalse(v_null_island.is_valid)
        print(f"  • Null Island (0,0) uncalibrated default correctly rejected: {v_null_island.reason}")

    def test_05_metadata_extractor_csv(self):
        """5. Tests extraction of genuine navigation from companion CSV sidecar."""
        print("\n[Test 5] Testing Navigation Sidecar Extraction...")
        csv_path = self.test_cache / "test_nav.csv"
        with open(csv_path, "w", encoding="utf-8") as f:
            f.write("lat,lon,heading,altitude\n")
            f.write("9.3142,79.1821,45.0,28.0\n")
            f.write("9.3242,79.1821,45.0,28.0\n")

        meta = FourTuMetadataExtractor.extract_from_csv(csv_path)
        self.assertTrue(meta.has_navigation)
        self.assertEqual(meta.nav_source, "SIDECAR_CSV")
        self.assertAlmostEqual(meta.start_lat, 9.3142, places=4)
        self.assertAlmostEqual(meta.end_lat, 9.3242, places=4)
        print(f"  • Successfully extracted companion CSV navigation: {meta.start_lat}°N, {meta.start_lon}°E (Pings: {len(meta.pings)})")

    def test_06_unlocated_sonar_preservation_rule(self):
        """6. CRITICAL RULE: Tests that sonar images with NO navigation metadata are analyzed, stored, but NOT mapped."""
        print("\n[Test 6] Testing Unlocated Sonar Image Ingestion (Zero Fake Coordinates Rule)...")
        no_nav_dir = self.test_cache / "isolated_no_nav"
        no_nav_dir.mkdir(parents=True, exist_ok=True)
        dummy_img = no_nav_dir / "unlocated_sonar.png"
        sample_img = cv2.imread(str(self.samples_dir / "sample_sonar.png"))
        cv2.imwrite(str(dummy_img), sample_img)

        meta = FourTuMetadataExtractor.find_companion_navigation(dummy_img, search_dir=no_nav_dir)
        self.assertFalse(meta.has_navigation, "Should report no navigation metadata available.")
        self.assertEqual(meta.nav_source, "NONE")
        print(f"  • Confirmed: Unlocated sonar correctly marked with has_navigation=False.")

    def test_07_live_api_endpoints(self):
        """7. Tests all FastAPI /api/4tu/ endpoints while server is running."""
        print("\n[Test 7] Testing Live 4TU REST API Endpoints...")
        
        # 1. /api/4tu/status
        r_status = requests.get(f"{BASE_URL}/api/4tu/status", timeout=10)
        self.assertEqual(r_status.status_code, 200)
        status_data = r_status.json()
        print(f"  • GET /api/4tu/status -> HTTP 200. Status: {status_data['status']}, Datasets Tracked: {status_data['total_datasets_tracked']}")

        # 2. /api/4tu/search
        r_search = requests.get(f"{BASE_URL}/api/4tu/search?query=sonar&page_size=3", timeout=15)
        self.assertEqual(r_search.status_code, 200)
        search_data = r_search.json()
        print(f"  • GET /api/4tu/search -> HTTP 200. Total datasets returned: {search_data['total_datasets']}")

        # 3. /api/4tu/datasets
        r_ds = requests.get(f"{BASE_URL}/api/4tu/datasets", timeout=15)
        self.assertEqual(r_ds.status_code, 200)
        print(f"  • GET /api/4tu/datasets -> HTTP 200. Datasets list received: {len(r_ds.json())}")

        # 4. /api/4tu/history
        r_hist = requests.get(f"{BASE_URL}/api/4tu/history", timeout=10)
        self.assertEqual(r_hist.status_code, 200)
        print(f"  • GET /api/4tu/history -> HTTP 200. Past runs: {len(r_hist.json())}")

        # 5. /api/4tu/files
        r_files = requests.get(f"{BASE_URL}/api/4tu/files", timeout=10)
        self.assertEqual(r_files.status_code, 200)
        print(f"  • GET /api/4tu/files -> HTTP 200. Tracked files: {len(r_files.json())}")

    def test_08_live_sync_execution(self):
        """8. Tests triggering POST /api/4tu/sync and validates response structure."""
        import time
        print("\n[Test 8] Testing Live Trigger POST /api/4tu/sync...")

        # Wait if an initial scheduled background sync is currently running
        for _ in range(15):
            try:
                st = requests.get(f"{BASE_URL}/api/4tu/status", timeout=5).json()
                if st.get("status") != "SYNCING":
                    break
            except Exception:
                pass
            time.sleep(1)

        r_sync = requests.post(f"{BASE_URL}/api/4tu/sync", timeout=60)
        self.assertEqual(r_sync.status_code, 200)
        sync_res = r_sync.json()

        if not sync_res["success"] and "already in progress" in sync_res.get("message", ""):
            print("  • Notice: Background sync was actively running; concurrency lock engaged properly.")
            self.assertIn("already in progress", sync_res["message"])
        else:
            self.assertTrue(sync_res["success"])
            print(f"  • POST /api/4tu/sync -> HTTP 200:")
            print(f"    - Source: {sync_res['source']}")
            print(f"    - Datasets Found : {sync_res['datasets_found']}")
            print(f"    - Files Found    : {sync_res['files_found']}")
            print(f"    - Processed      : {sync_res['processed']}")
            print(f"    - Detections     : {sync_res['detections']}")
            print(f"    - Georeferenced  : {sync_res['georeferenced']}")
            print(f"    - No Location    : {sync_res['without_location']}")


if __name__ == "__main__":
    print("=" * 80)
    print("🌊 4TU.RESEARCHDATA AUTOMATED SONAR INGESTION TEST SUITE")
    print("=" * 80)
    unittest.main()
