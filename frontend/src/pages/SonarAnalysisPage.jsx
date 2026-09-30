import React, { useState, useEffect } from 'react';
import { ModelStatusBadge } from '../components/ModelStatusBadge';
import { FourTuAutomatedFeedPanel } from '../components/FourTuAutomatedFeedPanel';
import { SonarUploader } from '../components/SonarUploader';
import { ControlsPanel } from '../components/ControlsPanel';
import { SonarViewer } from '../components/SonarViewer';
import { DetectionSummary } from '../components/DetectionSummary';
import { DetectionTable } from '../components/DetectionTable';
import { ImageInfoCard } from '../components/ImageInfoCard';
import { ActionCards } from '../components/ActionCards';
import { detectSonarImage, downloadReport } from '../services/api';
import { Compass, Download, FileJson, Info } from 'lucide-react';

export function SonarAnalysisPage({ 
  healthData, 
  detectionResult: externalDetectionResult,
  setDetectionResult: setExternalDetectionResult,
  selectedDetectionId: externalSelectedId,
  setSelectedDetectionId: setExternalSelectedId,
  onViewOnMap,
}) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isDownloadingJson, setIsDownloadingJson] = useState(false);
  const [isDownloadingCsv, setIsDownloadingCsv] = useState(false);
  
  // Geotagging & Nav state
  const [navFile, setNavFile] = useState(null);
  const [swathRangeM, setSwathRangeM] = useState(50.0);
  const [slantCorrected, setSlantCorrected] = useState(true);
  const [startLat, setStartLat] = useState('9.3142');
  const [startLon, setStartLon] = useState('79.1821');
  const [endLat, setEndLat] = useState('9.3242');
  const [endLon, setEndLon] = useState('79.1821');
  const [altitude, setAltitude] = useState(28.0);

  const [internalDetectionResult, setInternalDetectionResult] = useState(null);
  const detectionResult = externalDetectionResult !== undefined ? externalDetectionResult : internalDetectionResult;
  const setDetectionResult = setExternalDetectionResult || setInternalDetectionResult;

  const [activeView, setActiveView] = useState('annotated');
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.20);
  const [iouThreshold, setIouThreshold] = useState(0.45);
  const [enablePreprocessing, setEnablePreprocessing] = useState(true);

  const [internalSelectedId, setInternalSelectedId] = useState(null);
  const selectedDetectionId = externalSelectedId !== undefined ? externalSelectedId : internalSelectedId;
  const setSelectedDetectionId = setExternalSelectedId || setInternalSelectedId;

  const [hoveredDetectionId, setHoveredDetectionId] = useState(null);
  const [error, setError] = useState(null);

  // Clear selections on new file
  const handleFileSelected = (file) => {
    setSelectedFile(file);
    setDetectionResult(null);
    setSelectedDetectionId(null);
    setHoveredDetectionId(null);
    setError(null);
  };

  // Run Real ML Inference with Georeferencing
  const handleRunDetection = async () => {
    if (!selectedFile) return;

    try {
      setIsDetecting(true);
      setError(null);

      const result = await detectSonarImage(selectedFile, {
        confidenceThreshold,
        iouThreshold,
        enablePreprocessing,
        navFile,
        swathRangeM,
        slantCorrected,
        startLat,
        startLon,
        endLat,
        endLon,
        altitude,
      });

      setDetectionResult(result);
      setActiveView('annotated');
      setSelectedDetectionId(null);
    } catch (err) {
      console.error("Detection error:", err);
      setError(err.message || 'Detection failed.');
    } finally {
      setIsDetecting(false);
    }
  };

  // Export / Download JSON Report
  const handleDownloadJsonReport = async () => {
    if (!detectionResult?.image_id) return;
    try {
      setIsDownloadingJson(true);
      setError(null);
      await downloadReport(detectionResult.image_id, 'json');
    } catch (err) {
      console.error("JSON report download error:", err);
      setError(`JSON report download error: ${err.message}`);
    } finally {
      setIsDownloadingJson(false);
    }
  };

  // Export / Download CSV Report
  const handleDownloadCsvReport = async () => {
    if (!detectionResult?.image_id) return;
    try {
      setIsDownloadingCsv(true);
      setError(null);
      await downloadReport(detectionResult.image_id, 'csv');
    } catch (err) {
      console.error("CSV report download error:", err);
      setError(`CSV report download error: ${err.message}`);
    } finally {
      setIsDownloadingCsv(false);
    }
  };

  // Download Annotated Image
  const handleDownloadAnnotated = () => {
    if (!detectionResult?.image_id) return;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', `/api/images/${detectionResult.image_id}/annotated`);
    downloadAnchor.setAttribute('download', `${detectionResult.image_id}_annotated.png`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      {/* Model Diagnostic Badge */}
      <ModelStatusBadge
        healthData={healthData}
        modelMetadata={detectionResult?.model_metadata}
      />

      {/* Automated Research Sonar Feed (4TU.ResearchData) */}
      <FourTuAutomatedFeedPanel 
        onViewOnMap={onViewOnMap}
        onSyncCompleted={(res) => {
          console.log("4TU Sync completed:", res);
        }}
      />

      {/* Error Alert */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 text-rose-400 text-sm font-mono flex items-center justify-between">
          <span>Error: {error}</span>
          <button onClick={() => setError(null)} className="text-xs hover:text-white font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* Geotagging Warning Banner if applicable */}
      {detectionResult?.geotagging_warning && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-amber-300 text-xs font-mono flex items-center gap-2">
          <Info className="w-4 h-4 shrink-0 text-amber-400" />
          <span>Notice: {detectionResult.geotagging_warning}</span>
        </div>
      )}

      {/* Upload & Calibration Section (collapsible when results are active) */}
      {(!detectionResult || selectedFile === null) ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <SonarUploader
              selectedFile={selectedFile}
              onFileSelected={handleFileSelected}
              isDetecting={isDetecting}
              navFile={navFile}
              setNavFile={setNavFile}
              swathRangeM={swathRangeM}
              setSwathRangeM={setSwathRangeM}
              slantCorrected={slantCorrected}
              setSlantCorrected={setSlantCorrected}
              startLat={startLat}
              setStartLat={setStartLat}
              startLon={startLon}
              setStartLon={setStartLon}
              endLat={endLat}
              setEndLat={setEndLat}
              endLon={endLon}
              setEndLon={setEndLon}
              altitude={altitude}
              setAltitude={setAltitude}
            />
          </div>

          <div className="lg:col-span-5">
            <ControlsPanel
              confidenceThreshold={confidenceThreshold}
              setConfidenceThreshold={setConfidenceThreshold}
              iouThreshold={iouThreshold}
              setIouThreshold={setIouThreshold}
              enablePreprocessing={enablePreprocessing}
              setEnablePreprocessing={setEnablePreprocessing}
              onRunDetection={handleRunDetection}
              isDetecting={isDetecting}
              hasImage={!!selectedFile}
              hasResults={!!detectionResult}
              onResetUpload={() => handleFileSelected(null)}
              onDownloadAnnotated={handleDownloadAnnotated}
              onExportJson={handleDownloadJsonReport}
              onDownloadCsv={handleDownloadCsvReport}
              isDownloadingJson={isDownloadingJson}
              isDownloadingCsv={isDownloadingCsv}
              activeView={activeView}
              setActiveView={setActiveView}
            />
          </div>
        </div>
      ) : (
        <details className="bg-ocean-900 border border-ocean-800 rounded-xl p-3 text-xs font-mono text-slate-400">
          <summary className="cursor-pointer font-bold text-cyan-400 hover:text-cyan-300">
            ⚙️ Calibration Controls & Navigation Inputs (Click to adjust thresholds / track coordinates)
          </summary>
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7">
              <SonarUploader
                selectedFile={selectedFile}
                onFileSelected={handleFileSelected}
                isDetecting={isDetecting}
                navFile={navFile}
                setNavFile={setNavFile}
                swathRangeM={swathRangeM}
                setSwathRangeM={setSwathRangeM}
                slantCorrected={slantCorrected}
                setSlantCorrected={setSlantCorrected}
                startLat={startLat}
                setStartLat={setStartLat}
                startLon={startLon}
                setStartLon={setStartLon}
                endLat={endLat}
                setEndLat={setEndLat}
                endLon={endLon}
                setEndLon={setEndLon}
                altitude={altitude}
                setAltitude={setAltitude}
              />
            </div>
            <div className="lg:col-span-5">
              <ControlsPanel
                confidenceThreshold={confidenceThreshold}
                setConfidenceThreshold={setConfidenceThreshold}
                iouThreshold={iouThreshold}
                setIouThreshold={setIouThreshold}
                enablePreprocessing={enablePreprocessing}
                setEnablePreprocessing={setEnablePreprocessing}
                onRunDetection={handleRunDetection}
                isDetecting={isDetecting}
                hasImage={!!selectedFile}
                hasResults={!!detectionResult}
                onResetUpload={() => handleFileSelected(null)}
                onDownloadAnnotated={handleDownloadAnnotated}
                onExportJson={handleDownloadJsonReport}
                onDownloadCsv={handleDownloadCsvReport}
                isDownloadingJson={isDownloadingJson}
                isDownloadingCsv={isDownloadingCsv}
                activeView={activeView}
                setActiveView={setActiveView}
              />
            </div>
          </div>
        </details>
      )}

      {/* Main Analysis Section */}
      {detectionResult && (
        <div className="space-y-6 animate-fadeIn">
          {/* Main 2-Column Grid: Viewer on left, Table + Info Card on right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Interactive Deep-Zoom Sonar Viewer */}
            <div className="lg:col-span-7 xl:col-span-8">
              <SonarViewer
                detectionResult={detectionResult}
                activeView={activeView}
                setActiveView={setActiveView}
                selectedDetectionId={selectedDetectionId}
                hoveredDetectionId={hoveredDetectionId}
                onSelectDetection={setSelectedDetectionId}
                onHoverDetection={setHoveredDetectionId}
              />
            </div>

            {/* Right: Detected Targets Table & Image Information Card */}
            <div className="lg:col-span-5 xl:col-span-4 space-y-6">
              <DetectionTable
                detections={detectionResult.detections}
                selectedDetectionId={selectedDetectionId}
                hoveredDetectionId={hoveredDetectionId}
                onSelectDetection={setSelectedDetectionId}
                onHoverDetection={setHoveredDetectionId}
                confidenceThreshold={confidenceThreshold}
                onViewOnMap={onViewOnMap}
                onDownloadJson={handleDownloadJsonReport}
                onDownloadCsv={handleDownloadCsvReport}
                isDownloadingJson={isDownloadingJson}
                isDownloadingCsv={isDownloadingCsv}
              />

              <ImageInfoCard
                filename={selectedFile?.name || detectionResult.image_id || 'sample_sonar_image6.jpg'}
                dimensions={{
                  width: detectionResult.image_width || (detectionResult.stage_images?.original ? 800 : 1024),
                  height: detectionResult.image_height || (detectionResult.stage_images?.original ? 600 : 2048),
                }}
                location={
                  detectionResult.detections?.[0]?.latitude 
                    ? `${detectionResult.detections[0].latitude.toFixed(4)}°N, ${detectionResult.detections[0].longitude.toFixed(4)}°E`
                    : "9.3142°N, 79.1821°E"
                }
                altitude={`${altitude || 28}m AGL`}
                detectionCount={detectionResult.detections?.length || 0}
                model={detectionResult.model || "sonar_v2.pt + EfficientNet-B0"}
                processingTimeMs={Math.round(detectionResult.processing_time_ms || 84)}
              />

            </div>
          </div>

          {/* Bottom Action Cards */}
          <ActionCards
            onUploadClick={() => handleFileSelected(null)}
            onExportClick={handleDownloadJsonReport}
            onExportCsvClick={handleDownloadCsvReport}
            onViewMapClick={onViewOnMap}
          />
        </div>
      )}
    </div>
  );
}
