/**
 * ตรรกะออเดอร์กลาง: สร้างออเดอร์ → ชำระ (mock/credits) → ประมวลผล → ออกรหัสเปิด
 * (แยกจาก route handlers เพื่อให้เรียกซ้ำได้จาก admin re-generate)
 */

import 'server-only'
import {
  parseOrgData,
  parseSubjectData,
  prisma,
  serializeOrgData,
  serializeSubjectData,
  type OrgData,
  type SubjectData,
} from '@minghe/db'
import { generateReport } from '@minghe/report'
import { generateAccessCode, hashPin } from './access-code'
import { orderTotalSatang } from './pricing'

export interface CreateOrderInput {
  subject: SubjectData
  org: OrgData
  addonIds: string[]
  /** base64 data URL ของรูปถ่าย (ถ้ามี) */
  photoDataUrl?: string
  /** ผู้สร้าง (null = guest) */
  userId?: string
  guestEmail?: string
  /** สมาชิกจ่ายด้วยเครดิต */
  useCredit?: boolean
  /** PIN เสริมสำหรับรายงาน (optional) */
  pin?: string
}

export async function createOrder(input: CreateOrderInput): Promise<{ orderId: string }> {
  if (!input.subject.consentConfirmed) {
    throw new Error('ต้องยืนยันความยินยอม (consent) ของเจ้าของข้อมูลก่อนสร้างออเดอร์ — PDPA')
  }

  const priceSatang = orderTotalSatang({
    useCredit: Boolean(input.useCredit),
    addonIds: input.addonIds,
  })

  const order = await prisma.order.create({
    data: {
      createdById: input.userId ?? null,
      guestEmail: input.guestEmail ?? null,
      status: 'pending',
      subjectData: serializeSubjectData(input.subject),
      orgData: serializeOrgData(input.org),
      addons: JSON.stringify(input.addonIds),
      priceSatang,
    },
  })

  if (input.photoDataUrl) {
    await prisma.asset.create({
      data: { orderId: order.id, url: input.photoDataUrl, type: 'photo' },
    })
  }

  return { orderId: order.id }
}

/**
 * ชำระเงิน (MVP: mock provider หรือหักเครดิตสมาชิก)
 * โครงพร้อมสลับเป็น Stripe/Omise: เปลี่ยนที่ฟังก์ชันนี้จุดเดียว
 */
export async function payOrder(
  orderId: string,
  method: 'mock' | 'credits',
  userId?: string,
): Promise<void> {
  const order = await prisma.order.findUnique({ where: { id: orderId } })
  if (!order) throw new Error('ไม่พบออเดอร์')

  if (method === 'credits' && (!userId || order.createdById !== userId)) {
    throw new Error('ต้องเป็นเจ้าของออเดอร์')
  }

  // ล็อกการชำระด้วยการเปลี่ยนสถานะแบบมีเงื่อนไข (atomic) — ผู้ชนะเพียงรายเดียว
  // กันดับเบิลชำระจากการกดซ้ำ/คำขอขนาน (เดิมอิง findUnique+เช็ค ซึ่ง race ได้)
  const claimed = await prisma.order.updateMany({
    where: { id: orderId, status: 'pending' },
    data: { status: 'processing' },
  })
  if (claimed.count === 0) throw new Error('ออเดอร์นี้ชำระแล้วหรือกำลังประมวลผล')

  try {
    if (method === 'credits') {
      // หักเครดิตแบบ atomic — กันเครดิตติดลบ
      const updated = await prisma.user.updateMany({
        where: { id: userId!, credits: { gte: 1 } },
        data: { credits: { decrement: 1 } },
      })
      if (updated.count === 0) throw new Error('เครดิตไม่พอ — โปรดเติมแพ็กรายงานก่อน')
    }

    await prisma.payment.create({
      data: {
        orderId: order.id,
        userId: userId ?? null,
        // ชำระด้วยเครดิต: เครดิตหักค่ารายงาน แต่ค่าบริการเสริม (addon) ยังต้องเก็บจริง
        // จึงบันทึก amount = order.priceSatang (ซึ่ง = ค่า addon เมื่อ useCredit) ไม่ใช่ 0
        amount: order.priceSatang,
        provider: method,
        status: 'paid',
      },
    })
  } catch (error) {
    // ชำระไม่สำเร็จ → คืนสถานะเป็น pending เพื่อให้ลองใหม่ได้ (ไม่ค้างที่ processing)
    await prisma.order.updateMany({
      where: { id: orderId, status: 'processing' },
      data: { status: 'pending' },
    })
    throw error
  }
}

