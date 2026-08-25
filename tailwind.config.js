/** @type {import('tailwindcss').Config} */

// Organic design system — tokens mirrored from
// _ds/organic-.../styles.css. Colours are exposed as CSS variables so a single
// `.dark` class on <html> re-points every role without duplicating utilities.
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        ink: 'var(--color-text)',
        muted: 'var(--color-muted)',
        divider: 'var(--color-divider)',
        accent: {
          DEFAULT: 'var(--color-accent)',
          text: 'var(--color-accent-text)',
          100: 'var(--color-accent-100)',
          200: 'var(--color-accent-200)',
          300: 'var(--color-accent-300)',
          400: 'var(--color-accent-400)',
          500: 'var(--color-accent-500)',
          600: 'var(--color-accent-600)',
          700: 'var(--color-accent-700)',
          800: 'var(--color-accent-800)',
          900: 'var(--color-accent-900)',
        },
        sage: {
          DEFAULT: 'var(--color-accent-2)',
          text: 'var(--color-accent-2-text)',
          100: 'var(--color-accent-2-100)',
          200: 'var(--color-accent-2-200)',
          300: 'var(--color-accent-2-300)',
          400: 'var(--color-accent-2-400)',
          500: 'var(--color-accent-2-500)',
          600: 'var(--color-accent-2-600)',
          700: 'var(--color-accent-2-700)',
          800: 'var(--color-accent-2-800)',
          900: 'var(--color-accent-2-900)',
        },
        neutral: {
          100: 'var(--color-neutral-100)',
          200: 'var(--color-neutral-200)',
          300: 'var(--color-neutral-300)',
          400: 'var(--color-neutral-400)',
          500: 'var(--color-neutral-500)',
          600: 'var(--color-neutral-600)',
          700: 'var(--color-neutral-700)',
          800: 'var(--color-neutral-800)',
          900: 'var(--color-neutral-900)',
        },
      },
      fontFamily: {
        heading: ['Caprasimo', 'Georgia', 'serif'],
        sans: ['Figtree', 'system-ui', 'sans-serif'],
      },
      // Type scale from the design board: mobile → desktop.
      fontSize: {
        kicker: ['0.6875rem', { lineHeight: '1.3', letterSpacing: '0.1em' }],
        small: ['0.8125rem', { lineHeight: '1.5' }],
        body: ['0.9375rem', { lineHeight: '1.55' }],
        'body-lg': ['1rem', { lineHeight: '1.6' }],
        lead: ['1.0625rem', { lineHeight: '1.5' }],
        'lead-lg': ['1.1875rem', { lineHeight: '1.5' }],
        h3: ['1.375rem', { lineHeight: '1.15', letterSpacing: '-0.015em' }],
        'h3-lg': ['1.5625rem', { lineHeight: '1.15', letterSpacing: '-0.015em' }],
        h2: ['1.75rem', { lineHeight: '1.12', letterSpacing: '-0.015em' }],
        'h2-lg': ['2rem', { lineHeight: '1.12', letterSpacing: '-0.015em' }],
        display: ['2.375rem', { lineHeight: '1.05', letterSpacing: '-0.02em' }],
        'display-lg': ['3.5rem', { lineHeight: '1.03', letterSpacing: '-0.02em' }],
        metric: ['1.75rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'metric-lg': ['2rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
      },
      // Organic's 1.10x density scale — never raw pixels.
      spacing: {
        1: '4.4px',
        2: '8.8px',
        3: '13.2px',
        4: '17.6px',
        6: '26.4px',
        8: '35.2px',
        12: '52.8px',
        16: '70.4px',
        24: '105.6px',
        32: '140.8px',
      },
      borderRadius: {
        sm: '8px',
        md: '16px',
        lg: '28px',
        pill: '999px',
      },
      maxWidth: {
        content: '1200px',
        prose: '66ch',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        slideInUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
      },
      animation: {
        'fade-up': 'fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both',
        'slide-in-right': 'slideInRight 0.32s cubic-bezier(0.22,1,0.36,1) both',
        'slide-in-up': 'slideInUp 0.32s cubic-bezier(0.22,1,0.36,1) both',
        'fade-in': 'fadeIn 0.2s ease-out both',
      },
    },
  },
  plugins: [],
}
