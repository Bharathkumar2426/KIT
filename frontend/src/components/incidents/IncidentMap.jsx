import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { 
  Layers, ShieldAlert, AlertTriangle, Compass, MapPin, 
  ZoomIn, ZoomOut, RotateCcw, Globe, Ship, Eye, Radio, ExternalLink,
  Flame, Droplets, LifeBuoy, Waves, Box, Navigation, BellRing, Maximize2
} from 'lucide-react';
import { getAisVessels, connectAisWebSocket } from '../../services/aisApi';
import { triggerTestIncidentBreach } from '../../services/incidentApi';

const CARTO_KEY = 'cb1_2yon_1_9ffb76d43983d1d23dee75e8';

const BASEMAPS = {
  cartoDark: {
    name: '🌑 CARTO Dark Matter',
    url: `https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png?key=${CARTO_KEY}`,
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    maxZoom: 19,
  },
  esriOcean: {
    name: '🌊 World Ocean Bathymetry',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; GEBCO, NOAA',
    maxZoom: 13,
  },
  osm: {
    name: '🗺️ Nautical Chart (OSM)',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  },
};

const SEVERITY_COLORS = {
  CRITICAL: '#ef4444',
  HIGH: '#f59e0b',
  MEDIUM: '#eab308',
  LOW: '#10b981',
};

const INCIDENT_ICONS = {
  Collision: '💥',
  'Vessel Sinking': '🚢⚓',
  'Ship Grounding': '⚓',
  'Vessel Fire / Explosion': '🔥',
  'Oil Spill / Marine Pollution': '🛢️',
  'Distress / Search & Rescue': '🛟',
  'Missing Vessel': '❓',
  'Navigation Hazard': '⚠️',
  'Floating Debris / Dangerous Object': '📦',
  'Tsunami / Swell Surge': '🌊',
  'High Waves / Storm Surge': '🌊',
  'Severe Marine Weather / Cyclone': '🌀',
  'Space Debris / Satellite Impact': '🛰️',
  Other: '⚠️',
};

function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const r = 6371.0;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return r * c;
}

