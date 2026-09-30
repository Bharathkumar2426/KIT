import React, { useState, useEffect } from 'react';

const DashboardShell = ({ children, activeTab, onTabChange, operator, onSignOut }) => {
  const [time, setTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // UTC + 5:30 calculation for Indian Standard Time
      const istTime = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + (330 * 60000));
      const hours = String(istTime.getHours()).padStart(2, '0');
      const minutes = String(istTime.getMinutes()).padStart(2, '0');
      const seconds = String(istTime.getSeconds()).padStart(2, '0');
      setTime(`${hours}:${minutes}:${seconds} IST`);
    };
    
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-[#070b12] font-['JetBrains_Mono',monospace] text-[#f1f5f9] min-h-screen flex flex-col relative selection:bg-[#f38b2a] selection:text-black">
      {/* Global Ambient Tactical Telemetry Oceanic Backdrop across all pages */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div
          className="absolute inset-0 w-full h-full bg-cover bg-center opacity-45 scale-[1.01] transition-transform duration-1000 ease-out"
          style={{
            backgroundImage: `url("https://lh3.googleusercontent.com/aida-public/AB6AXuBdgkuyUGVMq_xBPIQK3uldPSNftj6mVO-bk5IWDAf2k05YlW1PWvRJVb9ctX6VfAm2n_359OA1NXB1jPI32b5a6e9ODY5fd8YjTBp066R6SgxMDTBbHTi091xrcMNJV2rVDbhrkRxuswys59t9nIhgS2rtd4zQVOiK2S_jb6icHHNcXAEwa2P9IHTqCSUI-MxdS3yjQ8hqU6L4MXBWRI-0cp_RABrEWiXKPNrj81JjP55KP2SEw_Ww")`
          }}
        />
        {/* Scrim layers for deep oceanic contrast & Chakra Navy tint */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#070b12]/90 via-[#0b1320]/80 to-[#070b12]/95" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(243,139,42,0.12),rgba(255,255,255,0))]" />
        {/* Fine Tactical Grid Overlay */}
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#f38b2a_1px,transparent_1px)] [background-size:36px_36px]" />
      </div>

      {/* 1. Master Header */}
      <header className="fixed top-0 left-0 w-full z-50 bg-[#070b12]/90 backdrop-blur-xl border-b border-[rgba(43,90,150,0.3)] shadow-[0_2px_16px_rgba(0,0,0,0.6)]">
        <div className="h-20 w-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Brand */}
          <div 
            onClick={() => onTabChange('overview')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#f38b2a] shadow-[0_0_10px_#f38b2a] animate-pulse"></span>
              <span className="font-['Space_Grotesk',sans-serif] text-[20px] font-bold tracking-tight text-[#f1f5f9] group-hover:text-[#ff9838] transition-colors">
                OCEAN GARMIN
              </span>
            </div>
            <div className="hidden sm:flex items-center pl-2 border-l border-[rgba(43,90,150,0.35)]">
              <span className="font-['JetBrains_Mono',monospace] text-[10px] text-[#8b9bb4] uppercase tracking-wider font-bold">
                // SAGAR SURAKSHA TACTICAL · INDIA
              </span>
            </div>
          </div>
          
          {/* Main Navigation Links / Tabs */}
          <nav className="flex items-center gap-1.5 sm:gap-2">
            <button 
              onClick={() => onTabChange('overview')}
              className={`font-['Space_Grotesk',sans-serif] text-[13px] px-3.5 py-1.5 transition-all rounded-full cursor-pointer ${
                activeTab === 'overview' 
                  ? 'text-[#f1f5f9] bg-[#131d2e] border border-[rgba(43,90,150,0.6)] shadow-[0_0_12px_rgba(43,90,150,0.3)] font-semibold' 
                  : 'text-[#8b9bb4] hover:text-[#f1f5f9] hover:bg-[#0e1726]'
              }`}
            >
              Overview
            </button>

            <button 
              onClick={() => onTabChange('map')}
              className={`font-['Space_Grotesk',sans-serif] text-[13px] px-3.5 py-1.5 transition-all rounded-full cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'map' 
                  ? 'text-[#f1f5f9] bg-[#131d2e] border border-[rgba(43,90,150,0.6)] shadow-[0_0_12px_rgba(43,90,150,0.3)] font-semibold' 
                  : 'text-[#8b9bb4] hover:text-[#f1f5f9] hover:bg-[#0e1726]'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">map</span>
              <span>Geospatial Map</span>
            </button>

            <button 
              onClick={() => onTabChange('incidents')}
              className={`font-['Space_Grotesk',sans-serif] text-[13px] px-3.5 py-1.5 transition-all rounded-full cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'incidents' 
                  ? 'text-[#f1f5f9] bg-[#131d2e] border border-[rgba(43,90,150,0.6)] shadow-[0_0_12px_rgba(43,90,150,0.3)] font-semibold' 
                  : 'text-[#8b9bb4] hover:text-[#f1f5f9] hover:bg-[#0e1726]'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">warning</span>
              <span>Marine Incidents</span>
            </button>

            <button 
              onClick={() => onTabChange('feed')}
              className={`font-['Space_Grotesk',sans-serif] text-[13px] px-3.5 py-1.5 transition-all rounded-full cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'feed' 
                  ? 'text-[#f1f5f9] bg-[#131d2e] border border-[rgba(43,90,150,0.6)] shadow-[0_0_12px_rgba(43,90,150,0.3)] font-semibold' 
                  : 'text-[#8b9bb4] hover:text-[#f1f5f9] hover:bg-[#0e1726]'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">stream</span>
              <span>Tactical Feed</span>
            </button>

            <button 
              onClick={() => onTabChange('analysis')}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-full bg-[#f38b2a] hover:bg-[#ff9838] text-[#0b1320] font-['Space_Grotesk',sans-serif] text-[13px] font-bold transition-all duration-200 shadow-[0_0_20px_rgba(243,139,42,0.4)] hover:shadow-[0_0_28px_rgba(243,139,42,0.65)] active:scale-95 ml-1 sm:ml-2 cursor-pointer"
            >
              <span>Sonar Analysis</span>
              <span className="material-symbols-outlined text-[16px]">radar</span>
            </button>
          </nav>

          {/* Right Operator Profile & Sign Out */}
          <div className="flex items-center gap-3">
            {operator ? (
              <div className="flex items-center gap-2.5">
                <div className="hidden md:flex flex-col items-end">
                  <span className="font-['JetBrains_Mono',monospace] text-[#f38b2a] text-[11px] font-bold">
                    {operator.callSign || operator.email.split('@')[0].toUpperCase()}
                  </span>
                  <span className="text-[9px] text-[#8b9bb4]">ENCRYPTED AUTH: AES-GCM</span>
                </div>
                <button 
                  onClick={onSignOut} 
                  title="Sign out of tactical console"
                  className="w-8 h-8 rounded-full bg-[#f38b2a] hover:bg-[#ff9838] text-[#0b1320] flex items-center justify-center font-bold shadow-[0_0_12px_rgba(243,139,42,0.35)] transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">logout</span>
                </button>
              </div>
            ) : (
              <button 
                onClick={onSignOut}
                className="text-[12px] text-[#f1f5f9] bg-[#0e1726]/80 hover:bg-[#162235] border border-[rgba(43,90,150,0.35)] px-4 py-1 rounded-full transition-all shadow-sm cursor-pointer"
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full pt-20 bg-transparent flex-grow flex flex-col relative z-10">
        <div className="flex flex-col w-full h-full flex-grow">
          {children}
        </div>
      </main>

      {/* Dual Bottom Pinned Maritime Ticker HUD (Indian Port Weather & Live News Flowing) */}
      <aside className="sticky bottom-0 left-0 w-full z-40 flex flex-col bg-[#070c16]/95 backdrop-blur-2xl border-t border-[rgba(43,90,150,0.35)] shadow-[0_-8px_30px_rgba(0,0,0,0.7)]">
        {/* Ticker Row 1: Weather Telemetry Across Indian Port Cities */}
        <div className="w-full flex items-stretch h-10 overflow-hidden border-b border-[rgba(43,90,150,0.25)]">
          <div className="flex-shrink-0 flex items-center gap-2 px-3.5 bg-[#0e1726] border-r border-[rgba(43,90,150,0.35)] z-20 shadow-md">
            <span className="w-2 h-2 rounded-full bg-[#f38b2a] shadow-[0_0_8px_#f38b2a]"></span>
            <span className="font-['JetBrains_Mono',monospace] text-[10px] text-[#f1f5f9] font-bold whitespace-nowrap tracking-wider">
              WEATHER — INDIA
            </span>
          </div>
          <div className="relative w-full flex items-center overflow-hidden whitespace-nowrap">
            <div className="flex items-center gap-8 animate-[marquee_45s_linear_infinite] hover:[animation-play-state:paused]">
              {[...Array(2)].map((_, i) => (
                <React.Fragment key={i}>
                  <div className="flex items-center gap-1.5 text-[11px] text-[#f1f5f9]">
                    <span className="font-semibold text-[#f38b2a]">Mumbai:</span>
                    <span className="text-[#8b9bb4]">29°C · Tropical Squalls · SW 22 kts · Swell 2.4m</span>
                  </div>
                  <span className="text-slate-700">✦</span>

                  <div className="flex items-center gap-1.5 text-[11px] text-[#f1f5f9]">
                    <span className="font-semibold text-[#f38b2a]">Kochi / Cochin:</span>
                    <span className="text-[#8b9bb4]">27°C · Monsoonal Rain · WSW 18 kts · Swell 2.8m</span>
                  </div>
                  <span className="text-slate-700">✦</span>

                  <div className="flex items-center gap-1.5 text-[11px] text-[#f1f5f9]">
                    <span className="font-semibold text-[#f38b2a]">Chennai:</span>
                    <span className="text-[#8b9bb4]">31°C · Partly Cloudy · ESE 12 kts · Swell 1.1m</span>
                  </div>
                  <span className="text-slate-700">✦</span>

                  <div className="flex items-center gap-1.5 text-[11px] text-[#f1f5f9]">
                    <span className="font-semibold text-[#f38b2a]">Visakhapatnam:</span>
                    <span className="text-[#8b9bb4]">30°C · Clear Horizon · ENE 14 kts · Swell 1.4m</span>
                  </div>
                  <span className="text-slate-700">✦</span>

                  <div className="flex items-center gap-1.5 text-[11px] text-[#f1f5f9]">
                    <span className="font-semibold text-[#f38b2a]">Kandla / Gulf of Kutch:</span>
                    <span className="text-[#8b9bb4]">32°C · Hazy Sun · NW 16 kts · Swell 1.6m</span>
                  </div>
                  <span className="text-slate-700">✦</span>

                  <div className="flex items-center gap-1.5 text-[11px] text-[#f1f5f9]">
                    <span className="font-semibold text-[#f38b2a]">Kolkata / Haldia:</span>
                    <span className="text-[#8b9bb4]">28°C · Isolated Storms · S 15 kts · Swell 1.9m</span>
                  </div>
                  <span className="text-slate-700">✦</span>

                  <div className="flex items-center gap-1.5 text-[11px] text-[#f1f5f9]">
                    <span className="font-semibold text-[#f38b2a]">Mangaluru:</span>
                    <span className="text-[#8b9bb4]">27°C · Moderate Sea · W 19 kts · Swell 2.3m</span>
                  </div>
                  <span className="text-slate-700">✦</span>

                  <div className="flex items-center gap-1.5 text-[11px] text-[#f1f5f9]">
                    <span className="font-semibold text-[#f38b2a]">Goa / Mormugao:</span>
                    <span className="text-[#8b9bb4]">28°C · Overcast · SW 17 kts · Swell 2.1m</span>
                  </div>
                  <span className="text-slate-700">✦</span>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* Ticker Row 2: Live Maritime Advisories & Shipping Notices */}
        <div className="w-full flex items-stretch h-10 overflow-hidden bg-[#0a101d]/95">
          <div className="flex-shrink-0 flex items-center gap-2 px-3.5 bg-[#131d2e] border-r border-[rgba(43,90,150,0.35)] z-20 shadow-md">
            <span className="w-2 h-2 rounded-full bg-[#f38b2a] animate-pulse shadow-[0_0_8px_#f38b2a]"></span>
            <span className="font-['JetBrains_Mono',monospace] text-[10px] text-[#f38b2a] font-bold whitespace-nowrap tracking-wider">
              LIVE NEWS
            </span>
          </div>
          <div className="relative w-full flex items-center overflow-hidden whitespace-nowrap">
            <div className="flex items-center gap-8 animate-[marquee_50s_linear_infinite] hover:[animation-play-state:paused]">
              {[...Array(2)].map((_, i) => (
                <React.Fragment key={i}>
                  <div className="flex items-center gap-1.5 text-[10px] tracking-wide text-[#f1f5f9]">
                    <span className="text-[#f38b2a] font-bold">ADVISORY //</span>
                    <span className="text-[#8b9bb4]">DG SHIPPING ISSUES MONSOON ROUTE ADVISORY FOR ARABIAN SEA TRANSITS</span>
                  </div>
                  <span className="text-slate-700">///</span>

                  <div className="flex items-center gap-1.5 text-[10px] tracking-wide text-[#f1f5f9]">
                    <span className="text-[#1ea857] font-bold">INTEGRATION //</span>
                    <span className="text-[#8b9bb4]">CONTAINER CARRIER TRACKING SYSTEM FULLY INTEGRATED AT JAWAHARLAL NEHRU PORT (JNPT)</span>
                  </div>
                  <span className="text-slate-700">///</span>

                  <div className="flex items-center gap-1.5 text-[10px] tracking-wide text-[#f1f5f9]">
                    <span className="text-[#f38b2a] font-bold">ALERT //</span>
                    <span className="text-[#f1f5f9]">DEBRISSENSE DETECTS AND CATALOGS UNMOORED BARGE 14NM OFF PARADIP PORT</span>
                  </div>
                  <span className="text-slate-700">///</span>

                  <div className="flex items-center gap-1.5 text-[10px] tracking-wide text-[#f1f5f9]">
                    <span className="text-[#f38b2a] font-bold">WEATHER BULLETIN //</span>
                    <span className="text-[#8b9bb4]">IMD WARNS OF SQUALLY WEATHER ALONG KERALA-KARNATAKA COASTLINE</span>
                  </div>
                  <span className="text-slate-700">///</span>

                  <div className="flex items-center gap-1.5 text-[10px] tracking-wide text-[#f1f5f9]">
                    <span className="text-[#1ea857] font-bold">INFRASTRUCTURE //</span>
                    <span className="text-[#8b9bb4]">SAGARMALA EXPANSION: REAL-TIME AIS TELEMETRY NOW LIVE ACROSS 12 MAJOR HUBS</span>
                  </div>
                  <span className="text-slate-700">///</span>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* Footer */}
      <footer className="w-full bg-[#070b12] border-t border-[rgba(43,90,150,0.3)] backdrop-blur-xl py-4 relative z-40">
        <div className="w-full px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#f38b2a] shadow-[0_0_8px_#f38b2a]"></span>
            <span className="font-['JetBrains_Mono',monospace] text-[10px] text-[#8b9bb4] uppercase">
              SAGAR SURAKSHA TACTICAL © 2026 · Exclusive Economic Zone Maritime Intelligence · India
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-[#8b9bb4]">
            <span className="font-mono">{time}</span>
            <span>LAT 18° 58' N · LON 72° 49' E</span>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#0a2318] border border-[#1ea857]/40">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1ea857]"></span>
              <span className="font-['JetBrains_Mono',monospace] text-[10px] text-[#f1f5f9] font-semibold">
                SYS OK · AIS LINK ACTIVE
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default DashboardShell;
