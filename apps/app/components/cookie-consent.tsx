'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  CONSENT_CHANGED,
  OPEN_COOKIE_SETTINGS,
  clearAnalyticsCookies,
  readAnalyticsConsent,
  saveAnalyticsConsent,
  type AnalyticsConsent,
} from '@/lib/analytics'
import { GA_ID } from '@/lib/env'

/**
 * แบนเนอร์ขอความยินยอมคุกกี้สถิติ (PDPA)
 *
 * ขึ้นครั้งแรกเมื่อยังไม่เคยตอบ และเรียกกลับมาได้ตลอดจากลิงก์ "ตั้งค่าคุกกี้" ท้ายหน้า
 * — สิทธิถอนความยินยอมต้องใช้ง่ายพอ ๆ กับตอนให้ความยินยอม
 *
 * ไม่มีปุ่มกากบาทปิดเฉย ๆ โดยตั้งใจ: ปิดโดยไม่เลือกจะกลายเป็นการนิ่งแล้วตีความว่ายินยอม
 * ซึ่งใช้ไม่ได้ตามกฎหมาย ผู้ใช้ต้องกดอย่างใดอย่างหนึ่ง
 *
 * ไม่มี GA_ID = ไม่มีคุกกี้สถิติให้ขอ จึงไม่แสดงอะไรเลย
 */
export function CookieConsent() {
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState<AnalyticsConsent | null>(null)

  useEffect(() => {
    if (!GA_ID) return
    const saved = readAnalyticsConsent()
    setCurrent(saved)
    if (saved === null) setOpen(true)

    // กวาดคุกกี้ตกค้างทุกครั้งที่โหลดหน้าในสถานะไม่ยินยอม
    // จำเป็นเพราะตอนกดถอนความยินยอม GA ที่ยังทำงานอยู่เขียนคุกกี้เซสชันกลับมาได้
    // ทันหลังจากเราลบไปแล้วแต่ก่อนหน้าจะรีโหลด — รอบนี้ GA ไม่ถูกโหลดแล้วจึงลบขาด
    if (saved === 'denied') clearAnalyticsCookies()

    const reopen = () => {
      setCurrent(readAnalyticsConsent())
      setOpen(true)
    }
    window.addEventListener(OPEN_COOKIE_SETTINGS, reopen)
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS, reopen)
  }, [])

  if (!GA_ID || !open) return null

  const decide = (value: AnalyticsConsent) => {
    const wasGranted = current === 'granted'
    saveAnalyticsConsent(value)
    setCurrent(value)
    setOpen(false)

    if (value === 'granted') {
      window.dispatchEvent(new Event(CONSENT_CHANGED))
      return
    }

    clearAnalyticsCookies()
    // GA ที่โหลดไปแล้วถอนออกจากหน้าไม่ได้ — ต้องรีโหลดถึงจะหยุดส่งข้อมูลจริง
    if (wasGranted) window.location.reload()
  }

  return (
    <div className="no-print fixed inset-x-0 bottom-0 z-50 border-t border-line bg-paper/95 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur">
      <section
        aria-label="การตั้งค่าคุกกี้"
        className="container-page flex flex-col gap-4 py-5 md:flex-row md:items-center md:justify-between"
      >
        <div className="max-w-2xl text-sm leading-relaxed text-ink-soft">
          <div className="mb-1 font-medium text-ink">ขออนุญาตเก็บสถิติการใช้งาน</div>
          <p>
            เว็บไซต์ใช้คุกกี้ที่จำเป็นต่อการเข้าสู่ระบบอยู่แล้วโดยไม่ต้องขอความยินยอม
            นอกจากนั้นเราอยากเก็บสถิติว่าหน้าไหนมีคนอ่านมากน้อยแค่ไหน ผ่าน Google Analytics
            เพื่อนำมาปรับปรุงเว็บไซต์ — <strong className="font-medium text-ink">หากท่านไม่ยินยอม เราจะไม่โหลดสคริปต์ของ Google เลย</strong>{' '}
            อ่านรายละเอียดได้ที่{' '}
            <Link
              href="/legal/cookies"
              className="font-medium text-gold underline underline-offset-2 hover:text-gold/80"
            >
              นโยบายคุกกี้
            </Link>
          </p>
        </div>
        <div className="flex flex-none gap-3">
          <button type="button" className="btn-ghost" onClick={() => decide('denied')}>
            ไม่ยินยอม
          </button>
          <button type="button" className="btn-primary" onClick={() => decide('granted')}>
            ยินยอม
          </button>
        </div>
      </section>
    </div>
  )
}
