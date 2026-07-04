/**
 * POST /api/admin/orders/[id]/revoke — สลับสถานะเพิกถอนรายงาน (revoked)
 * เพิกถอนแล้วรหัสเปิดรายงานจะใช้ไม่ได้จนกว่าจะคืนสิทธิ์ — admin เท่านั้น
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@minghe/db'
import { getSession } from '@/lib/auth'

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await getSession()
  if (session?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'สำหรับผู้ดูแลระบบเท่านั้น' }, { status: 403 })
  }

  const { id } = await context.params

  const report = await prisma.report.findUnique({
    where: { orderId: id },
    select: { id: true, revoked: true },
  })
  if (!report) {
    return NextResponse.json({ error: 'ออเดอร์นี้ยังไม่มีรายงาน' }, { status: 404 })
  }

  const updated = await prisma.report.update({
    where: { id: report.id },
    data: { revoked: !report.revoked },
    select: { revoked: true },
  })

  return NextResponse.json({ ok: true, revoked: updated.revoked })
}
