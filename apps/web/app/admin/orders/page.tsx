/**
 * /admin/orders — ออเดอร์ทั้งหมด พร้อมตัวกรองสถานะ (?status=)
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { parseSubjectData, prisma } from '@minghe/db'
import { Badge, Card } from '@/components/ui'
import { cn, formatBaht, formatThaiDateTime, ORDER_STATUS_TH } from '@/lib/utils'

export const metadata: Metadata = { title: 'ออเดอร์ทั้งหมด' }
export const dynamic = 'force-dynamic'

const STATUSES = ['pending', 'processing', 'completed', 'failed'] as const
type StatusFilter = (typeof STATUSES)[number]

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

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const activeStatus: StatusFilter | null = STATUSES.find((s) => s === status) ?? null

  const orders = await prisma.order.findMany({
    where: activeStatus ? { status: activeStatus } : undefined,
    orderBy: { createdAt: 'desc' },
    include: {
      createdBy: { select: { email: true } },
      report: { select: { accessCode: true, revoked: true } },
    },
  })

  const filters: { href: string; label: string; active: boolean }[] = [
    { href: '/admin/orders', label: 'ทั้งหมด', active: activeStatus === null },
    ...STATUSES.map((s) => ({
      href: `/admin/orders?status=${s}`,
      label: ORDER_STATUS_TH[s] ?? s,
      active: activeStatus === s,
    })),
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">ออเดอร์ทั้งหมด</h1>
        <p className="mt-1 text-sm text-muted">
          {activeStatus
            ? `กรองตามสถานะ: ${ORDER_STATUS_TH[activeStatus]} — พบ ${orders.length} รายการ`
            : `ทั้งหมด ${orders.length} รายการ`}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {filters.map((f) => (
          <Link
            key={f.href}
            href={f.href}
            className={cn(
              'rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors',
              f.active
                ? 'border-ink bg-ink text-paper'
                : 'border-line bg-cloud text-ink-soft hover:border-gold hover:text-ink',
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <Card>
        {orders.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">
            ไม่พบออเดอร์{activeStatus ? `สถานะ "${ORDER_STATUS_TH[activeStatus]}"` : 'ในระบบ'}
          </p>
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
                {orders.map((order) => (
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
                      {order.report ? (
                        <span className={cn(order.report.revoked && 'line-through opacity-60')}>
                          {order.report.accessCode}
                        </span>
                      ) : (
                        '—'
                      )}
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
