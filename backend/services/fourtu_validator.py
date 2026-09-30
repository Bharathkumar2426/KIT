"""Data Validation Pipeline for 4TU External Sonar Datasets & Files."""

from __future__ import annotations

import hashlib
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np
from PIL import Image

logger = logging.getLogger("FourTuValidator")

SUPPORTED_SONAR_IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp"}
SUPPORTED_RAW_SONAR_EXTS = {".xtf"}
SUPPORTED_NAV_SIDECAR_EXTS = {".csv", ".txt", ".json", ".kml"}
SUPPORTED_ARCHIVE_EXTS = {".zip"}

SONAR_KEYWORDS = {
    "side-scan", "sidescan", "side scan", "sonar", "acoustic",
    "bathymetry", "seabed", "seafloor", "swath", "waterfall",
    "towfish", "ping", "subsea", "underwater", "debris",
    "wreck", "pipeline", "marine robotics", "benthic"
}

NON_SONAR_EXCLUSIONS = {
    "human-robot", "social norm", "nao robot", "video recording",
    "speech", "audio interview", "questionnaire", "survey data underlying the msc thesis",
    "delamination", "thermochronology"
}


class ValidationResult:
    def __init__(self, is_valid: bool, reason: str = "", details: Optional[Dict[str, Any]] = None):
        self.is_valid = is_valid
        self.reason = reason
        self.details = details or {}

    def __bool__(self) -> bool:
        return self.is_valid


