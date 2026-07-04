/**
 * POST /api/auth/login — เข้าสู่ระบบด้วยอีเมล + รหัสผ่าน
 * rate limit ต่อ IP → ตรวจ credential → สร้าง session cookie
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createSession, verifyCredentials } from '@/lib/auth'
import { LIMITS, rateLimit } from '@/lib/rate-limit'
import { clientIpOf, hashIp } from '@/lib/utils'

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
})

export async function POST(req: NextRequest) {
  const ipHash = await hashIp(clientIpOf(req.headers))
  const rl = rateLimit(`login:${ipHash}`, LIMITS.login.limit, LIMITS.login.windowMs)
  if (!rl.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: `พยายามเข้าสู่ระบบบ่อยเกินไป โปรดลองใหม่ในอีก ${rl.retryAfterSeconds} วินาที`,
      },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } },
    )
  }

  const body = await req.json().catch(() => null)
  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'โปรดกรอกอีเมลและรหัสผ่านให้ครบถ้วน' },
      { status: 400 },
    )
  }

  const user = await verifyCredentials(parsed.data.email, parsed.data.password)
  if (!user) {
    // ข้อความกลางๆ — ไม่บอกว่าอีเมลหรือรหัสผ่านที่ผิด (กัน enumeration)
    return NextResponse.json(
      { ok: false, error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' },
      { status: 401 },
    )
  }

  await createSession(user)
  return NextResponse.json({
    ok: true,
    redirect: user.role === 'ADMIN' ? '/admin' : '/dashboard',
  })
}
