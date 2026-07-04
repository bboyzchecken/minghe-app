/**
 * แดชบอร์ดลูกค้า — ภาพรวมเครดิต ออเดอร์ และรายงานความเหมาะสม 命合
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { prisma, parseOrgData, parseSubjectData, type OrgData } from '@minghe/db'
import { findIndustry } from '@minghe/core'
import { requireUser } from '@/lib/auth'
import { planById } from '@/lib/pricing'
import { formatBaht, formatThaiDate, formatThaiDateTime, ORDER_STATUS_TH } from '@/lib/utils'
import { Badge, Button, Card, GoldDivider, Seal, Stat } from '@/components/ui'
import { CopyCodeButton } from './copy-code-button'

export const metadata: Metadata = {
  title: 'แดชบอร์ด — 命合 Mìnghé',
}

type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger'

const STATUS_TONE: Record<string, BadgeTone> = {
  completed: 'success',
  processing: 'warning',
  failed: 'danger',
  pending: 'neutral',
}

function subjectNameOf(raw: string): string {
  try {
    return parseSubjectData(raw).name || '—'
  } catch {
    return '—'
  }
}

function orgLabelOf(raw: string): string {
  let org: OrgData
  try {
    org = parseOrgData(raw)
  } catch {
    return '—'
  }
  switch (org.mode) {
    case 'executive':
      return org.executiveName ? `ผู้บริหาร: ${org.executiveName}` : 'ดวงผู้บริหารองค์กร'
    case 'company-date':
      return org.companyName ?? 'องค์กร (ตามวันก่อตั้ง)'
    case 'industry': {
      const industry = findIndustry(org.industryId)?.th ?? org.industryId
      return org.companyName ? `${org.companyName} · ${industry}` : industry
    }
  }
}

export default async function DashboardPage() {
  const session = await requireUser()

  const [user, orders, subscription] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.userId } }),
    prisma.order.findMany({
      where: { createdById: session.userId },
      include: { report: true, payment: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.subscription.findUnique({ where: { userId: session.userId } }),
  ])

  const completedCount = orders.filter((o) => o.status === 'completed').length
  const processingCount = orders.filter((o) => o.status === 'processing').length
  const recentReports = orders
    .filter((o) => o.status === 'completed' && o.report)
    .slice(0, 3)

  const now = new Date()

  return (
    <div className="space-y-8">
      {/* หัวหน้า + CTA */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink md:text-3xl">แดชบอร์ด</h1>
          <p className="mt-1 text-sm text-muted">
            สวัสดี {session.name ?? session.email} — จัดการออเดอร์และรายงานความเหมาะสม 命合 ของคุณได้ที่นี่
          </p>
        </div>
        <Button href="/order/new" className="px-6 py-3 text-base">
          + สร้างออเดอร์ใหม่
        </Button>
      </div>

      {/* สถิติย่อ */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="p-5">
          <p className="text-sm text-muted">เครดิตคงเหลือ</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-ink">{user?.credits ?? 0}</p>
          <p className="mt-1 text-xs">
            <Link href="/account" className="font-semibold text-cinnabar hover:text-cinnabar-deep">
              เติมเครดิตที่หน้าบัญชี →
            </Link>
          </p>
        </Card>
        <Stat label="ออเดอร์ทั้งหมด" value={orders.length} hint="รวมทุกสถานะ" />
        <Stat label="เสร็จสมบูรณ์" value={completedCount} hint="รายงานพร้อมเปิดอ่าน" />
        <Stat label="กำลังวิเคราะห์" value={processingCount} hint="ซินแสกำลังเรียบเรียงผล" />
      </div>

      {/* แพ็กเกจรายเดือน (ถ้ามี) */}
      {subscription ? (
        <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-ink">
              แพ็กเกจรายเดือน: {planById(subscription.plan)?.label ?? subscription.plan}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              ใช้ไป {subscription.reportsUsed} / {subscription.reportsQuota} รายงาน · รอบถัดไป{' '}
              {formatThaiDate(subscription.renewsAt)}
            </p>
          </div>
          <Badge
            tone={
              subscription.status === 'active'
                ? 'success'
                : subscription.status === 'past_due'
                  ? 'warning'
                  : 'neutral'
            }
          >
            {subscription.status === 'active'
              ? 'ใช้งานอยู่'
              : subscription.status === 'past_due'
                ? 'ค้างชำระ'
                : 'ยกเลิกแล้ว'}
          </Badge>
        </Card>
      ) : null}

      {/* ตารางออเดอร์ */}
      <section>
        <h2 className="text-lg font-semibold text-ink">ออเดอร์ของคุณ</h2>
        <GoldDivider className="my-3" />

        {orders.length === 0 ? (
          <Card className="flex flex-col items-center gap-4 py-14 text-center">
            <Seal size={56} />
            <div>
              <p className="text-lg font-semibold text-ink">ยังไม่มีออเดอร์ในบัญชีนี้</p>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted">
                เริ่มต้นวิเคราะห์ความเหมาะสมระหว่างคนกับองค์กรด้วยผังปาจือ (命盘) และดัชนีสมพงษ์ (合
                Index) — ใช้เพียงวัน-เวลาเกิดและข้อมูลองค์กรของคุณ
              </p>
            </div>
            <Button href="/order/new">สร้างออเดอร์แรกของคุณ</Button>
          </Card>
        ) : (
          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-paper-warm/60 text-xs text-muted">
                  <th className="px-4 py-3 font-semibold">วันที่</th>
                  <th className="px-4 py-3 font-semibold">ผู้ถูกวิเคราะห์</th>
                  <th className="px-4 py-3 font-semibold">องค์กร</th>
                  <th className="px-4 py-3 font-semibold">สถานะ</th>
                  <th className="px-4 py-3 text-right font-semibold">ราคา</th>
                  <th className="px-4 py-3 font-semibold">การกระทำ</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-line/60 last:border-b-0">
                    <td className="whitespace-nowrap px-4 py-3 text-muted">
                      {formatThaiDateTime(order.createdAt)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-ink">
                      {subjectNameOf(order.subjectData)}
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{orgLabelOf(order.orgData)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={STATUS_TONE[order.status] ?? 'neutral'}>
                        {ORDER_STATUS_TH[order.status] ?? order.status}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-ink">
                      {formatBaht(order.priceSatang)}
                      {order.payment?.provider === 'credits' ? (
                        <span className="block text-[11px] font-sans text-muted">ชำระด้วยเครดิต</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/order/${order.id}`}
                          className="text-xs font-semibold text-ink-soft underline-offset-2 hover:text-cinnabar hover:underline"
                        >
                          สถานะ
                        </Link>
                        {order.report ? (
                          <>
                            <Link
                              href={`/r/${order.report.accessCode}`}
                              className="text-xs font-semibold text-cinnabar underline-offset-2 hover:text-cinnabar-deep hover:underline"
                            >
                              เปิดรายงาน
                            </Link>
                            <CopyCodeButton code={order.report.accessCode} />
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>

      {/* รายงานล่าสุด */}
      {recentReports.length > 0 ? (
        <section>
          <h2 className="text-lg font-semibold text-ink">รายงานล่าสุด</h2>
          <p className="mt-0.5 text-sm text-muted">
            ส่งต่อรายงานด้วย &ldquo;รหัสเปิดรายงาน&rdquo; ได้อย่างปลอดภัย — ผู้รับใช้รหัสนี้เปิดอ่านได้ทันที
          </p>
          <GoldDivider className="my-3" />
          <div className="grid gap-4 md:grid-cols-3">
            {recentReports.map((order) => {
              const report = order.report!
              const expired = report.expiresAt ? new Date(report.expiresAt) < now : false
              return (
                <Card key={report.id} className="flex flex-col gap-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-ink">{subjectNameOf(order.subjectData)}</p>
                      <p className="mt-0.5 text-xs text-muted">{orgLabelOf(order.orgData)}</p>
                    </div>
                    {report.revoked ? (
                      <Badge tone="danger">ถูกเพิกถอน</Badge>
                    ) : expired ? (
                      <Badge tone="warning">หมดอายุ</Badge>
                    ) : (
                      <Badge tone="success">พร้อมเปิด</Badge>
                    )}
                  </div>
                  <div className="rounded-sm border border-line bg-paper-warm/50 px-3 py-2">
                    <p className="text-[11px] text-muted">รหัสเปิดรายงาน</p>
                    <p className="font-mono text-sm font-semibold tracking-wider text-ink">
                      {report.accessCode}
                    </p>
                  </div>
                  <p className="text-xs text-muted">
                    เสร็จเมื่อ {formatThaiDateTime(order.completedAt ?? report.createdAt)}
                    {report.expiresAt ? (
                      <span className="block">ใช้ได้ถึง {formatThaiDate(report.expiresAt)}</span>
                    ) : null}
                  </p>
                  <div className="mt-auto flex items-center gap-2">
                    {!report.revoked && !expired ? (
                      <Link
                        href={`/r/${report.accessCode}`}
                        className="text-xs font-semibold text-cinnabar underline-offset-2 hover:text-cinnabar-deep hover:underline"
                      >
                        เปิดรายงาน →
                      </Link>
                    ) : null}
                    <CopyCodeButton code={report.accessCode} />
                  </div>
                </Card>
              )
            })}
          </div>
        </section>
      ) : null}
    </div>
  )
}
