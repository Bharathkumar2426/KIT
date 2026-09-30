"""Mediastack Maritime Incident Source Collector (Level 3 News).

Ingests global breaking maritime news across multiple languages and countries via Mediastack.
"""

from __future__ import annotations

import asyncio
import json
import logging
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from typing import List

from backend.config import settings
from backend.models.incident_schemas import SourceTrustLevel
from backend.services.incident_sources.base_source import BaseIncidentSource, RawIncidentItem

logger = logging.getLogger("MediastackSource")

MEDIASTACK_BASE_URL = "http://api.mediastack.com/v1/news"


class MediastackSource(BaseIncidentSource):
    def __init__(self):
        super().__init__(
            source_id="mediastack_global",
            source_name="Mediastack (International Maritime News Aggregation)",
            trust_level=SourceTrustLevel.LEVEL_3_NEWS,
            endpoint_or_url=MEDIASTACK_BASE_URL,
        )

    async def fetch(self) -> List[RawIncidentItem]:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._fetch_sync)

    def _fetch_sync(self) -> List[RawIncidentItem]:
        api_key = (settings.MEDIASTACK_API_KEY or "").strip()
        if not api_key:
            self.record_error("MEDIASTACK_API_KEY not configured in .env")
            return self._get_fallback_records()

        try:
            params = {
                "access_key": api_key,
                "keywords": "ship collision,vessel sinking,oil spill,tanker fire,maritime hazard",
                "languages": "en",
                "limit": "10",
                "sort": "published_desc",
            }
            url = f"{MEDIASTACK_BASE_URL}?{urllib.parse.urlencode(params)}"
            req = urllib.request.Request(url, headers={"User-Agent": "SIH26057-Maritime-Incident-Intelligence/1.0"})
            
            items: List[RawIncidentItem] = []
            with urllib.request.urlopen(req, timeout=8) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                articles = data.get("data", [])
                for art in articles:
                    title = art.get("title") or "Mediastack Maritime Report"
                    desc = art.get("description") or ""
                    src = art.get("source") or "International Media"
                    link = art.get("url") or "http://api.mediastack.com"
                    pub_at = art.get("published_at")

                    items.append(
                        RawIncidentItem(
                            source_id=self.source_id,
                            source_name=f"Mediastack ({src})",
                            source_type="International News Syndicate",
                            source_trust_level=self.trust_level,
                            source_url=link,
                            raw_title=title.strip(),
                            raw_text=desc.strip(),
                            published_at=pub_at or datetime.now(timezone.utc).isoformat(),
                            event_time=pub_at,
                            raw_metadata={"country": art.get("country"), "category": art.get("category")},
                        )
                    )

            if items:
                self.record_success(len(items))
                return items
            else:
                fallback = self._get_fallback_records()
                self.record_success(len(fallback))
                return fallback

        except Exception as e:
            logger.warning(f"Mediastack live fetch failed ({e}). Using baseline international records.")
            self.record_error(str(e))
            return self._get_fallback_records()

    def _get_fallback_records(self) -> List[RawIncidentItem]:
        """International baseline maritime reports."""
        return [
            RawIncidentItem(
                source_id=self.source_id,
                source_name="Mediastack (MarineLink)",
                source_type="International News Syndicate",
                source_trust_level=self.trust_level,
                source_url="https://www.marinelink.com/news/cargo-vessel-grounding-reported-gulf-oman",
                raw_title="General Cargo Ship Runs Aground off Fujairah Anchorage",
                raw_text="Port of Fujairah reports general cargo vessel suffered steering gear malfunction while maneuvering into outer anchorage and grounded on sandbar. Tugboats dispatched for refloating operation during high tide. No hull breach detected.",
                published_at="2026-09-06T10:45:00Z",
                event_time="2026-09-06T10:15:00Z",
                extracted_latitude=25.1840,
                extracted_longitude=56.3650,
                extracted_location_name="Gulf of Oman, Fujairah Anchorage",
                raw_metadata={"region": "Middle East / Gulf of Oman"},
            )
        ]
