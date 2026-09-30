"""Geospatial, Severity Classification, and Dynamic Geofencing Service (SIH 26057)."""

from __future__ import annotations

import math
import time
from typing import Any, Dict, List, Optional, Tuple

from backend.models.geospatial_schemas import (
    GeofenceData,
    GeolocationData,
    GeospatialDetectionItem,
    GeospatialImageResponse,
    SeverityLevel,
)

# Standard survey baseline (MoES Palk Strait / Gulf of Mannar Survey Zone)
DEFAULT_SURVEY_LAT = 9.3142
DEFAULT_SURVEY_LNG = 79.1821
DEFAULT_ALTITUDE_M = 28.0
SWATH_RANGE_M = 50.0  # 50m port / 50m starboard swath coverage

SEVERITY_COLORS = {
    SeverityLevel.LOW: "#10b981",      # Emerald Green
    SeverityLevel.MEDIUM: "#f59e0b",   # Amber Orange
    SeverityLevel.EXTREME: "#ef4444",  # Crimson Red
}

BASE_GEOFENCE_RADII = {
    SeverityLevel.LOW: 20.0,       # 20m safety exclusion
    SeverityLevel.MEDIUM: 45.0,    # 45m safety exclusion
    SeverityLevel.EXTREME: 100.0,  # 100m high-hazard zone
}

SEVERITY_RISK_SUMMARIES = {
    SeverityLevel.LOW: "Low navigation hazard. Benthic debris or small marine litter requiring environmental cleanup.",
    SeverityLevel.MEDIUM: "Moderate navigation & subsea hazard. Industrial equipment, chemical drums, or snagging risk.",
    SeverityLevel.EXTREME: "Critical navigation hazard. Submerged structure, shipwreck, or massive seabed anomaly.",
}


