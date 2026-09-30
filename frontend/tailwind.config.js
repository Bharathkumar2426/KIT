/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ocean: {
          950: '#030712',
          900: '#06101e',
          850: '#0a172c',
          800: '#0e223f',
          700: '#14345e',
          600: '#1d4b85',
        },
        sonar: {
          cyan: '#06b6d4',
          amber: '#f59e0b',
          emerald: '#10b981',
          rose: '#f43f5e',
        },
        "kesari": "#f38b2a",
        "kesari-bright": "#ff9233",
        "kesari-light": "#ff9838",
        "kesari-dim": "#b35b0d",
        "kesari-glow": "rgba(243,139,42,0.4)",
        "navy-darkest": "#070c14",
        "navy-dark": "#0b1320",
        "navy-panel": "#0e1a2b",
        "navy-surface": "#13233a",
        "navy-border": "rgba(43, 90, 150, 0.25)",
        "navy-border-bright": "rgba(43, 90, 150, 0.45)",
        "chalk-white": "#f0f4f8",
        "chalk-dim": "#cbd5e1",
        "on-surface": "#f0f4f8",
        "on-surface-variant": "#94a3b8",
        "tiranga-green": "#1ea857",
        "tiranga-green-dark": "#138808",
        "chakra-navy": "#0b1320",
        "chakra-navy-surface": "#0e1726",
        "navy-card": "#0a101d",
        "starlight": "#f1f5f9",
        "muted-slate": "#8b9bb4",
        "border-tactical": "rgba(43, 90, 150, 0.25)"
      },
      borderRadius: {
        "DEFAULT": "0.125rem",
        "lg": "0.25rem",
        "xl": "0.5rem",
        "full": "0.75rem"
      },
      spacing: {
        "space-lg": "1rem",
        "space-xxs": "0.125rem",
        "gutter-compact": "0.75rem",
        "space-xl": "1.5rem",
        "viewport-margin": "1.5rem",
        "space-md": "0.75rem",
        "gutter-standard": "1.25rem",
        "space-xs": "0.25rem",
        "panel-padding": "1rem",
        "space-sm": "0.5rem",
        "space-3xl": "3rem",
        "space-2xl": "2rem"
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['Space Grotesk', 'Inter', 'sans-serif'],
        "headline-xl-mobile": ["Space Grotesk"],
        "body-sm": ["JetBrains Mono"],
        "label-caps": ["JetBrains Mono"],
        "headline-lg-mobile": ["Space Grotesk"],
        "telemetry-lg": ["JetBrains Mono"],
        "headline-sm": ["Space Grotesk"],
        "body-lg": ["Space Grotesk"],
        "headline-lg": ["Space Grotesk"],
        "headline-md": ["Space Grotesk"],
        "body-md": ["Space Grotesk"],
        "telemetry-sm": ["JetBrains Mono"],
        "telemetry-md": ["JetBrains Mono"],
        "headline-xl": ["Space Grotesk"]
      },
      fontSize: {
        "headline-xl-mobile": ["30px", { "lineHeight": "36px", "letterSpacing": "-0.01em", "fontWeight": "700" }],
        "body-sm": ["12px", { "lineHeight": "18px", "fontWeight": "400" }],
        "label-caps": ["10px", { "lineHeight": "14px", "letterSpacing": "0.1em", "fontWeight": "700" }],
        "headline-lg-mobile": ["22px", { "lineHeight": "28px", "letterSpacing": "0em", "fontWeight": "600" }],
        "telemetry-lg": ["18px", { "lineHeight": "24px", "letterSpacing": "0.02em", "fontWeight": "600" }],
        "headline-sm": ["16px", { "lineHeight": "22px", "letterSpacing": "0.01em", "fontWeight": "600" }],
        "body-lg": ["16px", { "lineHeight": "24px", "fontWeight": "400" }],
        "headline-lg": ["28px", { "lineHeight": "36px", "letterSpacing": "-0.01em", "fontWeight": "600" }],
        "headline-md": ["20px", { "lineHeight": "28px", "letterSpacing": "0em", "fontWeight": "600" }],
        "body-md": ["14px", { "lineHeight": "20px", "fontWeight": "400" }],
        "telemetry-sm": ["11px", { "lineHeight": "16px", "letterSpacing": "0.05em", "fontWeight": "400" }],
        "telemetry-md": ["13px", { "lineHeight": "18px", "letterSpacing": "0.03em", "fontWeight": "500" }],
        "headline-xl": ["40px", { "lineHeight": "48px", "letterSpacing": "-0.02em", "fontWeight": "700" }]
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        }
      },
      animation: {
        marquee: 'marquee linear infinite',
      }
    },
  },
  plugins: [],
}
