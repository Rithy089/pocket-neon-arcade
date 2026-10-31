/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        neon: {
          pink: '#ff007f',
          cyan: '#00f0ff',
          green: '#39ff14',
          yellow: '#ffe600',
          purple: '#bc13fe',
          orange: '#ff5e00',
          red: '#ff073a'
        },
        arcade: {
          dark: '#070814',
          panel: '#0e1024',
          bezel: '#161938',
          accent: '#1e224f',
        }
      },
      fontFamily: {
        mono: ['"Courier New"', 'Courier', 'monospace'],
        display: ['"Press Start 2P"', 'system-ui', 'monospace'],
      },
      boxShadow: {
        'neon-cyan': '0 0 10px #00f0ff, 0 0 20px #00f0ff40',
        'neon-pink': '0 0 10px #ff007f, 0 0 20px #ff007f40',
        'neon-green': '0 0 10px #39ff14, 0 0 20px #39ff1440',
        'neon-yellow': '0 0 10px #ffe600, 0 0 20px #ffe60040',
        'neon-purple': '0 0 10px #bc13fe, 0 0 20px #bc13fe40',
        'cabinet': 'inset 0 0 40px rgba(0, 0, 0, 0.9), 0 20px 50px rgba(0, 0, 0, 0.9)',
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'flicker': 'flicker 0.15s infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '1', filter: 'drop-shadow(0 0 12px currentColor)' },
          '50%': { opacity: '0.8', filter: 'drop-shadow(0 0 4px currentColor)' },
        },
        flicker: {
          '0%': { opacity: '0.97' },
          '50%': { opacity: '1' },
          '100%': { opacity: '0.98' },
        }
      }
    },
  },
  plugins: [],
}
