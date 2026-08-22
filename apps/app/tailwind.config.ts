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
        /**
         * Workspace — โทน "ทำงาน/มืออาชีพ" สำหรับ dashboard/admin/profile ทุกฝั่ง
         * แยกจากโทนกระดาษสาของหน้าการตลาด: พื้นเทาอ่อนเย็น การ์ดขาว ตัวหนังสือน้ำเงินเข้ม
         * สีสถานะใช้ชุดเดียวกันทุกหน้า (success / warn / danger / info)
         */
        ws: {
          bg: '#F3F5F8',
          surface: '#FFFFFF',
          raised: '#F8FAFC',
          border: '#E2E8F0',
          'border-strong': '#CBD5E1',
          ink: '#0F172A',
          text: '#1E293B',
          soft: '#475569',
          muted: '#64748B',
          faint: '#94A3B8',
          accent: { DEFAULT: '#2563EB', soft: '#DBEAFE', deep: '#1D4ED8' },
          success: { DEFAULT: '#15803D', soft: '#DCFCE7' },
          warn: { DEFAULT: '#B45309', soft: '#FEF3C7' },
          danger: { DEFAULT: '#B91C1C', soft: '#FEE2E2' },
          info: { DEFAULT: '#0E7490', soft: '#CFFAFE' },
          violet: { DEFAULT: '#6D28D9', soft: '#EDE9FE' },
          sidebar: '#0F172A',
          'sidebar-hover': '#1E293B',
          'sidebar-text': '#CBD5E1',
        },
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
        ws: '0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.06)',
        'ws-lg': '0 10px 30px rgba(15,23,42,0.10)',
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
