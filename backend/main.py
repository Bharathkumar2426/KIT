"""Main FastAPI Application Entrypoint (SIH 26057)."""

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from backend.api.routes import router as api_router
from backend.api.geospatial_routes import router as geospatial_router
from backend.api.ais_routes import router as ais_router
from backend.api.ais_demo_routes import router as ais_demo_router
from backend.api.incident_routes import router as incident_router
from backend.api.fourtu_routes import router as fourtu_router
from backend.api.searoutes_routes import router as searoutes_router
from backend.config import settings
from backend.database import init_db
from backend.services.ais_service import get_ais_service
from backend.services.ais_demo_service import get_ais_demo_service
from backend.services.incident_ingestion_service import get_incident_ingestion_service
from backend.services.fourtu_service import get_fourtu_service

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("MainApp")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initializes database schema and starts AIS, Incident, and 4TU services with error shields."""
    try:
        logger.info("Initializing database tables...")
        await init_db()
        logger.info("Database initialized successfully.")
    except Exception as e:
        logger.error(f"Database initialization error (continuing): {e}", exc_info=True)
    
    # Start isolated live AISStream ingestion service
    try:
        ais_svc = get_ais_service()
        await ais_svc.start()
    except Exception as e:
        logger.error(f"AIS service start notice: {e}")

    # Start independent demo replay service
    try:
        demo_svc = get_ais_demo_service()
        await demo_svc.start()
    except Exception as e:
        logger.error(f"AIS demo service start notice: {e}")

    # Start AI maritime incident intelligence service
    try:
        incident_svc = get_incident_ingestion_service()
        await incident_svc.start()
    except Exception as e:
        logger.error(f"Incident ingestion service start notice: {e}")

    # Start 4TU automated research sonar data ingestion service
    try:
        fourtu_svc = get_fourtu_service()
        await fourtu_svc.start()
    except Exception as e:
        logger.error(f"4TU service start notice: {e}")
    
    yield
    
    # Graceful shutdown of services
    try:
        await ais_svc.stop()
        await demo_svc.stop()
        await incident_svc.stop()
        await fourtu_svc.stop()
    except Exception:
        pass
    logger.info("Application shutting down.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="AI-Powered Side-Scan Sonar Marine Debris and Underwater Anomaly Detection Pipeline.",
    lifespan=lifespan,
)

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

# Register API Routers
app.include_router(api_router, prefix=settings.API_PREFIX)
app.include_router(geospatial_router, prefix=settings.API_PREFIX)
app.include_router(ais_router, prefix=settings.API_PREFIX)
app.include_router(ais_demo_router, prefix=settings.API_PREFIX)
app.include_router(incident_router, prefix=settings.API_PREFIX)
app.include_router(fourtu_router, prefix=settings.API_PREFIX)
app.include_router(searoutes_router, prefix=settings.API_PREFIX)

# Serve uploaded / processed static files
app.mount("/static/uploads", StaticFiles(directory=str(settings.UPLOAD_DIR)), name="uploads")

# Direct report download endpoints
@app.get("/api/download/report-pdf", summary="Download Complete Technical Specification PDF")
async def download_report_pdf():
    pdf_path = settings.BASE_DIR / "SAMUDRA_RAKSHAK_COMPLETE_TECH_SPEC.pdf"
    if pdf_path.exists():
        return FileResponse(
            str(pdf_path),
            media_type="application/pdf",
            filename="SAMUDRA_RAKSHAK_COMPLETE_TECH_SPEC.pdf",
        )
    return {"error": "Report PDF not found on disk"}

@app.get("/api/download/report-html", summary="Download Complete Technical Specification HTML")
async def download_report_html():
    html_path = settings.BASE_DIR / "SAMUDRA_RAKSHAK_COMPLETE_TECH_SPEC.html"
    if html_path.exists():
        return FileResponse(
            str(html_path),
            media_type="text/html",
            filename="SAMUDRA_RAKSHAK_COMPLETE_TECH_SPEC.html",
        )
    return {"error": "Report HTML not found on disk"}

# Static Frontend Production SPA Mount
FRONTEND_DIST_DIR = settings.BASE_DIR / "frontend" / "dist"

if FRONTEND_DIST_DIR.exists() and (FRONTEND_DIST_DIR / "index.html").exists():
    assets_dir = FRONTEND_DIST_DIR / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="frontend-assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        target_file = FRONTEND_DIST_DIR / full_path
        if full_path and target_file.is_file():
            return FileResponse(str(target_file))
        return FileResponse(str(FRONTEND_DIST_DIR / "index.html"))
else:
    @app.get("/", summary="Root Health Status")
    async def root():
        return {
            "service": settings.PROJECT_NAME,
            "status": "online",
            "docs": "/docs",
            "api": f"{settings.API_PREFIX}/health",
            "note": "Frontend build not found. Run 'npm run build' inside frontend/ to serve the SPA UI here.",
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host=settings.HOST, port=settings.PORT, reload=False)
