/**
 * GET /api/cron/purge-photos — ลบรูปถ่ายใบหน้า (ข้อมูลอ่อนไหว) ที่เกินอายุการเก็บ
 *
 * ทำตามคำมั่นในนโยบายความเป็นส่วนตัว (PDPA — data minimization / storage limitation):
 * "รูปถ่ายใบหน้าถูกลบภายใน 90 วันหลังส่งมอบรายงาน"
 *
 * รันอัตโนมัติผ่าน Vercel Cron (ดู vercel.json) — ป้องกันด้วย CRON_SECRET
 * รายงาน (reportData) ยังอยู่เพื่อให้ผู้ถือรหัสเปิดดูได้ แต่ "รูปดิบ" ถูกลบทิ้ง
 */

import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@minghe/db'

const RETENTION_DAYS = 90

export async function GET(request: NextRequest) {
  // ตรวจสิทธิ์: Vercel Cron แนบ Authorization: Bearer <CRON_SECRET>
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
  } else if (process.env.NODE_ENV === 'production') {
    // production ต้องตั้ง CRON_SECRET เสมอ — ไม่งั้นปฏิเสธ
    return NextResponse.json({ error: 'CRON_SECRET ไม่ได้ตั้งค่า' }, { status: 500 })
  }

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000)

  // ลบเฉพาะรูป (type='photo') ของออเดอร์ที่ส่งมอบรายงานเกิน 90 วันแล้ว
  const stale = await prisma.asset.findMany({
    where: {
      type: 'photo',
      order: { completedAt: { not: null, lt: cutoff } },
    },
    select: { id: true },
  })

  if (stale.length === 0) {
    return NextResponse.json({ purged: 0, cutoff: cutoff.toISOString() })
  }

  const result = await prisma.asset.deleteMany({
    where: { id: { in: stale.map((a) => a.id) } },
  })

  return NextResponse.json({ purged: result.count, cutoff: cutoff.toISOString() })
}
