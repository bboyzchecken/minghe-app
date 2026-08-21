'use client'

/**
 * Admin Console — ศูนย์กลางงานหลังบ้านของทีม Mìnghé
 *
 * ออกแบบรอบ "แอดมินหลายคนทำงานพร้อมกัน":
 *   - ทุกงานแสดง "ผู้รับผิดชอบ" เสมอ — เห็นทันทีว่างานไหนว่าง งานไหนมีคนถือ
 *   - ต้อง "รับเรื่อง" ก่อนจึงดำเนินการ/ส่งมอบได้ งานของคนอื่นกดแล้วโดนระบบกัน (409)
 *   - ตัวกรอง "งานของฉัน" ให้แต่ละคนโฟกัสเฉพาะงานตัวเอง
 *
 * ข้อมูลทุกแท็บมาจาก TanStack Query (lib/queries.ts) — คิวงานดึงใหม่ทุก 30 วินาที
 * และทุก action จะ invalidate ให้เห็นสถานะล่าสุดเสมอ ไม่ว่าจะสำเร็จหรือโดนกัน
 */

import Link from 'next/link'
import { useState } from 'react'
import { RequireLogin } from '@/components/require-login'
import type { AdminLegalDoc, AdminOrder, AdminOverview, AdminUserRow } from '@/lib/api'
import { IS_MOCK } from '@/lib/env'
import {
  useAdminLegal,
  useAdminOrderAction,
  useAdminOrders,
  useAdminOverview,
  useAdminSetUserStatus,
  useAdminUsers,
  useRefreshAdmin,
  type AdminOrderAction,
} from '@/lib/queries'
import { ROLE_META } from '@/lib/roles'
import { useSession } from '@/lib/session'
import { thb } from '@/lib/pricing'

type Tab = 'overview' | 'queue' | 'users' | 'legal'
type QueueFilter = 'all' | 'paid' | 'processing' | 'mine'

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'ภาพรวม' },
  { id: 'queue', label: 'คิวงาน' },
  { id: 'users', label: 'ผู้ใช้' },
  { id: 'legal', label: 'เอกสารกฎหมาย' },
]

export default function AdminPage() {
  return (
    <RequireLogin path="/admin">
      <AdminGate />
    </RequireLogin>
  )
}

/** ชั้นกันคนผิดฝั่ง — บัญชีที่ไม่ใช่แอดมินเห็นคำอธิบาย ไม่ใช่หน้าว่างหรือ error ลอย ๆ */
function AdminGate() {
  const { user } = useSession()
  if (user?.side !== 'admin') {
    return (
      <div className="container-page flex min-h-[50vh] flex-col items-center justify-center gap-3 py-20 text-center">
        <span className="cjk text-2xl text-gold">命合</span>
        <p className="font-medium text-ink">หน้านี้สำหรับผู้ดูแลระบบเท่านั้น</p>
        <p className="max-w-sm text-sm text-ink-soft">
          บัญชีของคุณ ({user?.email}) เป็นบัญชีฝั่ง{user?.side === 'employer' ? 'องค์กร' : 'คนทำงาน'} —
          กลับไปยังหน้าหลักของคุณได้เลย
        </p>
        <Link href={user?.side === 'jobseeker' ? '/jobseeker/dashboard' : '/employer/dashboard'} className="btn-primary mt-2">
          ไปหน้า Dashboard ของฉัน
        </Link>
      </div>
    )
  }
  return <AdminConsole />
}

/** ข้อความผลลัพธ์ล่าสุดของ action — แชร์ให้ทุกแท็บผ่าน props */
interface Feedback {
  notice: string | null
  error: string | null
  set: (next: Partial<Feedback>) => void
}

