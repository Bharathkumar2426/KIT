"""Training Script for Second-Stage Acoustic Crop Classifier (SIH 26057).

Pipeline:
1. Extracts acoustic target crops from cleaned train split using ground-truth boxes.
2. Extracts validation crops for empirical threshold calibration (test split is untouched).
3. Applies inverse class frequency weighting to handle class imbalance.
4. Trains SonarCropNet with PyTorch AdamW and Cosine Annealing LR.
5. Computes class centroid feature prototypes {mu_c} on training embeddings.
6. Empirically determines tau_ood as the 95th percentile distance on validation crops.
7. Saves weights, prototypes, and calibrated thresholds to ml/weights/crop_classifier.pt.
"""

from __future__ import annotations

import argparse
import json
import logging
from pathlib import Path
from typing import List, Tuple

import cv2
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import DataLoader, Dataset

from ml.classifiers.crop_classifier import ACTIVE_CLASSES, SonarCropNet

logger = logging.getLogger("TrainCropClassifier")


class SonarCropDataset(Dataset):
    """Loads target crops from image/label directories."""

    def __init__(self, crops: List[Tuple[np.ndarray, int]], target_size: int = 128):
        self.crops = crops
        self.target_size = target_size
        self.mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
        self.std = np.array([0.229, 0.224, 0.225], dtype=np.float32)

    def __len__(self) -> int:
        return len(self.crops)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, int]:
        crop_bgr, label = self.crops[idx]
        if crop_bgr.ndim == 2:
            rgb = cv2.cvtColor(crop_bgr, cv2.COLOR_GRAY2RGB)
        else:
            rgb = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2RGB)

        resized = cv2.resize(rgb, (self.target_size, self.target_size), interpolation=cv2.INTER_LINEAR)
        img_float = resized.astype(np.float32) / 255.0
        norm = (img_float - self.mean) / self.std
        tensor = torch.from_numpy(norm).permute(2, 0, 1).float()
        return tensor, label


def extract_crops_from_split(dataset_root: Path, split: str) -> List[Tuple[np.ndarray, int]]:
    """Extracts target crops from images using bounding box annotations."""
    img_dir = dataset_root / split / "images"
    lbl_dir = dataset_root / split / "labels"
    crops = []

    for lbl_file in sorted(lbl_dir.glob("*.txt")):
        content = lbl_file.read_text(encoding="utf-8").strip()
        if not content:
            continue
        # Find matching image
        img_candidates = [
            img_dir / f"{lbl_file.stem}.png",
            img_dir / f"{lbl_file.stem}.jpg",
            img_dir / f"{lbl_file.stem}.jpeg",
        ]
        img_path = None
        for cand in img_candidates:
            if cand.exists():
                img_path = cand
                break
        if not img_path:
            continue

        img_bgr = cv2.imread(str(img_path))
        if img_bgr is None:
            continue
        h, w = img_bgr.shape[:2]

        for line in content.splitlines():
            parts = line.strip().split()
            if len(parts) == 5:
                cid = int(parts[0])
                if cid not in ACTIVE_CLASSES:
                    continue
                cx, cy, bw, bh = [float(v) for v in parts[1:]]
                x1 = max(0, int((cx - bw / 2.0) * w))
                y1 = max(0, int((cy - bh / 2.0) * h))
                x2 = min(w, int((cx + bw / 2.0) * w))
                y2 = min(h, int((cy + bh / 2.0) * h))

                if (x2 - x1) >= 8 and (y2 - y1) >= 8:
                    crop = img_bgr[y1:y2, x1:x2].copy()
                    crops.append((crop, cid))

    return crops


