"""Incident Ingestion Orchestration Service (SIH 26057).

Coordinates polling across 9 multi-tier data sources, invokes AI feature extraction,
performs deduplication clustering, and maintains the incident intelligence repository.
"""

from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import settings
from backend.database import async_session_maker
from backend.models.incident_models import MaritimeIncidentRecord
from backend.models.incident_schemas import (
    Incident,
    IncidentMetrics,
    IncidentSeverity,
    IncidentStatus,
    SourceHealthStatus,
    SourceTrustLevel,
)
from backend.services.incident_ai_service import get_incident_ai_service
from backend.services.incident_deduplication_service import get_incident_deduplication_service
from backend.services.incident_sources.base_source import BaseIncidentSource, RawIncidentItem
from backend.services.incident_sources.gdelt_source import GDELTSource
from backend.services.incident_sources.gfw_source import GFWSource
from backend.services.incident_sources.icg_source import ICGSource
from backend.services.incident_sources.incois_source import INCOISSource
from backend.services.incident_sources.mediastack_source import MediastackSource
from backend.services.incident_sources.newsapi_source import NewsAPISource
from backend.services.incident_sources.nga_source import NGASource
from backend.services.incident_sources.noaa_source import NOAASource
from backend.services.incident_sources.uscg_source import USCGSource

logger = logging.getLogger("IncidentIngestionService")


