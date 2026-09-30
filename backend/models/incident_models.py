"""SQLAlchemy ORM Model for Maritime Incidents (SIH 26057).

Persists incident records in an isolated SQLite table without touching sonar detection schemas.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import Boolean, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from backend.database import Base
from backend.models.incident_schemas import (
    Incident,
    IncidentSeverity,
    IncidentSourceItem,
    IncidentStatus,
    IncidentType,
    LocationPrecision,
    SourceTrustLevel,
    VerificationStatus,
)


class MaritimeIncidentRecord(Base):
    """SQLAlchemy model for maritime incidents, danger zones, and provenance audit."""

    __tablename__ = "maritime_incidents"

    incident_id: Mapped[str] = mapped_column(String(64), primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    incident_type: Mapped[str] = mapped_column(String(64), default=IncidentType.OTHER.value, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    source_name: Mapped[str] = mapped_column(String(128), nullable=False)
    source_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    source_url: Mapped[str] = mapped_column(String(512), nullable=False)
    source_trust_level: Mapped[str] = mapped_column(String(32), default=SourceTrustLevel.LEVEL_3_NEWS.value)
    sources_json: Mapped[str] = mapped_column(Text, default="[]")
    published_at: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    event_time: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    last_updated: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True, index=True)
    longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True, index=True)
    location_text: Mapped[str] = mapped_column(String(255), default="Unknown Location")
    location_precision: Mapped[str] = mapped_column(String(32), default=LocationPrecision.UNKNOWN.value)
    location_source: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    coordinate_source: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    time_source: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    severity_source: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    severity: Mapped[str] = mapped_column(String(32), default=IncidentSeverity.MEDIUM.value, index=True)
    confidence: Mapped[float] = mapped_column(Float, default=0.75)
    verification_status: Mapped[str] = mapped_column(String(32), default=VerificationStatus.REPORTED.value)
    status: Mapped[str] = mapped_column(String(32), default=IncidentStatus.ACTIVE.value, index=True)
    affected_area_radius_km: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    potential_danger_zone: Mapped[bool] = mapped_column(Boolean, default=False)
    danger_radius_source: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    danger_radius_basis: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_mapped: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    is_dismissed: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    related_vessel_count: Mapped[int] = mapped_column(Integer, default=0)
    related_mmsi_json: Mapped[str] = mapped_column(Text, default="[]")
    keywords_json: Mapped[str] = mapped_column(Text, default="[]")
    ai_reasoning_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    raw_source_reference: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[str] = mapped_column(String(64), default=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: Mapped[str] = mapped_column(String(64), default=lambda: datetime.now(timezone.utc).isoformat())

    def to_schema(self) -> Incident:
        """Converts ORM record into Pydantic schema."""
        sources: List[IncidentSourceItem] = []
        try:
            raw_sources = json.loads(self.sources_json or "[]")
            sources = [IncidentSourceItem(**s) for s in raw_sources]
        except Exception:
            sources = []

        keywords: List[str] = []
        try:
            keywords = json.loads(self.keywords_json or "[]")
        except Exception:
            keywords = []

        related_mmsi: List[str] = []
        try:
            related_mmsi = json.loads(self.related_mmsi_json or "[]")
        except Exception:
            related_mmsi = []

        # Cast enums safely
        try:
            inc_type = IncidentType(self.incident_type)
        except Exception:
            inc_type = IncidentType.OTHER

        try:
            sev = IncidentSeverity(self.severity)
        except Exception:
            sev = IncidentSeverity.MEDIUM

        try:
            loc_prec = LocationPrecision(self.location_precision)
        except Exception:
            loc_prec = LocationPrecision.UNKNOWN

        try:
            trust = SourceTrustLevel(self.source_trust_level)
        except Exception:
            trust = SourceTrustLevel.LEVEL_3_NEWS

        try:
            verif = VerificationStatus(self.verification_status)
        except Exception:
            verif = VerificationStatus.REPORTED

        try:
            stat = IncidentStatus(self.status)
        except Exception:
            stat = IncidentStatus.ACTIVE

        return Incident(
            incident_id=self.incident_id,
            title=self.title,
            incident_type=inc_type,
            description=self.description,
            source_name=self.source_name,
            source_type=self.source_type,
            source_url=self.source_url,
            source_trust_level=trust,
            sources=sources,
            published_at=self.published_at,
            event_time=self.event_time,
            last_updated=self.last_updated,
            latitude=self.latitude,
            longitude=self.longitude,
            location_text=self.location_text,
            location_precision=loc_prec,
            location_source=self.location_source,
            coordinate_source=self.coordinate_source,
            time_source=self.time_source,
            severity_source=self.severity_source,
            severity=sev,
            confidence=self.confidence,
            verification_status=verif,
            status=stat,
            affected_area_radius_km=self.affected_area_radius_km,
            potential_danger_zone=self.potential_danger_zone,
            danger_radius_source=self.danger_radius_source,
            danger_radius_basis=self.danger_radius_basis,
            is_mapped=self.is_mapped,
            is_dismissed=self.is_dismissed,
            related_vessel_count=self.related_vessel_count,
            related_mmsi=related_mmsi,
            keywords=keywords,
            ai_reasoning_summary=self.ai_reasoning_summary,
            raw_source_reference=self.raw_source_reference,
            created_at=self.created_at,
            updated_at=self.updated_at,
        )
