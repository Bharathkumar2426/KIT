"""Safe AIS Risk Correlation & Anti-Spam Proximity Alarm Service (SIH 26057).

Performs read-only geospatial proximity and ETA calculations against live AIS vessels
and triggers graduated maritime alarms when vessels breach confirmed danger zones.
Does NOT duplicate or modify the underlying AISStream connection.
"""

from __future__ import annotations

import logging
import math
import time
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple

from backend.models.incident_schemas import (
    AlarmLevel,
    Incident,
    IncidentProximityAlarm,
    IncidentSeverity,
    NearbyVesselRisk,
)
from backend.services.ais_service import get_ais_service
from backend.services.ais_demo_service import get_ais_demo_service

logger = logging.getLogger("IncidentRiskService")


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0) ** 2
    return 2.0 * r * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))


class IncidentRiskService:
    """Evaluates real-time navigational hazard exposure and manages graduated anti-spam alarms."""

    def __init__(self):
        # Anti-spam state tracker: (mmsi, incident_id) -> (last_alarm_level, last_triggered_epoch)
        self._alarm_states: Dict[Tuple[str, str], Tuple[AlarmLevel, float]] = {}
        self._active_alarms: Dict[str, IncidentProximityAlarm] = {}
        self._cooldown_seconds = 180.0  # 3 minutes cooldown for same level

    def correlate_nearby_vessels(self, incident: Incident) -> List[NearbyVesselRisk]:
        """Calculates proximity of tracked vessels to an incident's reported coordinates and danger zone."""
        if incident.latitude is None or incident.longitude is None:
            return []

        # Read active vessels from live AIS service (or fallback demo service)
        live_svc = get_ais_service()
        active_vessels = live_svc.get_active_vessels()
        is_live = True

        if not active_vessels:
            demo_svc = get_ais_demo_service()
            active_vessels = demo_svc.get_active_vessels()
            is_live = False

        if not active_vessels:
            return []

        danger_radius_km = incident.affected_area_radius_km or 3.0
        monitor_envelope_km = danger_radius_km + 15.0

        risks: List[NearbyVesselRisk] = []
        now_epoch = time.time()
        now_iso = datetime.now(timezone.utc).isoformat()

        for v in active_vessels:
            if v.latitude is None or v.longitude is None:
                continue

            dist_km = haversine_km(v.latitude, v.longitude, incident.latitude, incident.longitude)
            if dist_km > monitor_envelope_km:
                # If vessel cleared the zone, clear any active alarm
                alarm_key = f"{v.mmsi}_{incident.incident_id}"
                if alarm_key in self._active_alarms:
                    del self._active_alarms[alarm_key]
                state_key = (v.mmsi, incident.incident_id)
                if state_key in self._alarm_states:
                    del self._alarm_states[state_key]
                continue

            # Classify Graduated Proximity State
            alarm_level: Optional[AlarmLevel] = None
            if dist_km <= danger_radius_km:
                if incident.severity in (IncidentSeverity.CRITICAL, IncidentSeverity.HIGH):
                    risk_level = "DANGER"
                    alarm_level = AlarmLevel.LEVEL_4_CRITICAL_HAZARD_BREACH
                else:
                    risk_level = "DANGER"
                    alarm_level = AlarmLevel.LEVEL_3_ENTERED_DANGER_ZONE
            elif dist_km <= (danger_radius_km + 2.0):
                risk_level = "WARNING"
                alarm_level = AlarmLevel.LEVEL_2_NEAR_DANGER_ZONE
            elif dist_km <= (danger_radius_km + 5.0):
                risk_level = "APPROACHING"
                alarm_level = AlarmLevel.LEVEL_1_APPROACHING
            else:
                risk_level = "MONITORED"

            # Compute ETA
            speed = v.speed_knots or 0.0
            eta_min: Optional[float] = None
            if speed > 0.5:
                speed_kmh = speed * 1.852
                dist_to_perimeter = max(0.0, dist_km - danger_radius_km)
                eta_min = round((dist_to_perimeter / speed_kmh) * 60.0, 1)

            # Check if mapped & trigger anti-spam alarm if level >= 2
            if incident.is_mapped and alarm_level in (
                AlarmLevel.LEVEL_2_NEAR_DANGER_ZONE,
                AlarmLevel.LEVEL_3_ENTERED_DANGER_ZONE,
                AlarmLevel.LEVEL_4_CRITICAL_HAZARD_BREACH,
            ):
                self._evaluate_alarm(
                    vessel=v,
                    incident=incident,
                    dist_km=dist_km,
                    danger_radius_km=danger_radius_km,
                    alarm_level=alarm_level,
                    is_live=is_live,
                    now_epoch=now_epoch,
                    now_iso=now_iso,
                )

            risks.append(
                NearbyVesselRisk(
                    vessel_mmsi=v.mmsi,
                    ship_name=v.ship_name or f"MMSI {v.mmsi}",
                    latitude=v.latitude,
                    longitude=v.longitude,
                    distance_km=round(dist_km, 2),
                    speed_knots=speed,
                    course_deg=v.course_deg,
                    heading_deg=v.heading_deg,
                    eta_minutes=eta_min,
                    risk_level=risk_level,
                    last_ais_update=now_iso,
                    is_live_ais=is_live,
                )
            )

        # Sort by closest distance
        risks.sort(key=lambda r: r.distance_km)
        return risks

    def _evaluate_alarm(
        self,
        vessel: Any,
        incident: Incident,
        dist_km: float,
        danger_radius_km: float,
        alarm_level: AlarmLevel,
        is_live: bool,
        now_epoch: float,
        now_iso: str,
    ):
        """Evaluates anti-spam cooldown and triggers active maritime alarms."""
        state_key = (vessel.mmsi, incident.incident_id)
        last_level, last_ts = self._alarm_states.get(state_key, (None, 0.0))

        # Check if alarm should fire: level escalated or cooldown expired
        should_fire = False
        if last_level is None:
            should_fire = True
        elif alarm_level.value > last_level.value:
            should_fire = True
        elif (now_epoch - last_ts) >= self._cooldown_seconds:
            should_fire = True

        if should_fire:
            self._alarm_states[state_key] = (alarm_level, now_epoch)
            alarm_id = f"ALARM_{vessel.mmsi}_{incident.incident_id}"
            v_name = vessel.ship_name or f"Vessel MMSI {vessel.mmsi}"

            if alarm_level == AlarmLevel.LEVEL_4_CRITICAL_HAZARD_BREACH:
                msg = f"CRITICAL: {v_name} has ENTERED Active High-Hazard Zone for {incident.title}! Distance: {dist_km:.1f}km"
            elif alarm_level == AlarmLevel.LEVEL_3_ENTERED_DANGER_ZONE:
                msg = f"WARNING: {v_name} has ENTERED Danger Exclusion Zone for {incident.title} (Radius: {danger_radius_km}km)."
            else:
                msg = f"ADVISORY: {v_name} is APPROACHING Danger Zone for {incident.title}. Distance: {dist_km:.1f}km."

            alarm = IncidentProximityAlarm(
                alarm_id=alarm_id,
                vessel_mmsi=vessel.mmsi,
                ship_name=v_name,
                incident_id=incident.incident_id,
                incident_title=incident.title,
                severity=incident.severity,
                distance_km=round(dist_km, 2),
                danger_radius_km=round(danger_radius_km, 1),
                speed_knots=vessel.speed_knots,
                course_deg=vessel.course_deg,
                alarm_level=alarm_level,
                alarm_message=msg,
                is_live_ais=is_live,
                triggered_at=now_iso,
                cooldown_until=datetime.fromtimestamp(now_epoch + self._cooldown_seconds, tz=timezone.utc).isoformat(),
                is_acknowledged=False,
            )

            self._active_alarms[alarm_id] = alarm
            logger.warning(f"🚨 MARITIME PROXIMITY ALARM: {msg}")

    def evaluate_all_active_incidents(self, incidents: List[Incident]) -> List[IncidentProximityAlarm]:
        """Evaluates all mapped incidents with danger zones against the current live vessel fleet."""
        for inc in incidents:
            if inc.latitude is not None and inc.longitude is not None and inc.is_mapped:
                self.correlate_nearby_vessels(inc)
        return self.get_active_alarms()

    def trigger_test_incident_breach(self, incident: Optional[Incident] = None) -> IncidentProximityAlarm:
        """Triggers a realistic test geofence breach for jury and operator verification."""
        now_iso = datetime.now(timezone.utc).isoformat()
        now_epoch = time.time()

        inc_id = incident.incident_id if incident else "INC_20260906_LIVE"
        inc_title = incident.title if incident else "Bulk Carrier SEA VALOR Engine Room Fire"
        inc_sev = incident.severity if incident else IncidentSeverity.CRITICAL
        danger_r = incident.affected_area_radius_km if incident else 5.0

        test_mmsi = "419001234"
        test_vessel_name = "MV OCEAN EXPRESS (TEST)"
        alarm_id = f"ALARM_{test_mmsi}_{inc_id}"

        msg = f"🚨 EMERGENCY: {test_vessel_name} (MMSI {test_mmsi}) has ENTERED Active Hazard Zone for {inc_title}! Distance: 0.8km inside {danger_r}km Danger Zone."

        alarm = IncidentProximityAlarm(
            alarm_id=alarm_id,
            vessel_mmsi=test_mmsi,
            ship_name=test_vessel_name,
            incident_id=inc_id,
            incident_title=inc_title,
            severity=inc_sev,
            distance_km=0.8,
            danger_radius_km=danger_r,
            speed_knots=14.2,
            course_deg=112,
            alarm_level=AlarmLevel.LEVEL_4_CRITICAL_HAZARD_BREACH,
            alarm_message=msg,
            is_live_ais=True,
            triggered_at=now_iso,
            cooldown_until=datetime.fromtimestamp(now_epoch + 180, tz=timezone.utc).isoformat(),
            is_acknowledged=False,
        )

        self._active_alarms[alarm_id] = alarm
        self._alarm_states[(test_mmsi, inc_id)] = (AlarmLevel.LEVEL_4_CRITICAL_HAZARD_BREACH, now_epoch)
        logger.warning(f"🚨 Test Incident Proximity Alarm Triggered: {msg}")
        return alarm

    def get_active_alarms(self) -> List[IncidentProximityAlarm]:
        """Returns all currently active live proximity alarms."""
        return list(self._active_alarms.values())

    def clear_alarm(self, alarm_id: str) -> bool:
        """Acknowledges or clears an active alarm."""
        if alarm_id in self._active_alarms:
            del self._active_alarms[alarm_id]
            return True
        return False

    def clear_all_alarms(self) -> int:
        """Clears all active alarms."""
        count = len(self._active_alarms)
        self._active_alarms.clear()
        self._alarm_states.clear()
        return count


_risk_service: Optional[IncidentRiskService] = None


def get_incident_risk_service() -> IncidentRiskService:
    global _risk_service
    if _risk_service is None:
        _risk_service = IncidentRiskService()
    return _risk_service
