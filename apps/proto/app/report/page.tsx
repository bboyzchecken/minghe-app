'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ReportView } from '@/components/report/report-view'
import { ElementIcon } from '@/components/element-icon'
import type { OrderRecord } from '@/lib/api'
import { buildReport, DEMO_INPUT, type ReportData } from '@/lib/report'
import { thb } from '@/lib/pricing'
import { loadCurrentOrder } from '@/lib/store'

interface State {
  report: ReportData
  order: OrderRecord | null
  error?: string
}

export default function ReportPage() {
  const [state, setState] = useState<State | null>(null)

  useEffect(() => {
    const order = loadCurrentOrder()
    try {
      // engine ปาจือทำงานในเบราว์เซอร์ — ประกอบรายงานจาก snapshot ที่บันทึกตอนสั่งซื้อ
      const input = order?.input ?? DEMO_INPUT
      setState({ report: buildReport(input), order })
    } catch (e) {
      setState({ report: buildReport(DEMO_INPUT), order: null, error: (e as Error).message })
    }
  }, [])

  if (!state) {
    return (
      <div className="container-page flex min-h-[50vh] flex-col items-center justify-center gap-3 py-20">
        <div className="flex gap-2">
          {(['metal', 'water', 'wood', 'fire'] as const).map((e, i) => (
            <span key={e} className="animate-bounce" style={{ animationDelay: `${i * 120}ms` }}>
              <ElementIcon element={e} size={22} />
            </span>
          ))}
        </div>
        <p className="text-sm text-muted">กำลังตั้งเสาสี่ต้น…</p>
      </div>
    )
  }

  const { report, order, error } = state
  const isDemo = !order

  return (
    <div className="py-8 md:py-12">
      <div className="no-print container-page mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="text-sm text-ink-soft hover:text-gold">
          ← กลับหน้าแรก
        </Link>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="btn-ghost !py-2 text-sm">
            🖨 พิมพ์ / บันทึก PDF
          </button>
          <Link href="/employer/new" className="btn-primary !py-2 text-sm">
            สร้างรายงานใหม่
          </Link>
        </div>
      </div>

      {error && (
        <div className="container-page mb-6">
          <p className="mx-auto max-w-3xl rounded-lg border border-terracotta/40 bg-terracotta/[0.07] px-4 py-3 text-sm text-terracotta">
            ประกอบรายงานจากข้อมูลที่บันทึกไว้ไม่สำเร็จ ({error}) — แสดงรายงานตัวอย่างแทน
          </p>
        </div>
      )}

      {order && (
        <div className="container-page mb-6">
          <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-xl border border-jade/40 bg-jade/[0.07] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-jade text-cloud">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </span>
              <div>
                <div className="font-medium text-ink">รายงานพร้อมแล้ว</div>
                <div className="text-xs text-ink-soft">
                  {order.subjectName} × {order.orgLabel} · ยอดชำระ {thb(order.total)} บาท ·{' '}
                  {order.express ? 'Express (3 ชม.)' : 'ส่งมอบภายใน 24 ชม.'}
                </div>
              </div>
            </div>
            <div className="rounded-lg bg-cloud px-4 py-2 text-center">
              <div className="text-[10px] uppercase tracking-wider text-muted">รหัสเปิด</div>
              <div className="font-body-en text-lg font-semibold tracking-wider text-ink">{order.code}</div>
            </div>
          </div>
        </div>
      )}

      <div className="container-page">
        <ReportView data={report} accessCode={order?.code} isDemo={isDemo} />
      </div>
    </div>
  )
}