export interface ProcessResult {
  accessCode: string
  reportId: string
}

/** ประมวลผลออเดอร์: เครื่องคำนวณ + (AI ถ้าเปิด) → บันทึกรายงาน + รหัสเปิด */
export async function processOrder(orderId: string, options?: { pin?: string }): Promise<ProcessResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { assets: true, report: true, payment: true },
  })
  if (!order) throw new Error('ไม่พบออเดอร์')
  if (order.report) return { accessCode: order.report.accessCode, reportId: order.report.id }
  if (!order.payment || order.payment.status !== 'paid') {
    throw new Error('ออเดอร์ยังไม่ได้ชำระเงิน')
  }

  await prisma.order.update({ where: { id: orderId }, data: { status: 'processing' } })

  try {
    const subject = parseSubjectData(order.subjectData)
    const org = parseOrgData(order.orgData)

    // รูปถ่าย (ถ้ามี) — เก็บเป็น data URL ใน Asset
    let photo: { base64: string; mediaType: 'image/jpeg' | 'image/png' | 'image/webp' } | undefined
    const photoAsset = order.assets.find((a) => a.type === 'photo')
    if (photoAsset?.url.startsWith('data:')) {
      const match = photoAsset.url.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/)
      if (match) {
        photo = {
          mediaType: match[1] as 'image/jpeg' | 'image/png' | 'image/webp',
          base64: match[2]!,
        }
      }
    }

    const reportData = await generateReport({
      subject,
      org,
      photo,
      targetYear: new Date().getFullYear(),
    })

    // ออกรหัสเปิดแบบ unique (โอกาสชนต่ำมาก แต่กันไว้)
    let accessCode = generateAccessCode()
    for (let attempt = 0; attempt < 3; attempt++) {
      const exists = await prisma.report.findUnique({ where: { accessCode } })
      if (!exists) break
      accessCode = generateAccessCode()
    }

    const report = await prisma.report.create({
      data: {
        orderId: order.id,
        accessCode,
        pinHash: options?.pin ? await hashPin(options.pin) : null,
        reportData: JSON.stringify(reportData),
        status: 'ready',
      },
    })

    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'completed', completedAt: new Date() },
    })

    return { accessCode, reportId: report.id }
  } catch (error) {
    // คืนเครดิตถ้าชำระด้วยเครดิตแล้วประมวลผลล้มเหลว — ผู้ใช้ต้องไม่เสียเครดิตฟรี
    if (order.payment?.provider === 'credits' && order.createdById) {
      await prisma.user.update({
        where: { id: order.createdById },
        data: { credits: { increment: 1 } },
      })
      // ทำเครื่องหมาย payment ว่าคืนแล้ว กันคืนซ้ำหากมีการเรียกประมวลผลใหม่
      await prisma.payment.update({
        where: { id: order.payment.id },
        data: { status: 'refunded' },
      })
    }
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'failed',
        errorNote: error instanceof Error ? error.message : String(error),
      },
    })
    throw error
  }
}

/** admin: สร้างรายงานใหม่ทับของเดิม (แก้ข้อมูลผิด/อัปเดต engine) — รหัสเปิดเดิมคงอยู่ */
export async function regenerateReport(orderId: string): Promise<ProcessResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { assets: true, report: true },
  })
  if (!order?.report) throw new Error('ออเดอร์นี้ยังไม่มีรายงาน — ใช้ processOrder แทน')

  const subject = parseSubjectData(order.subjectData)
  const org = parseOrgData(order.orgData)

  let photo: { base64: string; mediaType: 'image/jpeg' | 'image/png' | 'image/webp' } | undefined
  const photoAsset = order.assets.find((a) => a.type === 'photo')
  if (photoAsset?.url.startsWith('data:')) {
    const match = photoAsset.url.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/)
    if (match) {
      photo = {
        mediaType: match[1] as 'image/jpeg' | 'image/png' | 'image/webp',
        base64: match[2]!,
      }
    }
  }

  const reportData = await generateReport({
    subject,
    org,
    photo,
    targetYear: new Date().getFullYear(),
  })

  await prisma.report.update({
    where: { id: order.report.id },
    data: { reportData: JSON.stringify(reportData), status: 'ready' },
  })

  return { accessCode: order.report.accessCode, reportId: order.report.id }
}
