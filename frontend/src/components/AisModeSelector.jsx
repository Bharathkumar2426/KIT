import React, { useState } from 'react';
import { Radio, Database, AlertCircle, Sparkles, Film, Key, Settings2, Check, X } from 'lucide-react';
import { configureAis } from '../services/aisApi';

export function AisModeSelector({
  mode = 'LIVE',
  liveStatus = 'OFFLINE',
  onModeChange,
}) {
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const isLive = mode === 'LIVE';
  const isLiveConnected = liveStatus === 'LIVE';

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await configureAis(apiKeyInput.trim());
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setShowConfigModal(false);
      }, 1200);
    } catch (err) {
      console.error('Failed to configure AIS:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 bg-[#0a101d] p-1.5 rounded-full border border-border-tactical shadow-md font-mono text-xs">
        {/* Mode Switcher Buttons */}
        <div className="flex items-center space-x-1 bg-[#070b12] p-0.5 rounded-full border border-border-tactical/60">
          <button
            onClick={() => onModeChange('LIVE')}
            className={`px-3 py-1 rounded-full font-bold transition flex items-center space-x-1.5 ${
              isLive
                ? 'bg-tiranga-green text-white shadow-[0_0_12px_rgba(30,168,87,0.4)]'
                : 'text-muted-slate hover:text-starlight hover:bg-[#131d2e]'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${isLive && isLiveConnected ? 'animate-pulse text-white' : ''}`} />
            <span>LIVE</span>
          </button>

          <button
            onClick={() => onModeChange('DEMO')}
            className={`px-3 py-1 rounded-full font-bold transition flex items-center space-x-1.5 ${
              !isLive
                ? 'bg-kesari text-chakra-navy shadow-[0_0_12px_rgba(243,139,42,0.4)] font-extrabold'
                : 'text-muted-slate hover:text-starlight hover:bg-[#131d2e]'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>DEMO</span>
          </button>
        </div>

        {/* Mode Transparency Badge */}
        <div className="flex items-center space-x-2 pl-1 pr-2">
          {isLive ? (
            isLiveConnected ? (
              <div className="flex items-center space-x-1.5 text-tiranga-green text-[11px] font-semibold">
                <span className="w-2 h-2 rounded-full bg-tiranga-green animate-ping" />
                <span>REAL-TIME AISSTREAM</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5 text-rose-400 text-[11px]">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>LIVE AIS CONNECTED</span>
              </div>
            )
          ) : (
            <div className="flex items-center space-x-1.5 text-kesari text-[11px] font-bold bg-[#131d2e] px-2.5 py-0.5 rounded-full border border-kesari/40">
              <span className="w-2 h-2 rounded-full bg-kesari animate-pulse shadow-[0_0_6px_#f38b2a]" />
              <span>DEMO MODE · RECORDED DATA</span>
              <span className="text-[9px] text-muted-slate font-normal hidden sm:inline">
                (Offline Capable)
              </span>
            </div>
          )}

          {/* Config / API Key Button */}
          <button
            onClick={() => setShowConfigModal(true)}
            title="Configure AISStream API Key & Feed"
            className="p-1 rounded-full bg-[#131d2e] hover:bg-chakra-blue/30 text-muted-slate hover:text-kesari border border-border-tactical transition"
          >
            <Key className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* AISStream Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 font-mono">
          <div className="bg-[#0b1220] border border-chakra-blue/40 rounded-xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border-tactical pb-3">
              <div className="flex items-center space-x-2 text-starlight font-bold">
                <Key className="w-4 h-4 text-kesari" />
                <span>AISStream Remote Ingestion</span>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-muted-slate hover:text-starlight p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-muted-slate leading-relaxed">
              Connect directly to the global <span className="text-tiranga-green font-semibold">AISStream.io</span> WebSocket stream to ingest live worldwide or regional vessel telemetry.
            </p>

            <form onSubmit={handleSaveConfig} className="space-y-3">
              <div>
                <label className="block text-[11px] text-muted-slate font-bold uppercase mb-1">
                  AISStream API Key
                </label>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="Paste AISStream API key (e.g. key_...)"
                  className="w-full bg-[#060a12] border border-border-tactical focus:border-kesari rounded-lg px-3 py-2 text-xs text-starlight outline-none placeholder:text-muted-slate/50"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <a
                  href="https://aisstream.io"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-kesari hover:underline"
                >
                  Get free key at aisstream.io ↗
                </a>

                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowConfigModal(false)}
                    className="px-3 py-1.5 rounded-lg text-xs text-muted-slate hover:bg-[#131d2e] border border-border-tactical"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-1.5 rounded-lg text-xs font-bold bg-kesari hover:bg-kesari-light text-chakra-navy flex items-center space-x-1.5 shadow-md"
                  >
                    {saveSuccess ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-chakra-navy" />
                        <span>Connected!</span>
                      </>
                    ) : (
                      <span>{isSaving ? 'Connecting...' : 'Save & Stream'}</span>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
