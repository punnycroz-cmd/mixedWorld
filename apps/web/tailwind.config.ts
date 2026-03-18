import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        heading: ["var(--font-outfit)", "sans-serif"],
      },
      colors: {
        background: "#030712",
        surface: "rgba(255, 255, 255, 0.03)",
        "surface-hover": "rgba(255, 255, 255, 0.05)",
        "surface-border": "rgba(255, 255, 255, 0.08)",
        "surface-glow": "rgba(168, 85, 247, 0.15)",
        primary: {
          500: "#8b5cf6",
          600: "#7c3aed",
          glow: "rgba(139, 92, 246, 0.5)",
        },
        accent: {
          cyan: "#22d3ee",
          pink: "#f472b6",
        }
      },
      animation: {
        'blob': 'blob 15s infinite alternate ease-in-out',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        blob: {
          '0%': { transform: 'translate3d(0, 0, 0) scale(1)' },
          '33%': { transform: 'translate3d(30px, -50px, 0) scale(1.1)' },
          '66%': { transform: 'translate3d(-20px, 20px, 0) scale(0.9)' },
          '100%': { transform: 'translate3d(0, 0, 0) scale(1)' },
        }
      }
    }
  },
  plugins: []
};

export default config;
