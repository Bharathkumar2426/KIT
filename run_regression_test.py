import json
import sys
from pathlib import Path
import requests

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

BENCHMARK_FILE = Path("baseline_benchmark.json")
SAMPLES_DIR = Path("data/samples")
API_URL = "http://127.0.0.1:8000/api/detect"


def run_regression_tests():
    if not BENCHMARK_FILE.exists():
        print(f"❌ Error: Benchmark file '{BENCHMARK_FILE}' not found!")
        sys.exit(1)

    with open(BENCHMARK_FILE, "r") as f:
        baseline = json.load(f)

    print("=" * 80)
    print("🛡️ RUNNING RIGID REGRESSION TEST SUITE: BASELINE vs POST-MAP IMPLEMENTATION")
    print("=" * 80)

    total_tests = 0
    passed_tests = 0
    failures = []

    for filename, expected in baseline.items():
        total_tests += 1
        file_path = SAMPLES_DIR / filename
        if not file_path.exists():
            print(f"⚠️ Warning: Sample image {filename} does not exist on disk. Skipping.")
            continue

        print(f"\n[Test {total_tests}] Evaluating Sample: {filename}")
        with open(file_path, "rb") as f:
            resp = requests.post(API_URL, files={"file": (filename, f, "image/jpeg")})

        if resp.status_code != 200:
            failures.append(f"{filename}: HTTP {resp.status_code} - {resp.text}")
            print(f"  ❌ FAILED: HTTP {resp.status_code}")
            continue

        actual = resp.json()

        # 1. Verify object count
        exp_count = expected["total_objects"]
        act_count = actual["total_objects"]
        if exp_count != act_count:
            msg = f"Object count mismatch for {filename}: expected {exp_count}, got {act_count}"
            failures.append(msg)
            print(f"  ❌ {msg}")
            continue

        # 2. Verify each detection
        mismatch_found = False
        for exp_det, act_det in zip(expected["detections"], actual["detections"]):
            det_id = exp_det["id"]
            if exp_det["class_name"] != act_det["class_name"]:
                failures.append(f"{filename} target #{det_id} class mismatch: expected '{exp_det['class_name']}', got '{act_det['class_name']}'")
                mismatch_found = True
            if abs(exp_det["confidence"] - act_det["confidence"]) > 1e-4:
                failures.append(f"{filename} target #{det_id} confidence mismatch: expected {exp_det['confidence']}, got {act_det['confidence']}")
                mismatch_found = True
            if exp_det["bbox"] != act_det["bbox"]:
                failures.append(f"{filename} target #{det_id} bbox mismatch: expected {exp_det['bbox']}, got {act_det['bbox']}")
                mismatch_found = True

            if exp_det.get("anomaly_score") is not None and act_det.get("anomaly_score") is not None:
                if abs(float(exp_det["anomaly_score"]) - float(act_det["anomaly_score"])) > 1e-4:
                    failures.append(f"{filename} target #{det_id} anomaly score mismatch: expected {exp_det['anomaly_score']}, got {act_det['anomaly_score']}")
                    mismatch_found = True

        if mismatch_found:
            print(f"  ❌ FAILED: Regression detected in target outputs.")
        else:
            passed_tests += 1
            print(f"  ✅ PASSED: 100% Match! ({act_count} targets, identical bboxes, confidences, classes, and anomaly scores)")

    print("\n" + "=" * 80)
    print(f"📊 SUMMARY: {passed_tests}/{total_tests} SAMPLES PASSED REGRESSION VERIFICATION")
    print("=" * 80)

    if failures:
        print("\n❌ REGRESSION FAILURES DETECTED:")
        for fail in failures:
            print(f"  • {fail}")
        sys.exit(1)
    else:
        print("✅ ALL BASELINE DETECTIONS ARE 100% PRESERVED AND UNCHANGED. ZERO REGRESSION.")


if __name__ == "__main__":
    run_regression_tests()
