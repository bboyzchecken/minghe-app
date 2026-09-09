import type { Metadata } from 'next'
import { Cormorant_Garamond, Inter, Sarabun, Trirong } from 'next/font/google'
import localFont from 'next/font/local'
import './globals.css'
import { ModeBanner } from '@/components/mode-banner'
import { Providers } from '@/components/providers'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { AccessCodeCapture } from '@/components/access-code-capture'
import { Analytics } from '@/components/analytics'
import { CookieConsent } from '@/components/cookie-consent'

/**
 * ฟอนต์ — เลือกเฉพาะน้ำหนักที่ใช้จริงในโค้ด (เช็กด้วย `font-medium` / `font-semibold` / `<b>`)
 * ทุกน้ำหนักที่ประกาศเกินมาคือไฟล์ woff2 ที่เบราว์เซอร์อาจดาวน์โหลดโดยเปล่าประโยชน์
 * และ CSS ที่บล็อกการเรนเดอร์ยาวขึ้น
 */
const trirong = Trirong({
  subsets: ['thai', 'latin'],
  // หัวข้อใช้แค่ปกติ / medium / semibold — ไม่มี font-light หรือ font-bold ที่ไหน
  weight: ['400', '500', '600'],
  variable: '--font-trirong',
  display: 'swap',
})
const sarabun = Sarabun({
  subsets: ['thai', 'latin'],
  // 700 ยังต้องมี เพราะ <b> / <strong> ในเนื้อความใช้ตัวหนาของเบราว์เซอร์
  weight: ['400', '500', '600', '700'],
  variable: '--font-sarabun',
  display: 'swap',
})
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-cormorant',
  display: 'swap',
})
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })

/**
 * ตัวจีน — ใช้ Noto Serif SC ฉบับ subset ที่โฮสต์เอง (ดู tools/brand/subset-cjk-font.py)
 *
 * ถ้าดึงจาก next/font/google ตรง ๆ Google จะส่ง @font-face มา 300+ ก้อน
 * (แบ่ง unicode-range ทั้งชุดตัวจีน) กลายเป็น CSS ~279 KB ที่บล็อกการเรนเดอร์ทุกหน้า
 * ทั้งที่เว็บนี้ใช้ตัวจีนจริงแค่ ~230 ตัว — subset แล้วเหลือไฟล์เดียว ~44 KB
 * ที่โหลดต่อเมื่อมีตัวจีนบนหน้าเท่านั้น
 *
 * fallback ไล่ไปฟอนต์จีนของระบบ เผื่อมีตัวที่ไม่ได้อยู่ใน subset โผล่มาจาก API
 * (เบราว์เซอร์เลือก fallback เป็นรายตัวอักษร จึงไม่ขึ้นเป็นสี่เหลี่ยมเปล่า)
 */
const notoSerifSC = localFont({
  src: './fonts/noto-serif-sc-subset-400.woff2',
  weight: '400',
  style: 'normal',
  variable: '--font-noto-serif-sc',
  display: 'swap',
  preload: false,
  fallback: ['Songti SC', 'Noto Serif CJK SC', 'SimSun', 'serif'],
})

export const metadata: Metadata = {
  metadataBase: new URL('https://minghe.work'),
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
        className={`${trirong.variable} ${sarabun.variable} ${cormorant.variable} ${inter.variable} ${notoSerifSC.variable} min-h-screen bg-paper font-body-th text-ink antialiased texture-paper`}
      >
        <Providers>
          <ModeBanner />
          {/* รับรหัสเข้าใช้จากลิงก์ ?code= ตั้งแต่หน้าแรก (รอบ UAT) */}
          <AccessCodeCapture />
          <SiteHeader />
          <main>{children}</main>
          <SiteFooter />
          {/* GA4 โหลดต่อเมื่อยินยอมแล้วเท่านั้น — ดู lib/analytics.ts */}
          <CookieConsent />
          <Analytics />
        </Providers>
      </body>
    </html>
  )
}
