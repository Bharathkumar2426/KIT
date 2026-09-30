import React from 'react';
import { motion } from 'framer-motion';

export default function ProblemStatsSection() {
  const cards = [
    {
      metric: '94%',
      metricColor: 'text-primary',
      icon: 'timer_off',
      iconColor: 'text-secondary',
      title: 'Manual Latency',
      titleColor: 'text-secondary',
      desc: 'Traditional hydrographic review consumes over 40 hours per square nautical mile, creating severe bottlenecks for high-risk offshore deployment windows.',
    },
    {
      metric: '640k T',
      metricColor: 'text-error',
      icon: 'warning',
      iconColor: 'text-error',
      title: 'Annual Ghost Net Inflow',
      titleColor: 'text-error',
      desc: 'Lost synthetic monofilament nets roam ocean currents autonomously for centuries, decimating marine biodiversity and fouling critical commercial propulsion systems.',
    },
    {
      metric: 'AUV / ROV',
      metricColor: 'text-secondary',
      icon: 'navigation',
      iconColor: 'text-secondary',
      title: 'Subsurface Entanglement Risk',
      titleColor: 'text-secondary',
      desc: 'Unmapped bottom debris poses extreme snag risks to subsea assets, fiber telecommunication lines, and inter-array offshore wind turbines.',
    },
  ];

  return (
    <section className="px-margin md:px-margin-desktop py-space-xl bg-surface-container-lowest/70 border-y border-outline-variant/30">
      <div className="max-w-7xl mx-auto flex flex-col gap-space-md">
        {/* Header with Hazard Tag */}
        <motion.div
          className="flex flex-col gap-1.5"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm bg-error shadow-[0_0_8px_rgba(255,180,171,0.5)]" />
            <span className="font-label-badge text-label-badge text-error uppercase tracking-wider font-bold">
              The Subsea Blindspot
            </span>
          </div>
          <h2 className="font-headline-lg md:font-headline-xl text-headline-lg md:text-headline-xl text-primary font-bold">
            Unseen hazards in the bathypelagic void.
          </h2>
        </motion.div>

        {/* 3 Stat Cards in Responsive Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md mt-space-xs">
          {cards.map((card, idx) => (
            <motion.div
              key={idx}
              className="p-space-lg rounded-xl bg-surface-container-low border border-outline-variant/30 shadow-md flex flex-col gap-space-sm hover:border-primary-container/40 transition-colors"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.6, delay: idx * 0.15 }}
            >
              <div className="flex items-center justify-between">
                <span className={`font-display-lg-mobile md:font-headline-xl text-display-lg-mobile md:text-headline-xl font-bold tracking-tight ${card.metricColor}`}>
                  {card.metric}
                </span>
                <span className={`p-2 rounded-lg bg-surface-container-high ${card.iconColor} flex items-center justify-center border border-outline-variant/30`}>
                  <span className="material-symbols-outlined text-[22px]">
                    {card.icon}
                  </span>
                </span>
              </div>
              <h3 className={`font-headline-md text-headline-md font-semibold ${card.titleColor}`}>
                {card.title}
              </h3>
              <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                {card.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
