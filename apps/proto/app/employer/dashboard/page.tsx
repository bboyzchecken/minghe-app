'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { ElementIcon } from '@/components/element-icon'
import { RequireLogin } from '@/components/require-login'
import { RoleBadge } from '@/components/role-badge'
import { RoleCapabilities } from '@/components/role-capabilities'
import { client, type OrderRecord } from '@/lib/api'
import { IS_MOCK } from '@/lib/env'
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
  const { user, token } = useSession()
  const [orders, setOrders] = useState<OrderRecord[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    let cancelled = false

    client
      .listOrders(token, 'employer')
      .then((list) => {
        if (!cancelled) setOrders(list)
      })
      .catch((e: Error) => {
        if (!cancelled) {
          setError(e.message)
          setOrders([])
        }
      })

    return () => {
      cancelled = true
    }
  }, [token])

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
        <Link href="/employer/new" className="btn-primary">
          + วิเคราะห์ candidate ใหม่
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard el="metal" label="โควตาสัปดาห์นี้" value={`${Math.min(readyThisWeek, 6)} / 6`} sub="รีเซ็ตทุกวันจันทร์" />
        <StatCard el="water" label="สมาชิก" value="Employer 699" sub="ต่ออายุ 1 ส.ค. 2026" />
        <StatCard el="wood" label="รายงานทั้งหมด" value={orders ? String(rows.length) : '—'} sub="ตลอดการใช้งาน" />
        <StatCard el="fire" label="ทีมในคลัง" value="3 คน" sub="Team Roster" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="rounded-xl border border-line bg-card p-6 shadow-soft">
          <h2 className="text-xl">ประวัติการวิเคราะห์</h2>

          {error && (
            <p className="mt-4 rounded-lg border border-terracotta/40 bg-terracotta/[0.07] px-4 py-2.5 text-sm text-terracotta">
              {error}
            </p>
          )}

          {orders === null ? (
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
          <div className="rounded-xl border border-line bg-card p-6 shadow-soft">
            <h2 className="text-lg">Profile Memory</h2>
            <div className="mt-3 space-y-3">
              <ProfileRow icon="earth" title="Company Profile" detail="บจก. ตัวอย่างโลจิสติกส์ · ก่อตั้ง 14/03/2015 · โลจิสติกส์ (น้ำ)" />
              <ProfileRow icon="water" title="Executive Profile" detail="สมชาย ผู้บริหาร · 13/09/1990 · 15:23 กรุงเทพฯ" />
            </div>
          </div>
          <div className="rounded-xl border border-line bg-card p-6 shadow-soft">
            <h2 className="text-lg">Team Roster</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {['สมชาย ผู้บริหาร', 'ปิยะ หัวหน้าทีม', 'ณัฐ พนักงาน'].map((n) => (
                <span key={n} className="chip">
                  {n}
                </span>
              ))}
            </div>
          </div>

          {/* สมาชิกองค์กร — จุดที่เจ้าของกับ HR ต่างกันชัดที่สุด */}
          <div className="rounded-xl border border-line bg-card p-6 shadow-soft">
            <h2 className="text-lg">สมาชิกองค์กร</h2>
            <div className="mt-3 space-y-2">
              <MemberRow name="คุณบัส" email="employer@demo.minghe.work" role="เจ้าของ" color="#b07d2b" />
              <MemberRow name="คุณแนน" email="hr@demo.minghe.work" role="HR" color="#5E9BB5" />
            </div>
            {user?.orgRole === 'hr' ? (
              <p className="mt-4 flex items-start gap-2 rounded-lg bg-paper-warm/60 px-3 py-2 text-xs text-muted">
                <span>🔒</span>
                การเพิ่ม/ลบสมาชิกสงวนไว้เฉพาะเจ้าของบัญชีองค์กร — ติดต่อคุณบัสหากต้องการเพิ่มคน
              </p>
            ) : (
              <button className="btn-ghost mt-4 w-full !py-2 text-sm" title="ฟอร์มเชิญสมาชิกจะมาในรอบถัดไป">
                + เชิญสมาชิกใหม่
              </button>
            )}
          </div>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-muted">
        {IS_MOCK
          ? 'โหมดสาธิต — ประวัติเก็บในเบราว์เซอร์เครื่องนี้'
          : 'โหมดใช้งานจริง — ประวัติดึงจากฐานข้อมูลผ่าน API'}
      </p>
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

function MemberRow({ name, email, role, color }: { name: string; email: string; role: string; color: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-paper-warm/50 px-3 py-2">
      <div>
        <div className="text-sm text-ink">{name}</div>
        <div className="font-body-en text-[11px] text-muted">{email}</div>
      </div>
      <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ color, background: `${color}14` }}>
        {role}
      </span>
    </div>
  )
}

function ProfileRow({ icon, title, detail }: { icon: 'earth' | 'water'; title: string; detail: string }) {
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
