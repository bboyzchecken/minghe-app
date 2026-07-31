'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ReportView } from '@/components/report/report-view'
import { ElementIcon } from '@/components/element-icon'
import { buildReport, DEMO_INPUT, type ReportData } from '@/lib/report'
import { thb } from '@/lib/pricing'
import { loadOrder, loadOpenedCode, type StoredOrder } from '@/lib/store'

interface State {
  report: ReportData
  order: StoredOrder | null
  openedCode?: string | null
  error?: string
}

export default function ReportPage() {
  const [state, setState] = useState<State | null>(null)

  useEffect(() => {
    const order = loadOrder()
    const openedCode = loadOpenedCode()
    try {
      const input = order ? order.input : DEMO_INPUT
      setState({ report: buildReport(input), order, openedCode })
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

  const { report, order, openedCode } = state
  const isDemo = !order
  const shownCode = order?.accessCode ?? openedCode ?? undefined

  return (
    <div className="py-8 md:py-12">
      {/* action bar */}
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

      {/* success banner (เฉพาะออเดอร์จริง) */}
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
                <div className="font-medium text-ink">ชำระเงินสำเร็จ · รายงานพร้อมแล้ว</div>
                <div className="text-xs text-ink-soft">
                  ยอดชำระ {thb(order.total)} บาท · {order.express ? 'Express (3 ชม.)' : 'ส่งมอบภายใน 24 ชม.'} ·
                  เก็บรหัสเปิดไว้เพื่อเข้าดูภายหลัง
                </div>
              </div>
            </div>
            <div className="rounded-lg bg-cloud px-4 py-2 text-center">
              <div className="text-[10px] uppercase tracking-wider text-muted">รหัสเปิด</div>
              <div className="font-body-en text-lg font-semibold tracking-wider text-ink">{order.accessCode}</div>
            </div>
          </div>
        </div>
      )}

      {/* banner เมื่อเปิดด้วยรหัส (ลูกค้าเก่า) และไม่มีออเดอร์ในเซสชันนี้ */}
      {!order && openedCode && (
        <div className="container-page mb-6">
          <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-xl border border-gold/40 bg-gold/[0.06] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gold text-cloud">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M15 11V7a3 3 0 00-6 0v4M6 11h12v9H6z" />
                </svg>
              </span>
              <div>
                <div className="font-medium text-ink">เปิดรายงานด้วยรหัสสำเร็จ</div>
                <div className="text-xs text-ink-soft">เข้าดูรายงานฉบับที่สั่งซื้อไว้ · พิมพ์ PDF ได้ทุกเมื่อ</div>
              </div>
            </div>
            <div className="rounded-lg bg-cloud px-4 py-2 text-center">
              <div className="text-[10px] uppercase tracking-wider text-muted">รหัสเปิด</div>
              <div className="font-body-en text-lg font-semibold tracking-wider text-ink">{openedCode}</div>
            </div>
          </div>
        </div>
      )}

      <div className="container-page">
        <ReportView data={report} accessCode={shownCode} isDemo={isDemo} />
      </div>
    </div>
  )
}
