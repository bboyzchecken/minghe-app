/** ตัวช่วยทั่วไปของ apps/web */

/** รวม className แบบเบาๆ (แทน clsx) */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}

/** แสดงราคาเป็นบาท (รับสตางค์) */
export function formatBaht(satang: number): string {
  const baht = satang / 100
  return baht.toLocaleString('th-TH', { maximumFractionDigits: 0 }) + ' บาท'
}

/** วันที่ไทยอ่านง่าย */
export function formatThaiDate(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
}

export function formatThaiDateTime(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  return d.toLocaleString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** hash IP แบบทางเดียวสำหรับ audit log (ไม่เก็บ IP ดิบ — PDPA) */
export async function hashIp(ip: string): Promise<string> {
  const salt = process.env.AUTH_SECRET ?? 'minghe'
  const data = new TextEncoder().encode(`${salt}:${ip}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .slice(0, 12)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * ดึง IP ของผู้เรียกจาก headers อย่างปลอดภัยต่อการปลอมแปลง
 *
 * สำคัญ: ห้ามใช้ค่าซ้ายสุดของ x-forwarded-for เพราะไคลเอนต์แทรกเองได้
 * → หมุน XFF สุ่มทุกคำขอเพื่อรีเซ็ต rate limit ได้ (spoof)
 *
 * บน Vercel: x-real-ip = IP ผู้เชื่อมต่อจริงที่แพลตฟอร์มตั้งให้ (เชื่อถือได้)
 * และ proxy จะ "ต่อท้าย" IP จริงไว้ขวาสุดของ XFF → ใช้ค่าขวาสุดจึงปลอดภัยกว่า
 */
export function clientIpOf(headers: Headers): string {
  const realIp = headers.get('x-real-ip')?.trim()
  if (realIp) return realIp
  const xff = headers.get('x-forwarded-for')
  if (xff) {
    const parts = xff
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    // ค่าขวาสุด = entry ที่ proxy ที่เชื่อถือได้ต่อท้าย (ไม่ใช่ค่าที่ไคลเอนต์แทรก)
    const rightmost = parts[parts.length - 1]
    if (rightmost) return rightmost
  }
  return 'unknown'
}

/** ป้ายสถานะออเดอร์ภาษาไทย */
export const ORDER_STATUS_TH: Record<string, string> = {
  pending: 'รอชำระเงิน',
  processing: 'กำลังวิเคราะห์',
  completed: 'เสร็จสมบูรณ์',
  failed: 'ไม่สำเร็จ',
}
