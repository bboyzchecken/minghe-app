/**
 * ส่งต่อคำสั่งซื้อที่กำลังเปิดอยู่ระหว่างหน้า (wizard → /report, /r → /report, dashboard → /report)
 *
 * เก็บใน sessionStorage เพราะเป็นข้อมูลชั่วคราวของแท็บนั้น ไม่ใช่ที่เก็บถาวร
 * ที่เก็บจริงอยู่ที่ client (โหมด mock = localStorage, โหมด live = ฐานข้อมูลผ่าน API)
 */

import type { OrderRecord } from '@/lib/api/types'

const CURRENT_KEY = 'minghe:app:currentOrder'

export function saveCurrentOrder(order: OrderRecord) {
  try {
    sessionStorage.setItem(CURRENT_KEY, JSON.stringify(order))
  } catch {
    /* ignore */
  }
}

export function loadCurrentOrder(): OrderRecord | null {
  try {
    const raw = sessionStorage.getItem(CURRENT_KEY)
    return raw ? (JSON.parse(raw) as OrderRecord) : null
  } catch {
    return null
  }
}

export function clearCurrentOrder() {
  try {
    sessionStorage.removeItem(CURRENT_KEY)
  } catch {
    /* ignore */
  }
}

/* ── ร่างที่กรอกค้างไว้ใน wizard ────────────────────────────────────
 * ใช้ตอนพาผู้ใช้ไปหน้าล็อกอินกลางคัน (F-03) — กลับมาแล้วต้องได้ของเดิมครบ
 */

const DRAFT_PREFIX = 'minghe:app:draft:'

export function saveWizardDraft(key: string, data: unknown) {
  try {
    sessionStorage.setItem(DRAFT_PREFIX + key, JSON.stringify(data))
  } catch {
    /* ignore */
  }
}

export function loadWizardDraft<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_PREFIX + key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function clearWizardDraft(key: string) {
  try {
    sessionStorage.removeItem(DRAFT_PREFIX + key)
  } catch {
    /* ignore */
  }
}

export { generateAccessCode } from '@/lib/access-code'
