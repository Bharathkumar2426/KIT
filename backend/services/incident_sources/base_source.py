"""Base Class for Maritime Incident Source Collectors (SIH 26057)."""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import BaseModel

from backend.models.incident_schemas import SourceTrustLevel

logger = logging.getLogger("IncidentSource")


class RawIncidentItem(BaseModel):
    """Raw extracted report item before AI enrichment and deduplication."""
    source_id: str
    source_name: str
    source_type: str
    source_trust_level: SourceTrustLevel
    source_url: str
    raw_title: str
    raw_text: str
    published_at: Optional[str] = None
    event_time: Optional[str] = None
    extracted_latitude: Optional[float] = None
    extracted_longitude: Optional[float] = None
    extracted_location_name: Optional[str] = None
    raw_metadata: Dict[str, Any] = {}


class BaseIncidentSource(ABC):
    """Abstract base class providing error isolation and health reporting for data sources."""

    def __init__(
        self,
        source_id: str,
        source_name: str,
        trust_level: SourceTrustLevel,
        endpoint_or_url: str,
    ):
        self.source_id = source_id
        self.source_name = source_name
        self.trust_level = trust_level
        self.endpoint_or_url = endpoint_or_url
        self.status = "ONLINE"
        self.last_successful_fetch: Optional[str] = None
        self.last_error: Optional[str] = None
        self.total_fetched = 0

    @abstractmethod
    async def fetch(self) -> List[RawIncidentItem]:
        """Fetches and normalizes raw incident items from this source."""
        pass

    def record_success(self, count: int):
        self.status = "ONLINE"
        self.last_successful_fetch = datetime.now(timezone.utc).isoformat()
        self.last_error = None
        self.total_fetched += count

    def record_error(self, err_msg: str):
        self.status = "DEGRADED" if self.last_successful_fetch else "OFFLINE"
        self.last_error = err_msg
        logger.warning(f"[{self.source_name}] Source fetch error: {err_msg}")
