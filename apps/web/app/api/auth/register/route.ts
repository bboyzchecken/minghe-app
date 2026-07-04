/**
 * POST /api/auth/register — สมัครสมาชิกใหม่ (role CLIENT)
 * rate limit ต่อ IP → เช็คอีเมลซ้ำ → สร้างบัญชี + session
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@minghe/db'
import { createSession, hashPassword } from '@/lib/auth'
import { LIMITS, rateLimit } from '@/lib/rate-limit'
import { clientIpOf, hashIp } from '@/lib/utils'

const registerSchema = z.object({
  name: z.string().trim().min(1, 'โปรดกรอกชื่อ').max(120),
  email: z.string().trim().email('รูปแบบอีเมลไม่ถูกต้อง'),
  // bcrypt รองรับสูงสุด 72 ไบต์ — จำกัดไว้กันเงียบๆ ตัดท้าย
  password: z.string().min(8, 'รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร').max(72),
})

export async function POST(req: NextRequest) {
  const ipHash = await hashIp(clientIpOf(req.headers))
  const rl = rateLimit(`register:${ipHash}`, LIMITS.register.limit, LIMITS.register.windowMs)
  if (!rl.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: `สมัครสมาชิกบ่อยเกินไป โปรดลองใหม่ในอีก ${rl.retryAfterSeconds} วินาที`,
      },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } },
    )
  }

  const body = await req.json().catch(() => null)
  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message
    return NextResponse.json(
      {
        ok: false,
        error: firstIssue ?? 'ข้อมูลไม่ครบถ้วน — โปรดกรอกชื่อ อีเมล และรหัสผ่านอย่างน้อย 8 ตัวอักษร',
      },
      { status: 400 },
    )
  }

  const email = parsed.data.email.toLowerCase()
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json(
      { ok: false, error: 'อีเมลนี้มีบัญชีอยู่แล้ว — โปรดเข้าสู่ระบบแทน' },
      { status: 409 },
    )
  }

  const user = await prisma.user.create({
    data: {
      email,
      name: parsed.data.name,
      passwordHash: await hashPassword(parsed.data.password),
      role: 'CLIENT',
    },
  })

  await createSession(user)
  return NextResponse.json({ ok: true, redirect: '/dashboard' })
}
