/**
 * ส่งต่อผลจาก wizard → หน้ารายงาน ผ่าน sessionStorage (prototype, ไม่มี backend)
 */

import type { GenerateReportInput } from '@minghe/report/types'

export interface PriceLine {
  label: string
  amount: number
}

export interface StoredOrder {
  product: 'employer' | 'jobseeker'
  input: GenerateReportInput
  priceLines: PriceLine[]
  total: number
  accessCode: string
  pin?: string
  createdAt: string
  express?: boolean
}

const KEY = 'minghe:proto:order'

export function saveOrder(order: StoredOrder) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(order))
  } catch {
    /* ignore */
  }
}

export function loadOrder(): StoredOrder | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as StoredOrder) : null
  } catch {
    return null
  }
}

export function clearOrder() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

/* ── เปิดรายงานด้วยรหัส (returning customer, mock) ─────────────────── */
const OPENED_KEY = 'minghe:proto:openedCode'

export function saveOpenedCode(code: string) {
  try {
    sessionStorage.setItem(OPENED_KEY, code)
  } catch {
    /* ignore */
  }
}

export function loadOpenedCode(): string | null {
  try {
    return sessionStorage.getItem(OPENED_KEY)
  } catch {
    return null
  }
}

/** รหัสเปิดรูปแบบ PJX-XXXX-XXXX (ตามสเปกเดิม §7) */
export function generateAccessCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const block = () =>
    Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('')
  return `PJX-${block()}-${block()}`
}
