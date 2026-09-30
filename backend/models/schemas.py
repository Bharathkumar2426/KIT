"""Pydantic Request & Response Schemas matching SIH 26057 Specifications."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional
# pyrefly: ignore [missing-import]
from pydantic import AliasChoices, BaseModel, ConfigDict, Field, model_validator


class BoundingBox(BaseModel):
    """Bounding box format for width/height coordinate access."""
    x: int = Field(..., description="Top-left x coordinate")
    y: int = Field(..., description="Top-left y coordinate")
    width: int = Field(..., description="Bounding box width")
    height: int = Field(..., description="Bounding box height")


class CenterPoint(BaseModel):
    x: float
    y: float


class DetectionItem(BaseModel):

    """Detection item supporting both [x1, y1, x2, y2] array and {x,y,w,h} objects."""
    model_config = ConfigDict(populate_by_name=True)

    id: int = Field(..., description="Detection target index (1, 2, ...)")
    class_name: str = Field(..., description="Class name (e.g. ghost_net)")
    class_: Optional[str] = Field(None, serialization_alias="class", description="Class alias")
    display_name: str = Field(..., description="Human-readable name (e.g. Ghost Net)")
    confidence: float = Field(..., description="Model confidence score (0.0 to 1.0)")
    bbox: List[int] = Field(..., description="Bounding box coordinates [x1, y1, x2, y2]")
    bbox_coords: Optional[BoundingBox] = Field(None, description="Bounding box dictionary {x, y, width, height}")
    center: CenterPoint = Field(..., description="Target geometric acoustic center")
    area: int = Field(..., description="Bounding box pixel area")
    anomaly_score: float = Field(0.0, description="Empirical anomaly score (0.0 to 1.0)")
    classification_source: str = Field("detector", description="detector | second_stage | unknown")
    anomaly_type: str = Field("KNOWN_OBJECT", description="KNOWN_OBJECT or UNCLASSIFIED_ANOMALY")
    latitude: Optional[float] = Field(None, description="Geographic latitude in degrees WGS84")
    longitude: Optional[float] = Field(None, description="Geographic longitude in degrees WGS84")
    side: Optional[str] = Field(None, description="port | starboard")
    range_from_nadir_m: Optional[float] = Field(None, description="Across-track ground range from nadir in meters")
    width_m: Optional[float] = Field(None, description="Across-track physical target width in meters")
    length_m: Optional[float] = Field(None, description="Along-track physical target length in meters")
    top_3: List[Dict[str, Any]] = Field(default_factory=list, description="Top-3 candidate predictions")

    @model_validator(mode="before")
    @classmethod
    def sync_class_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            c = data.get("class_name") or data.get("class") or "unknown_debris"
            data["class_name"] = c
            data["class"] = c
            data["class_"] = c
        return data



class DetectionSummaryStats(BaseModel):
    total: int = 0
    high_confidence: int = 0      # >= 0.70
    medium_confidence: int = 0    # 0.40 - 0.70
    low_confidence: int = 0       # < 0.40
    unknown_anomalies: int = 0


class DetectResponse(BaseModel):
    """Inference response schema for detection pipeline."""
    image_id: str = Field(..., description="Unique sonar image identifier")
    model: str = Field(..., description="Model version/name used for inference")
    detections: List[DetectionItem] = Field(..., description="List of detected targets")
    total_objects: int = Field(..., description="Total count of confident targets")
    annotated_image_url: str = Field(..., description="URL to annotated image")
    original_image_url: str = Field(..., description="URL to original image")
    enhanced_image_url: str = Field(..., description="URL to preprocessed/enhanced image")
    processing_time_ms: float = Field(..., description="Total processing latency in ms")
    preprocessing_time_ms: float = Field(..., description="Preprocessing latency in ms")
    inference_time_ms: float = Field(..., description="Model inference latency in ms")
    summary: DetectionSummaryStats = Field(..., description="Summary statistics")
    image_width: Optional[int] = Field(None, description="Native image width in pixels")
    image_height: Optional[int] = Field(None, description="Native image height in pixels")
    geotagging_warning: Optional[str] = Field(None, description="Geotagging notice or warning")
    model_metadata: Dict[str, Any] = Field(default_factory=dict)
    stage_images: Dict[str, str] = Field(default_factory=dict)



class ImageDetailsResponse(BaseModel):
    image_id: str
    original_filename: str
    upload_timestamp: datetime
    image_width: int
    image_height: int
    original_url: str
    processed_url: str
    annotated_url: str
    total_detections: int
    detections: List[DetectionItem]
    geotagging_warning: Optional[str] = None


class HealthResponse(BaseModel):
    project: str
    version: str
    pytorch_version: str
    cuda_available: bool
    device_name: str
    model_version: str
    model_summary: str
    is_sonar_trained: bool
    classes_count: int
    classes: Dict[str, str]
    status: str = "ok"
    second_stage_active: bool = True
