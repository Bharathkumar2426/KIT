import React from 'react';
import { Info } from 'lucide-react';

export function ImageInfoCard({
  filename = 'sample_sonar_image6.jpg',
  dimensions = { width: 1024, height: 2048 },
  location = '9.3142°N, 79.1821°E',
  altitude = '28m AGL',
  detectionCount = 0,
  model = 'sonar_v2.pt + EfficientNet-B0',
  processingTimeMs = 84,
}) {
  return (
    <div className="bg-ocean-900 border border-ocean-800 rounded-xl overflow-hidden shadow-lg">
      <div className="px-4 py-3 border-b border-ocean-800 flex items-center space-x-2 bg-ocean-850">
        <div className="w-5 h-5 rounded-full border border-cyan-400/50 flex items-center justify-center text-cyan-400">
          <Info className="w-3.5 h-3.5" />
        </div>
        <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
          Image Information
        </h3>
      </div>

      <div className="p-4 font-mono text-xs space-y-2 text-slate-300">
        <div className="flex justify-between items-center py-1 border-b border-ocean-800/40">
          <span className="text-slate-400">File:</span>
          <span className="text-slate-200 font-semibold">{filename}</span>
        </div>

        <div className="flex justify-between items-center py-1 border-b border-ocean-800/40">
          <span className="text-slate-400">Size:</span>
          <span className="text-slate-200">{dimensions.width} × {dimensions.height}</span>
        </div>

        <div className="flex justify-between items-center py-1 border-b border-ocean-800/40">
          <span className="text-slate-400">Location:</span>
          <span className="text-slate-200">{location}</span>
        </div>

        <div className="flex justify-between items-center py-1 border-b border-ocean-800/40">
          <span className="text-slate-400">Altitude:</span>
          <span className="text-slate-200">{altitude}</span>
        </div>

        <div className="flex justify-between items-center py-1 border-b border-ocean-800/40">
          <span className="text-slate-400">Detections:</span>
          <span className="text-cyan-400 font-bold">{detectionCount} objects</span>
        </div>

        <div className="flex justify-between items-center py-1 border-b border-ocean-800/40">
          <span className="text-slate-400">Model:</span>
          <span className="text-slate-200">{model}</span>
        </div>

        <div className="flex justify-between items-center py-1">
          <span className="text-slate-400">Processing Time:</span>
          <span className="text-emerald-400 font-bold">{processingTimeMs}ms</span>
        </div>
      </div>
    </div>
  );
}
