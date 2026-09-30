import React from 'react';

export default function Navbar({ onUploadClick, onNavigateSection }) {
  return (
    <header className="fixed top-0 w-full z-50 pt-safe bg-surface-container-lowest/85 backdrop-blur-xl border-b border-outline-variant/30 shadow-[0_1px_8px_rgba(0,0,0,0.5)]">
      <div className="h-16 px-gutter md:px-gutter-desktop max-w-7xl mx-auto flex items-center justify-between gap-space-sm">
        {/* Brand / Logo Group */}
        <div className="flex items-center gap-space-sm min-w-0">
          <div className="w-9 h-9 rounded-lg bg-surface-container-high border border-primary-container/40 flex items-center justify-center shadow-[0_0_12px_rgba(0,242,254,0.25)] flex-shrink-0">
            <span className="material-symbols-outlined text-primary-container text-[22px]">
              radar
            </span>
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-space-xs">
              <span className="font-headline-md text-headline-md font-bold tracking-tight text-primary truncate leading-tight">
                SonarNet AI
              </span>
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-surface-container-high/90 text-secondary font-label-badge text-label-badge tracking-wider border border-secondary/20">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                AI Core: Online
              </span>
            </div>
            <span className="font-label-coord text-label-coord text-on-surface-variant truncate uppercase leading-none">
              SIH26057 • Bathymetric Anomaly Detection
            </span>
          </div>
        </div>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-space-md text-body-md font-medium text-on-surface-variant">
          <a href="#how-it-works" className="hover:text-primary transition-colors">How It Works</a>
          <a href="#workbench" className="hover:text-primary transition-colors">Workbench</a>
          <a href="#missions" className="hover:text-primary transition-colors">Mission Profiles</a>
          <a href="#pricing" className="hover:text-primary transition-colors">Deployment</a>
          <a href="#initiation" className="hover:text-primary transition-colors">Contact</a>
        </nav>

        {/* Action Controls */}
        <div className="flex items-center gap-space-xs sm:gap-space-sm flex-shrink-0">
          <button
            onClick={onUploadClick}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-primary-container to-secondary text-surface-container-lowest font-headline-md text-sm font-bold uppercase tracking-wider shadow-md hover:shadow-[0_0_14px_rgba(0,242,254,0.4)] active:scale-[0.98] transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">upload_file</span>
            <span>Upload Log</span>
          </button>

          <button
            aria-label="Navigation Menu / Tuning"
            className="w-10 h-10 flex items-center justify-center rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-[22px]">tune</span>
          </button>

          <div
            className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 shadow-[0_0_10px_rgba(224,253,255,0.25)] border border-primary-container/40"
            title="Naval Operator Profile"
          >
            <span className="material-symbols-outlined text-on-primary text-[18px]">
              person
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
