/**
 * /order/[id] — สถานะออเดอร์
 *
 * สิทธิ์: ออเดอร์ของสมาชิก → ต้องเป็นเจ้าของ / guest order (createdById null)
 * → เปิดได้ด้วย id ที่เป็น cuid เดาไม่ได้ (ผู้สั่งได้ลิงก์นี้ตอนสร้างออเดอร์)
 */

import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { parseOrgData, parseSubjectData, prisma } from '@minghe/db'
import { findIndustry } from '@minghe/core'
import { getSession } from '@/lib/auth'
import { hasOrderAccess } from '@/lib/order-access'
import { Badge, Button, Card, Notice, Seal } from '@/components/ui'
import { formatBaht, formatThaiDateTime, ORDER_STATUS_TH } from '@/lib/utils'

const STEPS: { key: string; label: string }[] = [
  { key: 'pending', label: 'รอชำระเงิน' },
  { key: 'processing', label: 'กำลังวิเคราะห์' },
  { key: 'completed', label: 'เสร็จสมบูรณ์' },
]

function statusTone(status: string): 'neutral' | 'warning' | 'success' | 'danger' {
  if (status === 'completed') return 'success'
  if (status === 'processing') return 'warning'
  if (status === 'failed') return 'danger'
  return 'neutral'
}

function orgLabel(order: { orgData: string }): string {
  try {
    const org = parseOrgData(order.orgData)
    if (org.mode === 'executive') return org.executiveName ?? 'ดวงผู้บริหาร'
    if (org.mode === 'company-date') return org.companyName ?? 'วันก่อตั้งบริษัท'
    return findIndustry(org.industryId)?.th ?? 'ธาตุอุตสาหกรรม'
  } catch {
    return '—'
  }
}

export default async function OrderStatusPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const order = await prisma.order.findUnique({
    where: { id },
    include: { report: true, payment: true },
  })
  if (!order) notFound()

  // สิทธิ์ดูสถานะ (ปิด IDOR):
  // - ออเดอร์สมาชิก → ต้องเป็นเจ้าของ / - ออเดอร์ guest → ต้องถือตั๋วความเป็นเจ้าของ (cookie)
  const session = await getSession()
  const canView = order.createdById
    ? order.createdById === session?.userId
    : await hasOrderAccess(order.id)
  if (!canView) {
    if (session) redirect('/dashboard')
    notFound()
  }

  const subject = (() => {
    try {
      return parseSubjectData(order.subjectData)
    } catch {
      return null
    }
  })()

  const currentStepIndex = STEPS.findIndex((s) => s.key === order.status)

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">สถานะออเดอร์</h1>
        <Badge tone={statusTone(order.status)}>{ORDER_STATUS_TH[order.status] ?? order.status}</Badge>
      </div>

      <Card>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-muted">ผู้ถูกวิเคราะห์</dt>
            <dd className="font-semibold text-ink">{subject?.name ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted">องค์กร/ฝ่ายเทียบ</dt>
            <dd className="font-semibold text-ink">{orgLabel(order)}</dd>
          </div>
          <div>
            <dt className="text-muted">วันที่สั่ง</dt>
            <dd className="text-ink">{formatThaiDateTime(order.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-muted">ราคา</dt>
            <dd className="text-ink">
              {order.payment?.provider === 'credits' ? 'ชำระด้วยเครดิต' : formatBaht(order.priceSatang)}
            </dd>
          </div>
        </dl>
      </Card>

      {/* timeline */}
      {order.status !== 'failed' ? (
        <div className="mt-6 flex items-center justify-between px-2">
          {STEPS.map((step, i) => {
            const done = currentStepIndex >= i
            const active = currentStepIndex === i
            return (
              <div key={step.key} className="flex flex-1 flex-col items-center">
                <div className="flex w-full items-center">
                  {i > 0 ? (
                    <div className={`h-0.5 flex-1 ${currentStepIndex >= i ? 'bg-cinnabar' : 'bg-line'}`} />
                  ) : (
                    <div className="flex-1" />
                  )}
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                      done ? 'bg-cinnabar text-paper' : 'border border-line bg-cloud text-muted'
                    } ${active ? 'ring-2 ring-gold ring-offset-2' : ''}`}
                  >
                    {i + 1}
                  </div>
                  {i < STEPS.length - 1 ? (
                    <div className={`h-0.5 flex-1 ${currentStepIndex > i ? 'bg-cinnabar' : 'bg-line'}`} />
                  ) : (
                    <div className="flex-1" />
                  )}
                </div>
                <span className={`mt-2 text-xs ${active ? 'font-semibold text-ink' : 'text-muted'}`}>
                  {step.label}
                </span>
              </div>
            )
          })}
        </div>
      ) : null}

      {/* ผลลัพธ์ */}
      {order.status === 'completed' && order.report ? (
        <Card className="mt-6 border-jade/30 bg-jade/5">
          <div className="flex items-start gap-3">
            <Seal size={40} />
            <div className="flex-1">
              <p className="font-semibold text-ink">รายงานพร้อมแล้ว</p>
              <p className="mt-1 text-sm text-muted">รหัสเปิดรายงานของคุณคือ</p>
              <p className="mt-2 font-mono text-2xl font-semibold tracking-[0.15em] text-cinnabar">
                {order.report.accessCode}
              </p>
              <p className="mt-2 text-xs text-muted">
                เก็บรหัสนี้ไว้ให้ดี — ใครมีรหัสสามารถเปิดดูและพิมพ์รายงานได้
              </p>
              <div className="mt-4">
                <Button href={`/r/${order.report.accessCode}`}>เปิดรายงาน</Button>
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      {order.status === 'processing' ? (
        <Notice tone="info" className="mt-6">
          เครื่องคำนวณกำลังตั้งเสาสี่ต้นและวิเคราะห์ความเข้ากัน — โดยปกติใช้เวลาไม่นาน
          โปรดรีเฟรชหน้านี้อีกครั้งในอีกสักครู่
        </Notice>
      ) : null}

      {order.status === 'pending' ? (
        <Notice tone="warning" className="mt-6">
          ออเดอร์นี้ยังไม่ได้ชำระเงิน — หากคุณปิดหน้าชำระเงินไป โปรดสร้างออเดอร์ใหม่อีกครั้ง
        </Notice>
      ) : null}

      {order.status === 'failed' ? (
        <Notice tone="danger" className="mt-6">
          <p className="font-semibold">การประมวลผลไม่สำเร็จ</p>
          {order.errorNote ? <p className="mt-1 text-xs">{order.errorNote}</p> : null}
          <p className="mt-2 text-xs">
            โปรดติดต่อทีมงานที่{' '}
            <a href="mailto:hello@minghe.app" className="font-semibold underline">
              hello@minghe.app
            </a>{' '}
            พร้อมแจ้งหมายเลขออเดอร์นี้ ทีมงานจะตรวจสอบและดำเนินการให้
          </p>
        </Notice>
      ) : null}

      <div className="mt-6 text-center">
        <Link href={session ? '/dashboard' : '/'} className="text-sm text-muted hover:text-cinnabar">
          ← {session ? 'กลับแดชบอร์ด' : 'กลับหน้าแรก'}
        </Link>
      </div>
    </div>
  )
}
