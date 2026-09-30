"""Side-Scan Sonar Model Evaluation Harness (SIH 26057).

Key Features:
- Evaluates on the untouched, completely independent TEST split.
- Direct side-by-side comparative evaluation of baseline (sonar_best.pt) vs improved (sonar_v2.pt).
- Calculates per-class:
  * Precision
  * Recall
  * F1 Score
  * mAP@50
  * mAP@50-95
  * Confusion Matrix
- Fixes test/labels directory path resolution.
- Generates side-by-side Ground Truth vs Prediction visual charts.
- Saves report to ml/evaluation_results/independent_test_comparison.json.
"""

from __future__ import annotations

import argparse
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

import cv2
import numpy as np
import torch
import yaml
from ultralytics import YOLO

logger = logging.getLogger("SonarEval")

ACTIVE_CLASSES = {
    0: "ghost_net",
    1: "metal_drum",
    2: "plastic_debris",
    3: "sunken_wreckage",
    4: "tire_wheel",
}


def draw_boxes_on_image(
    image: np.ndarray,
    boxes: List[List[float]],
    labels: List[str],
    color: tuple = (0, 255, 0),
    title: str = "",
) -> np.ndarray:
    """Draws bounding boxes and labels on an image canvas."""
    canvas = image.copy()
    h, w = canvas.shape[:2]

    if title:
        cv2.putText(canvas, title, (20, 35), cv2.FONT_HERSHEY_SIMPLEX, 0.85, (255, 255, 255), 2)

    for box, label in zip(boxes, labels):
        x1, y1, x2, y2 = [int(round(v)) for v in box]
        x1 = max(0, min(w, x1))
        y1 = max(0, min(h, y1))
        x2 = max(0, min(w, x2))
        y2 = max(0, min(h, y2))

        cv2.rectangle(canvas, (x1, y1), (x2, y2), color, 2)
        (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
        cv2.rectangle(canvas, (x1, max(0, y1 - 20)), (x1 + tw + 6, y1), color, -1)
        cv2.putText(
            canvas, label, (x1 + 3, y1 - 5),
            cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 0), 1, cv2.LINE_AA
        )

    return canvas


def evaluate_single_model(
    model_path: Path,
    data_yaml: Path,
    output_dir: Path,
    split: str = "test",
    device: str = "cpu",
    conf_threshold: float = 0.25,
    iou_threshold: float = 0.45,
) -> Dict[str, Any]:
    """Runs rigorous validation on a split for a single model checkpoint."""
    model = YOLO(str(model_path))

    metrics = model.val(
        data=str(data_yaml.resolve()),
        split=split,
        device=device,
        conf=conf_threshold,
        iou=iou_threshold,
        save_json=True,
        project=str(output_dir),
        name=f"eval_{model_path.stem}",
        exist_ok=True,
        verbose=False,
    )

    mAP50 = float(metrics.box.map50)
    mAP50_95 = float(metrics.box.map)
    mp = float(metrics.box.mp)
    mr = float(metrics.box.mr)
    f1 = 2 * (mp * mr) / (mp + mr) if (mp + mr) > 0 else 0.0

    per_class_results = {}
    class_names = model.names
    for idx, name in class_names.items():
        if idx < len(metrics.box.maps):
            p = float(metrics.box.p[idx]) if hasattr(metrics.box, "p") and idx < len(metrics.box.p) else 0.0
            r = float(metrics.box.r[idx]) if hasattr(metrics.box, "r") and idx < len(metrics.box.r) else 0.0
            c_f1 = 2 * (p * r) / (p + r) if (p + r) > 0 else 0.0
            per_class_results[name] = {
                "class_id": idx,
                "precision": round(p, 4),
                "recall": round(r, 4),
                "f1": round(c_f1, 4),
                "mAP50": round(float(metrics.box.maps[idx]), 4),
            }

    return {
        "model": model_path.name,
        "weights_path": str(model_path),
        "split_evaluated": split,
        "overall_metrics": {
            "precision": round(mp, 4),
            "recall": round(mr, 4),
            "f1_score": round(f1, 4),
            "mAP50": round(mAP50, 4),
            "mAP50_95": round(mAP50_95, 4),
        },
        "per_class": per_class_results,
    }


