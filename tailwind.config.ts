import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        syne: ['var(--font-syne)', 'sans-serif'],
        mono: ['var(--font-dm-mono)', 'monospace'],
        sans: ['var(--font-dm-sans)', 'sans-serif'],
      },
      colors: {
        bg: {
          DEFAULT: '#0a0a0b',
          2: '#111114',
          3: '#18181d',
          4: '#1f1f26',
        },
        line: {
          DEFAULT: 'rgba(255,255,255,0.07)',
          2: 'rgba(255,255,255,0.12)',
        },
        txt: {
          DEFAULT: '#f0eee8',
          2: '#9998a0',
          3: '#5c5b63',
        },
        accent: {
          gold: '#e8d97a',
          mint: '#6de0b3',
          coral: '#e87a7a',
          blue: '#7ab4e8',
        },
      },
      borderRadius: {
        sm: '6px',
        md: '12px',
        lg: '20px',
      },
      keyframes: {
        pulse: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.4' } },
        spin: { to: { transform: 'rotate(360deg)' } },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
      },
      animation: {
        pulse: 'pulse 1s ease-in-out infinite',
        spin: 'spin 1s linear infinite',
        fadeUp: 'fadeUp 0.3s ease forwards',
        shimmer: 'shimmer 1.5s infinite',
      },
    },
  },
  plugins: [],
}

export default config
