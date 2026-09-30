import React from 'react';
import { motion } from 'framer-motion';

export default function MissionProfilesSection() {
  const profiles = [
    {
      icon: 'troubleshoot',
      title: 'Survey Contractors',
      desc: 'Accelerate project deliverables 10x with automated hydrophone anomaly tagging, zero manual data entry, and standardized bathymetric client packages.',
      tag: 'Hydrographic Fleets',
    },
    {
      icon: 'wind_power',
      title: 'Offshore Energy Operators',
      desc: 'Safeguard multi-million dollar wind farm export cables, umbilical bundles, and pipeline corridors from dangerous snagging and anchor drag hazards.',
      tag: 'Infrastructure Protection',
    },
    {
      icon: 'directions_boat',
      title: 'Ports & Harbors',
      desc: 'Ensure dredged navigation channels remain free of submerged metallic freight, dredge obstructions, and navigational hazards in ultra-shallow waters.',
      tag: 'Channel Clearance',
    },
    {
      icon: 'scuba_diving',
      title: 'Conservation & Salvage NGOs',
      desc: 'Pinpoint lethal monofilament ghost gear with sub-meter accuracy to deploy diver retrieval units and autonomous ROV winches safely and efficiently.',
      tag: 'Ecosystem Remediation',
    },
  ];

  return (
    <section id="missions" className="px-margin md:px-margin-desktop py-space-xl max-w-7xl mx-auto flex flex-col gap-space-lg">
      <motion.div
        className="flex flex-col gap-space-xs text-center md:text-left max-w-3xl"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.6 }}
      >
        <span className="font-label-badge text-label-badge text-secondary uppercase tracking-wider font-semibold">
          Mission Profiles
        </span>
        <h2 className="font-headline-lg md:font-headline-xl text-headline-lg md:text-headline-xl text-primary font-bold">
          Engineered for Maritime Leaders
        </h2>
        <p className="font-body-md md:font-body-lg text-body-md md:text-body-lg text-on-surface-variant leading-relaxed">
          Scalable acoustic processing for sovereign waters, offshore corridors, and recovery expeditions.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
        {profiles.map((p, idx) => (
          <motion.div
            key={idx}
            className="p-space-lg rounded-xl bg-surface-container-low border border-outline-variant/30 shadow-md flex flex-col gap-space-sm hover:border-primary-container/40 transition-all group"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5, delay: idx * 0.12 }}
          >
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-lg bg-surface-container-high text-secondary flex items-center justify-center border border-outline-variant/30 group-hover:scale-105 group-hover:border-primary-container transition-all">
                <span className="material-symbols-outlined text-[26px]">
                  {p.icon}
                </span>
              </div>
              <span className="font-label-badge text-label-badge px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant font-medium">
                {p.tag}
              </span>
            </div>
            <h3 className="font-headline-md text-headline-md text-primary font-semibold group-hover:text-primary-container transition-colors">
              {p.title}
            </h3>
            <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
              {p.desc}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
