/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { 50:'#f0fdf4',100:'#dcfce7',200:'#bbf7d0',300:'#86efac',400:'#4ade80',500:'#22c55e',600:'#16a34a',700:'#15803d',800:'#166534',900:'#14532d' },
        surface: { 950:'#09090B',900:'#0F1011',800:'#141416',700:'#1C1C1F',600:'#232326',500:'#2C2C30',400:'#38383D' },
      },
      fontFamily: {
        display: ['"Wix Madefor Display"', 'DM Sans', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'agrodesk': 'radial-gradient(ellipse at 20% 50%, #061a0c 0%, #020c07 60%, #041408 100%)',
      },
      boxShadow: {
        glass: '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
        brand: '0 0 20px rgba(34,197,94,0.18)',
        'brand-lg': '0 0 40px rgba(34,197,94,0.22)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'fade-up': 'fadeUp 0.35s ease-out',
        'tractor-float': 'tractor-float 4s ease-in-out infinite',
        'wheat-sway': 'wheat-sway 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
