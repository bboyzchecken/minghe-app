/**
 * POST /api/admin/orders/[id]/expiry — ตั้ง/ล้างวันหมดอายุของรายงาน
 * body: { days: number | null } — number = หมดอายุใน n วันนับจากวันนี้, null = ไม่หมดอายุ
 * admin เท่านั้น
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@minghe/db'
import { getSession } from '@/lib/auth'

const bodySchema = z.object({
  days: z.union([
    z.number().int('จำนวนวันต้องเป็นจำนวนเต็ม').min(1, 'จำนวนวันต้องมากกว่า 0').max(3650, 'จำนวนวันสูงสุด 3650 วัน'),
    z.null(),
  ]),
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

  const report = await prisma.report.findUnique({
    where: { orderId: id },
    select: { id: true },
  })
  if (!report) {
    return NextResponse.json({ error: 'ออเดอร์นี้ยังไม่มีรายงาน' }, { status: 404 })
  }

  const expiresAt =
    body.days === null ? null : new Date(Date.now() + body.days * 24 * 60 * 60 * 1000)

  await prisma.report.update({
    where: { id: report.id },
    data: { expiresAt },
  })

  return NextResponse.json({
    ok: true,
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
  })
}
