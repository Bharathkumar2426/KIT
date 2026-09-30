"""
sonar_geo.py - place at backend/services/sonar_geo.py

Converts detections (pixel boxes on a side-scan waterfall image) into
real-world lat/lon + size in metres, and writes JSON/CSV anomaly reports.

Image layout assumed: rows = pings (along-track), columns = across-track,
port on the left half, starboard on the right half, nadir at the centre.
"""
import csv
from datetime import datetime, timezone
import json
import math
from dataclasses import dataclass
from typing import List, Optional

R_EARTH = 6371000.0


# ---------- geodesy helpers ----------
def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = p2 - p1
    dlmb = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return 2 * R_EARTH * math.asin(math.sqrt(max(0.0, min(1.0, a))))


def bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dl = math.radians(lon2 - lon1)
    y = math.sin(dl) * math.cos(p2)
    x = math.cos(p1) * math.sin(p2) - math.sin(p1) * math.cos(p2) * math.cos(dl)
    return (math.degrees(math.atan2(y, x)) + 360) % 360


def destination(lat: float, lon: float, brg_deg: float, dist_m: float):
    phi1, lmb1 = math.radians(lat), math.radians(lon)
    th, d = math.radians(brg_deg), dist_m / R_EARTH
    phi2 = math.asin(math.sin(phi1) * math.cos(d) + math.cos(phi1) * math.sin(d) * math.cos(th))
    lmb2 = lmb1 + math.atan2(
        math.sin(th) * math.sin(d) * math.cos(phi1),
        math.cos(d) - math.sin(phi1) * math.sin(phi2),
    )
    return math.degrees(phi2), (math.degrees(lmb2) + 540) % 360 - 180


# ---------- navigation data ----------
@dataclass
class Ping:
    lat: float
    lon: float
    heading: Optional[float] = None   # degrees, may be missing
    altitude: float = 0.0             # sensor height above seabed (m)


