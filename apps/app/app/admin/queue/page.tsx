'use client'

/**
 * Admin · คิวงาน — รับเรื่อง → ดำเนินการ → ส่งมอบ (แอดมินหลายคนพร้อมกัน)
 * กติกา: ต้อง "รับเรื่อง" ก่อน งานของคนอื่นกดแล้วโดนระบบกัน (409)
 */

import { useState } from 'react'
import { Badge, EmptyState, Notice, PageHeader, Panel, ProductBadge, Segmented, Skeleton, TableWrap, baht, relTime } from '@/components/workspace/ui'
import type { AdminOrder } from '@/lib/api'
import { useAdminOrderAction, useAdminOrders, type AdminOrderAction } from '@/lib/queries'

type Filter = 'all' | 'paid' | 'processing' | 'mine' | 'delivered'

export default function AdminQueuePage() {
  const orders = useAdminOrders()
  const action = useAdminOrderAction()
  const [filter, setFilter] = useState<Filter>('all')
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const all = orders.data ?? []
  const rows = all.filter((o) => {
    if (filter === 'mine') return o.assigneeIsMe
    if (filter === 'all') return o.status !== 'delivered'
    return o.status === filter
  })
  const count = (f: Filter) =>
    f === 'mine' ? all.filter((o) => o.assigneeIsMe && o.status !== 'delivered').length : f === 'all' ? all.filter((o) => o.status !== 'delivered').length : all.filter((o) => o.status === f).length

  function run(kind: AdminOrderAction, o: AdminOrder, note: string) {
    setNotice(null)
    setError(null)
    action.mutate(
      { action: kind, id: o.id },
      {
        onSuccess: () => setNotice(note),
        onError: (e) => setError(e instanceof Error ? e.message : 'ทำรายการไม่สำเร็จ'),
      },
    )
  }

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="คิวงาน"
        description="กด “รับเรื่อง” เพื่อจองงานไว้กับตัวเอง — งานที่คนอื่นถืออยู่จะดำเนินการแทนไม่ได้"
        actions={
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { id: 'all', label: 'ค้างอยู่', count: count('all') },
              { id: 'paid', label: 'รอรับเรื่อง', count: count('paid') },
              { id: 'processing', label: 'กำลังทำ', count: count('processing') },
              { id: 'mine', label: 'ของฉัน', count: count('mine') },
              { id: 'delivered', label: 'ส่งแล้ว', count: count('delivered') },
            ]}
          />
        }
      />

      {error && <Notice tone="danger" onClose={() => setError(null)}>{error}</Notice>}
      {notice && <Notice tone="success" onClose={() => setNotice(null)}>{notice}</Notice>}

      <Panel padded={false}>
        {orders.isPending ? (
          <div className="p-5"><Skeleton rows={4} /></div>
        ) : rows.length === 0 ? (
          <div className="p-5"><EmptyState title="ไม่มีงานในหมวดนี้" /></div>
        ) : (
          <>
            {/* มือถือ */}
            <ul className="divide-y divide-ws-border md:hidden">
              {rows.map((o) => (
                <li key={o.id} className={`p-4 ${o.assigneeIsMe ? 'bg-ws-accent-soft/30' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="ws-mono text-xs text-ws-muted">{o.code}{o.express && <Badge tone="danger">ด่วน</Badge>}</div>
                      <div className="truncate text-sm font-medium text-ws-ink">{o.subjectName} × {o.orgLabel}</div>
                      <div className="ws-mono truncate text-xs text-ws-muted">{o.customerEmail}</div>
                    </div>
                    <div className="ws-mono text-sm font-semibold">{baht(o.total)}</div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                    <StatusBadge status={o.status} />
                    <ProductBadge product={o.product} />
                    <Assignee o={o} />
                    <span className="text-ws-faint">{relTime(o.createdAt)}</span>
                  </div>
                  <div className="mt-3"><RowActions order={o} run={run} busy={action.isPending} /></div>
                </li>
              ))}
            </ul>

            {/* เดสก์ท็อป */}
            <div className="hidden px-5 md:block">
              <TableWrap>
                <thead>
                  <tr>
                    <th className="ws-th">รหัส</th>
                    <th className="ws-th">งาน</th>
                    <th className="ws-th">ลูกค้า</th>
                    <th className="ws-th text-right">ยอด</th>
                    <th className="ws-th">สถานะ</th>
                    <th className="ws-th">ผู้รับผิดชอบ</th>
                    <th className="ws-th">เข้ามา</th>
                    <th className="ws-th">การทำงาน</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((o) => (
                    <tr key={o.id} className={`ws-row ${o.assigneeIsMe ? 'bg-ws-accent-soft/30' : ''}`}>
                      <td className="ws-td">
                        <span className="ws-mono text-xs">{o.code}</span>
                        {o.express && <span className="ml-1.5"><Badge tone="danger">ด่วน</Badge></span>}
                      </td>
                      <td className="ws-td">
                        <div className="max-w-[220px] truncate">{o.subjectName}</div>
                        <div className="max-w-[220px] truncate text-xs text-ws-muted">{o.orgLabel}</div>
                      </td>
                      <td className="ws-td">
                        <div className="ws-mono text-xs">{o.customerEmail}</div>
                        <ProductBadge product={o.product} />
                      </td>
                      <td className="ws-td ws-mono text-right">{baht(o.total)}</td>
                      <td className="ws-td"><StatusBadge status={o.status} /></td>
                      <td className="ws-td"><Assignee o={o} /></td>
                      <td className="ws-td whitespace-nowrap text-xs text-ws-muted">{relTime(o.createdAt)}</td>
                      <td className="ws-td"><RowActions order={o} run={run} busy={action.isPending} /></td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            </div>
          </>
        )}
      </Panel>
    </>
  )
}

function StatusBadge({ status }: { status: AdminOrder['status'] }) {
  if (status === 'paid') return <Badge tone="warn" dot>รอรับเรื่อง</Badge>
  if (status === 'processing') return <Badge tone="info" dot>กำลังดำเนินการ</Badge>
  if (status === 'delivered') return <Badge tone="success" dot>ส่งมอบแล้ว</Badge>
  return <Badge tone="neutral" dot>อื่น ๆ</Badge>
}

function Assignee({ o }: { o: AdminOrder }) {
  if (!o.assignee) return <span className="text-xs text-ws-faint">— ว่าง —</span>
  return <span className={`text-xs ${o.assigneeIsMe ? 'font-medium text-ws-accent-deep' : 'text-ws-soft'}`}>{o.assigneeIsMe ? 'ฉัน' : o.assignee}</span>
}

/** ปุ่มเฉพาะสิ่งที่ "ทำได้จริง" ตามสถานะและผู้ถืองาน — งานของคนอื่นไม่มีปุ่มให้กดพลาด */
function RowActions({ order, run, busy }: { order: AdminOrder; run: (k: AdminOrderAction, o: AdminOrder, note: string) => void; busy: boolean }) {
  if (order.status === 'delivered') return <span className="text-xs text-ws-faint">ปิดงานแล้ว</span>
  if (order.assignee && !order.assigneeIsMe) {
    return (
      <button disabled={busy} onClick={() => run('release', order, `คืนงาน ${order.code} เข้าคิวกลางแล้ว`)} className="ws-btn-ghost ws-btn-sm" title="ใช้เมื่อเจ้าของงานไม่อยู่">
        คืนเข้าคิว
      </button>
    )
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {!order.assignee && (
        <button disabled={busy} onClick={() => run('claim', order, `รับเรื่อง ${order.code} แล้ว — งานนี้เป็นของคุณ`)} className="ws-btn-soft ws-btn-sm">รับเรื่อง</button>
      )}
      {order.status === 'paid' && (
        <button disabled={busy} onClick={() => run('process', order, `เริ่มดำเนินการ ${order.code} แล้ว`)} className="ws-btn-primary ws-btn-sm">เริ่มดำเนินการ</button>
      )}
      {order.status === 'processing' && order.assigneeIsMe && (
        <button disabled={busy} onClick={() => run('deliver', order, `ส่งมอบ ${order.code} เรียบร้อย`)} className="ws-btn-primary ws-btn-sm">ส่งมอบ</button>
      )}
      {order.assigneeIsMe && order.status !== 'processing' && (
        <button disabled={busy} onClick={() => run('release', order, `คืนงาน ${order.code} เข้าคิวกลางแล้ว`)} className="ws-btn-ghost ws-btn-sm">คืนงาน</button>
      )}
    </div>
  )
}
