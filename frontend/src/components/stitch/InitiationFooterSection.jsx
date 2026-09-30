import React, { useState } from 'react';
import { motion } from 'framer-motion';

export default function InitiationFooterSection() {
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    org: '',
    format: 'JSF (Edgetech Telemetry)',
    message: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormSubmitted(true);
  };

  return (
    <footer id="initiation" className="px-margin md:px-margin-desktop pt-space-xl pb-space-2xl bg-surface-container-lowest border-t border-outline-variant/30">
      <div className="max-w-7xl mx-auto flex flex-col gap-space-xl">
        {/* Header */}
        <motion.div
          className="flex flex-col gap-space-xs text-center md:text-left max-w-3xl"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.6 }}
        >
          <span className="font-label-badge text-label-badge text-secondary uppercase tracking-wider font-semibold">
            Mission Initiation
          </span>
          <h2 className="font-headline-lg md:font-headline-xl text-headline-lg md:text-headline-xl text-primary font-bold">
            Ready to map and clear seabed hazards?
          </h2>
          <p className="font-body-md md:font-body-lg text-body-md md:text-body-lg text-on-surface-variant leading-relaxed">
            Connect your subsea survey operation with an AI technical specialist.
          </p>
        </motion.div>

        {/* Contact Form Container */}
        <motion.div
          className="p-space-lg md:p-space-xl rounded-xl bg-surface-container-low border border-outline-variant/30 shadow-2xl max-w-3xl"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.6 }}
        >
          {formSubmitted ? (
            <div className="py-8 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-secondary/20 text-secondary flex items-center justify-center border border-secondary">
                <span className="material-symbols-outlined text-[28px]">check_circle</span>
              </div>
              <h3 className="font-headline-md text-primary font-bold">Mission Request Transmitted</h3>
              <p className="font-body-md text-on-surface-variant max-w-md">
                Our subsea hydrographic engineering team will contact <span className="text-secondary font-mono">{formData.email}</span> within 4 hours.
              </p>
              <button
                onClick={() => setFormSubmitted(false)}
                className="mt-2 text-label-badge text-secondary underline hover:text-primary transition-colors"
              >
                Send Another Inquiry
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-space-sm">
              <div className="flex flex-col md:flex-row gap-space-sm">
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="font-label-badge text-label-badge text-on-surface uppercase font-semibold">
                    Work Email
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="hydrographer@offshore-fleet.com"
                    className="w-full px-space-sm py-2.5 rounded-lg bg-surface-container-lowest border border-outline-variant/40 text-primary font-body-md placeholder:text-outline focus:outline-none focus:border-primary-container focus:bg-surface-container transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="font-label-badge text-label-badge text-on-surface uppercase font-semibold">
                    Organization / Vessel Fleet
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.org}
                    onChange={(e) => setFormData({ ...formData, org: e.target.value })}
                    placeholder="e.g. DeepOcean Survey Corp / AUV-Fleet 03"
                    className="w-full px-space-sm py-2.5 rounded-lg bg-surface-container-lowest border border-outline-variant/40 text-primary font-body-md placeholder:text-outline focus:outline-none focus:border-primary-container focus:bg-surface-container transition-colors"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-label-badge text-label-badge text-on-surface uppercase font-semibold">
                  Primary Sonar Format
                </label>
                <select
                  value={formData.format}
                  onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                  className="w-full px-space-sm py-2.5 rounded-lg bg-surface-container-lowest border border-outline-variant/40 text-primary font-body-md focus:outline-none focus:border-primary-container focus:bg-surface-container transition-colors"
                >
                  <option>JSF (Edgetech Telemetry)</option>
                  <option>XTF (eXtended Triton Format)</option>
                  <option>SDF (Sonar Data Format)</option>
                  <option>Kongsberg RAW / KMALL</option>
                  <option>Other / Uncompressed Hydrophone Array</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-label-badge text-label-badge text-on-surface uppercase font-semibold">
                  Message / Mission Scope
                </label>
                <textarea
                  rows={3}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Specify depth requirements, target water bodies, and daily data throughput..."
                  className="w-full px-space-sm py-2 rounded-lg bg-surface-container-lowest border border-outline-variant/40 text-primary font-body-md placeholder:text-outline focus:outline-none focus:border-primary-container focus:bg-surface-container transition-colors resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 px-space-md rounded-lg bg-gradient-to-r from-primary-container to-secondary text-surface-container-lowest font-headline-md text-headline-md font-bold uppercase tracking-wider shadow-lg hover:shadow-[0_0_20px_rgba(0,242,254,0.4)] active:scale-[0.99] transition-all mt-space-xs"
              >
                Request Mission Briefing &amp; Dataset
              </button>
            </form>
          )}
        </motion.div>

        {/* Compliance Seals & HQ Details */}
        <div className="flex flex-col gap-space-md pt-space-xs border-t border-outline-variant/20">
          {/* Compliance Badges */}
          <div className="flex flex-wrap gap-2">
            <span className="px-2.5 py-1 rounded bg-surface-container border border-outline-variant/30 text-on-surface-variant font-label-badge text-label-badge font-semibold">
              IMO COMPLIANT
            </span>
            <span className="px-2.5 py-1 rounded bg-surface-container border border-outline-variant/30 text-on-surface-variant font-label-badge text-label-badge font-semibold">
              GEOTIFF 1.1
            </span>
            <span className="px-2.5 py-1 rounded bg-surface-container border border-outline-variant/30 text-on-surface-variant font-label-badge text-label-badge font-semibold">
              ISO 19115 GIS
            </span>
            <span className="px-2.5 py-1 rounded bg-surface-container border border-outline-variant/30 text-on-surface-variant font-label-badge text-label-badge font-semibold">
              STANAG 1364
            </span>
          </div>

          {/* Contact Info */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-on-surface-variant font-label-coord text-label-coord">
            <div className="flex items-center gap-2 text-primary font-medium">
              <span className="material-symbols-outlined text-[18px] text-secondary">mail</span>
              <span>telemetry@sonarnet.ai</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-secondary">location_on</span>
              <span>SonarNet Subsea Operations HQ • Dock 14, Aberdeen Marine Basin</span>
            </div>
          </div>

          {/* Legal Links */}
          <div className="flex flex-col sm:flex-row items-center justify-between pt-space-xs font-label-badge text-label-badge text-outline border-t border-outline-variant/20 gap-2">
            <span>© 2025 SonarNet AI Technologies • SIH 26057</span>
            <div className="flex gap-space-md">
              <a href="#" className="hover:text-primary transition-colors">Privacy</a>
              <a href="#" className="hover:text-primary transition-colors">Security</a>
              <a href="#" className="hover:text-primary transition-colors">API Docs</a>
              <a href="http://127.0.0.1:8000/docs" target="_blank" rel="noreferrer" className="text-secondary hover:text-primary transition-colors">
                FastAPI Swagger
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
