import type { Config } from 'tailwindcss'

/**
 * 命合 Mìnghé — Prototype brand (ทิศทาง "โทนอุ่นสว่าง / Modern Chinese")
 * อ้างอิงจาก mockup ที่อาจารย์เมส่งมา: พื้นครีมอุ่น โลโก้ทองอมโอ๊ก
 * และไอคอนห้าธาตุ (น้ำ=หยดฟ้าหม่น / ไม้=โคลเวอร์เขียวมะกอก / ไฟ=เปลวอิฐ /
 * ทอง=ดาวสี่แฉกโอ๊ก / ดิน=สี่กลีบดินเผา)
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: { DEFAULT: '#ECE7DA', warm: '#E4DDCC' },
        card: '#F6F3EB',
        cloud: '#FCFAF4',
        ink: { DEFAULT: '#3D3930', soft: '#5C574C' },
        muted: '#8B8375',
        line: '#DCD4C2',
        gold: { DEFAULT: '#B07D2B', soft: '#CBA85C', deep: '#8F6420' },
        terracotta: { DEFAULT: '#B25C3C', deep: '#984A2E' },
        jade: '#7B8B57',
        element: {
          wood: '#7B8B57',
          fire: '#9E3B2A',
          earth: '#B65E3E',
          metal: '#BE8A2E',
          water: '#5E9BB5',
        },
      },
      fontFamily: {
        'display-th': ['var(--font-trirong)', 'serif'],
        'display-en': ['var(--font-cormorant)', 'serif'],
        script: ['var(--font-script)', 'cursive'],
        'body-th': ['var(--font-sarabun)', 'sans-serif'],
        'body-en': ['var(--font-inter)', 'sans-serif'],
        cjk: ['var(--font-noto-serif-sc)', 'serif'],
      },
      borderRadius: {
        sm: '10px',
        md: '16px',
        lg: '24px',
        xl: '32px',
      },
      boxShadow: {
        card: '0 6px 30px rgba(61,57,48,0.07)',
        soft: '0 2px 12px rgba(61,57,48,0.05)',
        lift: '0 14px 44px rgba(61,57,48,0.12)',
      },
      maxWidth: {
        content: '1120px',
      },
    },
  },
  plugins: [],
}

export default config
