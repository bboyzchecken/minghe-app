'use client'

/**
 * กราฟ SVG เบา ๆ สำหรับหน้าสถิติ — ไม่ใช้ไลบรารี
 * รองรับมือถือด้วย viewBox + width 100% และแสดงค่าเมื่อแตะ/ชี้แต่ละแท่ง
 */

import { useState } from 'react'
import type { StatsBucket, StatsGranularity } from '@/lib/api'
import { baht } from './ui'

const EMP = '#2563EB'
const JS = '#16A34A'
const REF = '#DC2626'

export function bucketLabel(key: string, g: StatsGranularity): string {
  if (g === 'year') return key
  if (g === 'month') {
    const [y, m] = key.split('-').map(Number)
    return new Date(y, m - 1, 1).toLocaleDateString('th-TH', { month: 'short', year: '2-digit' })
  }
  const d = new Date(key)
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
}

/** แท่งซ้อน: รายได้องค์กร + คนทำงาน (สุทธิหลังคืนเงิน) */
export function RevenueChart({ series, granularity, height = 220 }: { series: StatsBucket[]; granularity: StatsGranularity; height?: number }) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 720
  const H = height
  const padL = 44
  const padB = 26
  const padT = 14
  const n = Math.max(series.length, 1)
  const innerW = W - padL - 8
  const slot = innerW / n
  const barW = Math.min(slot * 0.62, 36)
  const max = Math.max(1, ...series.map((b) => b.revenueEmployer + b.revenueJobseeker))
  const scale = (v: number) => ((H - padB - padT) * v) / max

  const ticks = 4
  const tickVals = Array.from({ length: ticks + 1 }, (_, i) => Math.round((max / ticks) * i))

  // ป้ายแกน X: ไม่ให้ชนกันบนจอแคบ
  const labelEvery = granularity === 'day' ? Math.ceil(n / 8) : granularity === 'month' ? 1 : 1

  const active = hover !== null ? series[hover] : null

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" onMouseLeave={() => setHover(null)}>
        {tickVals.map((v, i) => {
          const y = H - padB - scale(v)
          return (
            <g key={i}>
              <line x1={padL} x2={W - 8} y1={y} y2={y} stroke="#E2E8F0" strokeDasharray={i === 0 ? undefined : '3 3'} />
              <text x={padL - 6} y={y + 3} fontSize="10" textAnchor="end" fill="#94A3B8" fontFamily="Inter, sans-serif">
                {v >= 1000 ? `${Math.round(v / 1000)}k` : v}
              </text>
            </g>
          )
        })}
        {series.map((b, i) => {
          const x = padL + slot * i + (slot - barW) / 2
          const hEmp = scale(b.revenueEmployer)
          const hJs = scale(b.revenueJobseeker)
          const yJs = H - padB - hJs
          const yEmp = yJs - hEmp
          const dim = hover !== null && hover !== i
          return (
            <g key={b.key} opacity={dim ? 0.45 : 1} onMouseEnter={() => setHover(i)} onTouchStart={() => setHover(i)} style={{ cursor: 'pointer' }}>
              <rect x={padL + slot * i} y={padT} width={slot} height={H - padB - padT} fill="transparent" />
              <rect x={x} y={yJs} width={barW} height={hJs} fill={JS} rx="2" />
              <rect x={x} y={yEmp} width={barW} height={hEmp} fill={EMP} rx="2" />
              {b.refunds > 0 && <rect x={x} y={H - padB - 2} width={barW} height={2} fill={REF} />}
              {i % labelEvery === 0 && (
                <text x={x + barW / 2} y={H - 8} fontSize="10" textAnchor="middle" fill="#64748B" fontFamily="Sarabun, sans-serif">
                  {bucketLabel(b.key, granularity)}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {active && (
        <div className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 rounded-lg border border-ws-border bg-ws-surface px-3 py-2 text-xs shadow-ws-lg">
          <div className="mb-1 font-medium text-ws-ink">{bucketLabel(active.key, granularity)}</div>
          <div className="flex items-center gap-2"><Dot c={EMP} /> องค์กร <b className="ws-mono ml-auto pl-3">{baht(active.revenueEmployer)}</b></div>
          <div className="flex items-center gap-2"><Dot c={JS} /> คนทำงาน <b className="ws-mono ml-auto pl-3">{baht(active.revenueJobseeker)}</b></div>
          {active.refunds > 0 && <div className="flex items-center gap-2"><Dot c={REF} /> คืนเงิน <b className="ws-mono ml-auto pl-3">{baht(active.refunds)}</b></div>}
          <div className="mt-1 border-t border-ws-border pt-1 text-ws-muted">{active.payments} รายการ · สมัครใหม่ {active.signups}</div>
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-4 text-[11px] text-ws-muted">
        <span className="flex items-center gap-1.5"><Dot c={EMP} /> รายได้ฝั่งองค์กร</span>
        <span className="flex items-center gap-1.5"><Dot c={JS} /> รายได้ฝั่งคนทำงาน</span>
        <span className="flex items-center gap-1.5"><Dot c={REF} /> มีการคืนเงิน</span>
      </div>
    </div>
  )
}

function Dot({ c }: { c: string }) {
  return <span className="inline-block h-2 w-2 rounded-sm" style={{ background: c }} />
}

/** เส้นเล็ก ๆ ในการ์ดตัวเลข */
export function Sparkline({ values, color = EMP, height = 36 }: { values: number[]; color?: string; height?: number }) {
  if (values.length < 2) return null
  const W = 120
  const max = Math.max(1, ...values)
  const min = Math.min(0, ...values)
  const pts = values.map((v, i) => {
    const x = (W / (values.length - 1)) * i
    const y = height - 2 - ((height - 4) * (v - min)) / (max - min || 1)
    return `${x},${y}`
  })
  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="h-9 w-28" aria-hidden="true">
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

/** แถบ funnel — แต่ละขั้นเป็นแถบยาวตามสัดส่วนของขั้นแรก */
export function FunnelBars({
  steps,
  color = EMP,
}: {
  steps: { label: string; count: number }[]
  color?: string
}) {
  const top = Math.max(1, steps[0]?.count ?? 1)
  return (
    <ol className="space-y-2">
      {steps.map((s, i) => {
        const pct = Math.round((s.count / top) * 100)
        const prev = i > 0 ? steps[i - 1].count : null
        const drop = prev && prev > 0 ? Math.round(((prev - s.count) / prev) * 100) : null
        return (
          <li key={s.label} className="text-xs">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-ws-text">
                <span className="ws-mono mr-1.5 text-ws-faint">{i + 1}</span>
                {s.label}
              </span>
              <span className="ws-mono flex items-center gap-2 text-ws-muted">
                {drop !== null && drop > 0 && <span className="text-ws-danger">−{drop}%</span>}
                <b className="text-ws-ink">{s.count.toLocaleString('th-TH')}</b>
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-ws-raised">
              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
            </div>
          </li>
        )
      })}
    </ol>
  )
}
