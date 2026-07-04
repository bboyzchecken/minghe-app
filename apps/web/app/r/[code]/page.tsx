/**
 * /r/[code] — ตรวจสิทธิ์ + โหลดรายงานความเหมาะสม 命合
 *
 * ลำดับความปลอดภัย (แผนหัวข้อ 7):
 * 1. rate limit ต่อ IP (LIMITS.reportOpen) → เกิน: หน้า "พยายามบ่อยเกินไป"
 * 2. normalize + ตรวจ format — format ผิด / ไม่พบ / ถูกเพิกถอน / หมดอายุ
 *    → หน้า "ไม่พบรายงาน" ข้อความเดียวกันหมด (ไม่บอกใบ้ว่าพลาดตรงไหน)
 * 3. ถ้ามี PIN → ตรวจ cookie JWT (mh_rv_<id>) — ไม่ผ่านให้กรอก PIN
 * 4. แสดงสำเร็จ → viewCount +1 + บันทึก AccessLog (ipHash)
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { cookies, headers } from 'next/headers'
import { jwtVerify } from 'jose'
import { parseReportData, prisma } from '@minghe/db'
import type { ReportData } from '@minghe/report'
import { Button, Card, Seal } from '@/components/ui'
import { isValidAccessCodeFormat, normalizeAccessCode } from '@/lib/access-code'
import { LIMITS, rateLimit } from '@/lib/rate-limit'
import { clientIpOf, hashIp } from '@/lib/utils'
import { PinForm } from './pin-form'
import { ReportView } from './report-view'

export const metadata: Metadata = {
  title: 'รายงานความเหมาะสม 命合',
  robots: { index: false, follow: false },
}

function authSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET
  if (!secret || secret.length < 16) {
    throw new Error('AUTH_SECRET ไม่ได้ตั้งค่า (ต้องยาวอย่างน้อย 16 ตัวอักษร) — ดู .env.example')
  }
  return new TextEncoder().encode(secret)
}

/** ตรวจตั๋วเปิดดู (JWT ใน cookie mh_rv_<reportId>) ที่ออกโดย /api/reports/open */
async function hasValidViewToken(reportId: string): Promise<boolean> {
  const cookieStore = await cookies()
  const token = cookieStore.get(`mh_rv_${reportId}`)?.value
  if (!token) return false
  try {
    const { payload } = await jwtVerify(token, authSecret())
    return payload.sub === reportId
  } catch {
    return false
  }
}

/** โครงหน้าสถานะ (ไม่พบ/รอสักครู่/ล็อก PIN) บนพื้นหมึกลายดาว */
function GateShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="starfield flex min-h-screen flex-col items-center justify-center bg-ink px-4 py-16">
      <div className="w-full max-w-md text-center">
        <Link href="/" aria-label="กลับหน้าแรก 命合 Mìnghé" className="inline-block">
          <Seal size={56} />
        </Link>
        <h1 className="mt-6 text-2xl font-semibold text-paper">{title}</h1>
        {children}
      </div>
    </main>
  )
}

/** หน้าเดียวกันหมดสำหรับ: format ผิด / ไม่มีรหัสนี้ / ถูกเพิกถอน / หมดอายุ */
function ReportUnavailable() {
  return (
    <GateShell title="ไม่พบรายงาน">
      <p className="mt-3 text-sm leading-relaxed text-paper/70">
        ไม่พบรายงานตามรหัสนี้ หรือรายงานถูกเพิกถอน/หมดอายุแล้ว
        โปรดตรวจสอบรหัสเปิดรายงานอีกครั้ง หรือติดต่อผู้ส่งรายงานให้ออกรหัสใหม่
      </p>
      <div className="mt-8 flex flex-col items-center gap-3">
        <Button href="/r" variant="gold">
          กรอกรหัสใหม่อีกครั้ง
        </Button>
        <Link href="/" className="text-sm text-paper/60 transition-colors hover:text-gold-soft">
          กลับหน้าแรก
        </Link>
      </div>
    </GateShell>
  )
}

function TooManyAttempts() {
  return (
    <GateShell title="พยายามบ่อยเกินไป โปรดรอสักครู่">
      <p className="mt-3 text-sm leading-relaxed text-paper/70">
        ระบบจำกัดจำนวนครั้งการเปิดรายงานต่อช่วงเวลา เพื่อคุ้มครองข้อมูลของผู้ถูกวิเคราะห์
        โปรดรอประมาณหนึ่งนาทีแล้วลองใหม่อีกครั้ง
      </p>
      <div className="mt-8">
        <Button href="/r" variant="gold">
          กลับไปหน้ากรอกรหัส
        </Button>
      </div>
    </GateShell>
  )
}

export default async function ReportPage({ params }: { params: Promise<{ code: string }> }) {
  const { code: codeParam } = await params

  // 1) rate limit ต่อ IP — นับทุกความพยายาม (รวมรหัส format ผิด) กัน enumeration
  const ipHash = await hashIp(clientIpOf(await headers()))
  const rl = rateLimit(`report-open:${ipHash}`, LIMITS.reportOpen.limit, LIMITS.reportOpen.windowMs)
  if (!rl.ok) return <TooManyAttempts />

  // 2) normalize + ตรวจรูปแบบ — ผิดรูปแบบตอบเหมือน "ไม่พบรายงาน" ทุกประการ
  let rawCode = codeParam
  try {
    rawCode = decodeURIComponent(codeParam)
  } catch {
    // URI พิการ — ใช้ค่าดิบ แล้วปล่อยให้ตรวจ format ตัดสิน
  }
  const code = normalizeAccessCode(rawCode)
  if (!isValidAccessCodeFormat(code)) return <ReportUnavailable />

  // 3) โหลดรายงาน — ไม่เจอ/เพิกถอน/หมดอายุ ตอบรวมแบบไม่แยกแยะ
  const report = await prisma.report.findUnique({ where: { accessCode: code } })
  if (!report || report.revoked || (report.expiresAt && report.expiresAt < new Date())) {
    return <ReportUnavailable />
  }

  // 4) ล็อก PIN → ต้องมีตั๋วเปิดดู (JWT cookie) ก่อน
  if (report.pinHash) {
    const unlocked = await hasValidViewToken(report.id)
    if (!unlocked) {
      return (
        <GateShell title="รายงานฉบับนี้ป้องกันด้วย PIN">
          <p className="mt-3 text-sm leading-relaxed text-paper/70">
            เจ้าของรายงานตั้งค่า PIN เพิ่มอีกชั้นเพื่อความปลอดภัย
            โปรดกรอก PIN ที่ได้รับจากผู้ส่งรายงาน
          </p>
          <Card className="mt-8 text-left">
            <p className="mb-4 text-center font-mono text-sm tracking-[0.2em] text-muted">{code}</p>
            <PinForm code={code} />
          </Card>
          <p className="mt-6 text-sm">
            <Link href="/r" className="text-paper/60 transition-colors hover:text-gold-soft">
              ← ใช้รหัสเปิดรายงานอื่น
            </Link>
          </p>
        </GateShell>
      )
    }
  }

  // 5) เปิดดูสำเร็จ → นับยอดเข้าชม + บันทึกร่องรอยการเข้าถึง (PDPA: เก็บเฉพาะ hash ของ IP)
  await prisma.report.update({
    where: { id: report.id },
    data: {
      viewCount: { increment: 1 },
      accessLogs: { create: { ipHash } },
    },
  })

  const data = parseReportData<ReportData>(report.reportData)
  return <ReportView data={data} accessCode={code} />
}
