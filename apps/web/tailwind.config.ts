import type { Config } from 'tailwindcss'

// Design tokens ตาม Brand Guideline 命合 Mìnghé ข้อ 4.2
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#16182E', soft: '#2B2E4A' },
        cinnabar: { DEFAULT: '#C24A32', deep: '#9C3A27' },
        gold: { DEFAULT: '#C1A15C', soft: '#DCC48E' },
        jade: '#4F8073',
        paper: { DEFAULT: '#FAF6EE', warm: '#F3ECDD' },
        cloud: '#FFFFFF',
        muted: '#6E6E7C',
        line: '#E5DCC9',
        element: {
          wood: '#5C9A6F',
          fire: '#C24A32',
          earth: '#C89B4A',
          metal: '#9AA0AC',
          water: '#2E4372',
        },
      },
      fontFamily: {
        'display-th': ['var(--font-trirong)', 'serif'],
        'display-en': ['var(--font-cormorant)', 'serif'],
        'body-th': ['var(--font-sarabun)', 'sans-serif'],
        'body-en': ['var(--font-inter)', 'sans-serif'],
        cjk: ['var(--font-noto-serif-sc)', 'serif'],
        mono: ['var(--font-plex-mono)', 'monospace'],
      },
      borderRadius: {
        sm: '8px',
        md: '14px',
        lg: '20px',
      },
      boxShadow: {
        card: '0 4px 24px rgba(22,24,46,0.08)',
      },
    },
  },
  plugins: [],
}

export default config
