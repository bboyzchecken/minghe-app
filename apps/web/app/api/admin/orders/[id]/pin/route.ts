/**
 * POST /api/admin/orders/[id]/pin — ตั้ง/ล้าง PIN เสริมของรายงาน
 * body: { pin: string | null } — string = ตั้ง PIN ใหม่ (เก็บเป็น hash), null = ล้าง PIN
 * admin เท่านั้น
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@minghe/db'
import { hashPin } from '@/lib/access-code'
import { getSession } from '@/lib/auth'

const bodySchema = z.object({
  pin: z.union([
    z.string().regex(/^[0-9]{4,8}$/, 'PIN ต้องเป็นตัวเลข 4-8 หลัก'),
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

  await prisma.report.update({
    where: { id: report.id },
    data: { pinHash: body.pin === null ? null : await hashPin(body.pin) },
  })

  return NextResponse.json({ ok: true, hasPin: body.pin !== null })
}
