# SAMUDRA RAKSHAK (SAGAR SURAKSHA) — SIH26057
## Comprehensive Technical Project Specification, System Architecture & Operational Report

> **Prepared for:** Ministry of Earth Sciences (MoES), Government of India  
> **Project Identifier:** SIH26057  
> **Application Title:** AI-Powered Side-Scan Sonar Marine Debris & Underwater Anomaly Detection System  
> **Target Audience:** Artificial Intelligence Systems, Autonomous LLM Agents, Maritime Hydrographers, and Defense/Environmental Software Engineers.

---

## 1. Executive Summary & Objective

The **Samudra Rakshak (Sagar Suraksha)** platform is an enterprise-grade, end-to-end maritime hydrographic surveillance and threat intelligence system. It automates the detection, localization, and classification of underwater debris, hazards, pipelines, shipwrecks, and synthetic anomalies from acoustic side-scan sonar waterfall imagery.

In addition to sonar computer vision, the platform integrates **real-time global Automatic Identification System (AIS) vessel tracking** and an **AI-driven Maritime Safety Information (MSI) incident intelligence pipeline** that continuously ingests, filters, and correlates navigational warnings from NOAA, USCG, NGA, INCOIS, and the Indian Coast Guard.

---

## 2. System Architecture & Tech Stack

```
                                  +-----------------------------------------------+
                                  |            CLIENT / WEB FRONTEND              |
                                  |    React 18 + Vite + TailwindCSS + Leaflet    |
                                  +-----------------------+-----------------------+
                                                          | HTTP REST / WebSocket
                                                          v
                                  +-----------------------------------------------+
                                  |           FASTAPI REST BACKEND                |
                                  |           (Uvicorn Async ASGI Engine)         |
                                  +---+-------------------+-------------------+---+
                                      |                   |                   |
               +----------------------+   +---------------+---------------+   +-----------------------+
               |                          |                               |                           |
               v                          v                               v                           v
+-------------------------------+  +-------------------------------+  +-------------------------------+  +-------------------------------+
|  SONAR 2-STAGE ML PIPELINE   |  |   SONAR GEODETIC ENGINE       |  |     AIS TRACKING SERVICE      |  |    MARITIME INCIDENT AI       |
|  - Preprocessing (CLAHE)     |  |   - Slant-Range Correction    |  |  - AISStream WebSocket Client  |  |  - Multi-Source Ingestion     |
|  - Stage 1: YOLOv8 Detector  |  |   - Trackline Interpolation   |  |  - Geofence Proximity Alarms   |  |  - NLP Information Extraction  |
|  - Stage 2: Deep Crop Class  |  |   - Nadir/Port/Starboard Calc |  |  - Synthetic Replay Engine     |  |  - Spatial Deduplication      |
|  - OOD Anomaly Scoring       |  |   - JSON / CSV Export         |  |  - Memory-bounded Tracks       |  |  - Threat Matrix Scorer       |
+-------------------------------+  +-------------------------------+  +-------------------------------+  +-------------------------------+
               |                          |                               |                           |
               +--------------------------+---------------+---------------+---------------------------+
                                                          |
                                                          v
                                  +-----------------------------------------------+
                                  |              PERSISTENCE TIER                 |
                                  |      SQLite3 / aiosqlite + Async SQLAlchemy   |
                                  |      (sonar_detection.db, incidents.db)       |
                                  +-----------------------------------------------+
```

### Core Technologies
* **Operating Environment:** Windows / Linux / macOS (Cross-Platform).
* **Backend Runtime:** Python 3.11 / 3.12 (CPython).
* **API Framework:** FastAPI 0.109+ / 0.142+, Starlette, Uvicorn ASGI Server.
* **Database & ORM:** SQLite 3, SQLAlchemy 2.0+ (Async engine via `aiosqlite` and `greenlet`).
* **Machine Learning / CV:** PyTorch 2.1+, Torchvision, Ultralytics YOLOv8, OpenCV (cv2) 4.8+, PIL, NumPy, SciPy.
* **Geospatial & Geodesy:** Spherical Earth Geodesy (Haversine, Great-Circle Bearings, Direct Geodetic Problem), PyXTF (eXtended Triton Format sonar file parser).
* **Frontend Runtime:** Node.js v18+ / v20+ / v24+.
* **Frontend Framework:** React 18, Vite 5, TailwindCSS 3.4, Lucide React (Icons), Leaflet 1.9 (Tile & Vector Mapping).

---

## 3. Directory & File Manifest

