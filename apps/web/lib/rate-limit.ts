/**
 * Rate limiter แบบ sliding window ในหน่วยความจำ
 *
 * เหมาะกับ dev / เซิร์ฟเวอร์ instance เดียว
 * Production บน Vercel (หลาย instance) แนะนำเปลี่ยนเป็น Upstash Redis
 * (@upstash/ratelimit) — interface ตรงกัน เปลี่ยนที่ไฟล์นี้ไฟล์เดียว
 */

const buckets = new Map<string, number[]>()
let lastSweep = 0

function sweep(now: number, windowMs: number) {
  // กวาดคีย์เก่าทุกๆ 5 นาที กันหน่วยความจำโต
  if (now - lastSweep < 5 * 60 * 1000) return
  lastSweep = now
  for (const [key, hits] of buckets) {
    const alive = hits.filter((t) => now - t < windowMs)
    if (alive.length === 0) buckets.delete(key)
    else buckets.set(key, alive)
  }
}

export interface RateLimitResult {
  ok: boolean
  remaining: number
  retryAfterSeconds: number
}

/**
 * @param key ตัวระบุ เช่น `report-open:<ipHash>`
 * @param limit จำนวนครั้งสูงสุดในหน้าต่างเวลา
 * @param windowMs หน้าต่างเวลา (ms)
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  sweep(now, windowMs)
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs)
  if (hits.length >= limit) {
    const oldest = hits[0] ?? now
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((oldest + windowMs - now) / 1000),
    }
  }
  hits.push(now)
  buckets.set(key, hits)
  return { ok: true, remaining: limit - hits.length, retryAfterSeconds: 0 }
}

/** ค่าที่ใช้ร่วมกันทั้งระบบ */
export const LIMITS = {
  /** เปิดรายงานด้วยรหัส: 10 ครั้ง/นาที/IP (กัน brute force) */
  reportOpen: { limit: 10, windowMs: 60_000 },
  /** ลอง PIN: 5 ครั้ง/5 นาที/IP+code */
  pinAttempt: { limit: 5, windowMs: 5 * 60_000 },
  /** ล็อกอิน: 10 ครั้ง/5 นาที/IP */
  login: { limit: 10, windowMs: 5 * 60_000 },
  /** สมัครสมาชิก: 5 ครั้ง/ชั่วโมง/IP */
  register: { limit: 5, windowMs: 60 * 60_000 },
  /** สร้างออเดอร์ guest: 5 ครั้ง/ชั่วโมง/IP */
  guestOrder: { limit: 5, windowMs: 60 * 60_000 },
} as const
