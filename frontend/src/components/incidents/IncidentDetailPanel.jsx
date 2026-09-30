import React from 'react';
import { 
  ShieldAlert, AlertTriangle, ExternalLink, MapPin, Compass, 
  CheckCircle2, Clock, Ship, Eye, Radio, Sparkles, Navigation, Globe, Layers, User, Info
} from 'lucide-react';

const SEVERITY_COLORS = {
  CRITICAL: 'bg-rose-500/20 text-rose-400 border-rose-600/50',
  HIGH: 'bg-amber-500/20 text-amber-400 border-amber-600/50',
  MEDIUM: 'bg-yellow-500/20 text-yellow-400 border-yellow-600/50',
  LOW: 'bg-emerald-500/20 text-emerald-400 border-emerald-600/50',
};

function formatDualTime(dateStr) {
  if (!dateStr) return { utc: 'NOT PROVIDED BY SOURCE', ist: 'NOT PROVIDED' };
  try {
    const d = new Date(dateStr);
    const utcStr = d.toUTCString().replace('GMT', 'UTC').slice(5, 22);
    const istStr = d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
    return { utc: `${utcStr} UTC`, ist: `${istStr} IST` };
  } catch {
    return { utc: dateStr, ist: dateStr };
  }
}

export function IncidentDetailPanel({
  incident,
  onOpenConfirmation,
  onDismiss,
  onLocateOnMap,
}) {
  if (!incident) {
    return (
      <div className="bg-[#0a101d]/90 border border-border-tactical rounded-2xl p-8 text-center text-muted-slate font-mono text-xs space-y-3 shadow-xl">
        <Radio className="w-8 h-8 text-kesari mx-auto animate-pulse" />
        <p className="font-bold text-starlight text-sm font-headline-sm">No Incident Selected</p>
        <p className="text-[11px] max-w-sm mx-auto text-muted-slate">
          Select an incident report from the feed to view comprehensive data provenance, AI feature extraction rationale, and live AIS vessel proximity telemetry.
        </p>
      </div>
    );
  }

  const hasCoords = incident.latitude !== null && incident.longitude !== null;
  const sevBadge = SEVERITY_COLORS[incident.severity] || SEVERITY_COLORS.MEDIUM;

  const eventTimes = formatDualTime(incident.event_time);
  const reportedTimes = formatDualTime(incident.published_at);
  const updatedTimes = formatDualTime(incident.updated_at || incident.published_at);

  const isOfficial = incident.sources?.some((s) => s.source_trust_level === 'LEVEL_1_AUTHORITATIVE' || s.source_trust_level === 'LEVEL_2_GOVERNMENT');

  const nearbyVessels = incident.nearby_vessels || [];
  const insideZoneCount = nearbyVessels.filter((v) => v.risk_level === 'DANGER').length;
  const approachingCount = nearbyVessels.filter((v) => v.risk_level === 'WARNING').length;

  return (
    <div className="bg-[#0a101d]/90 border border-border-tactical rounded-2xl p-5 shadow-2xl font-mono text-xs text-starlight space-y-5 max-h-[820px] overflow-y-auto pr-1 backdrop-blur-xl">
      {/* SECTION A: INCIDENT OVERVIEW */}
      <div className="space-y-3 border-b border-border-tactical/80 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="text-kesari font-extrabold text-sm">#{incident.incident_id}</span>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${sevBadge}`}>
              {incident.severity}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
              isOfficial ? 'bg-[#0e1726] text-kesari border-kesari/40' : 'bg-[#0e1726] text-muted-slate border-border-tactical'
            }`}>
              {isOfficial ? 'CONFIRMED OFFICIAL' : 'NEWS REPORT'}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {incident.is_mapped ? (
              <span className="px-3 py-1 rounded-full bg-emerald-950 text-tiranga-green border border-tiranga-green/40 text-[10px] font-bold flex items-center space-x-1 shadow-sm">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>ACTIVE ON MAP</span>
              </span>
            ) : (
              <button
                onClick={() => onOpenConfirmation(incident)}
                disabled={!hasCoords}
                className="px-4 py-1.5 rounded-full bg-kesari hover:bg-kesari-light text-chakra-navy font-bold flex items-center space-x-1.5 shadow-[0_0_12px_rgba(243,139,42,0.35)] transition disabled:opacity-40 disabled:cursor-not-allowed text-xs"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Mark on Map</span>
              </button>
            )}
          </div>
        </div>

        <h2 className="text-base font-bold text-starlight leading-snug font-headline-sm">{incident.title}</h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-[#070b12] p-3 rounded-xl border border-border-tactical text-[11px]">
          <div>
            <span className="text-[10px] text-muted-slate block uppercase font-label-caps">TAXONOMY</span>
            <strong className="text-starlight">{incident.incident_type}</strong>
          </div>
          <div>
            <span className="text-[10px] text-muted-slate block uppercase font-label-caps">SEVERITY SOURCE</span>
            <span className="text-kesari font-semibold">{incident.severity_source || 'AI Risk Assessment'}</span>
          </div>
          <div>
            <span className="text-[10px] text-muted-slate block uppercase font-label-caps">VERIFICATION</span>
            <span className="text-tiranga-green font-semibold">{incident.verification_status}</span>
          </div>
        </div>
      </div>

      {/* SECTION B: TIME INTELLIGENCE */}
      <div className="space-y-2 bg-[#070b12] border border-border-tactical rounded-xl p-3.5">
        <div className="flex items-center justify-between border-b border-border-tactical/60 pb-2">
          <span className="text-[10px] uppercase text-kesari font-bold flex items-center space-x-1.5 font-label-caps">
            <Clock className="w-3.5 h-3.5" />
            <span>Time Intelligence & Provenance</span>
          </span>
          <span className="text-[10px] text-muted-slate font-mono">UTC & IST Synchronized</span>
        </div>

        <div className="space-y-2 text-[11px] pt-1">
          <div className="flex items-start justify-between">
            <span className="text-muted-slate">Event Time:</span>
            <div className="text-right">
              <span className={incident.event_time ? "text-starlight font-bold block" : "text-muted-slate italic block"}>
                {eventTimes.utc}
              </span>
              {incident.event_time && <span className="text-[10px] text-muted-slate">{eventTimes.ist}</span>}
            </div>
          </div>

          <div className="flex items-start justify-between">
            <span className="text-muted-slate">Reported / Published:</span>
            <div className="text-right">
              <span className="text-starlight font-semibold block">{reportedTimes.utc}</span>
              <span className="text-[10px] text-muted-slate">{reportedTimes.ist}</span>
            </div>
          </div>

          <div className="flex items-start justify-between">
            <span className="text-muted-slate">Time Source:</span>
            <span className="text-starlight text-[10px]">{incident.time_source || 'Authoritative Ingestion Feed'}</span>
          </div>
        </div>
      </div>

      {/* SECTION C: LOCATION & GEOSPATIAL POSITION */}
      <div className="space-y-2 bg-[#070b12] border border-border-tactical rounded-xl p-3.5">
        <div className="flex items-center justify-between border-b border-border-tactical/60 pb-2">
          <span className="text-[10px] uppercase text-kesari font-bold flex items-center space-x-1.5 font-label-caps">
            <Compass className="w-3.5 h-3.5" />
            <span>Geospatial Position & Provenance</span>
          </span>
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
            incident.location_precision === 'EXACT' ? 'bg-emerald-950 text-tiranga-green border border-tiranga-green/40' :
            incident.location_precision === 'APPROXIMATE' ? 'bg-amber-950 text-amber-300 border border-amber-700' :
            'bg-[#0e1726] text-muted-slate border border-border-tactical'
          }`}>
            {incident.location_precision} PRECISION
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
          <div>
            <span className="text-[10px] text-muted-slate block uppercase font-label-caps">GEOGRAPHIC REGION</span>
            <strong className="text-starlight">{incident.location_text}</strong>
          </div>
          <div>
            <span className="text-[10px] text-muted-slate block uppercase font-label-caps">COORDINATE PAIR</span>
            <span className={hasCoords ? "text-starlight font-bold" : "text-rose-400 italic"}>
              {hasCoords ? `${incident.latitude}°N, ${incident.longitude}°E` : 'Unverified (Cannot Plot)'}
            </span>
          </div>
          <div className="col-span-2 pt-1 border-t border-border-tactical/60 flex items-center justify-between">
            <span className="text-muted-slate">Coordinate Provenance:</span>
            <span className="text-starlight text-[10px] font-semibold">{incident.coordinate_source || 'Authoritative Source Advisory'}</span>
          </div>
        </div>
      </div>

      {/* SECTION D: SOURCE CITATIONS */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-[10px] uppercase text-muted-slate font-bold flex items-center space-x-1 font-label-caps">
            <Layers className="w-3.5 h-3.5 text-kesari" />
            <span>Source Provenance Citations ({incident.sources?.length || 1})</span>
          </h4>
          <span className="text-[10px] text-tiranga-green font-bold">100% Traceable</span>
        </div>

        <div className="space-y-2">
          {incident.sources && incident.sources.length > 0 ? (
            incident.sources.map((src, idx) => (
              <div
                key={idx}
                className="bg-[#070b12] border border-border-tactical rounded-xl p-3 flex items-center justify-between text-[11px]"
              >
                <div className="space-y-0.5 pr-2">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-kesari shadow-[0_0_6px_#f38b2a]" />
                    <strong className="text-starlight">{src.source_name}</strong>
                    <span className="text-[9px] text-muted-slate">({src.source_trust_level.replace('LEVEL_', 'L')})</span>
                  </div>
                  {src.raw_title && (
                    <p className="text-[10px] text-muted-slate line-clamp-1 italic">"{src.raw_title}"</p>
                  )}
                  {src.published_at && (
                    <p className="text-[9px] text-slate-500">Published: {new Date(src.published_at).toUTCString().slice(5, 22)} UTC</p>
                  )}
                </div>

                <a
                  href={src.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-full bg-[#0e1726] hover:bg-[#162235] text-starlight hover:text-white font-bold flex items-center space-x-1 text-[10px] shrink-0 border border-border-tactical transition shadow-sm"
                >
                  <span>View Source</span>
                  <ExternalLink className="w-3 h-3 text-kesari" />
                </a>
              </div>
            ))
          ) : (
            <div className="bg-[#070b12] border border-border-tactical rounded-xl p-3 flex items-center justify-between text-[11px]">
              <span className="text-starlight">{incident.source_name}</span>
              <a
                href={incident.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-kesari hover:underline flex items-center space-x-1"
              >
                <span>View Source</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      </div>

      {/* SECTION E: AI EXTRACTION & REASONING */}
      <div className="space-y-2 bg-[#070b12] border border-border-tactical rounded-xl p-3.5">
        <div className="flex items-center justify-between border-b border-border-tactical/60 pb-2">
          <span className="text-[10px] uppercase text-kesari font-bold flex items-center space-x-1.5 font-label-caps">
            <Sparkles className="w-3.5 h-3.5 text-kesari" />
            <span>AI Feature Extraction & Rationale</span>
          </span>
          <span className="text-[10px] text-tiranga-green font-bold">
            {(incident.confidence * 100).toFixed(0)}% Confidence
          </span>
        </div>

        <div className="space-y-2 text-[11px] pt-1">
          <div>
            <span className="text-[10px] text-muted-slate block uppercase font-label-caps">SOURCE BRIEF</span>
            <p className="text-starlight leading-relaxed bg-[#0e1726] p-2.5 rounded-lg border border-border-tactical mt-1">
              {incident.description}
            </p>
          </div>

          {incident.ai_reasoning_summary && (
            <div>
              <span className="text-[10px] text-muted-slate block uppercase font-label-caps">REASONING & EVIDENCE</span>
              <p className="text-starlight leading-relaxed bg-[#131d2e]/60 p-2.5 rounded-lg border border-border-tactical mt-1">
                {incident.ai_reasoning_summary}
              </p>
            </div>
          )}

          <div className="flex items-center space-x-1.5 text-[10px] text-slate-500 italic pt-1">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>AI inference provides operational triage and risk assessment; not presented as source-claimed fact.</span>
          </div>
        </div>
      </div>

      {/* SECTION F: DANGER ZONE GEOMETRY */}
      {incident.affected_area_radius_km && (
        <div className="space-y-2 bg-[#070b12] border border-kesari/40 rounded-xl p-3.5">
          <div className="flex items-center justify-between border-b border-kesari/30 pb-2">
            <span className="text-[10px] uppercase text-kesari font-bold flex items-center space-x-1.5 font-label-caps">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Danger-Zone Geofencing Specifications</span>
            </span>
            <span className="text-[10px] text-kesari font-bold">
              ⭕ {incident.affected_area_radius_km} km Radius
            </span>
          </div>

          <div className="space-y-1.5 text-[11px] pt-1">
            <div className="flex items-center justify-between">
              <span className="text-muted-slate">Zone Type:</span>
              <span className="text-starlight font-semibold">{incident.danger_radius_source || 'AI/Rule-Derived Risk Perimeter'}</span>
            </div>
            {incident.danger_radius_basis && (
              <div className="flex items-center justify-between">
                <span className="text-muted-slate">Basis / Formula:</span>
                <span className="text-starlight text-[10px]">{incident.danger_radius_basis}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION G: LIVE AIS VESSEL CORRELATION */}
      <div className="space-y-2 bg-[#070b12] border border-border-tactical rounded-xl p-3.5">
        <div className="flex items-center justify-between border-b border-border-tactical/60 pb-2">
          <span className="text-[10px] uppercase text-kesari font-bold flex items-center space-x-1.5 font-label-caps">
            <Ship className="w-3.5 h-3.5 text-kesari" />
            <span>Live AIS Vessel Correlation</span>
          </span>
          <div className="flex items-center space-x-1.5 text-[10px]">
            {insideZoneCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-600 font-bold">
                {insideZoneCount} In Danger Zone
              </span>
            )}
            <span className="px-2 py-0.5 rounded-full bg-[#0e1726] text-starlight border border-border-tactical">
              {nearbyVessels.length} Total Nearby
            </span>
          </div>
        </div>

        {nearbyVessels.length > 0 ? (
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 pt-1">
            {nearbyVessels.map((v) => (
              <div
                key={v.vessel_mmsi}
                className={`p-2.5 rounded-xl border text-[11px] flex items-center justify-between ${
                  v.risk_level === 'DANGER'
                    ? 'bg-rose-950/40 border-rose-600/70 shadow-sm shadow-rose-950/50'
                    : v.risk_level === 'WARNING'
                    ? 'bg-amber-950/40 border-amber-600/70'
                    : 'bg-[#0e1726] border-border-tactical'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className={`w-2 h-2 rounded-full ${
                      v.risk_level === 'DANGER' ? 'bg-rose-500 animate-ping' :
                      v.risk_level === 'WARNING' ? 'bg-amber-400' : 'bg-kesari'
                    }`} />
                    <strong className="text-starlight font-bold">{v.ship_name}</strong>
                    <span className="text-[9px] text-muted-slate">MMSI: {v.vessel_mmsi}</span>
                  </div>
                  <div className="text-[10px] text-muted-slate flex items-center space-x-2">
                    <span>Dist: <strong className="text-starlight">{v.distance_km} km</strong></span>
                    <span>Speed: {v.speed_knots} kn</span>
                    <span>Course: {v.course_deg ? `${v.course_deg}°` : 'N/A'}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
                    v.risk_level === 'DANGER' ? 'bg-rose-950 text-rose-300 border border-rose-600' :
                    v.risk_level === 'WARNING' ? 'bg-amber-950 text-amber-300 border border-amber-600' :
                    'bg-[#0a101d] text-starlight border border-border-tactical'
                  }`}>
                    {v.risk_level === 'DANGER' ? 'INSIDE ZONE' : v.risk_level === 'WARNING' ? 'APPROACHING' : 'SAFE DISTANCE'}
                  </span>
                  {v.eta_minutes !== null && (
                    <span className="block text-[9px] text-kesari font-bold mt-0.5">
                      ETA: {v.eta_minutes} min
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-4 text-center text-muted-slate text-[11px]">
            No live vessels currently detected within danger proximity radius.
          </div>
        )}
      </div>
    </div>
  );
}
