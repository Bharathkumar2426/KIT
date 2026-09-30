"""REST and WebSocket API Endpoints for AIS Demo / Fallback Mode (SIH 26057).

Completely independent demo replay endpoints. Does not affect or modify existing
live AISStream endpoints.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect, Body
from pydantic import BaseModel

from backend.models.ais_schemas import VesselProximityAlert, VesselState
from backend.services.ais_demo_service import AisDemoService, get_ais_demo_service

logger = logging.getLogger("AisDemoRoutes")

router = APIRouter(prefix="/ais/demo", tags=["AIS Demo / Offline Fallback Mode"])


class SpeedPayload(BaseModel):
    speed: float = 1.0


@router.get("/status", summary="Get AIS Demo Replay status and controls state")
async def get_demo_status(
    service: AisDemoService = Depends(get_ais_demo_service),
) -> Dict[str, Any]:
    """Returns demo replay status, current frame, playback speed, and vessel count."""
    return service.get_status()


@router.get("/vessels", response_model=List[VesselState], summary="Get current frame demo vessels")
async def get_demo_vessels(
    service: AisDemoService = Depends(get_ais_demo_service),
) -> List[VesselState]:
    """Returns recorded vessels for the active demo frame."""
    return service.get_active_vessels()


@router.get("/tracks", summary="Get trajectory tracks for demo vessels")
async def get_demo_tracks(
    service: AisDemoService = Depends(get_ais_demo_service),
) -> Dict[str, List[Dict[str, Any]]]:
    """Returns recorded track history for demo vessels."""
    return service.get_vessel_tracks()


@router.get("/alerts", response_model=List[VesselProximityAlert], summary="Get active demo proximity alerts")
async def get_demo_alerts(
    service: AisDemoService = Depends(get_ais_demo_service),
) -> List[VesselProximityAlert]:
    """Returns demo geofence proximity alerts explicitly labeled as DEMO."""
    return service.get_active_alerts()


@router.post("/play", summary="Start or resume demo playback")
async def play_demo(
    service: AisDemoService = Depends(get_ais_demo_service),
) -> Dict[str, Any]:
    """Starts/resumes demo replay."""
    service.play()
    return {"status": "playing", "is_running": True}


@router.post("/pause", summary="Pause demo playback")
async def pause_demo(
    service: AisDemoService = Depends(get_ais_demo_service),
) -> Dict[str, Any]:
    """Pauses demo replay."""
    service.pause()
    return {"status": "paused", "is_running": False}


@router.post("/reset", summary="Reset demo playback to start")
async def reset_demo(
    service: AisDemoService = Depends(get_ais_demo_service),
) -> Dict[str, Any]:
    """Resets demo replay back to frame 0."""
    service.reset()
    return {"status": "reset", "current_frame": 0}


@router.post("/speed", summary="Set demo playback speed (0.5x, 1x, 2x, 5x)")
async def set_demo_speed(
    speed: Optional[float] = Query(None, description="Playback speed multiplier"),
    payload: Optional[SpeedPayload] = Body(None),
    service: AisDemoService = Depends(get_ais_demo_service),
) -> Dict[str, Any]:
    """Updates demo replay speed."""
    target_speed = 1.0
    if speed is not None:
        target_speed = speed
    elif payload is not None and payload.speed is not None:
        target_speed = payload.speed

    service.set_speed(target_speed)
    return {"status": "updated", "playback_speed": target_speed}


@router.post("/sync-geofences", summary="Sync active debris geofences for demo collision checks")
async def sync_demo_geofences(
    geofences: List[Dict[str, Any]],
    service: AisDemoService = Depends(get_ais_demo_service),
) -> Dict[str, Any]:
    """Synchronizes active debris geofences with demo engine."""
    service.set_active_geofences(geofences)
    return {"status": "synchronized", "geofences_monitored": len(geofences)}


@router.websocket("/ws")
async def ais_demo_websocket_endpoint(
    websocket: WebSocket,
    service: AisDemoService = Depends(get_ais_demo_service),
):
    """Real-time WebSocket stream for demo vessel replay snapshots and alerts."""
    await websocket.accept()
    await service.register_client(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        await service.unregister_client(websocket)
    except Exception as e:
        logger.debug(f"Demo WebSocket client disconnected: {e}")
        await service.unregister_client(websocket)
