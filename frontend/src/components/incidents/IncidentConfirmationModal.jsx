import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, MapPin, CheckCircle2, X, Compass, Radio } from 'lucide-react';

export function IncidentConfirmationModal({
  incident,
  onConfirm,
  onClose,
  isProcessing = false,
}) {
  if (!incident) return null;

  const [dangerRadius, setDangerRadius] = useState(incident.affected_area_radius_km || 5.0);
  const [operatorNotes, setOperatorNotes] = useState('');

  const hasCoords = incident.latitude !== null && incident.longitude !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 font-mono">
      <div className="bg-[#0a101d] border border-kesari/50 rounded-2xl max-w-xl w-full p-6 shadow-2xl shadow-black/80 space-y-5 text-xs text-starlight animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border-tactical pb-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-kesari/15 border border-kesari/40 flex items-center justify-center text-kesari shadow-[0_0_12px_rgba(243,139,42,0.2)]">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] text-kesari font-bold uppercase tracking-wider font-label-caps">
                Human-in-the-Loop Confirmation
              </span>
              <h3 className="text-base font-bold text-starlight leading-tight font-headline-sm">
                Confirm Maritime Incident Mapping
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-[#131d2e] text-muted-slate hover:text-starlight transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning Notice */}
        <div className="bg-[#070b12] border border-amber-500/30 rounded-xl p-3 text-amber-200 text-[11px] space-y-1">
          <p className="font-bold flex items-center space-x-1.5 text-amber-400">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Operational Safety Protocol</span>
          </p>
          <p className="text-muted-slate">
            Plotting this incident will generate an active navigation hazard marker and dynamic danger-zone perimeter on the Incident Intelligence Map for all operators.
          </p>
        </div>

        {/* Incident Summary Card */}
        <div className="bg-[#070b12] border border-border-tactical rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-kesari font-bold">#{incident.incident_id}</span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-600/50">
              {incident.severity}
            </span>
          </div>
          <p className="font-bold text-starlight text-sm font-headline-sm">{incident.title}</p>

          <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-slate pt-1 border-t border-border-tactical/60">
            <div>
              <span className="block text-[10px] text-slate-500 font-label-caps">TYPE</span>
              <span className="text-starlight font-semibold">{incident.incident_type}</span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-500 font-label-caps">LOCATION</span>
              <span className="text-kesari font-semibold">{incident.location_text}</span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-500 font-label-caps">COORDINATES</span>
              <span className={hasCoords ? "text-tiranga-green font-bold" : "text-rose-400 font-bold"}>
                {hasCoords ? `${incident.latitude}°N, ${incident.longitude}°E` : "UNVERIFIED (Cannot Map)"}
              </span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-500 font-label-caps">CONFIDENCE</span>
              <span className="text-starlight font-semibold">{(incident.confidence * 100).toFixed(0)}% (Multi-source)</span>
            </div>
          </div>
        </div>

        {/* Danger Zone Radius Customizer */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-starlight uppercase font-label-caps">
              Danger Exclusion Radius: <span className="text-kesari">{dangerRadius} km</span>
            </label>
            <span className="text-[10px] text-muted-slate">Recommended: {incident.affected_area_radius_km || 5} km</span>
          </div>
          <input
            type="range"
            min="1"
            max="30"
            step="0.5"
            value={dangerRadius}
            onChange={(e) => setDangerRadius(parseFloat(e.target.value))}
            className="w-full accent-kesari"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-2 border-t border-border-tactical">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 rounded-full bg-[#0e1726] hover:bg-[#162235] text-starlight border border-border-tactical font-bold transition"
          >
            Cancel
          </button>

          <button
            onClick={() => onConfirm(incident.incident_id, dangerRadius, operatorNotes)}
            disabled={isProcessing || !hasCoords}
            className="px-5 py-2 rounded-full bg-kesari hover:bg-kesari-light text-chakra-navy font-bold flex items-center space-x-2 shadow-[0_0_16px_rgba(243,139,42,0.35)] transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <MapPin className="w-4 h-4" />
            <span>{isProcessing ? 'Marking Map...' : 'Confirm & Mark on Map'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
