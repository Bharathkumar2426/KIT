"""Pydantic Schemas for Geospatial Representation, Severity, and Dynamic Geofencing (SIH 26057)."""

from __future__ import annotations

from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class SeverityLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    EXTREME = "EXTREME"


class GeolocationData(BaseModel):
    """Accurate geolocation metadata preserving image-level telemetry."""
    latitude: float = Field(..., description="Target or Towfish WGS84 Latitude")
    longitude: float = Field(..., description="Target or Towfish WGS84 Longitude")
    depth_meters: float = Field(28.0, description="Sensor depth or altitude in meters (AGL/MSL)")
    location_type: str = Field(
        "image_swath_georeferenced",
        description="image_level | image_swath_georeferenced | precise_acoustic_nav"
    )
    is_image_level: bool = Field(
        True,
        description="Explicit flag indicating whether coordinates are derived from image-level survey data"
    )
    towfish_lat: float = Field(9.3142, description="Towfish track center latitude")
    towfish_lng: float = Field(79.1821, description="Towfish track center longitude")
    across_track_offset_m: float = Field(0.0, description="Port(-) or Starboard(+) across-track offset in meters")
    along_track_offset_m: float = Field(0.0, description="Along-track offset in meters")
    uncertainty_radius_m: float = Field(10.0, description="Estimated positioning uncertainty in meters")
    georeference_note: str = Field(
        "Georeferenced from towfish survey coordinates (Palk Strait / Gulf of Mannar MoES Survey Zone).",
        description="Human-readable disclaimer on coordinate precision"
    )


class GeofenceData(BaseModel):
    """Dynamic geofence parameters and polygonal boundary."""
    radius_meters: float = Field(..., description="Dynamic safety perimeter radius in meters")
    severity: SeverityLevel = Field(..., description="Severity tier determining base perimeter")
    color_hex: str = Field(..., description="Color hex code (#10b981, #f59e0b, #ef4444)")
    polygon_coordinates: List[List[float]] = Field(
        default_factory=list,
        description="List of [lng, lat] GeoJSON coordinates defining the circular buffer boundary"
    )
    risk_summary: str = Field(..., description="Physical risk rationale for exclusion zone")
    buffer_type: str = Field("dynamic_safety_exclusion", description="Type of geofence zone")


class GeospatialDetectionItem(BaseModel):
    """Enriched detection item containing existing detection data plus geospatial & geofence fields."""
    detection_id: int
    image_id: str
    class_name: str
    display_name: str
    confidence: float
    anomaly_score: float
    bbox: List[int]
    bbox_coords: Dict[str, int]
    center_pixel: Dict[str, float]
    area_pixels: int
    classification_source: str
    model_version: str

    # Additive Geolocation & Geofence fields
    geolocation: GeolocationData
    severity: SeverityLevel
    geofence: GeofenceData


class GeospatialImageResponse(BaseModel):
    """Full geospatial response for an analyzed sonar image."""
    image_id: str
    total_targets: int
    survey_location: str = "Palk Strait / Gulf of Mannar MoES Acoustic Survey"
    towfish_telemetry: Dict[str, Any]
    detections: List[GeospatialDetectionItem]
    severity_breakdown: Dict[str, int]
    timestamp: str
