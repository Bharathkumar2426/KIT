"""Pydantic Schemas for AI-Powered Maritime Incident Intelligence (SIH 26057).

Defines structured models for incident ingestion, multi-source citations,
location precision, danger-zone boundaries, operator confirmations,
live AIS proximity alarms, and anti-spam alert management.
"""

from __future__ import annotations

from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class IncidentSeverity(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class IncidentType(str, Enum):
    COLLISION = "Collision"
    SINKING = "Vessel Sinking"
    FIRE_EXPLOSION = "Vessel Fire / Explosion"
    OIL_SPILL_POLLUTION = "Oil Spill / Marine Pollution"
    GROUNDING = "Ship Grounding"
    DISTRESS_SAR = "Distress / Search & Rescue"
    NAVIGATION_HAZARD = "Navigation Hazard"
    SEVERE_WEATHER_CYCLONE = "Severe Marine Weather / Cyclone"
    TSUNAMI_SWELL = "Tsunami / Swell Surge"
    FLOATING_DEBRIS = "Floating Debris / Dangerous Object"
    OTHER = "Other Maritime Incident"


class LocationPrecision(str, Enum):
    EXACT = "EXACT"
    APPROXIMATE = "APPROXIMATE"
    REGION_ONLY = "REGION ONLY"
    UNKNOWN = "UNKNOWN"


class SourceTrustLevel(str, Enum):
    LEVEL_1_AUTHORITATIVE = "LEVEL_1_AUTHORITATIVE"
    LEVEL_2_SPECIALIZED = "LEVEL_2_SPECIALIZED"
    LEVEL_3_NEWS = "LEVEL_3_NEWS"


class VerificationStatus(str, Enum):
    REPORTED = "REPORTED"
    CORROBORATED = "CORROBORATED"
    CONFIRMED_OFFICIAL = "CONFIRMED_OFFICIAL"


class IncidentStatus(str, Enum):
    ACTIVE = "ACTIVE"
    RESOLVED = "RESOLVED"
    DISMISSED = "DISMISSED"


class AlarmLevel(str, Enum):
    LEVEL_1_APPROACHING = "LEVEL_1_APPROACHING"
    LEVEL_2_NEAR_DANGER_ZONE = "LEVEL_2_NEAR_DANGER_ZONE"
    LEVEL_3_ENTERED_DANGER_ZONE = "LEVEL_3_ENTERED_DANGER_ZONE"
    LEVEL_4_CRITICAL_HAZARD_BREACH = "LEVEL_4_CRITICAL_HAZARD_BREACH"


class IncidentSourceItem(BaseModel):
    """Citation metadata for an individual source contributing to an incident."""
    source_name: str
    source_type: str = Field(description="e.g. NOAA, USCG, NGA, INCOIS, ICG, NewsAPI, Mediastack, GDELT, GFW")
    source_url: str
    source_trust_level: SourceTrustLevel = SourceTrustLevel.LEVEL_3_NEWS
    published_at: Optional[str] = None
    event_time: Optional[str] = None
    author: Optional[str] = None
    raw_title: Optional[str] = None
    snippet: Optional[str] = None


class NearbyVesselRisk(BaseModel):
    """Live AIS vessel telemetry correlated with a confirmed incident danger zone."""
    vessel_mmsi: str
    ship_name: Optional[str] = None
    latitude: float
    longitude: float
    distance_km: float
    speed_knots: Optional[float] = None
    course_deg: Optional[float] = None
    heading_deg: Optional[float] = None
    eta_minutes: Optional[float] = None
    risk_level: str = Field(default="MONITORED", description="DANGER, WARNING, APPROACHING, or MONITORED")
    last_ais_update: Optional[str] = None
    is_live_ais: bool = True


class IncidentProximityAlarm(BaseModel):
    """Real-time maritime proximity alarm triggered when a live vessel breaches a danger zone."""
    alarm_id: str
    vessel_mmsi: str
    ship_name: str
    incident_id: str
    incident_title: str
    severity: IncidentSeverity
    distance_km: float
    danger_radius_km: float
    speed_knots: Optional[float] = None
    course_deg: Optional[float] = None
    alarm_level: AlarmLevel
    alarm_message: str
    is_live_ais: bool = True
    triggered_at: str
    cooldown_until: Optional[str] = None
    is_acknowledged: bool = False


class Incident(BaseModel):
    """Normalized Maritime Incident with multi-source citations, provenance, and spatial intelligence."""
    incident_id: str
    title: str
    incident_type: IncidentType = IncidentType.OTHER
    description: str
    source_name: str
    source_type: str
    source_url: str
    source_trust_level: SourceTrustLevel = SourceTrustLevel.LEVEL_3_NEWS
    sources: List[IncidentSourceItem] = Field(default_factory=list)
    published_at: Optional[str] = None
    event_time: Optional[str] = None
    last_updated: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_text: str = "Unknown Location"
    location_precision: LocationPrecision = LocationPrecision.UNKNOWN
    location_source: Optional[str] = None
    coordinate_source: Optional[str] = None
    time_source: Optional[str] = None
    severity_source: Optional[str] = None
    severity: IncidentSeverity = IncidentSeverity.MEDIUM
    confidence: float = Field(default=0.75, ge=0.0, le=1.0)
    verification_status: VerificationStatus = VerificationStatus.REPORTED
    status: IncidentStatus = IncidentStatus.ACTIVE
    affected_area_radius_km: Optional[float] = None
    potential_danger_zone: bool = False
    danger_radius_source: Optional[str] = None
    danger_radius_basis: Optional[str] = None
    is_mapped: bool = False
    is_dismissed: bool = False
    related_vessel_count: int = 0
    related_mmsi: List[str] = Field(default_factory=list)
    keywords: List[str] = Field(default_factory=list)
    ai_reasoning_summary: Optional[str] = None
    raw_source_reference: Optional[str] = None
    created_at: str
    updated_at: str
    nearby_vessels: Optional[List[NearbyVesselRisk]] = None
    active_alarms: Optional[List[IncidentProximityAlarm]] = None


class IncidentConfirmationRequest(BaseModel):
    """Operator confirmation to place an incident and optional danger zone on the map."""
    incident_id: str
    custom_danger_radius_km: Optional[float] = None
    operator_notes: Optional[str] = None


class IncidentDismissRequest(BaseModel):
    """Operator request to dismiss an incident from priority review."""
    incident_id: str
    dismissal_reason: Optional[str] = None


class IncidentMetrics(BaseModel):
    """Executive KPI counters for the incident intelligence dashboard."""
    total_incidents: int = 0
    critical_count: int = 0
    high_count: int = 0
    medium_count: int = 0
    low_count: int = 0
    pending_confirmation_count: int = 0
    mapped_count: int = 0
    active_danger_zones_count: int = 0
    vessels_in_danger_count: int = 0
    sources_online_count: int = 0
    total_sources_count: int = 9
    last_ingestion_time: Optional[str] = None
    is_ais_live: bool = True


class SourceHealthStatus(BaseModel):
    """Health and connectivity report for an individual data collector."""
    source_id: str
    source_name: str
    trust_level: SourceTrustLevel
    status: str = Field(default="ONLINE", description="ONLINE, DEGRADED, or OFFLINE")
    last_successful_fetch: Optional[str] = None
    items_fetched: int = 0
    error_message: Optional[str] = None
    endpoint_or_url: Optional[str] = None
