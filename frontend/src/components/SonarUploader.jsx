import React, { useRef, useState } from 'react';
import { Compass, FileCode, FileImage, MapPin, Sparkles, UploadCloud, X, ChevronDown, ChevronUp } from 'lucide-react';
import { fetchSampleAsFile } from '../services/api';

export function SonarUploader({
  onFileSelected,
  selectedFile,
  isDetecting,
  navFile,
  setNavFile,
  swathRangeM = 50.0,
  setSwathRangeM,
  slantCorrected = true,
  setSlantCorrected,
  startLat,
  setStartLat,
  startLon,
  setStartLon,
  endLat,
  setEndLat,
  endLon,
  setEndLon,
  altitude = 0.0,
  setAltitude,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [loadingSample, setLoadingSample] = useState(false);
  const [showGeoSection, setShowGeoSection] = useState(false);
  const fileInputRef = useRef(null);
  const navInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleSampleClick = async (sampleName) => {
    try {
      setLoadingSample(true);
      const file = await fetchSampleAsFile(sampleName);
      onFileSelected(file);
      // Automatically populate standard Palk Strait track for quick demo
      if (setStartLat && !startLat) setStartLat(9.3142);
      if (setStartLon && !startLon) setStartLon(79.1821);
      if (setEndLat && !endLat) setEndLat(9.3242);
      if (setEndLon && !endLon) setEndLon(79.1821);
      if (setAltitude && !altitude) setAltitude(28.0);
    } catch (err) {
      console.error("Failed to load sample:", err);
      alert(`Could not load sample: ${err.message}`);
    } finally {
      setLoadingSample(false);
    }
  };

  const applyPalkStraitPreset = () => {
    if (setStartLat) setStartLat(9.3142);
    if (setStartLon) setStartLon(79.1821);
    if (setEndLat) setEndLat(9.3242);
    if (setEndLon) setEndLon(79.1821);
    if (setAltitude) setAltitude(28.0);
    if (setSwathRangeM) setSwathRangeM(50.0);
    setShowGeoSection(true);
  };

  return (
    <div className="bg-ocean-900 border border-ocean-800 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
          <UploadCloud className="w-4 h-4 text-cyan-400" />
          1. Upload Side-Scan Sonar Imagery
        </h3>
        {selectedFile && (
          <button
            onClick={() => onFileSelected(null)}
            className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-mono transition"
          >
            <X className="w-3.5 h-3.5" /> Clear File
          </button>
        )}
      </div>

      {/* Drag and drop box */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center min-h-[160px] ${
          isDragging
            ? 'border-cyan-400 bg-cyan-500/10'
            : selectedFile
            ? 'border-emerald-500/50 bg-emerald-500/5'
            : 'border-ocean-750 bg-ocean-850/60 hover:border-ocean-600 hover:bg-ocean-850'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.tif,.tiff"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              onFileSelected(e.target.files[0]);
            }
          }}
        />

        {selectedFile ? (
          <div className="space-y-2">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
              <FileImage className="w-6 h-6" />
            </div>
            <div>
              <p className="font-semibold text-slate-200 text-sm">{selectedFile.name}</p>
              <p className="text-xs font-mono text-slate-400">
                {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type || 'Sonar Image'}
              </p>
            </div>
            <p className="text-xs text-cyan-400 font-mono">Click or drag another file to replace</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="w-12 h-12 rounded-full bg-cyan-500/10 text-cyan-400 mx-auto flex items-center justify-center">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200">
                Drag and drop your raw side-scan sonar image here
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Supports PNG, JPG, TIFF single-beam or dual-channel waterfall transects
              </p>
            </div>
            <span className="inline-block text-xs font-mono px-3 py-1 bg-ocean-800 text-cyan-300 rounded-md border border-ocean-700">
              Browse Local Files
            </span>
          </div>
        )}
      </div>

      {/* Georeferencing & Navigation Metadata Accordion */}
      <div className="bg-ocean-850/80 border border-ocean-750 rounded-xl overflow-hidden text-xs">
        <button
          type="button"
          onClick={() => setShowGeoSection(!showGeoSection)}
          className="w-full px-4 py-2.5 flex items-center justify-between text-left font-mono font-bold text-slate-200 hover:bg-ocean-800 transition"
        >
          <span className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-kesari" />
            <span>2. Geotagging & Nav Metadata (Optional)</span>
            {(navFile || (startLat && endLat)) && (
              <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px]">
                Active
              </span>
            )}
          </span>
          {showGeoSection ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showGeoSection && (
          <div className="p-4 space-y-4 border-t border-ocean-800 bg-ocean-950/40">
            {/* Option A: Nav File Upload */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-slate-300 font-semibold font-mono flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                  Upload Navigation Log (.csv / .xtf)
                </label>
                {navFile && (
                  <button
                    type="button"
                    onClick={() => setNavFile && setNavFile(null)}
                    className="text-rose-400 hover:text-rose-300 text-[11px] font-mono"
                  >
                    Clear Nav
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  ref={navInputRef}
                  type="file"
                  accept=".csv,.xtf,.txt"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0] && setNavFile) {
                      setNavFile(e.target.files[0]);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => navInputRef.current?.click()}
                  className="px-3 py-1.5 rounded bg-ocean-800 hover:bg-ocean-750 border border-ocean-700 text-cyan-300 font-mono text-xs transition"
                >
                  {navFile ? `Selected: ${navFile.name}` : 'Choose Nav File (.csv / .xtf)'}
                </button>
                <span className="text-[11px] text-slate-400 font-mono">
                  Columns: lat, lon, heading, altitude
                </span>
              </div>
            </div>

            {/* Swath & Slant Settings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-ocean-850">
              <div>
                <label className="block text-slate-400 font-mono text-[11px] mb-1">
                  Swath Range Per Side (m)
                </label>
                <input
                  type="number"
                  min="5"
                  max="1000"
                  step="5"
                  value={swathRangeM || 50}
                  onChange={(e) => setSwathRangeM && setSwathRangeM(parseFloat(e.target.value) || 50)}
                  className="w-full px-2.5 py-1 rounded bg-ocean-900 border border-ocean-750 text-slate-200 font-mono text-xs focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div className="flex items-center space-x-2 pt-4">
                <input
                  type="checkbox"
                  id="slantCorrectedCheck"
                  checked={slantCorrected ?? true}
                  onChange={(e) => setSlantCorrected && setSlantCorrected(e.target.checked)}
                  className="rounded border-ocean-700 bg-ocean-900 text-cyan-500 focus:ring-0"
                />
                <label htmlFor="slantCorrectedCheck" className="text-slate-300 font-mono text-xs cursor-pointer">
                  Slant-range corrected imagery
                </label>
              </div>
            </div>

            {/* Option B: Fallback Start / End Coordinates */}
            <div className="pt-2 border-t border-ocean-850 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-slate-300 font-semibold flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  Fallback Straight-Track Coordinates (WGS84)
                </span>
                <button
                  type="button"
                  onClick={applyPalkStraitPreset}
                  className="text-[10px] font-mono text-kesari hover:underline font-bold"
                >
                  📍 Use Palk Strait Preset
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
                <div>
                  <span className="text-[10px] text-slate-400">Start Lat (°N)</span>
                  <input
                    type="number"
                    step="0.0001"
                    placeholder="9.3142"
                    value={startLat ?? ''}
                    onChange={(e) => setStartLat && setStartLat(e.target.value)}
                    className="w-full px-2 py-1 rounded bg-ocean-900 border border-ocean-750 text-slate-200 text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400">Start Lon (°E)</span>
                  <input
                    type="number"
                    step="0.0001"
                    placeholder="79.1821"
                    value={startLon ?? ''}
                    onChange={(e) => setStartLon && setStartLon(e.target.value)}
                    className="w-full px-2 py-1 rounded bg-ocean-900 border border-ocean-750 text-slate-200 text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400">End Lat (°N)</span>
                  <input
                    type="number"
                    step="0.0001"
                    placeholder="9.3242"
                    value={endLat ?? ''}
                    onChange={(e) => setEndLat && setEndLat(e.target.value)}
                    className="w-full px-2 py-1 rounded bg-ocean-900 border border-ocean-750 text-slate-200 text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400">End Lon (°E)</span>
                  <input
                    type="number"
                    step="0.0001"
                    placeholder="79.1821"
                    value={endLon ?? ''}
                    onChange={(e) => setEndLon && setEndLon(e.target.value)}
                    className="w-full px-2 py-1 rounded bg-ocean-900 border border-ocean-750 text-slate-200 text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Preset Sonar Samples */}
      <div className="pt-2 border-t border-ocean-850">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-mono">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Or test with verified sonar samples:
          </span>
          {loadingSample && <span className="text-cyan-400 animate-pulse">Loading sample...</span>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            disabled={isDetecting || loadingSample}
            onClick={() => handleSampleClick('sample_sonar_image6.jpg')}
            className="flex items-center justify-between px-3 py-2 rounded-lg bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-700/60 text-left transition disabled:opacity-50"
          >
            <div>
              <div className="text-xs font-bold text-cyan-300">Target Benchmark (6 Debris)</div>
              <div className="text-[11px] font-mono text-slate-400">1024x2048 • Full Multi-Target Sonar</div>
            </div>
            <span className="text-xs font-mono text-cyan-300 font-bold px-2 py-0.5 rounded bg-cyan-900 border border-cyan-600">
              Load
            </span>
          </button>

          <button
            type="button"
            disabled={isDetecting || loadingSample}
            onClick={() => handleSampleClick('sample_sonar_image.jpg')}
            className="flex items-center justify-between px-3 py-2 rounded-lg bg-ocean-850 hover:bg-ocean-800 border border-ocean-750 text-left transition disabled:opacity-50"
          >
            <div>
              <div className="text-xs font-semibold text-slate-200">Aircraft Wreckage Transect</div>
              <div className="text-[11px] font-mono text-slate-400">800x450 • Sunken aircraft acoustic shadow</div>
            </div>
            <span className="text-xs font-mono text-cyan-400 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800">
              Load
            </span>
          </button>

          <button
            type="button"
            disabled={isDetecting || loadingSample}
            onClick={() => handleSampleClick('sample_sonar.png')}
            className="flex items-center justify-between px-3 py-2 rounded-lg bg-ocean-850 hover:bg-ocean-800 border border-ocean-750 text-left transition disabled:opacity-50"
          >
            <div>
              <div className="text-xs font-semibold text-slate-200">High-Res Seabed Swath</div>
              <div className="text-[11px] font-mono text-slate-400">1024x1024 • Debris field & ripples</div>
            </div>
            <span className="text-xs font-mono text-cyan-400 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800">
              Load
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
