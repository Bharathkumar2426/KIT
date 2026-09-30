import React from 'react';
import { ShieldAlert, AlertTriangle, Ship, Compass, ArrowRight, X, Radio, BellRing, Navigation } from 'lucide-react';

export function IncidentAlarmBanner({
  alarms = [],
  onDismissAlarm,
  onClearAll,
  onLocateIncident,
}) {
  if (!alarms || alarms.length === 0) return null;

  // Filter for high/critical breach alarms first
  const criticalAlarms = alarms.filter(
    (a) => a.alarm_level === 'LEVEL_3_ENTERED_DANGER_ZONE' || a.alarm_level === 'LEVEL_4_CRITICAL_HAZARD_BREACH'
  );
  const displayAlarms = criticalAlarms.length > 0 ? criticalAlarms : alarms;
  const topAlarm = displayAlarms[0];

  const isCritical = topAlarm.alarm_level.includes('LEVEL_3') || topAlarm.alarm_level.includes('LEVEL_4');
  const isDemo = topAlarm.data_feed_type === 'DEMO';

  return (
    <div className={`rounded-2xl p-4 border shadow-2xl font-mono text-xs transition-all backdrop-blur-xl ${
      isCritical
        ? 'bg-[#0a101d]/95 border-rose-500/80 shadow-rose-950/60 ring-1 ring-rose-500/50'
        : 'bg-[#0a101d]/95 border-amber-500/80 shadow-amber-950/60 ring-1 ring-amber-500/50'
    }`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Alarm Status & Icon */}
        <div className="flex items-center space-x-3.5">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg ${
            isCritical
              ? 'bg-rose-600 shadow-rose-600/40 animate-pulse'
              : 'bg-amber-600 shadow-amber-600/40'
          }`}>
            <BellRing className="w-6 h-6 animate-pulse" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                isDemo
                  ? 'bg-[#131d2e] text-kesari border border-kesari/40'
                  : 'bg-rose-950 text-rose-200 border border-rose-400'
              }`}>
                {isDemo ? '⚠️ DEMO AIS ALERT' : '🚨 LIVE AIS MARITIME PROXIMITY ALERT'}
              </span>

              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#0e1726] text-starlight border border-border-tactical">
                {topAlarm.alarm_level.replace(/_/g, ' ')}
              </span>

              {alarms.length > 1 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-kesari text-chakra-navy">
                  +{alarms.length - 1} more active
                </span>
              )}
            </div>

            <h3 className="text-sm sm:text-base font-bold text-starlight tracking-wide font-headline-sm">
              Vessel <span className="text-kesari underline font-bold">{topAlarm.vessel_name}</span> (MMSI: {topAlarm.vessel_mmsi}) {
                isCritical ? 'ENTERED ACTIVE DANGER ZONE' : 'IS APPROACHING ACTIVE DANGER ZONE'
              }
            </h3>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-2">
          {topAlarm.incident_id && onLocateIncident && (
            <button
              onClick={() => onLocateIncident(topAlarm.incident_id)}
              className="px-4 py-1.5 rounded-full bg-kesari hover:bg-kesari-light text-chakra-navy font-bold flex items-center space-x-1.5 text-xs transition shadow-[0_0_12px_rgba(243,139,42,0.35)]"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Locate on Map</span>
            </button>
          )}

          {onDismissAlarm && (
            <button
              onClick={() => onDismissAlarm(topAlarm.alarm_id)}
              className="px-3.5 py-1.5 rounded-full bg-[#0e1726] hover:bg-[#162235] text-starlight border border-border-tactical text-xs font-bold transition"
            >
              Acknowledge
            </button>
          )}

          {alarms.length > 1 && onClearAll && (
            <button
              onClick={onClearAll}
              className="px-3 py-1.5 rounded-full bg-[#0e1726] hover:bg-[#162235] text-muted-slate hover:text-starlight text-[11px] transition border border-border-tactical"
              title="Clear all active alarms"
            >
              Clear All ({alarms.length})
            </button>
          )}
        </div>
      </div>

      {/* Alarm Details Telemetry Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3 pt-2.5 border-t border-border-tactical/60 text-[11px] text-starlight">
        <div>
          <span className="text-muted-slate text-[10px] block uppercase font-label-caps">Hazard Event</span>
          <span className="font-bold text-starlight truncate block">{topAlarm.incident_title}</span>
        </div>
        <div>
          <span className="text-muted-slate text-[10px] block uppercase font-label-caps">Distance to Boundary</span>
          <span className="font-extrabold text-kesari">{topAlarm.distance_km} km</span>
        </div>
        <div>
          <span className="text-muted-slate text-[10px] block uppercase font-label-caps">Vessel Telemetry</span>
          <span>{topAlarm.speed_knots} kn @ {topAlarm.course_deg}°</span>
        </div>
        <div>
          <span className="text-muted-slate text-[10px] block uppercase font-label-caps">Zone Exclusion</span>
          <span className="text-rose-300 font-bold">{topAlarm.danger_radius_km} km radius</span>
        </div>
        <div>
          <span className="text-muted-slate text-[10px] block uppercase font-label-caps">Triggered At</span>
          <span className="text-starlight font-mono">
            {topAlarm.triggered_at ? new Date(topAlarm.triggered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Just now'} UTC
          </span>
        </div>
      </div>
    </div>
  );
}
