import React, { useRef, useState, useEffect } from 'react';
import { 
  Eye, Maximize2, Minimize2, Move, RotateCcw, 
  ZoomIn, ZoomOut, Layers, Target, Info 
} from 'lucide-react';

export function SonarViewer({
  detectionResult,
  activeView,
  setActiveView,
  selectedDetectionId,
  hoveredDetectionId,
  onSelectDetection,
  onHoverDetection,
}) {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imgNaturalSize, setImgNaturalSize] = useState({ width: 800, height: 600 });

  // Reset zoom when new image is loaded
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [detectionResult?.image_id]);

  if (!detectionResult) {
    return (
      <div className="bg-ocean-900 border border-ocean-800 rounded-xl p-8 flex flex-col items-center justify-center min-h-[480px] text-center">
        <div className="w-16 h-16 rounded-2xl bg-ocean-850 border border-ocean-750 flex items-center justify-center text-slate-500 mb-4">
          <Eye className="w-8 h-8 text-cyan-500/40" />
        </div>
        <h3 className="text-base font-semibold text-slate-200">No Sonar Image Loaded</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">
          Upload a side-scan sonar image or select a sample above, then click Analyze to run the detection pipeline.
        </p>
      </div>
    );
  }

  // Determine current image source based on active stage tab
  const stageImages = detectionResult.stage_images || {};
  let currentImgSrc = stageImages.enhanced || stageImages.original || stageImages.annotated || detectionResult.annotated_image_url;

  if (activeView === 'original' && stageImages.original) {
    currentImgSrc = stageImages.original;
  } else if (activeView === 'enhanced' && stageImages.enhanced) {
    currentImgSrc = stageImages.enhanced;
  } else if (activeView === 'denoised' && stageImages.denoised) {
    currentImgSrc = stageImages.denoised;
  } else if (activeView === 'annotated') {
    currentImgSrc = stageImages.enhanced || stageImages.original || stageImages.annotated;
  }

  // Pan handlers
  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Wheel zoom handler
  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = 1.15;
    if (e.deltaY < 0) {
      setScale((s) => Math.min(6.0, s * zoomFactor));
    } else {
      setScale((s) => Math.max(0.5, s / zoomFactor));
    }
  };

  const handleResetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const detections = detectionResult.detections || [];

  return (
    <div className="bg-ocean-900 border border-ocean-800 rounded-xl overflow-hidden shadow-lg flex flex-col">
      {/* Viewer Toolbar & View Switcher */}
      <div className="border-b border-ocean-800 bg-ocean-850 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
        {/* Stage Comparison Tabs */}
        <div className="flex items-center space-x-1 bg-ocean-900 p-1 rounded-lg border border-ocean-750">
          <button
            onClick={() => setActiveView('original')}
            className={`px-3 py-1 rounded text-xs font-medium transition ${
              activeView === 'original'
                ? 'bg-cyan-500 text-black font-semibold shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            1. Original Sonar
          </button>
          <button
            onClick={() => setActiveView('enhanced')}
            className={`px-3 py-1 rounded text-xs font-medium transition ${
              activeView === 'enhanced'
                ? 'bg-cyan-500 text-black font-semibold shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            2. Enhanced (CLAHE)
          </button>
          <button
            onClick={() => setActiveView('denoised')}
            className={`px-3 py-1 rounded text-xs font-medium transition ${
              activeView === 'denoised'
                ? 'bg-cyan-500 text-black font-semibold shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            3. Denoised
          </button>
          <button
            onClick={() => setActiveView('annotated')}
            className={`px-3 py-1 rounded text-xs font-medium transition flex items-center space-x-1.5 ${
              activeView === 'annotated'
                ? 'bg-cyan-500 text-black font-semibold shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>4. Detected Targets ({detections.length})</span>
          </button>
        </div>

        {/* Pan / Zoom Actions */}
        <div className="flex items-center space-x-1 bg-ocean-900 px-2 py-1 rounded-lg border border-ocean-750 text-slate-300 text-xs font-mono">
          <button
            onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}
            className="p-1 hover:text-white hover:bg-ocean-800 rounded transition"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="px-1.5 font-bold text-cyan-400">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale((s) => Math.min(6.0, s + 0.25))}
            className="p-1 hover:text-white hover:bg-ocean-800 rounded transition"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetZoom}
            className="p-1 hover:text-white hover:bg-ocean-800 rounded transition ml-1"
            title="Reset Zoom & Pan"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Canvas Viewport */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className={`relative w-full h-[540px] bg-slate-950 overflow-hidden flex items-center justify-center select-none ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        <div
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
          }}
          className="relative inline-block"
        >
          <img
            src={currentImgSrc}
            alt="Sonar Analysis"
            onLoad={(e) => {
              setImgNaturalSize({
                width: e.target.naturalWidth || 800,
                height: e.target.naturalHeight || 600,
              });
            }}
            className="max-h-[540px] max-w-full block object-contain pointer-events-none"
          />

          {/* Interactive SVG Bounding Box Layer */}
          {activeView === 'annotated' && (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-auto"
              viewBox={`0 0 ${imgNaturalSize.width} ${imgNaturalSize.height}`}
            >
              {detections.map((det) => {
                let x1, y1, x2, y2;
                if (Array.isArray(det.bbox)) {
                  [x1, y1, x2, y2] = det.bbox;
                } else if (det.bbox) {
                  x1 = det.bbox.x;
                  y1 = det.bbox.y;
                  x2 = det.bbox.x + det.bbox.width;
                  y2 = det.bbox.y + det.bbox.height;
                } else {
                  x1 = 0; y1 = 0; x2 = 0; y2 = 0;
                }

                const width = Math.max(1, x2 - x1);
                const height = Math.max(1, y2 - y1);
                const isSelected = selectedDetectionId === det.id;
                const isHovered = hoveredDetectionId === det.id;
                const isActive = isSelected || isHovered;

                const CLASS_COLORS = {
                  metal_drum: '#10b981',      // Emerald Green
                  tire_wheel: '#3b82f6',      // Dodger Blue
                  ghost_net: '#f59e0b',       // Amber Orange
                  plastic_debris: '#ef4444',  // Rose Red
                  sunken_wreckage: '#a855f7', // Royal Purple
                  pipe_pipeline: '#eab308',   // Yellow Gold
                  container_crate: '#14b8a6', // Teal
                  anchor_chain: '#f97316',    // Deep Orange
                  wood_debris: '#b45309',     // Warm Bronze
                  rock_boulder: '#84cc16',    // Lime Green
                  unknown_debris: '#06b6d4',  // Cyan
                  unknown_anomaly: '#06b6d4', // Cyan
                };

                const cName = det.class_name || det.class || 'unknown_debris';
                const boxColor = CLASS_COLORS[cName] || '#06b6d4';
                const labelText = `${cName} ${(det.confidence || 0).toFixed(2)}`;
                const pillWidth = Math.max(90, labelText.length * 8.5 + 14);
                const pillHeight = 22;
                const pillY = Math.max(2, y1 - pillHeight);


                return (
                  <g
                    key={det.id}
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectDetection(det.id);
                    }}
                    onMouseEnter={() => onHoverDetection(det.id)}
                    onMouseLeave={() => onHoverDetection(null)}
                  >
                    {/* Bounding Box Rect */}
                    <rect
                      x={x1}
                      y={y1}
                      width={width}
                      height={height}
                      rx={3}
                      ry={3}
                      fill={isActive ? `${boxColor}22` : 'transparent'}
                      stroke={boxColor}
                      strokeWidth={isActive ? 3 : 2}
                      className="transition-all duration-150"
                    />

                    {/* Centroid reticle if hovered or selected */}
                    {isActive && det.center && (
                      <>
                        <circle
                          cx={det.center.x}
                          cy={det.center.y}
                          r={8}
                          stroke="#facc15"
                          strokeWidth={1.5}
                          fill="none"
                          opacity={0.9}
                        />
                        <circle
                          cx={det.center.x}
                          cy={det.center.y}
                          r={3}
                          fill="#facc15"
                        />
                      </>
                    )}

                    {/* Solid Colored Label Badge: <class_name> <conf> */}
                    <rect
                      x={x1}
                      y={pillY}
                      width={pillWidth}
                      height={pillHeight}
                      rx={3}
                      ry={3}
                      fill={boxColor}
                      filter="drop-shadow(0 2px 4px rgba(0,0,0,0.6))"
                    />
                    <text
                      x={x1 + 6}
                      y={pillY + 15}
                      fill="#ffffff"
                      fontSize={11.5}
                      fontWeight="bold"
                      fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                      letterSpacing="0.3px"
                    >
                      {labelText}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}
        </div>

        {/* Telemetry HUD Pill */}
        <div className="absolute bottom-3 left-3 z-20 px-3.5 py-1.5 rounded-full bg-black/85 border border-slate-700/60 text-xs font-mono text-slate-200 backdrop-blur-md flex items-center space-x-2 shadow-lg">
          <span>Alt: 28m AGL</span>
          <span className="text-slate-500">•</span>
          <span>Lat: 9.3142°N</span>
          <span className="text-slate-500">•</span>
          <span>Lng: 79.1821°E</span>
          <span className="text-slate-500">•</span>
          <span className="text-cyan-400 font-bold uppercase">{activeView}</span>
        </div>
      </div>
    </div>
  );
}
