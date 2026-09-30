import React from 'react';
import { 
  Download, FileJson, Filter, Play, 
  RefreshCw, RotateCcw, Sliders, Sparkles 
} from 'lucide-react';

export function ControlsPanel({
  confidenceThreshold,
  setConfidenceThreshold,
  iouThreshold,
  setIouThreshold,
  enablePreprocessing,
  setEnablePreprocessing,
  onRunDetection,
  isDetecting,
  hasImage,
  hasResults,
  onResetUpload,
  onDownloadAnnotated,
  onExportJson,
  onDownloadCsv,
  isDownloadingJson,
  isDownloadingCsv,
  activeView,
  setActiveView,
}) {
  const confidencePresets = [0.10, 0.15, 0.20, 0.25, 0.40, 0.50, 0.60, 0.70];

  return (
    <div className="bg-ocean-900 border border-ocean-800 rounded-xl p-5 shadow-sm space-y-5">
      <div className="flex items-center justify-between border-b border-ocean-800 pb-3">
        <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-mono flex items-center gap-2">
          <Sliders className="w-4 h-4 text-cyan-400" />
          2. Detection Controls & Calibration
        </h3>
        {hasResults && (
          <span className="text-xs font-mono text-emerald-400">
            Active Threshold: {(confidenceThreshold * 100).toFixed(0)}%
          </span>
        )}
      </div>

      {/* Main Analyze Action Button */}
      <div>
        <button
          type="button"
          disabled={!hasImage || isDetecting}
          onClick={onRunDetection}
          className={`w-full py-3 px-4 rounded-xl font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition ${
            !hasImage
              ? 'bg-ocean-800 text-slate-500 cursor-not-allowed border border-ocean-750'
              : isDetecting
              ? 'bg-cyan-600 text-white cursor-wait animate-pulse'
              : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/25 active:scale-[0.99]'
          }`}
        >
          {isDetecting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Running Sonar Inference...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-white" />
              Analyze Sonar Imagery
            </>
          )}
        </button>
      </div>

      {/* Confidence Threshold Slider & Presets (Section 9) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-slate-300 font-semibold flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-cyan-400" />
            Confidence Threshold:
          </span>
          <span className="text-cyan-400 font-bold text-sm">
            {(confidenceThreshold * 100).toFixed(0)}%
          </span>
        </div>

        <input
          type="range"
          min="0.05"
          max="0.95"
          step="0.05"
          value={confidenceThreshold}
          onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-ocean-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
        />

        {/* Preset Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[10px] font-mono text-slate-500 mr-1">Presets:</span>
          {confidencePresets.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setConfidenceThreshold(preset)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono transition ${
                Math.abs(confidenceThreshold - preset) < 0.01
                  ? 'bg-cyan-500 text-black font-bold'
                  : 'bg-ocean-850 hover:bg-ocean-750 text-slate-400 border border-ocean-800'
              }`}
            >
              {(preset * 100).toFixed(0)}%
            </button>
          ))}
        </div>
      </div>

      {/* IoU / NMS Threshold Slider */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-slate-300 font-semibold">NMS / IoU Threshold:</span>
          <span className="text-slate-400">{(iouThreshold * 100).toFixed(0)}%</span>
        </div>
        <input
          type="range"
          min="0.10"
          max="0.90"
          step="0.05"
          value={iouThreshold}
          onChange={(e) => setIouThreshold(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-ocean-800 rounded-lg appearance-none cursor-pointer accent-slate-400"
        />
      </div>

      {/* Modular Preprocessing Toggle (Section 3) */}
      <div className="pt-3 border-t border-ocean-800 flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-slate-200">Acoustic Preprocessing</div>
          <div className="text-[11px] text-slate-400">CLAHE + Bilateral edge-preserving filter</div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={enablePreprocessing}
            onChange={(e) => setEnablePreprocessing(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-ocean-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
        </label>
      </div>

      {/* Quick View Controls & Export Buttons (Section 11) */}
      {hasResults && (
        <div className="pt-3 border-t border-ocean-800 space-y-3">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
            Anomaly Reports & Export
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={isDownloadingJson}
              onClick={onExportJson}
              className="px-3 py-2 rounded-lg bg-ocean-850 hover:bg-ocean-750 border border-ocean-700 text-xs font-medium text-slate-200 flex items-center justify-center gap-1.5 transition disabled:opacity-50"
            >
              {isDownloadingJson ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
              ) : (
                <FileJson className="w-3.5 h-3.5 text-amber-400" />
              )}
              Download JSON
            </button>
            <button
              type="button"
              disabled={isDownloadingCsv}
              onClick={onDownloadCsv || onExportJson}
              className="px-3 py-2 rounded-lg bg-ocean-850 hover:bg-ocean-750 border border-ocean-700 text-xs font-medium text-slate-200 flex items-center justify-center gap-1.5 transition disabled:opacity-50"
            >
              {isDownloadingCsv ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
              ) : (
                <Download className="w-3.5 h-3.5 text-emerald-400" />
              )}
              Download CSV
            </button>
          </div>
          <button
            type="button"
            onClick={onDownloadAnnotated}
            className="w-full px-3 py-1.5 rounded-lg bg-ocean-850 hover:bg-ocean-750 border border-ocean-700 text-xs font-medium text-slate-300 flex items-center justify-center gap-1.5 transition"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            Download Annotated Image
          </button>
        </div>
      )}
    </div>
  );
}
