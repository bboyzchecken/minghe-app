/**
 * POST /api/reports/open — ตรวจ PIN ของรายงาน แล้วออก cookie เปิดดู (อายุ 1 ชั่วโมง)
 *
 * ความปลอดภัย (แผนหัวข้อ 7):
 * - rate limit ต่อ IP+รหัส (LIMITS.pinAttempt) นับทุกครั้งที่ลอง
 * - ข้อความผิดพลาดเป็นแบบรวม ไม่แยกแยะว่ารหัสไม่มีจริง/ถูกเพิกถอน/PIN ผิด (กัน enumeration)
 * - cookie เป็น JWT (jose + AUTH_SECRET) sub = report.id, httpOnly, sameSite lax
 */

import { NextRequest, NextResponse } from 'next/server'
import { SignJWT } from 'jose'
import { z } from 'zod'
import { prisma } from '@minghe/db'
import { isValidAccessCodeFormat, normalizeAccessCode, verifyPin } from '@/lib/access-code'
import { LIMITS, rateLimit } from '@/lib/rate-limit'
import { clientIpOf, hashIp } from '@/lib/utils'

const openSchema = z.object({
  code: z.string().trim().min(1).max(40),
  pin: z.string().min(1).max(32),
})

function authSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET
  if (!secret || secret.length < 16) {
    throw new Error('AUTH_SECRET ไม่ได้ตั้งค่า (ต้องยาวอย่างน้อย 16 ตัวอักษร) — ดู .env.example')
  }
  return new TextEncoder().encode(secret)
}

/** คำตอบกลางๆ — ไม่บอกใบ้ว่ารหัสผิด รายงานถูกเพิกถอน หรือ PIN ไม่ตรง */
function unauthorized() {
  return NextResponse.json(
    { ok: false, error: 'รหัสเปิดรายงานหรือ PIN ไม่ถูกต้อง' },
    { status: 401 },
  )
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = openSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'โปรดกรอกรหัสเปิดรายงานและ PIN ให้ครบถ้วน' },
      { status: 400 },
    )
  }

  const code = normalizeAccessCode(parsed.data.code)
  const ipHash = await hashIp(clientIpOf(req.headers))

  // นับ rate limit ทุกความพยายาม (รวมถึงรหัส format ผิด) — กัน brute force PIN
  const rl = rateLimit(`pin:${ipHash}:${code}`, LIMITS.pinAttempt.limit, LIMITS.pinAttempt.windowMs)
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: 'พยายามบ่อยเกินไป โปรดรอสักครู่แล้วลองใหม่' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } },
    )
  }

  if (!isValidAccessCodeFormat(code)) return unauthorized()

  const report = await prisma.report.findUnique({ where: { accessCode: code } })
  if (!report || report.revoked || (report.expiresAt && report.expiresAt < new Date())) {
    return unauthorized()
  }

  if (report.pinHash) {
    const pinOk = await verifyPin(parsed.data.pin, report.pinHash)
    if (!pinOk) return unauthorized()
  }

  // PIN ถูกต้อง (หรือรายงานไม่ล็อก PIN) → ออกตั๋วเปิดดูอายุ 1 ชั่วโมง
  const token = await new SignJWT({ scope: 'report-view' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(report.id)
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(authSecret())

  const res = NextResponse.json({ ok: true })
  res.cookies.set(`mh_rv_${report.id}`, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 3600,
  })
  return res
}