```
KIT-main/
├── .env                              # Environment variables (API keys, ports, debug flags)
├── requirements.txt                  # Python dependencies
├── pyrightconfig.json                # Python language server configuration
├── run_app.py                        # Single-command launcher for both backend & frontend
├── run_regression_test.py            # Automated ML inference regression test harness
├── test_ais_endpoints.py             # AIS live & synthetic replay verification suite
├── test_incident_pipeline.py         # Maritime incident intelligence & proximity alarm test suite
├── test_sonar_geo_suite.py           # Mathematical geodesy & georeferencing unit test suite
├── verify_e2e_reports.py             # End-to-end geotagging and reporting verification test
├── sonar_detection.db                # SQLite database storing sonar scans and detections
│
├── backend/
│   ├── config.py                     # Centralized settings (Settings class, environment bindings)
│   ├── database.py                   # Async SQLite connection pool and DB initializer
│   ├── main.py                       # FastAPI application entry point, lifespan, CORS, route registry
│   ├── api/
│   │   ├── routes.py                 # Core sonar detection, history, report, and export endpoints
│   │   ├── ais_routes.py             # Live AISStream WebSocket & HTTP vessel queries
│   │   ├── ais_demo_routes.py        # Demo/synthetic AIS playback control endpoints
│   │   ├── incident_routes.py        # Maritime safety notices, risk scoring, vessel alerts
│   │   └── geospatial_routes.py      # Sonar trackline and XTF coordinate translation endpoints
│   ├── models/
│   │   ├── db_models.py              # SQLAlchemy models: ImageRecord, DetectionRecord
│   │   ├── schemas.py                # Pydantic schemas: BoundingBox, DetectionItem, DetectResponse
│   │   ├── ais_schemas.py            # Pydantic schemas: VesselState, VesselTrack, ProximityAlert
│   │   ├── geospatial_schemas.py     # Pydantic schemas: GeotagParameters, SonarPingInfo
│   │   ├── incident_models.py        # SQLAlchemy incident database models
│   │   └── incident_schemas.py       # Pydantic schemas: MaritimeIncident, ThreatSummary, SourceStatus
│   └── services/
│       ├── detection_service.py      # Full inference orchestration (Preproc -> YOLO -> Crop -> Geo -> DB)
│       ├── storage_service.py        # Database CRUD operations for scans and targets
│       ├── sonar_geo.py              # Spherical geodesy, slant-range, nadir offset, report generator
│       ├── geospatial_service.py     # Trackline interpolation and coordinate transformation
│       ├── ais_service.py            # Live AISStream WebSocket client, spatial index, geofence monitor
│       ├── ais_demo_service.py       # Deterministic playback simulator (42 Chennai vessels)
│       ├── incident_ingestion_service.py # Poller for external maritime hazard feeds
│       ├── incident_ai_service.py    # NLP entity extractor, coordinate parser, danger radius estimator
│       ├── incident_deduplication_service.py # Geospatial & semantic clustering for incident merging
│       ├── incident_risk_service.py  # Vessel-to-incident proximity breach calculator
│       └── incident_sources/         # Source connectors (NOAA, USCG, NGA, INCOIS, ICG, NewsAPI)
│
├── ml/
│   ├── configs/
│   │   └── sonar_classes.yaml        # Taxonomy, 10 active classes, color palette, inference thresholds
│   ├── classifiers/
│   │   └── crop_classifier.py        # Deep feature extraction & prototype-based anomaly classifier
│   ├── inference/
│   │   └── detector.py               # 2-Stage YOLOv8 + Crop classifier inference pipeline
│   ├── preprocessing/
│   │   └── sonar_preprocessor.py     # Sonar image enhancement (CLAHE, despeckle, water-column mask)
│   ├── training/                     # Scripts for model fine-tuning and validation
│   ├── evaluation/                   # Precision-recall, F1, and mAP evaluation scripts
│   └── weights/
│       ├── sonar_v2.pt               # Primary optimized YOLOv8 weights (10 classes)
│       ├── sonar_best.pt             # Baseline YOLOv8 weights
│       ├── crop_classifier.pt        # EfficientNet-B0 feature extractor weights
│       └── yolov8n.pt                # Standard YOLOv8 nano model
│
├── frontend/
│   ├── package.json                  # Dependencies: react, vite, tailwindcss, leaflet, lucide-react
│   ├── vite.config.js                # Dev server (port 5173) with /api and /static proxying to 8000
│   ├── tailwind.config.js            # Custom nautical color palette and dark-mode styles
│   ├── index.html                    # Single-page application root HTML
│   └── src/
│       ├── App.jsx                   # Master state container & view router
│       ├── main.jsx                  # React DOM mount point
│       ├── index.css                 # Tailwind directives, animations, radar scanline keyframes
│       ├── components/
│       │   ├── DashboardShell.jsx    # Top navigation header, marquee bar, system status badge
│       │   ├── MarqueeAlertBar.jsx   # Live ticker showing critical warnings and AIS breaches
│       │   ├── SonarCanvas.jsx       # Interactive bounding-box overlay canvas with zoom/pan
│       │   └── LeafletMap.jsx        # Map container with vessel markers, tracks, and geofences
│       ├── pages/
│       │   ├── SamudraRakshakSignInPage.jsx # Tactical authentication portal
│       │   ├── SagarSurakshaOverviewPage.jsx # High-level dashboard, KPIs, quick metrics
│       │   ├── SonarAnalysisPage.jsx # File upload, 2-stage visual inspection, report generation
│       │   ├── SonarMapPage.jsx      # Full-screen tactical GIS map with live AIS & sonar swaths
│       │   ├── MaritimeIncidentPage.jsx # Incident intelligence explorer, threat matrix, filters
│       │   └── SagarSurakshaFeedPage.jsx # Real-time event log and alert stream
│       └── services/
│           ├── api.js                # Axios/fetch wrappers for all REST endpoints
│           └── websocket.js          # Client WebSocket listener for real-time AIS events
│
└── data/
    ├── samples/                      # Verified acoustic side-scan sonar benchmark images
    ├── uploads/                      # Runtime target for uploaded and annotated images
    └── dataset/                      # Structured training and validation splits
```

