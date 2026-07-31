'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ElementIcon } from '@/components/element-icon'
import { loadOrder, type StoredOrder } from '@/lib/store'

interface Row {
  code: string
  company: string
  element: string
  score: number
  date: string
}

const MOCK_ROWS: Row[] = [
  { code: 'PJX-2XKD-9MRT', company: 'บมจ. รุ่งเรืองโลจิสติกส์', element: 'น้ำ', score: 81, date: '29 ก.ค. 2026' },
  { code: 'PJX-7GHN-QW3B', company: 'บจก. ไฟร์เวิร์ค เอเจนซี', element: 'ไฟ', score: 58, date: '25 ก.ค. 2026' },
]

export default function JobSeekerDashboard() {
  const [order, setOrder] = useState<StoredOrder | null>(null)
  useEffect(() => setOrder(loadOrder()), [])

  const rows: Row[] = [
    ...(order?.product === 'jobseeker'
      ? [
          {
            code: order.accessCode,
            company: (order.input.org.mode === 'company-date' && order.input.org.companyName) || 'บริษัทที่สนใจ',
            element: '—',
            score: 0,
            date: 'วันนี้',
          },
        ]
      : []),
    ...MOCK_ROWS,
  ]

  return (
    <div className="container-page py-10 md:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow">Job Seeker · Dashboard</span>
          <h1 className="mt-2 text-3xl">บริษัทที่คุณเช็ก</h1>
        </div>
        <Link href="/jobseeker/new" className="btn-primary">+ เช็กบริษัทใหม่</Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Stat el="water" label="โควตาสัปดาห์นี้" value={`${Math.min(rows.length, 3)} / 3`} sub="รีเซ็ตทุกวันจันทร์" />
        <Stat el="metal" label="สมาชิก" value="399/เดือน" sub="ต่ออายุ 3 ส.ค. 2026" />
        <Stat el="wood" label="เช็กทั้งหมด" value={`${rows.length}`} sub="ตลอดการใช้งาน" />
      </div>

      <div className="mt-8 rounded-xl border border-line bg-card p-6 shadow-soft">
        <h2 className="text-xl">ประวัติการเช็ก</h2>
        <div className="mt-4 space-y-3">
          {rows.map((r) => (
            <div key={r.code} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-cloud p-4">
              <div>
                <div className="font-medium text-ink">{r.company}</div>
                <div className="text-xs text-muted">ธาตุองค์กร: {r.element} · เช็กเมื่อ {r.date}</div>
              </div>
              <div className="flex items-center gap-4">
                {r.score > 0 ? (
                  <div className="text-right">
                    <div className="font-display-en text-xl font-semibold text-ink">{r.score}</div>
                    <div className="text-[10px] text-muted">合 Index</div>
                  </div>
                ) : (
                  <span className="text-xs text-jade">พร้อมแล้ว</span>
                )}
                <Link href="/report" className="btn-ghost !px-4 !py-2 text-xs">ดูรายงาน</Link>
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-6 text-center text-xs text-muted">เวอร์ชันสาธิต — ข้อมูลบางส่วนเป็นตัวอย่าง (mock) ไม่ได้บันทึกจริง</p>
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
