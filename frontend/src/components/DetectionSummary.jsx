import React from 'react';
import { Activity, AlertCircle, CheckCircle2, Clock, HelpCircle, Layers } from 'lucide-react';

export function DetectionSummary({ result }) {
  if (!result) return null;

  const summary = result.summary || {
    total: result.total_objects || 0,
    high_confidence: 0,
    medium_confidence: 0,
    low_confidence: 0,
  };

  const totalTime = result.processing_time_ms || 0;
  const prepTime = result.preprocessing_time_ms || 0;
  const inferTime = result.inference_time_ms || 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {/* Total Objects */}
      <div className="bg-ocean-900 border border-ocean-800 rounded-xl p-3.5 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
          <span>TOTAL TARGETS</span>
          <Layers className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="mt-2">
          <span className="text-2xl font-bold font-mono text-white">{summary.total}</span>
          <span className="text-xs text-slate-400 ml-1.5">objects</span>
        </div>
        <div className="text-[11px] text-cyan-400/80 font-mono mt-1">
          Model: {result.model || 'YOLO Sonar'}
        </div>
      </div>

      {/* High Confidence */}
      <div className="bg-ocean-900 border border-ocean-800 rounded-xl p-3.5 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
          <span>HIGH CONFIDENCE</span>
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="mt-2">
          <span className="text-2xl font-bold font-mono text-emerald-400">
            {summary.high_confidence}
          </span>
          <span className="text-xs text-slate-400 ml-1.5">(&ge; 70%)</span>
        </div>
        <div className="text-[11px] text-emerald-400/80 font-mono mt-1">
          High backscatter / shadow
        </div>
      </div>

      {/* Medium Confidence */}
      <div className="bg-ocean-900 border border-ocean-800 rounded-xl p-3.5 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
          <span>MEDIUM CONFIDENCE</span>
          <AlertCircle className="w-4 h-4 text-amber-400" />
        </div>
        <div className="mt-2">
          <span className="text-2xl font-bold font-mono text-amber-400">
            {summary.medium_confidence}
          </span>
          <span className="text-xs text-slate-400 ml-1.5">(40% - 70%)</span>
        </div>
        <div className="text-[11px] text-amber-400/80 font-mono mt-1">
          Probable debris feature
        </div>
      </div>

      {/* Processing Latency HUD */}
      <div className="bg-ocean-900 border border-ocean-800 rounded-xl p-3.5 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
          <span>INFERENCE LATENCY</span>
          <Clock className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="mt-2">
          <span className="text-2xl font-bold font-mono text-cyan-300">
            {Math.round(inferTime)}
          </span>
          <span className="text-xs text-slate-400 ml-1">ms</span>
        </div>
        <div className="text-[11px] font-mono text-slate-400 mt-1 truncate">
          Prep: {Math.round(prepTime)}ms • Total: {Math.round(totalTime)}ms
        </div>
      </div>
    </div>
  );
}
