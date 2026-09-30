import React from 'react';
import { Play, Pause, RotateCcw, FastForward, Clock, Film } from 'lucide-react';

export function AisDemoControls({
  isRunning = true,
  playbackSpeed = 1.0,
  currentFrame = 0,
  totalFrames = 30,
  frameTimestamp = null,
  onPlay,
  onPause,
  onReset,
  onSpeedChange,
}) {
  const speeds = [0.5, 1.0, 2.0, 5.0];

  const formatTimestamp = (iso) => {
    if (!iso) return 'Recorded UTC Frame';
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return iso;
    }
  };

  return (
    <div className="bg-[#0a101d]/95 border border-kesari/40 rounded-2xl p-3 shadow-xl backdrop-blur-xl font-mono text-xs text-starlight flex flex-wrap items-center justify-between gap-3">
      {/* Left: Playback Controls */}
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-1.5">
          {isRunning ? (
            <button
              onClick={onPause}
              title="Pause Demo Replay"
              className="px-3 py-1.5 rounded-full bg-kesari hover:bg-kesari-light text-chakra-navy font-bold flex items-center space-x-1 shadow-[0_0_12px_rgba(243,139,42,0.35)] transition"
            >
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span>Pause</span>
            </button>
          ) : (
            <button
              onClick={onPlay}
              title="Resume Demo Replay"
              className="px-3 py-1.5 rounded-full bg-tiranga-green hover:bg-emerald-500 text-white font-bold flex items-center space-x-1 shadow-[0_0_12px_rgba(30,168,87,0.4)] transition"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Play</span>
            </button>
          )}

          <button
            onClick={onReset}
            title="Reset Replay to Start"
            className="px-3 py-1.5 rounded-full bg-[#0e1726] hover:bg-[#162235] text-starlight border border-border-tactical hover:border-slate-600 font-semibold flex items-center space-x-1 transition shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5 text-kesari" />
            <span>Reset</span>
          </button>
        </div>

        {/* Speed Selector */}
        <div className="flex items-center space-x-1 bg-[#070b12] px-2 py-1 rounded-full border border-border-tactical">
          <FastForward className="w-3.5 h-3.5 text-kesari mr-1" />
          {speeds.map((s) => (
            <button
              key={s}
              onClick={() => onSpeedChange(s)}
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold transition ${
                playbackSpeed === s
                  ? 'bg-kesari text-chakra-navy shadow-sm'
                  : 'text-muted-slate hover:text-starlight'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* Right: Progress & Timeline Indicator */}
      <div className="flex items-center space-x-3 text-[11px]">
        <div className="flex items-center space-x-1.5 bg-[#0e1726] px-3 py-1 rounded-full border border-border-tactical text-starlight">
          <Clock className="w-3.5 h-3.5 text-kesari" />
          <span className="text-muted-slate">Timeline:</span>
          <span className="font-bold text-starlight">{formatTimestamp(frameTimestamp)}</span>
        </div>

        <div className="flex items-center space-x-1 text-starlight bg-[#0e1726] px-3 py-1 rounded-full border border-border-tactical">
          <Film className="w-3.5 h-3.5 text-kesari" />
          <span>Frame</span>
          <span className="font-bold text-kesari">{currentFrame + 1}</span>
          <span className="text-slate-500">/</span>
          <span>{totalFrames}</span>
        </div>
      </div>
    </div>
  );
}
