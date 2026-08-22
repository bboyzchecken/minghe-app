'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { ElementIcon } from '@/components/element-icon'
import { RequireLogin } from '@/components/require-login'
import { RoleBadge } from '@/components/role-badge'
import { OrgMembersCard } from '@/components/org-members-card'
import { RoleCapabilities } from '@/components/role-capabilities'
import type { OrderRecord, SavedProfile } from '@/lib/api'
import { useOrders, useSavedProfiles, useTeams } from '@/lib/queries'
import { useSession } from '@/lib/session'
import { thb } from '@/lib/pricing'
import { saveCurrentOrder } from '@/lib/store'

export default function EmployerDashboardPage() {
  return (
    <RequireLogin path="/employer/dashboard">
      <EmployerDashboard />
    </RequireLogin>
  )
}

function EmployerDashboard() {
  const router = useRouter()
  const { user } = useSession()
  const { data: orders, isPending, error } = useOrders('employer')

  const openReport = useCallback(
    (order: OrderRecord) => {
      saveCurrentOrder(order)
      router.push('/report')
    },
    [router],
  )

  const rows = orders ?? []
  const readyThisWeek = rows.filter((o) => o.status === 'ready').length

  return (
    <div className="container-page py-10 md:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow">Employer · Dashboard</span>
          <h1 className="mt-2 text-3xl">ภาพรวมองค์กร</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-soft">
            {user?.organizationName ?? 'บัญชีองค์กร'} · เข้าใช้โดย {user?.name}
            {user && <RoleBadge user={user} />}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/employer/memory" className="btn-ghost !py-2 text-sm">
            คลังข้อมูล
          </Link>
          <Link href="/employer/new" className="btn-primary">
            + วิเคราะห์ candidate ใหม่
          </Link>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard el="metal" label="โควตาสัปดาห์นี้" value={`${Math.min(readyThisWeek, 6)} / 6`} sub="รีเซ็ตทุกวันจันทร์" />
        <StatCard el="water" label="แพ็กเกจ" value="Employer" sub="699 บาท/เดือน" />
        <StatCard el="wood" label="รายงานทั้งหมด" value={isPending ? '—' : String(rows.length)} sub="ตลอดการใช้งาน" />
        <StatCard el="fire" label="ผลิตภัณฑ์" value="Fit Report" sub="ปาจือ + ทีม" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="rounded-xl border border-line bg-card p-6 shadow-soft">
          <h2 className="text-xl">ประวัติการวิเคราะห์</h2>

          {error && (
            <p className="mt-4 rounded-lg border border-terracotta/40 bg-terracotta/[0.07] px-4 py-2.5 text-sm text-terracotta">
              {error.message}
            </p>
          )}

          {isPending ? (
            <div className="mt-4 space-y-2" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-11 animate-pulse rounded-lg bg-paper-warm" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="mt-6 rounded-lg border border-dashed border-line bg-paper-warm/40 p-8 text-center">
              <p className="text-sm text-ink-soft">ยังไม่มีรายงาน — เริ่มวิเคราะห์ candidate คนแรกได้เลย</p>
              <Link href="/employer/new" className="btn-ghost mt-4 !py-2 text-sm">
                เริ่มวิเคราะห์
              </Link>
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs text-muted">
                    <th className="pb-2 font-medium">ผู้ถูกวิเคราะห์</th>
                    <th className="pb-2 font-medium">ฝ่ายองค์กร</th>
                    <th className="pb-2 font-medium">ยอดชำระ</th>
                    <th className="pb-2 font-medium">สถานะ</th>
                    <th className="pb-2 font-medium">รหัสเปิด</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((order) => (
                    <tr key={order.code} className="border-b border-line/60 last:border-0">
                      <td className="py-3 text-ink">{order.subjectName}</td>
                      <td className="py-3 text-ink-soft">{order.orgLabel}</td>
                      <td className="py-3 text-ink-soft">{thb(order.total)} ฿</td>
                      <td className="py-3">
                        <StatusChip status={order.status} />
                      </td>
                      <td className="py-3">
                        {order.status === 'ready' ? (
                          <button
                            onClick={() => openReport(order)}
                            className="font-body-en text-xs text-gold hover:underline"
                          >
                            {order.code}
                          </button>
                        ) : (
                          <span className="font-body-en text-xs text-muted">{order.code}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {user && <RoleCapabilities user={user} />}

          {/* F-25 — สรุปคลังข้อมูลจริง ไม่ใช่ข้อความบรรยายเปล่า ๆ */}
          <MemorySummaryCard organizationName={user?.organizationName} />

          {/* F-05 — สมาชิกจริง + ฟอร์มเชิญ (จุดที่เจ้าของกับ HR ต่างกันชัดที่สุด) */}
          {user && <OrgMembersCard user={user} />}
        </div>
      </div>
    </div>
  )
}

function StatusChip({ status }: { status: OrderRecord['status'] }) {
  const meta =
    status === 'ready'
      ? { th: 'พร้อมแล้ว', color: '#7B8B57' }
      : { th: 'รอชำระเงิน', color: '#BE8A2E' }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: meta.color }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
      {meta.th}
    </span>
  )
}

function StatCard({ el, label, value, sub }: { el: 'metal' | 'water' | 'wood' | 'fire'; label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-line bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted">{label}</span>
        <ElementIcon element={el} size={18} />
      </div>
      <div className="mt-2 text-2xl font-semibold text-ink">{value}</div>
      <div className="text-xs text-muted">{sub}</div>
    </div>
  )
}

/**
 * สรุปว่าคลังข้อมูลมีอะไรอยู่จริงบ้าง แล้วพาไปหน้าจัดการ (F-25)
 * ตัวเลขมาจากแหล่งข้อมูลเดียวกับหน้าคลัง จึงไม่มีทางบอกไม่ตรงกัน
 */
function MemorySummaryCard({ organizationName }: { organizationName?: string }) {
  const { data: profiles = [], isPending } = useSavedProfiles()
  const { data: teams = [] } = useTeams()
  const count = (kind: SavedProfile['kind']) => profiles.filter((p) => p.kind === kind).length

  return (
    <div className="rounded-xl border border-line bg-card p-6 shadow-soft">
      <div className="flex items-center justify-between">
        <h2 className="text-lg">คลังข้อมูลองค์กร</h2>
        <Link href="/employer/memory" className="text-xs text-gold hover:underline">
          จัดการ →
        </Link>
      </div>
      <p className="mt-2 text-sm text-ink-soft">
        ระบบจำโปรไฟล์และทีมที่เคยกรอกไว้ให้ — เลือกใช้ซ้ำได้ในการวิเคราะห์ครั้งถัดไป
      </p>

      <div className="mt-3 space-y-3">
        <MemoryRow icon="earth" title="Company Profile" detail={organizationName ?? 'ยังไม่ได้ตั้งค่า'} />
        <MemoryRow
          icon="water"
          title="โปรไฟล์ที่บันทึกไว้"
          detail={
            isPending
              ? 'กำลังโหลด…'
              : profiles.length === 0
                ? 'ยังไม่มี — บันทึกอัตโนมัติเมื่อสั่งวิเคราะห์ครั้งแรก'
                : `${profiles.length} คน · ผู้บริหาร ${count('executive')} · พนักงาน ${count('employee')} · ผู้สมัคร ${count('candidate')}`
          }
        />
        <MemoryRow
          icon="wood"
          title="Team Roster"
          detail={teams.length === 0 ? 'ยังไม่มีทีม — ตั้งทีมแรกได้ในหน้าคลังข้อมูล' : `${teams.length} ทีม`}
        />
      </div>
    </div>
  )
}

function MemoryRow({
  icon,
  title,
  detail,
}: {
  icon: 'earth' | 'water' | 'wood'
  title: string
  detail: string
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-paper-warm/50 p-3">
      <ElementIcon element={icon} size={18} />
      <div>
        <div className="text-sm font-medium text-ink">{title}</div>
        <div className="text-xs text-ink-soft">{detail}</div>
      </div>
    </div>
  )
}
