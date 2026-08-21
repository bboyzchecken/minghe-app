import type { Metadata } from 'next'
import { Cormorant_Garamond, Inter, Noto_Serif_SC, Sacramento, Sarabun, Trirong } from 'next/font/google'
import './globals.css'
import { ModeBanner } from '@/components/mode-banner'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { SessionProvider } from '@/lib/session'

const trirong = Trirong({
  subsets: ['thai', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-trirong',
  display: 'swap',
})
const sarabun = Sarabun({
  subsets: ['thai', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sarabun',
  display: 'swap',
})
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-cormorant',
  display: 'swap',
})
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const sacramento = Sacramento({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-script',
  display: 'swap',
})
const notoSerifSC = Noto_Serif_SC({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-noto-serif-sc',
  display: 'swap',
  preload: false,
})

export const metadata: Metadata = {
  metadataBase: new URL('https://minghe.example'),
  title: {
    default: '命合 Mìnghé — สมพงษ์คนกับองค์กร',
    template: '%s · 命合 Mìnghé',
  },
  description:
    'แพลตฟอร์มวิเคราะห์ความสมพงษ์ระหว่างคนกับองค์กรด้วยศาสตร์ปาจือ (八字) แม่นยำระดับซินแสตัวจริง — สำหรับองค์กรที่มองหาคนที่ใช่ และคนทำงานที่มองหาที่ที่ใช่',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body
        className={`${trirong.variable} ${sarabun.variable} ${cormorant.variable} ${inter.variable} ${sacramento.variable} ${notoSerifSC.variable} min-h-screen bg-paper font-body-th text-ink antialiased texture-paper`}
      >
        <SessionProvider>
          <ModeBanner />
          <SiteHeader />
          <main>{children}</main>
          <SiteFooter />
        </SessionProvider>
      </body>
    </html>
  )
}
