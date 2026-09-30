import React from 'react';
import { Ship, Radio, AlertCircle } from 'lucide-react';

const STATUS_STYLES = {
  LIVE: {
    bg: 'bg-emerald-950/80',
    border: 'border-emerald-600/60',
    text: 'text-emerald-400',
    dot: 'bg-emerald-400',
    pulse: 'animate-pulse',
    label: 'AIS LIVE',
  },
  CONNECTING: {
    bg: 'bg-amber-950/80',
    border: 'border-amber-600/60',
    text: 'text-amber-400',
    dot: 'bg-amber-400',
    pulse: 'animate-ping',
    label: 'CONNECTING',
  },
  OFFLINE: {
    bg: 'bg-rose-950/80',
    border: 'border-rose-600/60',
    text: 'text-rose-400',
    dot: 'bg-rose-500',
    pulse: '',
    label: 'AIS OFFLINE',
  },
  NOT_CONFIGURED: {
    bg: 'bg-slate-900/80',
    border: 'border-slate-700/60',
    text: 'text-slate-400',
    dot: 'bg-slate-500',
    pulse: '',
    label: 'AIS NOT CONFIGURED',
  },
};

export function AisStatusBadge({ status = 'OFFLINE', vesselCount = 0, lastUpdate = null, className = '' }) {
  const cfg = STATUS_STYLES[status] || STATUS_STYLES.OFFLINE;

  const formatTime = (isoString) => {
    if (!isoString) return null;
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return null;
    }
  };

  const formattedTime = formatTime(lastUpdate);

  return (
    <div
      className={`inline-flex items-center space-x-2 px-2.5 py-1 rounded-lg border font-mono text-[11px] shadow-sm select-none ${cfg.bg} ${cfg.border} ${cfg.text} ${className}`}
      title={`AIS Status: ${cfg.label} | Tracked Vessels: ${vesselCount}${formattedTime ? ` | Last Update: ${formattedTime}` : ''}`}
    >
      <div className="flex items-center space-x-1.5">
        <span className="relative flex h-2 w-2">
          {cfg.pulse && (
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${cfg.dot}`}
            />
          )}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${cfg.dot}`} />
        </span>
        <span className="font-bold tracking-wider">{cfg.label}</span>
      </div>

      <span className="text-slate-600">|</span>

      <div className="flex items-center space-x-1">
        <Ship className="w-3 h-3 text-cyan-400" />
        <span className="font-semibold text-white">{vesselCount}</span>
        <span className="text-slate-400 text-[10px]">vessels</span>
      </div>

      {formattedTime && (
        <>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <span className="text-slate-400 text-[10px] hidden sm:inline">{formattedTime}</span>
        </>
      )}
    </div>
  );
}