---

## 4. Machine Learning & Sonar Vision Pipeline

### 4.1 Taxonomy & Acoustic Classes
Defined in `ml/configs/sonar_classes.yaml`:
| Class ID | Technical Name | UI Display Name | Color Code (RGB) | Category |
| :--- | :--- | :--- | :--- | :--- |
| `0` | `ghost_net` | Ghost Net | `[245, 158, 11]` (Amber) | Environmental Hazard |
| `1` | `metal_drum` | Metal Drum | `[16, 185, 129]` (Emerald) | Chemical / Toxic Container |
| `2` | `plastic_debris` | Plastic Debris | `[239, 68, 68]` (Rose Red) | Anthropogenic Waste |
| `3` | `sunken_wreckage`| Shipwreck | `[168, 85, 247]` (Purple) | Navigation Obstruction |
| `4` | `tire_wheel` | Tire | `[59, 130, 246]` (Blue) | Marine Litter |
| `5` | `pipe_pipeline` | Pipeline | `[234, 179, 8]` (Gold) | Subsea Infrastructure |
| `6` | `container_crate`| Container / Crate | `[20, 184, 166]` (Teal) | Cargo Debris |
| `7` | `anchor_chain` | Anchor / Chain | `[249, 115, 22]` (Orange) | Mooring Hazard |
| `8` | `wood_debris` | Wood Debris | `[180, 83, 9]` (Bronze) | Organic Debris |
| `9` | `rock_boulder` | Rock Boulder | `[132, 204, 22]` (Lime) | Natural Seabed Anomaly |
| `--` | `unknown_debris` | Unknown Debris | `[6, 182, 212]` (Cyan) | Out-of-Distribution Debris |
| `--` | `unknown_anomaly`| Unknown Anomaly | `[6, 182, 212]` (Cyan) | High Anomaly Score Target |

### 4.2 Two-Stage Inference Flow
1. **Preprocessing (`ml/preprocessing/sonar_preprocessor.py`):**
   * **Grayscale Conversion:** Standardizes multi-channel sonar waterfalls.
   * **CLAHE (Contrast Limited Adaptive Histogram Equalization):** Amplifies weak acoustic backscatter while suppressing saturation.
   * **Bilateral / Median Filter:** Reduces acoustic speckle noise while preserving sharp acoustic shadow boundaries.
   * **Letterbox Resizing:** Preserves native aspect ratio while mapping to 640x640 input tensors.
2. **Stage 1 — Candidate Localization (`ml/inference/detector.py`):**
   * Executes YOLOv8 (`sonar_v2.pt`) inference.
   * Extracts bounding boxes $[x_1, y_1, x_2, y_2]$, confidence scores $c \in [0, 1]$, and initial class assignments.
   * Performs class-agnostic Non-Maximum Suppression (NMS) with IoU threshold = 0.45.
