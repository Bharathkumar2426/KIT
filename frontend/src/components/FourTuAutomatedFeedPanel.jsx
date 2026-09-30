import React, { useState, useEffect } from 'react';
import { 
  Database, RefreshCw, CheckCircle2, AlertTriangle, 
  MapPin, Clock, FileCheck, Layers, Radio, Globe, ExternalLink, ShieldCheck, Activity,
  ChevronDown, ChevronUp, Crosshair, ArrowUpRight, Compass, Eye, ShieldAlert, Sparkles
} from 'lucide-react';
import { getFourTuStatus, syncFourTu, getFourTuFiles, getFleetGeospatial } from '../services/api';

export function FourTuAutomatedFeedPanel({ onSyncCompleted, onViewOnMap }) {
  const [statusData, setStatusData] = useState(null);
  const [fourTuFiles, setFourTuFiles] = useState([]);
  const [mapFeatures, setMapFeatures] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [error, setError] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(true);
  const [detailTab, setDetailTab] = useState('map_markers'); // 'map_markers' | 'ingested_files'

  const fetchAllData = async () => {
    try {
      // 1. Fetch status
      const data = await getFourTuStatus();
      setStatusData(data);
      if (data.status === 'SYNCING') {
        setIsSyncing(true);
      } else {
        setIsSyncing(false);
      }

      // 2. Fetch 4TU tracked files
      try {
        const filesData = await getFourTuFiles(30);
        if (Array.isArray(filesData)) {
          setFourTuFiles(filesData);
        }
      } catch (fErr) {
        console.warn('Could not fetch 4TU files:', fErr);
      }

      // 3. Fetch fleet map features and filter for 4TU and Source.Coop NASA
      try {
        const fleetData = await getFleetGeospatial();
        const features = fleetData?.features || [];
        const externalDets = features.filter(
          (f) =>
            f.source === '4TU.ResearchData' ||
            f.source === 'Source.Coop (NASA)' ||
            f.classification_source === '4tu_sonar_v2' ||
            f.classification_source === 'source_coop_nasa' ||
            String(f.filename || '').startsWith('4TU_') ||
            String(f.filename || '').startsWith('NASA_')
        );
        setMapFeatures(externalDets);
      } catch (gErr) {
        console.warn('Could not fetch fleet geospatial features:', gErr);
      }
    } catch (err) {
      console.warn('Could not fetch 4TU status:', err);
    }
  };

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleSyncNow = async () => {
    try {
      setIsSyncing(true);
      setError(null);
      const res = await syncFourTu();
      setSyncResult(res);
      await fetchAllData();
      if (onSyncCompleted) {
        onSyncCompleted(res);
      }
    } catch (err) {
      console.error('Manual 4TU sync error:', err);
      setError(err.message || 'Synchronization request failed');
    } finally {
      setIsSyncing(false);
    }
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return 'Never';
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getSeverityBadge = (severity) => {
    const s = String(severity || 'LOW').toUpperCase();
    if (s === 'EXTREME') {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-rose-500/20 text-rose-300 border border-rose-500/40">CRITICAL</span>;
    }
    if (s === 'MEDIUM') {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40">MEDIUM RISK</span>;
    }
    return <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">LOW RISK</span>;
  };

  const statusColor = 
    isSyncing || statusData?.status === 'SYNCING'
      ? 'text-cyan-400 border-cyan-500/40 bg-cyan-950/40'
      : statusData?.status === 'CONNECTED'
      ? 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40'
      : 'text-amber-400 border-amber-500/40 bg-amber-950/40';

  return (
    <div className="bg-ocean-900/90 border border-ocean-800 rounded-xl p-4 shadow-xl backdrop-blur-md">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ocean-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Database className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold tracking-wide text-white uppercase font-mono">
                AUTOMATED RESEARCH SONAR FEED
              </h3>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${statusColor} flex items-center gap-1`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-cyan-400 animate-ping' : 'bg-emerald-400'}`} />
                {isSyncing ? 'SYNCING' : (statusData?.status || 'CONNECTED')}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span>Sources:</span>
              <a 
                href="https://data.4tu.nl" 
                target="_blank" 
                rel="noreferrer" 
                className="text-cyan-400 hover:underline flex items-center gap-0.5 font-bold"
              >
                4TU.ResearchData
                <ExternalLink className="w-3 h-3 inline" />
              </a>
              <span className="text-slate-500">•</span>
              <a 
                href="https://source.coop/nasa/marine-debris" 
                target="_blank" 
                rel="noreferrer" 
                className="text-emerald-400 hover:underline flex items-center gap-0.5 font-bold"
              >
                Source.Coop (NASA Marine Debris)
                <ExternalLink className="w-3 h-3 inline" />
              </a>
              <span className="text-slate-500">| Public Marine AI Feeds</span>
            </p>
          </div>
        </div>

        {/* Sync Action and Toggle */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-ocean-950 px-2.5 py-1 rounded-lg border border-ocean-800 text-[11px] font-mono text-slate-300">
            <span className="text-slate-400">Auto-Sync:</span>
            <button
              onClick={() => setAutoSyncEnabled(!autoSyncEnabled)}
              className={`font-bold px-1.5 py-0.5 rounded transition-colors ${
                autoSyncEnabled ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-500 bg-slate-800'
              }`}
            >
              {autoSyncEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          <button
            onClick={handleSyncNow}
            disabled={isSyncing}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-mono text-xs font-bold transition-all shadow-md ${
              isSyncing
                ? 'bg-cyan-900/60 text-cyan-300 border border-cyan-700/60 cursor-not-allowed'
                : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white border border-cyan-400/30'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-cyan-300' : ''}`} />
            {isSyncing ? 'SYNCING...' : 'SYNC NOW'}
          </button>
        </div>
      </div>

      {/* Metric Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 mt-3 pt-1">
        <div className="bg-ocean-950/70 p-2.5 rounded-lg border border-ocean-800/80">
          <span className="text-[10px] uppercase font-mono text-slate-400 block">Datasets</span>
          <span className="text-base font-bold text-white font-mono">
            {statusData?.total_datasets_tracked ?? fourTuFiles.length}
          </span>
        </div>

        <div className="bg-ocean-950/70 p-2.5 rounded-lg border border-ocean-800/80">
          <span className="text-[10px] uppercase font-mono text-slate-400 block">New Files</span>
          <span className="text-base font-bold text-cyan-400 font-mono">
            {statusData?.total_files_discovered ?? fourTuFiles.length}
          </span>
        </div>

        <div className="bg-ocean-950/70 p-2.5 rounded-lg border border-ocean-800/80">
          <span className="text-[10px] uppercase font-mono text-slate-400 block">Validated</span>
          <span className="text-base font-bold text-emerald-400 font-mono">
            {statusData?.total_files_processed ?? 1}
          </span>
        </div>

        <div className="bg-ocean-950/70 p-2.5 rounded-lg border border-ocean-800/80">
          <span className="text-[10px] uppercase font-mono text-slate-400 block">Processed</span>
          <span className="text-base font-bold text-indigo-400 font-mono">
            {statusData?.total_files_processed ?? 1}
          </span>
        </div>

        <div className="bg-ocean-950/70 p-2.5 rounded-lg border border-ocean-800/80">
          <span className="text-[10px] uppercase font-mono text-slate-400 block">Map Markers</span>
          <span className="text-base font-bold text-emerald-300 font-mono flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-emerald-400 inline" />
            {mapFeatures.length > 0 ? mapFeatures.length : (statusData?.total_georeferenced_detections ?? 0)}
          </span>
        </div>

        <div className="bg-ocean-950/70 p-2.5 rounded-lg border border-ocean-800/80">
          <span className="text-[10px] uppercase font-mono text-slate-400 block">No Location</span>
          <span className="text-base font-bold text-amber-400 font-mono">
            {statusData?.total_without_location ?? 0}
          </span>
        </div>

        <div className="bg-ocean-950/70 p-2.5 rounded-lg border border-ocean-800/80">
          <span className="text-[10px] uppercase font-mono text-slate-400 block">Failed</span>
          <span className={`text-base font-bold font-mono ${statusData?.total_failed_files > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
            {statusData?.total_failed_files ?? 0}
          </span>
        </div>
      </div>

      {/* Sync Footer Info & Details Toggle */}
      <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400 mt-3 pt-2.5 border-t border-ocean-800/60 gap-2">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Last Sync:</span>
            <span className="text-slate-200 font-bold">{formatDate(statusData?.last_sync)}</span>
          </span>
          <span className="flex items-center gap-1.5 text-slate-500 hidden sm:inline-flex">
            <span>Next Scheduled:</span>
            <span className="text-slate-400">
              {autoSyncEnabled ? `In ~${statusData?.sync_interval_hours || 24} hours` : 'Paused'}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsDetailsOpen(!isDetailsOpen)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-ocean-800 hover:bg-ocean-700 text-cyan-300 text-xs font-mono font-bold transition-colors"
          >
            <span>{isDetailsOpen ? 'Hide Ingested Data' : 'View Ingested Data & Map Markers'}</span>
            {isDetailsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Error or Sync Banner if present */}
      {error && (
        <div className="mt-2.5 p-2 rounded bg-rose-950/50 border border-rose-800/60 text-rose-300 text-xs font-mono flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {syncResult && (
        <div className="mt-2.5 p-2 rounded bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 text-xs font-mono flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>
              Sync finished: {syncResult.processed} processed, {syncResult.detections} targets found ({syncResult.georeferenced} georeferenced, {syncResult.without_location} location unavailable).
            </span>
          </div>
          <button 
            onClick={() => setSyncResult(null)} 
            className="text-slate-400 hover:text-white ml-2 text-[10px]"
          >
            ✕
          </button>
        </div>
      )}

      {/* EXPANDABLE DETAILS DRAWER */}
      {isDetailsOpen && (
        <div className="mt-4 pt-3 border-t border-cyan-900/50 bg-ocean-950/80 rounded-xl p-3.5 border border-ocean-800">
          {/* Sub-Tabs: Map Detections vs Ingested Files */}
          <div className="flex items-center justify-between border-b border-ocean-800 pb-2.5 mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDetailTab('map_markers')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                  detailTab === 'map_markers'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span>Detections Marked on Geo Map</span>
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300">
                  {mapFeatures.length}
                </span>
              </button>

              <button
                onClick={() => setDetailTab('ingested_files')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                  detailTab === 'ingested_files'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>4TU Ingested Files & Datasets</span>
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-cyan-500/20 text-cyan-300">
                  {fourTuFiles.length}
                </span>
              </button>
            </div>

            <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>Real 4TU side-scan sonar ingestion active</span>
            </div>
          </div>

          {/* TAB 1: DETECTIONS MARKED ON GEOSPATIAL MAP */}
          {detailTab === 'map_markers' && (
            <div>
              {mapFeatures.length === 0 ? (
                <div className="text-center py-6 text-slate-500 font-mono text-xs">
                  No 4TU detections marked on the map yet. Click &quot;SYNC NOW&quot; to fetch and process.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {mapFeatures.map((det, idx) => {
                    const lat = det.geolocation?.latitude?.toFixed(6) || 'N/A';
                    const lng = det.geolocation?.longitude?.toFixed(6) || 'N/A';
                    const conf = det.confidence ? `${(det.confidence * 100).toFixed(1)}%` : 'N/A';
                    const radius = det.geofence?.radius_meters || 25;

                    return (
                      <div 
                        key={idx}
                        className="bg-ocean-900/90 border border-cyan-800/40 hover:border-cyan-500/60 rounded-lg p-3 transition-all flex flex-col justify-between shadow-md"
                      >
                        <div>
                          {/* Card Header */}
                          <div className="flex items-center justify-between gap-1 mb-1.5">
                            <span className="text-sm font-bold text-white font-mono flex items-center gap-1.5">
                              <Crosshair className="w-4 h-4 text-cyan-400 shrink-0" />
                              <span>{det.display_name || det.class_name}</span>
                            </span>
                            {getSeverityBadge(det.severity)}
                          </div>

                          {/* Confidence and Origin */}
                          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pb-2 border-b border-ocean-800">
                            <span>Confidence: <strong className="text-emerald-400">{conf}</strong></span>
                            <span className="text-[10px] text-cyan-300/80 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-900">
                              4TU Sonar ML
                            </span>
                          </div>

                          {/* Coordinates and Geofence */}
                          <div className="space-y-1.5 text-xs font-mono py-2.5">
                            <div className="flex items-center justify-between text-slate-300">
                              <span className="text-slate-400 flex items-center gap-1">
                                <Compass className="w-3.5 h-3.5 text-cyan-400 inline" />
                                Coordinates:
                              </span>
                              <span className="text-cyan-300 font-bold bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-800/50">
                                {lat}°N, {lng}°E
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-slate-300">
                              <span className="text-slate-400 flex items-center gap-1">
                                <ShieldAlert className="w-3.5 h-3.5 text-amber-400 inline" />
                                Geofence:
                              </span>
                              <span className="text-amber-300 font-bold">
                                ⭕ {radius}m radius
                              </span>
                            </div>

                            {det.filename && (
                              <div className="text-[10px] text-slate-500 truncate pt-1 font-mono">
                                File: <span className="text-slate-400">{det.filename}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Direct Jump to Geospatial Map Button */}
                        <div className="pt-2 border-t border-ocean-800/60">
                          {onViewOnMap ? (
                            <button
                              onClick={() => onViewOnMap(det.detection_id)}
                              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-bold transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View on Geospatial Map</span>
                              <ArrowUpRight className="w-3.5 h-3.5 ml-auto" />
                            </button>
                          ) : (
                            <div className="text-[10px] text-emerald-400 font-mono text-center">
                              ✓ Pinned on Geospatial Map (North Sea)
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: 4TU INGESTED FILES & REPOSITORIES */}
          {detailTab === 'ingested_files' && (
            <div className="overflow-x-auto">
              {fourTuFiles.length === 0 ? (
                <div className="text-center py-6 text-slate-500 font-mono text-xs">
                  No 4TU files discovered yet.
                </div>
              ) : (
                <table className="w-full text-left font-mono text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-ocean-800 text-[11px] text-slate-400 uppercase bg-ocean-950/60">
                      <th className="py-2 px-3">File Name</th>
                      <th className="py-2 px-3">Source Dataset</th>
                      <th className="py-2 px-3">Format</th>
                      <th className="py-2 px-3">Size</th>
                      <th className="py-2 px-3">Detections</th>
                      <th className="py-2 px-3">Geo Status</th>
                      <th className="py-2 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ocean-800/60">
                    {fourTuFiles.map((f, i) => (
                      <tr key={i} className="hover:bg-ocean-900/50 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-white flex items-center gap-1.5">
                          <FileCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span className="truncate max-w-[200px]" title={f.filename}>{f.filename}</span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-300 max-w-[220px]">
                          <div className="truncate text-[11px]" title={f.dataset_title}>
                            {f.dataset_title}
                          </div>
                          {f.source_url && (
                            <a
                              href={f.source_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-cyan-400 hover:underline flex items-center gap-0.5 mt-0.5"
                            >
                              4TU Article <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </td>
                        <td className="py-2.5 px-3 uppercase text-[11px] text-slate-400 font-bold">
                          {f.file_format || 'PNG'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                          {formatFileSize(f.file_size_bytes)}
                        </td>
                        <td className="py-2.5 px-3">
                          {f.detections_count > 0 ? (
                            <span className="font-bold text-emerald-400">
                              {f.detections_count} targets
                            </span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          {f.location_available ? (
                            <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                              <MapPin className="w-3 h-3" /> WGS84 Geo
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[10px]">No Coordinates</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          {f.status === 'MAP_READY' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              MAP READY
                            </span>
                          ) : f.status === 'DOWNLOADED' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                              DOWNLOADED
                            </span>
                          ) : f.status === 'PROCESSED' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                              PROCESSED
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                              {f.status}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
