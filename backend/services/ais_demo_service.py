"""Independent AIS Demo / Fallback Replay Service (SIH 26057).

Replays real recorded AISStream vessel telemetry from local fixtures without
requiring an active internet connection or AISStream API key.
Provides full playback controls (Play, Pause, Reset, Speed Adjustment) and
independent demo geofence proximity alert calculations clearly labeled as DEMO.
"""

from __future__ import annotations

import asyncio
import json
import logging
import math
import time
from collections import deque
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Deque, Dict, List, Optional, Set, Tuple

from fastapi import WebSocket

from backend.models.ais_schemas import (
    AisBoundingBox,
    AisConnectionStatus,
    AisStatusResponse,
    VesselAlertStatus,
    VesselPositionPoint,
    VesselProximityAlert,
    VesselState,
)

logger = logging.getLogger("AisDemoService")

DATASET_PATH = Path(__file__).resolve().parent.parent / "data" / "ais_demo" / "recorded_ais_dataset.json"


def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two WGS84 points in meters."""
    r = 6371000.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r * c


class AisDemoService:
    """Isolated, independent demo replay service for recorded real AIS telemetry."""

    def __init__(self):
        self._dataset: Dict[str, Any] = {}
        self._frames: List[Dict[str, Any]] = []
        self._current_frame_idx: int = 0
        self._playback_speed: float = 1.0  # 0.5x, 1.0x, 2.0x, 5.0x
        self._is_running: bool = True
        self._base_step_interval: float = 2.0  # seconds per frame at 1x speed

        # In-memory Replay State
        self._vessels: Dict[str, VesselState] = {}
        self._tracks: Dict[str, Deque[VesselPositionPoint]] = {}
        self._active_geofences: List[Dict[str, Any]] = []
        self._active_alerts: Dict[str, VesselProximityAlert] = {}
        self._alert_states: Dict[Tuple[str, int], VesselAlertStatus] = {}

        # WebSocket subscribers for demo events
        self._connected_clients: Set[WebSocket] = set()
        self._lock = asyncio.Lock()
        self._task: Optional[asyncio.Task] = None

        self._load_dataset()

    def _load_dataset(self):
        """Loads real recorded AIS dataset from disk."""
        if DATASET_PATH.exists():
            try:
                with open(DATASET_PATH, "r", encoding="utf-8") as f:
                    self._dataset = json.load(f)
                    self._frames = self._dataset.get("frames", [])
                logger.info(f"Loaded demo dataset with {len(self._frames)} frames from {DATASET_PATH}")
                self._apply_frame(0)
            except Exception as e:
                logger.error(f"Failed to load demo AIS dataset: {e}")
        else:
            logger.warning(f"Demo AIS dataset not found at {DATASET_PATH}")

    def _apply_frame(self, frame_idx: int):
        """Updates internal vessel states and tracks to the specified frame."""
        if not self._frames:
            return

        frame_idx = frame_idx % len(self._frames)
        self._current_frame_idx = frame_idx
        frame_data = self._frames[frame_idx]
        vessel_items = frame_data.get("vessels", [])

        for v in vessel_items:
            mmsi = str(v.get("mmsi"))
            lat = float(v.get("latitude", 0.0))
            lng = float(v.get("longitude", 0.0))
            speed = float(v.get("speed_knots", 0.0)) if v.get("speed_knots") is not None else None
            course = float(v.get("course_deg", 0.0)) if v.get("course_deg") is not None else None
            heading = float(v.get("heading_deg", 0.0)) if v.get("heading_deg") is not None else None
            ship_name = v.get("ship_name") or f"MMSI: {mmsi}"
            timestamp = frame_data.get("timestamp") or datetime.now(timezone.utc).isoformat()

            state = VesselState(
                mmsi=mmsi,
                ship_name=ship_name,
                latitude=lat,
                longitude=lng,
                speed_knots=speed,
                course_deg=course,
                heading_deg=heading,
                nav_status=v.get("nav_status", "Under way using engine"),
                ship_type=v.get("ship_type", "Commercial Vessel"),
                imo=v.get("imo"),
                destination=v.get("destination", "DEMO TRANSIT"),
                eta=v.get("eta"),
                timestamp=timestamp,
                is_stale=False,
                last_seen_seconds_ago=0.0,
            )
            self._vessels[mmsi] = state

            # Track accumulation
            if mmsi not in self._tracks:
                self._tracks[mmsi] = deque(maxlen=60)
            
            self._tracks[mmsi].append(
                VesselPositionPoint(
                    latitude=lat,
                    longitude=lng,
                    timestamp=timestamp,
                    speed_knots=speed,
                    course_deg=course,
                )
            )

        self._evaluate_demo_proximities()

    def _evaluate_demo_proximities(self):
        """Calculates demo proximity alerts against active geofences."""
        if not self._active_geofences:
            return

        warning_dist_m = 500.0

        for vessel in self._vessels.values():
            for gf in self._active_geofences:
                gf_id = gf.get("id") or gf.get("detection_id", 0)
                gf_lat = gf.get("latitude") or gf.get("lat", 0.0)
                gf_lng = gf.get("longitude") or gf.get("lng", 0.0)
                gf_radius = gf.get("radius_meters") or gf.get("radius", 25.0)
                debris_class = gf.get("class_name") or gf.get("class", "Underwater Debris")
                severity = gf.get("severity", "MEDIUM")

                dist_m = haversine_distance_meters(
                    vessel.latitude, vessel.longitude, gf_lat, gf_lng
                )

                current_status: VesselAlertStatus
                if dist_m <= gf_radius:
                    current_status = VesselAlertStatus.INSIDE
                elif dist_m <= (gf_radius + warning_dist_m):
                    current_status = VesselAlertStatus.APPROACHING
                else:
                    current_status = VesselAlertStatus.OUTSIDE

                state_key = (vessel.mmsi, gf_id)
                prev_status = self._alert_states.get(state_key, VesselAlertStatus.OUTSIDE)
                alert_id = f"DEMO_{vessel.mmsi}_{gf_id}"

                if current_status != prev_status:
                    self._alert_states[state_key] = current_status

                    if current_status in (VesselAlertStatus.INSIDE, VesselAlertStatus.APPROACHING):
                        v_name = vessel.ship_name or f"Vessel MMSI {vessel.mmsi}"
                        msg = (
                            f"⚠️ DEMO ALERT: Recorded vessel {v_name} entered debris geofence #{gf_id} ({debris_class}, {severity})! Distance: {dist_m:.0f}m"
                            if current_status == VesselAlertStatus.INSIDE
                            else f"⚠️ DEMO NOTICE: Recorded vessel {v_name} approaching debris hazard #{gf_id} ({debris_class}, {severity}). Distance: {dist_m:.0f}m"
                        )

                        alert = VesselProximityAlert(
                            vessel_mmsi=vessel.mmsi,
                            ship_name=f"[DEMO] {v_name}",
                            detection_id=gf_id,
                            debris_class=debris_class,
                            severity=severity,
                            distance_meters=round(dist_m, 1),
                            geofence_radius_meters=round(gf_radius, 1),
                            status=current_status,
                            alert_message=msg,
                            timestamp=datetime.now(timezone.utc).isoformat(),
                        )
                        self._active_alerts[alert_id] = alert
                    elif current_status == VesselAlertStatus.OUTSIDE:
                        if alert_id in self._active_alerts:
                            del self._active_alerts[alert_id]

    async def start(self):
        """Starts background demo replay loop."""
        if self._task and not self._task.done():
            return
        self._is_running = True
        self._task = asyncio.create_task(self._replay_loop())
        logger.info("AIS Demo Replay Service loop started.")

    async def stop(self):
        """Pauses demo replay."""
        self._is_running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None
        logger.info("AIS Demo Replay Service paused.")

    def set_speed(self, speed: float):
        """Sets playback speed multiplier (0.5x to 5.0x)."""
        if speed in (0.5, 1.0, 2.0, 5.0):
            self._playback_speed = speed
            logger.info(f"AIS Demo playback speed set to {speed}x")

    def play(self):
        """Resumes playback."""
        self._is_running = True
        if not self._task or self._task.done():
            self._task = asyncio.create_task(self._replay_loop())

    def pause(self):
        """Pauses playback."""
        self._is_running = False

    def reset(self):
        """Resets playback back to initial frame 0."""
        self._current_frame_idx = 0
        for track in self._tracks.values():
            track.clear()
        self._active_alerts.clear()
        self._alert_states.clear()
        self._apply_frame(0)
        asyncio.create_task(self.broadcast_snapshot())
        logger.info("AIS Demo Replay reset to frame 0.")

    def set_active_geofences(self, geofences: List[Dict[str, Any]]):
        """Updates active debris geofences for demo proximity checks."""
        self._active_geofences = geofences or []
        self._evaluate_demo_proximities()

    async def register_client(self, websocket: WebSocket):
        """Registers a frontend client for real-time demo updates."""
        async with self._lock:
            self._connected_clients.add(websocket)
        
        # Send initial snapshot
        payload = self.get_snapshot_payload()
        try:
            await websocket.send_text(json.dumps(payload))
        except Exception:
            pass

    async def unregister_client(self, websocket: WebSocket):
        """Unregisters a demo client WebSocket."""
        async with self._lock:
            self._connected_clients.discard(websocket)

    async def broadcast_snapshot(self):
        """Broadcasts current demo frame state to all connected demo clients."""
        if not self._connected_clients:
            return

        payload = json.dumps(self.get_snapshot_payload())
        stale = []
        for ws in list(self._connected_clients):
            try:
                await ws.send_text(payload)
            except Exception:
                stale.append(ws)

        if stale:
            async with self._lock:
                for ws in stale:
                    self._connected_clients.discard(ws)

    def get_snapshot_payload(self) -> Dict[str, Any]:
        """Builds structured snapshot payload for the current demo frame."""
        return {
            "type": "demo_snapshot",
            "mode": "DEMO",
            "is_running": self._is_running,
            "playback_speed": self._playback_speed,
            "current_frame": self._current_frame_idx,
            "total_frames": len(self._frames),
            "frame_timestamp": self._frames[self._current_frame_idx]["timestamp"] if self._frames else None,
            "data_source": "AISStream recorded telemetry",
            "vessels": [v.model_dump() for v in self._vessels.values()],
            "tracks": {mmsi: [p.model_dump() for p in pts] for mmsi, pts in self._tracks.items()},
            "alerts": [a.model_dump() for a in self._active_alerts.values()],
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    def get_status(self) -> Dict[str, Any]:
        """Returns demo service status."""
        return {
            "mode": "DEMO",
            "status": "DEMO_ACTIVE" if self._is_running else "DEMO_PAUSED",
            "data_source": "AISStream recorded telemetry",
            "is_offline_capable": True,
            "is_running": self._is_running,
            "playback_speed": self._playback_speed,
            "current_frame": self._current_frame_idx,
            "total_frames": len(self._frames),
            "vessel_count": len(self._vessels),
            "active_alerts_count": len(self._active_alerts),
            "connected_clients": len(self._connected_clients),
        }

    def get_active_vessels(self) -> List[VesselState]:
        """Returns list of current demo vessel states."""
        return list(self._vessels.values())

    def get_vessel_tracks(self) -> Dict[str, List[Dict[str, Any]]]:
        """Returns trajectory points for demo vessels."""
        return {mmsi: [p.model_dump() for p in track] for mmsi, track in self._tracks.items()}

    def get_active_alerts(self) -> List[VesselProximityAlert]:
        """Returns active demo alerts."""
        return list(self._active_alerts.values())

    async def _replay_loop(self):
        """Continuously advances frames according to playback speed."""
        while True:
            try:
                if self._is_running and self._frames:
                    next_idx = (self._current_frame_idx + 1) % len(self._frames)
                    self._apply_frame(next_idx)
                    await self.broadcast_snapshot()

                # Sleep duration inversely proportional to playback speed
                sleep_sec = max(0.2, self._base_step_interval / self._playback_speed)
                await asyncio.sleep(sleep_sec)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in demo replay loop: {e}")
                await asyncio.sleep(1.0)


# Singleton Demo Service instance
ais_demo_service = AisDemoService()


def get_ais_demo_service() -> AisDemoService:
    """Dependency provider for AisDemoService."""
    return ais_demo_service
