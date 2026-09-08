/** รหัสเปิดรายงานรูปแบบ PJX-XXXX-XXXX (ตามสเปกเดิม §7) */
export function generateAccessCode(): string {
  // ตัดอักษรที่สับสน (I, O, 0, 1) ออก เพราะผู้ใช้ต้องพิมพ์เองจากอีเมลหรือกระดาษ
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const block = () =>
    Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('')
  return `PJX-${block()}-${block()}`
}

/** จัดรูปแบบขณะพิมพ์: pjxk7qm3pla → PJX-K7QM-3PLA */
export function formatAccessCode(value: string): string {
  const raw = value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 11)
  if (raw.length <= 3) return raw
  if (raw.length <= 7) return `${raw.slice(0, 3)}-${raw.slice(3)}`
  return `${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7)}`
}


/* ══════════════════════════════════════════════════════════
   รหัสเข้าใช้รอบ UAT (access code)

   ⚠️ คนละเรื่องกับ PJX ข้างบน
   - PJX-XXXX-XXXX = รหัสเปิด "รายงานหนึ่งฉบับ" ออกให้หลังสั่งซื้อ
   - รหัส UAT      = รหัสประจำตัว "ผู้ทดสอบหนึ่งคน" เช่น G1S1-2026-07
                     ใช้เป็นด่านปลดล็อกแทนการชำระเงิน และผูกกับทุก event
                     เพื่อย้อนดูว่าใครเดินถึงไหน

   เก็บใน localStorage ตั้งแต่วินาทีแรกที่รับรหัสมา (ลิงก์ ?code= หรือหน้า /access)
   ══════════════════════════════════════════════════════════ */

const UAT_CODE_KEY = 'minghe:uat-code'

/** ทำให้รหัสเทียบกันได้ไม่ว่าพิมพ์มาแบบไหน — ตรงกับฝั่ง Go */
export function normalizeUatCode(value: string): string {
  return value.trim().toUpperCase()
}

/** รูปแบบที่ยอมรับ: ตัวอักษร ตัวเลข และขีด อย่างน้อย 4 ตัว */
export function looksLikeUatCode(value: string): boolean {
  return /^[A-Z0-9][A-Z0-9-]{2,62}[A-Z0-9]$/.test(normalizeUatCode(value))
}

export function readUatCode(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(UAT_CODE_KEY)
  } catch {
    return null
  }
}

export function saveUatCode(code: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(UAT_CODE_KEY, normalizeUatCode(code))
  } catch {
    /* โหมดส่วนตัวของเบราว์เซอร์เขียนไม่ได้ — ไม่ควรทำให้หน้าเว็บพัง */
  }
}

export function clearUatCode(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(UAT_CODE_KEY)
  } catch {
    /* เงียบไว้ด้วยเหตุผลเดียวกับ saveUatCode */
  }
}
