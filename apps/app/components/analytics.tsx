'use client'

import Script from 'next/script'
import { useEffect, useState } from 'react'
import { CONSENT_CHANGED, readAnalyticsConsent } from '@/lib/analytics'
import { GA_ID } from '@/lib/env'

/**
 * Google Analytics 4 — โหลดต่อเมื่อผู้ใช้กดยินยอมแล้วเท่านั้น
 *
 * ไม่มี GA_ID (เช่น โหมด dev, UAT, หรือ preview build) = ไม่เรนเดอร์อะไรเลย
 * จึงไม่ต้องมี flag แยกสำหรับปิดสถิติในสภาพแวดล้อมที่ไม่อยากให้ปนข้อมูล
 *
 * ตั้ง Consent Mode ไว้ด้วยแม้จะโหลดหลังยินยอมแล้ว เพื่อประกาศให้ชัดว่า
 * อนุญาตเฉพาะส่วนสถิติ ไม่อนุญาตส่วนโฆษณาและการสร้างโปรไฟล์เพื่อโฆษณา
 */
export function Analytics() {
  const [granted, setGranted] = useState(false)

  useEffect(() => {
    const sync = () => setGranted(readAnalyticsConsent() === 'granted')
    sync()
    window.addEventListener(CONSENT_CHANGED, sync)
    return () => window.removeEventListener(CONSENT_CHANGED, sync)
  }, [])

  if (!GA_ID || !granted) return null

  return (
    <>
      {/* ต้องมาก่อน gtag.js — คำสั่งทั้งหมดเข้าคิวใน dataLayer ลำดับการโหลดไฟล์จึงไม่สำคัญ */}
      <Script id="ga-consent" strategy="afterInteractive">
        {`
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('consent', 'default', {
  analytics_storage: 'granted',
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied'
});
gtag('js', new Date());
gtag('config', '${GA_ID}');
        `}
      </Script>
      <Script
        id="ga-loader"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
    </>
  )
}