3. **Stage 2 — Deep Feature Verification & Anomaly Scoring (`ml/classifiers/crop_classifier.py`):**
   * Crops each detected bounding box from the preprocessed sonar image.
   * Passes the crop through an EfficientNet-B0 backbone to extract a 1280-dimensional feature embedding $\vec{e}$.
   * Computes cosine similarity against class prototype vectors $\vec{p}_k$:
     $$\text{sim}(\vec{e}, \vec{p}_k) = \frac{\vec{e} \cdot \vec{p}_k}{\|\vec{e}\|_2 \|\vec{p}_k\|_2}$$
   * Anomaly score is computed as:
     $$\text{Anomaly Score} = 1.0 - \max_k \left(\text{sim}(\vec{e}, \vec{p}_k)\right)$$
   * If $\text{Anomaly Score} > \tau_{\text{anomaly}}$ ($0.65$), the object is flagged as `unknown_anomaly` or `unknown_debris`.
4. **Coordinate De-letterboxing:** Re-projects bounding box coordinates back to the original image pixel resolution.

---

## 5. Mathematical Geodesy & Sonar Georeferencing

Implemented in `backend/services/sonar_geo.py`.

### 5.1 Image Geometry Conventions
* Waterfall image:
  * **Rows (Y-axis):** Represent consecutive pings along the vessel survey trackline (Along-Track).
  * **Columns (X-axis):** Represent across-track range.
  * **Center Column ($x = W/2$):** Acoustic Nadir (directly beneath the towfish/transducer).
  * **Left Half ($x < W/2$):** Port Channel.
  * **Right Half ($x > W/2$):** Starboard Channel.

### 5.2 Mathematical Formulations
1. **Haversine Distance:**
   $$a = \sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right)$$
   $$d = 2 R_{\text{earth}} \arcsin\left(\sqrt{a}\right) \quad \text{where } R_{\text{earth}} = 6,371,000\text{ m}$$
2. **Initial Great-Circle Bearing ($\theta$):**
   $$y = \sin(\Delta \lambda)\cos(\phi_2)$$
   $$x = \cos(\phi_1)\sin(\phi_2) - \sin(\phi_1)\cos(\phi_2)\cos(\Delta \lambda)$$
   $$\theta = \left(\text{atan2}(y, x) \times \frac{180}{\pi} + 360\right) \pmod{360}$$
3. **Slant-Range to Ground-Range Correction:**
   Given towfish altitude above seabed $h$ (metres) and slant-range $R_s$:
   $$R_g = \sqrt{\max\left(0, R_s^2 - h^2\right)}$$
4. **Across-Track Lateral Distance ($D_{\text{lateral}}$):**
   For pixel column $x_c$ in an image of width $W$ with maximum ground swath range $S_{\text{max}}$:
   $$\Delta x = \frac{x_c - (W / 2)}{W / 2}$$
   $$D_{\text{lateral}} = |\Delta x| \times S_{\text{max}}$$
   $$\text{Side} = \begin{cases} \text{port}, & \text{if } x_c < W/2 \\ \text{starboard}, & \text{if } x_c \ge W/2 \end{cases}$$
5. **Direct Geodetic Solution (Target Lat/Lon):**
   * Heading along survey line: $\theta_{\text{track}}$
   * Lateral bearing to target:
     $$\theta_{\text{target}} = \begin{cases} (\theta_{\text{track}} - 90 + 360) \pmod{360}, & \text{if Port} \\ (\theta_{\text{track}} + 90) \pmod{360}, & \text{if Starboard} \end{cases}$$
   * Target destination coordinate $(\phi_2, \lambda_2)$ calculated by projecting $D_{\text{lateral}}$ along bearing $\theta_{\text{target}}$ from interpolated nadir ping $(\phi_{\text{nadir}}, \lambda_{\text{nadir}})$.

---

## 6. Live AIS Tracking & Maritime Hazard Intelligence

### 6.1 AISStream WebSocket Ingestion (`backend/services/ais_service.py`)
* Establishes an asynchronous TLS connection to `wss://stream.aisstream.io/v0/stream`.
* Subscribes to global or bounding-box-filtered maritime areas.
* Parses AIS Message Types:
  * **Type 1, 2, 3 (Position Report):** Latitude, Longitude, SOG (Speed over ground in knots), COG (Course over ground), True Heading, Navigational Status.
  * **Type 5 (Ship Static & Voyage Data):** MMSI, IMO, Vessel Name, Call Sign, Ship Type, Destination, ETA, Draught, Dimensions.
