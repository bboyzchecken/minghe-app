'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ElementIcon } from '@/components/element-icon'
import { loadOrder, type StoredOrder } from '@/lib/store'
import { thb } from '@/lib/pricing'

interface Row {
  code: string
  subject: string
  org: string
  score: number
  status: 'ready' | 'pending_review' | 'interpreting'
  date: string
}

const MOCK_ROWS: Row[] = [
  { code: 'PJX-K7QM-3PLA', subject: 'วีรภัทร', org: 'ผู้บริหาร (คุณบัส)', score: 78, status: 'ready', date: '30 ก.ค. 2026' },
  { code: 'PJX-9WDC-XR2E', subject: 'ปาริชาต', org: 'บจก. มงคลเทรด', score: 64, status: 'ready', date: '28 ก.ค. 2026' },
  { code: 'PJX-4HNB-QT8K', subject: 'ธนกร', org: 'อุตสาหกรรม: โลจิสติกส์', score: 0, status: 'pending_review', date: '31 ก.ค. 2026' },
]

const STATUS_LABEL: Record<Row['status'], { th: string; color: string }> = {
  ready: { th: 'พร้อมแล้ว', color: '#7B8B57' },
  pending_review: { th: 'รอซินแสตรวจ', color: '#BE8A2E' },
  interpreting: { th: 'กำลังตีความ', color: '#5E9BB5' },
}

export default function EmployerDashboard() {
  const [order, setOrder] = useState<StoredOrder | null>(null)
  useEffect(() => setOrder(loadOrder()), [])

  const rows: Row[] = [
    ...(order?.product === 'employer'
      ? [
          {
            code: order.accessCode,
            subject: order.input.subject.name,
            org: order.input.org.mode === 'executive' ? 'ผู้บริหาร' : order.input.org.mode === 'company-date' ? 'วันก่อตั้งบริษัท' : 'ธาตุอุตสาหกรรม',
            score: 0,
            status: 'ready' as const,
            date: 'วันนี้',
          },
        ]
      : []),
    ...MOCK_ROWS,
  ]
  const used = rows.filter((r) => r.status === 'ready').length

  return (
    <div className="container-page py-10 md:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow">Employer · Dashboard</span>
          <h1 className="mt-2 text-3xl">ภาพรวมองค์กร</h1>
        </div>
        <Link href="/employer/new" className="btn-primary">+ วิเคราะห์ candidate ใหม่</Link>
      </div>

      {/* stat cards */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard el="metal" label="โควตาสัปดาห์นี้" value={`${Math.min(used, 6)} / 6`} sub="รีเซ็ตทุกวันจันทร์" />
        <StatCard el="water" label="สมาชิก" value="Employer 699" sub="ต่ออายุ 1 ส.ค. 2026" />
        <StatCard el="wood" label="รายงานทั้งหมด" value={`${rows.length}`} sub="ตลอดการใช้งาน" />
        <StatCard el="fire" label="ทีมในคลัง" value="5 คน" sub="Team Roster" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* orders */}
        <div className="rounded-xl border border-line bg-card p-6 shadow-soft">
          <h2 className="text-xl">ประวัติการวิเคราะห์</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th className="pb-2 font-medium">ผู้ถูกวิเคราะห์</th>
                  <th className="pb-2 font-medium">ฝ่ายองค์กร</th>
                  <th className="pb-2 font-medium">合</th>
                  <th className="pb-2 font-medium">สถานะ</th>
                  <th className="pb-2 font-medium">รหัสเปิด</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.code} className="border-b border-line/60 last:border-0">
                    <td className="py-3 text-ink">คุณ{r.subject}</td>
                    <td className="py-3 text-ink-soft">{r.org}</td>
                    <td className="py-3 font-medium text-ink">{r.status === 'ready' && r.score ? r.score : '—'}</td>
                    <td className="py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: STATUS_LABEL[r.status].color }}>
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS_LABEL[r.status].color }} />
                        {STATUS_LABEL[r.status].th}
                      </span>
                    </td>
                    <td className="py-3">
                      {r.status === 'ready' ? (
                        <Link href="/report" className="font-body-en text-xs text-gold hover:underline">
                          {r.code}
                        </Link>
                      ) : (
                        <span className="font-body-en text-xs text-muted">{r.code}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* profiles */}
        <div className="space-y-6">
          <div className="rounded-xl border border-line bg-card p-6 shadow-soft">
            <h2 className="text-lg">Profile Memory</h2>
            <div className="mt-3 space-y-3">
              <ProfileRow icon="earth" title="Company Profile" detail="บจก. มงคลเทรด · ก่อตั้ง 2015 · โลจิสติกส์ (น้ำ)" />
              <ProfileRow icon="water" title="Executive Profile" detail="คุณบัส · 3 พ.ย. 2523 · 06:30 กรุงเทพฯ" />
            </div>
            <button className="btn-ghost mt-4 w-full !py-2 text-sm">แก้ไขโปรไฟล์</button>
          </div>
          <div className="rounded-xl border border-line bg-card p-6 shadow-soft">
            <h2 className="text-lg">Team Roster</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {['ธนโชติ', 'ศิริพร', 'วีรภัทร', 'ปาริชาต', 'ธนกร'].map((n) => (
                <span key={n} className="chip">{n}</span>
              ))}
            </div>
            <button className="btn-ghost mt-4 w-full !py-2 text-sm">จัดการทีม</button>
          </div>
        </div>
      </div>
      <p className="mt-6 text-center text-xs text-muted">เวอร์ชันสาธิต — ข้อมูลบางส่วนเป็นตัวอย่าง (mock) ไม่ได้บันทึกจริง</p>
    </div>
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
