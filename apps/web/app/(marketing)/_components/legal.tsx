/**
 * โครงหน้าเอกสารทางกฎหมาย (Privacy / Terms) — ใช้ร่วมกันเฉพาะหน้า marketing
 */

import { GoldDivider, Seal } from '@/components/ui'

/** โครงหน้าเอกสาร: หัวเรื่อง + วันที่มีผล + เนื้อหา */
export function LegalPage({
  eyebrow,
  title,
  effectiveDate,
  intro,
  children,
}: {
  eyebrow: string
  title: string
  effectiveDate: string
  intro: string
  children: React.ReactNode
}) {
  return (
    <div className="texture-paper bg-paper">
      <div className="mx-auto max-w-3xl px-4 py-16 md:py-20">
        <header className="text-center">
          <Seal size={56} className="mx-auto" />
          <p className="mt-5 text-sm font-semibold tracking-wide text-cinnabar">{eyebrow}</p>
          <h1 className="mt-2 text-3xl font-semibold text-ink md:text-4xl">{title}</h1>
          <p className="mt-3 text-sm text-muted">มีผลบังคับใช้ตั้งแต่ {effectiveDate}</p>
          <GoldDivider className="mx-auto mt-6 max-w-xs" />
          <p className="mx-auto mt-6 max-w-2xl text-left text-base text-ink-soft">{intro}</p>
        </header>
        <div className="mt-10 space-y-8">{children}</div>
      </div>
    </div>
  )
}

/** หมวดในเอกสาร มีเลขข้อกำกับ */
export function LegalSection({
  no,
  title,
  children,
}: {
  no: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-lg border border-line bg-cloud p-6 shadow-card md:p-8">
      <h2 className="flex items-baseline gap-3 text-xl font-semibold text-ink">
        <span className="font-mono text-base text-gold">{no}</span>
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-sm leading-7 text-ink-soft">{children}</div>
    </section>
  )
}

/** รายการหัวข้อย่อยในเอกสาร */
export function LegalList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5">
          <span aria-hidden className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}