class GeospatialService:
    """Computes deterministic severity, georeferenced coordinates, and dynamic geofences."""

    @staticmethod
    def classify_severity(
        class_name: str,
        area_pixels: int,
        confidence: float,
        anomaly_score: float,
    ) -> SeverityLevel:
        """Determines severity according to SIH26057 MoES environmental and navigation risk criteria."""
        c = (class_name or "").lower().strip()

        # 1. EXTREME Classes: Large wrecks, containers, or high-anomaly unknown targets
        if c in ["sunken_wreckage", "wreckage", "shipwreck", "aircraft"]:
            return SeverityLevel.EXTREME

        if c in ["container_crate", "container"] and (area_pixels > 10000 or confidence >= 0.85):
            return SeverityLevel.EXTREME

        if "unknown" in c or c == "ood":
            if anomaly_score >= 0.70 or area_pixels >= 11000:
                return SeverityLevel.EXTREME
            elif anomaly_score >= 0.40:
                return SeverityLevel.MEDIUM
            else:
                return SeverityLevel.LOW

        # 2. MEDIUM Classes: Industrial infrastructure, chemical drums, subsea snagging hazards
        if c in ["pipe_pipeline", "metal_drum", "anchor_chain", "container_crate"]:
            return SeverityLevel.MEDIUM

        if c == "ghost_net" and (area_pixels > 7500 or confidence >= 0.85):
            return SeverityLevel.MEDIUM

        # 3. LOW Classes: Small debris, tires, natural boulders, organic wood
        return SeverityLevel.LOW

    @staticmethod
    def compute_geolocation(
        center_x: float,
        center_y: float,
        image_width: int,
        image_height: int,
        towfish_lat: float = DEFAULT_SURVEY_LAT,
        towfish_lng: float = DEFAULT_SURVEY_LNG,
        depth_m: float = DEFAULT_ALTITUDE_M,
    ) -> GeolocationData:
        """Projects pixel coordinates within the side-scan sonar swath into WGS84 coordinates."""
        img_w = max(1, image_width or 800)
        img_h = max(1, image_height or 600)

        # Normalized coordinates relative to image center (-1.0 to +1.0)
        norm_x = (center_x - (img_w / 2.0)) / (img_w / 2.0)
        norm_y = (center_y - (img_h / 2.0)) / (img_h / 2.0)

        # Across-track offset (port is negative, starboard is positive)
        across_track_m = norm_x * SWATH_RANGE_M
        # Along-track offset (top of image is ahead of towfish, bottom is behind)
        along_track_m = -norm_y * (SWATH_RANGE_M * (img_h / img_w))

        # WGS84 degree conversion
        meters_per_deg_lat = 111320.0
        meters_per_deg_lng = 111320.0 * math.cos(math.radians(towfish_lat))

        delta_lat = along_track_m / meters_per_deg_lat
        delta_lng = across_track_m / max(1.0, meters_per_deg_lng)

        target_lat = round(towfish_lat + delta_lat, 6)
        target_lng = round(towfish_lng + delta_lng, 6)

        return GeolocationData(
            latitude=target_lat,
            longitude=target_lng,
            depth_meters=depth_m,
            location_type="image_swath_georeferenced",
            is_image_level=True,
            towfish_lat=towfish_lat,
            towfish_lng=towfish_lng,
            across_track_offset_m=round(across_track_m, 2),
            along_track_offset_m=round(along_track_m, 2),
            uncertainty_radius_m=8.0,
            georeference_note="Acoustic across-track georeferenced from towfish survey center.",
        )

    @staticmethod
    def generate_geofence_polygon(
        center_lat: float,
        center_lng: float,
        radius_m: float,
        num_points: int = 32,
    ) -> List[List[float]]:
        """Generates a 32-point circular GeoJSON polygon [lng, lat] coordinate list."""
        coords: List[List[float]] = []
        meters_per_deg_lat = 111320.0
        meters_per_deg_lng = 111320.0 * math.cos(math.radians(center_lat))

        for i in range(num_points):
            angle = (2.0 * math.pi * i) / num_points
            dx = radius_m * math.cos(angle)
            dy = radius_m * math.sin(angle)

            pt_lat = round(center_lat + (dy / meters_per_deg_lat), 7)
            pt_lng = round(center_lng + (dx / meters_per_deg_lng), 7)
            coords.append([pt_lng, pt_lat])

        # Close polygon loop
        if coords:
            coords.append(coords[0])
        return coords

    @classmethod
    def compute_dynamic_geofence(
        cls,
        severity: SeverityLevel,
        center_lat: float,
        center_lng: float,
        area_pixels: int,
        image_width: int,
        image_height: int,
        anomaly_score: float,
    ) -> GeofenceData:
        """Computes parametric dynamic geofence radius and polygonal perimeter."""
        base_r = BASE_GEOFENCE_RADII[severity]
        img_area = max(1, (image_width or 800) * (image_height or 600))
        area_ratio = min(1.0, max(0.001, area_pixels / img_area))

        # Size scaling factor (larger objects get larger safety buffers)
        size_scale = 1.0 + min(1.2, math.sqrt(area_ratio) * 3.5)
        # Anomaly scaling factor (higher uncertainty/anomaly expands perimeter)
        anomaly_scale = 1.0 + (min(1.0, max(0.0, anomaly_score)) * 0.25)

        final_radius = round(base_r * size_scale * anomaly_scale, 1)
        polygon = cls.generate_geofence_polygon(center_lat, center_lng, final_radius)

        return GeofenceData(
            radius_meters=final_radius,
            severity=severity,
            color_hex=SEVERITY_COLORS[severity],
            polygon_coordinates=polygon,
            risk_summary=SEVERITY_RISK_SUMMARIES[severity],
            buffer_type="dynamic_safety_exclusion",
        )

    @classmethod
    def enrich_detection_item(
        cls,
        det_dict: Dict[str, Any],
        image_id: str,
        image_width: int,
        image_height: int,
        towfish_lat: float = DEFAULT_SURVEY_LAT,
        towfish_lng: float = DEFAULT_SURVEY_LNG,
        depth_m: float = DEFAULT_ALTITUDE_M,
        model_version: str = "sonar_v2.pt",
    ) -> GeospatialDetectionItem:
        """Enriches an individual detection dictionary with geospatial and geofencing metadata."""
        det_id = int(det_dict.get("id", 1))
        class_name = str(det_dict.get("class_name") or det_dict.get("class") or "unknown_debris")
        display_name = str(det_dict.get("display_name") or class_name.replace("_", " ").title())
        confidence = float(det_dict.get("confidence", 0.5))
        anomaly_score = float(det_dict.get("anomaly_score", 0.0))
        area = int(det_dict.get("area", 1000))
        src = str(det_dict.get("classification_source", "detector"))

        bbox_raw = det_dict.get("bbox", [0, 0, 10, 10])
        if isinstance(bbox_raw, list):
            bbox_list = [int(v) for v in bbox_raw]
            bw = max(1, bbox_list[2] - bbox_list[0]) if len(bbox_list) >= 4 else 10
            bh = max(1, bbox_list[3] - bbox_list[1]) if len(bbox_list) >= 4 else 10
            bx, by = bbox_list[0], bbox_list[1]
        else:
            bx = int(bbox_raw.get("x", 0))
            by = int(bbox_raw.get("y", 0))
            bw = int(bbox_raw.get("width", 10))
            bh = int(bbox_raw.get("height", 10))
            bbox_list = [bx, by, bx + bw, by + bh]

        center_raw = det_dict.get("center", {})
        cx = float(center_raw.get("x", bx + (bw / 2.0)))
        cy = float(center_raw.get("y", by + (bh / 2.0)))

        # 1. Classify Severity
        severity = cls.classify_severity(class_name, area, confidence, anomaly_score)

        # 2. Compute Geolocation
        if det_dict.get("latitude") is not None and det_dict.get("longitude") is not None:
            target_lat = float(det_dict["latitude"])
            target_lng = float(det_dict["longitude"])
            signed_offset = float(det_dict.get("range_from_nadir_m", 0.0) or 0.0)
            if det_dict.get("side") == "port":
                signed_offset = -signed_offset

            geolocation = GeolocationData(
                latitude=target_lat,
                longitude=target_lng,
                depth_meters=depth_m,
                location_type="georeferencer_exact",
                is_image_level=True,
                towfish_lat=towfish_lat,
                towfish_lng=towfish_lng,
                across_track_offset_m=round(signed_offset, 2),
                along_track_offset_m=0.0,
                uncertainty_radius_m=4.0,
                georeference_note="Sonar georeferenced from acoustic ping navigation log.",
            )
        else:
            geolocation = cls.compute_geolocation(
                center_x=cx,
                center_y=cy,
                image_width=image_width,
                image_height=image_height,
                towfish_lat=towfish_lat,
                towfish_lng=towfish_lng,
                depth_m=depth_m,
            )

        # 3. Compute Dynamic Geofence
        geofence = cls.compute_dynamic_geofence(
            severity=severity,
            center_lat=geolocation.latitude,
            center_lng=geolocation.longitude,
            area_pixels=area,
            image_width=image_width,
            image_height=image_height,
            anomaly_score=anomaly_score,
        )

        return GeospatialDetectionItem(
            detection_id=det_id,
            image_id=image_id,
            class_name=class_name,
            display_name=display_name,
            confidence=confidence,
            anomaly_score=anomaly_score,
            bbox=bbox_list,
            bbox_coords={"x": bx, "y": by, "width": bw, "height": bh},
            center_pixel={"x": cx, "y": cy},
            area_pixels=area,
            classification_source=src,
            model_version=model_version,
            geolocation=geolocation,
            severity=severity,
            geofence=geofence,
        )

    @classmethod
    def enrich_image_response(
        cls,
        detect_response_dict: Dict[str, Any],
        towfish_lat: float = DEFAULT_SURVEY_LAT,
        towfish_lng: float = DEFAULT_SURVEY_LNG,
        depth_m: float = DEFAULT_ALTITUDE_M,
    ) -> GeospatialImageResponse:
        """Enriches a complete detection response dictionary with geospatial & geofence items."""
        image_id = str(detect_response_dict.get("image_id", "UNKNOWN_IMAGE"))
        raw_detections = detect_response_dict.get("detections", [])
        img_w = int(detect_response_dict.get("image_width") or 800)
        img_h = int(detect_response_dict.get("image_height") or 600)
        model_version = str(detect_response_dict.get("model", "sonar_v2.pt"))

        enriched_items: List[GeospatialDetectionItem] = []
        severity_counts = {
            SeverityLevel.LOW.value: 0,
            SeverityLevel.MEDIUM.value: 0,
            SeverityLevel.EXTREME.value: 0,
        }

        for d in raw_detections:
            d_dict = d if isinstance(d, dict) else d.model_dump()
            item = cls.enrich_detection_item(
                det_dict=d_dict,
                image_id=image_id,
                image_width=img_w,
                image_height=img_h,
                towfish_lat=towfish_lat,
                towfish_lng=towfish_lng,
                depth_m=depth_m,
                model_version=model_version,
            )
            enriched_items.append(item)
            severity_counts[item.severity.value] += 1

        telemetry = {
            "towfish_latitude": towfish_lat,
            "towfish_longitude": towfish_lng,
            "altitude_depth_m": depth_m,
            "swath_width_m": SWATH_RANGE_M * 2.0,
            "survey_zone": "Palk Strait (9.3142°N, 79.1821°E)",
            "coordinate_mode": "Towfish Acoustic Swath Georeferenced (Image-Level)",
        }

        return GeospatialImageResponse(
            image_id=image_id,
            total_targets=len(enriched_items),
            survey_location="Palk Strait / Gulf of Mannar MoES Acoustic Survey",
            towfish_telemetry=telemetry,
            detections=enriched_items,
            severity_breakdown=severity_counts,
            timestamp=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        )
