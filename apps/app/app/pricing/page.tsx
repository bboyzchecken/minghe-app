import Link from 'next/link'
import type { Metadata } from 'next'
import { ElementIcon } from '@/components/element-icon'
import { ADDONS, DEPTH_TIERS, PLANS, TEAM_EXTRA_SEAT_PRICE, TEAM_FREE_SEATS, thb } from '@/lib/pricing'

export const metadata: Metadata = { title: 'ราคา' }

export default function PricingPage() {
  return (
    <div className="container-page py-14 md:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <span className="eyebrow">ราคาแพ็กเกจ</span>
        <h1 className="mt-3 text-4xl">โปร่งใส · จ่ายเท่าที่ใช้</h1>
        <p className="mt-3 text-ink-soft">
          สมาชิกรายเดือนเป็นหลัก + ซื้อเพิ่มเมื่อเกินโควตา — เลือกได้ทั้งฝั่งองค์กรและฝั่งคนทำงาน
        </p>
      </div>

      {/* plans */}
      <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
        {(['employer', 'jobseeker'] as const).map((key) => {
          const p = PLANS[key]
          const el = key === 'employer' ? 'metal' : 'water'
          return (
            <div
              key={key}
              className={`relative flex flex-col rounded-xl border bg-card p-8 shadow-card ${
                p.highlight ? 'border-gold' : 'border-line'
              }`}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-8 rounded-full bg-gold px-3 py-1 text-xs font-medium text-cloud">
                  แนะนำสำหรับองค์กร
                </span>
              )}
              <div className="flex items-center gap-2">
                <ElementIcon element={el} size={22} />
                <span className="text-sm font-medium text-ink-soft">{p.name}</span>
              </div>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="font-display-en text-5xl font-semibold text-ink">{thb(p.price)}</span>
                <span className="text-lg text-muted">฿ {p.period}</span>
              </div>
              <div className="mt-1 text-sm text-gold">{p.quota}</div>
              <ul className="mt-5 flex-1 space-y-2.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-ink-soft">
                    <Check /> {f}
                  </li>
                ))}
              </ul>
              <div className="mt-5 rounded-lg bg-paper-warm/60 p-3 text-xs text-ink-soft">
                {p.overQuota.map((o) => (
                  <div key={o}>{o}</div>
                ))}
              </div>
              <Link href={key === 'employer' ? '/employer/new' : '/jobseeker/new'} className="btn-primary mt-6">
                เริ่มใช้งาน
              </Link>
            </div>
          )
        })}
      </div>

      {/* depth tiers */}
      <div className="mx-auto mt-16 max-w-4xl">
        <h2 className="text-center text-2xl">ระดับความลึกของรายงาน (ต่อคน / เมื่อเกินโควตา)</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {DEPTH_TIERS.map((d) => (
            <div
              key={d.id}
              className={`rounded-lg border bg-card p-6 ${d.highlight ? 'border-gold shadow-soft' : 'border-line'}`}
            >
              <div className="flex items-baseline justify-between">
                <span className="font-medium text-ink">{d.label}</span>
                <span className="cjk text-sm text-muted">{d.cn}</span>
              </div>
              <div className="mt-2 font-display-en text-3xl font-semibold text-gold">
                +{thb(d.price)} <span className="text-sm text-muted">฿/คน</span>
              </div>
              <p className="mt-2 text-sm text-ink-soft">{d.blurb}</p>
            </div>
          ))}
        </div>
      </div>

      {/* add-ons */}
      <div className="mx-auto mt-16 max-w-4xl">
        <h2 className="text-center text-2xl">บริการเสริม (ต่อการวิเคราะห์)</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {ADDONS.map((a) => (
            <div
              key={a.id}
              className={`flex items-start justify-between rounded-lg border bg-card p-5 ${
                a.comingSoon ? 'border-dashed border-line opacity-80' : 'border-line'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-ink">{a.label}</span>
                  <span className="cjk text-xs text-muted">{a.cn}</span>
                  {a.comingSoon && <span className="chip !py-0.5 text-[10px] text-terracotta">Coming Soon</span>}
                </div>
                <p className="mt-1 text-sm text-ink-soft">{a.description}</p>
                {a.turnaround && <p className="mt-1 text-xs text-muted">ส่งมอบ: {a.turnaround}</p>}
              </div>
              <div className="ml-3 flex-none text-right font-semibold text-gold">
                {a.comingSoon ? 'เร็วๆ นี้' : `+${thb(a.price ?? 0)}`}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 rounded-lg border border-line bg-paper-warm/50 p-5 text-center text-sm text-ink-soft">
          <b className="text-ink">Team Roster:</b> วิเคราะห์รวมทั้งทีม — {TEAM_FREE_SEATS} คนแรกฟรี ·
          คนที่ {TEAM_FREE_SEATS + 1} เป็นต้นไปเพียง {TEAM_EXTRA_SEAT_PRICE} บาท/คน (โปร “คนละครึ่งพลัส”)
        </div>
        <p className="mt-4 text-center text-xs text-muted">
          * หมายเหตุ: รายการ “Executive Analysis (+89)” กับระดับ “Executive Insights (+399)”
          ยังรอสรุปว่าเป็นบริการเดียวกันหรือคนละตัว
        </p>
      </div>
    </div>
  )
}

function Check() {
  return (
    <svg className="mt-1 h-3.5 w-3.5 flex-none text-jade" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}
