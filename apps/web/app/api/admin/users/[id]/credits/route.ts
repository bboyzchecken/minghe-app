/**
 * POST /api/admin/users/[id]/credits — ปรับเครดิตผู้ใช้ (+/-)
 * body: { delta: number } — บวก = เติมเครดิต, ลบ = หักเครดิต (ห้ามติดลบ)
 * admin เท่านั้น
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@minghe/db'
import { getSession } from '@/lib/auth'

const bodySchema = z.object({
  delta: z
    .number()
    .int('จำนวนเครดิตต้องเป็นจำนวนเต็ม')
    .min(-1000, 'ปรับได้ครั้งละไม่เกิน 1,000 เครดิต')
    .max(1000, 'ปรับได้ครั้งละไม่เกิน 1,000 เครดิต')
    .refine((n) => n !== 0, 'จำนวนเครดิตต้องไม่เป็นศูนย์'),
})

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await getSession()
  if (session?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'สำหรับผู้ดูแลระบบเท่านั้น' }, { status: 403 })
  }

  const { id } = await context.params

  let body: z.infer<typeof bodySchema>
  try {
    body = bodySchema.parse(await req.json())
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? (error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง')
        : 'ข้อมูลไม่ถูกต้อง'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id }, select: { id: true } })
  if (!user) {
    return NextResponse.json({ error: 'ไม่พบผู้ใช้' }, { status: 404 })
  }

  // หักเครดิตแบบ atomic — กันเครดิตติดลบ
  const updated = await prisma.user.updateMany({
    where: body.delta < 0 ? { id, credits: { gte: -body.delta } } : { id },
    data: { credits: { increment: body.delta } },
  })
  if (updated.count === 0) {
    return NextResponse.json(
      { error: 'เครดิตคงเหลือไม่พอสำหรับการหักจำนวนนี้' },
      { status: 400 },
    )
  }

  const refreshed = await prisma.user.findUnique({ where: { id }, select: { credits: true } })
  return NextResponse.json({ ok: true, credits: refreshed?.credits ?? 0 })
}
