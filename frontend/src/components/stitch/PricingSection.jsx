import React from 'react';
import { motion } from 'framer-motion';

export default function PricingSection({ onContactClick }) {
  return (
    <section id="pricing" className="px-margin md:px-margin-desktop py-space-xl bg-surface-container-lowest/80 border-y border-outline-variant/30">
      <div className="max-w-7xl mx-auto flex flex-col gap-space-lg">
        {/* Header */}
        <motion.div
          className="flex flex-col gap-space-xs text-center md:text-left max-w-3xl"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.6 }}
        >
          <span className="font-label-badge text-label-badge text-secondary uppercase tracking-wider font-semibold">
            Deployment Tiers
          </span>
          <h2 className="font-headline-lg md:font-headline-xl text-headline-lg md:text-headline-xl text-primary font-bold">
            Predictable Compute for Bathymetric Fleets
          </h2>
          <p className="font-body-md md:font-body-lg text-body-md md:text-body-lg text-on-surface-variant leading-relaxed">
            From experimental marine labs to autonomous industrial survey operations.
          </p>
        </motion.div>

        {/* 3 Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md items-stretch">
          {/* Tier 1: Pilot */}
          <motion.div
            className="p-space-lg rounded-xl bg-surface-container-low border border-outline-variant/30 shadow-md flex flex-col justify-between gap-space-md"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="flex flex-col gap-space-sm">
              <div className="flex flex-col">
                <span className="font-label-badge text-label-badge text-on-surface-variant uppercase tracking-wider">
                  Research & Trials
                </span>
                <h3 className="font-headline-md text-headline-md text-primary font-bold">
                  Pilot
                </h3>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="font-display-lg-mobile md:font-headline-xl text-display-lg-mobile md:text-headline-xl font-bold text-primary">
                  $1,200
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">/ month</span>
              </div>

              <ul className="flex flex-col gap-space-xs font-body-sm text-body-sm text-on-surface-variant pt-2 border-t border-outline-variant/20">
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[18px]">check</span>
                  <span>Up to 100 GB sonar log uploads/mo</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[18px]">check</span>
                  <span>95% neural confidence filter</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[18px]">check</span>
                  <span>Standard GeoJSON & CSV exports</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[18px]">check</span>
                  <span>Single vessel license</span>
                </li>
              </ul>
            </div>

            <button
              onClick={onContactClick}
              className="w-full py-3 rounded-lg bg-surface-container-high text-primary font-body-md text-body-md font-semibold hover:bg-surface-container-highest border border-outline-variant/40 transition-colors"
            >
              Start Pilot Trial
            </button>
          </motion.div>

          {/* Tier 2: Pro Survey (Highlighted / Recommended) */}
          <motion.div
            className="p-space-lg rounded-xl bg-surface-container border-2 border-primary-container shadow-2xl flex flex-col justify-between gap-space-md relative overflow-hidden"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {/* Top Glow bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-container via-secondary to-primary-container shadow-[0_0_12px_rgba(0,242,254,0.8)]" />

            <div className="flex flex-col gap-space-sm">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="font-label-badge text-label-badge text-secondary uppercase font-bold tracking-wider">
                    Active Fleets
                  </span>
                  <h3 className="font-headline-md text-headline-md text-primary font-bold">
                    Pro Survey
                  </h3>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-primary-container text-surface-container-lowest font-label-badge text-label-badge font-bold uppercase tracking-wider shadow-sm">
                  RECOMMENDED
                </span>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="font-display-lg-mobile md:font-headline-xl text-display-lg-mobile md:text-headline-xl font-bold text-primary">
                  $3,800
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">/ month</span>
              </div>

              <ul className="flex flex-col gap-space-xs font-body-sm text-body-sm text-on-surface pt-2 border-t border-outline-variant/30">
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[18px]">check</span>
                  <span>1 TB raw sonar bathymetry/mo</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[18px]">check</span>
                  <span>Real-time Edge streaming API access</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[18px]">check</span>
                  <span>Multibeam + Side-Scan sensor fusion</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[18px]">check</span>
                  <span>Prioritized ROV dispatch hazard maps</span>
                </li>
              </ul>
            </div>

            <button
              onClick={onContactClick}
              className="w-full py-3.5 rounded-lg bg-gradient-to-r from-primary-container to-secondary text-surface-container-lowest font-headline-md text-headline-md font-bold uppercase tracking-wider shadow-lg hover:shadow-[0_0_20px_rgba(0,242,254,0.45)] active:scale-[0.99] transition-all"
            >
              Deploy Pro
            </button>
          </motion.div>

          {/* Tier 3: Edge License */}
          <motion.div
            className="p-space-lg rounded-xl bg-surface-container-low border border-outline-variant/30 shadow-md flex flex-col justify-between gap-space-md"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="flex flex-col gap-space-sm">
              <div className="flex flex-col">
                <span className="font-label-badge text-label-badge text-on-surface-variant uppercase tracking-wider">
                  Subsea Hardware
                </span>
                <h3 className="font-headline-md text-headline-md text-primary font-bold">
                  Edge License
                </h3>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="font-display-lg-mobile md:font-headline-xl text-display-lg-mobile md:text-headline-xl font-bold text-primary">
                  Custom
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">/ vessel deployment</span>
              </div>

              <ul className="flex flex-col gap-space-xs font-body-sm text-body-sm text-on-surface-variant pt-2 border-t border-outline-variant/20">
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[18px]">check</span>
                  <span>On-board Nvidia Jetson / Orin integration</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[18px]">check</span>
                  <span>100% offline zero-latency edge inference</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[18px]">check</span>
                  <span>Custom acoustic domain model training</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[18px]">check</span>
                  <span>Defense & sovereign data compliance</span>
                </li>
              </ul>
            </div>

            <button
              onClick={onContactClick}
              className="w-full py-3 rounded-lg bg-surface-container-high text-primary font-body-md text-body-md font-semibold hover:bg-surface-container-highest border border-outline-variant/40 transition-colors"
            >
              Contact Naval & Edge Sales
            </button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
