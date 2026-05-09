import type { Config } from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'var(--border-default)',
        background: 'var(--bg-app)',
        foreground: 'var(--text-body)',
        primary: {
          DEFAULT: 'var(--action-primary)',
          foreground: 'var(--action-primary-text)',
        },
      },
      borderRadius: {
        control: '7px',
        card: '12px',
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
    require('@tailwindcss/forms')({ strategy: 'class' }),
  ],
} satisfies Config;
