"""Pydantic Schemas for 4TU.ResearchData External Ingestion."""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class FourTuFileItem(BaseModel):
    """Details for a single discovered or ingested file from 4TU."""
    id: int
    dataset_id: str
    dataset_title: str
    file_id: str
    filename: str
    file_format: str
    source_url: str
    dataset_url: Optional[str] = None
    local_path: Optional[str] = None
    file_size_bytes: int = 0
    checksum: Optional[str] = None
    status: str
    has_navigation: bool = False
    location_available: bool = False
    image_id: Optional[str] = None
    detections_count: int = 0
    error_message: Optional[str] = None
    downloaded_at: Optional[datetime] = None
    processed_at: Optional[datetime] = None
    created_at: datetime


class FourTuDatasetItem(BaseModel):
    """Dataset metadata item discovered via 4TU Figshare search API."""
    dataset_id: str
    title: str
    doi: Optional[str] = None
    url: str
    published_date: Optional[str] = None
    description: Optional[str] = None
    categories: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)
    files_count: int = 0
    relevant_files_count: int = 0
    relevance_score: float = 0.0
    relevance_reasons: List[str] = Field(default_factory=list)


class FourTuSyncRunItem(BaseModel):
    """Summary of a past or current 4TU synchronization run."""
    id: int
    started_at: datetime
    completed_at: Optional[datetime] = None
    datasets_found: int = 0
    files_found: int = 0
    new_files: int = 0
    downloaded: int = 0
    validated: int = 0
    processed: int = 0
    detections: int = 0
    georeferenced: int = 0
    without_location: int = 0
    failed: int = 0
    status: str
    error_message: Optional[str] = None


class FourTuStatusResponse(BaseModel):
    """Current health and operational metrics for 4TU automated feed."""
    enabled: bool = True
    status: str = "CONNECTED"  # CONNECTED, SYNCING, ERROR, DISABLED
    api_base: str
    sync_interval_hours: int
    last_sync: Optional[datetime] = None
    next_sync: Optional[datetime] = None
    total_datasets_tracked: int = 0
    total_files_discovered: int = 0
    total_files_processed: int = 0
    total_georeferenced_detections: int = 0
    total_without_location: int = 0
    total_failed_files: int = 0
    recent_runs: List[FourTuSyncRunItem] = Field(default_factory=list)


class FourTuSyncResponse(BaseModel):
    """Response returned upon triggering or finishing a 4TU synchronization."""
    success: bool
    source: str = "4TU.ResearchData"
    datasets_found: int = 0
    files_found: int = 0
    new_files: int = 0
    downloaded: int = 0
    validated: int = 0
    processed: int = 0
    detections: int = 0
    georeferenced: int = 0
    without_location: int = 0
    failed: int = 0
    message: str = "Sync complete"
    errors: List[str] = Field(default_factory=list)


class FourTuSearchResponse(BaseModel):
    """Response containing discovered 4TU side-scan sonar datasets."""
    query_used: str
    total_datasets: int
    datasets: List[FourTuDatasetItem] = Field(default_factory=list)
