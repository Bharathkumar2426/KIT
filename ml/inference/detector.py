"""Real 2-Stage YOLO + Deep Feature Crop Sonar Object Detection Module (SIH 26057).

Pipeline:
1. Stage 1: YOLOv8 region proposal and candidate localization (with CUDA/CPU auto-detection).
2. Stage 2: Deep feature extraction (EfficientNet-B0) with empirical prototype-distance OOD check.
3. Class-agnostic NMS and coordinate de-letterboxing to native image pixels.
4. Returns:
   - class_name, confidence, bbox [x1, y1, x2, y2], anomaly_score, classification_source.
   - top-3 predictions for transparent uncertainty.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np
import torch
import yaml
from ultralytics import YOLO

from ml.classifiers.crop_classifier import SonarCropClassifier
from ml.preprocessing.sonar_preprocessor import PreprocessedSonarStages, to_png_base64

logger = logging.getLogger("SonarDetector")

DEFAULT_CLASSES_PATH = Path("ml/configs/sonar_classes.yaml")


class SonarObjectDetector:
    """Production 2-Stage Detector for Side-Scan Sonar Imagery."""

    def __init__(
        self,
        weights_path: Optional[str | Path] = None,
        crop_classifier_path: Optional[str | Path] = "ml/weights/crop_classifier.pt",
        config_path: str | Path = DEFAULT_CLASSES_PATH,
        default_conf: float = 0.20,
        default_iou: float = 0.45,
    ):
        self.config_path = Path(config_path)
        self.default_conf = default_conf
        self.default_iou = default_iou
        self.device = "cuda:0" if torch.cuda.is_available() else "cpu"

        # Load taxonomy and palette from config
        self._load_config()

        # Resolve weights path (prioritizes improved sonar_v2.pt)
        self.weights_path = self._resolve_weights_path(weights_path)
        self.model: Optional[YOLO] = None
        self.is_loaded = False
        self.is_sonar_trained = False
        self.model_version = "unloaded"
        self.model_summary = "Initializing..."

        # Load YOLO Stage 1
        self._load_model()

        # Initialize Stage 2 Crop Classifier & OOD Prototype Rejection
        self.crop_classifier = SonarCropClassifier(
            weights_path=crop_classifier_path,
            device=self.device,
        )

    def _load_config(self) -> None:
        """Loads active taxonomy, display properties, and inference defaults."""
        if self.config_path.exists():
            try:
                with open(self.config_path, "r", encoding="utf-8") as f:
                    cfg = yaml.safe_load(f)
                tax = cfg.get("taxonomy", {})
                self.class_taxonomy = tax.get("active_classes", tax.get("classes", {}))
                self.display_names = tax.get("display_names", {})
                self.color_palette = tax.get("color_palette", {})
                self.inference_defaults = cfg.get("inference_defaults", {})
                return
            except Exception as e:
                logger.error(f"Error loading sonar_classes.yaml: {e}")

        # Fallback defaults
        self.class_taxonomy = {
            0: "ghost_net", 1: "metal_drum", 2: "plastic_debris",
            3: "sunken_wreckage", 4: "tire_wheel", 5: "pipe_pipeline",
            6: "container_crate", 7: "anchor_chain", 8: "wood_debris",
            9: "rock_boulder"
        }
        self.display_names = {
            "ghost_net": "Ghost Net", "metal_drum": "Metal Drum",
            "plastic_debris": "Plastic Debris", "sunken_wreckage": "Shipwreck",
            "tire_wheel": "Tire", "pipe_pipeline": "Pipeline",
            "container_crate": "Container / Crate", "anchor_chain": "Anchor / Chain",
            "wood_debris": "Wood Debris", "rock_boulder": "Rock Boulder",
            "unknown_debris": "Unknown Debris", "unknown_anomaly": "Unknown Anomaly"
        }
        self.color_palette = {}
        self.inference_defaults = {"confidence_threshold": 0.20, "iou_threshold": 0.45}


    def _resolve_weights_path(self, explicit_path: Optional[str | Path]) -> Path:
        """Finds the most suitable model weights, prioritizing sonar_v2 then sonar_best."""
        candidates = []
        if explicit_path:
            candidates.append(Path(explicit_path))

        candidates.extend([
            Path("ml/weights/sonar_v2.pt"),
            Path("ml/weights/sonar_best.pt"),
            Path("backend/models/sonar_best.pt"),
            Path("ml/weights/best.pt"),
            Path("yolov8n.pt"),
        ])

        for p in candidates:
            if p.exists():
                return p

        return Path("ml/weights/sonar_v2.pt")

    def _load_model(self) -> bool:
        """Loads YOLO model and determines if it is sonar-trained."""
        if not self.weights_path.exists():
            try:
                logger.warning(
                    f"Weights not found at {self.weights_path}. Loading base yolov8n.pt..."
                )
                self.model = YOLO("yolov8n.pt")
                self.is_loaded = True
                self.is_sonar_trained = False
                self.model_version = "yolov8n-base"
                self.model_summary = "Base YOLOv8 (Uncalibrated)"
                return True
            except Exception as e:
                logger.error(f"Failed to load base YOLO: {e}")
                self.is_loaded = False
                return False

        try:
            self.model = YOLO(str(self.weights_path))
            self.is_loaded = True

            model_classes = self.model.names
            sonar_class_names = set(self.class_taxonomy.values())
            is_sonar = any(c in sonar_class_names for c in model_classes.values())

            self.is_sonar_trained = is_sonar
            self.class_names = model_classes
            if is_sonar:
                self.model_version = f"sonar_{self.weights_path.stem}_2stage"
                self.model_summary = f"Verified 2-Stage Sonar Detector ({self.weights_path.name})"
            else:
                self.model_version = f"base_{self.weights_path.name}"
                self.model_summary = f"Base Weights ({self.weights_path.name})"

            logger.info(
                f"Model loaded: {self.weights_path} (Device: {self.device}, Sonar-Trained: {self.is_sonar_trained})"
            )
            return True
        except Exception as e:
            logger.error(f"Failed to load weights from {self.weights_path}: {e}")
            self.is_loaded = False
            return False

    def predict(
        self,
        stages: PreprocessedSonarStages,
        confidence_threshold: Optional[float] = None,
        iou_threshold: Optional[float] = None,
    ) -> Dict[str, Any]:
        """Runs 2-stage object detection: YOLO localization + crop feature OOD verification."""
        if not self.is_loaded or self.model is None:
            raise RuntimeError("YOLO Sonar model is not loaded.")

        conf = confidence_threshold if confidence_threshold is not None else self.default_conf
        iou = iou_threshold if iou_threshold is not None else self.default_iou

        orig_w, orig_h = stages.original_dims
        scale_r = stages.scale_ratio
        pad_w, pad_h = stages.pad_offsets

        # Sonar Domain Validation: Reject non-sonar images (RGB photos, documents, screenshots)
        if not getattr(stages, "is_sonar", True):
            reason = getattr(stages, "sonar_validation_reason", "Image failed acoustic sonar domain validation")
            logger.info(f"Image rejected by sonar domain validator: {reason}")
            return {
                "detections": [],
                "total_objects": 0,
                "annotated_bgr": stages.original_bgr.copy(),
                "annotated_b64": to_png_base64(stages.original_bgr),
                "model_metadata": {
                    "version": self.model_version,
                    "weights_path": str(self.weights_path),
                    "is_sonar_trained": self.is_sonar_trained,
                    "summary": self.model_summary,
                    "device": self.device,
                    "confidence_threshold": conf,
                    "iou_threshold": iou,
                    "second_stage_active": bool(self.crop_classifier and self.crop_classifier.is_loaded),
                    "validation_status": "REJECTED_NON_SONAR",
                    "validation_reason": reason,
                },
            }

        # Stage 1: Multi-scale candidate region proposals
        # Letterbox pass operates with sensitive proposal threshold (0.010) for deep crop verification
        stage1_conf_lb = 0.010 if (self.crop_classifier and self.crop_classifier.is_loaded) else max(0.15, conf * 0.70)
        stage1_conf_direct = max(0.15, conf * 0.70)

        raw_candidates = []

        # Proposal pass A: Direct enhanced image (preserves fine target resolution)
        try:
            res_direct = self.model.predict(
                source=stages.enhanced_bgr,
                conf=stage1_conf_direct,
                iou=iou,
                device=self.device,
                verbose=False,
            )
            if res_direct and res_direct[0].boxes is not None:
                for b in res_direct[0].boxes:
                    x1, y1, x2, y2 = b.xyxy[0].tolist()
                    raw_candidates.append({
                        "xyxy_orig": [
                            max(0, min(orig_w, int(round(x1)))),
                            max(0, min(orig_h, int(round(y1)))),
                            max(0, min(orig_w, int(round(x2)))),
                            max(0, min(orig_h, int(round(y2)))),
                        ],
                        "conf": float(b.conf[0].item()),
                        "cid": int(b.cls[0].item()),
                    })
        except Exception as e:
            logger.debug(f"Direct proposal pass notice: {e}")

        # Proposal pass B: Letterbox input (catches full-scene contextual objects)
        try:
            res_lb = self.model.predict(
                source=stages.model_input,
                conf=stage1_conf_lb,
                iou=iou,
                device=self.device,
                verbose=False,
            )
            if res_lb and res_lb[0].boxes is not None:
                for b in res_lb[0].boxes:
                    x1_lb, y1_lb, x2_lb, y2_lb = b.xyxy[0].tolist()
                    x1_orig = (x1_lb - pad_w) / scale_r
                    y1_orig = (y1_lb - pad_h) / scale_r
                    x2_orig = (x2_lb - pad_w) / scale_r
                    y2_orig = (y2_lb - pad_h) / scale_r
                    raw_candidates.append({
                        "xyxy_orig": [
                            max(0, min(orig_w, int(round(x1_orig)))),
                            max(0, min(orig_h, int(round(y1_orig)))),
                            max(0, min(orig_w, int(round(x2_orig)))),
                            max(0, min(orig_h, int(round(y2_orig)))),
                        ],
                        "conf": float(b.conf[0].item()),
                        "cid": int(b.cls[0].item()),
                    })
        except Exception as e:
            logger.debug(f"Letterbox proposal pass notice: {e}")

        annotated_canvas = stages.enhanced_bgr.copy()

        palette_defaults = [
            (56, 189, 248),   # Sky Blue
            (16, 185, 129),   # Emerald
            (245, 158, 11),   # Amber
            (239, 68, 68),    # Rose
            (168, 85, 247),   # Purple
            (234, 179, 8),    # Yellow
            (20, 184, 166),   # Teal
            (249, 115, 22),   # Orange
            (180, 83, 9),     # Bronze
            (132, 204, 22),   # Lime
        ]

        # Sort all candidates by confidence descending
        raw_candidates.sort(key=lambda x: x["conf"], reverse=True)

        # Standard IoU NMS in native coordinates (eliminates duplicates without killing neighboring debris)
        def is_duplicate(b1, b2, iou_thresh):
            xa = max(b1[0], b2[0])
            ya = max(b1[1], b2[1])
            xb = min(b1[2], b2[2])
            yb = min(b1[3], b2[3])
            inter = max(0, xb - xa) * max(0, yb - ya)
            if inter <= 0:
                return False
            area1 = (b1[2] - b1[0]) * (b1[3] - b1[1])
            area2 = (b2[2] - b2[0]) * (b2[3] - b2[1])
            union = area1 + area2 - inter
            iou_score = inter / union if union > 0 else 0
            return iou_score > iou_thresh

        filtered_boxes = []
        for item in raw_candidates:
            overlap = False
            for kept in filtered_boxes:
                if is_duplicate(item["xyxy_orig"], kept["xyxy_orig"], iou):
                    overlap = True
                    break
            if not overlap:
                filtered_boxes.append(item)

        detections: List[Dict[str, Any]] = []

        for idx, item in enumerate(filtered_boxes):
            cid = item["cid"]
            stage1_conf_val = item["conf"]
            x1, y1, x2, y2 = item["xyxy_orig"]


            bw = max(1, x2 - x1)
            bh = max(1, y2 - y1)

            # Filter edge border margin artifacts (sub-16px thin strips touching image outer boundaries)
            if (y1 <= 2 and bh < 16) or (x1 <= 2 and bw < 16) or (y2 >= orig_h - 2 and bh < 16) or (x2 >= orig_w - 2 and bw < 16):
                continue

            area = bw * bh
            cx = round(x1 + (bw / 2.0), 1)
            cy = round(y1 + (bh / 2.0), 1)

            # Stage 2: Extract target crop with 10% context padding for shadow evaluation
            pad_cx = int(bw * 0.10)
            pad_cy = int(bh * 0.10)
            crop_x1 = max(0, x1 - pad_cx)
            crop_y1 = max(0, y1 - pad_cy)
            crop_x2 = min(orig_w, x2 + pad_cx)
            crop_y2 = min(orig_h, y2 + pad_cy)

            # Extract from original_bgr to preserve natural acoustic distribution
            crop_region = stages.original_bgr[crop_y1:crop_y2, crop_x1:crop_x2]

            # Resolve Stage 1 class name and display name
            raw_cname = self.class_names.get(cid, self.class_taxonomy.get(cid, f"debris_{cid}"))
            yolo_cname = raw_cname
            yolo_display = self.display_names.get(raw_cname, raw_cname.replace("_", " ").title())

            # Stage 2 Deep Crop Classification & Empirical OOD Check
            if self.crop_classifier and self.crop_classifier.is_loaded and crop_region.size > 0:
                stage2_res = self.crop_classifier.classify_crop(crop_region)
                stage2_cname = stage2_res["class_name"]
                stage2_conf = stage2_res["confidence"]
                anomaly_score = stage2_res["anomaly_score"]
                source = stage2_res["classification_source"]
                top_3 = stage2_res.get("top_3", [])
                is_ood = stage2_res.get("is_ood", False)

                # Rejection rule:
                # If Stage 2 marks it as OOD / unknown anomaly and YOLO candidate confidence is weak,
                # this is acoustic background noise or artifact -> REJECT CANDIDATE
                if is_ood and stage1_conf_val < 0.60:
                    continue  # Candidate rejected by Stage 2 verification

                if stage2_cname in ("unknown_debris", "unknown_anomaly"):
                    if stage1_conf_val >= 0.20:
                        class_name = yolo_cname
                        display_name = yolo_display
                        final_conf = round(float(stage1_conf_val), 3)
                        source = "detector_fused"
                        anomaly_score = round(float(np.clip(1.0 - stage1_conf_val, 0.05, 0.40)), 3)
                    elif not is_ood and stage2_conf >= conf:
                        class_name = stage2_cname
                        display_name = stage2_res["display_name"]
                        final_conf = round(float(stage2_conf), 3)
                    else:
                        continue
                else:
                    # Stage 2 predicted a recognized active ocean debris class
                    if stage2_cname == yolo_cname or (stage2_conf >= 0.70 and not is_ood):
                        # Strong consensus between YOLO and Crop Classifier or highly confident Stage 2 target
                        class_name = stage2_cname if stage2_conf > stage1_conf_val else yolo_cname
                        display_name = self.display_names.get(class_name, class_name.replace("_", " ").title())
                        final_conf = round(float(max(stage1_conf_val, stage2_conf)), 3)
                    elif stage1_conf_val >= conf:
                        # YOLO was independently confident (>= conf)
                        class_name = yolo_cname
                        display_name = yolo_display
                        final_conf = round(float(stage1_conf_val), 3)
                    else:
                        # Weak proposal (< conf) with class disagreement -> reject candidate
                        continue
            else:
                class_name = yolo_cname
                display_name = yolo_display
                final_conf = round(stage1_conf_val, 3)
                anomaly_score = round(float(np.clip(1.0 - stage1_conf_val, 0.0, 1.0)), 3)
                source = "detector"
                top_3 = []


            # Filter candidate detections by final calibrated confidence threshold
            if final_conf < conf:
                continue

            # Determine anomaly classification
            anomaly_type = "KNOWN_OBJECT" if anomaly_score < 0.50 else "UNCLASSIFIED_ANOMALY"

            det_item = {
                "id": idx + 1,
                "class_name": class_name,
                "class": class_name,
                "display_name": display_name,
                "confidence": final_conf,
                "bbox": [x1, y1, x2, y2],
                "bbox_coords": {
                    "x": x1,
                    "y": y1,
                    "width": bw,
                    "height": bh,
                },
                "center": {
                    "x": cx,
                    "y": cy,
                },
                "area": area,
                "anomaly_score": anomaly_score,
                "classification_source": source,
                "anomaly_type": anomaly_type,
                "top_3": top_3,
            }
            detections.append(det_item)

            # Draw HUD overlay with class color (convert RGB config to BGR for OpenCV)
            rgb_col = self.color_palette.get(class_name, palette_defaults[cid % len(palette_defaults)])
            color_bgr = (int(rgb_col[2]), int(rgb_col[1]), int(rgb_col[0]))
            thickness = max(2, int(round(min(orig_w, orig_h) / 350.0)))
            cv2.rectangle(annotated_canvas, (x1, y1), (x2, y2), color_bgr, thickness)

            # Label banner: <class_name> <conf> (e.g. metal_drum 0.91)
            label_text = f"{class_name} {final_conf:.2f}"
            font_scale = max(0.44, min(orig_w, orig_h) / 1000.0)
            (text_w, text_h), baseline = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_SIMPLEX, font_scale, 1)

            banner_y1 = max(0, y1 - text_h - 8)
            banner_y2 = y1
            cv2.rectangle(annotated_canvas, (x1, banner_y1), (x1 + text_w + 10, banner_y2), color_bgr, -1)
            cv2.putText(
                annotated_canvas,
                label_text,
                (x1 + 5, banner_y2 - 4),
                cv2.FONT_HERSHEY_SIMPLEX,
                font_scale,
                (255, 255, 255),
                1,
                cv2.LINE_AA,
            )

        annotated_b64 = to_png_base64(annotated_canvas)

        return {
            "detections": detections,
            "total_objects": len(detections),
            "annotated_bgr": annotated_canvas,
            "annotated_b64": annotated_b64,
            "model_metadata": {
                "version": self.model_version,
                "weights_path": str(self.weights_path),
                "is_sonar_trained": self.is_sonar_trained,
                "summary": self.model_summary,
                "device": self.device,
                "confidence_threshold": conf,
                "iou_threshold": iou,
                "second_stage_active": bool(self.crop_classifier and self.crop_classifier.is_loaded),
                "tau_ood": getattr(self.crop_classifier, "tau_ood", None),
            },
        }