* Maintains memory-bounded historical tracks (last 100 points per vessel).
* Computes real-time geofence proximity against detected underwater hazards:
  * Alert triggered if vessel distance to active underwater anomaly $< 500\text{ metres}$.

### 6.2 AIS Demo Simulator (`backend/services/ais_demo_service.py`)
* Provides deterministic, offline-capable playback of 42 commercial and fishing vessels operating in the Chennai Port / Bay of Bengal sector.
* Supports runtime playback controls: `play`, `pause`, `speed` ($0.5\times$ to $5.0\times$), and `reset`.

### 6.3 Maritime Incident Intelligence Engine (`backend/services/incident_*.py`)
* **Multi-Source Aggregation:** Sinks notices from:
  1. *NOAA IncidentNews* (Oil spills, groundings, sunken vessels).
  2. *USCG Navigation Center* (Broadcast Notices to Mariners - BNMs).
  3. *NGA Maritime Safety Information* (NAVAREA IV/XII warnings).
  4. *INCOIS* (Indian National Centre for Ocean Information Services).
  5. *Indian Coast Guard* (Search & Rescue, maritime defense notices).
  6. *Global Maritime News Feeds* (NewsAPI, Mediastack).
* **AI Extraction & Normalization:** Heuristic NLP extracts vessel names, incident classifications, severity scores (LOW, MEDIUM, HIGH, CRITICAL), coordinate parsing (DMS, DDM, Decimal), and computes dynamic threat exclusion zones (radius from $1.0\text{ km}$ to $25.0\text{ km}$).
* **Correlated Threat Alarms:** Continuously correlates live AIS vessel tracks against active incident zones to emit Level 1 through Level 4 proximity breach alarms.

---

## 7. REST API & WebSocket Specification

### 7.1 Sonar Vision & Analysis
* `GET /api/health`
  * Returns system status, PyTorch version, active model weights (`sonar_v2.pt`), class taxonomy, and device (`CPU`/`CUDA`).
* `POST /api/detect`
  * **Consumes:** `multipart/form-data` (`file`: Sonar image binary) + query parameters (`confidence`, `iou_threshold`, `start_lat`, `start_lon`, `end_lat`, `end_lon`, `swath_range_m`, `altitude`).
  * **Returns:** Detailed JSON response with image metadata, total detections, bounding boxes, pixel coordinates, real-world lat/lon, physical dimensions in metres, side (port/starboard), range from nadir, confidence percentage, and anomaly score.
* `GET /api/scans/{image_id}/report?format={json|csv}`
  * Exports authoritative anomaly inspection report in standard JSON or downloadable CSV format.
* `GET /api/history`
  * Returns historical database scans and detection summaries.

### 7.2 AIS Vessel Tracking
* `GET /api/ais/status`: Returns WebSocket connection health, total active vessels, uptime, and bounding box.
* `GET /api/ais/vessels`: Returns list of all currently tracked live vessel states.
* `GET /api/ais/tracks`: Returns trajectory points for active vessels.
* `GET /api/ais/alerts`: Returns active proximity alerts where vessels are within danger zones.
* `WS /api/ais/ws`: WebSocket endpoint broadcasting real-time vessel updates to the frontend dashboard.
* `GET /api/ais/demo/vessels`: Returns simulated vessels in demo mode.
* `POST /api/ais/demo/{play|pause|reset}`: Demo playback controls.
* `POST /api/ais/demo/speed?speed={multiplier}`: Adjusts simulation speed.

### 7.3 Maritime Incident Intelligence
* `GET /api/incidents`: Returns all clustered maritime safety incidents with severity, source, and coordinates.
* `GET /api/incidents/metrics`: Dashboard KPI summaries (critical count, active danger zones, vessels in danger).
* `GET /api/incidents/sources/status`: Ingestion status across all 9 monitored safety agencies.
* `POST /api/incidents/{incident_id}/confirm-map`: Verifies and binds an incident to the tactical GIS map.
* `GET /api/incidents/{incident_id}/nearby-vessels`: Correlates live AIS vessels within the incident danger radius.
* `GET /api/incidents/alarms/active`: Returns all active maritime danger breach alarms.

---

## 8. Database Schema (SQLite)

Located at `sonar_detection.db`:

