"""Database Session and Engine Setup using SQLAlchemy Async (SIH 26057)."""

import logging
import os
from typing import AsyncGenerator
from urllib.parse import urlparse, urlunparse

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from backend.config import settings

logger = logging.getLogger("Database")

raw_url = os.getenv("DATABASE_URL") or f"sqlite+aiosqlite:///{settings.DB_PATH}"

# Auto-adapt PostgreSQL dialect for asyncpg (e.g. from Neon, Supabase, Render)
if raw_url.startswith("postgres://"):
    raw_url = raw_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif raw_url.startswith("postgresql://") and not raw_url.startswith("postgresql+asyncpg://"):
    raw_url = raw_url.replace("postgresql://", "postgresql+asyncpg://", 1)

connect_args = {}
if "sqlite" in raw_url:
    connect_args["check_same_thread"] = False
elif "postgresql+asyncpg" in raw_url:
    # Strip query parameters like ?sslmode=require from the URL so asyncpg doesn't error
    parsed = urlparse(raw_url)
    clean_url = urlunparse((parsed.scheme, parsed.netloc, parsed.path, parsed.params, "", parsed.fragment))
    raw_url = clean_url
    # Pass SSL as a boolean for asyncpg
    connect_args["ssl"] = True

DATABASE_URL = raw_url

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    connect_args=connect_args,
)

async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def init_db() -> None:
    """Initializes all database tables on application startup and migrates columns if needed.
    Falls back gracefully to SQLite if remote PostgreSQL is unreachable.
    """
    global engine, async_session_maker, DATABASE_URL

    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            
            # SQLite-specific column migrations if needed
            if "sqlite" in DATABASE_URL:
                try:
                    res = await conn.execute(text("PRAGMA table_info(detections)"))
                    cols = [row[1] for row in res.fetchall()]
                    if cols and "anomaly_score" not in cols:
                        await conn.execute(text("ALTER TABLE detections ADD COLUMN anomaly_score FLOAT DEFAULT 0.0"))
                    if cols and "classification_source" not in cols:
                        await conn.execute(text("ALTER TABLE detections ADD COLUMN classification_source VARCHAR(32) DEFAULT 'detector'"))
                    if cols and "latitude" not in cols:
                        await conn.execute(text("ALTER TABLE detections ADD COLUMN latitude FLOAT"))
                    if cols and "longitude" not in cols:
                        await conn.execute(text("ALTER TABLE detections ADD COLUMN longitude FLOAT"))
                    if cols and "side" not in cols:
                        await conn.execute(text("ALTER TABLE detections ADD COLUMN side VARCHAR(16)"))
                    if cols and "range_from_nadir_m" not in cols:
                        await conn.execute(text("ALTER TABLE detections ADD COLUMN range_from_nadir_m FLOAT"))
                    if cols and "width_m" not in cols:
                        await conn.execute(text("ALTER TABLE detections ADD COLUMN width_m FLOAT"))
                    if cols and "length_m" not in cols:
                        await conn.execute(text("ALTER TABLE detections ADD COLUMN length_m FLOAT"))
                except Exception:
                    pass

                try:
                    res = await conn.execute(text("PRAGMA table_info(maritime_incidents)"))
                    inc_cols = [row[1] for row in res.fetchall()]
                    if inc_cols:
                        if "coordinate_source" not in inc_cols:
                            await conn.execute(text("ALTER TABLE maritime_incidents ADD COLUMN coordinate_source VARCHAR(128)"))
                        if "time_source" not in inc_cols:
                            await conn.execute(text("ALTER TABLE maritime_incidents ADD COLUMN time_source VARCHAR(128)"))
                        if "severity_source" not in inc_cols:
                            await conn.execute(text("ALTER TABLE maritime_incidents ADD COLUMN severity_source VARCHAR(128)"))
                        if "danger_radius_source" not in inc_cols:
                            await conn.execute(text("ALTER TABLE maritime_incidents ADD COLUMN danger_radius_source VARCHAR(128)"))
                        if "danger_radius_basis" not in inc_cols:
                            await conn.execute(text("ALTER TABLE maritime_incidents ADD COLUMN danger_radius_basis TEXT"))
                        if "author" not in inc_cols:
                            await conn.execute(text("ALTER TABLE maritime_incidents ADD COLUMN author VARCHAR(128)"))
                except Exception:
                    pass
        logger.info(f"Database initialized successfully with URL dialect: {engine.url.drivername}")
    except Exception as exc:
        logger.warning(f"Remote database initialization failed: {exc}. Falling back to local SQLite database.")
        sqlite_url = f"sqlite+aiosqlite:///{settings.DB_PATH}"
        DATABASE_URL = sqlite_url
        engine = create_async_engine(sqlite_url, echo=False, connect_args={"check_same_thread": False})
        async_session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Local SQLite fallback database initialized successfully.")


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency that yields an asynchronous database session."""
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()
