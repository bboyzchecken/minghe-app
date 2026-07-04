/**
 * POST /api/orders/[id]/pay — ชำระเงิน + ประมวลผลออเดอร์ในคำขอเดียว (MVP)
 *
 * body: { method: 'mock' | 'credits', pin?: '4-6 หลัก' }
 * ตอบ: { accessCode } — รหัสเปิดรายงาน MH-XXXX-XXXX
 *
 * จุดต่อ payment gateway จริง (Stripe/Omise):
 *   1) แยกขั้น "ชำระ" ออก — สร้าง checkout session ของ gateway แล้วตอบ redirect URL
 *   2) ยืนยันผลผ่าน webhook (เช่น /api/webhooks/stripe) → payOrder → processOrder
 *   3) method 'mock' ในไฟล์นี้คงไว้สำหรับ dev/ทดสอบเท่านั้น
 *
 * เรื่อง PIN: ไม่ได้เก็บในตาราง Order (ไม่มีคอลัมน์ + ไม่ควรเก็บ plaintext)
 * client เก็บไว้ใน state ของ wizard แล้วส่งมากับคำขอนี้ → processOrder จะ hash
 * เก็บที่ Report.pinHash ทันทีที่ออกรายงาน
 */

import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@minghe/db'
import { getSession } from '@/lib/auth'
import { payOrder, processOrder } from '@/lib/orders'
import { hasOrderAccess } from '@/lib/order-access'
import { LIMITS, rateLimit } from '@/lib/rate-limit'
import { clientIpOf, hashIp } from '@/lib/utils'

const bodySchema = z.object({
  method: z.enum(['mock', 'credits'], {
    errorMap: () => ({ message: 'ช่องทางชำระต้องเป็น mock หรือ credits' }),
  }),
  pin: z.string().regex(/^\d{4,6}$/, 'PIN ต้องเป็นตัวเลข 4-6 หลัก').optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: 'รูปแบบคำขอไม่ถูกต้อง (ต้องเป็น JSON)' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' },
      { status: 400 },
    )
  }
  const body = parsed.data

  // rate limit ต่อ IP — กันยิงชำระ/บรรจุออเดอร์รัวๆ
  const rl = rateLimit(
    `order-pay:${await hashIp(clientIpOf(request.headers))}`,
    LIMITS.guestOrder.limit,
    LIMITS.guestOrder.windowMs,
  )
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'พยายามบ่อยเกินไป โปรดรอสักครู่แล้วลองใหม่' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } },
    )
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: { report: true },
  })
  if (!order) {
    return NextResponse.json({ error: 'ไม่พบออเดอร์' }, { status: 404 })
  }

  const session = await getSession()

  // สิทธิ์ (ปิด IDOR):
  // - ออเดอร์สมาชิก (createdById != null) → ต้องเป็นเจ้าของ session
  // - ออเดอร์ guest (createdById == null) → ต้องถือตั๋วความเป็นเจ้าของ (httpOnly cookie ที่ออกตอนสร้าง)
  //   id ที่เดายากอย่างเดียวไม่พอ เพราะอาจรั่วผ่าน Referer/history/log
  const ownsOrder = order.createdById
    ? order.createdById === session?.userId
    : await hasOrderAccess(order.id)
  if (!ownsOrder) {
    return NextResponse.json({ error: 'คุณไม่มีสิทธิ์เข้าถึงออเดอร์นี้' }, { status: 403 })
  }

  // idempotent: ถ้าออกรายงานแล้ว ตอบรหัสเดิม (กันกดซ้ำ/network retry)
  if (order.report) {
    return NextResponse.json({ accessCode: order.report.accessCode })
  }

  // ชำระด้วยเครดิต: ต้องมี session (payOrder ตรวจความเป็นเจ้าของ + หักเครดิตแบบ atomic อีกชั้น)
  if (body.method === 'credits' && !session) {
    return NextResponse.json(
      { error: 'ต้องเข้าสู่ระบบก่อนจึงจะชำระด้วยเครดิตสมาชิกได้' },
      { status: 401 },
    )
  }

  // 1) ชำระเงิน — MVP: mock สำเร็จทันที / credits หักจากบัญชีสมาชิก
  if (order.status === 'pending') {
    try {
      await payOrder(id, body.method, session?.userId)
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'การชำระเงินไม่สำเร็จ' },
        { status: 400 },
      )
    }
  }

  // 2) ประมวลผล: ตั้งผังปาจือ → ดัชนีสมพงษ์ → บันทึกรายงาน + ออกรหัสเปิด
  //    (ถ้าออเดอร์เคย failed แต่ชำระแล้ว การเรียกซ้ำ = ลองประมวลผลใหม่)
  try {
    const result = await processOrder(id, body.pin ? { pin: body.pin } : undefined)
    return NextResponse.json({ accessCode: result.accessCode })
  } catch (error) {
    // processOrder ตั้งสถานะออเดอร์เป็น failed + errorNote ให้แล้ว
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'การประมวลผลไม่สำเร็จ — ทีมงานจะตรวจสอบออเดอร์ของคุณ',
      },
      { status: 500 },
    )
  }
}