def load_nav_csv(path: str) -> List[Ping]:
    """CSV columns: lat, lon, [heading], [altitude]. One row per ping."""
    pings = []
    with open(path, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            pings.append(Ping(
                float(r["lat"]), float(r["lon"]),
                float(r["heading"]) if r.get("heading") not in (None, "") else None,
                float(r["altitude"]) if r.get("altitude") not in (None, "") else 0.0,
            ))
    return pings


def load_xtf(path: str) -> List[Ping]:
    """Needs `pip install pyxtf`. Verify field names/units against your files:
    some XTF files store coordinates in metres (UTM) instead of degrees."""
    try:
        import pyxtf
    except ImportError as e:
        raise ImportError("pyxtf is required to load XTF files. Please install pyxtf.") from e

    _, packets = pyxtf.xtf_read(path)
    out = []
    for p in packets[pyxtf.XTFHeaderType.sonar]:
        out.append(Ping(
            lat=p.SensorYcoordinate,
            lon=p.SensorXcoordinate,
            heading=getattr(p, "SensorHeading", None),
            altitude=getattr(p, "SensorPrimaryAltitude", 0.0) or 0.0,
        ))
    return out


def from_endpoints(start, end, n_pings: int, altitude: float = 0.0) -> List[Ping]:
    """Fallback when the image has no metadata: straight track from
    start=(lat, lon) to end=(lat, lon), linearly interpolated."""
    hdg = bearing(*start, *end)
    return [
        Ping(start[0] + (end[0] - start[0]) * i / max(n_pings - 1, 1),
             start[1] + (end[1] - start[1]) * i / max(n_pings - 1, 1),
             hdg, altitude)
        for i in range(n_pings)
    ]


# ---------- georeferencer ----------
class SonarGeoreferencer:
    def __init__(self, pings: List[Ping], img_w: int, img_h: int,
                 swath_range_m: float, slant_corrected: bool = True):
        if len(pings) < 2:
            raise ValueError("Need at least 2 pings")
        self.pings, self.w, self.h = pings, img_w, img_h
        self.range_m = swath_range_m          # range per side (nadir to edge)
        self.slant_corrected = slant_corrected
        self._fill_headings()

    def _fill_headings(self):
        n = len(self.pings)
        for i, p in enumerate(self.pings):
            if p.heading is None:
                a, b = self.pings[max(i - 1, 0)], self.pings[min(i + 1, n - 1)]
                p.heading = bearing(a.lat, a.lon, b.lat, b.lon)

    def _ping_at(self, row: float) -> Ping:
        idx = min(max(row * len(self.pings) / self.h, 0), len(self.pings) - 1)
        return self.pings[int(idx)]

    def _ground_range(self, col: float) -> float:
        """Across-track distance from nadir (m), signed: - port, + starboard."""
        half = self.w / 2
        rng = (col - half) / half * self.range_m
        return rng  # slant->ground handled per ping in locate()

    def locate(self, box):
        """box = (x1, y1, x2, y2) in pixels. Returns dict with lat, lon, size."""
        x1, y1, x2, y2 = box
        cx, cy = (x1 + x2) / 2, (y1 + y2) / 2
        ping = self._ping_at(cy)

        signed = self._ground_range(cx)
        side = "starboard" if signed >= 0 else "port"
        slant = abs(signed)
        if self.slant_corrected:
            ground = slant
        else:
            ground = math.sqrt(max(slant ** 2 - ping.altitude ** 2, 0.0))

        brg = (ping.heading + (90 if side == "starboard" else -90)) % 360
        lat, lon = destination(ping.lat, ping.lon, brg, ground)

        # size: across-track from pixel scale, along-track from ping positions
        m_per_px = self.range_m / (self.w / 2)
        width_m = abs(x2 - x1) * m_per_px
        i1 = int(min(max(y1 * len(self.pings) / self.h, 0), len(self.pings) - 1))
        i2 = int(min(max(y2 * len(self.pings) / self.h, 0), len(self.pings) - 1))
        length_m = sum(
            haversine(self.pings[i].lat, self.pings[i].lon,
                      self.pings[i + 1].lat, self.pings[i + 1].lon)
            for i in range(i1, max(i2, i1 + 1) if i2 < len(self.pings) - 1 else i2)
        )
        return {
            "latitude": round(lat, 7),
            "longitude": round(lon, 7),
            "side": side,
            "range_from_nadir_m": round(ground, 2),
            "width_m": round(width_m, 2),
            "length_m": round(length_m, 2),
        }


# ---------- report ----------
def build_report(scan_id: str, detections: list, geo: Optional[SonarGeoreferencer] = None) -> dict:
    """detections: [{'class': str, 'confidence': 0-1, 'bbox': [x1,y1,x2,y2], ...}, ...]"""
    items = []
    for i, d in enumerate(detections, 1):
        cname = d.get("class_name") or d.get("class") or d.get("classification") or "unknown"
        conf = float(d.get("confidence", 0.0))
        # Handle bbox format
        bbox = d.get("bbox") or d.get("bbox_px") or [0, 0, 0, 0]
        if isinstance(bbox, dict):
            bbox = [bbox.get("x", 0), bbox.get("y", 0), bbox.get("x", 0) + bbox.get("width", 0), bbox.get("y", 0) + bbox.get("height", 0)]

        if geo is not None:
            loc = geo.locate(bbox)
        else:
            loc = {
                "latitude": d.get("latitude"),
                "longitude": d.get("longitude"),
                "side": d.get("side"),
                "range_from_nadir_m": d.get("range_from_nadir_m"),
                "width_m": d.get("width_m"),
                "length_m": d.get("length_m"),
            }

        items.append({
            "id": d.get("id", i),
            "classification": cname,
            "confidence_pct": round(conf * 100 if conf <= 1.0 else conf, 1),
            "bbox_px": bbox,
            **loc,
        })
    return {
        "scan_id": scan_id,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total_detections": len(items),
        "detections": items,
    }


def write_json(report: dict, path: str):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)


def write_csv(report: dict, path: str):
    rows = report.get("detections", [])
    if not rows:
        # Write header with empty rows
        fieldnames = ["id", "classification", "confidence_pct", "bbox_px", "latitude", "longitude", "side", "range_from_nadir_m", "width_m", "length_m"]
        with open(path, "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=fieldnames)
            w.writeheader()
        return
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)


if __name__ == "__main__":
    # quick self-test with a synthetic straight track heading north
    pings = from_endpoints((9.9000, 78.1000), (9.9100, 78.1000), n_pings=1000)
    geo = SonarGeoreferencer(pings, img_w=1024, img_h=1000, swath_range_m=50)
    rep = build_report("demo", [{"class": "ghost_net", "confidence": 0.87,
                                 "bbox": [700, 400, 760, 470]}], geo)
    print(json.dumps(rep, indent=2))
