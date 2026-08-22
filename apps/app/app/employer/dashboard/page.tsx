'use client'

/**
 * Employer · ภาพรวม — โฟกัส "งานล่าสุด + สิ่งที่ต้องรู้" ในจอเดียว
 * รายละเอียดการเงินอยู่ที่ /employer/billing · ข้อมูลบัญชีที่ /employer/profile
 */

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { OrgMembersCard } from '@/components/org-members-card'
import { Icon } from '@/components/workspace/icons'
import { WorkspaceShell, employerNav } from '@/components/workspace/shell'
import { Badge, EmptyState, PageHeader, Panel, Skeleton, StatTile, TableWrap, baht, fmtDate } from '@/components/workspace/ui'
import type { OrderRecord } from '@/lib/api'
import { EMPLOYER_WEEKLY_QUOTA } from '@/lib/pricing'
import { useMyCredits, useMyPayments, useOrders, useSavedProfiles, useTeams } from '@/lib/queries'
import { useSession } from '@/lib/session'
import { saveCurrentOrder } from '@/lib/store'

export default function EmployerDashboardPage() {
  return (
    <WorkspaceShell nav={employerNav} brand="บัญชีองค์กร" requirePath="/employer/dashboard">
      <EmployerDashboard />
    </WorkspaceShell>
  )
}

