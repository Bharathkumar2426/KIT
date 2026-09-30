import React, { useState, useEffect } from 'react';

export function SagarSurakshaFeedPage({ onNavigateToMap, onNavigateToSonar }) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [audioPingsActive, setAudioPingsActive] = useState(true);
  const [showExportToast, setShowExportToast] = useState(false);
  const [utcTime, setUtcTime] = useState('00:00:00Z');
  const [istTime, setIstTime] = useState('00:00:00');

  useEffect(() => {
    const updateClocks = () => {
      const now = new Date();
      const utcHours = String(now.getUTCHours()).padStart(2, '0');
      const utcMinutes = String(now.getUTCMinutes()).padStart(2, '0');
      const utcSeconds = String(now.getUTCSeconds()).padStart(2, '0');
      setUtcTime(`${utcHours}:${utcMinutes}:${utcSeconds}Z`);

      const istDate = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
      const istHours = String(istDate.getUTCHours()).padStart(2, '0');
      const istMinutes = String(istDate.getUTCMinutes()).padStart(2, '0');
      const istSeconds = String(istDate.getUTCSeconds()).padStart(2, '0');
      setIstTime(`${istHours}:${istMinutes}:${istSeconds}`);
    };

    updateClocks();
    const interval = setInterval(updateClocks, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleExportGeoJSON = () => {
    setShowExportToast(true);
    setTimeout(() => setShowExportToast(false), 2800);
  };

  const hazardFeedItems = [
    {
      id: 'sar-01',
      category: 'sar',
      badge: 'CRITICAL // SAR MAYDAY',
      badgeClass: 'bg-red-500/20 text-red-400 border-red-500/30',
      accentColor: 'border-l-red-500',
      sector: 'SEC 08-NW // PORBANDAR COAST',
      lat: "21°34.12' N",
      lon: "069°12.44' E",
      timeAgo: 'T-04m AGO',
      title: "Distress Beacon Intercepted: Fishing Trawler 'Jal Kanya'",
      subtitle: 'MMSI: 419901428 · CALL SIGN: VTYP-8 · EPIRB 406.037 MHz FIRING',
      description: 'Hull breach suspected 34 nautical miles WSW of Porbandar Port. Rudder authority lost amid 3.8m breaking sea. Crew count 07 confirmed on board. Indian Coast Guard (ICG) Dornier 228 maritime surveillance aircraft dispatched from Porbandar Air Enclave. Fast Patrol Vessel (FPV) ICGS Vijit vectoring on intercept course 242° at 26 knots.',
      statLabel: 'ESTIMATED DRIFT',
      statValue: '1.8 KTS',
      statSub: 'VECTOR 145° SE',
      statBadge: 'HIGH RISK',
      etaLabel: 'ETA HELO INTERCEPT',
      etaValue: '18 MIN',
      cospas: 'LOC VERIFIED 99.4%',
      relay: 'MRCC MUMBAI'
    },
    {
      id: 'debris-01',
      category: 'debris',
      badge: 'DEBRISSENSE AI // OPTICAL & SAR ANOMALY',
      badgeClass: 'bg-[#f38b2a]/20 text-[#f38b2a] border-[#f38b2a]/30',
      accentColor: 'border-l-[#f38b2a]',
      sector: 'SEC 04-W // ARABIAN SEA SLOC',
      lat: "17°48.30' N",
      lon: "071°02.15' E",
      timeAgo: 'T-11m AGO',
      title: 'Semi-Submerged Steel Shipping Container Drifting in Westbound Transit Lane',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDzqvgO2baMQkPv1tG85JcFiVJbL6KesO0ztrw1yb4i-_h0ad7N_WMBtR-popN4OODqlNHeUEChEH5rpZi7iL8_uQ-2h7hwCizKdeqpq4Fibd_FzqIqCluNPVlKvN6zYOjN0836eIEmJPjBg-SyiqPDEocAFC9FYY3njcxmHstojPx1dNQQtt0LFtef0kVhwNN_FWBohsABO0FfALy-IDlI2DJLrHtCGtGFH_7blDA57oy1k7Y_maqc',
      conf: 'CONF: 98.6%',
      type: '40FT DRY ISO',
      tag: 'ELEVATED DANGER',
      description: 'ISRO EOS-04 radar satellite capture confirmed single unmoored 40-foot container awash, waterline depth 2.1m. Drifting at 2.4 knots along the primary crude tanker corridor from Gulf of Oman towards JNPT & Mumbai Port. Severe collision hazard for low-freeboard vessels and high-speed container feeders.',
      metrics: [
        { label: 'SURFACE ECHO', value: '12.4 dBσ', color: 'text-[#f38b2a]' },
        { label: 'SPEED DRIFT', value: '2.4 KTS / 288°', color: 'text-slate-100' },
        { label: 'APPROACHING', value: "VLCC 'DESH SHANTI'", color: 'text-[#ff9838]' },
        { label: 'RADIAL SEPARATION', value: '6.2 NM CLOSING', color: 'text-[#f38b2a]' }
      ],
      notice: 'NAVAREA VIII HAZARD BULLETIN #1042'
    },
    {
      id: 'weather-01',
      category: 'weather',
      badge: 'SEVERE METEOROLOGY // SQUALL FRONT',
      badgeClass: 'bg-[#ff9838]/20 text-[#ff9838] border-[#ff9838]/30',
      accentColor: 'border-l-[#ff9838]',
      sector: 'SEC 14-S // LAKSHADWEEP SEA',
      lat: "09°15.80' N",
      lon: "073°10.05' E",
      timeAgo: 'T-22m AGO',
      title: 'Severe Convective Monsoon Front & Microburst Complex',
      description: 'Doppler weather radar network (Kochi + Minicoy Island) tracking fast-moving convective cloud cell extending 120km across Nine Degree Channel. Sustained squalls with microburst gusts reaching 52 kts. Wave crests measured at 4.6m significant height. Coastal craft warning flag staged at Stage-3 in Cochin and Vizhinjam ports.',
      weatherStats: {
        gust: '52.4 KTS',
        swell: '4.6 M / 11s',
        baro: '992.8 hPa'
      },
      advisory: 'RECOMMEND 14 NM WESTERLY PASSAGE WAYPOINT'
    },
    {
      id: 'proximity-01',
      category: 'proximity',
      badge: 'AIS PROXIMITY // CPA WARNING',
      badgeClass: 'bg-[#f38b2a]/20 text-[#f38b2a] border-[#f38b2a]/30',
      accentColor: 'border-l-[#f38b2a]',
      sector: 'SEC 11-E // BAY OF BENGAL / CHENNAI TSS',
      lat: "13°09.40' N",
      lon: "080°24.60' E",
      timeAgo: 'T-34m AGO',
      title: 'Closest Point of Approach Conflict: Bulk Carrier vs. LNG Tanker',
      description: 'Projected intersecting tracks detected inside Traffic Separation Scheme (TSS) approaches to Chennai Port & Ennore Kamarajar Terminal. Target 1: MV Bharat Ratna (Capesize, LOA 292m). Target 2: Gas Horizon (Methane Carrier, LOA 285m).',
      cpa: '0.31 NM',
      tcpa: '11m 40s',
      colregs: 'Crossing Situation / Stand-on Vessel MV Bharat Ratna',
      prob: '78%',
      resolution: 'Alter Course Gas Horizon to 085° Starboard [CLEARANCE OK]'
    },
    {
      id: 'debris-02',
      category: 'debris',
      badge: 'DEBRISSENSE AI // UNDERWATER ACOUSTIC',
      badgeClass: 'bg-[#f38b2a]/20 text-[#f38b2a] border-[#f38b2a]/30',
      accentColor: 'border-l-[#f38b2a]',
      sector: 'SEC 09-SW // KOCHI HARBOR APPROACHES',
      lat: "09°56.12' N",
      lon: "076°08.55' E",
      timeAgo: 'T-51m AGO',
      title: 'Heavy Nylon Ghost Net Aggregation Drifting Near Cochin Port Fairway Buoy',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAqfqrwRdPo84097XQsuJPRnqydIuwrArY4xVcwAjqMPvgwmHyM9gGsqQ8ja2HSyWgbAe_nZ3aXxp4L6xT74d2UWdapOIpcuWYfVFetLibn4IGg3jXYO9B8keUKKcOsyEbMvGpCMh0AiH7dYymLJPuQJPyURaUhiUExAUK_MLIRPZimZPxIQ9Xwr_AkYMPhFrX58X_62yaXi0xJbWhF0mvK3bS3hOYj4uweVniUqkBnt4wzG70dZjUt',
      conf: 'SONAR SCAN 455 kHz',
      type: 'DEPTH: 14M',
      description: 'Autonomous underwater vehicle (AUV) telemetry and side-scan sonar confirmed mass of abandoned high-tensile monofilament netting spanning roughly 85m. Extreme fouling risk for commercial propulsion screws and intake seawater manifolds. Target marked with virtual AIS Navigational Aid hazard buoy.',
      tags: [
        'MASS: ~3.2 METRIC TONS',
        'SUBSURFACE: 6M - 18M',
        'RECOVERY: ICGS SAMARTH TASKED'
      ],
      navtex: '518 kHz (BROADCAST EN ROUTE)'
    },
    {
      id: 'bathymetry-01',
      category: 'bathymetry',
      badge: 'BATHYMETRIC TELEMETRY // SILTATION SHIFT',
      badgeClass: 'bg-[#ff9838]/20 text-[#ff9838] border-[#ff9838]/30',
      accentColor: 'border-l-[#ff9838]',
      sector: 'SEC 16-NE // HOOGHLY RIVER CHANNEL (KOLKATA / HALDIA)',
      lat: "21°41.20' N",
      lon: "088°01.40' E",
      timeAgo: 'T-1h 14m AGO',
      title: 'Critical Sandbar Siltation Shift in Balari Channel',
      description: 'Hydrographic sonar sweep from Syama Prasad Mookerjee Port trust buoy array registered unexpected 1.4m sediment accretion following upstream tidal surge. Governed permissible navigation draft immediately reduced from 8.8m down to 7.4m until dredging clearing operations commence.',
      draft: '7.4 METERS',
      dev: '-1.4m DEVIATION',
      pilot: 'HALDIA DOCK SYSTEM RE-ROUTING 3 VESSELS'
    }
  ];

  const filteredFeed = hazardFeedItems.filter(item => {
    const matchesCat = activeCategory === 'all' || item.category === activeCategory;
    const matchesSearch = !searchQuery || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sector.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="w-full flex flex-col bg-[#070c14] text-[#f0f4f8] min-h-screen">
      {/* Toast for GeoJSON Export */}
      {showExportToast && (
        <div className="fixed bottom-16 right-6 bg-[#f38b2a] text-[#070c14] font-bold px-4 py-3 rounded-lg text-[12px] tracking-wider shadow-[0_0_20px_rgba(243,139,42,0.6)] z-50 flex items-center gap-2 animate-bounce">
          <span className="material-symbols-outlined text-[18px]">cloud_download</span>
          <span>GENERATING GEOJSON TELEMETRY (14 HAZARDS PACKAGED)...</span>
        </div>
      )}

      {/* Tactical Ribbon Stream Top */}
      <div className="w-full bg-[#0b1320] border-b border-[rgba(43,90,150,0.25)] px-4 sm:px-6 lg:px-8 py-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#1ea857] animate-ping"></span>
              <span className="w-2 h-2 rounded-full bg-[#1ea857] -ml-2.5"></span>
              <span className="text-[10px] text-[#1ea857] tracking-widest uppercase font-bold">
                STREAM ACTIVE // EEZ SECTOR MONITOR
              </span>
            </div>
            <div className="hidden md:flex items-center gap-1.5 bg-[#0e1a2b] border border-[rgba(43,90,150,0.25)] px-2.5 py-0.5 rounded">
              <span className="text-[11px] text-[#94a3b8]">SAT-LINK:</span>
              <span className="text-[11px] text-[#f0f4f8]">162.025 MHz</span>
              <span className="text-[11px] text-[#1ea857] font-bold ml-1">99.8% SYNC</span>
            </div>
            <div className="hidden lg:flex items-center gap-1 text-[#94a3b8]">
              <span className="material-symbols-outlined text-[15px] text-[#f38b2a]">radar</span>
              <span className="text-[11px]">CYCLE: 2.50s</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-[#0e1a2b] border border-[rgba(43,90,150,0.25)] px-2.5 py-0.5 rounded">
              <span className="text-[10px] text-[#94a3b8] uppercase font-bold">UTC:</span>
              <span className="text-[11px] text-[#f0f4f8] font-mono">{utcTime}</span>
              <span className="text-[10px] text-[#f38b2a] uppercase font-bold ml-2">IST:</span>
              <span className="text-[11px] text-[#f38b2a] font-bold font-mono">{istTime}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-red-950/40 border border-red-500/30 px-2.5 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
              <span className="text-[10px] text-red-400 tracking-wider uppercase font-bold">14 ACTIVE HAZARDS</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Banner with Container Ship Atmospheric Backdrop */}
      <div className="relative w-full overflow-hidden bg-[#070c14] border-b border-[rgba(43,90,150,0.25)]">
        <div
          className="w-full h-40 sm:h-48 md:h-52 bg-cover bg-center"
          style={{
            backgroundImage: `url("https://lh3.googleusercontent.com/aida-public/AB6AXuBdgkuyUGVMq_xBPIQK3uldPSNftj6mVO-bk5IWDAf2k05YlW1PWvRJVb9ctX6VfAm2n_359OA1NXB1jPI32b5a6e9ODY5fd8YjTBp066R6SgxMDTBbHTi091xrcMNJV2rVDbhrkRxuswys59t9nIhgS2rtd4zQVOiK2S_jb6icHHNcXAEwa2P9IHTqCSUI-MxdS3yjQ8hqU6L4MXBWRI-0cp_RABrEWiXKPNrj81JjP55KP2SEw_Ww")`
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to top, rgba(7, 12, 20, 0.94) 0%, rgba(11, 19, 32, 0.45) 50%, rgba(7, 12, 20, 0.15) 100%)'
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to right, rgba(7, 12, 20, 0.75) 0%, transparent 45%, rgba(11, 19, 32, 0.6) 100%)'
          }}
        />

        <div className="absolute inset-x-0 bottom-0 px-4 sm:px-6 lg:px-8 pb-4 flex flex-col md:flex-row md:items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#f38b2a] px-1.5 py-0.5 bg-[#f38b2a]/15 border border-[#f38b2a]/30 rounded font-bold">
                SYSTEM FEED // SEC-IN-EEZ
              </span>
              <span className="text-[11px] text-[#cbd5e1]">NAVAREA VIII TACTICAL OVERLAY</span>
            </div>
            <h1 className="font-['Space_Grotesk',sans-serif] text-[24px] sm:text-[28px] text-[#f0f4f8] font-bold tracking-tight mt-1">
              Tactical Telemetry & Hazard Feed
            </h1>
            <p className="text-[12px] text-[#cbd5e1] max-w-3xl leading-relaxed mt-0.5">
              Automated multi-sensor synthesis combining Synthetic Aperture Radar (SAR), coastal AIS hubs, DebrisSense AI optics, and INS Dega / INS Shikra airborne reconnaissance.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setAudioPingsActive(!audioPingsActive)}
              className="bg-[#0e1a2b] border border-[rgba(43,90,150,0.25)] hover:bg-[#13233a] text-[#f0f4f8] px-3 py-1.5 rounded text-[12px] flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <span className={`material-symbols-outlined text-[16px] ${audioPingsActive ? 'text-[#f38b2a]' : 'text-[#94a3b8]'}`}>
                {audioPingsActive ? 'volume_up' : 'volume_off'}
              </span>
              <span>{audioPingsActive ? 'Audio Pings' : 'Muted'}</span>
            </button>

            <button
              onClick={handleExportGeoJSON}
              className="bg-[#f38b2a] hover:bg-[#ff9838] text-[#070c14] font-bold px-4 py-1.5 rounded text-[12px] flex items-center gap-1.5 transition-all shadow-[0_0_16px_rgba(243,139,42,0.35)] cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px] font-bold">download</span>
              <span>Export GeoJSON</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace: Left Frozen HUD Panel + Right Dynamic Hazard Feed List */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 flex-grow">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Frozen / Sticky Left Telemetry HUD */}
          <aside className="lg:col-span-4 lg:sticky lg:top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-1 flex flex-col gap-4 scrollbar-thin">
            {/* Maritime Codex - Henry Avery Quote Card */}
            <div className="bg-[#0e1a2b] border border-[rgba(43,90,150,0.25)] rounded-xl p-5 shadow-lg relative overflow-hidden group hover:border-[#f38b2a]/40 transition-all">
              {/* Saffron Tactical Glow & Ambient Scrim */}
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#f38b2a]/10 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute top-0 left-0 bottom-0 w-1 bg-gradient-to-b from-[#f38b2a] via-[#ff9838] to-[#1ea857]" />
              
              <div className="flex items-center justify-between mb-3.5 pb-2 border-b border-[rgba(43,90,150,0.2)]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#f38b2a] animate-pulse"></span>
                  <span className="font-['Space_Grotesk',sans-serif] text-[11px] text-[#f1f5f9] font-bold uppercase tracking-widest">
                    MARITIME CODEX // HISTORICAL DISPATCH
                  </span>
                </div>
                <span className="text-[10px] text-[#f38b2a] font-bold font-mono">EST. 1695</span>
              </div>

              {/* Henry Avery Quote Typography */}
              <div className="relative py-2 pl-2">
                <span className="text-[#f38b2a]/20 font-serif text-5xl absolute -top-4 -left-2 select-none pointer-events-none">“</span>
                <blockquote className="font-['Space_Grotesk',sans-serif] text-[17px] sm:text-[18px] leading-snug font-bold text-[#f1f5f9] italic relative z-10 drop-shadow-sm tracking-tight">
                  “I am a Man of Fortune, and must seek my Fortune.”
                </blockquote>
                <p className="font-['JetBrains_Mono',monospace] text-[12px] text-[#8b9bb4] mt-2.5 leading-relaxed">
                  Navigating uncharted ocean swells and sovereign tides across the Arabian Sea & Indian Ocean corridor.
                </p>
              </div>

              {/* Attribution & Provenance Meta */}
              <div className="mt-4 pt-3 border-t border-[rgba(43,90,150,0.2)] flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 text-[#ff9838] font-semibold">
                  <span className="material-symbols-outlined text-[15px]">anchor</span>
                  <span className="font-['JetBrains_Mono',monospace]">Captain Henry Avery</span>
                </div>
                <span className="font-['JetBrains_Mono',monospace] text-[#8b9bb4] text-[10px]">
                  ARABIAN SEA SLOC
                </span>
              </div>
            </div>

            {/* 24-Hour Telemetry Aggregates */}
            <div className="bg-[#0e1a2b] border border-[rgba(43,90,150,0.25)] rounded-xl p-4 shadow-lg">
              <div className="flex items-center justify-between pb-2 border-b border-[rgba(43,90,150,0.2)]">
                <h3 className="font-['Space_Grotesk'] text-[15px] text-[#f0f4f8] font-bold">Telemetry Aggregates</h3>
                <span className="text-[9px] text-[#94a3b8] uppercase font-bold tracking-wider">PAST 24 HOURS</span>
              </div>

              <div className="space-y-2.5 mt-3">
                <div className="bg-[#070c14] border border-[rgba(43,90,150,0.25)] p-2.5 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[#f38b2a] text-[18px]">filter_center_focus</span>
                    <div>
                      <div className="text-[12px] text-[#f0f4f8] font-semibold">Debris Interceptions</div>
                      <div className="text-[10px] text-[#94a3b8]">Containers, ghost nets, flotsam</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[16px] text-[#f38b2a] font-bold">38</div>
                    <div className="text-[10px] text-[#1ea857] font-bold">+12% vs avg</div>
                  </div>
                </div>

                <div className="bg-[#070c14] border border-[rgba(43,90,150,0.25)] p-2.5 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-red-400 text-[18px]">e911_emergency</span>
                    <div>
                      <div className="text-[12px] text-[#f0f4f8] font-semibold">Active SAR Incidents</div>
                      <div className="text-[10px] text-[#94a3b8]">Porbandar fishing trawler</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[16px] text-red-400 font-bold">01</div>
                    <div className="text-[10px] text-red-400 font-bold">CRITICAL</div>
                  </div>
                </div>

                <div className="bg-[#070c14] border border-[rgba(43,90,150,0.25)] p-2.5 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[#ff9838] text-[18px]">cyclone</span>
                    <div>
                      <div className="text-[12px] text-[#f0f4f8] font-semibold">Storm Fronts Monitored</div>
                      <div className="text-[10px] text-[#94a3b8]">Monsoon convective cells</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[16px] text-[#ff9838] font-bold">06</div>
                    <div className="text-[10px] text-[#94a3b8]">SECTORS 04, 14</div>
                  </div>
                </div>

                <div className="bg-[#070c14] border border-[rgba(43,90,150,0.25)] p-2.5 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[#f38b2a] text-[18px]">speed</span>
                    <div>
                      <div className="text-[12px] text-[#f0f4f8] font-semibold">Alert Pipeline Latency</div>
                      <div className="text-[10px] text-[#94a3b8]">ISRO SAR to ECDIS feed</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[16px] text-[#f0f4f8] font-bold">0.38s</div>
                    <div className="text-[10px] text-[#1ea857] font-bold">REAL-TIME</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sensor Network Status */}
            <div className="bg-[#0e1a2b] border border-[rgba(43,90,150,0.25)] rounded-xl p-4 shadow-lg">
              <div className="flex items-center justify-between pb-2 border-b border-[rgba(43,90,150,0.2)]">
                <h3 className="font-['Space_Grotesk'] text-[15px] text-[#f0f4f8] font-bold">Indian Sensor Network</h3>
                <span className="text-[10px] text-[#1ea857] font-bold">ALL OPERATIONAL</span>
              </div>

              <div className="divide-y divide-[rgba(43,90,150,0.2)] mt-2">
                <div className="py-1.5 flex items-center justify-between text-[11px]">
                  <span className="text-[#f0f4f8]">JNPT VTS Radar Mast #3</span>
                  <span className="text-[#1ea857] font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1ea857]"></span> 100% ONLINE
                  </span>
                </div>
                <div className="py-1.5 flex items-center justify-between text-[11px]">
                  <span className="text-[#f0f4f8]">INS Shikra Helo Airborne AIS</span>
                  <span className="text-[#1ea857] font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1ea857]"></span> LINKED
                  </span>
                </div>
                <div className="py-1.5 flex items-center justify-between text-[11px]">
                  <span className="text-[#f0f4f8]">Paradip Deepwater Wave Buoy 4</span>
                  <span className="text-[#f38b2a] font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#f38b2a]"></span> 96.2% TELEM
                  </span>
                </div>
                <div className="py-1.5 flex items-center justify-between text-[11px]">
                  <span className="text-[#f0f4f8]">Palk Bay Coastal Radar Chain</span>
                  <span className="text-[#1ea857] font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1ea857]"></span> NOMINAL
                  </span>
                </div>
              </div>
            </div>

            {/* Clearance Directives */}
            <div className="bg-[#0e1a2b] border border-[rgba(43,90,150,0.25)] p-3.5 rounded-xl">
              <div className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[#f38b2a] text-[20px] mt-0.5">verified_user</span>
                <div>
                  <div className="text-[10px] text-[#f38b2a] uppercase font-bold tracking-wider">
                    DG SHIPPING / INCOIS CLEARANCE
                  </div>
                  <p className="text-[11px] text-[#cbd5e1] mt-1 leading-relaxed">
                    Encrypted tactical feeds broadcast under Ministry of Ports, Shipping and Waterways Protocol 7-B.
                  </p>
                </div>
              </div>
            </div>
          </aside>

          {/* Right Hazard Feed Workspace */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            {/* Filter Ribbons */}
            <div className="w-full bg-[#0b1320] border border-[rgba(43,90,150,0.3)] rounded-xl p-3 shadow-xl sticky top-20 z-30">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={() => setActiveCategory('all')}
                    className={`text-[10px] uppercase px-2.5 py-1 rounded font-bold transition-all cursor-pointer ${
                      activeCategory === 'all'
                        ? 'bg-[#f38b2a] text-[#070c14] shadow-[0_0_10px_rgba(243,139,42,0.3)]'
                        : 'bg-[#0e1a2b] hover:bg-[#13233a] text-[#94a3b8] hover:text-[#f0f4f8] border border-[rgba(43,90,150,0.25)]'
                    }`}
                  >
                    All Interceptions (14)
                  </button>

                  <button
                    onClick={() => setActiveCategory('debris')}
                    className={`text-[10px] uppercase px-2.5 py-1 rounded transition-all flex items-center gap-1 cursor-pointer ${
                      activeCategory === 'debris'
                        ? 'bg-[#f38b2a] text-[#070c14] font-bold shadow-[0_0_10px_rgba(243,139,42,0.3)]'
                        : 'bg-[#0e1a2b] hover:bg-[#13233a] text-[#94a3b8] hover:text-[#f0f4f8] border border-[rgba(43,90,150,0.25)]'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#f38b2a]"></span>
                    DebrisSense AI (6)
                  </button>

                  <button
                    onClick={() => setActiveCategory('sar')}
                    className={`text-[10px] uppercase px-2.5 py-1 rounded transition-all flex items-center gap-1 cursor-pointer ${
                      activeCategory === 'sar'
                        ? 'bg-[#f38b2a] text-[#070c14] font-bold shadow-[0_0_10px_rgba(243,139,42,0.3)]'
                        : 'bg-[#0e1a2b] hover:bg-[#13233a] text-[#94a3b8] hover:text-[#f0f4f8] border border-[rgba(43,90,150,0.25)]'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                    SAR Telemetry (1)
                  </button>

                  <button
                    onClick={() => setActiveCategory('weather')}
                    className={`text-[10px] uppercase px-2.5 py-1 rounded transition-all flex items-center gap-1 cursor-pointer ${
                      activeCategory === 'weather'
                        ? 'bg-[#f38b2a] text-[#070c14] font-bold shadow-[0_0_10px_rgba(243,139,42,0.3)]'
                        : 'bg-[#0e1a2b] hover:bg-[#13233a] text-[#94a3b8] hover:text-[#f0f4f8] border border-[rgba(43,90,150,0.25)]'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ff9838]"></span>
                    Monsoon Squalls (4)
                  </button>

                  <button
                    onClick={() => setActiveCategory('proximity')}
                    className={`text-[10px] uppercase px-2.5 py-1 rounded transition-all flex items-center gap-1 cursor-pointer ${
                      activeCategory === 'proximity'
                        ? 'bg-[#f38b2a] text-[#070c14] font-bold shadow-[0_0_10px_rgba(243,139,42,0.3)]'
                        : 'bg-[#0e1a2b] hover:bg-[#13233a] text-[#94a3b8] hover:text-[#f0f4f8] border border-[rgba(43,90,150,0.25)]'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1ea857]"></span>
                    CPA / Proximity (2)
                  </button>
                </div>

                <div className="relative w-full md:w-64">
                  <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8] text-[16px]">
                    search
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="FILTER MMSI, SECTOR..."
                    className="w-full bg-[#070c14] border border-[rgba(43,90,150,0.3)] text-[#f0f4f8] placeholder-[#94a3b8] text-[11px] pl-8 pr-3 py-1 rounded outline-none focus:border-[#f38b2a] transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-4">
              {filteredFeed.map((item) => (
                <article
                  key={item.id}
                  className={`bg-[#0e1a2b] border border-[rgba(43,90,150,0.25)] rounded-xl p-4 relative overflow-hidden transition-all hover:border-[rgba(43,90,150,0.5)] border-l-4 ${item.accentColor}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${item.badgeClass}`}>
                        {item.badge}
                      </span>
                      <span className="text-[10px] text-[#94a3b8] uppercase font-bold">
                        {item.sector}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-[#cbd5e1]">
                      <span>LAT {item.lat}</span>
                      <span>LON {item.lon}</span>
                      <span className="text-[#f38b2a] font-bold">{item.timeAgo}</span>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row items-start justify-between gap-4 mt-2">
                    {item.image && (
                      <div className="w-full md:w-44 h-32 bg-[#070c14] border border-[rgba(43,90,150,0.3)] rounded-lg overflow-hidden relative flex-shrink-0">
                        <div
                          className="w-full h-full bg-cover bg-center"
                          style={{ backgroundImage: `url("${item.image}")` }}
                        />
                        <div className="absolute inset-0 bg-[#f38b2a]/15 mix-blend-color"></div>
                        <div className="absolute top-1 left-1 bg-[#070c14]/90 border border-[#f38b2a]/40 px-1 py-0.5 rounded text-[9px] text-[#f38b2a] font-bold">
                          {item.conf}
                        </div>
                        <div className="absolute bottom-1 right-1 bg-[#070c14]/90 border border-[rgba(43,90,150,0.3)] px-1 py-0.5 rounded text-[10px] text-[#f0f4f8]">
                          {item.type}
                        </div>
                      </div>
                    )}

                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h2 className="font-['Space_Grotesk'] text-[16px] text-[#f0f4f8] font-bold">
                          {item.title}
                        </h2>
                        {item.tag && (
                          <span className="text-[9px] text-[#f38b2a] bg-[#f38b2a]/20 border border-[#f38b2a]/30 px-1.5 py-0.5 rounded font-bold whitespace-nowrap">
                            {item.tag}
                          </span>
                        )}
                      </div>
                      {item.subtitle && (
                        <p className="text-[11px] text-[#cbd5e1] mt-0.5">{item.subtitle}</p>
                      )}
                      <p className="text-[12px] text-[#cbd5e1] mt-2 leading-relaxed">
                        {item.description}
                      </p>

                      {item.metrics && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                          {item.metrics.map((m, idx) => (
                            <div key={idx} className="bg-[#070c14] border border-[rgba(43,90,150,0.25)] p-2 rounded">
                              <span className="text-[9px] text-[#94a3b8] block">{m.label}</span>
                              <span className={`text-[12px] font-semibold ${m.color}`}>{m.value}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {item.weatherStats && (
                        <div className="mt-3 flex items-center gap-4 bg-[#070c14] border border-[rgba(43,90,150,0.25)] p-2.5 rounded">
                          <div>
                            <span className="text-[9px] text-[#94a3b8] block">PEAK GUST</span>
                            <span className="text-[12px] text-[#f0f4f8] font-bold">{item.weatherStats.gust}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-[#94a3b8] block">SIG SWELL</span>
                            <span className="text-[12px] text-[#f0f4f8] font-bold">{item.weatherStats.swell}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-[#94a3b8] block">BAROMETER</span>
                            <span className="text-[12px] text-[#ff9838] font-bold">{item.weatherStats.baro}</span>
                          </div>
                        </div>
                      )}

                      {item.cpa && (
                        <div className="flex flex-wrap items-center gap-3 mt-3 bg-[#070c14] border border-[rgba(43,90,150,0.25)] p-2.5 rounded">
                          <div>
                            <span className="text-[9px] text-[#94a3b8] block">PROJECTED CPA</span>
                            <span className="text-[14px] text-red-400 font-bold">{item.cpa}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-[#94a3b8] block">TIME TO CPA</span>
                            <span className="text-[14px] text-[#ff9838] font-bold">{item.tcpa}</span>
                          </div>
                          <div className="text-[11px] text-[#cbd5e1]">
                            <span className="text-[9px] text-[#94a3b8] block">COLREGS RULE 15</span>
                            {item.colregs}
                          </div>
                        </div>
                      )}
                    </div>

                    {item.statLabel && (
                      <div className="w-full md:w-48 bg-[#070c14] border border-[rgba(43,90,150,0.25)] p-3 rounded-lg flex flex-col gap-1.5 self-stretch">
                        <div className="flex justify-between items-center text-[#94a3b8] text-[9px] font-bold">
                          <span>{item.statLabel}</span>
                          <span className="text-red-400">{item.statBadge}</span>
                        </div>
                        <div className="flex items-baseline justify-between">
                          <span className="text-[16px] text-[#f0f4f8] font-bold">{item.statValue}</span>
                          <span className="text-[10px] text-[#cbd5e1]">{item.statSub}</span>
                        </div>
                        <div className="w-full bg-[#13233a] h-1.5 rounded overflow-hidden mt-1">
                          <div className="bg-red-500 h-full w-4/5"></div>
                        </div>
                        <div className="flex justify-between items-center text-[#94a3b8] text-[10px] pt-1">
                          <span>{item.etaLabel}</span>
                          <span className="text-[#f38b2a] font-bold">{item.etaValue}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2 bg-[#070c14]/60 border-t border-[rgba(43,90,150,0.25)] -mx-4 -mb-4 px-4 py-2">
                    <div className="flex items-center gap-2 text-[10px] text-[#94a3b8]">
                      {item.cospas && <span>COSPAS-SARSAT: <span className="text-[#f0f4f8]">{item.cospas}</span></span>}
                      {item.relay && <span>| RELAY: <span className="text-[#f0f4f8]">{item.relay}</span></span>}
                      {item.notice && <span>AUTO-ISSUED: <span className="text-[#f0f4f8]">{item.notice}</span></span>}
                      {item.advisory && <span>ADVISORY: <span className="text-[#f0f4f8]">{item.advisory}</span></span>}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={onNavigateToMap}
                        className="bg-[#13233a] hover:bg-[#192e4d] border border-[rgba(43,90,150,0.4)] text-[#f0f4f8] text-[10px] uppercase px-2.5 py-1 rounded transition-colors font-semibold cursor-pointer"
                      >
                        Target Lock & Zoom
                      </button>
                      <button
                        onClick={onNavigateToSonar}
                        className="bg-[#f38b2a] text-[#070c14] hover:bg-[#ff9838] text-[10px] uppercase px-2.5 py-1 rounded font-bold transition-colors shadow-[0_0_10px_rgba(243,139,42,0.3)] cursor-pointer"
                      >
                        Inspect Sonar Echo
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
