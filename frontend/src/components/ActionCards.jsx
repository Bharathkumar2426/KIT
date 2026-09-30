import React from 'react';
import { Image as ImageIcon, Map, Download, BarChart2 } from 'lucide-react';

export function ActionCards({ onUploadClick, onExportClick, onExportCsvClick, onViewMapClick }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Upload New Image */}
      <div
        onClick={onUploadClick}
        className="bg-ocean-900 border border-ocean-800 hover:border-cyan-500/50 hover:bg-ocean-850 p-4 rounded-xl cursor-pointer transition flex items-center space-x-3.5 shadow-sm group"
      >
        <div className="w-10 h-10 rounded-lg bg-cyan-950/60 border border-cyan-800/60 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition">
          <ImageIcon className="w-5 h-5" />
        </div>
        <div>
          <div className="text-xs font-bold text-slate-200">Upload New Image</div>
          <div className="text-[11px] font-mono text-slate-400">JPG, PNG, TIFF (Max 20MB)</div>
        </div>
      </div>

      {/* 2. View on Map */}
      <div
        onClick={onViewMapClick || (() => alert("Geospatial Map Visualization active."))}
        className="bg-ocean-900 border border-ocean-800 hover:border-cyan-500/50 hover:bg-ocean-850 p-4 rounded-xl cursor-pointer transition flex items-center space-x-3.5 shadow-sm group"
      >
        <div className="w-10 h-10 rounded-lg bg-cyan-950/60 border border-cyan-800/60 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition">
          <Map className="w-5 h-5" />
        </div>
        <div>
          <div className="text-xs font-bold text-slate-200">View on Map</div>
          <div className="text-[11px] font-mono text-slate-400">Georeferenced Targets</div>
        </div>
      </div>

      {/* 3. Export JSON Report */}
      <div
        onClick={onExportClick}
        className="bg-ocean-900 border border-ocean-800 hover:border-cyan-500/50 hover:bg-ocean-850 p-4 rounded-xl cursor-pointer transition flex items-center space-x-3.5 shadow-sm group"
      >
        <div className="w-10 h-10 rounded-lg bg-amber-950/60 border border-amber-800/60 flex items-center justify-center text-amber-400 group-hover:scale-105 transition">
          <Download className="w-5 h-5" />
        </div>
        <div>
          <div className="text-xs font-bold text-slate-200">Download JSON</div>
          <div className="text-[11px] font-mono text-slate-400">Standard Anomaly Report</div>
        </div>
      </div>

      {/* 4. Export CSV Report */}
      <div
        onClick={onExportCsvClick || onExportClick}
        className="bg-ocean-900 border border-ocean-800 hover:border-cyan-500/50 hover:bg-ocean-850 p-4 rounded-xl cursor-pointer transition flex items-center space-x-3.5 shadow-sm group"
      >
        <div className="w-10 h-10 rounded-lg bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition">
          <BarChart2 className="w-5 h-5" />
        </div>
        <div>
          <div className="text-xs font-bold text-slate-200">Download CSV</div>
          <div className="text-[11px] font-mono text-slate-400">Tabular Metric Report</div>
        </div>
      </div>
    </div>
  );
}
