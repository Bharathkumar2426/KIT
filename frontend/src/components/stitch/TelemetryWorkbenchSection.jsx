import React, { useState } from 'react';
import { motion } from 'framer-motion';

export default function TelemetryWorkbenchSection({ onOpenFullWorkbench }) {
  const [selectedDetection, setSelectedDetection] = useState('net');

  return (
    <section id="workbench" className="px-margin md:px-margin-desktop py-space-xl bg-surface-container-lowest border-y border-outline-variant/30">
      <div className="max-w-7xl mx-auto flex flex-col gap-space-md">
        {/* Header */}
        <motion.div
          className="flex flex-col gap-space-xs"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-[20px]">terminal</span>
            <span className="font-label-badge text-label-badge text-secondary uppercase tracking-wider font-semibold">
              Telemetry Workbench
            </span>
          </div>
          <h2 className="font-headline-lg md:font-headline-xl text-headline-lg md:text-headline-xl text-primary font-bold">
            Live Sonar Inference Pipeline
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Simulated 455 kHz dual-channel hydrophone waterfall telemetry with real-time YOLOv8 neural bounding annotations.
          </p>
        </motion.div>

        {/* Mock Console Container */}
        <motion.div
          className="rounded-xl bg-surface-container-low p-space-sm md:p-space-md flex flex-col gap-space-sm shadow-2xl border border-outline-variant/40"
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.6 }}
        >
          {/* Console Top Bar */}
          <div className="p-space-xs md:p-space-sm rounded-lg bg-surface-container-lowest flex items-center justify-between border border-outline-variant/30">
            <div className="flex flex-col min-w-0">
              <span className="font-label-coord text-label-coord text-primary truncate font-semibold">
                Towfish-04 [455 kHz] / Northern Trench Survey Line 07
              </span>
              <span className="font-label-badge text-label-badge text-secondary flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                ACTIVE INFERENCE • 14ms LATENCY • 10 CLASSES ARMED
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-block font-label-coord text-label-coord text-on-surface-variant bg-surface-container px-2 py-1 rounded">
                GAIN: +6.0 dB
              </span>
              <span className="material-symbols-outlined text-secondary text-[20px] animate-pulse">
                settings_input_antenna
              </span>
            </div>
          </div>

          {/* Simulated Sonar Waterfall Display */}
          <div className="relative w-full h-80 sm:h-96 rounded-lg bg-surface-container-lowest overflow-hidden flex flex-col justify-between p-space-sm border border-outline-variant/30">
            {/* Waterfall Scan Graphic Elements & Grain SVG */}
            <svg className="absolute inset-0 w-full h-full opacity-35 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
              <pattern height="6" id="acousticGrain" patternUnits="userSpaceOnUse" width="6">
                <rect fill="#4fdbc8" height="1.5" opacity="0.3" width="1.5" />
                <rect fill="#00f2fe" height="1.5" opacity="0.2" width="1.5" x="3" y="3" />
              </pattern>
              <rect fill="url(#acousticGrain)" height="100%" width="100%" />

              {/* Subsea Topography Contour Lines */}
              <path d="M 0,40 Q 120,80 240,35 T 480,65 T 720,40 T 960,55" fill="none" stroke="#2d3a4e" strokeWidth="1.2" />
              <path d="M 0,140 Q 140,100 280,160 T 560,125 T 840,150" fill="none" stroke="#2d3a4e" strokeWidth="1.2" />
              <path d="M 0,240 Q 110,270 230,220 T 510,255 T 780,230" fill="none" stroke="#2d3a4e" strokeWidth="1.2" />
            </svg>

            {/* Sweep Scanline Line passing down */}
            <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary-container/80 to-transparent animate-pulse pointer-events-none top-1/3 shadow-[0_0_12px_rgba(0,242,254,0.6)]" />

            {/* Top Reticle Header */}
            <div className="relative z-10 flex items-center justify-between font-label-badge text-label-badge text-on-surface-variant bg-surface-container-lowest/80 px-2 py-1 rounded border border-outline-variant/20">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-container" />
                PORT TRANSDUCER [CH-1]
              </span>
              <span className="text-secondary font-mono tracking-widest animate-pulse">
                • • • LIVE PING CASCADE [15 PINGS/SEC] • • •
              </span>
              <span className="flex items-center gap-1">
                STARBOARD [CH-2]
                <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
              </span>
            </div>

            {/* Detection Targets Area */}
            <div className="relative z-10 flex flex-col sm:flex-row items-center justify-around gap-4 my-auto">
              {/* Detection Box 1: Synthetic Net (Cyan) */}
              <div
                onClick={() => setSelectedDetection('net')}
                className={`cursor-pointer p-3 rounded-lg transition-all max-w-[280px] ${
                  selectedDetection === 'net'
                    ? 'bg-surface-container-high/95 border-2 border-primary-container shadow-[0_0_20px_rgba(0,242,254,0.3)] scale-105'
                    : 'bg-surface-container-high/80 border border-outline-variant/40 hover:border-primary-container/50'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="font-label-badge text-label-badge bg-primary-container text-surface-container-lowest px-1.5 py-0.5 rounded font-bold">
                    #A-108 GHOST NET
                  </span>
                  <span className="font-label-coord text-label-coord text-secondary font-bold">
                    98.4% CONF
                  </span>
                </div>
                <p className="font-label-coord text-label-coord text-primary font-semibold">
                  Derelict Nylon Gillnet (18.2m)
                </p>
                <p className="font-label-badge text-label-badge text-on-surface-variant truncate">
                  54.1209° N, 3.2981° W • -142m Depth
                </p>
              </div>

              {/* Detection Box 2: Metal Debris (Teal/Emerald) */}
              <div
                onClick={() => setSelectedDetection('debris')}
                className={`cursor-pointer p-3 rounded-lg transition-all max-w-[280px] ${
                  selectedDetection === 'debris'
                    ? 'bg-surface-container-high/95 border-2 border-secondary shadow-[0_0_20px_rgba(79,219,200,0.3)] scale-105'
                    : 'bg-surface-container-high/80 border border-outline-variant/40 hover:border-secondary/50'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="font-label-badge text-label-badge bg-secondary text-surface-container-lowest px-1.5 py-0.5 rounded font-bold">
                    #B-042 DEBRIS
                  </span>
                  <span className="font-label-coord text-label-coord text-secondary font-bold">
                    91.2% CONF
                  </span>
                </div>
                <p className="font-label-coord text-label-coord text-primary font-semibold">
                  Shipping Container Fragment
                </p>
                <p className="font-label-badge text-label-badge text-on-surface-variant truncate">
                  54.1215° N, 3.2965° W • -146m Depth
                </p>
              </div>
            </div>

            {/* Bottom Status bar */}
            <div className="relative z-10 flex items-center justify-between font-label-coord text-label-coord text-on-surface-variant bg-surface-container-lowest/85 px-2 py-1 rounded border border-outline-variant/20">
              <span>SWATH: 120 METERS</span>
              <span className="text-primary font-mono">TOWFISH SPEED: 4.2 KNOTS</span>
              <span>SLOPE: -1.2°</span>
            </div>
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-xs pt-space-xs">
            <div className="p-space-sm rounded-lg bg-surface-container-lowest flex flex-col border border-outline-variant/30">
              <span className="font-label-badge text-label-badge text-on-surface-variant">DETECTED</span>
              <span className="font-headline-lg text-headline-lg font-bold text-primary">14</span>
              <span className="font-label-coord text-label-coord text-secondary">Verified targets localized</span>
            </div>
            <div className="p-space-sm rounded-lg bg-surface-container-lowest flex flex-col border border-outline-variant/30">
              <span className="font-label-badge text-label-badge text-on-surface-variant">AREA SCAN</span>
              <span className="font-headline-lg text-headline-lg font-bold text-primary">8.2</span>
              <span className="font-label-coord text-label-coord text-on-surface-variant">sq kilometers processed</span>
            </div>
            <div className="p-space-sm rounded-lg bg-surface-container-lowest flex flex-col border border-outline-variant/30">
              <span className="font-label-badge text-label-badge text-on-surface-variant">SEABED RISK</span>
              <span className="font-headline-lg text-headline-lg font-bold text-error">HIGH</span>
              <span className="font-label-coord text-label-coord text-error">Active snag hazards flagged</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
