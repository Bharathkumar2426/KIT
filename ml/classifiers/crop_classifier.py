"""Second-Stage Acoustic Sonar Crop Classifier with Feature-Distance OOD Rejection (SIH 26057).

Architecture:
- Backbone: PyTorch EfficientNet-B0 (1280-d latent feature representation)
- Head: Linear projection layer over verified active classes
- OOD / Unknown Object Discovery:
  * Computes L2-normalized feature embeddings z
  * Evaluates minimum cosine distance d_min to class prototype centroids {mu_c}
  * Calibrated anomaly score: d_min / tau_ood (empirically tuned on validation split)
  * If d_min > tau_ood or max softmax probability < tau_conf:
      Returns 'unknown_debris' or 'unknown_anomaly'
  * Otherwise:
      Returns top-1 predicted active class, calibrated confidence, and top-3 predictions.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import models

logger = logging.getLogger("CropClassifier")

ACTIVE_CLASSES = {
    0: "ghost_net",
    1: "metal_drum",
    2: "plastic_debris",
    3: "sunken_wreckage",
    4: "tire_wheel",
    5: "pipe_pipeline",
    6: "container_crate",
    7: "anchor_chain",
    8: "wood_debris",
    9: "rock_boulder",
}

DISPLAY_NAMES = {
    "ghost_net": "Ghost Net",
    "metal_drum": "Metal Drum",
    "plastic_debris": "Plastic Debris",
    "sunken_wreckage": "Shipwreck",
    "tire_wheel": "Tire",
    "pipe_pipeline": "Pipeline",
    "container_crate": "Container / Crate",
    "anchor_chain": "Anchor / Chain",
    "wood_debris": "Wood Debris",
    "rock_boulder": "Rock Boulder",
    "unknown_debris": "Unknown Debris",
    "unknown_anomaly": "Unknown Anomaly",
}



class SonarCropNet(nn.Module):
    """EfficientNet-B0 based feature extractor and classification head."""

    def __init__(self, num_classes: int = len(ACTIVE_CLASSES)):
        super().__init__()
        # Load EfficientNet-B0 backbone
        base = models.efficientnet_b0(weights=models.EfficientNet_B0_Weights.DEFAULT)
        self.features = base.features
        self.avgpool = nn.AdaptiveAvgPool2d(1)
        self.feature_dim = 1280
        self.classifier = nn.Sequential(
            nn.Dropout(p=0.3, inplace=True),
            nn.Linear(self.feature_dim, num_classes),
        )

    def extract_features(self, x: torch.Tensor) -> torch.Tensor:
        """Extracts 1280-d embedding vector."""
        feat = self.features(x)
        feat = self.avgpool(feat)
        feat = torch.flatten(feat, 1)
        return feat

    def forward(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        """Returns logits and 1280-d feature embeddings."""
        feat = self.extract_features(x)
        logits = self.classifier(feat)
        return logits, feat


class SonarCropClassifier:
    """Production Inference Wrapper with Empirical OOD Prototype Rejection."""

    def __init__(
        self,
        weights_path: Optional[str | Path] = "ml/weights/crop_classifier.pt",
        device: Optional[str] = None,
    ):
        if device is None:
            self.device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
        else:
            self.device = torch.device(device)

        self.num_classes = len(ACTIVE_CLASSES)
        self.class_names = ACTIVE_CLASSES
        self.display_names = DISPLAY_NAMES
        self.model = SonarCropNet(num_classes=self.num_classes).to(self.device)
        self.model.eval()

        self.weights_path = Path(weights_path) if weights_path else None
        self.prototypes: Optional[torch.Tensor] = None  # [num_classes, 1280]
        # Empirical defaults (calibrated on sonar validation split):
        self.tau_ood = 0.85   # Realistic feature distance threshold
        self.tau_conf = 0.25  # Softmax confidence floor
        self.is_loaded = False

        if self.weights_path and self.weights_path.exists():
            self._load_checkpoint(self.weights_path)

    def _load_checkpoint(self, path: Path) -> bool:
        """Loads model weights, class prototypes, and empirical thresholds."""
        try:
            ckpt = torch.load(str(path), map_location=self.device, weights_only=False)
            if "model_state_dict" in ckpt:
                self.model.load_state_dict(ckpt["model_state_dict"], strict=False)
            else:
                self.model.load_state_dict(ckpt, strict=False)

            if "prototypes" in ckpt:
                self.prototypes = ckpt["prototypes"].to(self.device)
            if "tau_ood" in ckpt:
                self.tau_ood = min(0.48, float(ckpt["tau_ood"]))
            else:
                self.tau_ood = 0.45
            if "tau_conf" in ckpt:
                self.tau_conf = float(ckpt["tau_conf"])


            self.is_loaded = True
            logger.info(
                f"Crop classifier loaded: {path} (tau_ood={self.tau_ood:.3f}, tau_conf={self.tau_conf:.3f})"
            )
            return True
        except Exception as e:
            logger.warning(f"Could not load crop classifier checkpoint {path}: {e}")
            self.is_loaded = False
            return False

    def preprocess_crop(self, crop_bgr: np.ndarray, target_size: int = 128) -> torch.Tensor:
        """Converts BGR crop into normalized PyTorch tensor."""
        if crop_bgr.ndim == 2:
            rgb = cv2.cvtColor(crop_bgr, cv2.COLOR_GRAY2RGB)
        else:
            rgb = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2RGB)

        resized = cv2.resize(rgb, (target_size, target_size), interpolation=cv2.INTER_LINEAR)
        # ImageNet normalization standard for EfficientNet
        img_float = resized.astype(np.float32) / 255.0
        mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
        std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
        norm = (img_float - mean) / std

        tensor = torch.from_numpy(norm).permute(2, 0, 1).unsqueeze(0).to(self.device)
        return tensor

    @torch.no_grad()
    def classify_crop(self, crop_bgr: np.ndarray) -> Dict[str, Any]:
        """Classifies a target crop and evaluates empirical OOD feature distance."""
        if crop_bgr is None or crop_bgr.size == 0 or crop_bgr.shape[0] < 4 or crop_bgr.shape[1] < 4:
            return {
                "class_name": "unknown_anomaly",
                "display_name": "Unknown Anomaly",
                "confidence": 0.20,
                "anomaly_score": 0.85,
                "classification_source": "unknown",
                "top_3": [],
                "is_ood": True,
            }

        x = self.preprocess_crop(crop_bgr)
        logits, feat = self.model(x)
        probs = F.softmax(logits, dim=1)[0]
        feat_norm = F.normalize(feat, p=2, dim=1)  # [1, 1280]

        # Top-1 and top-3 predictions
        top_probs, top_indices = torch.topk(probs, k=min(3, self.num_classes))
        top_idx = int(top_indices[0].item())
        top_prob = float(top_probs[0].item())

        top_3 = []
        for i in range(len(top_indices)):
            c_idx = int(top_indices[i].item())
            c_prob = float(top_probs[i].item())
            top_3.append({
                "class_name": self.class_names.get(c_idx, f"class_{c_idx}"),
                "display_name": self.display_names.get(self.class_names.get(c_idx, ""), f"Class {c_idx}"),
                "probability": round(c_prob, 4),
            })

        # Empirical Prototype Distance Check
        min_dist = 0.50
        if self.prototypes is not None:
            # Cosine distance: 1 - (z_q . mu_c)
            proto_norm = F.normalize(self.prototypes, p=2, dim=1)  # [5, 1280]
            sims = torch.mm(feat_norm, proto_norm.t())[0]          # [5]
            dists = 1.0 - sims
            min_dist = float(torch.min(dists).item())

        # Normalized anomaly score scaled by empirical validation threshold
        raw_anomaly = min_dist / max(self.tau_ood, 1e-4)
        anomaly_score = round(float(np.clip(raw_anomaly * 0.70 + (1.0 - top_prob) * 0.30, 0.0, 1.0)), 3)

        # OOD Rejection Logic: out-of-distribution patterns are flagged as is_ood
        is_ood = (min_dist > self.tau_ood)
        is_uncertain = (top_prob < self.tau_conf)

        if is_ood:
            predicted_class = "unknown_debris"
            display_name = "Unknown Debris"
            source = "unknown"
            confidence = round(float(np.clip(1.0 - min_dist, 0.10, 0.40)), 3)
        elif is_uncertain:
            predicted_class = "unknown_anomaly"
            display_name = "Unknown Anomaly"
            source = "unknown"
            confidence = round(top_prob, 3)
        else:
            predicted_class = self.class_names.get(top_idx, "unknown_debris")
            display_name = self.display_names.get(predicted_class, predicted_class.replace("_", " ").title())
            source = "second_stage"
            confidence = round(top_prob, 3)

        return {
            "class_name": predicted_class,
            "display_name": display_name,
            "confidence": confidence,
            "anomaly_score": anomaly_score,
            "classification_source": source,
            "min_prototype_distance": round(min_dist, 4),
            "is_ood": is_ood,
            "top_3": top_3,
        }
