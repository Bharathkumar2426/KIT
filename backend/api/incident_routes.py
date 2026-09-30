"""REST API Endpoints for AI Maritime Incident Intelligence (SIH 26057).

Exposes incident querying, metrics, source health monitors, human operator
map confirmation workflows, and safe AIS risk correlation.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query

from backend.models.incident_schemas import (
    Incident,
    IncidentConfirmationRequest,
    IncidentDismissRequest,
    IncidentMetrics,
    IncidentProximityAlarm,
    NearbyVesselRisk,
    SourceHealthStatus,
)
from backend.services.incident_ingestion_service import (
    IncidentIngestionService,
    get_incident_ingestion_service,
)
from backend.services.incident_risk_service import (
    IncidentRiskService,
    get_incident_risk_service,
)

logger = logging.getLogger("IncidentRoutes")

router = APIRouter(prefix="/incidents", tags=["AI Maritime Incident Intelligence"])


@router.get("", response_model=List[Incident], summary="List maritime incidents with filtering")
async def list_incidents(
    severity: Optional[str] = Query(None, description="Filter by severity (CRITICAL, HIGH, MEDIUM, LOW)"),
    incident_type: Optional[str] = Query(None, description="Filter by incident type"),
    is_mapped: Optional[bool] = Query(None, description="Filter mapped only"),
    pending_review: Optional[bool] = Query(None, description="Filter unmapped pending operator confirmation"),
    search: Optional[str] = Query(None, description="Search keyword in title or description"),
    service: IncidentIngestionService = Depends(get_incident_ingestion_service),
) -> List[Incident]:
    """Returns filtered incident records."""
    results = service.get_all_incidents(
        severity=severity,
        incident_type=incident_type,
        is_mapped_only=bool(is_mapped),
        pending_review_only=bool(pending_review),
    )

    if search:
        s_lower = search.lower()
        results = [
            r for r in results
            if s_lower in r.title.lower() or s_lower in r.description.lower() or s_lower in r.location_text.lower()
        ]

    return results


@router.get("/metrics", response_model=IncidentMetrics, summary="Get dashboard summary metrics")
async def get_incident_metrics(
    service: IncidentIngestionService = Depends(get_incident_ingestion_service),
) -> IncidentMetrics:
    """Returns executive KPI counters."""
    return service.get_metrics()


@router.get("/sources/status", response_model=List[SourceHealthStatus], summary="Get health status of all data collectors")
async def get_sources_status(
    service: IncidentIngestionService = Depends(get_incident_ingestion_service),
) -> List[SourceHealthStatus]:
    """Returns connectivity and operational status for all 9 data ingestion sources."""
    return service.get_sources_status()


@router.get("/alarms/active", response_model=List[IncidentProximityAlarm], summary="Get active live vessel danger-zone breach alarms")
async def get_active_alarms(
    risk_service: IncidentRiskService = Depends(get_incident_risk_service),
    ingestion_service: IncidentIngestionService = Depends(get_incident_ingestion_service),
) -> List[IncidentProximityAlarm]:
    """Returns current active proximity and danger-zone alarms evaluated across all active incidents."""
    incidents = ingestion_service.get_all_incidents()
    return risk_service.evaluate_all_active_incidents(incidents)


@router.post("/alarms/test-breach", response_model=IncidentProximityAlarm, summary="Simulate a real-time vessel geofence breach alert")
async def trigger_test_incident_breach(
    incident_id: Optional[str] = Query(None, description="Target incident ID to breach"),
    risk_service: IncidentRiskService = Depends(get_incident_risk_service),
    ingestion_service: IncidentIngestionService = Depends(get_incident_ingestion_service),
) -> IncidentProximityAlarm:
    """Simulates an emergency live vessel entering an active danger zone to verify real-time SOS alerts."""
    target_inc = ingestion_service.get_incident_by_id(incident_id) if incident_id else None
    if not target_inc:
        mapped_incidents = [i for i in ingestion_service.get_all_incidents() if i.is_mapped and i.latitude is not None]
        target_inc = mapped_incidents[0] if mapped_incidents else None
    return risk_service.trigger_test_incident_breach(target_inc)


@router.post("/alarms/{alarm_id}/dismiss", summary="Dismiss an active proximity alarm")
async def dismiss_alarm(
    alarm_id: str,
    risk_service: IncidentRiskService = Depends(get_incident_risk_service),
) -> Dict[str, Any]:
    """Acknowledges and clears an active alarm."""
    success = risk_service.clear_alarm(alarm_id)
    return {"status": "cleared" if success else "not_found", "alarm_id": alarm_id}


@router.post("/alarms/clear-all", summary="Clear all active proximity alarms")
async def clear_all_alarms(
    risk_service: IncidentRiskService = Depends(get_incident_risk_service),
) -> Dict[str, Any]:
    """Clears all active danger zone proximity alarms."""
    count = risk_service.clear_all_alarms()
    return {"status": "cleared", "count": count}


@router.get("/{incident_id}", response_model=Incident, summary="Get incident dossier by ID")
async def get_incident(
    incident_id: str,
    service: IncidentIngestionService = Depends(get_incident_ingestion_service),
    risk_service: IncidentRiskService = Depends(get_incident_risk_service),
) -> Incident:
    """Returns detailed incident dossier including AI reasoning and nearby AIS risk correlation."""
    inc = service.get_incident_by_id(incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail=f"Incident {incident_id} not found")

    # Correlate nearby AIS vessels if coordinates exist
    if inc.latitude is not None and inc.longitude is not None:
        inc.nearby_vessels = risk_service.correlate_nearby_vessels(inc)

    return inc


@router.post("/{incident_id}/confirm-map", response_model=Incident, summary="Operator confirmation to place incident on map")
async def confirm_map_incident(
    incident_id: str,
    payload: Optional[IncidentConfirmationRequest] = None,
    service: IncidentIngestionService = Depends(get_incident_ingestion_service),
) -> Incident:
    """Explicit human-in-the-loop confirmation before creating an incident marker & danger zone on the map."""
    radius = payload.custom_danger_radius_km if payload else None
    notes = payload.operator_notes if payload else None

    inc = await service.confirm_map_incident(incident_id, custom_danger_radius_km=radius, notes=notes)
    if not inc:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot mark incident {incident_id} on map. Incident must exist and have verified coordinates.",
        )

    # Sync geofences with AIS service
    try:
        from backend.services.ais_service import get_ais_service
        ais_svc = get_ais_service()
        mapped_incidents = [i for i in service.get_all_incidents() if i.is_mapped and i.latitude is not None]
        geofences = [
            {
                "id": hash(i.incident_id) % 100000,
                "class_name": i.title,
                "latitude": i.latitude,
                "longitude": i.longitude,
                "radius_meters": (i.affected_area_radius_km or 5.0) * 1000.0,
                "severity": i.severity.value if hasattr(i.severity, "value") else str(i.severity),
            }
            for i in mapped_incidents
        ]
        ais_svc.set_active_geofences(geofences)
    except Exception as e:
        logger.warning(f"Could not sync incident geofences to AIS service: {e}")

    return inc


@router.post("/{incident_id}/dismiss", response_model=Incident, summary="Dismiss incident from priority queue")
async def dismiss_incident(
    incident_id: str,
    service: IncidentIngestionService = Depends(get_incident_ingestion_service),
) -> Incident:
    """Dismisses an incident from the priority review feed."""
    inc = await service.dismiss_incident(incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail=f"Incident {incident_id} not found")
    return inc


@router.post("/refresh", summary="Trigger manual multi-source ingestion sync")
async def trigger_refresh(
    service: IncidentIngestionService = Depends(get_incident_ingestion_service),
) -> Dict[str, Any]:
    """Manually triggers concurrent ingestion sync across all 9 sources."""
    count = await service.sync_all_sources()
    return {"status": "success", "total_incidents": count}


@router.get("/{incident_id}/nearby-vessels", response_model=List[NearbyVesselRisk], summary="Get live AIS vessels near incident")
async def get_nearby_vessels(
    incident_id: str,
    service: IncidentIngestionService = Depends(get_incident_ingestion_service),
    risk_service: IncidentRiskService = Depends(get_incident_risk_service),
) -> List[NearbyVesselRisk]:
    """Returns live AIS vessels near the confirmed incident danger zone."""
    inc = service.get_incident_by_id(incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail=f"Incident {incident_id} not found")

    return risk_service.correlate_nearby_vessels(inc)
