/**
 * POST /api/orders — สร้างออเดอร์รายงานความเหมาะสม 命合
 *
 * ขั้นตอน: validate ทั้งก้อนด้วย zod → ตรวจ session/guest → rate limit (เฉพาะ guest)
 * → createOrder (lib/orders) → ตอบ { orderId }
 *
 * หมายเหตุเรื่อง PIN: รับมาเพื่อ "ตรวจรูปแบบล่วงหน้า" เท่านั้น — ไม่บันทึกลงออเดอร์
 * (schema Order ไม่มีที่เก็บ PIN และไม่ควรเก็บ plaintext) ตัวจริง client ส่งอีกครั้ง
 * ตอน POST /api/orders/[id]/pay แล้ว hash เก็บที่ Report.pinHash ใน processOrder
 */

import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { INDUSTRIES } from '@minghe/core'
import type { OrgData, SubjectData } from '@minghe/db'
import { getSession } from '@/lib/auth'
import { createOrder } from '@/lib/orders'
import { grantOrderAccess } from '@/lib/order-access'
import { ADDONS } from '@/lib/pricing'
import { LIMITS, rateLimit } from '@/lib/rate-limit'
import { clientIpOf, hashIp } from '@/lib/utils'

/** วันที่ ค.ศ. รูปแบบ YYYY-MM-DD ในช่วงที่สมเหตุสมผล */
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'รูปแบบวันที่ต้องเป็น YYYY-MM-DD')
  .refine((v) => {
    const year = Number(v.slice(0, 4))
    return year >= 1900 && year <= 2100 && !Number.isNaN(new Date(`${v}T00:00:00`).getTime())
  }, 'วันที่ไม่ถูกต้อง')

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'รูปแบบเวลาต้องเป็น HH:mm')

const teamMemberSchema = z.object({
  name: z.string().trim().min(1, 'สมาชิกทีมต้องมีชื่อ').max(120),
  birthDate: dateSchema,
  birthTime: timeSchema.optional(),
  province: z.string().max(100).optional(),
})

const teamSchema = z.array(teamMemberSchema).max(5, 'เพิ่มสมาชิกทีมได้สูงสุด 5 คน').optional()

const subjectSchema = z.object({
  name: z.string().trim().min(1, 'กรุณาระบุชื่อผู้ถูกวิเคราะห์').max(120),
  gender: z.enum(['male', 'female']).optional(),
  birthDate: dateSchema,
  birthTime: timeSchema,
  province: z.string().max(100).optional(),
  // PDPA: ต้องเป็น true เท่านั้น — ไม่มีความยินยอม ไม่มีออเดอร์
  consentConfirmed: z.literal(true, {
    errorMap: () => ({
      message: 'ต้องยืนยันความยินยอมของเจ้าของข้อมูล (PDPA) ก่อนสั่งทำรายงาน',
    }),
  }),
})

/** ฝ่ายองค์กร 3 โหมดตามแผน: ดวงผู้บริหาร / วันก่อตั้งบริษัท / ธาตุอุตสาหกรรม */
const orgSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('executive'),
    executiveName: z.string().trim().max(120).optional(),
    birthDate: dateSchema,
    birthTime: timeSchema,
    province: z.string().max(100).optional(),
    team: teamSchema,
  }),
  z.object({
    mode: z.literal('company-date'),
    companyName: z.string().trim().max(200).optional(),
    foundingDate: dateSchema,
    team: teamSchema,
  }),
  z.object({
    mode: z.literal('industry'),
    industryId: z
      .string()
      .refine((id) => INDUSTRIES.some((i) => i.id === id), 'ไม่พบสายอุตสาหกรรมที่เลือก'),
    companyName: z.string().trim().max(200).optional(),
    team: teamSchema,
  }),
])

/** data URL ของรูปถ่าย — ไฟล์จริง ≤1.5MB → base64 ≈ 2MB จึงจำกัด ~2.2MB */
const photoSchema = z
  .string()
  .max(2_300_000, 'รูปถ่ายใหญ่เกินไป (จำกัดไฟล์ ~1.5MB)')
  .regex(
    /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/,
    'รองรับเฉพาะรูป JPEG, PNG หรือ WebP (data URL แบบ base64)',
  )

const bodySchema = z.object({
  subject: subjectSchema,
  org: orgSchema,
  addonIds: z
    .array(z.string())
    .max(ADDONS.length, 'บริการเสริมเกินจำนวนที่มี')
    .refine((ids) => new Set(ids).size === ids.length, 'บริการเสริมซ้ำกัน')
    .refine((ids) => ids.every((id) => ADDONS.some((a) => a.id === id)), 'มีบริการเสริมที่ไม่รู้จัก')
    .default([]),
  photoDataUrl: photoSchema.optional(),
  /** ตรวจรูปแบบล่วงหน้าเท่านั้น — ดูหมายเหตุด้านบน */
  pin: z.string().regex(/^\d{4,6}$/, 'PIN ต้องเป็นตัวเลข 4-6 หลัก').optional(),
  guestEmail: z.string().trim().toLowerCase().email('รูปแบบอีเมลไม่ถูกต้อง').max(200).optional(),
  useCredit: z.boolean().optional(),
})

export async function POST(request: NextRequest) {
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

  const session = await getSession()

  if (!session) {
    // guest checkout: ต้องมีอีเมลติดต่อ + ใช้เครดิตไม่ได้ + จำกัดจำนวนต่อ IP
    if (!body.guestEmail) {
      return NextResponse.json(
        { error: 'กรุณาระบุอีเมลติดต่อสำหรับการสั่งซื้อแบบไม่มีบัญชี' },
        { status: 400 },
      )
    }
    if (body.useCredit) {
      return NextResponse.json(
        { error: 'ต้องเข้าสู่ระบบก่อนจึงจะใช้เครดิตสมาชิกได้' },
        { status: 401 },
      )
    }
    const ipHash = await hashIp(clientIpOf(request.headers))
    const rl = rateLimit(
      `guest-order:${ipHash}`,
      LIMITS.guestOrder.limit,
      LIMITS.guestOrder.windowMs,
    )
    if (!rl.ok) {
      return NextResponse.json(
        {
          error: `สั่งแบบไม่มีบัญชีได้สูงสุด ${LIMITS.guestOrder.limit} ออเดอร์ต่อชั่วโมง — โปรดลองใหม่ในอีกประมาณ ${Math.max(1, Math.ceil(rl.retryAfterSeconds / 60))} นาที หรือสมัครสมาชิกเพื่อสั่งได้ไม่จำกัด`,
        },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } },
      )
    }
  }

  // โครงจาก zod ตรงกับ SubjectData / OrgData ของ @minghe/db แบบ type-safe
  const subject: SubjectData = body.subject
  const org: OrgData = body.org

  try {
    const { orderId } = await createOrder({
      subject,
      org,
      addonIds: body.addonIds,
      photoDataUrl: body.photoDataUrl,
      userId: session?.userId,
      guestEmail: session ? undefined : body.guestEmail,
      useCredit: session ? Boolean(body.useCredit) : false,
    })
    // ผูกตั๋วความเป็นเจ้าของออเดอร์ (httpOnly cookie) — ปิด IDOR ตอนชำระ/ดูสถานะ
    await grantOrderAccess(orderId)
    return NextResponse.json({ orderId }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'สร้างออเดอร์ไม่สำเร็จ โปรดลองใหม่' },
      { status: 500 },
    )
  }
}
