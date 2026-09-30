import React, { Suspense } from 'react';
import { motion } from 'framer-motion';
import Hero3DScene, { StaticSonarFallback } from './Hero3DScene';

export default function HeroSection({ scrollProgress = 0, onUploadClick, onHowItWorksClick }) {
  return (
    <section className="relative px-margin md:px-margin-desktop py-space-lg md:py-space-xl max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-space-lg lg:gap-space-xl overflow-hidden min-h-[calc(100vh-4rem)] justify-center">
      {/* Atmospheric Ambient Glows (from Stitch) */}
      <div className="absolute -top-20 -left-20 w-80 h-80 bg-primary-container/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-24 w-96 h-96 bg-secondary-container/10 rounded-full blur-3xl pointer-events-none" />

      {/* Left Column: Hero Mission Copy */}
      <motion.div
        className="w-full lg:w-1/2 flex flex-col gap-space-md z-10"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        {/* Status Pill */}
        <div className="inline-flex items-center gap-space-xs px-3.5 py-1.5 rounded-full bg-surface-container-high/90 border border-secondary/30 self-start shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary" />
          </span>
          <span className="font-label-badge text-label-badge text-primary uppercase tracking-wider font-semibold">
            Autonomous Subsea Telemetry v3.4
          </span>
        </div>

        {/* Main Hero Headline */}
        <div className="flex flex-col gap-space-sm">
          <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-primary font-bold tracking-tight leading-tight">
            Turn raw sonar into geotagged seabed hazard intelligence.
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed max-w-xl">
            Instant AI detection of abandoned ghost nets, sunken plastics, and man-made maritime hazards at 600m depth.
          </p>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-space-sm pt-space-xs">
          <button
            onClick={onUploadClick}
            className="flex items-center justify-center gap-space-xs w-full sm:w-auto py-3.5 px-space-lg rounded-xl bg-gradient-to-r from-primary-container to-secondary text-surface-container-lowest font-headline-md text-headline-md font-bold uppercase tracking-wider shadow-lg hover:shadow-[0_0_24px_rgba(0,242,254,0.4)] active:scale-[0.98] transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">upload_file</span>
            <span>Upload Sonar Log</span>
          </button>

          <a
            href="#how-it-works"
            onClick={onHowItWorksClick}
            className="flex items-center justify-center gap-space-xs w-full sm:w-auto py-3.5 px-space-lg rounded-xl bg-surface-container-high/80 border border-outline-variant/40 text-primary font-body-lg text-body-lg font-medium shadow-sm hover:bg-surface-container-highest hover:border-primary-container/40 transition-all"
          >
            <span className="material-symbols-outlined text-secondary text-[20px]">play_circle</span>
            <span>See How It Works</span>
          </a>
        </div>

        {/* Key Specification Quick Badges */}
        <div className="flex flex-wrap items-center gap-2 pt-space-xs border-t border-outline-variant/30">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-container-low border border-outline-variant/30 font-label-coord text-label-coord text-on-surface">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-container" />
            <span>455 kHz / 900 kHz Hydrophones</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-container-low border border-outline-variant/30 font-label-coord text-label-coord text-on-surface">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
            <span>Sub-Meter Localization</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-container-low border border-outline-variant/30 font-label-coord text-label-coord text-on-surface">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span>ISO 19115 GIS Ready</span>
          </div>
        </div>
      </motion.div>

      {/* Right Column: 3D Bathymetric Acoustic Viewport */}
      <motion.div
        className="w-full lg:w-1/2 flex flex-col z-10"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.9, delay: 0.15, ease: 'easeOut' }}
      >
        <div className="relative w-full rounded-xl bg-surface-container-low p-space-sm shadow-2xl border border-outline-variant/40 flex flex-col gap-space-xs overflow-hidden">
          {/* Coordinate Header Bar (from Stitch) */}
          <div className="flex items-center justify-between px-space-xs py-1.5 bg-surface-container-lowest/90 rounded-lg border border-outline-variant/30">
            <div className="flex items-center gap-2 min-w-0">
              <span className="material-symbols-outlined text-secondary text-[18px]">radar</span>
              <span className="font-label-coord text-label-coord text-secondary font-bold truncate">
                3D BATHYMETRIC ACOUSTIC VIEWER
              </span>
            </div>
            <div className="flex items-center gap-space-xs flex-shrink-0">
              <span className="font-label-badge text-label-badge bg-surface-container-high px-2 py-0.5 rounded text-primary font-bold tracking-wider border border-primary/20">
                LIVE CHIRP
              </span>
            </div>
          </div>

          {/* 3D Canvas Container */}
          <div className="relative w-full h-[360px] sm:h-[420px] md:h-[480px] rounded-lg overflow-hidden border border-outline-variant/20">
            <Suspense fallback={<StaticSonarFallback />}>
              <Hero3DScene scrollProgress={scrollProgress} />
            </Suspense>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
