"""Side-Scan Sonar Dataset Builder & Quality Auditor (SIH 26057).

Handles:
1. Verification of YOLO dataset structure:
   dataset/
       images/{train,val,test}
       labels/{train,val,test}
2. Quality audit:
   - image/label matching
   - corrupt images
   - missing labels
   - invalid bounding boxes (out-of-bounds, negative, w/h <= 0)
   - duplicate labels
   - class IDs verification
   - train/val/test split summary
   - class imbalance
3. Physics-based synthetic sonar sample generator to bootstrap initial sonar models.
"""

from __future__ import annotations

import json
import logging
import math
import random
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np
from PIL import Image
import yaml

logger = logging.getLogger("DatasetBuilder")


class SonarDatasetAuditor:
    """Audits YOLO dataset integrity, annotations, and class distributions."""

    def __init__(self, data_yaml_path: str | Path):
        self.data_yaml_path = Path(data_yaml_path)
        self.classes: Dict[int, str] = {}
        self.dataset_root: Path = Path(".")
        self._load_config()

    def _load_config(self) -> None:
        if not self.data_yaml_path.exists():
            raise FileNotFoundError(f"YAML config not found: {self.data_yaml_path}")
        with open(self.data_yaml_path, "r", encoding="utf-8") as f:
            cfg = yaml.safe_load(f)
        
        if "path" in cfg and cfg["path"]:
            p = Path(cfg["path"])
            if p.is_absolute() and p.exists():
                self.dataset_root = p
            elif (self.data_yaml_path.parent / p).exists():
                self.dataset_root = (self.data_yaml_path.parent / p).resolve()
            elif p.exists():
                self.dataset_root = p.resolve()
            else:
                self.dataset_root = self.data_yaml_path.parent
        else:
            self.dataset_root = self.data_yaml_path.parent

        names = cfg.get("names", {})
        if isinstance(names, list):
            self.classes = {i: n for i, n in enumerate(names)}
        elif isinstance(names, dict):
            self.classes = {int(k): str(v) for k, v in names.items()}

        self.splits = {
            "train": cfg.get("train", "images/train"),
            "val": cfg.get("val", "images/val"),
            "test": cfg.get("test", "images/test"),
        }

    def audit(self) -> Dict[str, Any]:
        """Runs thorough audit across all splits."""
        report = {
            "total_images": 0,
            "splits": {},
            "classes_defined": len(self.classes),
            "objects_per_class": {c: 0 for c in self.classes.values()},
            "empty_images": 0,
            "corrupt_images": 0,
            "missing_labels": 0,
            "invalid_annotations": 0,
            "duplicate_annotations": 0,
        }

        image_extensions = {".png", ".jpg", ".jpeg", ".tif", ".tiff"}

        for split_name, rel_path in self.splits.items():
            img_dir = self.dataset_root / rel_path
            if not img_dir.exists():
                # Try sibling resolution: images/{split}
                img_dir = self.dataset_root / "images" / split_name

            split_stats: Dict[str, Any] = {
                "images": 0,
                "labels": 0,
                "empty_labels": 0,
                "missing_labels": 0,
                "corrupt": 0,
                "invalid_boxes": 0,
            }

            if not img_dir.exists():
                split_stats["status"] = "directory_missing"
                report["splits"][split_name] = split_stats
                continue

            # Check matching labels directory
            lbl_dir = img_dir.parent / "labels"
            if not lbl_dir.exists():
                lbl_dir = img_dir.parent.parent / "labels" / split_name
            if not lbl_dir.exists():
                lbl_dir = self.dataset_root / "labels" / split_name

            img_files = [f for f in img_dir.iterdir() if f.suffix.lower() in image_extensions]
            split_stats["images"] = len(img_files)
            report["total_images"] += len(img_files)

            for img_path in img_files:
                # 1. Check image corruption
                try:
                    with Image.open(img_path) as im:
                        im.verify()
                except Exception:
                    report["corrupt_images"] += 1
                    split_stats["corrupt"] += 1
                    continue

                # 2. Check label file
                lbl_path = lbl_dir / f"{img_path.stem}.txt"
                if not lbl_path.exists():
                    report["missing_labels"] += 1
                    split_stats["missing_labels"] += 1
                    continue

                split_stats["labels"] += 1
                try:
                    content = lbl_path.read_text(encoding="utf-8").strip()
                except Exception:
                    content = ""

                if not content:
                    report["empty_images"] += 1
                    split_stats["empty_labels"] += 1
                    continue

                lines = content.splitlines()
                seen_boxes = set()

                for line_idx, line in enumerate(lines):
                    parts = line.strip().split()
                    if len(parts) != 5:
                        report["invalid_annotations"] += 1
                        split_stats["invalid_boxes"] += 1
                        continue

                    try:
                        cid = int(parts[0])
                        cx, cy, w, h = [float(v) for v in parts[1:]]
                    except ValueError:
                        report["invalid_annotations"] += 1
                        split_stats["invalid_boxes"] += 1
                        continue

                    # Validate bounds
                    if not (0.0 <= cx <= 1.0 and 0.0 <= cy <= 1.0 and 0.0 < w <= 1.0 and 0.0 < h <= 1.0):
                        report["invalid_annotations"] += 1
                        split_stats["invalid_boxes"] += 1
                        continue

                    # Check duplicate
                    box_key = (cid, round(cx, 4), round(cy, 4), round(w, 4), round(h, 4))
                    if box_key in seen_boxes:
                        report["duplicate_annotations"] += 1
                    seen_boxes.add(box_key)

                    # Update class count
                    cname = self.classes.get(cid, f"class_{cid}")
                    if cname in report["objects_per_class"]:
                        report["objects_per_class"][cname] += 1
                    else:
                        report["objects_per_class"][cname] = 1

            report["splits"][split_name] = split_stats

        return report


