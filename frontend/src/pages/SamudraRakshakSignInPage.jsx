import React, { useState, useEffect } from 'react';
import { 
  Anchor, 
  ShieldCheck, 
  Lock, 
  Key, 
  Eye, 
  EyeOff, 
  Cpu, 
  Radio, 
  Radar, 
  Compass, 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  Layers, 
  Globe2, 
  Ship, 
  Target,
  Zap,
  Fingerprint
} from 'lucide-react';

export function SamudraRakshakSignInPage({ onSignIn, healthData }) {
  const [email, setEmail] = useState('watchkeeper.subsea@samudrarakshak.gov.in');
  const [password, setPassword] = useState('••••••••••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberNode, setRememberNode] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authSuccess, setAuthSuccess] = useState(false);
  const [utcTime, setUtcTime] = useState('');

  // Live UTC HUD Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getUTCHours()).padStart(2, '0');
      const minutes = String(now.getUTCMinutes()).padStart(2, '0');
      const seconds = String(now.getUTCSeconds()).padStart(2, '0');
      setUtcTime(`UTC ${hours}:${minutes}:${seconds}Z`);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    setIsAuthenticating(true);

    setTimeout(() => {
      setIsAuthenticating(false);
      setAuthSuccess(true);
      setTimeout(() => {
        if (onSignIn) {
          onSignIn({
            email,
            role: 'Watchkeeper Subsea Specialist',
            callSign: 'IN-SS-09',
            authMethod: 'ECDSA-Hardware',
          });
        }
      }, 600);
    }, 700);
  };

  const handleQuickAuth = (methodName) => {
    setIsAuthenticating(true);
    setTimeout(() => {
      setIsAuthenticating(false);
      setAuthSuccess(true);
      setTimeout(() => {
        if (onSignIn) {
          onSignIn({
            email: `${methodName.toLowerCase().replace(/\s+/g, '_')}@samudrarakshak.gov.in`,
            role: `${methodName} Operator`,
            callSign: 'IN-DEF-88',
            authMethod: methodName,
          });
        }
      }, 600);
    }, 500);
  };

  const isOnline = healthData && healthData.status === 'ok';

  return (
    <div className="min-h-screen bg-[#040b14] text-slate-100 font-sans antialiased overflow-x-hidden relative flex flex-col justify-between selection:bg-[#f38b2a]/30 selection:text-white">
      {/* Ambient Oceanic Background with Sonar Radar & Glows */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-50 scale-105 transform transition-transform duration-1000"
          style={{
            backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuBdgkuyUGVMq_xBPIQK3uldPSNftj6mVO-bk5IWDAf2k05YlW1PWvRJVb9ctX6VfAm2n_359OA1NXB1jPI32b5a6e9ODY5fd8YjTBp066R6SgxMDTBbHTi091xrcMNJV2rVDbhrkRxuswys59t9nIhgS2rtd4zQVOiK2S_jb6icHHNcXAEwa2P9IHTqCSUI-MxdS3yjQ8hqU6L4MXBWRI-0cp_RABrEWiXKPNrj81JjP55KP2SEw_Ww')`
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#090f15]/90 via-[#0e141a]/85 to-[#090f15]/95 backdrop-blur-[2px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(243,139,42,0.15),rgba(255,255,255,0))]" />
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#f38b2a]/10 rounded-full blur-[140px]" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#138808]/15 rounded-full blur-[140px]" />
      </div>

      {/* Top Telemetry Micro-Bar (HUD Aesthetic) */}
      <header className="relative z-10 w-full border-b border-white/10 bg-[#090f15]/80 backdrop-blur-md px-4 sm:px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs font-mono tracking-wider">
          <div className="flex items-center space-x-3 sm:space-x-5 text-slate-300">
            <div className="flex items-center space-x-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#138808] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#22c55e]"></span>
              </span>
              <span className="text-[#22c55e] font-semibold uppercase tracking-wider text-[11px] sm:text-xs">
                SAMUDRA RAKSHAK AI: ACTIVE
              </span>
            </div>
            <span className="hidden sm:inline text-slate-600">|</span>
            <span className="hidden sm:inline text-slate-300">
              IN-EEZ SUBSEA RADAR <span className="text-[#f38b2a] font-medium">YOLOv8-CUDA</span>
            </span>
            <span className="hidden md:inline text-slate-600">|</span>
            <span className="hidden md:inline text-slate-300">
              NAVIC GEOFENCE: <span className="text-[#22c55e]">ENGAGED [WGS84]</span>
            </span>
          </div>

          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="hidden sm:flex items-center space-x-2 text-slate-200 bg-[#161c22]/80 border border-[#f38b2a]/30 px-2.5 py-0.5 rounded">
              <ShieldCheck className="w-3.5 h-3.5 text-[#f38b2a]" />
              <span className="font-medium text-[11px]">MIL-STD-256 // ECDSA SECURE</span>
            </div>
            <span className="text-slate-300 font-medium px-2 py-0.5 rounded bg-black/40 border border-white/5">
              {utcTime || 'UTC 05:48:43Z'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Split-Screen Container */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10 my-auto">
        <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* ================= LEFT PANEL: SIGN-IN FORM ================= */}
          <div className="lg:col-span-5 order-2 lg:order-1 flex flex-col justify-center">
            <div className="rounded-2xl p-6 sm:p-9 relative overflow-hidden transition-all duration-300 bg-[#0e141a]/90 backdrop-blur-xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
              {/* Glowing Accent Top Bar */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#f38b2a] to-transparent"></div>
              
              {/* Header inside Card */}
              <div className="flex items-center justify-between mb-7">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-[#f38b2a]/10 border border-[#f38b2a]/40 flex items-center justify-center text-[#f38b2a] shadow-[0_0_15px_rgba(243,139,42,0.25)]">
                    <Fingerprint className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-mono uppercase tracking-widest text-[#f38b2a] font-semibold block">
                      OPERATOR GATEWAY
                    </span>
                    <span className="text-xs text-slate-400">Terminal Access Port #409</span>
                  </div>
                </div>
                <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium bg-[#138808]/15 text-[#22c55e] border border-[#138808]/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse"></span>
                  <span>SECURE BUS // NMDA</span>
                </span>
              </div>

              {/* Title & Subtitle */}
              <div className="mb-6">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center">
                  Authenticate<span className="text-[#f38b2a] ml-1.5 font-mono text-xl animate-pulse">_</span>
                </h2>
                <p className="text-sm text-slate-300 mt-1.5 leading-relaxed">
                  Enter your sovereign maritime credentials to access telemetry streams, subsea sonar models, and real-time vessel vectors.
                </p>
              </div>

              {/* Form */}
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#ffb780] font-semibold" htmlFor="email">
                    Operator Email / Call Sign
                  </label>
                  <div className="relative rounded-lg">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input 
                      className="w-full pl-10 pr-4 py-3 text-sm rounded-lg bg-[#161c22] border border-white/10 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#f38b2a] focus:ring-1 focus:ring-[#f38b2a] transition-all font-mono"
                      id="email"
                      name="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="operator@samudrarakshak.gov.in"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-mono uppercase tracking-wider text-[#ffb780] font-semibold" htmlFor="password">
                      Tactical Passkey / Hardware FIDO
                    </label>
                    <button 
                      type="button" 
                      onClick={() => alert("Passkey reset authorization requested from Station Admin.")}
                      className="text-xs text-[#ffb780] hover:text-white hover:underline transition-colors font-medium"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative rounded-lg">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Key className="w-4 h-4" />
                    </div>
                    <input 
                      className="w-full pl-10 pr-10 py-3 text-sm rounded-lg bg-[#161c22] border border-white/10 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#f38b2a] focus:ring-1 focus:ring-[#f38b2a] transition-all font-mono tracking-widest"
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter encrypted passkey"
                      required
                    />
                    <button 
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-[#ffb780] transition-colors"
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                    <input 
                      checked={rememberNode}
                      onChange={(e) => setRememberNode(e.target.checked)}
                      className="w-4 h-4 rounded border-white/20 bg-[#161c22] text-[#f38b2a] focus:ring-[#f38b2a] accent-[#f38b2a] cursor-pointer"
                      type="checkbox"
                    />
                    <span className="text-xs text-slate-300 font-normal">Remember device node</span>
                  </label>
                  <div className="flex items-center space-x-1.5 text-[11px] font-mono text-[#ffb780] bg-[#1a2027] px-2 py-0.5 rounded border border-[#f38b2a]/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#f38b2a] animate-pulse"></span>
                    <span>ENC: AES-GCM-256</span>
                  </div>
                </div>

                {/* Submit Action Button */}
                <button 
                  className={`w-full relative group overflow-hidden rounded-xl bg-gradient-to-r from-[#f38b2a] to-[#d97316] text-white py-3.5 px-6 font-mono text-sm font-semibold tracking-wide uppercase transition-all duration-300 shadow-[0_0_20px_rgba(243,139,42,0.35)] hover:shadow-[0_0_28px_rgba(243,139,42,0.6)] hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center space-x-3 ${
                    isAuthenticating ? 'opacity-80 cursor-wait' : ''
                  }`}
                  type="submit"
                  disabled={isAuthenticating}
                >
                  {isAuthenticating ? (
                    <>
                      <Activity className="w-4 h-4 animate-spin text-white" />
                      <span>DECRYPTING CREDENTIALS...</span>
                    </>
                  ) : authSuccess ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                      <span>ACCESS GRANTED • ENTERING CONSOLE</span>
                    </>
                  ) : (
                    <>
                      <span>SIGN IN TO BRIDGE CONSOLE</span>
                      <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>

                {/* Secondary Fast Authenticators */}
                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-white/10"></div>
                  <span className="flex-shrink mx-3 text-[11px] font-mono uppercase tracking-wider text-slate-400">
                    Or Authenticate Via PKI / CAC
                  </span>
                  <div className="flex-grow border-t border-white/10"></div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => handleQuickAuth("FIPS SmartCard")}
                    className="flex items-center justify-center space-x-2 py-2.5 px-3 rounded-lg bg-[#161c22]/80 hover:bg-[#1f2730] border border-white/10 hover:border-[#f38b2a]/40 text-xs font-mono text-slate-300 transition-all hover:text-white"
                    type="button"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-[#f38b2a]" />
                    <span>FIPS SmartCard</span>
                  </button>
                  <button 
                    onClick={() => handleQuickAuth("NavIC Sat-Key")}
                    className="flex items-center justify-center space-x-2 py-2.5 px-3 rounded-lg bg-[#161c22]/80 hover:bg-[#1f2730] border border-white/10 hover:border-[#22c55e]/40 text-xs font-mono text-slate-300 transition-all hover:text-white"
                    type="button"
                  >
                    <Zap className="w-3.5 h-3.5 text-[#22c55e]" />
                    <span>NavIC Sat-Key</span>
                  </button>
                </div>
              </form>

              <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                <span>New station or vessel?</span>
                <button 
                  onClick={() => handleSubmit()}
                  className="text-[#ffb780] hover:text-white font-semibold hover:underline flex items-center space-x-1"
                >
                  <span>Request Operational Clearance</span>
                  <span aria-hidden="true">→</span>
                </button>
              </div>
            </div>

            {/* Latitude & Longitude HUD Footer */}
            <div className="mt-4 px-2 flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>STATION LAT: 18° 55' 28" N</span>
              <span className="text-[#f38b2a]/60">•</span>
              <span>LON: 72° 50' 14" E</span>
              <span className="text-[#f38b2a]/60">•</span>
              <span>GRID: WGS84 // NAVAREA VIII</span>
            </div>
          </div>

          {/* ================= RIGHT PANEL: PRODUCT HIGHLIGHTS ================= */}
          <div className="lg:col-span-7 order-1 lg:order-2 space-y-6 lg:pl-4">
            <div className="space-y-3">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#161c22]/90 border border-[#f38b2a]/40 text-[#ffb780] text-xs font-mono tracking-wider">
                <span className="w-2 h-2 rounded-full bg-[#f38b2a] shadow-[0_0_8px_#f38b2a]"></span>
                <span>SOVEREIGN MARITIME SITUATIONAL AWARENESS // IN-EEZ</span>
              </div>

              <div className="flex items-center space-x-3.5">
                <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-[#f38b2a] to-[#d97316] p-[1.5px] shadow-[0_0_20px_rgba(243,139,42,0.45)]">
                  <div className="w-full h-full bg-[#0e141a] rounded-[10px] flex items-center justify-center relative overflow-hidden">
                    <Radar className="w-7 h-7 text-[#f38b2a]" />
                  </div>
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white flex items-center space-x-2">
                    <span>Samudra</span>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ffb780] via-[#f38b2a] to-[#ffdcc4]">
                      Rakshak
                    </span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#161c22] border border-white/20 text-slate-300 ml-2 hidden sm:inline">
                      OCEAN GARMIN
                    </span>
                  </h1>
                </div>
              </div>

              <p className="text-base sm:text-lg text-slate-200 font-medium tracking-wide">
                AI-Powered Underwater Debris Detection & Maritime Situational Awareness
              </p>
              <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
                Integrating real-time deep learning sonar processing, geospatial geofencing, and automated maritime collision prevention into India's unified cyber-oceanic command interface.
              </p>
            </div>

            {/* 4 Feature Cards */}
            <div className="space-y-3.5 pt-2">
              
              {/* Feature 1: Automated Debris Detection */}
              <div className="rounded-xl p-4 sm:p-5 flex items-start space-x-4 bg-[#0e141a]/85 backdrop-blur-md border border-white/10 hover:border-[#f38b2a]/50 transition-all duration-300 group shadow-lg">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[#161c22] border border-[#f38b2a]/30 flex items-center justify-center text-[#f38b2a] shadow-[0_0_15px_rgba(243,139,42,0.2)] group-hover:border-[#f38b2a] transition-all">
                  <Target className="w-6 h-6 transform group-hover:scale-110 transition-transform" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-base font-bold text-white group-hover:text-[#ffb780] transition-colors flex items-center">
                      Automated Debris Detection
                      <span className="ml-2 text-[10px] font-mono px-2 py-0.5 rounded bg-[#f38b2a]/15 text-[#ffb780] border border-[#f38b2a]/30">
                        YOLOv8 AI
                      </span>
                    </h3>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Detects, localizes, and classifies underwater anomalies and debris from raw side-scan sonar imagery in real time using deep learning (YOLOv8).
                  </p>
                </div>
              </div>

              {/* Feature 2: Dynamic Geofencing */}
              <div className="rounded-xl p-4 sm:p-5 flex items-start space-x-4 bg-[#0e141a]/85 backdrop-blur-md border border-white/10 hover:border-[#22c55e]/50 transition-all duration-300 group shadow-lg">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[#161c22] border border-[#22c55e]/30 flex items-center justify-center text-[#22c55e] shadow-[0_0_15px_rgba(34,197,94,0.2)] group-hover:border-[#22c55e] transition-all">
                  <Compass className="w-6 h-6 transform group-hover:scale-110 transition-transform" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-base font-bold text-white group-hover:text-[#22c55e] transition-colors flex items-center">
                      Dynamic Geofencing & Georeferencing
                      <span className="ml-2 text-[10px] font-mono px-2 py-0.5 rounded bg-[#138808]/15 text-[#22c55e] border border-[#138808]/30">
                        WGS84 / NAVIC GPS
                      </span>
                    </h3>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Converts 2D acoustic pixel coordinates into real-world WGS84 GPS coordinates and computes dynamic safety exclusion zones around submerged hazards.
                  </p>
                </div>
              </div>

              {/* Feature 3: Live AIS Maritime Tracking */}
              <div className="rounded-xl p-4 sm:p-5 flex items-start space-x-4 bg-[#0e141a]/85 backdrop-blur-md border border-white/10 hover:border-[#ffb780]/50 transition-all duration-300 group shadow-lg">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[#161c22] border border-[#ffb780]/30 flex items-center justify-center text-[#ffb780] shadow-[0_0_15px_rgba(243,139,42,0.2)] group-hover:border-[#ffb780] transition-all">
                  <Ship className="w-6 h-6 transform group-hover:scale-110 transition-transform" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-base font-bold text-white group-hover:text-[#ffb780] transition-colors flex items-center">
                      Live AIS Maritime Vessel Tracking
                      <span className="ml-2 text-[10px] font-mono px-2 py-0.5 rounded bg-[#161c22] text-slate-200 border border-white/20">
                        AIS STREAM
                      </span>
                    </h3>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Streams live global maritime vessels via AIS to provide comprehensive above-surface and subsea situational awareness.
                  </p>
                </div>
              </div>

              {/* Feature 4: Collision Proximity Alerting */}
              <div className="rounded-xl p-4 sm:p-5 flex items-start space-x-4 bg-[#0e141a]/85 backdrop-blur-md border border-white/10 hover:border-[#f38b2a]/50 transition-all duration-300 group shadow-lg">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[#161c22] border border-[#f38b2a]/40 flex items-center justify-center text-[#f38b2a] shadow-[0_0_15px_rgba(243,139,42,0.25)] group-hover:border-[#f38b2a] transition-all">
                  <AlertTriangle className="w-6 h-6 transform group-hover:scale-110 transition-transform" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-base font-bold text-white group-hover:text-[#ffb780] transition-colors flex items-center">
                      Collision Proximity & SOS Safety Alerting
                      <span className="ml-2 text-[10px] font-mono px-2 py-0.5 rounded bg-[#f38b2a]/15 text-[#ffb780] border border-[#f38b2a]/30">
                        REAL-TIME SOS
                      </span>
                    </h3>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Continuously computes geodesic proximity between surface vessels and seabed hazards, automatically triggering real-time hazard warnings and SOS alerts.
                  </p>
                </div>
              </div>

            </div>

            {/* Bottom Engine Specs */}
            <div className="rounded-xl p-3.5 flex flex-wrap items-center justify-between text-xs font-mono text-slate-300 border border-white/10 bg-[#0e141a]/90 backdrop-blur-md gap-3">
              <div className="flex items-center space-x-2">
                <span className="text-[#ffb780] font-semibold">GEODESIC ENGINE:</span>
                <span className="text-white font-medium">Haversine + Vincenty</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-[#ffb780] font-semibold">SONAR FRAME RATE:</span>
                <span className="text-[#22c55e] font-semibold">48 FPS (TensorRT)</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-[#ffb780] font-semibold">AIS LATENCY:</span>
                <span className="text-slate-200">&lt; 140ms (NavIC)</span>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Bottom Global Navigation & Compliance Footer */}
      <footer className="relative z-10 w-full border-t border-white/10 bg-[#090f15]/85 backdrop-blur-md px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-mono text-slate-400">
          <div className="flex items-center space-x-4">
            <span className="text-slate-200 font-medium">© 2025 SAMUDRA RAKSHAK // OCEAN GARMIN</span>
            <span className="text-slate-600">|</span>
            <span className="text-[#ffb780]">IMO SOLAS CHAPTER V & NAVAREA VIII COMPLIANT</span>
          </div>
          <div className="flex items-center space-x-6">
            <span className="text-slate-400">SIH 26057 Ministry of Earth Sciences</span>
            <span className="text-slate-600">|</span>
            <span className="text-[#22c55e]">System Health: {isOnline ? 'ONLINE (100%)' : 'STANDBY'}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
