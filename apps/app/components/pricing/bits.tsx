import Link from 'next/link'
import { ElementIcon } from '@/components/element-icon'
import type { ElementKey } from '@/lib/brand'

/** ติ๊กถูกสีหยก — ใช้ในลิสต์ "สิ่งที่ได้" */
export function Check({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`mt-1 h-3.5 w-3.5 flex-none text-jade ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      aria-hidden="true"
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}

/** หัวข้อ section แบบเดียวกันทุกหน้าราคา */
export function SectionHead({
  eyebrow,
  title,
  desc,
}: {
  eyebrow?: string
  title: string
  desc?: string
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h2 className={`text-2xl sm:text-3xl ${eyebrow ? 'mt-2' : ''}`}>{title}</h2>
      {desc && <p className="mt-2 text-sm text-ink-soft">{desc}</p>}
    </div>
  )
}

/** ขั้นตอนการคิดเงิน — ทำให้ "จ่ายอะไร เมื่อไหร่" อ่านจบใน 3 บรรทัด */
export function BillingSteps({ steps }: { steps: { title: string; desc: string }[] }) {
  return (
    <ol className="grid gap-3 sm:grid-cols-3">
      {steps.map((s, i) => (
        <li key={s.title} className="relative rounded-lg border border-line bg-card p-5 shadow-soft">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gold/15 font-display-en text-sm font-semibold text-gold">
            {i + 1}
          </span>
          <div className="mt-3 font-medium text-ink">{s.title}</div>
          <p className="mt-1 text-sm text-ink-soft">{s.desc}</p>
        </li>
      ))}
    </ol>
  )
}

export interface FaqItem {
  q: string
  a: React.ReactNode
}

/** คำถามที่พบบ่อย — เปิด/ปิดด้วย <details> ไม่ต้องใช้ JS */
export function Faq({ items }: { items: FaqItem[] }) {
  return (
    <div className="mx-auto mt-6 max-w-2xl divide-y divide-line overflow-hidden rounded-lg border border-line bg-card">
      {items.map((it) => (
        <details key={it.q} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm font-medium text-ink transition hover:bg-paper-warm/50">
            {it.q}
            <svg
              className="h-4 w-4 flex-none text-muted transition-transform group-open:rotate-180"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </summary>
          <div className="px-5 pb-4 text-sm leading-relaxed text-ink-soft">{it.a}</div>
        </details>
      ))}
    </div>
  )
}

/** ข้อมูลการชำระเงิน/ความโปร่งใส — GB Prime Pay บังคับให้แสดงราคาเป็นบาทชัดเจน */
export function PaymentNote() {
  return (
    <div className="mx-auto mt-10 max-w-3xl rounded-lg border border-line bg-paper-warm/50 p-5 text-center text-xs leading-relaxed text-ink-soft">
      ราคาทั้งหมดเป็นเงินบาท (THB) · ชำระด้วยบัตรเครดิต/เดบิต และ QR PromptPay ผ่าน GB Prime Pay
      (อยู่ระหว่างเชื่อมต่อ) · ยกเลิกสมาชิกได้ทุกเมื่อ มีผลรอบบิลถัดไป ·{' '}
      <Link href="/legal/refund" className="text-gold hover:underline">
        นโยบายคืนเงิน
      </Link>{' '}
      ·{' '}
      <Link href="/legal/terms" className="text-gold hover:underline">
        เงื่อนไขการใช้งาน
      </Link>
    </div>
  )
}

/** การ์ดข้ามฝั่ง — วางท้ายหน้าเสมอ ไม่ปนกับราคาของฝั่งที่กำลังอ่าน */
export function CrossAudienceLink({
  el,
  title,
  desc,
  href,
  cta,
}: {
  el: ElementKey
  title: string
  desc: string
  href: string
  cta: string
}) {
  return (
    <div className="mx-auto mt-14 flex max-w-3xl flex-col items-center gap-4 rounded-lg border border-dashed border-line bg-card/60 p-6 text-center sm:flex-row sm:text-left">
      <ElementIcon element={el} size={28} />
      <div className="flex-1">
        <div className="font-medium text-ink">{title}</div>
        <p className="mt-0.5 text-sm text-ink-soft">{desc}</p>
      </div>
      <Link href={href} className="btn-ghost flex-none text-sm">
        {cta} →
      </Link>
    </div>
  )
}
