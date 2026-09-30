import React from 'react';

export default function BottomNav({ activeNav = 'overview', onSelectNav }) {
  const navItems = [
    { id: 'overview', label: 'OVERVIEW', icon: 'radar', target: '#top' },
    { id: 'live-telemetry', label: 'SONAR FEED', icon: 'stream', target: '#workbench' },
    { id: 'detections', label: 'DETECTIONS', icon: 'troubleshoot', target: '#how-it-works' },
    { id: 'missions', label: 'SURVEYS', icon: 'explore', target: '#missions' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 w-full z-50 pb-safe bg-surface-container-lowest/95 backdrop-blur-xl border-t border-outline-variant/30 shadow-[0_-1px_12px_rgba(0,0,0,0.6)]">
      <div className="flex justify-around items-center h-16 px-space-xs">
        {navItems.map((item) => {
          const isActive = activeNav === item.id;
          return (
            <a
              key={item.id}
              href={item.target}
              onClick={() => onSelectNav && onSelectNav(item.id)}
              className={`flex flex-col items-center justify-center gap-1 min-w-[56px] min-h-[44px] transition-colors ${
                isActive ? 'text-secondary' : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              <span className={`material-symbols-outlined text-[22px] ${isActive ? 'text-secondary animate-pulse' : ''}`}>
                {item.icon}
              </span>
              <span className="font-label-badge text-[9px] tracking-wider font-semibold">
                {item.label}
              </span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
