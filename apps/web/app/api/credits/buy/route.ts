/**
 * POST /api/credits/buy — เติมเครดิตด้วยแพ็กรายงาน (REPORT_PACKS)
 *
 * MVP: mock payment สำเร็จเสมอ
 * จุดต่อ gateway จริง (Stripe/Omise):
 *   1. สร้าง checkout session / charge กับ gateway ที่นี่ แล้วตอบ URL ให้ client redirect
 *   2. ย้ายการบันทึก Payment + เพิ่มเครดิตไปทำใน webhook (เมื่อ gateway ยืนยัน 'paid')
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@minghe/db'
import { getSession } from '@/lib/auth'
import { packById } from '@/lib/pricing'

const buySchema = z.object({
  packId: z.string().min(1),
})

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json(
      { ok: false, error: 'โปรดเข้าสู่ระบบก่อนเติมเครดิต' },
      { status: 401 },
    )
  }

  const body = await req.json().catch(() => null)
  const parsed = buySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'ข้อมูลไม่ถูกต้อง' }, { status: 400 })
  }

  const pack = packById(parsed.data.packId)
  if (!pack) {
    return NextResponse.json({ ok: false, error: 'ไม่พบแพ็กรายงานที่เลือก' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } })
  if (!user) {
    return NextResponse.json({ ok: false, error: 'ไม่พบบัญชีผู้ใช้' }, { status: 401 })
  }

  // mock payment: ถือว่าชำระสำเร็จทันที — บันทึก Payment + เพิ่มเครดิตแบบ atomic
  await prisma.$transaction([
    prisma.payment.create({
      data: {
        userId: user.id,
        amount: pack.priceSatang,
        currency: 'THB',
        provider: 'mock',
        status: 'paid',
        meta: JSON.stringify({ kind: 'credit-pack', packId: pack.id, reports: pack.reports }),
      },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { credits: { increment: pack.reports } },
    }),
  ])

  return NextResponse.json({ ok: true, credits: pack.reports })
}
