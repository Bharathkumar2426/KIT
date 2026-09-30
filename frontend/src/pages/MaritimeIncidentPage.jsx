import React, { useState, useEffect, useRef } from 'react';
import { 
  Radio, ShieldAlert, AlertTriangle, RefreshCw, Layers, Globe, 
  MapPin, CheckCircle2, Sparkles, Filter, Database, ArrowLeft, Clock, Ship
} from 'lucide-react';
import { IncidentFilters } from '../components/incidents/IncidentFilters';
import { IncidentList } from '../components/incidents/IncidentList';
import { IncidentDetailPanel } from '../components/incidents/IncidentDetailPanel';
import { IncidentMap } from '../components/incidents/IncidentMap';
import { IncidentConfirmationModal } from '../components/incidents/IncidentConfirmationModal';
import { IncidentAlarmBanner } from '../components/incidents/IncidentAlarmBanner';
import { 
  getIncidents, getIncidentMetrics, getSourcesStatus, 
  confirmMapIncident, dismissIncident, triggerManualRefresh, getIncidentById,
  getActiveAlarms, dismissAlarm, clearAllAlarms
} from '../services/incidentApi';

export function MaritimeIncidentPage({ onSwitchToSonar }) {
  const [incidents, setIncidents] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [sourcesStatus, setSourcesStatus] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [activeAlarms, setActiveAlarms] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [confirmingIncident, setConfirmingIncident] = useState(null);
  const [isProcessingConfirmation, setIsProcessingConfirmation] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(new Date());

  const [filters, setFilters] = useState({
    severity: '',
    incident_type: '',
    source_filter: '',
    time_range: '',
    is_mapped: false,
    pending_review: false,
    active_danger_only: false,
    search: '',
  });

  const mapSectionRef = useRef(null);

  // Load Incidents, Metrics, Sources, and Active Alarms
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [incList, met, src, alarms] = await Promise.all([
        getIncidents(filters),
        getIncidentMetrics(),
        getSourcesStatus(),
        getActiveAlarms().catch(() => []),
      ]);
      setIncidents(incList);
      setMetrics(met);
      setSourcesStatus(src);
      setActiveAlarms(alarms);
      setLastUpdateTime(new Date());

      // Retain or auto-select selected incident
      if (selectedIncident) {
        const found = incList.find((i) => i.incident_id === selectedIncident.incident_id);
        if (found) setSelectedIncident(found);
      } else if (incList.length > 0) {
        setSelectedIncident(incList[0]);
      }
    } catch (err) {
      console.error('Failed to load maritime incident intelligence data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filters]);

  // Periodic polling for live AIS proximity alarms and metrics (every 6 seconds)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const [alarms, met] = await Promise.all([
          getActiveAlarms().catch(() => []),
          getIncidentMetrics().catch(() => null),
        ]);
        setActiveAlarms(alarms);
        if (met) setMetrics(met);
        setLastUpdateTime(new Date());
      } catch (e) {
        // Silent background polling
      }
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  // Select Incident and fetch full dossier with AIS correlation
  const handleSelectIncident = async (inc) => {
    try {
      const fullDossier = await getIncidentById(inc.incident_id);
      setSelectedIncident(fullDossier);
    } catch {
      setSelectedIncident(inc);
    }
  };

  // Manual Ingestion Sync Trigger
  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await triggerManualRefresh();
      await loadData();
    } catch (err) {
      console.error('Failed to trigger refresh:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Human Operator Confirmation Handler
  const handleConfirmMapping = async (incidentId, customRadiusKm, notes) => {
    try {
      setIsProcessingConfirmation(true);
      const updated = await confirmMapIncident(incidentId, customRadiusKm, notes);
      setConfirmingIncident(null);
      await loadData();
      if (updated) setSelectedIncident(updated);
    } catch (err) {
      console.error('Failed to confirm incident mapping:', err);
    } finally {
      setIsProcessingConfirmation(false);
    }
  };

  // Dismiss Incident Handler
  const handleDismiss = async (incidentId) => {
    try {
      await dismissIncident(incidentId);
      await loadData();
    } catch (err) {
      console.error('Failed to dismiss incident:', err);
    }
  };

  // Locate on Map Action
  const handleLocateOnMap = (incidentId) => {
    const inc = incidents.find((i) => i.incident_id === incidentId);
    if (inc) {
      handleSelectIncident(inc);
      if (mapSectionRef.current) {
        mapSectionRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  // Dismiss Alarm Action
  const handleDismissAlarm = async (alarmId) => {
    try {
      await dismissAlarm(alarmId);
      const updated = await getActiveAlarms();
      setActiveAlarms(updated);
    } catch (e) {
      console.error('Failed to dismiss alarm:', e);
    }
  };

  // Clear All Alarms Action
  const handleClearAllAlarms = async () => {
    try {
      await clearAllAlarms();
      setActiveAlarms([]);
    } catch (e) {
      console.error('Failed to clear alarms:', e);
    }
  };

  // Online source count
  const onlineSourcesCount = sourcesStatus.filter((s) => s.status === 'ONLINE').length;
  const totalSourcesCount = sourcesStatus.length || 9;

  return (
    <div className="space-y-6 pb-12">
      {/* 1. TOP HEADER & EXECUTIVE TELEMETRY HUD */}
      <div className="bg-[#0a101d]/90 backdrop-blur-xl border border-border-tactical/80 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-kesari/20 to-chakra-navy-surface border border-kesari/40 flex items-center justify-center shadow-[0_0_16px_rgba(243,139,42,0.2)] text-kesari shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-starlight tracking-wide font-headline-sm">
                  AI MARITIME INCIDENT INTELLIGENCE
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-label-caps bg-[#0e1726] text-kesari border border-kesari/30 flex items-center space-x-1.5 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-kesari shadow-[0_0_6px_#f38b2a] animate-pulse"></span>
                  <span>RISK INTELLIGENCE</span>
                </span>
              </div>
              <p className="text-xs text-muted-slate font-mono mt-0.5">
                Global marine incident detection, verification, risk assessment and live AIS proximity correlation.
              </p>
            </div>
          </div>

          {/* Action Controls & Telemetry Badges */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-4 py-2 rounded-full bg-kesari hover:bg-kesari-light text-chakra-navy font-bold text-xs flex items-center space-x-2 transition shadow-[0_0_16px_rgba(243,139,42,0.35)] hover:shadow-[0_0_24px_rgba(243,139,42,0.55)] active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Syncing Feeds...' : 'Sync Sources'}</span>
            </button>

            {onSwitchToSonar && (
              <button
                onClick={onSwitchToSonar}
                className="px-4 py-2 rounded-full bg-[#0e1726] hover:bg-[#162235] text-starlight hover:text-white border border-border-tactical hover:border-slate-600 text-xs font-mono font-bold flex items-center space-x-2 transition shadow-sm"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-kesari" />
                <span>Sonar View</span>
              </button>
            )}
          </div>
        </div>

        {/* Status Indicators Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border-tactical/60 text-[11px] text-muted-slate font-mono">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-500 uppercase text-[10px] font-label-caps">INGESTION:</span>
              <span className="text-tiranga-green font-extrabold flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-tiranga-green animate-pulse" />
                <span>ONLINE</span>
              </span>
            </div>

            <div className="flex items-center space-x-1.5">
              <span className="text-slate-500 uppercase text-[10px] font-label-caps">AIS FEED:</span>
              <span className="text-kesari font-extrabold flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-kesari shadow-[0_0_6px_#f38b2a]" />
                <span>{metrics?.is_ais_live ? 'LIVE AISSTREAM' : 'ONLINE (TELEMETRY)'}</span>
              </span>
            </div>

            <div className="flex items-center space-x-1.5">
              <span className="text-slate-500 uppercase text-[10px] font-label-caps">SOURCES:</span>
              <span className="text-starlight font-bold">
                {onlineSourcesCount}/{totalSourcesCount} ONLINE
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 text-muted-slate">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-[10px] uppercase font-label-caps">LAST UPDATE:</span>
            <span className="text-starlight font-mono font-bold">
              {lastUpdateTime.toUTCString().slice(17, 25)} UTC
            </span>
          </div>
        </div>

        {/* 2. SUMMARY CARDS (6 COMPACT KPIS) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
          {/* Total Incidents */}
          <div className="bg-[#0e1726]/80 border border-border-tactical rounded-xl p-3 flex flex-col justify-between shadow-md">
            <span className="text-[10px] font-label-caps text-muted-slate uppercase tracking-wider font-bold">Total Reports</span>
            <div className="flex items-center justify-between mt-1">
              <p className="text-2xl font-bold font-telemetry-lg text-starlight">{metrics?.total_incidents || incidents.length}</p>
              <Globe className="w-4 h-4 text-kesari opacity-75" />
            </div>
          </div>

          {/* Critical Hazards */}
          <div className="bg-[#0e1726]/80 border border-rose-900/50 rounded-xl p-3 flex flex-col justify-between shadow-md">
            <span className="text-[10px] font-label-caps text-rose-400 uppercase tracking-wider font-bold">Critical</span>
            <div className="flex items-center justify-between mt-1">
              <p className="text-2xl font-bold font-telemetry-lg text-rose-400">{metrics?.critical_count || 0}</p>
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            </div>
          </div>

          {/* High Risk */}
          <div className="bg-[#0e1726]/80 border border-amber-900/50 rounded-xl p-3 flex flex-col justify-between shadow-md">
            <span className="text-[10px] font-label-caps text-amber-400 uppercase tracking-wider font-bold">High Risk</span>
            <div className="flex items-center justify-between mt-1">
              <p className="text-2xl font-bold font-telemetry-lg text-amber-400">{metrics?.high_count || 0}</p>
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            </div>
          </div>

          {/* Pending Review */}
          <div className="bg-[#0e1726]/80 border border-yellow-900/50 rounded-xl p-3 flex flex-col justify-between shadow-md">
            <span className="text-[10px] font-label-caps text-yellow-400 uppercase tracking-wider font-bold">Pending Review</span>
            <div className="flex items-center justify-between mt-1">
              <p className="text-2xl font-bold font-telemetry-lg text-yellow-400">{metrics?.pending_confirmation_count || 0}</p>
              <AlertTriangle className="w-4 h-4 text-yellow-400 opacity-75" />
            </div>
          </div>

          {/* Active Danger Zones */}
          <div className="bg-[#0e1726]/80 border border-border-tactical rounded-xl p-3 flex flex-col justify-between shadow-md">
            <span className="text-[10px] font-label-caps text-kesari uppercase tracking-wider font-bold">Active Geofences</span>
            <div className="flex items-center justify-between mt-1">
              <p className="text-2xl font-bold font-telemetry-lg text-kesari">{metrics?.active_danger_zones_count || 0}</p>
              <Layers className="w-4 h-4 text-kesari opacity-75" />
            </div>
          </div>

          {/* Vessels in Proximity */}
          <div className="bg-[#0e1726]/80 border border-border-tactical rounded-xl p-3 flex flex-col justify-between shadow-md">
            <span className="text-[10px] font-label-caps text-tiranga-green uppercase tracking-wider font-bold">Vessels at Risk</span>
            <div className="flex items-center justify-between mt-1">
              <p className="text-2xl font-bold font-telemetry-lg text-tiranga-green">{metrics?.vessels_inside_danger_zones || 0}</p>
              <Ship className="w-4 h-4 text-tiranga-green opacity-75" />
            </div>
          </div>
        </div>
      </div>

      {/* 3. LIVE PROXIMITY ALARM BANNER */}
      {activeAlarms.length > 0 && (
        <IncidentAlarmBanner
          alarms={activeAlarms}
          onDismissAlarm={handleDismissAlarm}
          onClearAll={handleClearAllAlarms}
          onLocateIncident={handleLocateOnMap}
        />
      )}

      {/* 4. MAIN 3-COLUMN INTELLIGENCE SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Filters & Source Health (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          <IncidentFilters
            filters={filters}
            onFilterChange={setFilters}
            onReset={() => setFilters({ severity: '', incident_type: '', source_filter: '', time_range: '', is_mapped: false, pending_review: false, active_danger_only: false, search: '' })}
          />

          {/* Source Connectivity & Trust Health Panel */}
          <div className="bg-[#0a101d]/90 backdrop-blur-xl border border-border-tactical rounded-2xl p-4 space-y-3 shadow-xl text-xs font-mono text-starlight">
            <div className="flex items-center justify-between border-b border-border-tactical pb-2">
              <strong className="text-kesari text-[11px] uppercase tracking-wider font-bold font-label-caps">
                DATA SOURCES ({sourcesStatus.length})
              </strong>
              <span className="text-[10px] text-tiranga-green font-extrabold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-tiranga-green animate-pulse" />
                {onlineSourcesCount} ONLINE
              </span>
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {sourcesStatus.map((s) => (
                <div key={s.source_id} className="flex items-center justify-between text-[10px] text-slate-300">
                  <div className="truncate pr-2">
                    <span className="font-semibold text-white block truncate">{s.source_name.split('(')[0]}</span>
                    <span className="text-[9px] text-slate-500">{s.source_type}</span>
                  </div>
                  <span className={`font-extrabold shrink-0 px-1.5 py-0.5 rounded text-[9px] ${
                    s.status === 'ONLINE' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'
                  }`}>
                    {s.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CENTER COLUMN: Clean Incident Feed (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between text-xs px-1">
            <span className="font-extrabold text-slate-200 uppercase tracking-wider">
              Incident Feed ({incidents.length})
            </span>
            <span className="text-[10px] text-slate-400">Strict Provenance Active</span>
          </div>

          <IncidentList
            incidents={incidents}
            selectedIncidentId={selectedIncident?.incident_id}
            onSelectIncident={handleSelectIncident}
            onOpenConfirmation={setConfirmingIncident}
          />
        </div>

        {/* RIGHT COLUMN: Selected Incident Structured Dossier (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <IncidentDetailPanel
            incident={selectedIncident}
            onOpenConfirmation={setConfirmingIncident}
            onDismiss={handleDismiss}
            onLocateOnMap={handleLocateOnMap}
          />
        </div>
      </div>

      {/* 5. BOTTOM DEDICATED FULL-WIDTH INCIDENT INTELLIGENCE MAP */}
      <div ref={mapSectionRef} className="space-y-3 pt-4 border-t border-border-tactical">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div>
            <h2 className="text-base font-bold text-starlight uppercase tracking-wide flex items-center space-x-2 font-headline-sm">
              <Radio className="w-4 h-4 text-kesari animate-pulse" />
              <span>DEDICATED INCIDENT INTELLIGENCE & GEOFENCING MAP</span>
            </h2>
            <p className="text-xs text-muted-slate font-mono mt-0.5">
              Interactive nautical visualization with real-time danger zones, verified incident markers, and live AIS vessel proximity vectors.
            </p>
          </div>

          {selectedIncident && (
            <div className="text-xs text-starlight bg-[#0a101d] border border-border-tactical px-3.5 py-1.5 rounded-full font-mono shadow-sm">
              Target Focus: <strong className="text-kesari">#{selectedIncident.incident_id}</strong> ({selectedIncident.title.slice(0, 30)}...)
            </div>
          )}
        </div>

        <IncidentMap
          incidents={incidents}
          selectedIncident={selectedIncident}
          onSelectIncident={handleSelectIncident}
          onOpenConfirmation={setConfirmingIncident}
          onBreachTriggered={loadData}
        />
      </div>

      {/* 6. OPERATOR HUMAN-IN-THE-LOOP CONFIRMATION MODAL */}
      {confirmingIncident && (
        <IncidentConfirmationModal
          incident={confirmingIncident}
          isProcessing={isProcessingConfirmation}
          onConfirm={handleConfirmMapping}
          onClose={() => setConfirmingIncident(null)}
        />
      )}
    </div>
  );
}
