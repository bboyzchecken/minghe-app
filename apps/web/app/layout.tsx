import type { Metadata } from 'next'
import {
  Cormorant_Garamond,
  IBM_Plex_Mono,
  Inter,
  Noto_Serif_SC,
  Sarabun,
  Trirong,
} from 'next/font/google'
import './globals.css'

const trirong = Trirong({
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-trirong',
  display: 'swap',
})

const sarabun = Sarabun({
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sarabun',
  display: 'swap',
})

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-cormorant',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const notoSerifSC = Noto_Serif_SC({
  subsets: ['latin'],
  weight: ['500', '700'],
  variable: '--font-noto-serif-sc',
  display: 'swap',
  preload: false,
})

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
  display: 'swap',
  preload: false,
})

export const metadata: Metadata = {
  title: {
    default: '命合 Mìnghé — เมื่อ "คนที่ใช่" เจอ "ที่ที่ใช่"',
    template: '%s · 命合 Mìnghé',
  },
  description:
    'แพลตฟอร์มวิเคราะห์ความเหมาะสมของพนักงานกับองค์กรด้วยปาจือ (八字) และโหงวเฮ้ง แม่นยำระดับซินแสตัวจริง — รายงานมืออาชีพ ส่งด้วยรหัสเปิดที่ปลอดภัย',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body
        className={`${trirong.variable} ${sarabun.variable} ${cormorant.variable} ${inter.variable} ${notoSerifSC.variable} ${plexMono.variable} bg-paper font-body-th text-ink antialiased`}
      >
        {children}
      </body>
    </html>
  )
}