def train_crop_classifier(
    dataset_root: str | Path = "data/dataset",
    output_weights: str | Path = "ml/weights/crop_classifier.pt",
    epochs: int = 15,
    batch_size: int = 16,
    lr: float = 1e-3,
    device: str = "cpu",
):
    """Trains the second-stage crop classifier and tunes empirical OOD thresholds."""
    ds_root = Path(dataset_root)
    out_pt = Path(output_weights)
    out_pt.parent.mkdir(parents=True, exist_ok=True)

    print("=" * 70)
    print("STAGE 2: TRAINING PYTORCH ACOUSTIC CROP CLASSIFIER")
    print("=" * 70)

    # 1. Extract crops from train and val (TEST split remains strictly untouched)
    print("\n[1/5] Extracting acoustic target crops...")
    train_crops = extract_crops_from_split(ds_root, "train")
    val_crops = extract_crops_from_split(ds_root, "val")
    print(f"  • Extracted {len(train_crops)} training crops across {len(ACTIVE_CLASSES)} active classes.")
    print(f"  • Extracted {len(val_crops)} validation crops for empirical calibration.")

    if not train_crops:
        raise ValueError("No training crops found.")

    # 2. Compute class frequency weights
    labels = [c[1] for c in train_crops]
    class_counts = np.bincount(labels, minlength=len(ACTIVE_CLASSES))
    total_samples = len(labels)
    class_weights = total_samples / (len(ACTIVE_CLASSES) * np.maximum(class_counts, 1).astype(np.float32))
    weight_tensor = torch.from_numpy(class_weights).float().to(device)

    print("\n[2/5] Class balance distribution in training crops:")
    for cid, name in ACTIVE_CLASSES.items():
        print(f"  [{cid}] {name:<16}: {class_counts[cid]:>3} crops | Weight: {class_weights[cid]:.3f}")

    train_ds = SonarCropDataset(train_crops)
    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True)

    # 3. Initialize Model and Optimizer
    print(f"\n[3/5] Initializing EfficientNet-B0 architecture on {device}...")
    model = SonarCropNet(num_classes=len(ACTIVE_CLASSES)).to(device)
    criterion = nn.CrossEntropyLoss(weight=weight_tensor)
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)

    # 4. Training Loop
    print(f"\n[4/5] Training for {epochs} epochs...")
    model.train()
    for epoch in range(1, epochs + 1):
        running_loss = 0.0
        correct = 0
        total = 0
        for x, y in train_loader:
            x, y = x.to(device), y.to(device)
            optimizer.zero_grad()
            logits, _ = model(x)
            loss = criterion(logits, y)
            loss.backward()
            optimizer.step()

            running_loss += loss.item() * x.size(0)
            preds = torch.argmax(logits, dim=1)
            correct += (preds == y).sum().item()
            total += x.size(0)

        scheduler.step()
        epoch_loss = running_loss / total
        epoch_acc = (correct / total) * 100.0
        if epoch % 3 == 0 or epoch == epochs:
            print(f"  Epoch [{epoch:02d}/{epochs:02d}] - Loss: {epoch_loss:.4f} | Accuracy: {epoch_acc:.2f}%")

    # 5. Compute Training Prototypes {mu_c}
    print("\n[5/5] Computing class prototype feature centroids and empirical thresholds...")
    model.eval()
    all_features = [[] for _ in range(len(ACTIVE_CLASSES))]
    eval_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=False)

    with torch.no_grad():
        for x, y in eval_loader:
            x = x.to(device)
            feat = model.extract_features(x)
            feat_norm = F.normalize(feat, p=2, dim=1)
            for i in range(x.size(0)):
                cid = y[i].item()
                all_features[cid].append(feat_norm[i].cpu())

    prototypes = []
    for cid in range(len(ACTIVE_CLASSES)):
        if all_features[cid]:
            proto = torch.stack(all_features[cid]).mean(dim=0)
            proto = F.normalize(proto, p=2, dim=0)
        else:
            proto = torch.zeros(1280)
        prototypes.append(proto)
    prototypes_tensor = torch.stack(prototypes).to(device)

    # Empirical OOD threshold tuning on VALIDATION split (Rule 2: Independent test set untouched)
    val_ds = SonarCropDataset(val_crops) if val_crops else None
    val_distances = []
    if val_ds and len(val_ds) > 0:
        val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False)
        with torch.no_grad():
            for x, y in val_loader:
                x = x.to(device)
                feat = model.extract_features(x)
                feat_norm = F.normalize(feat, p=2, dim=1)
                proto_norm = F.normalize(prototypes_tensor, p=2, dim=1)
                sims = torch.mm(feat_norm, proto_norm.t())
                min_dist = 1.0 - torch.max(sims, dim=1)[0]
                val_distances.extend(min_dist.cpu().numpy().tolist())

    if val_distances:
        # 99th percentile with safety margin for realistic OOD rejection
        tau_ood = max(0.85, round(float(np.percentile(val_distances, 99) * 1.2), 4))
        print(f"  • Empirically calibrated tau_ood on validation crops: {tau_ood:.4f}")
    else:
        tau_ood = 0.85
        print(f"  • Default calibrated tau_ood: {tau_ood:.4f}")

    tau_conf = 0.25


    # Save checkpoint
    checkpoint = {
        "model_state_dict": model.state_dict(),
        "prototypes": prototypes_tensor.cpu(),
        "tau_ood": tau_ood,
        "tau_conf": tau_conf,
        "active_classes": ACTIVE_CLASSES,
        "feature_dim": 1280,
    }
    torch.save(checkpoint, str(out_pt))
    print(f"[OK] Second-stage crop classifier checkpoint saved to: {out_pt}")
    print("=" * 70)


def main():
    parser = argparse.ArgumentParser(description="Train Second-Stage Crop Classifier")
    parser.add_argument("--dataset", default="data/dataset", help="Dataset root")
    parser.add_argument("--output", default="ml/weights/crop_classifier.pt", help="Output checkpoint")
    parser.add_argument("--epochs", type=int, default=15, help="Number of epochs")
    parser.add_argument("--batch", type=int, default=16, help="Batch size")
    args = parser.parse_args()

    train_crop_classifier(
        dataset_root=args.dataset,
        output_weights=args.output,
        epochs=args.epochs,
        batch_size=args.batch,
    )


if __name__ == "__main__":
    main()
