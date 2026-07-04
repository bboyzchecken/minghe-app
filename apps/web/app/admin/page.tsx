/**
 * /admin — ภาพรวมระบบสำหรับผู้ดูแล (operator)
 * สถิติหลัก + ออเดอร์ 10 รายการล่าสุด
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { parseSubjectData, prisma } from '@minghe/db'
import { Badge, Card, Stat } from '@/components/ui'
import { formatBaht, formatThaiDateTime, ORDER_STATUS_TH } from '@/lib/utils'

export const metadata: Metadata = { title: 'ภาพรวมระบบ' }
export const dynamic = 'force-dynamic'

const STATUS_TONE: Record<string, 'warning' | 'info' | 'success' | 'danger'> = {
  pending: 'warning',
  processing: 'info',
  completed: 'success',
  failed: 'danger',
}

function subjectNameOf(raw: string): string {
  try {
    return parseSubjectData(raw).name || '—'
  } catch {
    return '—'
  }
}

export default async function AdminOverviewPage() {
  const [
    totalOrders,
    completedOrders,
    inProgressOrders,
    failedOrders,
    paidSum,
    userCount,
    reportCount,
    latestOrders,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { status: 'completed' } }),
    prisma.order.count({ where: { status: { in: ['pending', 'processing'] } } }),
    prisma.order.count({ where: { status: 'failed' } }),
    prisma.payment.aggregate({ where: { status: 'paid' }, _sum: { amount: true } }),
    prisma.user.count(),
    prisma.report.count(),
    prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        createdBy: { select: { email: true } },
        report: { select: { accessCode: true } },
      },
    }),
  ])

  const revenueSatang = paidSum._sum.amount ?? 0

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-ink">ภาพรวมระบบ</h1>
        <p className="mt-1 text-sm text-muted">
          สถานะออเดอร์ รายได้ และรายงานความเหมาะสม 命合 ทั้งหมดในระบบ
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="ออเดอร์ทั้งหมด" value={totalOrders} />
        <Stat label="เสร็จสมบูรณ์" value={completedOrders} />
        <Stat label="รอดำเนินการ" value={inProgressOrders} hint="รอชำระเงิน + กำลังวิเคราะห์" />
        <Stat label="ไม่สำเร็จ" value={failedOrders} />
        <Stat label="รายได้รวม" value={formatBaht(revenueSatang)} hint="จากรายการชำระเงินที่สำเร็จ" />
        <Stat label="ผู้ใช้ทั้งหมด" value={userCount} />
        <Stat label="รายงานที่ออกแล้ว" value={reportCount} />
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">ออเดอร์ล่าสุด 10 รายการ</h2>
          <Link href="/admin/orders" className="text-sm font-semibold text-cinnabar hover:text-cinnabar-deep">
            ดูออเดอร์ทั้งหมด →
          </Link>
        </div>
        {latestOrders.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">ยังไม่มีออเดอร์ในระบบ</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-semibold text-muted">
                  <th className="px-3 py-2">ออเดอร์</th>
                  <th className="px-3 py-2">วันที่</th>
                  <th className="px-3 py-2">ผู้สร้าง</th>
                  <th className="px-3 py-2">ผู้ถูกวิเคราะห์</th>
                  <th className="px-3 py-2">สถานะ</th>
                  <th className="px-3 py-2 text-right">ราคา</th>
                  <th className="px-3 py-2">รหัสเปิดรายงาน</th>
                </tr>
              </thead>
              <tbody>
                {latestOrders.map((order) => (
                  <tr key={order.id} className="border-b border-line/60 last:border-0 hover:bg-paper-warm">
                    <td className="px-3 py-2.5">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="font-mono text-xs font-semibold text-cinnabar hover:text-cinnabar-deep"
                      >
                        {order.id.slice(-8).toUpperCase()}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-xs text-ink-soft">
                      {formatThaiDateTime(order.createdAt)}
                    </td>
                    <td className="px-3 py-2.5 text-xs">
                      {order.createdBy?.email ?? (
                        <span className="text-muted">{order.guestEmail ?? 'guest'} (guest)</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 font-medium text-ink">{subjectNameOf(order.subjectData)}</td>
                    <td className="px-3 py-2.5">
                      <Badge tone={STATUS_TONE[order.status] ?? 'neutral'}>
                        {ORDER_STATUS_TH[order.status] ?? order.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs">{formatBaht(order.priceSatang)}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-ink-soft">
                      {order.report?.accessCode ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
