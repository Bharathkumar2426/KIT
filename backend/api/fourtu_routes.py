"""REST API Endpoints for 4TU.ResearchData External Sonar Ingestion (SIH 26057)."""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status

from backend.models.fourtu_schemas import (
    FourTuDatasetItem,
    FourTuFileItem,
    FourTuSearchResponse,
    FourTuStatusResponse,
    FourTuSyncResponse,
    FourTuSyncRunItem,
)
from backend.services.fourtu_service import FourTuService, get_fourtu_service

logger = logging.getLogger("FourTuRoutes")

router = APIRouter(prefix="/4tu", tags=["4TU External Sonar Ingestion"])


@router.get(
    "/status",
    response_model=FourTuStatusResponse,
    summary="Get operational status and sync metrics for 4TU external feed",
)
async def get_4tu_status(
    service: FourTuService = Depends(get_fourtu_service),
) -> FourTuStatusResponse:
    """Returns current status, sync interval, file counts, and georeferencing metrics."""
    return await service.get_status()


@router.get(
    "/search",
    response_model=FourTuSearchResponse,
    summary="Search side-scan sonar datasets on 4TU.ResearchData",
)
async def search_4tu_datasets(
    query: Optional[str] = Query(None, description="Optional custom search query; defaults to side-scan sonar taxonomy"),
    page_size: int = Query(10, ge=1, le=50, description="Maximum number of datasets to return"),
    service: FourTuService = Depends(get_fourtu_service),
) -> FourTuSearchResponse:
    """Discovers and ranks candidate acoustic sonar datasets using the public 4TU Figshare API."""
    datasets = await service.search_datasets(query=query, page_size=page_size)
    return FourTuSearchResponse(
        query_used=query or "default side-scan taxonomy",
        total_datasets=len(datasets),
        datasets=datasets,
    )


@router.post(
    "/sync",
    response_model=FourTuSyncResponse,
    summary="Trigger immediate synchronization of 4TU.ResearchData sonar feeds",
)
async def trigger_4tu_sync(
    service: FourTuService = Depends(get_fourtu_service),
) -> FourTuSyncResponse:
    """Executes a full discovery, download, validation, ML detection, and georeferencing run."""
    return await service.sync(is_manual=True)


@router.get(
    "/datasets",
    response_model=List[FourTuDatasetItem],
    summary="List currently discovered relevant 4TU datasets",
)
async def list_4tu_datasets(
    service: FourTuService = Depends(get_fourtu_service),
) -> List[FourTuDatasetItem]:
    """Returns the list of relevant side-scan sonar datasets discovered on 4TU."""
    return await service.search_datasets(page_size=service.max_datasets)


@router.get(
    "/history",
    response_model=List[FourTuSyncRunItem],
    summary="Get past 4TU synchronization run history",
)
async def get_4tu_history(
    limit: int = Query(20, ge=1, le=100),
    service: FourTuService = Depends(get_fourtu_service),
) -> List[FourTuSyncRunItem]:
    """Returns log of past synchronization batches with file and detection counts."""
    return await service.get_history(limit=limit)


@router.get(
    "/files",
    response_model=List[FourTuFileItem],
    summary="List all tracked 4TU files and their ingestion statuses",
)
async def list_4tu_files(
    limit: int = Query(50, ge=1, le=200),
    service: FourTuService = Depends(get_fourtu_service),
) -> List[FourTuFileItem]:
    """Returns all tracked files with validation and map readiness states."""
    return await service.get_files(limit=limit)


@router.get(
    "/files/{file_id}",
    response_model=FourTuFileItem,
    summary="Get details and validation state for a specific 4TU file",
)
async def get_4tu_file_by_id(
    file_id: str,
    service: FourTuService = Depends(get_fourtu_service),
) -> FourTuFileItem:
    """Returns details, status, and detection link for an individual 4TU file."""
    f = await service.get_file_by_id(file_id=file_id)
    if not f:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"4TU file with ID '{file_id}' not found.",
        )
    return f
