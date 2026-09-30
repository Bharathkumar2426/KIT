"""Storage Service for SQLite Persistence matching Section 13 (SIH 26057)."""

from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.models.db_models import ImageRecord, DetectionRecord


class StorageService:
    """Handles database transactions for Sonar Images and Detections."""

    @staticmethod
    async def create_image_record(
        session: AsyncSession,
        image_id: str,
        original_filename: str,
        original_path: str,
        processed_path: str,
        annotated_path: str,
        image_width: int,
        image_height: int,
    ) -> ImageRecord:
        """Persists image record into SQLite images table."""
        record = ImageRecord(
            image_id=image_id,
            original_filename=original_filename,
            upload_timestamp=datetime.now(timezone.utc),
            original_image_path=str(original_path),
            processed_image_path=str(processed_path),
            annotated_image_path=str(annotated_path),
            image_width=image_width,
            image_height=image_height,
        )
        session.add(record)
        await session.commit()
        await session.refresh(record)
        return record

    @staticmethod
    async def save_detections(
        session: AsyncSession,
        image_id: str,
        detections: List[dict],
        model_version: str,
    ) -> List[DetectionRecord]:
        """Persists individual target bounding boxes, confidences, and anomaly scores."""
        records = []
        now = datetime.now(timezone.utc)
        for det in detections:
            bbox = det["bbox"]
            if isinstance(bbox, list):
                x1, y1, x2, y2 = bbox
                bx, by = int(x1), int(y1)
                bw, bh = max(1, int(x2 - x1)), max(1, int(y2 - y1))
            else:
                bx, by = int(bbox["x"]), int(bbox["y"])
                bw, bh = max(1, int(bbox["width"])), max(1, int(bbox["height"]))

            cname = det.get("class_name", det.get("class", "unknown_debris"))
            rec = DetectionRecord(
                image_id=image_id,
                class_name=cname,
                confidence=float(det["confidence"]),
                x=bx,
                y=by,
                width=bw,
                height=bh,
                area=int(det.get("area", bw * bh)),
                model_version=model_version,
                anomaly_score=float(det.get("anomaly_score", 0.0)),
                classification_source=str(det.get("classification_source", "detector")),
                latitude=float(det["latitude"]) if det.get("latitude") is not None else None,
                longitude=float(det["longitude"]) if det.get("longitude") is not None else None,
                side=str(det["side"]) if det.get("side") is not None else None,
                range_from_nadir_m=float(det["range_from_nadir_m"]) if det.get("range_from_nadir_m") is not None else None,
                width_m=float(det["width_m"]) if det.get("width_m") is not None else None,
                length_m=float(det["length_m"]) if det.get("length_m") is not None else None,
                inference_timestamp=now,
            )
            session.add(rec)
            records.append(rec)

        await session.commit()
        return records

    @staticmethod
    async def get_image_with_detections(
        session: AsyncSession,
        image_id: str,
    ) -> Optional[ImageRecord]:
        """Retrieves an image record along with all associated detection objects."""
        stmt = (
            select(ImageRecord)
            .where(ImageRecord.image_id == image_id)
            .options(selectinload(ImageRecord.detections))
        )
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_detections_by_image(
        session: AsyncSession,
        image_id: str,
    ) -> List[DetectionRecord]:
        """Retrieves only detection records for a specific image."""
        stmt = (
            select(DetectionRecord)
            .where(DetectionRecord.image_id == image_id)
            .order_by(DetectionRecord.detection_id.asc())
        )
        result = await session.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def list_recent_images(
        session: AsyncSession,
        limit: int = 50,
    ) -> List[ImageRecord]:
        """Returns the most recent image inspections."""
        stmt = (
            select(ImageRecord)
            .order_by(desc(ImageRecord.upload_timestamp))
            .limit(limit)
        )
        result = await session.execute(stmt)
        return list(result.scalars().all())