export function IncidentMap({
  incidents = [],
  selectedIncident = null,
  onSelectIncident,
  onOpenConfirmation,
  onBreachTriggered,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);

  // Layer Groups
  const dangerZonesLayerRef = useRef(null);
  const vesselTracksLayerRef = useRef(null);
  const liveVesselsLayerRef = useRef(null);
  const incidentsLayerRef = useRef(null);

  const [activeBasemap, setActiveBasemap] = useState('cartoDark');
  const [liveVessels, setLiveVessels] = useState([]);
  const [isSimulatingBreach, setIsSimulatingBreach] = useState(false);

  // Layer Visibility Controls
  const [layers, setLayers] = useState({
    incidents: true,
    dangerZones: true,
    liveVessels: true,
    approachVectors: true,
    criticalOnly: false,
  });

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [15.0, 75.0],
      zoom: 4,
      minZoom: 2,
      maxZoom: 19,
      zoomControl: false,
    });

    const bm = BASEMAPS[activeBasemap] || BASEMAPS.cartoDark;
    const tileLayer = L.tileLayer(bm.url, {
      attribution: bm.attribution,
      maxZoom: bm.maxZoom,
    }).addTo(map);

    tileLayerRef.current = tileLayer;

    // Add Layer Groups in correct rendering z-index order
    dangerZonesLayerRef.current = L.layerGroup().addTo(map);
    vesselTracksLayerRef.current = L.layerGroup().addTo(map);
    liveVesselsLayerRef.current = L.layerGroup().addTo(map);
    incidentsLayerRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Handle Basemap Switch
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    const map = mapInstanceRef.current;
    const bm = BASEMAPS[activeBasemap] || BASEMAPS.cartoDark;
    map.removeLayer(tileLayerRef.current);
    tileLayerRef.current = L.tileLayer(bm.url, {
      attribution: bm.attribution,
      maxZoom: bm.maxZoom,
    }).addTo(map);
  }, [activeBasemap]);

  // Load and poll live AIS vessels (every 3 seconds) & WebSocket stream
  useEffect(() => {
    let isMounted = true;

    const fetchVessels = async () => {
      try {
        const vessels = await getAisVessels();
        if (isMounted && Array.isArray(vessels)) {
          setLiveVessels(vessels);
        }
      } catch (err) {
        console.debug('Failed to fetch live AIS vessels:', err);
      }
    };

    fetchVessels();
    const interval = setInterval(fetchVessels, 3000);

    // Also connect WebSocket for real-time streaming updates
    const wsController = connectAisWebSocket({
      onInitialState: (data) => {
        if (isMounted && data?.vessels) {
          setLiveVessels(data.vessels);
        }
      },
      onVesselUpdate: (vessel) => {
        if (!isMounted || !vessel) return;
        setLiveVessels((prev) => {
          const idx = prev.findIndex((v) => v.mmsi === vessel.mmsi);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = vessel;
            return next;
          }
          return [...prev, vessel];
        });
      },
    });

    return () => {
      isMounted = false;
      clearInterval(interval);
      if (wsController) wsController.disconnect();
    };
  }, []);

  // Render All Incidents (Confirmed + Candidate reports) & Danger Zones
  useEffect(() => {
    if (!mapInstanceRef.current || !incidentsLayerRef.current || !dangerZonesLayerRef.current) return;

    incidentsLayerRef.current.clearLayers();
    dangerZonesLayerRef.current.clearLayers();

    if (!layers.incidents) return;

    // Filter all incidents that have valid coordinates
    let displayIncidents = incidents.filter(
      (inc) => inc.latitude !== null && inc.longitude !== null
    );

    if (layers.criticalOnly) {
      displayIncidents = displayIncidents.filter((inc) => inc.severity === 'CRITICAL');
    }

    displayIncidents.forEach((inc) => {
      const color = SEVERITY_COLORS[inc.severity] || '#f59e0b';
      const isSelected = selectedIncident?.incident_id === inc.incident_id;
      const isMapped = Boolean(inc.is_mapped);
      const categoryIcon = INCIDENT_ICONS[inc.incident_type] || '⚠️';
      const dangerRadiusKm = inc.affected_area_radius_km || 5.0;

      // 1. Render Danger Zone Geofence Circle (if dangerZones layer is on)
      if (layers.dangerZones && (isMapped || isSelected)) {
        const radiusMeters = dangerRadiusKm * 1000.0;
        const circle = L.circle([inc.latitude, inc.longitude], {
          radius: radiusMeters,
          color: color,
          weight: isSelected ? 3 : isMapped ? 2 : 1,
          dashArray: isMapped ? '5, 5' : '8, 8',
          fillColor: color,
          fillOpacity: isSelected ? 0.25 : isMapped ? 0.18 : 0.08,
        });

        circle.bindTooltip(
          `<strong>Danger Zone (${dangerRadiusKm} km):</strong> ${inc.title}`,
          { sticky: true, className: 'leaflet-tooltip-dark' }
        );

        circle.on('click', () => {
          if (onSelectIncident) onSelectIncident(inc);
        });

        dangerZonesLayerRef.current.addLayer(circle);
      }

      // 2. Render Incident Marker
      const markerSize = isSelected ? 40 : isMapped ? 32 : 28;
      const markerHtml = `
        <div style="
          width: ${markerSize}px;
          height: ${markerSize}px;
          border-radius: 50%;
          background: ${color};
          border: ${isSelected ? '3.5px solid #ffffff' : isMapped ? '2.5px solid #ffffff' : '2px dashed #ffffff'};
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 ${isSelected ? '20px' : '10px'} ${color};
          cursor: pointer;
          transition: all 0.2s;
        ">
          <span style="font-size: ${isSelected ? '18px' : isMapped ? '14px' : '12px'};">${categoryIcon}</span>
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: 'custom-incident-marker',
        iconSize: [markerSize, markerSize],
        iconAnchor: [markerSize / 2, markerSize / 2],
      });

      const marker = L.marker([inc.latitude, inc.longitude], { icon: customIcon });

      const popupContent = `
        <div style="font-family: monospace; font-size: 11px; color: #f1f5f9; min-width: 250px; line-height: 1.4;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <strong style="color: #38bdf8; font-size: 12px;">#${inc.incident_id}</strong>
            <span style="background: ${color}33; color: ${color}; border: 1px solid ${color}88; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px;">
              ${inc.severity}
            </span>
          </div>
          <strong style="font-size: 12px; color: #fff; display: block; margin-bottom: 4px;">${inc.title}</strong>
          <div style="color: #94a3b8; margin-bottom: 2px;"><strong>Category:</strong> ${inc.incident_type}</div>
          <div style="color: #94a3b8; margin-bottom: 2px;"><strong>Location:</strong> ${inc.location_text} (${inc.latitude.toFixed(4)}°N, ${inc.longitude.toFixed(4)}°E)</div>
          <div style="color: #94a3b8; margin-bottom: 2px;"><strong>Precision:</strong> ${inc.location_precision}</div>
          <div style="color: #fbbf24; margin-bottom: 4px;"><strong>Danger Zone:</strong> ⭕ ${dangerRadiusKm} km Exclusion</div>
          <div style="color: #34d399; margin-bottom: 6px;"><strong>Sources:</strong> ${inc.sources?.length || 1} verified citations</div>
          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #334155; padding-top: 6px; margin-top: 4px;">
            <span style="font-size: 10px; color: ${isMapped ? '#34d399' : '#fbbf24'}; font-weight: bold;">
              ${isMapped ? '● ACTIVE ON MAP' : '○ PENDING OPERATOR CONFIRMATION'}
            </span>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, { className: 'leaflet-popup-dark' });
      marker.on('click', () => {
        if (onSelectIncident) onSelectIncident(inc);
      });

      incidentsLayerRef.current.addLayer(marker);
    });
  }, [incidents, selectedIncident, layers]);

  // Render Live AIS Fleet, Geofence Proximity, and Approach Vectors
  useEffect(() => {
    if (!mapInstanceRef.current || !liveVesselsLayerRef.current || !vesselTracksLayerRef.current) return;

    liveVesselsLayerRef.current.clearLayers();
    vesselTracksLayerRef.current.clearLayers();

    if (!layers.liveVessels || liveVessels.length === 0) return;

    // Get all mapped incidents to evaluate proximity
    const mappedIncidents = incidents.filter(
      (inc) => inc.is_mapped && inc.latitude !== null && inc.longitude !== null
    );

    liveVessels.forEach((v) => {
      if (v.latitude === null || v.longitude === null) return;

      // Check proximity to every mapped incident danger zone
      let closestDist = Infinity;
      let closestIncident = null;
      let isInsideZone = false;
      let isApproaching = false;

      mappedIncidents.forEach((inc) => {
        const d = haversineDistanceKm(v.latitude, v.longitude, inc.latitude, inc.longitude);
        const radius = inc.affected_area_radius_km || 5.0;
        if (d < closestDist) {
          closestDist = d;
          closestIncident = inc;
        }
        if (d <= radius) {
          isInsideZone = true;
          closestIncident = inc;
        } else if (d <= (radius + 5.0)) {
          isApproaching = true;
          if (!closestIncident) closestIncident = inc;
        }
      });

      // Vessel Marker Styling
      const color = isInsideZone ? '#ef4444' : isApproaching ? '#f59e0b' : '#38bdf8';
      const size = isInsideZone ? 28 : isApproaching ? 24 : 20;

      const vIconHtml = `
        <div style="
          width: ${size}px;
          height: ${size}px;
          border-radius: 50%;
          background: ${color};
          border: ${isInsideZone ? '2.5px solid #ffffff' : '1.5px solid #ffffff'};
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 ${isInsideZone ? '14px #ef4444' : '4px #38bdf8'};
          transform: rotate(${v.course_deg || 0}deg);
        ">
          <span style="font-size: ${isInsideZone ? '13px' : '10px'};">🚢</span>
        </div>
      `;

      const vIcon = L.divIcon({
        html: vIconHtml,
        className: 'custom-vessel-marker',
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const vMarker = L.marker([v.latitude, v.longitude], { icon: vIcon });

      const vesselTooltip = isInsideZone
        ? `<strong style="color: #ef4444;">🚨 INSIDE DANGER ZONE:</strong> ${v.ship_name || v.mmsi}<br/>Hazard: ${closestIncident?.title}<br/>Speed: ${v.speed_knots || 0} kn | Course: ${v.course_deg || 0}°`
        : isApproaching
        ? `<strong style="color: #f59e0b;">⚠️ APPROACHING HAZARD:</strong> ${v.ship_name || v.mmsi}<br/>Distance: ${closestDist.toFixed(1)} km to ${closestIncident?.title}`
        : `<strong>${v.ship_name || 'Live AIS Vessel'}</strong> (MMSI: ${v.mmsi})<br/>Speed: ${v.speed_knots || 0} kn | Course: ${v.course_deg || 0}°`;

      vMarker.bindTooltip(vesselTooltip, { sticky: true, className: 'leaflet-tooltip-dark' });

      liveVesselsLayerRef.current.addLayer(vMarker);

      // Draw Approach Vector Line to Incident Epicenter
      if (layers.approachVectors && (isInsideZone || isApproaching) && closestIncident) {
        const line = L.polyline(
          [
            [v.latitude, v.longitude],
            [closestIncident.latitude, closestIncident.longitude],
          ],
          {
            color: color,
            weight: isInsideZone ? 2.5 : 1.5,
            dashArray: isInsideZone ? '4, 4' : '8, 8',
            opacity: isInsideZone ? 0.9 : 0.6,
          }
        );
        vesselTracksLayerRef.current.addLayer(line);
      }
    });
  }, [liveVessels, incidents, layers]);

  // Center on Selected Incident
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedIncident) return;
    if (selectedIncident.latitude !== null && selectedIncident.longitude !== null) {
      mapInstanceRef.current.flyTo([selectedIncident.latitude, selectedIncident.longitude], 7.5, {
        duration: 1.2,
      });
    }
  }, [selectedIncident?.incident_id]);

  // Fit All Incidents View
  const handleFitAllIncidents = () => {
    if (!mapInstanceRef.current) return;
    const coords = incidents
      .filter((i) => i.latitude !== null && i.longitude !== null)
      .map((i) => [i.latitude, i.longitude]);
    if (coords.length > 0) {
      const bounds = L.latLngBounds(coords);
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 8 });
    } else {
      mapInstanceRef.current.flyTo([15.0, 75.0], 4);
    }
  };

  // Simulate Vessel Geofence Breach Test
  const handleTriggerTestBreach = async () => {
    try {
      setIsSimulatingBreach(true);
      const incId = selectedIncident?.incident_id || null;
      await triggerTestIncidentBreach(incId);
      if (onBreachTriggered) onBreachTriggered();
    } catch (err) {
      console.error('Failed to trigger test breach:', err);
    } finally {
      setIsSimulatingBreach(false);
    }
  };

  const incidentsCount = incidents.filter((i) => i.latitude !== null && i.longitude !== null).length;
  const mappedCount = incidents.filter((i) => i.is_mapped && i.latitude !== null).length;

  return (
    <div className="relative w-full h-[650px] rounded-3xl overflow-hidden border border-ocean-800 shadow-2xl bg-ocean-950 font-mono">
      {/* Leaflet Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Top Left Floating Layer Toggle Widget */}
      <div className="absolute top-3 left-3 z-[1000] bg-[#0a101d]/95 backdrop-blur-xl p-2.5 rounded-2xl border border-border-tactical shadow-2xl text-xs text-starlight space-y-2">
        <div className="flex items-center justify-between border-b border-border-tactical pb-1 text-[11px] text-kesari font-bold font-label-caps">
          <div className="flex items-center space-x-1.5">
            <Layers className="w-3.5 h-3.5 text-kesari" />
            <span>Map Layers</span>
          </div>
          <span className="text-[10px] text-tiranga-green font-bold">● LIVE AIS</span>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[11px]">
          <label className="flex items-center space-x-1.5 cursor-pointer text-muted-slate hover:text-starlight transition">
            <input
              type="checkbox"
              checked={layers.incidents}
              onChange={(e) => setLayers({ ...layers, incidents: e.target.checked })}
              className="accent-kesari rounded"
            />
            <span>Incidents ({incidents.length})</span>
          </label>

          <label className="flex items-center space-x-1.5 cursor-pointer text-muted-slate hover:text-starlight transition">
            <input
              type="checkbox"
              checked={layers.dangerZones}
              onChange={(e) => setLayers({ ...layers, dangerZones: e.target.checked })}
              className="accent-kesari rounded"
            />
            <span>Danger Geofences</span>
          </label>

          <label className="flex items-center space-x-1.5 cursor-pointer text-muted-slate hover:text-starlight transition">
            <input
              type="checkbox"
              checked={layers.liveVessels}
              onChange={(e) => setLayers({ ...layers, liveVessels: e.target.checked })}
              className="accent-kesari rounded"
            />
            <span>Live AIS Vessels ({liveVessels.length})</span>
          </label>

          <label className="flex items-center space-x-1.5 cursor-pointer text-muted-slate hover:text-starlight transition">
            <input
              type="checkbox"
              checked={layers.approachVectors}
              onChange={(e) => setLayers({ ...layers, approachVectors: e.target.checked })}
              className="accent-tiranga-green rounded"
            />
            <span>Approach Vectors</span>
          </label>

          <label className="flex items-center space-x-1.5 cursor-pointer text-muted-slate hover:text-starlight transition">
            <input
              type="checkbox"
              checked={layers.criticalOnly}
              onChange={(e) => setLayers({ ...layers, criticalOnly: e.target.checked })}
              className="accent-rose-500 rounded"
            />
            <span className="text-rose-400 font-bold">Critical Only</span>
          </label>
        </div>
      </div>

      {/* Test Geofence Breach Button (Top Right Action) */}
      <div className="absolute top-3 right-16 z-[1000] flex items-center space-x-2">
        <button
          onClick={handleTriggerTestBreach}
          disabled={isSimulatingBreach}
          className="px-3.5 py-1.5 rounded-full bg-rose-950/90 hover:bg-rose-900 text-rose-300 border border-rose-600/70 text-xs font-bold flex items-center space-x-1.5 shadow-xl transition backdrop-blur-md"
          title="Simulate a live vessel entering a danger zone to verify real-time SOS alarm trigger"
        >
          <BellRing className={`w-3.5 h-3.5 text-rose-400 ${isSimulatingBreach ? 'animate-spin' : 'animate-bounce'}`} />
          <span>{isSimulatingBreach ? 'Triggering...' : 'Test Vessel Breach SOS'}</span>
        </button>
      </div>

      {/* Map Zoom & Bounds Controls (Top Right) */}
      <div className="absolute top-3 right-3 z-[1000] flex flex-col space-y-1.5 bg-[#0a101d]/95 backdrop-blur-xl p-1.5 rounded-xl border border-border-tactical shadow-xl">
        <button
          onClick={() => mapInstanceRef.current?.zoomIn()}
          className="p-2 rounded-lg bg-[#0e1726] hover:bg-[#162235] text-starlight hover:text-white transition"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => mapInstanceRef.current?.zoomOut()}
          className="p-2 rounded-lg bg-[#0e1726] hover:bg-[#162235] text-starlight hover:text-white transition"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleFitAllIncidents}
          className="p-2 rounded-lg bg-[#0e1726] hover:bg-[#162235] text-kesari hover:text-kesari-light transition"
          title="Fit All Incidents to View"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Basemap Switcher (Bottom Left) */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-[#0a101d]/95 backdrop-blur-xl p-1.5 rounded-full border border-border-tactical shadow-xl flex items-center space-x-1 text-xs">
        {Object.entries(BASEMAPS).map(([key, bm]) => (
          <button
            key={key}
            onClick={() => setActiveBasemap(key)}
            className={`px-3 py-1 rounded-full text-[10px] font-bold transition ${
              activeBasemap === key
                ? 'bg-kesari text-chakra-navy shadow-sm'
                : 'text-muted-slate hover:text-starlight hover:bg-[#131d2e]'
            }`}
          >
            {bm.name.split(' ')[0]}
          </button>
        ))}
      </div>

      {/* Map Legend Overlay (Bottom Right) */}
      <div className="absolute bottom-3 right-3 z-[1000] bg-[#0a101d]/95 backdrop-blur-xl p-3 rounded-2xl border border-border-tactical shadow-2xl text-[10px] text-muted-slate space-y-1.5 hidden sm:block">
        <div className="font-bold text-starlight uppercase text-[9px] border-b border-border-tactical/60 pb-1 flex items-center justify-between font-label-caps">
          <span>Map Legend</span>
          <span className="text-kesari">{liveVessels.length} Vessels</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
          <span className="text-starlight">Critical Hazard Marker</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span className="text-starlight">High Risk Incident Marker</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full border border-dashed border-kesari bg-kesari/20" />
          <span className="text-starlight">Danger Zone Perimeter</span>
        </div>
        <div className="flex items-center space-x-2">
          <span>🚢</span>
          <span className="text-starlight">Live AIS Vessel (Real-Time)</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
          <span className="text-rose-400 font-bold">Vessel in Danger Zone</span>
        </div>
      </div>
    </div>
  );
}