function EmployerDashboard() {
  const router = useRouter()
  const { user } = useSession()
  const orders = useOrders('employer')
  const payments = useMyPayments()
  const credits = useMyCredits()
  const profiles = useSavedProfiles()
  const teams = useTeams()

  const rows = orders.data ?? []
  const weekAgo = Date.now() - 7 * 86_400_000
  const thisWeek = rows.filter((o) => new Date(o.createdAt).getTime() > weekAgo).length
  const ym = new Date().toISOString().slice(0, 7)
  const spentMonth = (payments.data ?? []).filter((p) => p.paidAt.slice(0, 7) === ym).reduce((s, p) => s + p.amount - p.refundAmount, 0)
  const available = (credits.data ?? []).filter((c) => c.status === 'available').length

  function open(order: OrderRecord) {
    saveCurrentOrder(order)
    router.push('/report')
  }

  return (
    <>
      <PageHeader
        eyebrow={user?.organizationName ?? 'บัญชีองค์กร'}
        title={`สวัสดี ${user?.name?.split(' ')[0] ?? ''}`}
        description={`เข้าใช้ในฐานะ${user?.orgRole === 'hr' ? 'ฝ่ายบุคคล (HR)' : 'เจ้าของบัญชี'} · ${new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}`}
        actions={
          <Link href="/employer/new" className="ws-btn-primary">
            <Icon name="plus" size={15} /> วิเคราะห์ candidate ใหม่
          </Link>
        }
      />

      {available > 0 && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ws-success/40 bg-ws-success-soft/50 px-4 py-3">
          <div className="flex items-center gap-3 text-sm">
            <Icon name="gift" size={18} className="text-ws-success" />
            <span className="text-ws-ink">คุณมีสิทธิ์วิเคราะห์ฟรี <b>{available}</b> ครั้ง — หักให้อัตโนมัติตอนชำระเงิน</span>
          </div>
          <Link href="/employer/new" className="ws-btn-primary ws-btn-sm">ใช้สิทธิ์</Link>
        </div>
      )}

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="วิเคราะห์สัปดาห์นี้" value={`${thisWeek} / ${EMPLOYER_WEEKLY_QUOTA}`} icon="chart" tone="accent" hint="โควตาแพ็กรายเดือน · รีเซ็ตทุกจันทร์" />
        <StatTile label="รายงานทั้งหมด" value={orders.isPending ? '—' : rows.length} icon="file" hint="ตลอดการใช้งาน" />
        <StatTile label="ค่าใช้จ่ายเดือนนี้" value={baht(spentMonth)} icon="wallet" hint={<Link href="/employer/billing" className="text-ws-accent hover:underline">ดูใบเสร็จ</Link>} />
        <StatTile label="คลังข้อมูล" value={profiles.data ? profiles.data.length : '—'} icon="database" hint={`โปรไฟล์ · ${teams.data?.length ?? 0} ทีม`} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <Panel title="ประวัติการวิเคราะห์" description="กดรหัสเพื่อเปิดรายงาน" action={rows.length > 0 ? <Link href="/employer/new" className="ws-btn-ghost ws-btn-sm">วิเคราะห์ใหม่</Link> : undefined} padded={false}>
          {orders.error && <p className="m-4 rounded-lg bg-ws-danger-soft px-3 py-2 text-sm text-ws-danger">{orders.error.message}</p>}
          {orders.isPending ? (
            <div className="p-5"><Skeleton rows={3} height="h-11" /></div>
          ) : rows.length === 0 ? (
            <div className="p-5">
              <EmptyState icon="file" title="ยังไม่มีรายงาน" hint="เริ่มวิเคราะห์ candidate คนแรกได้เลย" action={<Link href="/employer/new" className="ws-btn-primary ws-btn-sm">เริ่มวิเคราะห์</Link>} />
            </div>
          ) : (
            <>
              <ul className="divide-y divide-ws-border md:hidden">
                {rows.map((o) => (
                  <li key={o.code} className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-ws-ink">{o.subjectName}</div>
                      <div className="truncate text-xs text-ws-muted">{o.orgLabel} · {fmtDate(o.createdAt)}</div>
                      <div className="mt-1 flex items-center gap-1.5"><StatusBadge o={o} /><span className="ws-mono text-xs text-ws-muted">{baht(o.total)}</span></div>
                    </div>
                    <button onClick={() => open(o)} disabled={o.status !== 'ready'} className="ws-btn-soft ws-btn-sm flex-none">เปิด</button>
                  </li>
                ))}
              </ul>
              <div className="hidden px-5 md:block">
                <TableWrap>
                  <thead>
                    <tr>
                      <th className="ws-th">ผู้ถูกวิเคราะห์</th>
                      <th className="ws-th">ฝ่ายองค์กร</th>
                      <th className="ws-th text-right">ยอด</th>
                      <th className="ws-th">สถานะ</th>
                      <th className="ws-th">วันที่</th>
                      <th className="ws-th">รหัสเปิด</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((o) => (
                      <tr key={o.code} className="ws-row">
                        <td className="ws-td font-medium">{o.subjectName}</td>
                        <td className="ws-td text-ws-soft">{o.orgLabel}</td>
                        <td className="ws-td ws-mono text-right">{baht(o.total)}</td>
                        <td className="ws-td"><StatusBadge o={o} /></td>
                        <td className="ws-td text-xs text-ws-muted">{fmtDate(o.createdAt)}</td>
                        <td className="ws-td">
                          {o.status === 'ready' ? (
                            <button onClick={() => open(o)} className="ws-mono text-xs font-medium text-ws-accent hover:underline">{o.code}</button>
                          ) : (
                            <span className="ws-mono text-xs text-ws-faint">{o.code}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </TableWrap>
              </div>
            </>
          )}
        </Panel>

        <div className="space-y-5">
          <Panel title="คลังข้อมูลองค์กร" description="ระบบจำโปรไฟล์และทีมที่เคยกรอกไว้ให้" action={<Link href="/employer/memory" className="ws-btn-ghost ws-btn-sm">จัดการ</Link>}>
            <ul className="space-y-2 text-sm">
              <MemoryRow icon="shield" title="Company Profile" detail={user?.organizationName ?? 'ยังไม่ได้ตั้งค่า'} />
              <MemoryRow icon="users" title="โปรไฟล์ที่บันทึกไว้" detail={profiles.isPending ? 'กำลังโหลด…' : profiles.data && profiles.data.length > 0 ? `${profiles.data.length} คน` : 'ยังไม่มี — บันทึกอัตโนมัติเมื่อสั่งวิเคราะห์'} />
              <MemoryRow icon="database" title="Team Roster" detail={teams.data && teams.data.length > 0 ? `${teams.data.length} ทีม` : 'ยังไม่มีทีม'} />
            </ul>
          </Panel>
          {user && <div className="[&>div]:!rounded-2xl [&>div]:!border-ws-border [&>div]:!bg-ws-surface [&>div]:!shadow-ws"><OrgMembersCard user={user} /></div>}
        </div>
      </div>
    </>
  )
}

function StatusBadge({ o }: { o: OrderRecord }) {
  if (o.status === 'ready') return <Badge tone="success" dot>{o.paymentMethod === 'credit' ? 'พร้อม · สิทธิ์ทดลอง' : 'พร้อมแล้ว'}</Badge>
  return <Badge tone="warn" dot>รอชำระเงิน</Badge>
}

function MemoryRow({ icon, title, detail }: { icon: 'shield' | 'users' | 'database'; title: string; detail: string }) {
  return (
    <li className="flex items-start gap-3 rounded-lg bg-ws-raised px-3 py-2">
      <Icon name={icon} size={16} className="mt-0.5 text-ws-accent" />
      <div className="min-w-0">
        <div className="text-sm font-medium text-ws-ink">{title}</div>
        <div className="truncate text-xs text-ws-muted">{detail}</div>
      </div>
    </li>
  )
}
