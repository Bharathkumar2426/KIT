"""SeaRoutesNav Maritime Route REST API Endpoints (SIH 26057)."""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.services.searoutes_service import searoutes_service

logger = logging.getLogger("SeaRoutesRoutes")

router = APIRouter(prefix="/searoutes", tags=["SeaRoutesNav Maritime Routing"])


class CoordinatePoint(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude in WGS84")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Longitude in WGS84")
    name: Optional[str] = Field(None, description="Optional port or landmark name")


class CalculateRouteRequest(BaseModel):
    origin: CoordinatePoint
    destination: CoordinatePoint
    name: Optional[str] = Field(None, description="Descriptive route name")
    zone_code: Optional[str] = Field(None, description="Associated survey zone code")


@router.get(
    "/status",
    summary="Get SeaRoutesNav API connection status, account profile, and daily quota usage",
)
async def get_searoutes_status() -> Dict[str, Any]:
    """Returns SeaRoutesNav authentication health, daily query quota, and local cache statistics."""
    try:
        return searoutes_service.get_status()
    except Exception as e:
        logger.exception("Error checking SeaRoutesNav status: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to check SeaRoutesNav status: {e}",
        )


@router.get(
    "/routes",
    summary="Get all active strategic maritime routes with sonar debris proximity hazard warnings",
)
async def get_active_routes(
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Returns active shipping lanes (Palk Strait, North Sea 4TU, Caribbean NASA)

    enriched with debris hazard intersection warnings from the database.
    """
    try:
        # Fetch targets from database to compute route proximity
        from backend.models.db_models import ImageRecord
        from sqlalchemy import select
        from sqlalchemy.orm import selectinload

        stmt = select(ImageRecord).options(selectinload(ImageRecord.detections))
        res = await db.execute(stmt)
        images = res.scalars().all()

        targets = []
        for img in images:
            for d in img.detections:
                if d.latitude is not None and d.longitude is not None:
                    targets.append({
                        "id": getattr(d, "detection_id", 0),
                        "class_name": d.class_name,
                        "severity": getattr(d, "severity", "MEDIUM") or "MEDIUM",
                        "latitude": d.latitude,
                        "longitude": d.longitude,
                        "source": img.original_filename,
                    })

        routes = searoutes_service.get_all_active_routes(db_targets=targets)
        return {
            "success": True,
            "total_routes": len(routes),
            "routes": routes,
            "quota_status": searoutes_service.get_status(),
        }
    except Exception as e:
        logger.exception("Error fetching active maritime routes: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch active maritime routes: {e}",
        )


@router.post(
    "/calculate",
    summary="Calculate a custom sea route between coordinates or ports",
)
async def calculate_custom_route(
    req: CalculateRouteRequest,
) -> Dict[str, Any]:
    """Calculate navigable maritime route between origin and destination coordinates.

    Automatically uses local cache to conserve the 25-queries/day quota.
    """
    try:
        result = searoutes_service.calculate_route(
            origin_lat=req.origin.latitude,
            origin_lon=req.origin.longitude,
            dest_lat=req.destination.latitude,
            dest_lon=req.destination.longitude,
            route_name=req.name or f"{req.origin.name or 'Origin'} ⇄ {req.destination.name or 'Destination'}",
            zone_code=req.zone_code,
        )
        return result
    except Exception as e:
        logger.exception("Error calculating sea route: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Route calculation failed: {e}",
        )


@router.get(
    "/ports",
    summary="Search commercial ports for autocomplete routing",
)
async def search_ports(
    q: str = Query(..., min_length=2, description="Port name search query"),
    limit: int = Query(10, ge=1, le=50, description="Max results to return"),
) -> List[Dict[str, Any]]:
    """Autocomplete search for commercial ports using SeaRoutesNav limanlar registry."""
    try:
        return searoutes_service.search_ports(query=q, limit=limit)
    except Exception as e:
        logger.warning("Error searching ports: %s", e)
        return []