class FourTuValidator:
    """Enforces multi-stage validation before, during, and after processing."""

    @classmethod
    def evaluate_dataset_relevance(cls, dataset: Dict[str, Any]) -> Tuple[bool, float, List[str]]:
        """Scores whether a 4TU dataset represents real side-scan or acoustic sonar research."""
        title = (dataset.get("title") or "").lower()
        desc = (dataset.get("description") or "").lower()
        tags = [str(t).lower() for t in dataset.get("tags", [])]
        categories = [str(c).lower() if isinstance(c, str) else str(c.get("title", "")).lower() for c in dataset.get("categories", [])]
        
        full_text = f"{title} {desc} {' '.join(tags)} {' '.join(categories)}"
        
        # Check hard exclusions first
        for exc in NON_SONAR_EXCLUSIONS:
            if exc in full_text:
                return False, 0.0, [f"Excluded due to non-sonar indicator: '{exc}'"]

        score = 0.0
        reasons = []

        # High-weight terms
        if "side-scan" in full_text or "sidescan" in full_text or "side scan" in full_text:
            score += 0.50
            reasons.append("Contains explicit 'side-scan sonar' nomenclature")
        
        if "sonar" in full_text:
            score += 0.40
            reasons.append("Contains 'sonar' keyword")

        if any(w in full_text for w in ["ping", "acoustic", "waterfall", "swath", "towfish", "seabed", "seafloor", "benthic", "bathymetry"]):
            score += 0.20
            reasons.append("Contains marine acoustic hydrography terms")

        if any(w in full_text for w in ["debris", "wreck", "pipeline", "anomaly", "underwater", "subsea", "marine robotics"]):
            score += 0.15
            reasons.append("Contains target/hazard marine terminology")

        is_relevant = score >= 0.35
        return is_relevant, round(score, 2), reasons

    @classmethod
    def validate_file_integrity(
        cls,
        file_path: Path,
        expected_md5: Optional[str] = None,
        max_size_mb: int = 500,
    ) -> ValidationResult:
        """Validates physical file existence, non-empty size, size caps, and checksum."""
        if not file_path.exists():
            return ValidationResult(False, f"File does not exist: {file_path}")

        size_bytes = file_path.stat().st_size
        if size_bytes == 0:
            return ValidationResult(False, "File is 0 bytes (empty download)")

        size_mb = size_bytes / (1024 * 1024)
        if size_mb > max_size_mb:
            return ValidationResult(False, f"File size ({size_mb:.1f} MB) exceeds limit of {max_size_mb} MB")

        # Check MD5 if provided
        if expected_md5:
            try:
                hasher = hashlib.md5()
                with open(file_path, "rb") as f:
                    for chunk in iter(lambda: f.read(65536), b""):
                        hasher.update(chunk)
                computed = hasher.hexdigest().lower()
                if computed != expected_md5.lower():
                    return ValidationResult(
                        False,
                        f"Checksum mismatch: expected {expected_md5}, computed {computed}",
                        {"expected": expected_md5, "computed": computed}
                    )
            except Exception as e:
                return ValidationResult(False, f"Failed calculating checksum: {e}")

        return ValidationResult(True, "File integrity verified", {"size_bytes": size_bytes, "size_mb": round(size_mb, 2)})

    @classmethod
    def validate_sonar_image(cls, file_path: Path) -> ValidationResult:
        """Validates that an image file is readable, uncorrupted, and suitable for sonar processing."""
        ext = file_path.suffix.lower()
        if ext not in SUPPORTED_SONAR_IMAGE_EXTS:
            return ValidationResult(False, f"Unsupported image extension '{ext}'")

        try:
            # Test OpenCV reading
            img = cv2.imread(str(file_path), cv2.IMREAD_UNCHANGED)
            if img is None:
                # Fallback to PIL
                with Image.open(str(file_path)) as pil_img:
                    pil_img.verify()
                img = cv2.imread(str(file_path), cv2.IMREAD_COLOR)

            if img is None:
                return ValidationResult(False, "Image decoder returned None (unreadable or corrupted)")

            h, w = img.shape[:2]
            if h < 32 or w < 32:
                return ValidationResult(False, f"Image dimensions too small ({w}x{h})")

            # Check for non-blank content (variance > 0)
            if len(img.shape) == 3:
                gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            else:
                gray = img

            std_dev = float(np.std(gray))
            if std_dev < 1.0:
                return ValidationResult(False, "Image is monochromatic blank/solid color (low variance)")

            return ValidationResult(
                True,
                "Sonar image passed visual validation",
                {"width": w, "height": h, "channels": 1 if len(img.shape) == 2 else img.shape[2], "std_dev": round(std_dev, 2)},
            )
        except Exception as e:
            return ValidationResult(False, f"Image validation exception: {str(e)}")

    @classmethod
    def validate_xtf_file(cls, file_path: Path) -> ValidationResult:
        """Validates that an XTF file conforms to eXtended Triton Format standards."""
        if file_path.suffix.lower() != ".xtf":
            return ValidationResult(False, "Not an XTF file")

        try:
            import pyxtf
            (header, packets) = pyxtf.xtf_read(str(file_path))
            
            # Count side-scan ping packets
            sonar_packets = [
                p for p in packets
                if getattr(p, "HeaderType", None) in (0, 1, 2)  # XTFPOS_PING, etc.
            ]
            
            return ValidationResult(
                True,
                "XTF file validated successfully",
                {
                    "system_type": getattr(header, "SonarName", "XTF"),
                    "total_packets": len(packets),
                    "sonar_packets": len(sonar_packets),
                }
            )
        except ImportError:
            return ValidationResult(False, "pyxtf library not installed")
        except Exception as e:
            return ValidationResult(False, f"XTF parsing error: {str(e)}")

    @classmethod
    def validate_geospatial_metadata(
        cls,
        start_lat: Optional[float],
        start_lon: Optional[float],
        end_lat: Optional[float] = None,
        end_lon: Optional[float] = None,
        swath_range_m: Optional[float] = None,
    ) -> ValidationResult:
        """Validates that real-world navigation parameters are mathematically sound and non-faked."""
        if start_lat is None or start_lon is None:
            return ValidationResult(False, "Missing start latitude/longitude")

        try:
            s_lat = float(start_lat)
            s_lon = float(start_lon)
            
            if not (-90.0 <= s_lat <= 90.0):
                return ValidationResult(False, f"Latitude out of bounds: {s_lat}")
            if not (-180.0 <= s_lon <= 180.0):
                return ValidationResult(False, f"Longitude out of bounds: {s_lon}")

            # Disallow (0.0, 0.0) null island
            if abs(s_lat) < 1e-4 and abs(s_lon) < 1e-4:
                return ValidationResult(False, "Coordinates resolve to Null Island (0,0), rejected as uncalibrated")

            if end_lat is not None and end_lon is not None:
                e_lat = float(end_lat)
                e_lon = float(end_lon)
                if not (-90.0 <= e_lat <= 90.0) or not (-180.0 <= e_lon <= 180.0):
                    return ValidationResult(False, f"End coordinates out of bounds: ({e_lat}, {e_lon})")

            swath = float(swath_range_m) if swath_range_m is not None else 50.0
            if swath <= 0.0 or swath > 5000.0:
                return ValidationResult(False, f"Unrealistic swath range: {swath}m")

            return ValidationResult(
                True,
                "Geospatial navigation validated",
                {"start_lat": s_lat, "start_lon": s_lon, "swath_range_m": swath}
            )
        except (ValueError, TypeError) as e:
            return ValidationResult(False, f"Non-numeric coordinate: {e}")

    @classmethod
    def validate_detection(
        cls,
        detection: Dict[str, Any],
        image_width: int,
        image_height: int,
        min_conf: float = 0.20,
        allowed_classes: Optional[set] = None,
    ) -> ValidationResult:
        """Validates that an individual ML detection meets geometric, taxonomy, and confidence constraints."""
        bbox = detection.get("bbox")
        if not bbox or len(bbox) < 4:
            return ValidationResult(False, "Invalid or missing bounding box")

        x1, y1, x2, y2 = bbox[0], bbox[1], bbox[2], bbox[3]
        if x1 >= x2 or y1 >= y2:
            return ValidationResult(False, f"Degenerate box dimensions: [{x1}, {y1}, {x2}, {y2}]")

        if x1 < 0 or y1 < 0 or x2 > image_width + 5 or y2 > image_height + 5:
            return ValidationResult(False, f"Box exceeds image bounds ({image_width}x{image_height}): {bbox}")

        conf = float(detection.get("confidence", 0.0))
        if conf < min_conf:
            return ValidationResult(False, f"Confidence {conf:.2f} below threshold {min_conf:.2f}")

        cname = detection.get("class_name", detection.get("class", ""))
        if allowed_classes and cname not in allowed_classes:
            return ValidationResult(False, f"Class '{cname}' not recognized in taxonomy")

        # Coordinate check if marked
        lat = detection.get("latitude")
        lon = detection.get("longitude")
        if lat is not None or lon is not None:
            if lat is None or lon is None:
                return ValidationResult(False, "Half-specified coordinate (lat or lon is None)")
            if not (-90.0 <= float(lat) <= 90.0) or not (-180.0 <= float(lon) <= 180.0):
                return ValidationResult(False, f"Detection coordinates out of WGS84 range: ({lat}, {lon})")

        return ValidationResult(True, "Detection validated")
