import React from 'react';
import { Anchor, Cpu, Database, Radio, ShieldCheck, Zap } from 'lucide-react';

export function Navbar({ healthData, isDetecting, activeTab = 'analysis', onTabChange, detectionCount = 0, operator, onSignOut }) {
  const isOnline = healthData && healthData.status === 'ok';
  const isCuda = healthData?.cuda_available;
  const isSonarTrained = healthData?.is_sonar_trained;

  return (
    <header className="border-b border-ocean-850 bg-ocean-900/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo & Title */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Anchor className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg text-white tracking-wide">
                SONAR<span className="text-cyan-400">VISION</span>
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-cyan-950 text-cyan-400 border border-cyan-800/60">
                SIH26057
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans leading-none">
              Side-Scan Sonar Marine Debris & Anomaly Detection • MoES
            </p>
          </div>
        </div>

        {/* Center View Navigation Tabs */}
        {onTabChange && (
          <div className="flex items-center space-x-1.5 bg-ocean-950/80 p-1 rounded-xl border border-ocean-800 font-mono text-xs">
            <button
              onClick={() => onTabChange('analysis')}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition flex items-center space-x-2 ${
                activeTab === 'analysis'
                  ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-ocean-850'
              }`}
            >
              <span>📊 Sonar Analysis</span>
            </button>
            <button
              onClick={() => onTabChange('map')}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition flex items-center space-x-2 ${
                activeTab === 'map'
                  ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-ocean-850'
              }`}
            >
              <span>🗺️ Geospatial Map</span>
              {detectionCount > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  activeTab === 'map' ? 'bg-black text-emerald-400' : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                }`}>
                  {detectionCount}
                </span>
              )}
            </button>
            <button
              onClick={() => onTabChange('incidents')}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition flex items-center space-x-2 ${
                activeTab === 'incidents'
                  ? 'bg-gradient-to-r from-rose-500 to-amber-500 text-black shadow-md shadow-rose-500/20 font-extrabold'
                  : 'text-slate-300 hover:text-white hover:bg-ocean-850'
              }`}
            >
              <span>🚨 Maritime Incidents</span>
            </button>
          </div>
        )}

        {/* System Diagnostics HUD & Operator Controls */}
        <div className="hidden lg:flex items-center space-x-3 text-xs font-mono">
          {/* Backend Status */}
          <div className="flex items-center space-x-2 px-2.5 py-1 rounded-md bg-ocean-850 border border-ocean-700">
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
            <span className="text-slate-300">API: {isOnline ? 'ONLINE' : 'OFFLINE'}</span>
          </div>

          {/* Compute Acceleration */}
          <div className="flex items-center space-x-2 px-2.5 py-1 rounded-md bg-ocean-850 border border-ocean-700">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-300">
              {isCuda ? `CUDA (${healthData.device_name})` : 'CPU Mode'}
            </span>
          </div>

          {/* Model Status */}
          <div className={`flex items-center space-x-2 px-2.5 py-1 rounded-md border ${
            isSonarTrained 
              ? 'bg-emerald-950/50 border-emerald-700/60 text-emerald-400' 
              : 'bg-amber-950/50 border-amber-700/60 text-amber-400'
          }`}>
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="font-semibold">
              {isSonarTrained ? 'Sonar Checkpoint' : 'Base Model'}
            </span>
          </div>

          {/* Operator Badge & Sign Out */}
          {onSignOut && (
            <button
              onClick={onSignOut}
              title="Return to Samudra Rakshak Sign In Portal"
              className="flex items-center space-x-2 px-3 py-1 rounded-md bg-[#161c22] border border-[#f38b2a]/40 text-[#ffb780] hover:bg-[#f38b2a]/20 hover:text-white transition group"
            >
              <span className="w-2 h-2 rounded-full bg-[#f38b2a] animate-pulse"></span>
              <span className="font-semibold">{operator?.callSign || 'OPERATOR'}</span>
              <span className="text-slate-500 group-hover:text-slate-300 text-[10px]">✕</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
