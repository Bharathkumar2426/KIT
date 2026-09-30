"""SQLAlchemy ORM Models for 4TU.ResearchData External Ingestion Tracking."""

from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import Boolean, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from backend.database import Base


class FourTuFileRecord(Base):
    """Tracks individual external files discovered and downloaded from 4TU.ResearchData."""
    __tablename__ = "fourtu_files"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    dataset_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    dataset_title: Mapped[str] = mapped_column(String(512), nullable=False)
    file_id: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_format: Mapped[str] = mapped_column(String(32), nullable=False)
    source_url: Mapped[str] = mapped_column(String(1024), nullable=False)
    dataset_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    local_path: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    file_size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    checksum: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    
    # Validation & Ingestion Status
    # DISCOVERED, DOWNLOADING, DOWNLOADED, VALIDATING, VALIDATED,
    # PROCESSING, PROCESSED, GEOREFERENCING, GEOREFERENCED, MAP_READY
    # Or failure states: DOWNLOAD_FAILED, INVALID_FILE, INVALID_SONAR_DATA,
    # UNSUPPORTED_FORMAT, NO_GEO_METADATA, PROCESSING_FAILED
    status: Mapped[str] = mapped_column(String(64), default="DISCOVERED", index=True)
    
    has_navigation: Mapped[bool] = mapped_column(Boolean, default=False)
    location_available: Mapped[bool] = mapped_column(Boolean, default=False)
    image_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    detections_count: Mapped[int] = mapped_column(Integer, default=0)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    downloaded_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    processed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class FourTuSyncRun(Base):
    """Tracks synchronization batches from 4TU.ResearchData."""
    __tablename__ = "fourtu_sync_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    datasets_found: Mapped[int] = mapped_column(Integer, default=0)
    files_found: Mapped[int] = mapped_column(Integer, default=0)
    new_files: Mapped[int] = mapped_column(Integer, default=0)
    downloaded: Mapped[int] = mapped_column(Integer, default=0)
    validated: Mapped[int] = mapped_column(Integer, default=0)
    processed: Mapped[int] = mapped_column(Integer, default=0)
    detections: Mapped[int] = mapped_column(Integer, default=0)
    georeferenced: Mapped[int] = mapped_column(Integer, default=0)
    without_location: Mapped[int] = mapped_column(Integer, default=0)
    failed: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(32), default="RUNNING")  # RUNNING, COMPLETED, FAILED
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
