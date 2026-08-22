'use client'

/**
 * Job Seeker · ภาพรวม — บริษัทที่เคยเช็ก + สิ่งที่ควรรู้ ในจอเดียว (มือถือเป็นหลัก)
 */

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { isoToDisplay } from '@/components/date-input'
import { Icon } from '@/components/workspace/icons'
import { WorkspaceShell, jobseekerNav } from '@/components/workspace/shell'
import { Badge, EmptyState, PageHeader, Panel, Skeleton, StatTile, baht, fmtDate } from '@/components/workspace/ui'
import type { OrderRecord } from '@/lib/api'
import { JOBSEEKER_WEEKLY_QUOTA } from '@/lib/pricing'
import { useMyCredits, useMyPayments, useOrders, useSavedProfiles } from '@/lib/queries'
import { useSession } from '@/lib/session'
import { saveCurrentOrder } from '@/lib/store'

export default function JobSeekerDashboardPage() {
  return (
    <WorkspaceShell nav={jobseekerNav} brand="บัญชีคนทำงาน" requirePath="/jobseeker/dashboard">
      <JobSeekerDashboard />
    </WorkspaceShell>
  )
}

function JobSeekerDashboard() {
  const router = useRouter()
  const { user } = useSession()
  const orders = useOrders('jobseeker')
  const payments = useMyPayments()
  const credits = useMyCredits()
  const profiles = useSavedProfiles('self')

  const rows = orders.data ?? []
  const weekAgo = Date.now() - 7 * 86_400_000
  const thisWeek = rows.filter((o) => new Date(o.createdAt).getTime() > weekAgo).length
  const spent = (payments.data ?? []).reduce((s, p) => s + p.amount - p.refundAmount, 0)
  const available = (credits.data ?? []).filter((c) => c.status === 'available').length
  const me = profiles.data?.[0]

  function open(order: OrderRecord) {
    saveCurrentOrder(order)
    router.push('/report')
  }

  return (
    <>
      <PageHeader
        eyebrow="บัญชีส่วนบุคคล"
        title={`สวัสดี ${user?.name?.split(' ')[0] ?? ''}`}
        description="บริษัทไหนส่งเสริมดวงคุณ — เช็กก่อนสมัครหรือตอบรับงาน"
        actions={
          <Link href="/jobseeker/new" className="ws-btn-primary">
            <Icon name="plus" size={15} /> เช็กบริษัทใหม่
          </Link>
        }
      />

      {available > 0 && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ws-success/40 bg-ws-success-soft/50 px-4 py-3">
          <div className="flex items-center gap-3 text-sm">
            <Icon name="gift" size={18} className="text-ws-success" />
            <span className="text-ws-ink">คุณมีสิทธิ์เช็กฟรี <b>{available}</b> ครั้ง — หักให้อัตโนมัติตอนชำระเงิน</span>
          </div>
          <Link href="/jobseeker/new" className="ws-btn-primary ws-btn-sm">ใช้สิทธิ์</Link>
        </div>
      )}

      <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatTile label="เช็กสัปดาห์นี้" value={`${thisWeek} / ${JOBSEEKER_WEEKLY_QUOTA}`} icon="chart" tone="success" hint="โควตาแพ็กรายเดือน" />
        <StatTile label="เช็กทั้งหมด" value={orders.isPending ? '—' : rows.length} icon="file" hint="ตลอดการใช้งาน" />
        <StatTile label="ใช้จ่ายรวม" value={baht(spent)} icon="wallet" hint={<Link href="/jobseeker/billing" className="text-ws-accent hover:underline">ดูใบเสร็จ</Link>} />
        <StatTile label="แพ็กเกจ" value={<span className="text-lg">รายครั้ง</span>} icon="shield" hint="199 บาท/ครั้ง · รายเดือน 399" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <Panel title="บริษัทที่คุณเช็ก" padded={false}>
          {orders.error && <p className="m-4 rounded-lg bg-ws-danger-soft px-3 py-2 text-sm text-ws-danger">{orders.error.message}</p>}
          {orders.isPending ? (
            <div className="p-5"><Skeleton rows={2} height="h-16" /></div>
          ) : rows.length === 0 ? (
            <div className="p-5">
              <EmptyState icon="file" title="ยังไม่มีประวัติ" hint="ลองเช็กบริษัทแรกของคุณ" action={<Link href="/jobseeker/new" className="ws-btn-primary ws-btn-sm">เช็กบริษัท</Link>} />
            </div>
          ) : (
            <ul className="divide-y divide-ws-border">
              {rows.map((o) => (
                <li key={o.code} className="flex items-center justify-between gap-3 px-4 py-3 md:px-5">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-ws-ink">{o.orgLabel}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ws-muted">
                      <span className="ws-mono">{o.code}</span>
                      <span>{fmtDate(o.createdAt)}</span>
                      <span className="ws-mono">{baht(o.total)}</span>
                      {o.status === 'ready' ? <Badge tone="success" dot>{o.paymentMethod === 'credit' ? 'สิทธิ์ทดลอง' : 'พร้อมแล้ว'}</Badge> : <Badge tone="warn" dot>รอชำระ</Badge>}
                    </div>
                  </div>
                  <button onClick={() => open(o)} disabled={o.status !== 'ready'} className="ws-btn-soft ws-btn-sm flex-none">
                    ดูรายงาน
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="ข้อมูลดวงที่ระบบจำไว้" description="ครั้งต่อไปไม่ต้องกรอกวันเกิดใหม่" action={<Link href="/jobseeker/profile" className="ws-btn-ghost ws-btn-sm">จัดการ</Link>}>
          {profiles.isPending ? (
            <Skeleton rows={1} height="h-12" />
          ) : !me ? (
            <p className="text-sm text-ws-muted">ยังไม่มี — เช็กบริษัทแรกแล้วระบบจะจำให้อัตโนมัติ</p>
          ) : (
            <div className="rounded-lg bg-ws-raised px-3 py-2.5">
              <div className="text-sm font-medium text-ws-ink">{me.name}</div>
              <div className="text-xs text-ws-muted">
                เกิด {isoToDisplay(me.birthDate)}{me.birthTime ? ` ${me.birthTime}` : ''}{me.placeLabel || me.province ? ` · ${me.placeLabel || me.province}` : ''}
              </div>
            </div>
          )}
          <p className="mt-3 text-[11px] text-ws-faint">ข้อมูลส่วนบุคคลของคุณแยกขาดจากฝั่งองค์กร · ลบได้ตลอดเวลา (PDPA)</p>
        </Panel>
      </div>
    </>
  )
}
