"""Pydantic Schemas for AISStream Vessel Tracking & Geofence Proximity (SIH 26057)."""

from __future__ import annotations

from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class AisConnectionStatus(str, Enum):
    LIVE = "LIVE"
    CONNECTING = "CONNECTING"
    OFFLINE = "OFFLINE"
    NOT_CONFIGURED = "NOT_CONFIGURED"


class VesselAlertStatus(str, Enum):
    INSIDE = "INSIDE"
    APPROACHING = "APPROACHING"
    OUTSIDE = "OUTSIDE"


class VesselPositionPoint(BaseModel):
    """Single historical coordinate point for vessel track history."""
    latitude: float
    longitude: float
    timestamp: str
    speed_knots: Optional[float] = None
    course_deg: Optional[float] = None


class VesselState(BaseModel):
    """Normalized vessel telemetry model derived strictly from AISStream."""
    mmsi: str = Field(..., description="Unique Maritime Mobile Service Identity")
    ship_name: Optional[str] = Field(None, description="Reported vessel name or null if unavailable")
    latitude: float = Field(..., description="WGS84 Latitude")
    longitude: float = Field(..., description="WGS84 Longitude")
    speed_knots: Optional[float] = Field(None, description="Speed Over Ground (SOG) in knots")
    course_deg: Optional[float] = Field(None, description="Course Over Ground (COG) in degrees (0-360)")
    heading_deg: Optional[float] = Field(None, description="True heading in degrees (0-359) or null")
    nav_status: Optional[str] = Field(None, description="Navigational status description or null")
    ship_type: Optional[str] = Field(None, description="Vessel type description or numeric code")
    imo: Optional[str] = Field(None, description="International Maritime Organization number")
    destination: Optional[str] = Field(None, description="Reported destination port/area")
    eta: Optional[str] = Field(None, description="Estimated Time of Arrival")
    timestamp: str = Field(..., description="ISO 8601 UTC timestamp of last received AIS message")
    is_stale: bool = Field(False, description="Flag indicating if vessel update exceeds stale threshold")
    last_seen_seconds_ago: float = Field(0.0, description="Elapsed seconds since last AIS update")


class VesselTrack(BaseModel):
    """Bounded trajectory points for a vessel."""
    mmsi: str
    positions: List[VesselPositionPoint] = Field(default_factory=list)


class VesselProximityAlert(BaseModel):
    """Alert generated when a live vessel approaches or enters an active debris geofence."""
    vessel_mmsi: str
    ship_name: str
    detection_id: int
    debris_class: str
    severity: str
    distance_meters: float
    geofence_radius_meters: float
    status: VesselAlertStatus
    alert_message: str
    timestamp: str


class AisBoundingBox(BaseModel):
    """Geographic bounding box for AIS filtering."""
    min_latitude: float
    min_longitude: float
    max_latitude: float
    max_longitude: float


class AisStatusResponse(BaseModel):
    """Overall status and telemetry of the AISStream backend service."""
    status: AisConnectionStatus
    is_configured: bool
    vessel_count: int
    stale_vessel_count: int
    last_update: Optional[str] = None
    bounding_box: AisBoundingBox
    active_alerts_count: int = 0
    connected_clients: int = 0
    uptime_seconds: float = 0.0
