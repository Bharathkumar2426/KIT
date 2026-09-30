import React, { useState } from 'react';
import { AlertTriangle, ShieldAlert, X, ChevronDown, ChevronUp, Ship } from 'lucide-react';

export function VesselAlertsBanner({ alerts = [], onDismiss, onLocateVessel }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!alerts || alerts.length === 0) return null;

  return (
    <div className="bg-[#0a101d]/95 border border-rose-600/70 rounded-2xl p-4 shadow-2xl backdrop-blur-xl font-mono transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-rose-600 flex items-center justify-center text-white animate-pulse shadow-md shadow-rose-600/40">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-xs text-starlight uppercase tracking-wider font-headline-sm">
                Maritime Navigation Safety Alert ({alerts.length})
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white animate-pulse shadow-sm">
                PROXIMITY WARNING
              </span>
            </div>
            <p className="text-[11px] text-muted-slate mt-0.5">
              Live AIS vessel(s) approaching or inside underwater debris exclusion geofences.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="px-3 py-1 text-rose-200 hover:text-white rounded-full bg-rose-950/80 hover:bg-rose-900 border border-rose-700/60 transition text-[11px] font-bold flex items-center space-x-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear Alerts</span>
            </button>
          )}

          <button
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="p-1.5 text-muted-slate hover:text-starlight rounded-full bg-[#0e1726] hover:bg-[#162235] border border-border-tactical transition text-xs flex items-center space-x-1"
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            <span className="text-[10px] pr-1">{isCollapsed ? 'Show Details' : 'Collapse'}</span>
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="mt-3 pt-3 border-t border-border-tactical/60 space-y-2 max-h-48 overflow-y-auto">
          {alerts.map((alert, idx) => {
            const isInside = alert.status === 'INSIDE';
            return (
              <div
                key={alert.vessel_mmsi + '_' + alert.detection_id + '_' + idx}
                className={`p-3 rounded-xl border text-xs flex flex-wrap items-center justify-between gap-2 ${
                  isInside
                    ? 'bg-rose-950/40 border-rose-500/70 text-starlight'
                    : 'bg-amber-950/30 border-amber-600/50 text-starlight'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Ship className="w-4 h-4 text-kesari flex-shrink-0" />
                  <div>
                    <span className="font-bold text-starlight">{alert.ship_name}</span>{' '}
                    <span className="text-muted-slate text-[11px]">(MMSI: {alert.vessel_mmsi})</span>
                    <div className="text-[11px] mt-0.5">
                      {isInside ? (
                        <span className="text-rose-400 font-bold">
                          ⛔ INSIDE Exclusion Zone #{alert.detection_id} ({alert.debris_class}, {alert.severity})
                        </span>
                      ) : (
                        <span className="text-amber-400 font-bold">
                          ⚠️ APPROACHING Hazard #{alert.detection_id} ({alert.debris_class}, {alert.severity})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <div className="text-[10px] text-muted-slate uppercase">Distance</div>
                    <div className={`font-bold ${isInside ? 'text-rose-400 text-sm' : 'text-amber-400'}`}>
                      {alert.distance_meters}m
                    </div>
                  </div>

                  {onLocateVessel && (
                    <button
                      onClick={() => onLocateVessel(alert.vessel_mmsi)}
                      className="px-3 py-1 rounded-full bg-kesari hover:bg-kesari-light text-chakra-navy text-[10px] font-bold transition shadow-sm"
                    >
                      Locate
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
