'use client'

/**
 * Admin · ภาพรวม — ตอบ 3 คำถามในจอเดียว:
 *   เงินเข้าเดือนนี้เท่าไร (แยกฝั่ง) · งานค้างเท่าไร · คนลองเล่นแล้วไม่จ่ายกี่คน
 * รายละเอียดอยู่ที่แท็บ สถิติ / คิวงาน / การเงิน
 */

import Link from 'next/link'
import { useState } from 'react'
import { RevenueChart } from '@/components/workspace/charts'
import { Icon } from '@/components/workspace/icons'
import { Badge, EmptyState, PageHeader, Panel, Segmented, Skeleton, StatTile, baht, relTime } from '@/components/workspace/ui'
import type { StatsGranularity } from '@/lib/api'
import { useAdminOrders, useAdminOverview, useAdminStats, useRefreshAdmin } from '@/lib/queries'
import { useSession } from '@/lib/session'
import { stepLabel } from '@/lib/track'

export default function AdminOverviewPage() {
  const { user } = useSession()
  const refresh = useRefreshAdmin()
  const overview = useAdminOverview()
  const orders = useAdminOrders()
  const [g, setG] = useState<StatsGranularity>('day')
  const stats = useAdminStats(g)

  const m = stats.data?.thisMonth
  const myTasks = (orders.data ?? []).filter((o) => o.assigneeIsMe && o.status !== 'delivered')
  const unassigned = (orders.data ?? []).filter((o) => !o.assignee && o.status === 'paid')
  const dropoffs = stats.data?.dropoffs ?? []
  const conv = m && m.trialsStarted > 0 ? Math.round((m.trialsPaid / m.trialsStarted) * 100) : null

  return (
    <>
      <PageHeader
        eyebrow={`สวัสดี ${user?.name ?? ''}`}
        title="ภาพรวม"
        description={new Date().toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        actions={
          <button onClick={() => void refresh()} className="ws-btn-ghost">
            <Icon name="refresh" size={15} /> รีเฟรช
          </button>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="รายได้เดือนนี้ · องค์กร" value={m ? baht(m.revenueEmployer) : '—'} icon="wallet" tone="accent" hint={m ? `${m.ordersEmployer} คำสั่งซื้อ` : undefined} />
        <StatTile label="รายได้เดือนนี้ · คนทำงาน" value={m ? baht(m.revenueJobseeker) : '—'} icon="wallet" tone="success" hint={m ? `${m.ordersJobseeker} คำสั่งซื้อ` : undefined} />
        <StatTile
          label="งานรอรับเรื่อง"
          value={overview.data?.orders.paid ?? '—'}
          icon="inbox"
          tone={(overview.data?.orders.paid ?? 0) > 0 ? 'warn' : 'neutral'}
          hint={overview.data ? `กำลังทำ ${overview.data.orders.processing} · ส่งแล้ว ${overview.data.orders.delivered}` : undefined}
        />
        <StatTile
          label="ลองเล่นแต่ไม่จ่าย (เดือนนี้)"
          value={m ? Math.max(0, m.trialsStarted - m.trialsPaid) : '—'}
          icon="alert"
          tone="violet"
          hint={conv !== null ? `อัตราแปลงเป็นลูกค้า ${conv}%` : 'ยังไม่มีข้อมูล'}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <Panel
          title="รายได้"
          description="สุทธิหลังหักคืนเงิน · แยกฝั่งองค์กร / คนทำงาน"
          action={
            <Segmented
              value={g}
              onChange={setG}
              options={[
                { id: 'day', label: '30 วัน' },
                { id: 'month', label: '12 เดือน' },
                { id: 'year', label: '5 ปี' },
              ]}
            />
          }
        >
          {stats.isPending ? <Skeleton rows={1} height="h-56" /> : <RevenueChart series={stats.data?.series ?? []} granularity={g} />}
          <div className="mt-3 text-right">
            <Link href="/admin/stats" className="inline-flex items-center gap-1 text-xs text-ws-accent hover:underline">
              ดูสถิติทั้งหมด <Icon name="arrow-right" size={12} />
            </Link>
          </div>
        </Panel>

        <div className="space-y-5">
          <Panel
            title="งานของฉัน"
            description={myTasks.length > 0 ? `${myTasks.length} งานในมือ` : 'ยังไม่มีงานในมือ'}
            action={<Link href="/admin/queue" className="ws-btn-ghost ws-btn-sm">ไปคิวงาน</Link>}
          >
            {orders.isPending ? (
              <Skeleton rows={2} height="h-10" />
            ) : myTasks.length === 0 ? (
              <div className="text-sm text-ws-muted">
                {unassigned.length > 0 ? (
                  <>
                    มี <b className="text-ws-ink">{unassigned.length}</b> งานในคิวกลางที่ยังไม่มีใครรับ —{' '}
                    <Link href="/admin/queue" className="text-ws-accent hover:underline">รับเรื่อง</Link>
                  </>
                ) : (
                  'คิวกลางว่าง'
                )}
              </div>
            ) : (
              <ul className="divide-y divide-ws-border">
                {myTasks.slice(0, 5).map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-2 py-2">
                    <div className="min-w-0">
                      <div className="ws-mono text-xs text-ws-muted">{o.code}</div>
                      <div className="truncate text-sm text-ws-ink">{o.subjectName} × {o.orgLabel}</div>
                    </div>
                    <Badge tone={o.status === 'processing' ? 'info' : 'warn'} dot>{o.status === 'processing' ? 'กำลังทำ' : 'รอเริ่ม'}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel
            title="ลองเล่นแล้วไม่จ่าย"
            description="ล่าสุด — ดูว่าสะดุดขั้นไหน"
            action={<Link href="/admin/stats" className="ws-btn-ghost ws-btn-sm">ดูทั้งหมด</Link>}
          >
            {stats.isPending ? (
              <Skeleton rows={2} height="h-10" />
            ) : dropoffs.length === 0 ? (
              <EmptyState icon="users" title="ยังไม่มีข้อมูล" hint="เมื่อมีคนเปิดหน้ากรอกแล้วไม่จ่าย จะขึ้นที่นี่" />
            ) : (
              <ul className="divide-y divide-ws-border">
                {dropoffs.slice(0, 5).map((d) => (
                  <li key={`${d.anonId}:${d.product}`} className="flex items-center justify-between gap-2 py-2 text-sm">
                    <div className="min-w-0">
                      <div className="truncate text-ws-ink">{d.email || <span className="text-ws-faint">ยังไม่ล็อกอิน</span>}</div>
                      <div className="text-xs text-ws-muted">หยุดที่ {stepLabel(d.lastStep)} · {relTime(d.lastSeenAt)}</div>
                    </div>
                    {d.hasCredit ? <Badge tone="success">ให้สิทธิ์แล้ว</Badge> : <Badge tone={d.product === 'employer' ? 'accent' : 'success'}>{d.product === 'employer' ? 'องค์กร' : 'คนทำงาน'}</Badge>}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <QuickLink href="/admin/billing" icon="receipt" title="การเงิน" desc="ใบเสร็จทุกราย · คืนเงิน · สิทธิ์ทดลอง" />
        <QuickLink href="/admin/users" icon="users" title="ผู้ใช้" desc={overview.data ? `${overview.data.usersActive} ใช้งาน / ${overview.data.usersTotal} บัญชี` : 'จัดการบัญชีและให้สิทธิ์ทดลอง'} />
        <QuickLink
          href="/admin/legal"
          icon="file"
          title="เอกสารกฎหมาย"
          desc={overview.data ? `เผยแพร่แล้ว ${overview.data.legalPublished}/${overview.data.legalTotal}` : '4 ฉบับสำหรับ payment gateway'}
          warn={overview.data ? overview.data.legalPublished < overview.data.legalTotal : false}
        />
      </div>
    </>
  )
}

function QuickLink({ href, icon, title, desc, warn }: { href: string; icon: 'receipt' | 'users' | 'file'; title: string; desc: string; warn?: boolean }) {
  return (
    <Link href={href} className="ws-panel flex items-center gap-3 p-4 transition hover:border-ws-border-strong hover:shadow-ws-lg">
      <span className={`inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg ${warn ? 'bg-ws-warn-soft text-ws-warn' : 'bg-ws-accent-soft text-ws-accent-deep'}`}>
        <Icon name={icon} size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-ws-ink">{title}</div>
        <div className="truncate text-xs text-ws-muted">{desc}</div>
      </div>
      <Icon name="arrow-right" size={16} className="text-ws-faint" />
    </Link>
  )
}
