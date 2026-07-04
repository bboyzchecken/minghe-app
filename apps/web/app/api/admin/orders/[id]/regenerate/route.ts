/**
 * POST /api/admin/orders/[id]/regenerate — สร้างรายงานใหม่ทับของเดิม (admin เท่านั้น)
 * ใช้เมื่อออเดอร์มีรายงานอยู่แล้ว — รหัสเปิดรายงานเดิมคงอยู่
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { regenerateReport } from '@/lib/orders'

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await getSession()
  if (session?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'สำหรับผู้ดูแลระบบเท่านั้น' }, { status: 403 })
  }

  const { id } = await context.params

  try {
    const result = await regenerateReport(id)
    return NextResponse.json({ ok: true, accessCode: result.accessCode })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'สร้างรายงานใหม่ไม่สำเร็จ โปรดลองอีกครั้ง'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
