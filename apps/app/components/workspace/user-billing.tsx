'use client'

/**
 * Bill & Payment ของผู้ใช้ (ใช้ร่วมกันฝั่งองค์กรและคนทำงาน)
 * - ใบเสร็จย้อนหลังทุกใบ เปิดดู/พิมพ์ได้
 * - สิทธิ์ทดลองที่แอดมินให้ (ถ้ามี) โชว์ชัดว่าใช้ได้กี่ครั้ง หมดอายุเมื่อไร
 * - แพ็กเกจปัจจุบันและช่องทางติดต่อเรื่องการเงิน
 */

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { PLANS, thb } from '@/lib/pricing'
import { useMyCredits, useMyPayments } from '@/lib/queries'
import { useSession } from '@/lib/session'
import { Icon } from './icons'
import { PaymentsTable } from './payments'
import { Badge, EmptyState, PRODUCT_LABEL, PageHeader, Panel, Segmented, Skeleton, StatTile, baht, fmtDate } from './ui'

type Filter = 'all' | 'paid' | 'refunded'

export function UserBillingPage({ side }: { side: 'employer' | 'jobseeker' }) {
  const { user } = useSession()
  const payments = useMyPayments()
  const credits = useMyCredits()
  const [filter, setFilter] = useState<Filter>('all')

  const rows = payments.data ?? []
  const shown = rows.filter((p) => (filter === 'all' ? true : filter === 'paid' ? p.status === 'paid' : p.status !== 'paid'))

  const summary = useMemo(() => {
    const now = new Date()
    const ym = now.toISOString().slice(0, 7)
    const total = rows.reduce((s, p) => s + p.amount - p.refundAmount, 0)
    const month = rows.filter((p) => p.paidAt.slice(0, 7) === ym).reduce((s, p) => s + p.amount - p.refundAmount, 0)
    const refunded = rows.reduce((s, p) => s + p.refundAmount, 0)
    return { total, month, refunded }
  }, [rows])

  const available = (credits.data ?? []).filter((c) => c.status === 'available' && (!c.expiresAt || new Date(c.expiresAt) > new Date()))
  const plan = PLANS[side]

  return (
    <>
      <PageHeader
        eyebrow={side === 'employer' ? (user?.organizationName ?? 'บัญชีองค์กร') : 'บัญชีส่วนบุคคล'}
        title="การชำระเงินและใบเสร็จ"
        description="ทุกครั้งที่ชำระเงินระบบออกใบเสร็จให้อัตโนมัติ — เปิดดูหรือพิมพ์ย้อนหลังได้ตลอดเวลา"
        actions={
          <Link href={side === 'employer' ? '/employer/new' : '/jobseeker/new'} className="ws-btn-primary">
            <Icon name="plus" size={15} /> {side === 'employer' ? 'วิเคราะห์ใหม่' : 'เช็กบริษัทใหม่'}
          </Link>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatTile label="ยอดเดือนนี้" value={baht(summary.month)} icon="wallet" tone="accent" hint={new Date().toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })} />
        <StatTile label="ยอดรวมทั้งหมด" value={baht(summary.total)} icon="receipt" hint={`${rows.length} ใบเสร็จ`} />
        <StatTile
          label="สิทธิ์ทดลองที่ใช้ได้"
          value={available.length}
          icon="gift"
          tone={available.length > 0 ? 'success' : 'neutral'}
          hint={available.length > 0 ? 'หักให้อัตโนมัติตอนชำระเงิน' : 'ไม่มี'}
        />
      </div>

      {available.length > 0 && (
        <Panel className="mb-5 border-ws-success/40 bg-ws-success-soft/40" padded>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-ws-success text-white">
                <Icon name="gift" size={18} />
              </span>
              <div>
                <div className="font-medium text-ws-ink">คุณมีสิทธิ์ใช้งานฟรี {available.length} ครั้ง</div>
                <ul className="mt-1 space-y-0.5 text-xs text-ws-soft">
                  {available.map((c) => (
                    <li key={c.id}>
                      ใช้กับ{PRODUCT_LABEL[c.product]}{c.depth ? ` · ระดับ ${c.depth}` : ''}{c.expiresAt ? ` · หมดอายุ ${fmtDate(c.expiresAt)}` : ''}
                      {c.grantedBy ? ` · จาก ${c.grantedBy}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <Link href={side === 'employer' ? '/employer/new' : '/jobseeker/new'} className="ws-btn-primary">
              ใช้สิทธิ์เลย <Icon name="arrow-right" size={15} />
            </Link>
          </div>
        </Panel>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <Panel
          title="ใบเสร็จย้อนหลัง"
          action={
            <Segmented
              value={filter}
              onChange={setFilter}
              options={[
                { id: 'all', label: 'ทั้งหมด', count: rows.length },
                { id: 'paid', label: 'ชำระแล้ว' },
                { id: 'refunded', label: 'คืนเงิน' },
              ]}
            />
          }
        >
          {payments.isPending ? (
            <Skeleton rows={3} />
          ) : payments.error ? (
            <p className="rounded-lg bg-ws-danger-soft px-3 py-2 text-sm text-ws-danger">{payments.error.message}</p>
          ) : (
            <PaymentsTable payments={shown} emptyHint="เมื่อชำระเงินครั้งแรก ใบเสร็จจะปรากฏที่นี่" />
          )}
        </Panel>

        <div className="space-y-5">
          <Panel title="แพ็กเกจ">
            <div className="flex items-baseline justify-between">
              <div className="font-medium text-ws-ink">{plan.name}</div>
              <Badge tone="neutral">Pay-per-use</Badge>
            </div>
            <p className="mt-1 text-xs text-ws-muted">
              ตอนนี้คิดเป็นรายครั้ง — แพ็กรายเดือน {thb(plan.price)} บาท ({plan.quota}) จะเปิดให้สมัครเมื่อระบบชำระเงินออนไลน์พร้อม
            </p>
            <Link href={side === 'employer' ? '/pricing/employer' : '/pricing/jobseeker'} className="ws-btn-ghost ws-btn-sm mt-3">
              ดูราคาทั้งหมด
            </Link>
          </Panel>

          <Panel title="มีปัญหาเรื่องการชำระเงิน?">
            <p className="text-xs text-ws-soft">
              แจ้งเลขที่ใบเสร็จมาที่ <span className="ws-mono text-ws-ink">info@minghe.work</span> หรือทางไลน์ ทีมงานตรวจสอบและดำเนินการคืนเงินตามนโยบายภายใน 7 วันทำการ
            </p>
            <Link href="/legal/refund" className="mt-2 inline-flex items-center gap-1 text-xs text-ws-accent hover:underline">
              นโยบายการคืนเงิน <Icon name="arrow-right" size={12} />
            </Link>
          </Panel>

          {summary.refunded > 0 && (
            <Panel title="คืนเงินแล้ว">
              <div className="ws-mono text-xl font-semibold text-ws-danger">{baht(summary.refunded)}</div>
              <p className="mt-1 text-xs text-ws-muted">รวมทุกรายการ</p>
            </Panel>
          )}
        </div>
      </div>

      {rows.length === 0 && !payments.isPending && (
        <div className="mt-5 hidden">
          <EmptyState title="ยังไม่มีรายการ" />
        </div>
      )}
    </>
  )
}