def compare_models_on_test_split(
    baseline_path: str | Path = "ml/weights/sonar_best.pt",
    improved_path: str | Path = "ml/weights/sonar_v2.pt",
    data_yaml: str | Path = "data/dataset/sonar_data.yaml",
    output_dir: str | Path = "ml/evaluation_results",
    device: Optional[str] = None,
    conf_threshold: float = 0.25,
    iou_threshold: float = 0.45,
) -> Dict[str, Any]:
    """Evaluates both models on the independent test split and computes comparative metrics."""
    b_path = Path(baseline_path)
    i_path = Path(improved_path)
    yaml_path = Path(data_yaml)
    out_dir = Path(output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    if device is None:
        device = "0" if torch.cuda.is_available() else "cpu"

    print("=" * 75)
    print("INDEPENDENT TEST SET EVALUATION & BENCHMARK COMPARISON (SIH 26057)")
    print("=" * 75)
    print(f"Dataset Config : {yaml_path}")
    print(f"Split          : TEST (Strictly Untouched)")
    print(f"Device         : {device}")

    results = {}

    if b_path.exists():
        print(f"\n[1/3] Evaluating Baseline Model: {b_path.name}...")
        results["baseline"] = evaluate_single_model(
            b_path, yaml_path, out_dir, split="test", device=device,
            conf_threshold=conf_threshold, iou_threshold=iou_threshold
        )
        print(f"  • Baseline mAP50: {results['baseline']['overall_metrics']['mAP50']:.4f}")
        print(f"  • Baseline Precision: {results['baseline']['overall_metrics']['precision']:.4f}")
        print(f"  • Baseline Recall: {results['baseline']['overall_metrics']['recall']:.4f}")
    else:
        print(f"Notice: Baseline {b_path} not found.")

    if i_path.exists():
        print(f"\n[2/3] Evaluating Improved Model: {i_path.name}...")
        results["improved_v2"] = evaluate_single_model(
            i_path, yaml_path, out_dir, split="test", device=device,
            conf_threshold=conf_threshold, iou_threshold=iou_threshold
        )
        print(f"  • Improved v2 mAP50: {results['improved_v2']['overall_metrics']['mAP50']:.4f}")
        print(f"  • Improved v2 Precision: {results['improved_v2']['overall_metrics']['precision']:.4f}")
        print(f"  • Improved v2 Recall: {results['improved_v2']['overall_metrics']['recall']:.4f}")
    else:
        print(f"Notice: Improved model {i_path} not found.")

    # Generate Visual Ground Truth vs Prediction Comparison on Test Images
    print("\n[3/3] Generating Ground Truth vs Prediction Visual Comparison Charts...")
    test_img_dir = yaml_path.parent / "test" / "images"
    test_lbl_dir = yaml_path.parent / "test" / "labels"

    if test_img_dir.exists() and test_lbl_dir.exists() and i_path.exists():
        eval_model = YOLO(str(i_path))
        test_images = list(test_img_dir.glob("*.png")) + list(test_img_dir.glob("*.jpg"))
        visuals_created = 0

        for img_p in test_images[:5]:
            img_bgr = cv2.imread(str(img_p))
            if img_bgr is None:
                continue
            h, w = img_bgr.shape[:2]

            # Ground Truth
            gt_lbl_p = test_lbl_dir / f"{img_p.stem}.txt"
            gt_boxes = []
            gt_labels = []
            if gt_lbl_p.exists():
                for line in gt_lbl_p.read_text(encoding="utf-8").splitlines():
                    p = line.strip().split()
                    if len(p) == 5:
                        cid = int(p[0])
                        cx, cy, bw, bh = [float(v) for v in p[1:]]
                        x1 = (cx - bw / 2.0) * w
                        y1 = (cy - bh / 2.0) * h
                        x2 = (cx + bw / 2.0) * w
                        y2 = (cy + bh / 2.0) * h
                        cname = ACTIVE_CLASSES.get(cid, str(cid))
                        gt_boxes.append([x1, y1, x2, y2])
                        gt_labels.append(f"GT: {cname.upper()}")

            # Prediction
            preds = eval_model.predict(source=img_bgr, conf=conf_threshold, iou=iou_threshold, device=device, verbose=False)
            pred_boxes = []
            pred_labels = []
            pred_list = list(preds) if preds is not None else []
            first_pred = pred_list[0] if pred_list else None
            p_boxes = getattr(first_pred, "boxes", None)
            if p_boxes is not None:
                for box in p_boxes:
                    cid = int(box.cls[0].item())
                    score = float(box.conf[0].item())
                    x1, y1, x2, y2 = box.xyxy[0].tolist()
                    cname = ACTIVE_CLASSES.get(cid, str(cid))
                    pred_boxes.append([x1, y1, x2, y2])
                    pred_labels.append(f"PRED: {cname.upper()} {score*100:.1f}%")

            gt_canvas = draw_boxes_on_image(img_bgr, gt_boxes, gt_labels, color=(0, 255, 0), title="GROUND TRUTH")
            pred_canvas = draw_boxes_on_image(img_bgr, pred_boxes, pred_labels, color=(0, 165, 255), title="V2 PREDICTION")
            comparison = np.hstack([gt_canvas, pred_canvas])
            comp_path = out_dir / f"test_gt_vs_pred_{img_p.stem}.png"
            cv2.imwrite(str(comp_path), comparison)
            visuals_created += 1

        print(f"  • Generated {visuals_created} visual side-by-side comparison charts.")

    # Save comparative JSON
    comparison_file = out_dir / "independent_test_comparison.json"
    comparison_file.write_text(json.dumps(results, indent=2), encoding="utf-8")
    print(f"\n[OK] Independent test comparison report saved to: {comparison_file}")
    print("=" * 75)

    return results


# Backward compatibility alias
evaluate_sonar_model = compare_models_on_test_split



def main():
    parser = argparse.ArgumentParser(description="Evaluate Sonar Detection Models on Independent Test Split")
    parser.add_argument("--baseline", default="ml/weights/sonar_best.pt", help="Baseline weights")
    parser.add_argument("--improved", default="ml/weights/sonar_v2.pt", help="Improved weights")
    parser.add_argument("--data", default="data/dataset/sonar_data.yaml", help="Dataset YAML")
    parser.add_argument("--output", default="ml/evaluation_results", help="Output directory")
    parser.add_argument("--conf", type=float, default=0.25, help="Confidence threshold")
    parser.add_argument("--iou", type=float, default=0.45, help="IoU threshold")
    args = parser.parse_args()

    compare_models_on_test_split(
        baseline_path=args.baseline,
        improved_path=args.improved,
        data_yaml=args.data,
        output_dir=args.output,
        conf_threshold=args.conf,
        iou_threshold=args.iou,
    )


if __name__ == "__main__":
    main()
