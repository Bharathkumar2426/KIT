"""Multi-Source Deduplication, Event Clustering & Cross-Validation (SIH 26057).

Clusters incoming incident reports from official agencies and news wires into
unified incident dossiers, boosting confidence when independent sources corroborate.
"""

from __future__ import annotations

import math
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional

from backend.models.incident_schemas import (
    Incident,
    IncidentSeverity,
    IncidentSourceItem,
    IncidentStatus,
    LocationPrecision,
    SourceTrustLevel,
    VerificationStatus,
)
from backend.services.incident_sources.base_source import RawIncidentItem


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two points in kilometers."""
    r = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0) ** 2
    return 2.0 * r * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))


class IncidentDeduplicationService:
    """Clusters multi-source reports and performs confidence cross-validation."""

    def cluster_and_merge(
        self, raw_items: List[RawIncidentItem], existing_incidents: List[Incident], ai_features_map: Dict[str, Dict]
    ) -> List[Incident]:
        """Merges new raw items with existing incidents, updating citations and confidence."""
        incidents_by_id: Dict[str, Incident] = {inc.incident_id: inc for inc in existing_incidents}

        for item in raw_items:
            features = ai_features_map.get(item.source_id + "_" + item.raw_title, {})
            matched_id = self._find_matching_incident(item, features, list(incidents_by_id.values()))

            source_item = IncidentSourceItem(
                source_name=item.source_name,
                source_type=item.source_type,
                source_url=item.source_url,
                source_trust_level=item.source_trust_level,
                published_at=item.published_at,
                event_time=item.event_time,
                author=item.raw_metadata.get("author") or item.raw_metadata.get("outlet"),
                raw_title=item.raw_title,
                snippet=item.raw_text[:250],
            )

            if matched_id and matched_id in incidents_by_id:
                # Merge into existing incident
                existing = incidents_by_id[matched_id]
                
                # Avoid duplicate source citations
                if not any(s.source_url == source_item.source_url for s in existing.sources):
                    existing.sources.append(source_item)
                
                # Check for official confirmation
                has_official = any(s.source_trust_level == SourceTrustLevel.LEVEL_1_AUTHORITATIVE for s in existing.sources)
                if has_official:
                    existing.verification_status = VerificationStatus.CONFIRMED_OFFICIAL
                    existing.confidence = min(0.98, existing.confidence + 0.10)
                elif len(existing.sources) >= 2:
                    existing.verification_status = VerificationStatus.CORROBORATED
                    existing.confidence = min(0.95, existing.confidence + 0.08)

                # Upgrade precision if exact coordinates become available from new source
                if features.get("location_precision") == LocationPrecision.EXACT and existing.location_precision != LocationPrecision.EXACT:
                    existing.latitude = features.get("latitude")
                    existing.longitude = features.get("longitude")
                    existing.location_text = features.get("location_text")
                    existing.location_precision = LocationPrecision.EXACT
                    existing.coordinate_source = features.get("coordinate_source")

                # Merge keywords and MMSIs
                for kw in features.get("keywords", []):
                    if kw not in existing.keywords:
                        existing.keywords.append(kw)

                for mmsi in features.get("related_mmsi", []):
                    if mmsi not in existing.related_mmsi:
                        existing.related_mmsi.append(mmsi)

                existing.updated_at = datetime.now(timezone.utc).isoformat()

            else:
                # Create brand new incident
                new_id = f"INC_{datetime.now(timezone.utc).strftime('%Y%m%d')}_{uuid.uuid4().hex[:6].upper()}"
                
                verif = VerificationStatus.REPORTED
                if item.source_trust_level == SourceTrustLevel.LEVEL_1_AUTHORITATIVE:
                    verif = VerificationStatus.CONFIRMED_OFFICIAL

                new_inc = Incident(
                    incident_id=new_id,
                    title=item.raw_title,
                    incident_type=features.get("incident_type"),
                    description=item.raw_text,
                    source_name=item.source_name,
                    source_type=item.source_type,
                    source_url=item.source_url,
                    source_trust_level=item.source_trust_level,
                    sources=[source_item],
                    published_at=item.published_at,
                    event_time=item.event_time,
                    last_updated=datetime.now(timezone.utc).isoformat(),
                    latitude=features.get("latitude"),
                    longitude=features.get("longitude"),
                    location_text=features.get("location_text", "Unknown Location"),
                    location_precision=features.get("location_precision", LocationPrecision.UNKNOWN),
                    location_source=features.get("location_source", item.source_name),
                    coordinate_source=features.get("coordinate_source"),
                    time_source=features.get("time_source"),
                    severity_source=features.get("severity_source"),
                    severity=features.get("severity", IncidentSeverity.MEDIUM),
                    confidence=features.get("confidence", 0.75),
                    verification_status=verif,
                    status=IncidentStatus.ACTIVE,
                    affected_area_radius_km=features.get("affected_area_radius_km"),
                    potential_danger_zone=features.get("potential_danger_zone", False),
                    danger_radius_source=features.get("danger_radius_source"),
                    danger_radius_basis=features.get("danger_radius_basis"),
                    is_mapped=bool(verif == VerificationStatus.CONFIRMED_OFFICIAL and features.get("latitude") is not None),
                    is_dismissed=False,
                    related_vessel_count=features.get("related_vessel_count", 0),
                    related_mmsi=features.get("related_mmsi", []),
                    keywords=features.get("keywords", []),
                    ai_reasoning_summary=features.get("ai_reasoning_summary"),
                    raw_source_reference=item.raw_text[:300],
                    created_at=datetime.now(timezone.utc).isoformat(),
                    updated_at=datetime.now(timezone.utc).isoformat(),
                )
                incidents_by_id[new_id] = new_inc

        return list(incidents_by_id.values())

    def _find_matching_incident(
        self, item: RawIncidentItem, features: Dict, candidates: List[Incident]
    ) -> Optional[str]:
        """Matches a raw item to an existing incident using text similarity and spatial proximity."""
        item_title_words = set(item.raw_title.lower().split())
        item_lat = features.get("latitude")
        item_lon = features.get("longitude")

        for c in candidates:
            # Exact URL match
            if c.source_url == item.source_url or any(s.source_url == item.source_url for s in c.sources):
                return c.incident_id

            # Spatial & type match (within 35 km)
            if item_lat is not None and item_lon is not None and c.latitude is not None and c.longitude is not None:
                dist = haversine_km(item_lat, item_lon, c.latitude, c.longitude)
                if dist <= 35.0 and c.incident_type == features.get("incident_type"):
                    return c.incident_id

            # Title keyword similarity (Jaccard > 0.40)
            c_title_words = set(c.title.lower().split())
            intersection = len(item_title_words.intersection(c_title_words))
            union = len(item_title_words.union(c_title_words))
            if union > 0 and (intersection / union) >= 0.40:
                return c.incident_id

        return None


_dedup_service: Optional[IncidentDeduplicationService] = None


def get_incident_deduplication_service() -> IncidentDeduplicationService:
    global _dedup_service
    if _dedup_service is None:
        _dedup_service = IncidentDeduplicationService()
    return _dedup_service