```sql
CREATE TABLE images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    image_id VARCHAR(64) UNIQUE NOT NULL,
    filename VARCHAR(255) NOT NULL,
    original_path VARCHAR(512) NOT NULL,
    annotated_path VARCHAR(512),
    total_objects INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    start_lat FLOAT,
    start_lon FLOAT,
    end_lat FLOAT,
    end_lon FLOAT,
    swath_range_m FLOAT,
    altitude FLOAT
);

CREATE TABLE detections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    image_id VARCHAR(64) NOT NULL,
    detection_id INTEGER NOT NULL,
    class_name VARCHAR(64) NOT NULL,
    confidence FLOAT NOT NULL,
    bbox_x1 FLOAT NOT NULL,
    bbox_y1 FLOAT NOT NULL,
    bbox_x2 FLOAT NOT NULL,
    bbox_y2 FLOAT NOT NULL,
    center_x FLOAT NOT NULL,
    center_y FLOAT NOT NULL,
    area FLOAT NOT NULL,
    anomaly_score FLOAT DEFAULT 0.0,
    classification_source VARCHAR(32) DEFAULT 'yolo_v8',
    latitude FLOAT,
    longitude FLOAT,
    side VARCHAR(16),
    range_from_nadir_m FLOAT,
    width_m FLOAT,
    length_m FLOAT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(image_id) REFERENCES images(image_id) ON DELETE CASCADE
);

CREATE INDEX ix_images_image_id ON images(image_id);
CREATE INDEX ix_detections_image_id ON detections(image_id);
CREATE INDEX ix_detections_class_name ON detections(class_name);
```

---

## 9. Verification & Test Suite Summary

The repository includes a comprehensive, verified test suite:

1. **`test_ais_endpoints.py`**
   * Verifies both live WebSocket ingestion and demo replay engine.
   * Tests playback rate adjustments, pausing, resuming, and vessel state retrieval.
   * **Result:** `ALL LIVE & DEMO AIS ENDPOINT TESTS PASSED PERFECTLY`.
2. **`test_incident_pipeline.py`**
   * Verifies multi-source parsing (NOAA, USCG, NGA, INCOIS, ICG).
   * Verifies incident clustering, coordinate normalization, risk radius calculation, and vessel proximity alerting.
   * **Result:** `ALL MARITIME INCIDENT INTELLIGENCE API TESTS PASSED PERFECTLY`.
3. **`test_sonar_geo_suite.py`**
   * Tests Haversine formula, initial bearing, destination calculations, and quadrant validation.
   * Validates slant-range Pythagorean reduction and nadir port/starboard coordinate derivation.
   * **Result:** `6/6 GEODESY TESTS PASSED (Ran in 0.732s, OK)`.
4. **`verify_e2e_reports.py`**
   * End-to-end integration test: Uploads real side-scan sonar image (`sample_sonar_image6.jpg`) with Palk Strait GPS track coordinates.
   * Validates detection of 6 marine targets with valid geocoordinates, slant ranges, and physical metric dimensions.
   * Verifies JSON and CSV anomaly report generation and SQLite row insertions.
   * **Result:** `ALL TESTS & END-TO-END VERIFICATIONS PASSED SUCCESSFULLY`.

---

## 10. How to Run & Operate the System

### 10.1 Environment Setup
1. **Python Environment:**
   ```bash
   uv venv --python 3.12 .venv
   .venv\Scripts\activate
   uv pip install -r requirements.txt websockets requests greenlet pyxtf pytest
   ```
2. **Frontend Environment:**
   ```bash
   cd frontend
   npm install
   cd ..
   ```

