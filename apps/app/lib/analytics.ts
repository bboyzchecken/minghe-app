/**
 * ความยินยอมให้เก็บสถิติการใช้งาน (Google Analytics 4)
 *
 * หลักที่ยึด: **ก่อนผู้ใช้กดยินยอม เว็บต้องไม่ยิงอะไรออกไปหา Google เลย**
 * ไม่ใช่แค่ตั้ง Consent Mode เป็น denied แล้วโหลดสคริปต์ไว้ก่อน — แบบนั้นยังส่ง ping
 * ที่มีเลข IP ออกไปอยู่ดี ซึ่งตีความตาม PDPA ได้ว่าเป็นการเก็บข้อมูลก่อนได้รับความยินยอม
 * `components/analytics.tsx` จึงไม่เรนเดอร์ <Script> เลยจนกว่าค่าที่นี่จะเป็น 'granted'
 *
 * ทางเลือกที่ยินยอมแล้วเก็บไว้ใน localStorage ของเบราว์เซอร์เครื่องนั้น ไม่ส่งขึ้นเซิร์ฟเวอร์
 * (เอกสารที่เปิดเผยเรื่องนี้: apps/app/lib/legal/cookies.ts ข้อ 2 และ 3)
 */

export type AnalyticsConsent = 'granted' | 'denied'

const STORAGE_KEY = 'minghe.consent.analytics'

/** แบนเนอร์ตั้งค่าคุกกี้ถูกสั่งให้เปิด (ลิงก์ "ตั้งค่าคุกกี้" ท้ายหน้า) */
export const OPEN_COOKIE_SETTINGS = 'minghe:cookie-settings'

/** ผู้ใช้เพิ่งเลือกใหม่ — `<Analytics>` ฟังเพื่อโหลดสคริปต์ทันทีโดยไม่ต้องรีเฟรช */
export const CONSENT_CHANGED = 'minghe:consent-changed'

export function readAnalyticsConsent(): AnalyticsConsent | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    return value === 'granted' || value === 'denied' ? value : null
  } catch {
    // โหมดไม่ระบุตัวตนบางเบราว์เซอร์ห้ามแตะ storage — ถือว่ายังไม่เคยตอบ
    return null
  }
}

export function saveAnalyticsConsent(value: AnalyticsConsent) {
  try {
    window.localStorage.setItem(STORAGE_KEY, value)
  } catch {
    // เขียนไม่ได้ก็ไม่เป็นไร — รอบหน้าจะถามใหม่ ดีกว่าถือว่ายินยอมทั้งที่บันทึกไม่ลง
  }
}

export function openCookieSettings() {
  window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS))
}

/**
 * ลบคุกกี้ที่ GA4 ตั้งไว้เมื่อผู้ใช้ถอนความยินยอม
 *
 * GA4 ตั้ง `_ga` และ `_ga_<รหัสพร็อพเพอร์ตี้>` อายุ 2 ปี ทั้งคู่ตั้งที่โดเมนหลัก
 * จึงต้องลบทั้งแบบมีจุดนำหน้าและไม่มี ไม่งั้นลบไม่ออกในบางเบราว์เซอร์
 */
export function clearAnalyticsCookies() {
  try {
    const host = window.location.hostname
    const apex = host.split('.').slice(-2).join('.')
    const domains = ['', `; domain=${host}`, `; domain=.${host}`, `; domain=.${apex}`]

    for (const entry of document.cookie.split(';')) {
      const name = entry.split('=')[0]?.trim()
      if (!name || !/^_ga/.test(name)) continue
      for (const domain of domains) {
        document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT${domain}`
      }
    }
  } catch {
    // ลบไม่ได้ก็ยังถือว่าถอนความยินยอมสำเร็จ — สคริปต์จะไม่ถูกโหลดอีกหลังรีโหลดหน้า
  }
}
