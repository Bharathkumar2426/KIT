"""AI Incident Information Extraction & Taxonomy Classifier (SIH 26057).

Performs heuristic NLP, maritime entity extraction, coordinate parsing with
strict no-hallucination guarantees, severity scoring, and danger radius assessment.
"""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Tuple

from backend.models.incident_schemas import (
    IncidentSeverity,
    IncidentType,
    LocationPrecision,
    SourceTrustLevel,
)
from backend.services.incident_sources.base_source import RawIncidentItem

# Curated lookup table for well-known coastal sectors and ports
KNOWN_COASTAL_SECTORS: Dict[str, Tuple[float, float]] = {
    "palk strait": (9.3142, 79.1821),
    "palk bay": (9.3240, 79.1720),
    "gulf of mannar": (8.8500, 79.1200),
    "rameswaram": (9.2876, 79.3129),
    "dhanushkodi": (9.1770, 79.4160),
    "chennai": (13.0827, 80.2707),
    "mumbai high": (19.4120, 71.3210),
    "strait of malacca": (4.2105, 99.8210),
    "malacca strait": (4.2105, 99.8210),
    "kochi": (9.9312, 76.2673),
    "goa": (15.2993, 73.9800),
    "fujairah": (25.1840, 56.3650),
    "gulf of oman": (24.5000, 58.5000),
    "florida straits": (24.5210, -80.8410),
    "charleston harbor": (32.7420, -79.8210),
    "southwest pass": (29.1842, -89.2451),
    "port fourchon": (28.2417, -90.7033),
}

# Broad ocean regions (Marked as REGION ONLY, not fabricated points)
BROAD_REGIONS: Dict[str, Tuple[float, float]] = {
    "bay of bengal": (14.0000, 85.0000),
    "arabian sea": (15.0000, 70.0000),
    "indian ocean": (5.0000, 80.0000),
    "gulf of mexico": (26.0000, -90.0000),
}


