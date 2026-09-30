import csv
import io
import json
import logging
from pathlib import Path
from typing import List, Optional
# pyrefly: ignore [missing-import]
import torch
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
# pyrefly: ignore [missing-import]
from fastapi.responses import FileResponse, Response
# pyrefly: ignore [missing-import]
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import settings
from backend.database import get_db
from backend.models.schemas import (
    BoundingBox,
    CenterPoint,
    DetectionItem,
    DetectResponse,
    HealthResponse,
    ImageDetailsResponse,
)
from backend.services.detection_service import DetectionService, get_detection_service, get_detector
from backend.services.sonar_geo import build_report, write_csv, write_json
from backend.services.storage_service import StorageService

logger = logging.getLogger("APIRoutes")

router = APIRouter()

SUPPORTED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp"}


@router.post(
    "/detect",
    response_model=DetectResponse,
    summary="Upload side-scan sonar image and run real object detection",
    description="Implements complete 12-stage pipeline: ingestion, modular preprocessing, 2-stage YOLO + crop inference, optional geodesy calculation, and SQLite persistence.",
)
async def detect_sonar(
    file: UploadFile = File(..., description="Side-scan sonar image file (PNG, JPG, TIFF)"),
    confidence_threshold: float = Query(
        0.20, ge=0.05, le=0.95, description="Confidence score cutoff threshold (empirically tuned)"
    ),
    iou_threshold: float = Query(
        0.45, ge=0.10, le=0.95, description="NMS IoU overlap threshold"
    ),
    enable_preprocessing: bool = Query(
        True, description="Enable CLAHE and Bilateral acoustic filtering"
    ),
    nav_file: Optional[UploadFile] = File(
        None, description="Optional navigation CSV or XTF file with ping metadata"
    ),
    swath_range_m: float = Query(
        50.0, description="Swath range in metres per side (nadir to edge)"
    ),
    slant_corrected: bool = Query(
        True, description="Whether sonar image is already slant-range corrected"
    ),
    start_lat: Optional[float] = Query(
        None, description="Fallback starting ping latitude in degrees WGS84"
    ),
    start_lon: Optional[float] = Query(
        None, description="Fallback starting ping longitude in degrees WGS84"
    ),
    end_lat: Optional[float] = Query(
        None, description="Fallback ending ping latitude in degrees WGS84"
    ),
    end_lon: Optional[float] = Query(
        None, description="Fallback ending ping longitude in degrees WGS84"
    ),
    altitude: Optional[float] = Query(
        0.0, description="Sensor altitude above seabed in metres"
    ),
    db: AsyncSession = Depends(get_db),
    service: DetectionService = Depends(get_detection_service),
) -> DetectResponse:
    """Handles sonar image upload and executes the detection pipeline with optional geotagging."""
    filename = file.filename or "sonar_upload.png"
    ext = Path(filename).suffix.lower()

    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported image extension '{ext}'. Supported formats: {', '.join(sorted(SUPPORTED_EXTENSIONS))}",
        )

    try:
        contents = await file.read()
        if len(contents) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty (0 bytes).",
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read upload stream: {str(e)}",
        ) from e

    nav_bytes: Optional[bytes] = None
    nav_filename: Optional[str] = None
    if nav_file is not None:
        try:
            nav_bytes = await nav_file.read()
            nav_filename = nav_file.filename
        except Exception as e:
            logger.warning(f"Failed to read nav_file upload: {e}")

    try:
        response = await service.execute_detection_pipeline(
            image_bytes=contents,
            filename=filename,
            confidence_threshold=confidence_threshold,
            iou_threshold=iou_threshold,
            enable_preprocessing=enable_preprocessing,
            nav_file_bytes=nav_bytes,
            nav_filename=nav_filename,
            swath_range_m=swath_range_m,
            slant_corrected=slant_corrected,
            start_lat=start_lat,
            start_lon=start_lon,
            end_lat=end_lat,
            end_lon=end_lon,
            altitude=altitude or 0.0,
            session=db,
        )
        return response
    except Exception as e:
        logger.exception(f"Error during detection pipeline: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Detection pipeline failed: {str(e)}",
        ) from e


