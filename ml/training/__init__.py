"""Side-Scan Sonar Training Package."""

from ml.training.dataset_builder import (
    SonarDatasetAuditor,
    generate_multi_target_sonar_sample,
    generate_synthetic_sonar_sample,
    build_multi_target_dataset,
)
from ml.training.train import train_sonar_detector

__all__ = [
    "SonarDatasetAuditor",
    "generate_multi_target_sonar_sample",
    "generate_synthetic_sonar_sample",
    "build_multi_target_dataset",
    "train_sonar_detector",
]

