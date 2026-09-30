"""SeaRoutesNav Maritime Route Navigation Service (SIH 26057).

Integrates SeaRoutesNav API (https://api.searoutesnav.com) to provide:
1. Navigable sea route calculation between ports and coordinates.
2. Local route caching to preserve daily trial quotas (25 queries/day).
3. Geospatial intersection analysis between commercial shipping corridors
   and detected underwater sonar debris/hazards (Palk Strait, North Sea, Bay Islands).
"""

from __future__ import annotations
import json
import logging
import math
import time
import urllib.error
import urllib.request
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from backend.config import settings

logger = logging.getLogger("SeaRoutesService")


def _haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate great-circle distance between two points in kilometers."""
    R = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


class SeaRoutesService:
    """Manages SeaRoutesNav API authentication, route querying, and cache."""

    def __init__(self) -> None:
        self.api_url = settings.SEAROUTES_API_URL
        self.email = settings.SEAROUTES_EMAIL
        self.password = settings.SEAROUTES_PASSWORD
        self.cache_enabled = settings.SEAROUTES_CACHE_ENABLED
        self.cache_dir = settings.SEAROUTES_CACHE_DIR
        self.cache_dir.mkdir(parents=True, exist_ok=True)

        self._token: Optional[str] = None
        self._token_time: float = 0.0
        self._token_ttl_seconds: float = 3600 * 12  # 12 hours
        self._last_status_cache: Dict[str, Any] = {}
        self._last_status_time: float = 0.0

        # Standard Strategic Maritime Routes for project survey zones
        self.KEY_ROUTES = [
            {
                "id": "route_palk_strait_survey",
                "name": "Mandapam ⇄ Palk Strait Survey Corridor",
                "corridor": "Palk Strait Coastal Inshore Channel",
                "zone_code": "PALK_STRAIT",
                "origin": {"name": "Mandapam Port", "latitude": 9.2800, "longitude": 79.1200},
                "destination": {"name": "Point Pedro / Jaffna", "latitude": 9.8200, "longitude": 80.0400},
                "color": "#38bdf8",  # Sky blue
                "description": "Primary coastal hydrographic and naval patrol corridor passing directly across the Palk Strait sonar survey transects.",
            },
            {
                "id": "route_palk_chennai",
                "name": "Colombo ⇄ Chennai Coastal Shipping Lane",
                "corridor": "Indian Ocean & Palk Strait Corridor",
                "zone_code": "PALK_STRAIT",
                "origin": {"name": "Colombo Port", "latitude": 6.9535, "longitude": 79.8465},
                "destination": {"name": "Chennai Port", "latitude": 13.0827, "longitude": 80.2707},
                "color": "#06b6d4",  # Cyan
                "description": "Primary merchant shipping lane skirting Gulf of Mannar and Palk Strait acoustic survey zone.",
            },
            {
                "id": "route_northsea_4tu",
                "name": "Rotterdam ⇄ Hull Inter-European Route",
                "corridor": "North Sea Commercial Highway",
                "zone_code": "NORTH_SEA_4TU",
                "origin": {"name": "Rotterdam Europort", "latitude": 51.9500, "longitude": 4.1400},
                "destination": {"name": "Port of Hull", "latitude": 53.7300, "longitude": -0.3300},
                "color": "#38bdf8",  # Sky blue
                "description": "High-density North Sea transit passing adjacent to 4TU.ResearchData NIOZ benthic acoustic transects.",
            },
            {
                "id": "route_bay_islands_nasa",
                "name": "Puerto Cortés ⇄ Roatán Island Channel",
                "corridor": "Caribbean Sea Marine Debris Sector",
                "zone_code": "BAY_ISLANDS_NASA",
                "origin": {"name": "Puerto Cortés", "latitude": 15.8300, "longitude": -87.9500},
                "destination": {"name": "Roatán Island", "latitude": 16.3300, "longitude": -86.5300},
                "color": "#10b981",  # Emerald
                "description": "Caribbean navigation lane intersecting NASA PlanetScope optical debris study clusters.",
            },
            {
                "id": "route_malacca_strait",
                "name": "Singapore ⇄ Port Klang (Malacca Strait)",
                "corridor": "Malacca High-Traffic Chokepoint",
                "zone_code": "MALACCA_CHOKEPOINT",
                "origin": {"name": "Port of Singapore", "latitude": 1.2600, "longitude": 103.8200},
                "destination": {"name": "Port Klang", "latitude": 3.0000, "longitude": 101.3500},
                "color": "#818cf8",  # Indigo
                "description": "Global maritime chokepoint connecting Indian Ocean and South China Sea.",
            },
        ]

    def _get_cache_path(self, lat1: float, lon1: float, lat2: float, lon2: float) -> Path:
        filename = f"route_{lat1:.4f}_{lon1:.4f}_{lat2:.4f}_{lon2:.4f}.json"
        return self.cache_dir / filename

    def authenticate(self, force_refresh: bool = False) -> Optional[str]:
        """Authenticate with SeaRoutesNav API and return bearer token."""
        if not self.email or not self.password:
            logger.warning("SeaRoutesNav credentials not configured in settings/env.")
            return None

        now = time.time()
        if not force_refresh and self._token and (now - self._token_time < self._token_ttl_seconds):
            return self._token

        login_url = f"{self.api_url}/auth/login"
        payload = json.dumps({"email": self.email, "password": self.password}).encode("utf-8")
        req = urllib.request.Request(
            login_url,
            data=payload,
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
                "User-Agent": "SIH26057-SonarMaritimeApp/1.0",
            },
        )

        try:
            with urllib.request.urlopen(req, timeout=12) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                token = data.get("access_token")
                if token:
                    self._token = token
                    self._token_time = now
                    logger.info("Successfully authenticated with SeaRoutesNav API.")
                    return token
                logger.error("SeaRoutesNav login response missing access_token.")
                return None
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="ignore")
            logger.error("SeaRoutesNav login failed (HTTP %s): %s", e.code, err_body)
            return None
        except Exception as e:
            logger.error("SeaRoutesNav login exception: %s", e)
            return None

    def get_status(self) -> Dict[str, Any]:
        """Get live status, credentials check, and daily quota usage."""
        now = time.time()
        if self._last_status_cache and (now - self._last_status_time < 30.0):
            return self._last_status_cache

        token = self.authenticate()
        profile: Dict[str, Any] = {}
        usage: Dict[str, Any] = {}
        error: Optional[str] = None

        if token:
            for attempt in range(2):
                headers = {
                    "Authorization": f"Bearer {token}",
                    "Accept": "application/json",
                    "User-Agent": "SIH26057-SonarMaritimeApp/1.0",
                }
                need_refresh = False
                try:
                    req_usage = urllib.request.Request(f"{self.api_url}/auth/usage", headers=headers)
                    with urllib.request.urlopen(req_usage, timeout=6) as r:
                        usage = json.loads(r.read().decode("utf-8"))
                except urllib.error.HTTPError as e:
                    if e.code == 401:
                        need_refresh = True
                    else:
                        logger.warning("Could not fetch SeaRoutesNav usage: %s", e)
                except Exception as e:
                    logger.warning("Could not fetch SeaRoutesNav usage: %s", e)

                try:
                    req_me = urllib.request.Request(f"{self.api_url}/auth/me", headers=headers)
                    with urllib.request.urlopen(req_me, timeout=6) as r:
                        profile = json.loads(r.read().decode("utf-8"))
                except urllib.error.HTTPError as e:
                    if e.code == 401:
                        need_refresh = True
                    else:
                        logger.warning("Could not fetch SeaRoutesNav profile: %s", e)
                except Exception as e:
                    logger.warning("Could not fetch SeaRoutesNav profile: %s", e)

                if need_refresh and attempt == 0:
                    token = self.authenticate(force_refresh=True)
                    if not token:
                        break
                else:
                    break
        else:
            error = "Authentication failed or credentials missing in .env"

        cached_files = list(self.cache_dir.glob("route_*.json"))

        status_result = {
            "enabled": bool(self.email and self.password),
            "api_url": self.api_url,
            "account_email": self.email,
            "authenticated": bool(token),
            "plan_type": usage.get("plan_type") or profile.get("plan_type", "trial"),
            "daily_limit": usage.get("daily_limit", 25),
            "today_usage": usage.get("today_usage", 0),
            "remaining_queries": usage.get("remaining_queries", 25),
            "plan_expires_at": usage.get("plan_expires_at") or profile.get("plan_expires_at"),
            "cached_routes_count": len(cached_files),
            "active_routes_count": len(self.KEY_ROUTES),
            "cache_dir": str(self.cache_dir),
            "error": error,
        }
        self._last_status_cache = status_result
        self._last_status_time = now
        return status_result

    def search_ports(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Search ports by name using SeaRoutesNav autocomplete endpoint."""
        token = self.authenticate()
        if not token or not query:
            return []

        encoded_q = urllib.parse.quote(query.strip())
        url = f"{self.api_url}/search-ports?q={encoded_q}&limit={limit}"
        req = urllib.request.Request(
            url,
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/json",
                "User-Agent": "SIH26057-SonarMaritimeApp/1.0",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=8) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            logger.warning("SeaRoutesNav port search failed for '%s': %s", query, e)
            return []

    def calculate_route(
        self,
        origin_lat: float,
        origin_lon: float,
        dest_lat: float,
        dest_lon: float,
        route_name: Optional[str] = None,
        zone_code: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Calculate navigable sea route between coordinates, with persistent caching."""
        cache_file = self._get_cache_path(origin_lat, origin_lon, dest_lat, dest_lon)

        # 1. Check local cache
        if self.cache_enabled and cache_file.exists():
            try:
                with open(cache_file, "r", encoding="utf-8") as f:
                    cached_data = json.load(f)
                    cached_data["cached"] = True
                    if route_name:
                        cached_data["name"] = route_name
                    if zone_code:
                        cached_data["zone_code"] = zone_code
                    return cached_data
            except Exception as e:
                logger.warning("Failed reading cached route %s: %s", cache_file.name, e)

        # 2. Call SeaRoutesNav API
        token = self.authenticate()
        if not token:
            return self._build_synthetic_sea_route(origin_lat, origin_lon, dest_lat, dest_lon, route_name, zone_code)

        url = f"{self.api_url}/calculate-route"
        payload = json.dumps({
            "origin": {"coordinates": {"latitude": origin_lat, "longitude": origin_lon}},
            "destination": {"coordinates": {"latitude": dest_lat, "longitude": dest_lon}},
        }).encode("utf-8")

        req = urllib.request.Request(
            url,
            data=payload,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
                "Accept": "application/json",
                "User-Agent": "SIH26057-SonarMaritimeApp/1.0",
            },
        )

        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                if route_name:
                    data["name"] = route_name
                if zone_code:
                    data["zone_code"] = zone_code
                data["cached"] = False

                # Save to disk cache to preserve the 25-query/day quota
                if self.cache_enabled:
                    try:
                        with open(cache_file, "w", encoding="utf-8") as f:
                            json.dump(data, f, indent=2)
                        logger.info("Saved SeaRoutesNav calculated route to cache: %s", cache_file.name)
                    except Exception as e:
                        logger.warning("Could not write route cache %s: %s", cache_file.name, e)

                return data
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="ignore")
            logger.warning("SeaRoutesNav calculate-route returned HTTP %s: %s", e.code, err_body)
            # Fallback gracefully
            return self._build_synthetic_sea_route(origin_lat, origin_lon, dest_lat, dest_lon, route_name, zone_code)
        except Exception as e:
            logger.error("SeaRoutesNav calculate-route failed: %s", e)
            return self._build_synthetic_sea_route(origin_lat, origin_lon, dest_lat, dest_lon, route_name, zone_code)

    def _build_synthetic_sea_route(
        self,
        lat1: float,
        lon1: float,
        lat2: float,
        lon2: float,
        name: Optional[str] = None,
        zone_code: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Fallback navigable interpolation if API quota is reached or network is unavailable."""
        dist_km = _haversine_distance_km(lat1, lon1, lat2, lon2)
        dist_nm = dist_km * 0.539957
        duration_hrs = dist_nm / 12.0  # at standard 12 knots

        # Generate intermediate waypoints
        num_pts = max(5, int(dist_km / 50.0))
        coords = []
        for i in range(num_pts + 1):
            t = i / float(num_pts)
            lat = lat1 + (lat2 - lat1) * t
            lon = lon1 + (lon2 - lon1) * t
            coords.append([round(lon, 5), round(lat, 5)])

        return {
            "success": True,
            "message": "Fallback marine corridor (SeaRoutesNav quota preservation / offline)",
            "name": name or f"Transit ({lat1:.2f},{lon1:.2f}) → ({lat2:.2f},{lon2:.2f})",
            "zone_code": zone_code or "OFFLINE_TRANSIT",
            "distance_nm": round(dist_nm, 2),
            "duration_hours": round(duration_hrs, 2),
            "route_coordinates": coords,
            "waypoints": [],
            "cached": True,
            "is_fallback": True,
        }

    def get_all_active_routes(self, db_targets: Optional[List[Dict[str, Any]]] = None) -> List[Dict[str, Any]]:
        """Fetch all strategic key routes with debris proximity hazard warnings."""
        routes_output = []

        for r_spec in self.KEY_ROUTES:
            route_data = self.calculate_route(
                origin_lat=r_spec["origin"]["latitude"],
                origin_lon=r_spec["origin"]["longitude"],
                dest_lat=r_spec["destination"]["latitude"],
                dest_lon=r_spec["destination"]["longitude"],
                route_name=r_spec["name"],
                zone_code=r_spec["zone_code"],
            )

            # Analyze proximity to detected sonar / external targets
            coords = route_data.get("route_coordinates", [])
            hazard_alerts = []
            min_dist_to_hazard_km = 999999.0

            if db_targets and coords:
                for target in db_targets:
                    t_lat = target.get("latitude")
                    t_lon = target.get("longitude")
                    if t_lat is None or t_lon is None:
                        continue

                    # Check minimum distance to any route coordinate segment
                    for pt in coords:
                        # pt is [lon, lat] in GeoJSON format
                        p_lon, p_lat = pt[0], pt[1]
                        d = _haversine_distance_km(p_lat, p_lon, t_lat, t_lon)
                        if d < min_dist_to_hazard_km:
                            min_dist_to_hazard_km = d

                        # If within 25 km of shipping corridor, log proximity
                        if d <= 25.0:
                            hazard_alerts.append({
                                "detection_id": target.get("id"),
                                "class_name": target.get("class_name", "marine_hazard"),
                                "severity": target.get("severity", "MEDIUM"),
                                "distance_km": round(d, 2),
                                "latitude": t_lat,
                                "longitude": t_lon,
                                "source": target.get("source", "Sonar Scan"),
                            })
                            break  # Avoid duplicates for same target

            # Format enriched route object
            enriched = {
                "id": r_spec["id"],
                "name": r_spec["name"],
                "corridor": r_spec["corridor"],
                "zone_code": r_spec["zone_code"],
                "color": r_spec["color"],
                "description": r_spec["description"],
                "origin": r_spec["origin"],
                "destination": r_spec["destination"],
                "distance_nm": route_data.get("distance_nm", 0.0),
                "duration_hours": route_data.get("duration_hours", 0.0),
                "route_coordinates": coords,
                "waypoints": route_data.get("waypoints", []),
                "cached": route_data.get("cached", False),
                "is_fallback": route_data.get("is_fallback", False),
                "hazard_count": len(hazard_alerts),
                "nearest_hazard_km": round(min_dist_to_hazard_km, 2) if min_dist_to_hazard_km < 999999.0 else None,
                "hazard_alerts": hazard_alerts[:5],  # top 5 nearest hazards
            }
            routes_output.append(enriched)

        return routes_output


# Global singleton instance
searoutes_service = SeaRoutesService()
