/**
 * POST /api/admin/orders/[id]/process — ประมวลผลออเดอร์ที่ชำระแล้วแต่ยังไม่มีรายงาน
 * (สถานะ pending/failed ที่มี payment = paid) — admin เท่านั้น
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@minghe/db'
import { getSession } from '@/lib/auth'
import { processOrder } from '@/lib/orders'

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await getSession()
  if (session?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'สำหรับผู้ดูแลระบบเท่านั้น' }, { status: 403 })
  }

  const { id } = await context.params

  const order = await prisma.order.findUnique({
    where: { id },
    include: { report: { select: { id: true } }, payment: { select: { status: true } } },
  })
  if (!order) {
    return NextResponse.json({ error: 'ไม่พบออเดอร์' }, { status: 404 })
  }
  if (order.report) {
    return NextResponse.json(
      { error: 'ออเดอร์นี้มีรายงานแล้ว — ใช้ "สร้างรายงานใหม่" แทน' },
      { status: 400 },
    )
  }
  if (order.payment?.status !== 'paid') {
    return NextResponse.json({ error: 'ออเดอร์ยังไม่ได้ชำระเงิน — ประมวลผลไม่ได้' }, { status: 400 })
  }

  try {
    const result = await processOrder(id)
    return NextResponse.json({ ok: true, accessCode: result.accessCode })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'ประมวลผลไม่สำเร็จ โปรดลองอีกครั้ง'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
