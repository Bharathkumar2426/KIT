"""REST and WebSocket API Endpoints for Live AIS Vessel Tracking (SIH 26057)."""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect, status
from fastapi.responses import JSONResponse

from backend.models.ais_schemas import (
    AisBoundingBox,
    AisStatusResponse,
    VesselProximityAlert,
    VesselState,
)
from backend.services.ais_service import AisService, get_ais_service

logger = logging.getLogger("AisRoutes")

router = APIRouter(prefix="/ais", tags=["Live AIS Vessel Tracking"])


@router.get(
    "/status",
    response_model=AisStatusResponse,
    summary="Get live AISStream connection status and telemetry",
)
async def get_ais_status(
    service: AisService = Depends(get_ais_service),
) -> AisStatusResponse:
    """Returns connection health, tracked vessel counts, and survey bounding box without exposing secret credentials."""
    return service.get_status()


@router.get(
    "/vessels",
    response_model=List[VesselState],
    summary="Get all currently tracked AIS vessels in the survey area",
)
async def get_tracked_vessels(
    service: AisService = Depends(get_ais_service),
) -> List[VesselState]:
    """Returns normalized live vessel states for map rendering."""
    return service.get_active_vessels()


@router.get(
    "/tracks",
    summary="Get recent navigation track history for tracked vessels",
)
async def get_vessel_tracks(
    service: AisService = Depends(get_ais_service),
) -> Dict[str, List[Dict[str, Any]]]:
    """Returns historical coordinates (up to bounded limit) for drawing vessel trajectories."""
    return service.get_vessel_tracks()


@router.get(
    "/alerts",
    response_model=List[VesselProximityAlert],
    summary="Get active vessel proximity alerts against debris geofences",
)
async def get_proximity_alerts(
    service: AisService = Depends(get_ais_service),
) -> List[VesselProximityAlert]:
    """Returns current geofence collision/warning alerts for vessels approaching underwater hazards."""
    return service.get_active_alerts()


@router.post(
    "/config",
    summary="Update AISStream API key and subscription parameters dynamically",
)
async def update_ais_config(
    payload: Dict[str, Any],
    service: AisService = Depends(get_ais_service),
) -> Dict[str, Any]:
    """Updates AISStream API Key and triggers live WebSocket connection."""
    api_key = payload.get("api_key")
    if api_key is not None:
        service.set_api_key(api_key)
    
    bbox_dict = payload.get("bounding_box")
    if bbox_dict and isinstance(bbox_dict, dict):
        service.set_bounding_box(
            min_lat=float(bbox_dict.get("min_latitude", -90.0)),
            min_lon=float(bbox_dict.get("min_longitude", -180.0)),
            max_lat=float(bbox_dict.get("max_latitude", 90.0)),
            max_lon=float(bbox_dict.get("max_longitude", 180.0)),
        )
    return {
        "status": "configured",
        "is_configured": True,
        "has_api_key": bool(api_key),
        "bounding_box": service.bbox.model_dump(),
    }


@router.post(
    "/bbox",
    summary="Update geographic survey bounding box for AISStream subscription",
)
async def update_ais_bbox(
    bbox: AisBoundingBox,
    service: AisService = Depends(get_ais_service),
) -> Dict[str, Any]:
    """Updates AIS subscription bounding box dynamically."""
    service.set_bounding_box(
        min_lat=bbox.min_latitude,
        min_lon=bbox.min_longitude,
        max_lat=bbox.max_latitude,
        max_lon=bbox.max_longitude,
    )
    return {
        "status": "updated",
        "bounding_box": service.bbox.model_dump(),
    }


@router.post(
    "/sync-geofences",
    summary="Sync current sonar debris geofences for real-time vessel collision monitoring",
)
async def sync_debris_geofences(
    geofences: List[Dict[str, Any]],
    service: AisService = Depends(get_ais_service),
) -> Dict[str, Any]:
    """Receives active debris geofences from frontend / survey state and updates proximity calculations."""
    service.set_active_geofences(geofences)
    return {
        "status": "synchronized",
        "geofences_monitored": len(geofences),
    }


@router.post(
    "/test-breach",
    summary="Trigger a test vessel geofence breach to verify real-time SOS alerts",
)
async def trigger_test_geofence_breach(
    service: AisService = Depends(get_ais_service),
) -> Dict[str, Any]:
    """Generates a test vessel hazard proximity breach and broadcasts SOS alert over WebSockets."""
    return await service.trigger_test_alert()


@router.post(
    "/clear-alerts",
    summary="Clear all active vessel proximity alerts",
)
async def clear_geofence_alerts(
    service: AisService = Depends(get_ais_service),
) -> Dict[str, Any]:
    """Clears all active proximity alerts from service and frontend clients."""
    return await service.clear_test_alerts()




@router.websocket("/ws")
async def ais_websocket_endpoint(
    websocket: WebSocket,
    service: AisService = Depends(get_ais_service),
):
    """Real-time WebSocket event stream for frontend live vessel updates and proximity alerts."""
    await websocket.accept()
    await service.register_client(websocket)
    try:
        while True:
            # Keep connection open and receive optional client messages (pings/requests)
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        await service.unregister_client(websocket)
    except Exception as e:
        logger.debug(f"WebSocket client connection terminated: {e}")
        await service.unregister_client(websocket)
