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
