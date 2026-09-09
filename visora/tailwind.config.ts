import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#0b1326',
        'canvas-deep': '#060e20',
        'surface-low': '#131b2e',
        surface: '#171f33',
        'surface-high': '#222a3d',
        'surface-highest': '#2d3449',
        primary: '#4cd7f6',
        'primary-container': '#06b6d4',
        'on-primary': '#003640',
        'on-primary-container': '#00424f',
        secondary: '#ddb7ff',
        'secondary-container': '#6f00be',
        tertiary: '#4edea3',
        'tertiary-container': '#1bbd85',
        error: '#ffb4ab',
        'error-container': '#93000a',
        outline: '#869397',
        'outline-variant': '#3d494c',
        'on-surface': '#dae2fd',
        'on-surface-variant': '#bcc9cd',
        'text-primary': '#dae2fd',
        'text-muted': '#bcc9cd',
        'inverse-surface': '#dae2fd',
        'inverse-on-surface': '#283044',
      },
      fontFamily: {
        heading: ['var(--font-heading)', 'sans-serif'],
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        sm: '0.125rem',
        md: '0.375rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        '2xl': '32px',
        '3xl': '48px',
      },
      boxShadow: {
        laser: '0 0 16px -4px rgba(76, 215, 246, 0.35)',
        'laser-strong': '0 0 28px -2px rgba(34, 211, 238, 0.55)',
        violet: '0 0 16px -4px rgba(221, 183, 255, 0.35)',
        panel: '0 1px 0 rgba(255,255,255,0.04), 0 8px 24px rgba(0,0,0,0.35)',
        reticle: 'inset 0 0 0 1px rgba(76, 215, 246, 0.45)',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 12px -2px rgba(76, 215, 246, 0.35)' },
          '50%': { boxShadow: '0 0 28px -2px rgba(76, 215, 246, 0.7)' },
        },
        'orb-float': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)', opacity: '0.55' },
          '50%': { transform: 'translate(12px, -18px) scale(1.12)', opacity: '0.85' },
        },
        'spin-slow': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.45' },
        },
      },
      animation: {
        'glow-pulse': 'glow-pulse 2.4s ease-in-out infinite',
        'orb-float': 'orb-float 8s ease-in-out infinite',
        'spin-slow': 'spin-slow 24s linear infinite',
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};

export default config;