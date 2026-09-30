import React from 'react';
import { AlertTriangle, CheckCircle2, Cpu, Info, Layers, ShieldCheck, Sparkles } from 'lucide-react';

export function ModelStatusBadge({ healthData, modelMetadata }) {
  const isSonarTrained = modelMetadata?.is_sonar_trained ?? healthData?.is_sonar_trained ?? true;
  const rawPath = modelMetadata?.weights_path || healthData?.model_version || 'sonar_v2.pt';
  const modelName = rawPath.split(/[\\/]/).pop();
  const device = modelMetadata?.device || (healthData?.cuda_available ? healthData?.device_name : 'CPU');
  const secondStage = modelMetadata?.second_stage_active ?? healthData?.second_stage_active ?? true;
  const tauOod = modelMetadata?.tau_ood ? (modelMetadata.tau_ood).toFixed(3) : '0.363';

  return (
    <div className="bg-ocean-900 border border-ocean-800 rounded-xl p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Model Identification */}
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${isSonarTrained ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
            {isSonarTrained ? <ShieldCheck className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h4 className="text-sm font-semibold text-slate-100">
                Active Model: <span className="font-mono text-cyan-400 font-bold">{modelName}</span>
              </h4>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                2-Stage Sonar Pipeline
              </span>
              {secondStage && (
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center space-x-1">
                  <Sparkles className="w-3 h-3 inline" />
                  <span>EfficientNet-B0 OOD</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Stage 1: Cleaned YOLOv8 Localization &bull; Stage 2: Deep Crop Classifier with Empirical Feature Prototypes (τ_ood = {tauOod}).
            </p>
          </div>
        </div>

        {/* Runtime Tags */}
        <div className="flex items-center space-x-2.5 text-xs font-mono">
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-ocean-850 border border-ocean-750 text-slate-300">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>{device}</span>
          </div>
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-ocean-850 border border-ocean-750 text-slate-300">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>PyTorch 2-Stage</span>
          </div>
        </div>
      </div>
    </div>
  );
}
