'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ElementIcon } from '@/components/element-icon'
import { RequireLogin } from '@/components/require-login'
import { RoleBadge } from '@/components/role-badge'
import { RoleCapabilities } from '@/components/role-capabilities'
import type { OrderRecord } from '@/lib/api'
import { isoToDisplay } from '@/components/date-input'
import { useDeleteProfile, useOrders, useSavedProfiles } from '@/lib/queries'
import { thb } from '@/lib/pricing'
import { useSession } from '@/lib/session'
import { saveCurrentOrder } from '@/lib/store'

export default function JobSeekerDashboardPage() {
  return (
    <RequireLogin path="/jobseeker/dashboard">
      <JobSeekerDashboard />
    </RequireLogin>
  )
}

function JobSeekerDashboard() {
  const router = useRouter()
  const { user } = useSession()
  const { data: orders, isPending, error } = useOrders('jobseeker')

  function openReport(order: OrderRecord) {
    saveCurrentOrder(order)
    router.push('/report')
  }

  const rows = orders ?? []

  return (
    <div className="container-page py-10 md:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow">Job Seeker · Dashboard</span>
          <h1 className="mt-2 text-3xl">บริษัทที่คุณเช็ก</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-soft">
            เข้าใช้โดย {user?.name}
            {user && <RoleBadge user={user} />}
          </p>
        </div>
        <Link href="/jobseeker/new" className="btn-primary">
          + เช็กบริษัทใหม่
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Stat el="water" label="โควตาสัปดาห์นี้" value={`${Math.min(rows.length, 3)} / 3`} sub="รีเซ็ตทุกวันจันทร์" />
        <Stat el="metal" label="แพ็กเกจ" value="Pay-per-view" sub="199 บาท/ครั้ง · รายเดือน 399" />
        <Stat el="wood" label="เช็กทั้งหมด" value={isPending ? '—' : String(rows.length)} sub="ตลอดการใช้งาน" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="rounded-xl border border-line bg-card p-6 shadow-soft">
          <h2 className="text-xl">ประวัติการเช็ก</h2>

          {error && (
            <p className="mt-4 rounded-lg border border-terracotta/40 bg-terracotta/[0.07] px-4 py-2.5 text-sm text-terracotta">
              {error.message}
            </p>
          )}

          {isPending ? (
            <div className="mt-4 space-y-3" aria-hidden="true">
              {[0, 1].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-lg bg-paper-warm" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="mt-6 rounded-lg border border-dashed border-line bg-paper-warm/40 p-8 text-center">
              <p className="text-sm text-ink-soft">ยังไม่มีประวัติ — ลองเช็กบริษัทแรกของคุณ</p>
              <Link href="/jobseeker/new" className="btn-ghost mt-4 !py-2 text-sm">
                เช็กบริษัท
              </Link>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {rows.map((order) => (
                <div
                  key={order.code}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-cloud p-4"
                >
                  <div>
                    <div className="font-medium text-ink">{order.orgLabel}</div>
                    <div className="text-xs text-muted">
                      รหัส {order.code} · ยอดชำระ {thb(order.total)} ฿ ·{' '}
                      {new Date(order.createdAt).toLocaleDateString('th-TH', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-jade">
                      {order.status === 'ready' ? 'พร้อมแล้ว' : 'รอชำระเงิน'}
                    </span>
                    <button
                      onClick={() => openReport(order)}
                      disabled={order.status !== 'ready'}
                      className="btn-ghost !px-4 !py-2 text-xs disabled:opacity-50"
                    >
                      ดูรายงาน
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="space-y-6">
          {/* F-25 — ข้อมูลของตัวเองที่ระบบจำไว้ ไม่ต้องกรอกวันเกิดใหม่ทุกครั้งที่เช็กบริษัท */}
          <MyProfileCard />
          {user && <RoleCapabilities user={user} />}
        </div>
      </div>
    </div>
  )
}

function MyProfileCard() {
  const { data: profiles = [], isPending } = useSavedProfiles('self')
  const deleteProfile = useDeleteProfile()

  return (
    <div className="rounded-xl border border-line bg-card p-6 shadow-soft">
      <h2 className="text-lg">ข้อมูลที่ระบบจำไว้</h2>
      <p className="mt-2 text-sm text-ink-soft">
        วัน-เวลา-สถานที่เกิดของคุณถูกบันทึกไว้ตอนเช็กครั้งแรก — ครั้งต่อไปเลือกใช้ซ้ำได้เลย
      </p>

      {isPending ? (
        <div className="mt-3 h-14 animate-pulse rounded-lg bg-paper-warm" aria-hidden="true" />
      ) : profiles.length === 0 ? (
        <p className="mt-3 rounded-lg border border-dashed border-line bg-paper-warm/40 p-4 text-xs text-muted">
          ยังไม่มี — เช็กบริษัทแรกแล้วระบบจะจำข้อมูลของคุณไว้ให้เอง
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className="flex items-center justify-between gap-3 rounded-lg bg-paper-warm/50 px-3 py-2"
            >
              <div className="min-w-0">
                <div className="truncate text-sm text-ink">{profile.name}</div>
                <div className="text-[11px] text-muted">
                  เกิด {isoToDisplay(profile.birthDate)}
                  {profile.birthTime ? ` ${profile.birthTime}` : ''}
                  {profile.placeLabel || profile.province ? ` · ${profile.placeLabel || profile.province}` : ''}
                </div>
              </div>
              <button
                onClick={() => void deleteProfile.mutateAsync(profile.id).catch(() => undefined)}
                className="flex-none text-[11px] text-muted hover:text-terracotta hover:underline"
              >
                ลบ
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 text-[11px] text-muted">
        ลบได้ตลอดเวลา — ข้อมูลนี้เป็นของคุณ (PDPA)
      </p>
    </div>
  )
}

function Stat({ el, label, value, sub }: { el: 'metal' | 'water' | 'wood'; label: string; value: string; sub: string }) {
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
