import React, { useState, useEffect } from 'react';

export function SagarSurakshaOverviewPage({ onNavigate, operator }) {
  const [istTime, setIstTime] = useState('');

  // Live IST / Chronometer clock
  useEffect(() => {
    const updateIST = () => {
      const now = new Date();
      // UTC + 5:30 calculation for Indian Standard Time
      const istDate = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + (330 * 60000));
      const hours = String(istDate.getHours()).padStart(2, '0');
      const minutes = String(istDate.getMinutes()).padStart(2, '0');
      const seconds = String(istDate.getSeconds()).padStart(2, '0');
      setIstTime(`${hours}:${minutes}:${seconds} IST`);
    };

    updateIST();
    const interval = setInterval(updateIST, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full flex flex-col bg-[#070b12] text-[#f1f5f9] min-h-[calc(100vh-80px)] selection:bg-[#f38b2a] selection:text-black">
      {/* Widescreen Cinematic Hero Surface */}
      <section className="relative w-full overflow-hidden bg-[#070b12]">
        {/* Full-bleed background image with tactical dual-gradient scrim (sourced from tactical telemetry) */}
        <div
          className="absolute inset-0 w-full h-full bg-cover bg-center z-0 scale-[1.01] transition-transform duration-1000 ease-out opacity-95"
          style={{
            backgroundImage: `url("https://lh3.googleusercontent.com/aida-public/AB6AXuBdgkuyUGVMq_xBPIQK3uldPSNftj6mVO-bk5IWDAf2k05YlW1PWvRJVb9ctX6VfAm2n_359OA1NXB1jPI32b5a6e9ODY5fd8YjTBp066R6SgxMDTBbHTi091xrcMNJV2rVDbhrkRxuswys59t9nIhgS2rtd4zQVOiK2S_jb6icHHNcXAEwa2P9IHTqCSUI-MxdS3yjQ8hqU6L4MXBWRI-0cp_RABrEWiXKPNrj81JjP55KP2SEw_Ww")`
          }}
        />

        {/* Scrim layers for pristine contrast & abyssal depth with Chakra Navy tint */}
        <div className="absolute inset-0 z-[1] bg-gradient-to-b from-[#070b12]/60 via-transparent to-[#070b12]/80 pointer-events-none" />
        <div className="absolute inset-0 z-[1] bg-gradient-to-r from-[#070b12]/80 via-[#070b12]/30 to-[#070b12]/60 pointer-events-none" />

        {/* Fine Tactical Grid Overlay */}
        <div className="absolute inset-0 z-[2] pointer-events-none opacity-20 bg-[radial-gradient(#f38b2a_1px,transparent_1px)] [background-size:36px_36px]" />

        {/* Main Content Container */}
        <div className="relative z-10 w-full max-w-[1540px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 lg:pt-14 lg:pb-20 flex flex-col justify-between min-h-[calc(100vh-140px)]">
          {/* Center Split: Hero Command & DebrisSense AI Telemetry HUD */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-y-12 lg:gap-x-12 items-center my-auto">
            {/* Left Block: Hero Typography & Actions */}
            <div className="lg:col-span-7 flex flex-col items-start gap-5">
              {/* Tactical Eyebrow Pill */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#0a1220]/90 border border-[#f38b2a]/30 backdrop-blur-md shadow-sm">
                <span className="w-2 h-2 rounded-full bg-[#f38b2a] animate-ping" />
                <span className="w-2 h-2 rounded-full bg-[#f38b2a] -ml-3" />
                <span className="font-['JetBrains_Mono',monospace] text-[10px] text-[#f38b2a] tracking-widest uppercase font-bold">
                  SAGAR SURAKSHA // LIVE MARITIME INTELLIGENCE · INDIA
                </span>
              </div>

              {/* Master Headline */}
              <h1 className="font-['Space_Grotesk',sans-serif] text-[34px] sm:text-[44px] lg:text-[54px] lg:leading-[62px] font-bold text-[#f1f5f9] tracking-tight max-w-2xl drop-shadow-lg">
                Read the ocean before you sail into it.
              </h1>

              {/* Muted Intelligence Description */}
              <p className="font-['JetBrains_Mono',monospace] text-[14px] sm:text-[16px] text-[#8b9bb4] max-w-xl leading-relaxed">
                Real-time navigational intelligence, synthetic aperture radar feeds, bathymetric tracking, and automated hazard interception engineered specifically for the Indian maritime corridor.
              </p>

              {/* Primary CTA Row */}
              <div className="flex flex-wrap items-center gap-4 pt-2 w-full sm:w-auto">
                <button
                  onClick={() => onNavigate('map')}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#f38b2a] text-[#0b1320] font-['Space_Grotesk',sans-serif] text-[15px] font-bold hover:bg-[#ff9838] transition-all duration-200 shadow-[0_0_24px_rgba(243,139,42,0.45)] hover:shadow-[0_0_36px_rgba(243,139,42,0.7)] active:scale-95 group cursor-pointer"
                >
                  <span>Open live chart</span>
                  <span className="material-symbols-outlined text-[20px] transition-transform group-hover:translate-x-1">
                    arrow_forward
                  </span>
                </button>

                <button
                  onClick={() => onNavigate('feed')}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#0e1726]/80 hover:bg-[#152238] border border-[rgba(43,90,150,0.35)] hover:border-slate-400 backdrop-blur-md text-[#f1f5f9] font-['Space_Grotesk',sans-serif] text-[15px] font-semibold transition-all duration-200 shadow-sm active:scale-95 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[#f38b2a] text-[18px]">stream</span>
                  <span>View the feed</span>
                </button>
              </div>

              {/* Vessel Sector Mini Status Pill */}
              <div className="flex flex-wrap items-center gap-3 pt-2 text-[#8b9bb4]">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#0a2318] border border-[#1ea857]/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1ea857] shadow-[0_0_6px_#1ea857]" />
                  <span className="font-['JetBrains_Mono',monospace] text-[11px] text-[#f1f5f9] font-semibold">
                    EEZ INTL BOUNDARY · SYNCHRONIZED
                  </span>
                </div>
                <span className="text-slate-600">/</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#f38b2a]" />
                  <span className="font-['JetBrains_Mono',monospace] text-[11px] text-[#8b9bb4]">
                    SAR FEED: SW MONSOON REGIME
                  </span>
                </div>
              </div>
            </div>

            {/* Right Block: DebrisSense AI Glassmorphism Card Module (Interactive to Sonar Analysis) */}
            <div className="lg:col-span-5 w-full flex justify-center lg:justify-end">
              <div
                onClick={() => onNavigate('analysis')}
                className="w-full max-w-md bg-[#0a101d]/90 border border-slate-800 backdrop-blur-xl rounded-xl p-6 shadow-2xl flex flex-col gap-4 relative overflow-hidden transition-all duration-300 hover:shadow-[0_0_36px_rgba(243,139,42,0.22)] hover:border-[#f38b2a]/40 cursor-pointer group"
              >
                {/* Warm Saffron Tactical Flare */}
                <div className="absolute -top-16 -right-16 w-44 h-44 bg-[#f38b2a]/10 rounded-full blur-3xl pointer-events-none" />

                {/* Card Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative w-9 h-9 rounded-full bg-[#0e1726] border border-[rgba(43,90,150,0.35)] flex items-center justify-center shadow-inner overflow-hidden">
                      <div
                        className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#f38b2a]/30 to-transparent animate-spin"
                        style={{ animationDuration: '3s' }}
                      />
                      <span className="material-symbols-outlined text-[#f38b2a] text-[20px] relative z-10">
                        radar
                      </span>
                    </div>
                    <div>
                      <h3 className="font-['Space_Grotesk',sans-serif] text-[18px] text-[#f1f5f9] font-semibold tracking-tight group-hover:text-[#f38b2a] transition-colors">
                        DebrisSense AI
                      </h3>
                      <p className="font-['JetBrains_Mono',monospace] text-[10px] text-[#ff9838] tracking-wider font-bold">
                        NEURAL BATHYMETRIC SUITE
                      </p>
                    </div>
                  </div>

                  {/* Active Sweep Emerald Status Beacon */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0a2318] border border-[#1ea857]/50 backdrop-blur-sm">
                    <span className="w-2 h-2 rounded-full bg-[#1ea857] animate-ping" />
                    <span className="font-['JetBrains_Mono',monospace] text-[10px] text-[#f1f5f9] font-bold tracking-wider">
                      ACTIVE SWEEP
                    </span>
                  </div>
                </div>

                {/* Feature Body Copy */}
                <p className="font-['JetBrains_Mono',monospace] text-[13px] text-[#8b9bb4] leading-relaxed">
                  DebrisSense AI scans your voyage path continuously, auto-detecting drifting debris, lost containers, and obstruction hazards — flagged the moment sensors pick them up.
                </p>

                {/* Vector Hazard Telemetry Box */}
                <div className="w-full bg-[#070c16]/90 border border-slate-800/80 rounded-lg p-3 flex flex-col gap-1.5 shadow-inner">
                  <div className="flex items-center justify-between">
                    <span className="font-['JetBrains_Mono',monospace] text-[10px] text-[#8b9bb4] uppercase">
                      TARGET DISCRIMINATOR
                    </span>
                    <span className="font-['JetBrains_Mono',monospace] text-[11px] text-[#f38b2a] font-semibold">
                      CONFIDENCE 99.4%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-[#121c2d] rounded-full overflow-hidden flex">
                    <div className="bg-gradient-to-r from-[#f38b2a] to-[#ff9838] h-full w-[99.4%] rounded-full shadow-[0_0_8px_#f38b2a]" />
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[#f38b2a] text-[14px]">warning</span>
                      <span className="font-['JetBrains_Mono',monospace] text-[11px] text-[#f1f5f9]">
                        Sector 04-W · 0 False Positives
                      </span>
                    </div>
                    <span className="font-['JetBrains_Mono',monospace] text-[10px] text-[#f38b2a] font-semibold">
                      RE-EVAL 0.4s
                    </span>
                  </div>
                </div>

                {/* Sub-meta Specifications Footer Tag */}
                <div className="flex flex-wrap items-center justify-between gap-1 pt-1 font-['JetBrains_Mono',monospace] text-[10px] text-[#8b9bb4]">
                  <span className="inline-flex items-center gap-1 text-[#f1f5f9]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1ea857]" />
                    Onboard AI
                  </span>
                  <span className="text-slate-700">·</span>
                  <span>Real-time hazard flagging</span>
                  <span className="text-slate-700">·</span>
                  <span className="text-[#ff9838] font-medium flex items-center gap-1">
                    Launch Sonar Suite <span className="material-symbols-outlined text-[13px]">north_east</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Stat Readouts Monospace Telemetry Strip */}
          <div className="w-full mt-10 pt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4">
              {/* Stat Item 1 */}
              <div
                onClick={() => onNavigate('map')}
                className="flex flex-col gap-1 p-3.5 rounded-lg bg-[#0a101d]/85 border border-[rgba(43,90,150,0.3)] backdrop-blur-md hover:border-[#f38b2a]/50 transition-colors cursor-pointer group"
              >
                <span className="font-['JetBrains_Mono',monospace] text-[10px] text-[#8b9bb4] uppercase tracking-wider">
                  HARBOR INFRASTRUCTURE
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-['JetBrains_Mono',monospace] text-[18px] text-[#f38b2a] font-bold">
                    74 PORTS
                  </span>
                  <span className="font-['JetBrains_Mono',monospace] text-[11px] text-[#f1f5f9]">TRACKED</span>
                </div>
                <span className="font-['JetBrains_Mono',monospace] text-[11px] text-[#8b9bb4] truncate">
                  JNPT · Kandla · Cochin · Vizag · Chennai
                </span>
              </div>

              {/* Stat Item 2 */}
              <div className="flex flex-col gap-1 p-3.5 rounded-lg bg-[#0a101d]/85 border border-[rgba(43,90,150,0.3)] backdrop-blur-md">
                <span className="font-['JetBrains_Mono',monospace] text-[10px] text-[#8b9bb4] uppercase tracking-wider">
                  CHRONOMETER (IST / UTC)
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="font-['JetBrains_Mono',monospace] text-[18px] text-[#f1f5f9] font-bold tracking-tight">
                    {istTime || '15:03:34 IST'}
                  </span>
                </div>
                <span className="font-['JetBrains_Mono',monospace] text-[11px] text-[#8b9bb4]">
                  INDIAN STANDARD TIME · UTC+05:30
                </span>
              </div>

              {/* Stat Item 3 */}
              <div
                onClick={() => onNavigate('feed')}
                className="flex flex-col gap-1 p-3.5 rounded-lg bg-[#0a101d]/85 border border-[rgba(43,90,150,0.3)] backdrop-blur-md hover:border-[#f38b2a]/50 transition-colors cursor-pointer group"
              >
                <span className="font-['JetBrains_Mono',monospace] text-[10px] text-[#8b9bb4] uppercase tracking-wider">
                  AIS / SAR REFRESH
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#1ea857] animate-pulse shadow-[0_0_6px_#1ea857]" />
                  <span className="font-['JetBrains_Mono',monospace] text-[18px] text-[#f1f5f9] font-bold">
                    24/7 REFRESH
                  </span>
                </div>
                <span className="font-['JetBrains_Mono',monospace] text-[11px] text-[#8b9bb4]">
                  SAT-LINK BAND 162.025 MHz
                </span>
              </div>

              {/* Stat Item 4 */}
              <div
                onClick={() => onNavigate('incidents')}
                className="flex flex-col gap-1 p-3.5 rounded-lg bg-[#0a101d]/85 border border-[rgba(43,90,150,0.3)] backdrop-blur-md hover:border-[#f38b2a]/50 transition-colors cursor-pointer group"
              >
                <span className="font-['JetBrains_Mono',monospace] text-[10px] text-[#8b9bb4] uppercase tracking-wider">
                  HAZARD SURVEILLANCE
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#f38b2a] animate-ping" />
                  <span className="font-['JetBrains_Mono',monospace] text-[18px] text-[#f38b2a] font-bold">
                    DEBRIS ALERTS
                  </span>
                </div>
                <span className="font-['JetBrains_Mono',monospace] text-[11px] text-[#1ea857] font-medium">
                  ACTIVE · ZERO CRITICAL BREACHES
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
