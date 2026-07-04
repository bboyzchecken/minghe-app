/**
 * รหัสเปิดรายงาน (Access Code) — ตามแผนหัวข้อ 7
 * รูปแบบ: MH-XXXX-XXXX (base32 ตัด I/L/O/U/0/1 กันอ่านสับสน)
 * entropy: 30^8 ≈ 6.5 × 10^11 — เดาสุ่มไม่ได้จริงเมื่อคู่กับ rate limit
 */

import { randomBytes } from 'crypto'
import bcrypt from 'bcryptjs'

const ALPHABET = 'ABCDEFGHJKMNPQRSTVWXYZ23456789' // 30 ตัว
const PREFIX = 'MH'

export function generateAccessCode(): string {
  const bytes = randomBytes(8)
  let out = ''
  for (let i = 0; i < 8; i++) {
    out += ALPHABET[bytes[i]! % ALPHABET.length]
  }
  return `${PREFIX}-${out.slice(0, 4)}-${out.slice(4)}`
}

/** ปรับรูปแบบรหัสที่ผู้ใช้พิมพ์: ตัดช่องว่าง, ตัวพิมพ์ใหญ่, เติมขีดให้ถูกตำแหน่ง */
export function normalizeAccessCode(input: string): string {
  const raw = input.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (raw.length !== 10) return input.trim().toUpperCase()
  return `${raw.slice(0, 2)}-${raw.slice(2, 6)}-${raw.slice(6)}`
}

export function isValidAccessCodeFormat(code: string): boolean {
  return /^[A-Z]{2}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)
}

/** ---- PIN เสริม (optional) ---- */

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 10)
}

export async function verifyPin(pin: string, pinHash: string): Promise<boolean> {
  return bcrypt.compare(pin, pinHash)
}