function AdminConsole() {
  const { user } = useSession()
  const [tab, setTab] = useState<Tab>('overview')
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const refresh = useRefreshAdmin()

  const overview = useAdminOverview()
  const orders = useAdminOrders()

  const feedback: Feedback = {
    notice,
    error,
    set: (next) => {
      if ('notice' in next) setNotice(next.notice ?? null)
      if ('error' in next) setError(next.error ?? null)
    },
  }

  const loadError = overview.error ?? orders.error
  const myTasks = (orders.data ?? []).filter((o) => o.assigneeIsMe && o.status !== 'delivered')

  return (
    <div className="pb-16">
      {/* แถบหัวโทนเข้ม — บอกชัดว่าออกจากหน้าลูกค้า เข้าสู่หลังบ้านแล้ว */}
      <div className="bg-ink text-paper">
        <div className="container-page flex flex-wrap items-center justify-between gap-3 py-5">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="cjk text-xl text-gold-soft">命合</span>
              <h1 className="text-2xl text-paper">Admin Console</h1>
            </div>
            <p className="mt-1 text-sm text-paper/70">
              {user?.name} · {ROLE_META.admin.tagline}
            </p>
          </div>
          <button onClick={() => void refresh()} className="btn border border-paper/30 !py-2 text-sm text-paper hover:bg-paper/10">
            ⟳ รีเฟรชข้อมูล
          </button>
        </div>

        {/* แท็บ */}
        <div className="container-page flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`whitespace-nowrap rounded-t-lg px-4 py-2.5 text-sm transition ${
                tab === t.id
                  ? 'bg-paper font-medium text-ink'
                  : 'text-paper/65 hover:bg-paper/10 hover:text-paper'
              }`}
            >
              {t.label}
              {t.id === 'queue' && overview.data && overview.data.orders.paid > 0 && (
                <span className="ml-1.5 rounded-full bg-terracotta px-1.5 py-0.5 text-[10px] font-semibold text-paper">
                  {overview.data.orders.paid}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="container-page pt-6">
        {(error || loadError) && (
          <p className="mb-4 rounded-lg border border-terracotta/40 bg-terracotta/[0.07] px-4 py-2.5 text-sm text-terracotta">
            {error ?? loadError?.message}
          </p>
        )}
        {notice && (
          <p className="mb-4 rounded-lg border border-jade/40 bg-jade/[0.07] px-4 py-2.5 text-sm text-jade">
            {notice}
          </p>
        )}

        {tab === 'overview' && (
          <OverviewTab overview={overview.data ?? null} myTasks={myTasks} goQueue={() => setTab('queue')} />
        )}
        {tab === 'queue' && <QueueTab orders={orders.data ?? null} feedback={feedback} />}
        {tab === 'users' && <UsersTab meEmail={user?.email ?? ''} feedback={feedback} />}
        {tab === 'legal' && <LegalTab />}

        {IS_MOCK && (
          <p className="mt-8 text-center text-xs text-muted">
            โหมดสาธิต — คิวงานจำลอง มี “สมหมาย (แอดมินกะเช้า)” ถืองานอยู่ ให้ลองกดงานของเขาดูว่าระบบกันอย่างไร
          </p>
        )}
      </div>
    </div>
  )
}

/* ── ภาพรวม ─────────────────────────────────────────────── */

function OverviewTab({
  overview,
  myTasks,
  goQueue,
}: {
  overview: AdminOverview | null
  myTasks: AdminOrder[]
  goQueue: () => void
}) {
  if (!overview) return <Skeleton rows={2} />
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="รอดำเนินการ" value={overview.orders.paid} accent="#BE8A2E" hint="ชำระเงินแล้ว รอรับเรื่อง" />
        <Stat label="กำลังดำเนินการ" value={overview.orders.processing} accent="#5E9BB5" hint="ตั้งเสา / รอซินแสตรวจ" />
        <Stat label="ส่งมอบแล้ว" value={overview.orders.delivered} accent="#7B8B57" hint="ลูกค้าเปิดอ่านได้" />
        <Stat label="ผู้ใช้ active" value={overview.usersActive} accent="#2b2b2b" hint={`จากทั้งหมด ${overview.usersTotal} บัญชี`} />
        <Stat
          label="เอกสารเผยแพร่"
          value={`${overview.legalPublished}/${overview.legalTotal}`}
          accent={overview.legalPublished < overview.legalTotal ? '#C25E4C' : '#7B8B57'}
          hint={overview.legalPublished < overview.legalTotal ? 'ยังไม่ครบ — บล็อก payment gateway' : 'ครบแล้ว'}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-xl border border-line bg-card p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <h2 className="text-lg">งานของฉัน</h2>
            <button onClick={goQueue} className="text-sm text-gold hover:underline">
              ไปที่คิวงาน →
            </button>
          </div>
          {myTasks.length === 0 ? (
            <p className="mt-4 rounded-lg border border-dashed border-line bg-paper-warm/40 p-6 text-center text-sm text-ink-soft">
              ยังไม่มีงานในมือ — ไปกด “รับเรื่อง” จากคิวกลางได้เลย
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              {myTasks.map((o) => (
                <div key={o.id} className="flex items-center justify-between rounded-lg border border-line bg-cloud px-4 py-3">
                  <div>
                    <span className="font-body-en text-sm font-medium text-ink">{o.code}</span>
                    <span className="ml-2 text-sm text-ink-soft">{o.subjectName} × {o.orgLabel}</span>
                  </div>
                  <StatusChip status={o.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ขอบเขตหน้าที่ — ตอบตรงคำถาม UAT ว่า "แอดมินจัดการอะไรได้บ้าง" */}
        <div className="rounded-xl border border-line bg-card p-6 shadow-soft">
          <h2 className="text-lg">แอดมินจัดการอะไรได้บ้าง</h2>
          <ul className="mt-3 space-y-2">
            {ROLE_META.admin.can.map((c) => (
              <li key={c} className="flex items-start gap-2 text-sm text-ink-soft">
                <span className="mt-0.5 flex-none text-jade">✓</span>
                {c}
              </li>
            ))}
            {ROLE_META.admin.cant.map((c) => (
              <li key={c} className="flex items-start gap-2 text-sm text-ink-soft">
                <span className="mt-0.5 flex-none text-terracotta">✕</span>
                {c}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

/* ── คิวงาน ─────────────────────────────────────────────── */

const QUEUE_FILTERS: { id: QueueFilter; label: string }[] = [
  { id: 'all', label: 'ทั้งหมด' },
  { id: 'paid', label: 'รอดำเนินการ' },
  { id: 'processing', label: 'กำลังดำเนินการ' },
  { id: 'mine', label: 'งานของฉัน' },
]

function QueueTab({ orders, feedback }: { orders: AdminOrder[] | null; feedback: Feedback }) {
  const [filter, setFilter] = useState<QueueFilter>('all')
  const action = useAdminOrderAction()

  if (!orders) return <Skeleton rows={4} />

  const rows = orders.filter((o) => {
    if (filter === 'mine') return o.assigneeIsMe
    if (filter === 'paid' || filter === 'processing') return o.status === filter
    return true
  })

  /** ทุก action ผ่านทางเดียว: ทำ → (hook invalidate ให้) → ถ้าโดนกัน (งานของคนอื่น) แสดงเหตุผล */
  function run(kind: AdminOrderAction, id: string, successNote: string) {
    feedback.set({ notice: null, error: null })
    action.mutate(
      { action: kind, id },
      {
        onSuccess: () => feedback.set({ notice: successNote }),
        onError: (e) => feedback.set({ error: e instanceof Error ? e.message : 'ทำรายการไม่สำเร็จ' }),
      },
    )
  }

  return (
    <div className="rounded-xl border border-line bg-card p-6 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg">คิวคำสั่งซื้อ</h2>
        <div className="flex gap-1.5">
          {QUEUE_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                filter === f.id
                  ? 'border-gold bg-gold/[0.08] font-medium text-gold'
                  : 'border-line text-ink-soft hover:border-gold/40'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-1 text-xs text-muted">
        กติกา: กด “รับเรื่อง” เพื่อจองงานไว้กับตัวเอง — งานที่คนอื่นถืออยู่จะดำเนินการแทนไม่ได้ กันทำงานซ้อนกัน
      </p>

      {rows.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-line bg-paper-warm/40 p-8 text-center text-sm text-ink-soft">
          ไม่มีงานในหมวดนี้
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="pb-2 pr-3 font-medium">รหัส</th>
                <th className="pb-2 pr-3 font-medium">งาน</th>
                <th className="pb-2 pr-3 font-medium">ลูกค้า</th>
                <th className="pb-2 pr-3 font-medium">ยอด</th>
                <th className="pb-2 pr-3 font-medium">สถานะ</th>
                <th className="pb-2 pr-3 font-medium">ผู้รับผิดชอบ</th>
                <th className="pb-2 font-medium">การทำงาน</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id} className={`border-b border-line/60 last:border-0 ${o.assigneeIsMe ? 'bg-gold/[0.04]' : ''}`}>
                  <td className="py-3 pr-3">
                    <span className="font-body-en text-xs text-ink">{o.code}</span>
                    {o.express && <span className="ml-1.5 rounded bg-terracotta/10 px-1 py-0.5 text-[10px] font-medium text-terracotta">ด่วน</span>}
                  </td>
                  <td className="py-3 pr-3 text-ink">
                    {o.subjectName}
                    <span className="block text-xs text-muted">{o.orgLabel}</span>
                  </td>
                  <td className="py-3 pr-3">
                    <span className="font-body-en text-xs text-ink-soft">{o.customerEmail}</span>
                    <span className="block text-[10px] text-muted">{o.product === 'employer' ? 'ฝั่งองค์กร' : 'ฝั่งคนทำงาน'}</span>
                  </td>
                  <td className="py-3 pr-3 text-ink-soft">{thb(o.total)} ฿</td>
                  <td className="py-3 pr-3"><StatusChip status={o.status} /></td>
                  <td className="py-3 pr-3">
                    {o.assignee ? (
                      <span className={`text-xs ${o.assigneeIsMe ? 'font-medium text-gold' : 'text-ink-soft'}`}>
                        {o.assigneeIsMe ? 'ฉัน' : o.assignee}
                      </span>
                    ) : (
                      <span className="text-xs text-muted">— ว่าง —</span>
                    )}
                  </td>
                  <td className="py-3">
                    <RowActions order={o} run={run} busy={action.isPending} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/**
 * ปุ่ม action ต่อแถว — แสดงเฉพาะสิ่งที่ "ทำได้จริง" ตามสถานะและผู้ถืองาน
 * งานของแอดมินคนอื่นจะเห็นแค่ป้าย ไม่มีปุ่มให้กดพลาด
 */
function RowActions({
  order,
  run,
  busy,
}: {
  order: AdminOrder
  run: (kind: AdminOrderAction, id: string, note: string) => void
  busy: boolean
}) {
  if (order.status === 'delivered') {
    return <span className="text-xs text-muted">ปิดงานแล้ว</span>
  }
  if (order.assignee && !order.assigneeIsMe) {
    return (
      <button
        disabled={busy}
        onClick={() => run('release', order.id, `คืนงาน ${order.code} เข้าคิวกลางแล้ว`)}
        className="text-xs text-muted underline-offset-2 hover:text-terracotta hover:underline disabled:opacity-50"
        title="ใช้เมื่อเจ้าของงานไม่อยู่ — คืนงานเข้าคิวกลางให้คนอื่นรับต่อ"
      >
        คืนเข้าคิว
      </button>
    )
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {!order.assignee && (
        <button
          disabled={busy}
          onClick={() => run('claim', order.id, `รับเรื่อง ${order.code} แล้ว — งานนี้เป็นของคุณ`)}
          className="rounded-md border border-gold/50 bg-gold/[0.08] px-2.5 py-1 text-xs font-medium text-gold hover:bg-gold/[0.15] disabled:opacity-50"
        >
          รับเรื่อง
        </button>
      )}
      {order.status === 'paid' && (
        <button
          disabled={busy}
          onClick={() => run('process', order.id, `เริ่มดำเนินการ ${order.code} แล้ว`)}
          className="rounded-md border border-line bg-cloud px-2.5 py-1 text-xs text-ink hover:border-gold/40 disabled:opacity-50"
        >
          เริ่มดำเนินการ
        </button>
      )}
      {order.status === 'processing' && order.assigneeIsMe && (
        <button
          disabled={busy}
          onClick={() => run('deliver', order.id, `ส่งมอบ ${order.code} เรียบร้อย`)}
          className="rounded-md border border-jade/50 bg-jade/[0.08] px-2.5 py-1 text-xs font-medium text-jade hover:bg-jade/[0.15] disabled:opacity-50"
        >
          ส่งมอบ
        </button>
      )}
      {order.assigneeIsMe && order.status !== 'processing' && (
        <button
          disabled={busy}
          onClick={() => run('release', order.id, `คืนงาน ${order.code} เข้าคิวกลางแล้ว`)}
          className="px-1 text-xs text-muted hover:text-terracotta disabled:opacity-50"
        >
          คืนงาน
        </button>
      )}
    </div>
  )
}

/* ── ผู้ใช้ ─────────────────────────────────────────────── */

function UsersTab({ meEmail, feedback }: { meEmail: string; feedback: Feedback }) {
  const { data: users } = useAdminUsers()
  const setStatus = useAdminSetUserStatus()
  if (!users) return <Skeleton rows={4} />

  function run(u: AdminUserRow, status: 'active' | 'deactivated') {
    feedback.set({ notice: null, error: null })
    setStatus.mutate(
      { id: u.id, status },
      {
        onSuccess: () =>
          feedback.set({ notice: status === 'active' ? `คืนสิทธิ์ ${u.email} แล้ว` : `ระงับบัญชี ${u.email} แล้ว` }),
        onError: (e) => feedback.set({ error: e instanceof Error ? e.message : 'ทำรายการไม่สำเร็จ' }),
      },
    )
  }

  return (
    <div className="rounded-xl border border-line bg-card p-6 shadow-soft">
      <h2 className="text-lg">บัญชีผู้ใช้ทั้งหมด</h2>
      <p className="mt-1 text-xs text-muted">
        การระงับมีผลทันทีทุก session — ผู้ใช้ที่ถูกระงับจะหลุดจากระบบตั้งแต่ request ถัดไป
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted">
              <th className="pb-2 pr-3 font-medium">ผู้ใช้</th>
              <th className="pb-2 pr-3 font-medium">บทบาท</th>
              <th className="pb-2 pr-3 font-medium">สถานะ</th>
              <th className="pb-2 font-medium">การทำงาน</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-line/60 last:border-0">
                <td className="py-3 pr-3">
                  <span className="text-ink">{u.name}</span>
                  <span className="block font-body-en text-xs text-muted">{u.email}</span>
                </td>
                <td className="py-3 pr-3">
                  <span className={`text-xs ${u.role === 'admin' ? 'font-medium text-ink' : 'text-ink-soft'}`}>
                    {u.role === 'admin' ? 'ผู้ดูแลระบบ' : 'ผู้ใช้ทั่วไป'}
                  </span>
                </td>
                <td className="py-3 pr-3">
                  <span className={`inline-flex items-center gap-1.5 text-xs ${u.status === 'active' ? 'text-jade' : 'text-terracotta'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${u.status === 'active' ? 'bg-jade' : 'bg-terracotta'}`} />
                    {u.status === 'active' ? 'ใช้งานอยู่' : 'ถูกระงับ'}
                  </span>
                </td>
                <td className="py-3">
                  {u.email === meEmail ? (
                    <span className="text-xs text-muted">บัญชีของคุณเอง</span>
                  ) : u.status === 'active' ? (
                    <button
                      disabled={setStatus.isPending}
                      onClick={() => run(u, 'deactivated')}
                      className="text-xs text-terracotta underline-offset-2 hover:underline disabled:opacity-50"
                    >
                      ระงับบัญชี
                    </button>
                  ) : (
                    <button
                      disabled={setStatus.isPending}
                      onClick={() => run(u, 'active')}
                      className="text-xs text-jade underline-offset-2 hover:underline disabled:opacity-50"
                    >
                      คืนสิทธิ์
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ── เอกสารกฎหมาย ───────────────────────────────────────── */

function LegalTab() {
  const { data: legal } = useAdminLegal()
  if (!legal) return <Skeleton rows={2} />
  return (
    <div className="rounded-xl border border-line bg-card p-6 shadow-soft">
      <h2 className="text-lg">เอกสารกฎหมาย (F-01)</h2>
      <p className="mt-1 text-xs text-muted">
        เอกสารทั้ง 4 ฉบับต้องเผยแพร่ครบก่อนยื่นขอ payment gateway —
        การเผยแพร่ต้องผ่านการตรวจโดยผู้รับผิดชอบก่อน จึงยังไม่มีปุ่ม publish บนหน้านี้
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {legal.map((d: AdminLegalDoc) => (
          <div key={d.slug} className="flex items-start justify-between gap-3 rounded-lg border border-line bg-cloud p-4">
            <div>
              <div className="text-sm font-medium text-ink">{d.title}</div>
              <div className="mt-0.5 font-body-en text-xs text-muted">
                /legal/{d.slug} · v{d.version}
              </div>
            </div>
            <span
              className={`flex-none rounded-full px-2.5 py-1 text-[11px] font-medium ${
                d.status === 'published' ? 'bg-jade/10 text-jade' : 'bg-terracotta/10 text-terracotta'
              }`}
            >
              {d.status === 'published' ? 'เผยแพร่แล้ว' : 'ฉบับร่าง'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── ชิ้นส่วนย่อย ───────────────────────────────────────── */

function Stat({ label, value, accent, hint }: { label: string; value: number | string; accent: string; hint: string }) {
  return (
    <div className="rounded-xl border border-line bg-card p-5 shadow-soft" style={{ borderTopWidth: 3, borderTopColor: accent }}>
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 text-3xl font-semibold text-ink">{value}</div>
      <div className="mt-0.5 text-xs text-muted">{hint}</div>
    </div>
  )
}

function StatusChip({ status }: { status: AdminOrder['status'] }) {
  const meta =
    status === 'paid'
      ? { th: 'รอดำเนินการ', color: '#BE8A2E' }
      : status === 'processing'
        ? { th: 'กำลังดำเนินการ', color: '#5E9BB5' }
        : status === 'delivered'
          ? { th: 'ส่งมอบแล้ว', color: '#7B8B57' }
          : { th: 'อื่น ๆ', color: '#8a8a8a' }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: meta.color }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
      {meta.th}
    </span>
  )
}

function Skeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-20 animate-pulse rounded-xl bg-paper-warm" />
      ))}
    </div>
  )
}