@router.get(
    "/detections/{image_id}",
    response_model=List[DetectionItem],
    summary="Get structured detections for a specific sonar image",
)
async def get_detections_for_image(
    image_id: str,
    db: AsyncSession = Depends(get_db),
) -> List[DetectionItem]:
    """Retrieves all detection records for an image from SQLite."""
    records = await StorageService.get_detections_by_image(db, image_id)
    if not records:
        img = await StorageService.get_image_with_detections(db, image_id)
        if not img:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Image ID '{image_id}' not found.",
            )
        return []

    items = []
    for idx, r in enumerate(records):
        bx, by = r.x, r.y
        bw, bh = max(1, r.width), max(1, r.height)
        anom_score = float(getattr(r, "anomaly_score", 0.0) or 0.0)
        src = str(getattr(r, "classification_source", "detector") or "detector")

        item = DetectionItem(
            id=idx + 1,
            class_name=r.class_name,
            display_name=r.class_name.replace("_", " ").title(),
            confidence=r.confidence,
            bbox=[bx, by, bx + bw, by + bh],
            bbox_coords=BoundingBox(x=bx, y=by, width=bw, height=bh),
            center=CenterPoint(x=bx + (bw / 2.0), y=by + (bh / 2.0)),
            area=r.area,
            anomaly_score=anom_score,
            classification_source=src,
            anomaly_type="KNOWN_OBJECT" if anom_score < 0.50 else "UNCLASSIFIED_ANOMALY",
            latitude=getattr(r, "latitude", None),
            longitude=getattr(r, "longitude", None),
            side=getattr(r, "side", None),
            range_from_nadir_m=getattr(r, "range_from_nadir_m", None),
            width_m=getattr(r, "width_m", None),
            length_m=getattr(r, "length_m", None),
        )
        items.append(item)
    return items


@router.get(
    "/images/{image_id}",
    response_model=ImageDetailsResponse,
    summary="Get metadata and detection summary for an image",
)
async def get_image_details(
    image_id: str,
    db: AsyncSession = Depends(get_db),
) -> ImageDetailsResponse:
    """Returns image metadata and list of detections."""
    img = await StorageService.get_image_with_detections(db, image_id)
    if not img:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Image ID '{image_id}' not found.",
        )

    det_items = []
    for idx, d in enumerate(img.detections):
        bx, by = d.x, d.y
        bw, bh = max(1, d.width), max(1, d.height)
        anom_score = float(getattr(d, "anomaly_score", 0.0) or 0.0)
        src = str(getattr(d, "classification_source", "detector") or "detector")

        item = DetectionItem(
            id=idx + 1,
            class_name=d.class_name,
            display_name=d.class_name.replace("_", " ").title(),
            confidence=d.confidence,
            bbox=[bx, by, bx + bw, by + bh],
            bbox_coords=BoundingBox(x=bx, y=by, width=bw, height=bh),
            center=CenterPoint(x=bx + (bw / 2.0), y=by + (bh / 2.0)),
            area=d.area,
            anomaly_score=anom_score,
            classification_source=src,
            anomaly_type="KNOWN_OBJECT" if anom_score < 0.50 else "UNCLASSIFIED_ANOMALY",
            latitude=getattr(d, "latitude", None),
            longitude=getattr(d, "longitude", None),
            side=getattr(d, "side", None),
            range_from_nadir_m=getattr(d, "range_from_nadir_m", None),
            width_m=getattr(d, "width_m", None),
            length_m=getattr(d, "length_m", None),
        )
        det_items.append(item)

    return ImageDetailsResponse(
        image_id=img.image_id,
        original_filename=img.original_filename,
        upload_timestamp=img.upload_timestamp,
        image_width=img.image_width,
        image_height=img.image_height,
        original_url=f"/api/images/{img.image_id}/original",
        processed_url=f"/api/images/{img.image_id}/enhanced",
        annotated_url=f"/api/images/{img.image_id}/annotated",
        total_detections=len(det_items),
        detections=det_items,
    )


@router.get(
    "/scans/{scan_id}/report",
    summary="Download real-world anomaly report in JSON or CSV format",
    description="Generates an anomaly report with real-world lat/lon, side, range_from_nadir_m, and dimensions in metres.",
)
@router.get(
    "/images/{scan_id}/report",
    summary="Download real-world anomaly report in JSON or CSV format",
)
async def get_scan_report(
    scan_id: str,
    format: str = Query("json", description="Report export format: 'json' or 'csv'"),
    db: AsyncSession = Depends(get_db),
):
    """Returns anomaly report formatted as JSON or CSV file download."""
    img = await StorageService.get_image_with_detections(db, scan_id)
    if not img:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scan ID '{scan_id}' not found in database.",
        )

    det_list = []
    for idx, d in enumerate(img.detections, 1):
        bx, by = d.x, d.y
        bw, bh = max(1, d.width), max(1, d.height)
        det_list.append({
            "id": idx,
            "classification": d.class_name,
            "confidence": d.confidence,
            "confidence_pct": round(float(d.confidence) * 100, 1),
            "bbox": [bx, by, bx + bw, by + bh],
            "bbox_px": [bx, by, bx + bw, by + bh],
            "latitude": getattr(d, "latitude", None),
            "longitude": getattr(d, "longitude", None),
            "side": getattr(d, "side", None),
            "range_from_nadir_m": getattr(d, "range_from_nadir_m", None),
            "width_m": getattr(d, "width_m", None),
            "length_m": getattr(d, "length_m", None),
        })

    report = build_report(scan_id=scan_id, detections=det_list, geo=None)

    fmt = format.lower().strip()
    if fmt not in ("json", "csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid format '{format}'. Supported formats are 'json' and 'csv'.",
        )

    if fmt == "csv":
        output = io.StringIO()
        rows = report.get("detections", [])
        fieldnames = [
            "id",
            "classification",
            "confidence_pct",
            "bbox_px",
            "latitude",
            "longitude",
            "width_m",
            "length_m",
            "side",
            "range_from_nadir_m",
        ]
        writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        if rows:
            writer.writerows(rows)

        csv_content = output.getvalue()
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={
                "Content-Disposition": f'attachment; filename="report_{scan_id}.csv"',
                "Access-Control-Expose-Headers": "Content-Disposition",
            },
        )
    else:
        json_content = json.dumps(report, indent=2)
        return Response(
            content=json_content,
            media_type="application/json",
            headers={
                "Content-Disposition": f'attachment; filename="report_{scan_id}.json"',
                "Access-Control-Expose-Headers": "Content-Disposition",
            },
        )