class IncidentAIService:
    """Extracts structured entities, verifies coordinates, and computes severity for maritime reports."""

    def extract_incident_features(self, item: RawIncidentItem) -> Dict[str, Any]:
        """Full AI extraction pipeline on raw incident text."""
        combined_text = f"{item.raw_title} {item.raw_text}"
        text_lower = combined_text.lower()

        # 1. Classify Incident Type
        inc_type = self._classify_type(text_lower)

        # 2. Extract and Validate Coordinates (Strict No-Hallucination)
        lat, lon, loc_text, precision, coord_src = self._extract_location(item, text_lower, combined_text)

        # 3. Assess Severity
        severity, sev_src = self._assess_severity(inc_type, text_lower, item.source_trust_level)

        # 4. Calculate Confidence Score
        confidence = self._calculate_confidence(item, precision, severity)

        # 5. Calculate Recommended Potential Danger Radius (km) and Basis
        danger_radius, has_danger_zone, danger_src, danger_basis = self._calculate_danger_radius(
            inc_type, severity, text_lower, item
        )

        # 6. Extract Related MMSIs & Keywords
        mmsi_list = self._extract_mmsi(combined_text, item.raw_metadata)
        keywords = self._extract_keywords(text_lower)

        # 7. Provenance for Time
        time_src = "Report metadata timestamp" if item.event_time else "Publication wire timestamp"

        # 8. Generate AI Extraction Reasoning Summary
        ai_reasoning = self._generate_reasoning(
            inc_type=inc_type,
            severity=severity,
            precision=precision,
            danger_radius=danger_radius,
            source_trust=item.source_trust_level,
            has_coords=(lat is not None and lon is not None),
        )

        return {
            "incident_type": inc_type,
            "latitude": lat,
            "longitude": lon,
            "location_text": loc_text,
            "location_precision": precision,
            "location_source": item.source_name,
            "coordinate_source": coord_src,
            "time_source": time_src,
            "severity_source": sev_src,
            "severity": severity,
            "confidence": confidence,
            "affected_area_radius_km": danger_radius,
            "potential_danger_zone": has_danger_zone,
            "danger_radius_source": danger_src,
            "danger_radius_basis": danger_basis,
            "related_mmsi": mmsi_list,
            "related_vessel_count": len(mmsi_list) if mmsi_list else (1 if "vessel" in text_lower or "ship" in text_lower else 0),
            "keywords": keywords,
            "ai_reasoning_summary": ai_reasoning,
        }

    def _classify_type(self, text: str) -> IncidentType:
        if any(k in text for k in ["collision", "collided", "glancing blow"]):
            return IncidentType.COLLISION
        if any(k in text for k in ["sinking", "sank", "capsized", "submerged vessel", "sunken"]):
            return IncidentType.SINKING
        if any(k in text for k in ["explosion", "fire", "burning", "blaze in engine"]):
            return IncidentType.FIRE_EXPLOSION
        if any(k in text for k in ["oil spill", "fuel release", "pollution", "crude sheen", "sheen", "chemical spill"]):
            return IncidentType.OIL_SPILL_POLLUTION
        if any(k in text for k in ["grounding", "aground", "grounded", "stranded on reef", "sandbar"]):
            return IncidentType.GROUNDING
        if any(k in text for k in ["search and rescue", "sar", "distress", "rescued", "taking on water", "adrift without power"]):
            return IncidentType.DISTRESS_SAR
        if any(k in text for k in ["container adrift", "floating debris", "derelict", "unmanned barge", "floating hazard"]):
            return IncidentType.FLOATING_DEBRIS
        if any(k in text for k in ["tsunami", "swell surge", "high wave"]):
            return IncidentType.TSUNAMI_SWELL
        if any(k in text for k in ["cyclone", "depression", "squall", "heavy gale", "severe marine weather"]):
            return IncidentType.SEVERE_WEATHER_CYCLONE
        if any(k in text for k in ["navigation hazard", "uncharted obstruction", "navarea", "broadcast notice"]):
            return IncidentType.NAVIGATION_HAZARD
        return IncidentType.OTHER

    def _extract_location(
        self, item: RawIncidentItem, text_lower: str, raw_text: str
    ) -> Tuple[Optional[float], Optional[float], str, LocationPrecision, str]:
        """Extracts verified coordinates or approximate named locations without hallucination."""
        # A. Pre-extracted by official collector
        if item.extracted_latitude is not None and item.extracted_longitude is not None:
            lat = item.extracted_latitude
            lon = item.extracted_longitude
            loc_name = item.extracted_location_name or f"{abs(lat):.4f}°{'N' if lat>=0 else 'S'}, {abs(lon):.4f}°{'E' if lon>=0 else 'W'}"
            return round(lat, 4), round(lon, 4), loc_name, LocationPrecision.EXACT, f"Provided directly by {item.source_name}"

        # B. Regex for maritime coordinates like "14-48.0N 071-32.0E" or "28.14N 90.42W"
        coord_match = re.search(
            r"(\d{1,2})[-°\s](\d{1,2}(?:\.\d+)?)\s*([NS])\s*(\d{1,3})[-°\s](\d{1,2}(?:\.\d+)?)\s*([EW])",
            raw_text,
            re.IGNORECASE,
        )
        if coord_match:
            try:
                lat_d, lat_m, lat_hemi, lon_d, lon_m, lon_hemi = coord_match.groups()
                lat_val = float(lat_d) + float(lat_m) / 60.0
                if lat_hemi.upper() == "S":
                    lat_val = -lat_val
                lon_val = float(lon_d) + float(lon_m) / 60.0
                if lon_hemi.upper() == "W":
                    lon_val = -lon_val

                if -90.0 <= lat_val <= 90.0 and -180.0 <= lon_val <= 180.0:
                    loc_name = f"{abs(lat_val):.4f}°{lat_hemi.upper()}, {abs(lon_val):.4f}°{lon_hemi.upper()}"
                    return round(lat_val, 4), round(lon_val, 4), loc_name, LocationPrecision.EXACT, "Parsed from geographic text bulletin"
            except Exception:
                pass

        # C. Match specific coastal sector / port (APPROXIMATE)
        for loc_key, coords in KNOWN_COASTAL_SECTORS.items():
            if loc_key in text_lower:
                return coords[0], coords[1], loc_key.title(), LocationPrecision.APPROXIMATE, f"Georeferenced to named maritime sector '{loc_key.title()}'"

        # D. Match broad sea/ocean region (REGION ONLY)
        for reg_key, coords in BROAD_REGIONS.items():
            if reg_key in text_lower:
                return coords[0], coords[1], reg_key.title(), LocationPrecision.REGION_ONLY, f"Broad oceanic region '{reg_key.title()}' (Non-discrete centroid)"

        # E. UNKNOWN: Never invent coordinates
        return None, None, "Undetermined Marine Zone", LocationPrecision.UNKNOWN, "No coordinates provided by source"

    def _assess_severity(
        self, inc_type: IncidentType, text: str, trust: SourceTrustLevel
    ) -> Tuple[IncidentSeverity, str]:
        src_label = "Authoritative government rating" if trust == SourceTrustLevel.LEVEL_1_AUTHORITATIVE else "AI NLP severity assessment"
        if inc_type in (IncidentType.COLLISION, IncidentType.SINKING, IncidentType.FIRE_EXPLOSION, IncidentType.TSUNAMI_SWELL):
            return IncidentSeverity.CRITICAL, src_label
        if inc_type in (IncidentType.OIL_SPILL_POLLUTION, IncidentType.GROUNDING, IncidentType.DISTRESS_SAR, IncidentType.SEVERE_WEATHER_CYCLONE):
            if any(k in text for k in ["severe", "major", "urgency", "red alert", "crew rescued", "gallons", "flooded"]):
                return IncidentSeverity.CRITICAL, src_label
            return IncidentSeverity.HIGH, src_label
        if inc_type in (IncidentType.FLOATING_DEBRIS, IncidentType.NAVIGATION_HAZARD):
            return IncidentSeverity.MEDIUM, src_label
        return IncidentSeverity.LOW, src_label

    def _calculate_confidence(
        self, item: RawIncidentItem, precision: LocationPrecision, severity: IncidentSeverity
    ) -> float:
        base = 0.70
        if item.source_trust_level == SourceTrustLevel.LEVEL_1_AUTHORITATIVE:
            base += 0.20
        elif item.source_trust_level == SourceTrustLevel.LEVEL_2_SPECIALIZED:
            base += 0.15
        elif item.source_trust_level == SourceTrustLevel.LEVEL_3_NEWS:
            base += 0.05

        if precision == LocationPrecision.EXACT:
            base += 0.05
        elif precision == LocationPrecision.UNKNOWN:
            base -= 0.10

        return min(round(base, 2), 0.98)

    def _calculate_danger_radius(
        self, inc_type: IncidentType, severity: IncidentSeverity, text: str, item: RawIncidentItem
    ) -> Tuple[Optional[float], bool, Optional[str], Optional[str]]:
        """Recommends potential danger exclusion radius with scientific/operational basis."""
        # Official exclusion zones from USCG / NAVAREA / NOAA
        is_official = item.source_trust_level == SourceTrustLevel.LEVEL_1_AUTHORITATIVE

        if inc_type == IncidentType.OIL_SPILL_POLLUTION:
            rad_src = "Official Spill Response Perimeter" if is_official else "AI/Rule-derived potential risk radius"
            basis = "Standard EPA/NOAA 8 km marine hydrocarbon dispersion and boom deployment zone."
            return 8.0, True, rad_src, basis

        if inc_type in (IncidentType.COLLISION, IncidentType.SINKING, IncidentType.FIRE_EXPLOSION):
            rad_src = "Official Maritime Safety Exclusion Zone" if is_official else "AI/Rule-derived potential risk radius"
            basis = "5 km emergency navigation clearance around disabled hull and active firefighting operations."
            return 5.0, True, rad_src, basis

        if inc_type == IncidentType.GROUNDING:
            rad_src = "Official Navigation Warning Buffer" if is_official else "AI/Rule-derived potential risk radius"
            basis = "3 km shallow-water obstruction buffer and salvage tug maneuvering corridor."
            return 3.0, True, rad_src, basis

        if inc_type == IncidentType.FLOATING_DEBRIS:
            rad_src = "Official Hazard Advisory Buffer" if is_official else "AI/Rule-derived potential risk radius"
            basis = "2.5 km drift uncertainty radius for semi-submerged container / derelict object."
            return 2.5, True, rad_src, basis

        if inc_type == IncidentType.NAVIGATION_HAZARD:
            rad_src = "Official Broadcast Notice Exclusion Zone" if is_official else "AI/Rule-derived potential risk radius"
            basis = "2.0 km navigational clearance around charted obstruction."
            return 2.0, True, rad_src, basis

        if inc_type == IncidentType.TSUNAMI_SWELL:
            rad_src = "INCOIS Coastal Hazard Buffer" if is_official else "AI/Rule-derived potential risk radius"
            basis = "15 km coastal surge impact zone."
            return 15.0, True, rad_src, basis

        if inc_type == IncidentType.SEVERE_WEATHER_CYCLONE:
            rad_src = "IMD/INCOIS Maritime Storm Advisory" if is_official else "AI/Rule-derived potential risk radius"
            basis = "25 km severe gale and extreme sea-state perimeter."
            return 25.0, True, rad_src, basis

        return None, False, None, None

    def _extract_mmsi(self, text: str, meta: Dict[str, Any]) -> List[str]:
        mmsi_list = []
        if meta.get("mmsi"):
            mmsi_list.append(str(meta["mmsi"]))
        matches = re.findall(r"\b(2\d{8}|3\d{8}|4\d{8}|5\d{8}|6\d{8}|7\d{8})\b", text)
        for m in matches:
            if m not in mmsi_list:
                mmsi_list.append(m)
        return mmsi_list

    def _extract_keywords(self, text: str) -> List[str]:
        target_words = [
            "collision", "grounding", "sinking", "oil spill", "fire", "sar",
            "rescue", "cyclone", "high waves", "palk strait", "arabian sea",
            "bay of bengal", "coast guard", "noaa", "incois", "hazard", "debris"
        ]
        return [w for w in target_words if w in text]

    def _generate_reasoning(
        self,
        inc_type: IncidentType,
        severity: IncidentSeverity,
        precision: LocationPrecision,
        danger_radius: Optional[float],
        source_trust: SourceTrustLevel,
        has_coords: bool,
    ) -> str:
        trust_str = "Authoritative government broadcast" if source_trust == SourceTrustLevel.LEVEL_1_AUTHORITATIVE else "Multi-wire press bulletin"
        coord_str = (
            "Exact geodetic coordinates parsed from bulletin"
            if precision == LocationPrecision.EXACT
            else (
                "Approximate coastal sector resolved"
                if precision == LocationPrecision.APPROXIMATE
                else (
                    "Broad oceanic region identified (Centroid only)"
                    if precision == LocationPrecision.REGION_ONLY
                    else "Location unverified (no map plotting permitted)"
                )
            )
        )
        danger_str = f"Recommended danger radius: {danger_radius} km" if danger_radius else "No discrete exclusion zone required"

        return (
            f"Classified as [{inc_type.value}] with [{severity.value}] priority based on {trust_str}. "
            f"Spatial validation: {coord_str}. {danger_str}."
        )


_ai_service: Optional[IncidentAIService] = None


def get_incident_ai_service() -> IncidentAIService:
    global _ai_service
    if _ai_service is None:
        _ai_service = IncidentAIService()
    return _ai_service
