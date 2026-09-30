"""Backend Application Configuration (SIH 26057)."""

from pathlib import Path
import os

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent.parent / ".env")
except ImportError:
    pass

BASE_DIR = Path(__file__).resolve().parent.parent

def _parse_cors_origins(raw: str) -> list[str]:
    if not raw or raw.strip() == "*":
        return ["*"]
    return [origin.strip() for origin in raw.split(",") if origin.strip()]

class Settings:
    PROJECT_NAME: str = "SIH26057 - Side-Scan Sonar Debris & Anomaly Detection"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    
    # Server Host & Port
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    
    # Paths
    BASE_DIR: Path = BASE_DIR
    UPLOAD_DIR: Path = BASE_DIR / "data" / "uploads"
    SAMPLES_DIR: Path = BASE_DIR / "data" / "samples"
    WEIGHTS_DIR: Path = BASE_DIR / "ml" / "weights"
    DATASET_DIR: Path = BASE_DIR / "data" / "dataset"
    DB_PATH: Path = BASE_DIR / "sonar_detection.db"
    
    # Model defaults
    DEFAULT_CONFIDENCE: float = float(os.getenv("DEFAULT_CONFIDENCE", "0.25"))
    DEFAULT_IOU: float = float(os.getenv("DEFAULT_IOU", "0.45"))
    
    # AIS & Vessel Tracking Configuration
    AIS_API_KEY: str = os.getenv("AIS_API_KEY", "")
    AISSTREAM_API_KEY: str = os.getenv("AISSTREAM_API_KEY") or os.getenv("AIS_API_KEY", "")
    AISSTREAM_WS_URL: str = "wss://stream.aisstream.io/v0/stream"
    AIS_BBOX_MIN_LAT: float = float(os.getenv("AIS_BBOX_MIN_LAT", "-90.0"))
    AIS_BBOX_MIN_LON: float = float(os.getenv("AIS_BBOX_MIN_LON", "-180.0"))
    AIS_BBOX_MAX_LAT: float = float(os.getenv("AIS_BBOX_MAX_LAT", "90.0"))
    AIS_BBOX_MAX_LON: float = float(os.getenv("AIS_BBOX_MAX_LON", "180.0"))
    AIS_STALE_TIMEOUT_SECONDS: int = int(os.getenv("AIS_STALE_TIMEOUT_SECONDS", "300"))
    AIS_MAX_TRACK_POINTS: int = int(os.getenv("AIS_MAX_TRACK_POINTS", "100"))
    VESSEL_WARNING_DISTANCE_METERS: float = float(os.getenv("VESSEL_WARNING_DISTANCE_METERS", "500.0"))
    
    # CORS
    CORS_ORIGINS: list[str] = _parse_cors_origins(os.getenv("CORS_ORIGINS", "*"))

    # Maritime Incident Intelligence Configuration (SIH 26057)
    NEWS_API_KEY: str = os.getenv("NEWS_API_KEY", "")
    MEDIASTACK_API_KEY: str = os.getenv("MEDIASTACK_API_KEY", "")
    GLOBAL_FISHING_WATCH_API_TOKEN: str = os.getenv("GLOBAL_FISHING_WATCH_API_TOKEN", "")
    INCIDENT_CACHE_DIR: Path = BASE_DIR / "backend" / "data" / "incident_cache"
    INCIDENTS_DB_PATH: Path = BASE_DIR / "maritime_incidents.db"
    INCIDENT_POLL_INTERVAL_SECONDS: int = int(os.getenv("INCIDENT_POLL_INTERVAL_SECONDS", "300"))

    # 4TU.ResearchData Automated External Sonar Ingestion Configuration
    FOURTU_ENABLED: bool = os.getenv("FOURTU_ENABLED", "true").lower() in ("true", "1", "yes")
    FOURTU_API_BASE: str = os.getenv("FOURTU_API_BASE", "https://data.4tu.nl/v2")
    FOURTU_SYNC_INTERVAL_HOURS: int = int(os.getenv("FOURTU_SYNC_INTERVAL_HOURS", "24"))
    FOURTU_MAX_DATASETS_PER_SYNC: int = int(os.getenv("FOURTU_MAX_DATASETS_PER_SYNC", "5"))
    FOURTU_MAX_FILES_PER_SYNC: int = int(os.getenv("FOURTU_MAX_FILES_PER_SYNC", "20"))
    FOURTU_MAX_FILE_SIZE_MB: int = int(os.getenv("FOURTU_MAX_FILE_SIZE_MB", "50"))
    FOURTU_DATA_DIR: Path = BASE_DIR / "data" / "fourtu"
    FOURTU_CACHE_DIR: Path = BASE_DIR / "backend" / "data" / "fourtu_cache"

    # SeaRoutesNav Maritime Route Configuration
    SEAROUTES_API_URL: str = os.getenv("SEAROUTES_API_URL", "https://api.searoutesnav.com").rstrip("/")
    SEAROUTES_EMAIL: str = os.getenv("SEAROUTES_EMAIL", "")
    SEAROUTES_PASSWORD: str = os.getenv("SEAROUTES_PASSWORD", "")
    SEAROUTES_CACHE_ENABLED: bool = os.getenv("SEAROUTES_CACHE_ENABLED", "true").lower() in ("true", "1", "yes")
    SEAROUTES_CACHE_DIR: Path = BASE_DIR / "backend" / "data" / "searoutes_cache"

settings = Settings()

# Ensure critical directories exist
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
settings.SAMPLES_DIR.mkdir(parents=True, exist_ok=True)
settings.WEIGHTS_DIR.mkdir(parents=True, exist_ok=True)
settings.DATASET_DIR.mkdir(parents=True, exist_ok=True)
settings.INCIDENT_CACHE_DIR.mkdir(parents=True, exist_ok=True)
settings.FOURTU_DATA_DIR.mkdir(parents=True, exist_ok=True)
settings.FOURTU_CACHE_DIR.mkdir(parents=True, exist_ok=True)
settings.SEAROUTES_CACHE_DIR.mkdir(parents=True, exist_ok=True)

