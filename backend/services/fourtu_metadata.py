"""Metadata and Navigation Extractor for External Sonar Data Sources."""

from __future__ import annotations

import csv
import json
import logging
import re
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from backend.services.sonar_geo import Ping

logger = logging.getLogger("FourTuMetadata")


@dataclass
class ExtractedSonarNavMetadata:
    """Standardized navigation and hydrographic parameters extracted from external sources."""
    has_navigation: bool = False
    nav_source: str = "NONE"  # XTF_EMBEDDED, SIDECAR_CSV, SIDECAR_KML, SIDECAR_JSON, NONE
    start_lat: Optional[float] = None
    start_lon: Optional[float] = None
    end_lat: Optional[float] = None
    end_lon: Optional[float] = None
    swath_range_m: float = 50.0
    altitude: float = 0.0
    heading: Optional[float] = None
    pings: List[Ping] = field(default_factory=list)
    raw_details: Dict[str, Any] = field(default_factory=dict)


class FourTuMetadataExtractor:
    """Extracts genuine navigation and spatial positioning from XTF or sidecar files."""

    @classmethod
    def extract_from_xtf(cls, xtf_path: Path) -> ExtractedSonarNavMetadata:
        """Extracts per-ping navigation and transducer altitude directly from XTF packets."""
        try:
            from backend.services.sonar_geo import load_xtf
            pings = load_xtf(str(xtf_path))
            if not pings:
                return ExtractedSonarNavMetadata(has_navigation=False, nav_source="XTF_EMPTY")

            start_p = pings[0]
            end_p = pings[-1]

            return ExtractedSonarNavMetadata(
                has_navigation=True,
                nav_source="XTF_EMBEDDED",
                start_lat=start_p.lat,
                start_lon=start_p.lon,
                end_lat=end_p.lat,
                end_lon=end_p.lon,
                heading=start_p.heading,
                altitude=start_p.altitude if start_p.altitude > 0 else 0.0,
                swath_range_m=50.0,
                pings=pings,
                raw_details={"total_pings": len(pings)},
            )
        except Exception as e:
            logger.warning(f"Could not extract nav from XTF {xtf_path.name}: {e}")
            return ExtractedSonarNavMetadata(has_navigation=False, nav_source="XTF_ERROR", raw_details={"error": str(e)})

    @classmethod
    def extract_from_csv(cls, csv_path: Path) -> ExtractedSonarNavMetadata:
        """Parses CSV navigation files with flexible column headers."""
        try:
            with open(csv_path, mode="r", encoding="utf-8", errors="replace") as f:
                reader = csv.DictReader(f)
                rows = list(reader)

            if not rows:
                return ExtractedSonarNavMetadata(has_navigation=False, nav_source="CSV_EMPTY")

            # Identify coordinate column names flexibly
            fieldnames = [k.lower().strip() for k in (rows[0].keys() or [])]
            lat_col = next((k for k in rows[0].keys() if k.lower().strip() in ["lat", "latitude", "y", "northing"]), None)
            lon_col = next((k for k in rows[0].keys() if k.lower().strip() in ["lon", "long", "longitude", "x", "easting"]), None)
            alt_col = next((k for k in rows[0].keys() if k.lower().strip() in ["altitude", "depth", "alt", "height"]), None)
            hdg_col = next((k for k in rows[0].keys() if k.lower().strip() in ["heading", "hdg", "course", "cog"]), None)

            if not lat_col or not lon_col:
                return ExtractedSonarNavMetadata(has_navigation=False, nav_source="CSV_NO_COORDS")

            pings: List[Ping] = []
            for r in rows:
                try:
                    lat_val = float(r[lat_col])
                    lon_val = float(r[lon_col])
                    alt_val = float(r[alt_col]) if alt_col and r.get(alt_col) else 0.0
                    hdg_val = float(r[hdg_col]) if hdg_col and r.get(hdg_col) else None
                    if -90 <= lat_val <= 90 and -180 <= lon_val <= 180 and not (abs(lat_val) < 1e-4 and abs(lon_val) < 1e-4):
                        pings.append(Ping(lat=lat_val, lon=lon_val, heading=hdg_val, altitude=alt_val))
                except (ValueError, TypeError):
                    continue

            if not pings:
                return ExtractedSonarNavMetadata(has_navigation=False, nav_source="CSV_NO_VALID_ROWS")

            return ExtractedSonarNavMetadata(
                has_navigation=True,
                nav_source="SIDECAR_CSV",
                start_lat=pings[0].lat,
                start_lon=pings[0].lon,
                end_lat=pings[-1].lat,
                end_lon=pings[-1].lon,
                heading=pings[0].heading,
                altitude=pings[0].altitude,
                swath_range_m=50.0,
                pings=pings,
                raw_details={"parsed_pings": len(pings)},
            )
        except Exception as e:
            logger.warning(f"Error reading nav CSV {csv_path.name}: {e}")
            return ExtractedSonarNavMetadata(has_navigation=False, nav_source="CSV_ERROR", raw_details={"error": str(e)})

    @classmethod
    def extract_from_kml(cls, kml_path: Path) -> ExtractedSonarNavMetadata:
        """Parses KML coordinate streams for survey trackline endpoints."""
        try:
            tree = ET.parse(str(kml_path))
            root = tree.getroot()
            # Find coordinates elements
            coords_elements = root.findall(".//{http://www.opengis.net/kml/2.2}coordinates")
            if not coords_elements:
                coords_elements = root.findall(".//coordinates")

            all_coords = []
            for elem in coords_elements:
                text = (elem.text or "").strip()
                for line in text.split():
                    parts = line.split(",")
                    if len(parts) >= 2:
                        try:
                            lon = float(parts[0])
                            lat = float(parts[1])
                            alt = float(parts[2]) if len(parts) > 2 else 0.0
                            if -90 <= lat <= 90 and -180 <= lon <= 180 and not (abs(lat) < 1e-4 and abs(lon) < 1e-4):
                                all_coords.append((lat, lon, alt))
                        except ValueError:
                            continue

            if not all_coords:
                return ExtractedSonarNavMetadata(has_navigation=False, nav_source="KML_NO_COORDS")

            pings = [Ping(lat=pt[0], lon=pt[1], altitude=pt[2]) for pt in all_coords]
            return ExtractedSonarNavMetadata(
                has_navigation=True,
                nav_source="SIDECAR_KML",
                start_lat=all_coords[0][0],
                start_lon=all_coords[0][1],
                end_lat=all_coords[-1][0],
                end_lon=all_coords[-1][1],
                altitude=all_coords[0][2],
                pings=pings,
                raw_details={"points_count": len(all_coords)},
            )
        except Exception as e:
            logger.warning(f"Error reading KML {kml_path.name}: {e}")
            return ExtractedSonarNavMetadata(has_navigation=False, nav_source="KML_ERROR", raw_details={"error": str(e)})

    @classmethod
    def find_companion_navigation(cls, image_path: Path, search_dir: Optional[Path] = None) -> ExtractedSonarNavMetadata:
        """Looks for matching sidecar navigation files (same basename or in directory)."""
        base_dir = search_dir or image_path.parent
        stem = image_path.stem.lower()

        # 1. Look for direct matches e.g. scan1.csv for scan1.png
        for ext in [".csv", ".txt", ".json", ".kml"]:
            candidate = base_dir / f"{image_path.stem}{ext}"
            if candidate.exists():
                if ext == ".csv":
                    return cls.extract_from_csv(candidate)
                elif ext == ".kml":
                    return cls.extract_from_kml(candidate)

        # 2. Look for any nav / positions / track file in directory
        for p in base_dir.glob("*.*"):
            p_name = p.name.lower()
            if any(term in p_name for term in ["nav", "position", "gps", "track", "ping"]):
                if p.suffix.lower() == ".csv":
                    res = cls.extract_from_csv(p)
                    if res.has_navigation:
                        return res
                elif p.suffix.lower() == ".kml":
                    res = cls.extract_from_kml(p)
                    if res.has_navigation:
                        return res

        return ExtractedSonarNavMetadata(has_navigation=False, nav_source="NONE")
