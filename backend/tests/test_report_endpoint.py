"""Pytest suite for the Sonar Anomaly Report Download Endpoint."""

import asyncio
import csv
import io
import json
import pytest
from datetime import datetime, timezone
from starlette.testclient import TestClient

from backend.main import app
from backend.database import async_session_maker, init_db
from backend.models.db_models import ImageRecord, DetectionRecord
from backend.services.storage_service import StorageService


@pytest.fixture(scope="session")
def client():
    """Returns a Starlette TestClient for FastAPI."""
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(scope="session", autouse=True)
def seeded_scans():
    """Seeds test images in the test database: one with detections and one empty."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    async def _seed():
        await init_db()
        async with async_session_maker() as session:
            # Check if already seeded
            existing_det = await StorageService.get_image_with_detections(session, "TEST_SCAN_DET_001")
            if not existing_det:
                # 1. Scan with detections & georeference data
                scan_with_det = ImageRecord(
                    image_id="TEST_SCAN_DET_001",
                    original_filename="sample_sonar_test.png",
                    upload_timestamp=datetime.now(timezone.utc),
                    original_image_path="test_orig.png",
                    processed_image_path="test_proc.png",
                    annotated_image_path="test_anno.png",
                    image_width=1000,
                    image_height=1000,
                )
                session.add(scan_with_det)
                await session.flush()

                det1 = DetectionRecord(
                    image_id="TEST_SCAN_DET_001",
                    class_name="ghost_net",
                    confidence=0.895,
                    x=700,
                    y=450,
                    width=100,
                    height=100,
                    area=10000,
                    model_version="sonar_v2.pt",
                    anomaly_score=0.12,
                    classification_source="detector",
                    latitude=9.3182,
                    longitude=79.1845,
                    side="starboard",
                    range_from_nadir_m=20.0,
                    width_m=10.0,
                    length_m=10.0,
                )
                det2 = DetectionRecord(
                    image_id="TEST_SCAN_DET_001",
                    class_name="tire_wheel",
                    confidence=0.782,
                    x=200,
                    y=300,
                    width=80,
                    height=80,
                    area=6400,
                    model_version="sonar_v2.pt",
                    anomaly_score=0.08,
                    classification_source="detector",
                    latitude=9.3160,
                    longitude=79.1790,
                    side="port",
                    range_from_nadir_m=30.0,
                    width_m=8.0,
                    length_m=8.0,
                )
                session.add_all([det1, det2])

            existing_empty = await StorageService.get_image_with_detections(session, "TEST_SCAN_EMPTY_002")
            if not existing_empty:
                # 2. Scan with zero detections
                scan_empty = ImageRecord(
                    image_id="TEST_SCAN_EMPTY_002",
                    original_filename="empty_sonar_test.png",
                    upload_timestamp=datetime.now(timezone.utc),
                    original_image_path="empty_orig.png",
                    processed_image_path="empty_proc.png",
                    annotated_image_path="empty_anno.png",
                    image_width=800,
                    image_height=600,
                )
                session.add(scan_empty)

            await session.commit()

    loop.run_until_complete(_seed())
    return {
        "with_detections": "TEST_SCAN_DET_001",
        "empty": "TEST_SCAN_EMPTY_002",
    }


def test_01_report_json_success(client, seeded_scans):
    """Test GET /api/scans/{scan_id}/report?format=json returns valid schema and headers."""
    scan_id = seeded_scans["with_detections"]
    response = client.get(f"/api/scans/{scan_id}/report?format=json")

    assert response.status_code == 200
    assert "application/json" in response.headers.get("content-type", "")
    assert f'filename="report_{scan_id}.json"' in response.headers.get("content-disposition", "")

    data = response.json()
    assert data["scan_id"] == scan_id
    assert "generated_at" in data
    assert data["total_detections"] == 2
    assert len(data["detections"]) == 2

    first = data["detections"][0]
    assert first["id"] == 1
    assert first["classification"] == "ghost_net"
    assert first["confidence_pct"] == 89.5
    assert first["bbox_px"] == [700, 450, 800, 550]
    assert first["latitude"] == 9.3182
    assert first["longitude"] == 79.1845
    assert first["width_m"] == 10.0
    assert first["length_m"] == 10.0
    assert first["side"] == "starboard"
    assert first["range_from_nadir_m"] == 20.0


def test_02_report_csv_success(client, seeded_scans):
    """Test GET /api/scans/{scan_id}/report?format=csv returns valid CSV rows and headers."""
    scan_id = seeded_scans["with_detections"]
    response = client.get(f"/api/scans/{scan_id}/report?format=csv")

    assert response.status_code == 200
    assert "text/csv" in response.headers.get("content-type", "")
    assert f'filename="report_{scan_id}.csv"' in response.headers.get("content-disposition", "")

    reader = csv.DictReader(io.StringIO(response.text))
    rows = list(reader)
    assert len(rows) == 2

    assert rows[0]["id"] == "1"
    assert rows[0]["classification"] == "ghost_net"
    assert float(rows[0]["confidence_pct"]) == 89.5
    assert float(rows[0]["latitude"]) == 9.3182
    assert float(rows[0]["longitude"]) == 79.1845
    assert float(rows[0]["width_m"]) == 10.0
    assert float(rows[0]["length_m"]) == 10.0


def test_03_report_invalid_format_400(client, seeded_scans):
    """Test GET /api/scans/{scan_id}/report?format=invalid returns 400 Bad Request."""
    scan_id = seeded_scans["with_detections"]
    response = client.get(f"/api/scans/{scan_id}/report?format=xml")
    assert response.status_code == 400
    assert "Invalid format" in response.json()["detail"]

    response_yaml = client.get(f"/api/scans/{scan_id}/report?format=yaml")
    assert response_yaml.status_code == 400


def test_04_report_unknown_scan_404(client):
    """Test GET /api/scans/{non_existent}/report returns 404 Not Found."""
    response = client.get("/api/scans/NON_EXISTENT_SCAN_ID_9999/report?format=json")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_05_report_zero_detections(client, seeded_scans):
    """Test GET /api/scans/{scan_id}/report for a scan with zero detections."""
    scan_id = seeded_scans["empty"]

    # 1. JSON empty report
    res_json = client.get(f"/api/scans/{scan_id}/report?format=json")
    assert res_json.status_code == 200
    data = res_json.json()
    assert data["scan_id"] == scan_id
    assert data["total_detections"] == 0
    assert data["detections"] == []

    # 2. CSV empty report
    res_csv = client.get(f"/api/scans/{scan_id}/report?format=csv")
    assert res_csv.status_code == 200
    reader = csv.DictReader(io.StringIO(res_csv.text))
    rows = list(reader)
    assert len(rows) == 0
    assert "id" in reader.fieldnames
    assert "classification" in reader.fieldnames
    assert "confidence_pct" in reader.fieldnames