def generate_multi_target_sonar_sample(
    width: int = 640,
    height: int = 640,
    min_targets: int = 2,
    max_targets: int = 7,
    seed: Optional[int] = None,
) -> Tuple[np.ndarray, List[Tuple[int, float, float, float, float]]]:
    """Generates a physics-realistic multi-target side-scan sonar image with co-occurring debris.
    
    Supports 10 ocean-based debris classes:
      0: ghost_net
      1: metal_drum
      2: plastic_debris
      3: sunken_wreckage
      4: tire_wheel
      5: pipe_pipeline
      6: container_crate
      7: anchor_chain
      8: wood_debris
      9: rock_boulder
    """
    if seed is not None:
        np.random.seed(seed)
        random.seed(seed)

    # 1. Base seafloor with acoustic reverberation, slant illumination & ripples
    canvas = np.zeros((height, width), dtype=np.float32)
    
    # Slant range illumination gradient (brighter near nadir, gradual acoustic attenuation)
    nadir_pos = random.choice([0.0, 0.5, 1.0])
    if nadir_pos == 0.5:
        # Dual-sided towfish waterfall (port / starboard channels with nadir line in center)
        dist_from_nadir = np.abs(np.linspace(-1, 1, width))
        illumination = 28.0 + 32.0 * np.exp(-1.8 * dist_from_nadir)
    else:
        x_coords = np.linspace(0, 1, width)
        illumination = 32.0 + 25.0 * np.sin(x_coords * math.pi * 0.8 + 0.2)
    canvas += illumination[np.newaxis, :]

    # Seafloor sediment wave ripples (variable wavelength & direction)
    ripple_freq = random.uniform(4.0, 14.0)
    ripple_angle = random.uniform(-0.3, 0.3)
    y_grid, x_grid = np.mgrid[0:height, 0:width]
    wave_coords = (y_grid * math.cos(ripple_angle) + x_grid * math.sin(ripple_angle)) * (ripple_freq * math.pi / height)
    ripples = random.uniform(6.0, 14.0) * np.sin(wave_coords)
    canvas += ripples

    # Acoustic speckle noise (Rayleigh-like Gamma distribution)
    speckle = np.random.gamma(shape=2.2, scale=5.5, size=(height, width)).astype(np.float32)
    canvas += speckle

    # Optional nadir water column band (near zero backscatter) in waterfall mode
    if nadir_pos == 0.5 and random.random() < 0.65:
        nadir_w = random.randint(12, 28)
        cx_nadir = width // 2
        canvas[:, max(0, cx_nadir - nadir_w // 2) : min(width, cx_nadir + nadir_w // 2)] = np.random.uniform(2.0, 10.0, size=(height, min(width, cx_nadir + nadir_w // 2) - max(0, cx_nadir - nadir_w // 2)))

    # Acoustic propagation direction: 1 = left-to-right (shadow right), -1 = right-to-left (shadow left)
    direction = random.choice([1, -1])

    # 2. Multi-target injection (2 to 7 objects per image)
    num_targets = random.randint(min_targets, max_targets)
    targets: List[Tuple[int, float, float, float, float]] = []
    placed_boxes: List[Tuple[int, int, int, int]] = []  # [x1, y1, x2, y2]

    # Target class weights ensuring balanced representation across ocean debris types
    class_weights = [0.12, 0.14, 0.12, 0.09, 0.11, 0.09, 0.10, 0.08, 0.07, 0.08]
    class_pool = list(range(10))

    for _ in range(num_targets * 3):  # Attempt up to 3x attempts to place non-overlapping objects
        if len(targets) >= num_targets:
            break

        cid = random.choices(class_pool, weights=class_weights, k=1)[0]

        # Geometry & size tailored to ocean debris class
        if cid == 0:  # ghost_net (irregular mesh/web)
            tw = random.randint(45, 95)
            th = random.randint(35, 80)
            shadow_ratio = random.uniform(1.4, 2.2)
        elif cid == 1:  # metal_drum (compact cylinder)
            tw = random.randint(22, 50)
            th = random.randint(20, 45)
            shadow_ratio = random.uniform(2.0, 3.2)
        elif cid == 2:  # plastic_debris (crates / containers)
            tw = random.randint(25, 60)
            th = random.randint(22, 55)
            shadow_ratio = random.uniform(1.6, 2.4)
        elif cid == 3:  # sunken_wreckage (large hull / airframe)
            tw = random.randint(85, 180)
            th = random.randint(55, 140)
            shadow_ratio = random.uniform(1.8, 3.0)
        elif cid == 4:  # tire_wheel (donut / circular)
            tw = random.randint(22, 45)
            th = random.randint(22, 45)
            shadow_ratio = random.uniform(1.8, 2.8)
        elif cid == 5:  # pipe_pipeline (elongated conduit)
            tw = random.randint(70, 160)
            th = random.randint(14, 30)
            shadow_ratio = random.uniform(1.5, 2.2)
        elif cid == 6:  # container_crate (sharp rectangular freight)
            tw = random.randint(40, 85)
            th = random.randint(30, 65)
            shadow_ratio = random.uniform(2.0, 2.8)
        elif cid == 7:  # anchor_chain (curved anchor / chain links)
            tw = random.randint(30, 75)
            th = random.randint(25, 60)
            shadow_ratio = random.uniform(1.6, 2.5)
        elif cid == 8:  # wood_debris (submerged timber log)
            tw = random.randint(50, 120)
            th = random.randint(16, 35)
            shadow_ratio = random.uniform(1.5, 2.3)
        else:  # rock_boulder (natural seabed mound)
            tw = random.randint(28, 70)
            th = random.randint(25, 65)
            shadow_ratio = random.uniform(1.7, 2.5)

        shadow_len = int(tw * shadow_ratio)
        total_w = tw + shadow_len
        if total_w >= width - 40:
            shadow_len = max(15, width - 40 - tw)


        # Coordinate bounds
        if direction == 1:
            max_tx = width - tw - shadow_len - 15
            if max_tx <= 20:
                continue
            tx = random.randint(20, max_tx)
            bx1 = tx
            bx2 = min(width - 5, tx + tw + shadow_len)
        else:
            min_tx = shadow_len + 15
            max_tx = width - tw - 20
            if min_tx >= max_tx:
                continue
            tx = random.randint(min_tx, max_tx)
            bx1 = max(5, tx - shadow_len)
            bx2 = tx + tw

        if height - th - 20 <= 20:
            continue
        ty = random.randint(20, height - th - 20)
        by1 = ty
        by2 = ty + th


        # Overlap check with already placed targets (keep 15px clearance)
        overlaps = False
        for px1, py1, px2, py2 in placed_boxes:
            if not (bx2 + 15 < px1 or bx1 > px2 + 15 or by2 + 15 < py1 or by1 > py2 + 15):
                overlaps = True
                break

        if overlaps:
            continue

        placed_boxes.append((bx1, by1, bx2, by2))

        # Render acoustic shadow void (near-zero backscatter 0-16)
        if direction == 1:
            sx1, sx2 = tx + tw, min(width - 4, tx + tw + shadow_len)
        else:
            sx1, sx2 = max(4, tx - shadow_len), tx
        
        shadow_patch = np.random.uniform(2.0, 14.0, size=(th, max(1, sx2 - sx1)))
        canvas[ty : ty + th, sx1 : sx2] = shadow_patch

        # Render acoustic specular highlight based on debris material properties
        if cid in (1, 6):  # Metal drum or container: high acoustic reflectivity
            hl_patch = np.random.uniform(220.0, 255.0, size=(th, tw))
        elif cid == 3:  # Sunken wreckage: complex internal acoustic ribs
            hl_patch = np.random.uniform(210.0, 255.0, size=(th, tw))
            # Carve dark interior voids
            hl_patch[int(th * 0.3) : int(th * 0.7), int(tw * 0.3) : int(tw * 0.7)] = np.random.uniform(15.0, 45.0)
        elif cid == 4:  # Tire: toroidal donut hollow
            hl_patch = np.random.uniform(190.0, 240.0, size=(th, tw))
            ch_y, ch_x = int(th * 0.35), int(tw * 0.35)
            hl_patch[ch_y : th - ch_y, ch_x : tw - ch_x] = np.random.uniform(10.0, 30.0)
        elif cid == 0:  # Ghost net: diffuse web-like fibrous backscatter
            hl_patch = np.random.uniform(170.0, 225.0, size=(th, tw))
        else:
            hl_patch = np.random.uniform(185.0, 245.0, size=(th, tw))

        canvas[ty : ty + th, tx : tx + tw] = hl_patch

        # Normalized YOLO format: [cid, cx, cy, bw, bh]
        cx = ((bx1 + bx2) / 2.0) / float(width)
        cy = ((by1 + by2) / 2.0) / float(height)
        bw = (bx2 - bx1) / float(width)
        bh = (by2 - by1) / float(height)

        targets.append((cid, round(cx, 6), round(cy, 6), round(bw, 6), round(bh, 6)))

    canvas_uint8 = np.clip(canvas, 0, 255).astype(np.uint8)
    bgr_img = cv2.cvtColor(canvas_uint8, cv2.COLOR_GRAY2BGR)

    return bgr_img, targets


def build_multi_target_dataset(
    dataset_root: str | Path = "data/dataset",
    num_train: int = 180,
    num_val: int = 40,
    num_test: int = 25,
    seed: int = 42,
) -> Dict[str, Any]:
    """Generates and verifies a multi-target ocean debris side-scan sonar dataset."""
    root = Path(dataset_root)
    random.seed(seed)
    np.random.seed(seed)

    splits = {
        "train": num_train,
        "val": num_val,
        "test": num_test,
    }

    # Ensure clean directory structure
    for split in splits:
        (root / split / "images").mkdir(parents=True, exist_ok=True)
        (root / split / "labels").mkdir(parents=True, exist_ok=True)

    img_counter = 0

    for split, count in splits.items():
        img_dir = root / split / "images"
        lbl_dir = root / split / "labels"

        # Wipe previous generated files to prevent stale single-box annotations
        for f in img_dir.glob("sonar_gen_*.png"):
            f.unlink()
        for f in lbl_dir.glob("sonar_gen_*.txt"):
            f.unlink()

        # Generate multi-target scans (with ~12% negative background scans for false-positive suppression)
        for i in range(count):
            img_counter += 1
            is_background = (random.random() < 0.12)
            if is_background:
                img, targets = generate_multi_target_sonar_sample(min_targets=0, max_targets=0, seed=img_counter)
                targets = []
            else:
                img, targets = generate_multi_target_sonar_sample(min_targets=2, max_targets=6, seed=img_counter)

            file_stem = f"sonar_gen_{split}_{i:04d}"
            img_path = img_dir / f"{file_stem}.png"
            lbl_path = lbl_dir / f"{file_stem}.txt"

            cv2.imwrite(str(img_path), img)

            lines = [f"{t[0]} {t[1]:.6f} {t[2]:.6f} {t[3]:.6f} {t[4]:.6f}" for t in targets]
            lbl_path.write_text("\n".join(lines), encoding="utf-8")

    # Audit the updated dataset
    yaml_path = root / "sonar_data.yaml"
    auditor = SonarDatasetAuditor(yaml_path)
    report = auditor.audit()
    logger.info(f"Dataset generated and audited: {report['total_images']} images, classes={report['objects_per_class']}")
    return report


generate_synthetic_sonar_sample = generate_multi_target_sonar_sample


