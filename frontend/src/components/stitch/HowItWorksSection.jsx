import React from 'react';
import { motion } from 'framer-motion';

export default function HowItWorksSection() {
  const steps = [
    {
      step: 'STEP 01',
      title: 'Ingest & Upload',
      icon: 'cloud_upload',
      desc: 'Seamless ingestion of uncompressed JSF, XTF, and SDF raw side-scan sonar files directly from autonomous submersibles or mothership satcom links.',
      detail: 'Supports Kongsberg, Klein, and Edgetech data formats with automated packet validation.',
    },
    {
      step: 'STEP 02',
      title: 'Clean Acoustic Noise',
      icon: 'filter_alt',
      desc: 'Neural filters scrub out water-column turbulence, thermocline refraction, vessel wake distortion, and seabed sediment backscatter.',
      detail: 'Adaptive CLAHE equalization preserves micro-shadows behind low-relief snag hazards.',
    },
    {
      step: 'STEP 03',
      title: 'Neural Inference Detection',
      icon: 'hub',
      desc: 'Subsea vision models parse acoustic shadows and backscatter signatures to isolate nylon nets, steel cables, lost shipping freight, and plastic clusters.',
      detail: '98.4% precision with two-stage confidence thresholding tailored for acoustic grazing geometry.',
    },
    {
      step: 'STEP 04',
      title: 'Geotagged Actionable Report',
      icon: 'fact_check',
      desc: 'Instant output of ISO 19115 compliant Shapefiles, GeoTIFF bathymetry layers, and direct coordinate injection for ROV robotic arm grappling runs.',
      detail: 'Automated remediation vectors exported directly to ECDIS naval charting suites.',
    },
  ];

  return (
    <section id="how-it-works" className="px-margin md:px-margin-desktop py-space-xl max-w-7xl mx-auto flex flex-col gap-space-lg">
      {/* Section Header */}
      <motion.div
        className="flex flex-col gap-space-xs text-center md:text-left max-w-3xl"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.6 }}
      >
        <span className="font-label-badge text-label-badge text-secondary uppercase tracking-wider font-semibold">
          Acoustic Pipeline Architecture
        </span>
        <h2 className="font-headline-lg md:font-headline-xl text-headline-lg md:text-headline-xl text-primary font-bold">
          From Acoustic Ping to Remediated Target in 4 Steps
        </h2>
        <p className="font-body-md md:font-body-lg text-body-md md:text-body-lg text-on-surface-variant leading-relaxed">
          High-frequency side-scan hydrophone telemetry transformed into zero-noise GIS intelligence.
        </p>
      </motion.div>

      {/* Step by Step Animated Timeline */}
      <div className="relative flex flex-col gap-space-md md:gap-space-lg mt-space-xs">
        {/* Continuous Connecting Line for Desktop */}
        <div className="hidden md:block absolute left-8 top-10 bottom-10 w-0.5 bg-gradient-to-b from-primary-container via-secondary to-outline-variant/30" />

        {steps.map((item, idx) => (
          <motion.div
            key={idx}
            className="flex flex-col md:flex-row items-start gap-space-md p-space-lg rounded-xl bg-surface-container-low border border-outline-variant/30 shadow-md relative overflow-hidden group hover:border-primary-container/40 transition-all"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, delay: idx * 0.18 }}
          >
            {/* Step Icon and Timeline Node */}
            <div className="flex items-center gap-space-sm md:flex-col md:items-center flex-shrink-0 z-10">
              <div className="w-14 h-14 rounded-xl bg-surface-container-high border border-primary-container/30 text-secondary flex items-center justify-center shadow-lg group-hover:scale-105 group-hover:border-primary-container transition-all">
                <span className="material-symbols-outlined text-[28px]">
                  {item.icon}
                </span>
              </div>
              <span className="font-label-badge text-label-badge px-2 py-0.5 rounded bg-surface-container-high text-primary font-bold tracking-wider border border-primary/20">
                {item.step}
              </span>
            </div>

            {/* Step Content */}
            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
              <h3 className="font-headline-md text-headline-md text-primary font-semibold group-hover:text-primary-container transition-colors">
                {item.title}
              </h3>
              <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                {item.desc}
              </p>
              <div className="mt-2 inline-flex items-center gap-1.5 font-label-coord text-label-coord text-secondary bg-surface-container-lowest/80 px-2.5 py-1 rounded w-fit border border-outline-variant/30">
                <span className="material-symbols-outlined text-[14px]">tune</span>
                <span>{item.detail}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