@router.get(
    "/images/{image_id}/annotated",
    summary="Download or view the annotated sonar image with bounding boxes",
)
async def get_annotated_image(
    image_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Serves the annotated image file from storage."""
    img = await StorageService.get_image_with_detections(db, image_id)
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")
    path = Path(img.annotated_image_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Annotated image file not found on disk")
    return FileResponse(path, media_type="image/png")


@router.get(
    "/images/{image_id}/original",
    summary="Download or view the original uploaded sonar image",
)
async def get_original_image(
    image_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Serves the original sonar image file from storage."""
    img = await StorageService.get_image_with_detections(db, image_id)
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")
    path = Path(img.original_image_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Original image file not found on disk")
    return FileResponse(path, media_type="image/png")


@router.get(
    "/images/{image_id}/enhanced",
    summary="Download or view the preprocessed enhanced sonar image",
)
async def get_enhanced_image(
    image_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Serves the preprocessed / CLAHE enhanced image file from storage."""
    img = await StorageService.get_image_with_detections(db, image_id)
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")
    path = Path(img.processed_image_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Enhanced image file not found on disk")
    return FileResponse(path, media_type="image/png")


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="System and Model Health Check",
)
async def health_check() -> HealthResponse:
    """Reports API status, PyTorch version, CUDA GPU acceleration, and active model."""
    detector = get_detector()
    cuda_avail = torch.cuda.is_available()
    device_name = torch.cuda.get_device_name(0) if cuda_avail else "CPU"
    second_stage_active = bool(detector.crop_classifier and detector.crop_classifier.is_loaded)

    return HealthResponse(
        status="ok",
        project=settings.PROJECT_NAME,
        version=settings.VERSION,
        pytorch_version=torch.__version__,
        cuda_available=cuda_avail,
        device_name=device_name,
        model_version=detector.model_version,
        model_summary=detector.model_summary,
        is_sonar_trained=detector.is_sonar_trained,
        second_stage_active=second_stage_active,
        classes_count=len(detector.class_taxonomy),
        classes={str(k): str(v) for k, v in detector.class_taxonomy.items()},
    )


@router.get(
    "/config",
    summary="Retrieve class taxonomy and default threshold configurations",
)
async def get_system_config():
    """Returns class names, color palettes, and default inference parameters."""
    detector = get_detector()
    return {
        "classes": detector.class_taxonomy,
        "display_names": detector.display_names,
        "color_palette": detector.color_palette,
        "inference_defaults": detector.inference_defaults,
    }


@router.get(
    "/samples",
    summary="List available sample sonar images",
)
async def list_samples():
    """Returns paths and metadata of verified sonar sample images."""
    samples = []
    if settings.SAMPLES_DIR.exists():
        for p in settings.SAMPLES_DIR.glob("*.*"):
            if p.suffix.lower() in SUPPORTED_EXTENSIONS:
                samples.append({
                    "name": p.name,
                    "filename": p.name,
                    "size_bytes": p.stat().st_size,
                    "url": f"/api/samples/{p.name}",
                })
    return samples


@router.get(
    "/samples/{filename}",
    summary="Serve a sample sonar image",
)
async def get_sample_file(filename: str):
    """Serves a specific sample sonar image."""
    safe_name = Path(filename).name
    p = settings.SAMPLES_DIR / safe_name
    if not p.exists():
        raise HTTPException(status_code=404, detail="Sample image not found")
    return FileResponse(p, media_type="image/jpeg" if p.suffix.lower() in [".jpg", ".jpeg"] else "image/png")
