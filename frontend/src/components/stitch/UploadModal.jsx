import React, { useState, useEffect } from 'react';
import { detectSonarImage, getSamplesList, fetchSampleAsFile } from '../../services/api';

export default function UploadModal({ isOpen, onClose, onDetectionSuccess }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [samples, setSamples] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.25);

  useEffect(() => {
    if (isOpen) {
      getSamplesList().then(setSamples).catch(() => setSamples([]));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
      setResult(null);
      setError(null);
    }
  };

  const handleSelectSample = async (sampleName) => {
    try {
      setIsProcessing(true);
      setError(null);
      const sampleFile = await fetchSampleAsFile(sampleName);
      setFile(sampleFile);
      setPreviewUrl(URL.createObjectURL(sampleFile));
      setIsProcessing(false);
    } catch (err) {
      setIsProcessing(false);
      setError(`Failed to load sample: ${err.message}`);
    }
  };

  const handleRunInference = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);

    try {
      const data = await detectSonarImage(file, {
        confidenceThreshold,
        iouThreshold: 0.45,
        enablePreprocessing: true,
      });
      setResult(data);
      if (onDetectionSuccess) onDetectionSuccess(data);
    } catch (err) {
      setError(err.message || 'Detection failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-space-md bg-surface-container-lowest/80 backdrop-blur-md">
      <div className="relative w-full max-w-2xl rounded-xl bg-surface-container-low border border-primary-container/40 p-space-lg shadow-2xl flex flex-col gap-space-md max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-outline-variant/30 pb-space-xs">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-[22px]">upload_file</span>
            <h3 className="font-headline-md text-headline-md text-primary font-bold">
              Sonar Log Ingestion &amp; Inference
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Dropzone / File Picker */}
        <div className="flex flex-col gap-space-xs">
          <label className="font-label-badge text-label-badge text-on-surface uppercase font-semibold">
            Select Sonar Image or Acoustic Log (.jpg, .png, .tiff)
          </label>
          <div className="relative border-2 border-dashed border-outline-variant/50 hover:border-primary-container/70 rounded-xl p-space-md flex flex-col items-center justify-center gap-2 bg-surface-container-lowest/60 text-center transition-colors">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            {previewUrl ? (
              <div className="flex flex-col items-center gap-2">
                <img
                  src={previewUrl}
                  alt="Selected Sonar"
                  className="max-h-48 rounded-lg object-contain border border-outline-variant/30"
                />
                <span className="font-label-coord text-label-coord text-secondary font-mono">
                  {file?.name} ({(file?.size / 1024).toFixed(1)} KB)
                </span>
              </div>
            ) : (
              <>
                <span className="material-symbols-outlined text-secondary text-[36px]">cloud_upload</span>
                <span className="font-body-md text-on-surface font-medium">
                  Drag and drop acoustic raster or click to browse
                </span>
                <span className="font-label-coord text-label-coord text-on-surface-variant">
                  Supports JSF rasters, CLAHE side-scan snips, and raw SSS imagery
                </span>
              </>
            )}
          </div>
        </div>

        {/* Quick Sample Selector */}
        {samples.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="font-label-badge text-label-badge text-on-surface-variant uppercase">
              Or Test With Real Sonar Samples:
            </span>
            <div className="flex flex-wrap gap-2">
              {samples.slice(0, 5).map((sample) => (
                <button
                  key={sample}
                  type="button"
                  onClick={() => handleSelectSample(sample)}
                  className="px-2.5 py-1 rounded bg-surface-container-high border border-outline-variant/30 hover:border-secondary font-label-coord text-label-coord text-secondary transition-colors"
                >
                  {sample}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Threshold Slider */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between font-label-badge text-label-badge">
            <span className="text-on-surface">Neural Confidence Threshold:</span>
            <span className="text-primary font-mono font-bold">{(confidenceThreshold * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0.10"
            max="0.90"
            step="0.05"
            value={confidenceThreshold}
            onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
            className="w-full accent-primary-container h-1.5 bg-surface-container rounded-lg cursor-pointer"
          />
        </div>

        {/* Action Button */}
        <button
          onClick={handleRunInference}
          disabled={!file || isProcessing}
          className="w-full py-3.5 rounded-lg bg-gradient-to-r from-primary-container to-secondary text-surface-container-lowest font-headline-md text-headline-md font-bold uppercase tracking-wider shadow-lg disabled:opacity-50 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <span className="w-4 h-4 border-2 border-surface-container-lowest border-t-transparent rounded-full animate-spin" />
              <span>Analyzing Acoustic Backscatter...</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[20px]">radar</span>
              <span>Execute 2-Stage YOLO Detection</span>
            </>
          )}
        </button>

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-lg bg-error-container/40 border border-error text-error text-body-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Inference Results Preview */}
        {result && (
          <div className="p-space-md rounded-xl bg-surface-container border border-secondary/40 flex flex-col gap-space-xs">
            <div className="flex items-center justify-between">
              <span className="font-label-badge text-label-badge text-secondary font-bold uppercase">
                Detection Complete • {result.detections?.length || 0} Targets Found
              </span>
              <span className="font-label-coord text-label-coord text-primary">
                Inference: {(result.inference_time_ms || 18).toFixed(1)} ms
              </span>
            </div>

            {result.annotated_image_url && (
              <img
                src={result.annotated_image_url}
                alt="AI Annotated Sonar"
                className="w-full max-h-56 object-contain rounded-lg border border-outline-variant/30 mt-2"
              />
            )}

            <div className="flex flex-col gap-1 mt-2">
              {result.detections?.map((det, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded bg-surface-container-low border border-outline-variant/30 font-label-coord text-label-coord"
                >
                  <span className="text-primary font-bold uppercase">
                    #{idx + 1} {det.class_name || det.label}
                  </span>
                  <span className="text-secondary font-mono font-bold">
                    {((det.confidence || 0) * 100).toFixed(1)}% CONF
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