class IncidentIngestionService:
    """Orchestrates multi-source collection, AI extraction, deduplication, and persistence."""

    def __init__(self):
        self._sources: List[BaseIncidentSource] = [
            NOAASource(),
            USCGSource(),
            NGASource(),
            INCOISSource(),
            ICGSource(),
            NewsAPISource(),
            MediastackSource(),
            GDELTSource(),
            GFWSource(),
        ]
        self._incidents: Dict[str, Incident] = {}
        self._running = False
        self._task: Optional[asyncio.Task] = None
        self._last_ingestion_time: Optional[str] = None
        self._lock = asyncio.Lock()

    async def start(self):
        """Starts background periodic polling and loads initial cached records."""
        if self._running:
            return
        self._running = True
        logger.info("Maritime Incident Ingestion Service started.")
        # Load from database first
        await self._load_from_db()
        # Perform initial fetch
        asyncio.create_task(self.sync_all_sources())
        # Start background polling loop
        self._task = asyncio.create_task(self._poll_loop())

    async def stop(self):
        """Stops background polling."""
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None
        logger.info("Maritime Incident Ingestion Service stopped.")

    async def _poll_loop(self):
        """Periodic background ingestion loop."""
        while self._running:
            try:
                await asyncio.sleep(settings.INCIDENT_POLL_INTERVAL_SECONDS)
                if not self._running:
                    break
                await self.sync_all_sources()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in incident polling loop: {e}")
                await asyncio.sleep(30)

    async def sync_all_sources(self) -> int:
        """Fetches from all active sources concurrently, executes AI pipeline, and persists results."""
        async with self._lock:
            logger.info("Beginning multi-source maritime incident ingestion sync...")
            all_raw_items: List[RawIncidentItem] = []

            # Concurrent fetch with individual exception shields
            tasks = [s.fetch() for s in self._sources]
            results = await asyncio.gather(*tasks, return_exceptions=True)

            for src, res in zip(self._sources, results):
                if isinstance(res, Exception):
                    src.record_error(str(res))
                elif isinstance(res, list):
                    all_raw_items.extend(res)

            logger.info(f"Ingested {len(all_raw_items)} total raw items across {len(self._sources)} sources.")

            # Run AI extraction on all raw items
            ai_svc = get_incident_ai_service()
            ai_features_map: Dict[str, Dict] = {}
            for item in all_raw_items:
                key = item.source_id + "_" + item.raw_title
                ai_features_map[key] = ai_svc.extract_incident_features(item)

            # Deduplicate and cluster with existing repository
            dedup_svc = get_incident_deduplication_service()
            clustered = dedup_svc.cluster_and_merge(
                raw_items=all_raw_items,
                existing_incidents=list(self._incidents.values()),
                ai_features_map=ai_features_map,
            )

            # Update in-memory index
            for inc in clustered:
                self._incidents[inc.incident_id] = inc

            self._last_ingestion_time = datetime.now(timezone.utc).isoformat()

            # Persist to database
            await self._save_to_db()
            logger.info(f"Incident sync complete. Total active clustered incidents: {len(self._incidents)}")
            return len(self._incidents)

    async def _load_from_db(self):
        """Loads persistent incident records from SQLite on startup."""
        try:
            async with async_session_maker() as session:
                stmt = select(MaritimeIncidentRecord)
                res = await session.execute(stmt)
                records = res.scalars().all()
                for rec in records:
                    inc_schema = rec.to_schema()
                    self._incidents[inc_schema.incident_id] = inc_schema
                logger.info(f"Loaded {len(records)} maritime incident records from SQLite database.")
        except Exception as e:
            logger.warning(f"Could not load initial incidents from DB ({e}). Will populate from live sync.")

    async def _save_to_db(self):
        """Persists current incident records into SQLite database."""
        try:
            async with async_session_maker() as session:
                for inc in self._incidents.values():
                    stmt = select(MaritimeIncidentRecord).where(MaritimeIncidentRecord.incident_id == inc.incident_id)
                    res = await session.execute(stmt)
                    rec = res.scalar_one_or_none()

                    sources_json = json.dumps([s.model_dump() for s in inc.sources])
                    related_mmsi_json = json.dumps(inc.related_mmsi)
                    keywords_json = json.dumps(inc.keywords)

                    if rec:
                        rec.title = inc.title
                        rec.incident_type = inc.incident_type.value if hasattr(inc.incident_type, "value") else str(inc.incident_type)
                        rec.description = inc.description
                        rec.sources_json = sources_json
                        rec.latitude = inc.latitude
                        rec.longitude = inc.longitude
                        rec.location_text = inc.location_text
                        rec.location_precision = inc.location_precision.value if hasattr(inc.location_precision, "value") else str(inc.location_precision)
                        rec.severity = inc.severity.value if hasattr(inc.severity, "value") else str(inc.severity)
                        rec.confidence = inc.confidence
                        rec.verification_status = inc.verification_status.value if hasattr(inc.verification_status, "value") else str(inc.verification_status)
                        rec.status = inc.status.value if hasattr(inc.status, "value") else str(inc.status)
                        rec.is_mapped = inc.is_mapped
                        rec.is_dismissed = inc.is_dismissed
                        rec.related_vessel_count = inc.related_vessel_count
                        rec.related_mmsi_json = related_mmsi_json
                        rec.keywords_json = keywords_json
                        rec.ai_reasoning_summary = inc.ai_reasoning_summary
                        rec.updated_at = datetime.now(timezone.utc).isoformat()
                    else:
                        new_rec = MaritimeIncidentRecord(
                            incident_id=inc.incident_id,
                            title=inc.title,
                            incident_type=inc.incident_type.value if hasattr(inc.incident_type, "value") else str(inc.incident_type),
                            description=inc.description,
                            source_name=inc.source_name,
                            source_type=inc.source_type,
                            source_url=inc.source_url,
                            source_trust_level=inc.source_trust_level.value if hasattr(inc.source_trust_level, "value") else str(inc.source_trust_level),
                            sources_json=sources_json,
                            published_at=inc.published_at,
                            event_time=inc.event_time,
                            last_updated=inc.last_updated,
                            latitude=inc.latitude,
                            longitude=inc.longitude,
                            location_text=inc.location_text,
                            location_precision=inc.location_precision.value if hasattr(inc.location_precision, "value") else str(inc.location_precision),
                            location_source=inc.location_source,
                            severity=inc.severity.value if hasattr(inc.severity, "value") else str(inc.severity),
                            confidence=inc.confidence,
                            verification_status=inc.verification_status.value if hasattr(inc.verification_status, "value") else str(inc.verification_status),
                            status=inc.status.value if hasattr(inc.status, "value") else str(inc.status),
                            affected_area_radius_km=inc.affected_area_radius_km,
                            potential_danger_zone=inc.potential_danger_zone,
                            is_mapped=inc.is_mapped,
                            is_dismissed=inc.is_dismissed,
                            related_vessel_count=inc.related_vessel_count,
                            related_mmsi_json=related_mmsi_json,
                            keywords_json=keywords_json,
                            ai_reasoning_summary=inc.ai_reasoning_summary,
                            raw_source_reference=inc.raw_source_reference,
                            created_at=inc.created_at,
                            updated_at=inc.updated_at,
                        )
                        session.add(new_rec)

                await session.commit()
        except Exception as e:
            logger.error(f"Failed to persist incidents to SQLite: {e}")

    def get_all_incidents(
        self,
        severity: Optional[str] = None,
        incident_type: Optional[str] = None,
        is_mapped_only: bool = False,
        pending_review_only: bool = False,
        include_dismissed: bool = False,
    ) -> List[Incident]:
        """Returns filtered incident records."""
        results = list(self._incidents.values())

        if not include_dismissed:
            results = [inc for inc in results if not inc.is_dismissed]

        if is_mapped_only:
            results = [inc for inc in results if inc.is_mapped]

        if pending_review_only:
            results = [inc for inc in results if not inc.is_mapped and not inc.is_dismissed]

        if severity:
            results = [inc for inc in results if inc.severity.value.upper() == severity.upper()]

        if incident_type:
            results = [inc for inc in results if inc.incident_type.value.lower() == incident_type.lower()]

        # Sort by severity weight and published time
        sev_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
        results.sort(key=lambda x: (sev_order.get(x.severity.value, 4), x.published_at or ""), reverse=False)
        return results

    def get_incident_by_id(self, incident_id: str) -> Optional[Incident]:
        return self._incidents.get(incident_id)

    async def confirm_map_incident(
        self, incident_id: str, custom_danger_radius_km: Optional[float] = None, notes: Optional[str] = None
    ) -> Optional[Incident]:
        """Marks an incident as operator-confirmed for map plotting."""
        inc = self._incidents.get(incident_id)
        if not inc:
            return None

        # Operator confirmation rule: Must have coordinates to be plotted
        if inc.latitude is None or inc.longitude is None:
            return None

        inc.is_mapped = True
        inc.is_dismissed = False
        if custom_danger_radius_km is not None and custom_danger_radius_km > 0:
            inc.affected_area_radius_km = custom_danger_radius_km
            inc.potential_danger_zone = True

        inc.updated_at = datetime.now(timezone.utc).isoformat()
        await self._save_to_db()
        logger.info(f"Operator confirmed incident #{incident_id} ({inc.title}) for map plotting.")
        return inc

    async def dismiss_incident(self, incident_id: str) -> Optional[Incident]:
        """Dismisses an incident from the priority review queue."""
        inc = self._incidents.get(incident_id)
        if not inc:
            return None

        inc.is_dismissed = True
        inc.is_mapped = False
        inc.status = IncidentStatus.DISMISSED
        inc.updated_at = datetime.now(timezone.utc).isoformat()
        await self._save_to_db()
        return inc

    def get_metrics(self) -> IncidentMetrics:
        """Calculates executive dashboard metrics."""
        incidents = [i for i in self._incidents.values() if not i.is_dismissed]
        crit = sum(1 for i in incidents if i.severity == IncidentSeverity.CRITICAL)
        high = sum(1 for i in incidents if i.severity == IncidentSeverity.HIGH)
        med = sum(1 for i in incidents if i.severity == IncidentSeverity.MEDIUM)
        low = sum(1 for i in incidents if i.severity == IncidentSeverity.LOW)
        pending = sum(1 for i in incidents if not i.is_mapped)
        mapped = sum(1 for i in incidents if i.is_mapped)
        danger_zones = sum(1 for i in incidents if i.is_mapped and i.potential_danger_zone)
        online_sources = sum(1 for s in self._sources if s.status == "ONLINE")

        # Get active alarms count from risk service
        from backend.services.incident_risk_service import get_incident_risk_service
        risk_svc = get_incident_risk_service()
        active_alarms = risk_svc.get_active_alarms()
        vessels_in_danger = len(active_alarms)

        # Check AIS connection status
        from backend.services.ais_service import get_ais_service, AisConnectionStatus
        ais_svc = get_ais_service()
        is_live = ais_svc._status == AisConnectionStatus.LIVE

        return IncidentMetrics(
            total_incidents=len(incidents),
            critical_count=crit,
            high_count=high,
            medium_count=med,
            low_count=low,
            pending_confirmation_count=pending,
            mapped_count=mapped,
            active_danger_zones_count=danger_zones,
            vessels_in_danger_count=vessels_in_danger,
            sources_online_count=online_sources,
            total_sources_count=len(self._sources),
            last_ingestion_time=self._last_ingestion_time,
            is_ais_live=is_live,
        )

    def get_sources_status(self) -> List[SourceHealthStatus]:
        """Returns health status for all 9 data ingestion collectors."""
        return [
            SourceHealthStatus(
                source_id=s.source_id,
                source_name=s.source_name,
                trust_level=s.trust_level,
                status=s.status,
                last_successful_fetch=s.last_successful_fetch,
                items_fetched=s.total_fetched,
                error_message=s.last_error,
                endpoint_or_url=s.endpoint_or_url,
            )
            for s in self._sources
        ]


_ingestion_service: Optional[IncidentIngestionService] = None


def get_incident_ingestion_service() -> IncidentIngestionService:
    global _ingestion_service
    if _ingestion_service is None:
        _ingestion_service = IncidentIngestionService()
    return _ingestion_service