### 10.2 Starting the Platform
Launch the complete full-stack environment with a single command:
```bash
.venv\Scripts\python.exe run_app.py
```
* **Frontend UI:** Open [http://localhost:5173](http://localhost:5173) in any browser.
* **Backend API Documentation:** Open [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) (Swagger UI).
* **Health Endpoint:** [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health).

---

## 11. Guide for AI Systems & Autonomous LLMs

When generating prompts, extending this codebase, or integrating additional features:
1. **Maintain 2-Stage Integrity:** Do not bypass the Stage 2 crop classifier (`crop_classifier.pt`); it provides out-of-distribution anomaly scoring critical for detecting unknown underwater debris.
2. **Geodetic Precision:** Always utilize `destination()` and `haversine()` from `backend/services/sonar_geo.py` rather than Euclidean planar approximations when computing maritime coordinates.
3. **Port/Starboard Geometry:** The sonar image nadir is fixed at the image midpoint column ($x = W/2$). Columns $x < W/2$ are Port (bearing $\theta_{\text{track}} - 90^\circ$); columns $x \ge W/2$ are Starboard (bearing $\theta_{\text{track}} + 90^\circ$).
4. **AIS Concurrency:** The live AIS service operates inside the FastAPI lifespan as an asynchronous background worker. When querying vessel states, read from `get_ais_service().vessels` or `get_ais_demo_service().vessels` without locking the main thread.
5. **Database Async Safety:** SQLite queries in `backend/services/storage_service.py` must use the async session context (`async with async_session_maker() as session:`) to prevent thread contention.
6. **4TU Anti-Hallucination Rule:** When ingesting external research datasets, never invent or estimate geographic coordinates if navigation metadata is absent. Store detections in SQLite with `latitude=None, longitude=None` and do not place them on the tactical map.

---

## 12. Automated External Sonar Data Ingestion (4TU.ResearchData)

### 12.1 Objective & Architecture
The 4TU ingestion engine is an additive external data intake module. It continuously monitors, discovers, downloads, validates, and processes marine acoustic research datasets from **4TU.ResearchData** using the public Figshare v2 API (`https://data.4tu.nl/v2`), routing valid imagery directly through the existing 2-stage YOLOv8 + crop classifier pipeline.

```
4TU.ResearchData API
       ↓
Heuristic Relevance Filter (Title, Description, Tags, Taxonomy)
       ↓
File Discovery (.xtf, .tif, .png, .jpg, .zip, .csv, .kml)
       ↓
Duplicate Detection (Dataset ID + File ID + MD5 Checksum)
       ↓
File & Acoustic Image Validation (OpenCV / PIL / pyxtf)
       ↓
Navigation Extraction (Embedded XTF Pings or Sidecar CSV/KML)
       ↓
Has Navigation?
  ├── YES: Run Existing ML → Georeference (sonar_geo.py) → Save to SQLite (images/detections) → MAP_READY (Leaflet Marker)
  └── NO:  Run Existing ML → Save to SQLite (latitude=None) → PROCESSED (Zero Fake Coordinates Rule, No Map Marker)
```

### 12.2 Implemented Components
* **Configuration:** [backend/config.py](file:///e:/KIT_MAIN/KIT-main/backend/config.py) (`FOURTU_ENABLED`, `FOURTU_API_BASE`, `FOURTU_SYNC_INTERVAL_HOURS`, `FOURTU_MAX_DATASETS_PER_SYNC`, `FOURTU_MAX_FILES_PER_SYNC`, `FOURTU_MAX_FILE_SIZE_MB`, `FOURTU_DATA_DIR`).
* **Models & Schemas:** [backend/models/fourtu_models.py](file:///e:/KIT_MAIN/KIT-main/backend/models/fourtu_models.py) (`FourTuFileRecord`, `FourTuSyncRun`) and [backend/models/fourtu_schemas.py](file:///e:/KIT_MAIN/KIT-main/backend/models/fourtu_schemas.py).
* **Validation & Heuristics:** [backend/services/fourtu_validator.py](file:///e:/KIT_MAIN/KIT-main/backend/services/fourtu_validator.py) (file integrity, MD5, dimensions, variance, format, XTF packets, anti-hallucination WGS84 checks).
* **Metadata Extraction:** [backend/services/fourtu_metadata.py](file:///e:/KIT_MAIN/KIT-main/backend/services/fourtu_metadata.py) (XTF acoustic packets, CSV column heuristics, KML track parsing).
* **Core Ingestion Service:** [backend/services/fourtu_service.py](file:///e:/KIT_MAIN/KIT-main/backend/services/fourtu_service.py) (multi-source discovery, download streaming, archive extraction, 2-stage ML execution, background scheduler supporting both **4TU.ResearchData** and **Source Cooperative / NASA Marine Debris**).
* **REST API Endpoints:** [backend/api/fourtu_routes.py](file:///e:/KIT_MAIN/KIT-main/backend/api/fourtu_routes.py) (`GET /api/4tu/status`, `GET /api/4tu/search`, `POST /api/4tu/sync`, `GET /api/4tu/datasets`, `GET /api/4tu/history`, `GET /api/4tu/files`).
* **Frontend UI:**
  * [frontend/src/components/FourTuAutomatedFeedPanel.jsx](file:///e:/KIT_MAIN/KIT-main/frontend/src/components/FourTuAutomatedFeedPanel.jsx): Dedicated real-time tactical feed card with live sync status, counters, manual `[ SYNC NOW ]` button, and an expandable interactive drawer displaying both **Detections Marked on Geo Map** and **Ingested Files & Datasets** with direct map navigation.
  * [frontend/src/pages/SonarAnalysisPage.jsx](file:///e:/KIT_MAIN/KIT-main/frontend/src/pages/SonarAnalysisPage.jsx): Integrated automated feed panel while preserving manual file uploads.
  * [frontend/src/components/SonarMap.jsx](file:///e:/KIT_MAIN/KIT-main/frontend/src/components/SonarMap.jsx): Tactical map popup enhancement displaying external repository source (`4TU.ResearchData` / `Source.Coop (NASA)`), dataset title, filename, and location source.
* **Test Harness:** [test_fourtu_pipeline.py](file:///e:/KIT_MAIN/KIT-main/test_fourtu_pipeline.py) (8/8 automated test cases verifying connectivity, scoring, image validation, GPS checks, sidecar extraction, zero-hallucination unlocated handling, and live REST endpoints).

### 12.3 Multi-Source External Feeds Summary
| Data Source | Provider | Ingestion Endpoint | Target Geography | Debris / Acoustic Anomalies |
|:---|:---|:---|:---|:---|
| **4TU.ResearchData** | TU Delft / 4TU Federation | `https://data.4tu.nl/v2` | North Sea / Texel Benthic Transects | Metal drums, plastic debris, benthic seabed anomalies |
| **Source Cooperative (NASA)** | NASA IMPACT / CSDA / Radiant Earth | `https://source.coop/nasa/marine-debris` | Bay Islands (Honduras), Ghana, Greece | Sunken wreckage, pipelines, surface/subsurface marine flotsam |

---

## 13. SeaRoutesNav Commercial Maritime Route Navigation Engine

### 13.1 Objective & Architecture
The SeaRoutesNav integration connects the project to the professional marine route calculation engine at `https://api.searoutesnav.com`. It plots navigable international shipping lanes, computes nautical distances, estimates vessel transit durations, and performs geospatial proximity analysis to alert navigators when shipping lanes intersect underwater sonar debris fields.

```
SeaRoutesNav API (https://api.searoutesnav.com)
       ↓
JWT Authentication (POST /auth/login → Bearer Token)
       ↓
Quota Guard & Cache Layer (Preserves 25 queries/day Trial Limit)
       ↓
Navigable Route Calculation (POST /calculate-route)
       ↓
Geospatial Debris Hazard Analysis (Haversine distance against 98 DB targets)
       ↓
Leaflet Interactive Layer Overlay (Cyan Dashed Corridor + Port Markers + Popups)
```

### 13.2 Key Components
* **Configuration:** Added to [.env](file:///e:/KIT_MAIN/KIT-main/.env) and [backend/config.py](file:///e:/KIT_MAIN/KIT-main/backend/config.py):
  * `SEAROUTES_API_URL=https://api.searoutesnav.com`
  * `SEAROUTES_EMAIL=laura.nanoteam03@gmail.com`
  * `SEAROUTES_PASSWORD=]GWg5\b3\nn<P7N#QEv(`
  * `SEAROUTES_CACHE_ENABLED=true`
  * `SEAROUTES_CACHE_DIR=backend/data/searoutes_cache`
* **Core Service:** [backend/services/searoutes_service.py](file:///e:/KIT_MAIN/KIT-main/backend/services/searoutes_service.py)
  * Handles authentication with auto-refreshing bearer tokens.
  * Checks quota balance via `GET /auth/usage` and `GET /auth/me`.
  * Computes route coordinates with fallback safety and automatic disk caching in `searoutes_cache`.
  * Computes minimum distances to active underwater sonar debris targets and generates `hazard_alerts`.
* **REST API Endpoints:** [backend/api/searoutes_routes.py](file:///e:/KIT_MAIN/KIT-main/backend/api/searoutes_routes.py)
  * `GET /api/searoutes/status` — API health, account email, trial plan expiration, daily limit, and remaining queries.
  * `GET /api/searoutes/routes` — Active shipping lanes with GeoJSON coordinates, distance in NM, transit time, and sonar hazard alerts.
  * `POST /api/searoutes/calculate` — Custom route calculation between any two points.
  * `GET /api/searoutes/ports` — Port name autocomplete.
* **Map Overlay & UI:** [frontend/src/components/SonarMap.jsx](file:///e:/KIT_MAIN/KIT-main/frontend/src/components/SonarMap.jsx)
  * **Layer Toggle:** `Sea Routes: ON/OFF` button in the map control bar.
  * **Corridor Navigator:** Floating expandable panel showing active routes, live quota (`16/25`), and 1-click camera focus.
  * **Tactical Popups:** Detailed route statistics, nautical miles, waypoint count, and hazard intersection warning banners.
* **Test Suite:** [test_searoutes_pipeline.py](file:///e:/KIT_MAIN/KIT-main/test_searoutes_pipeline.py) (5/5 tests passing).