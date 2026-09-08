import Link from 'next/link'
import type { Metadata } from 'next'
import { ElementIcon } from '@/components/element-icon'
import { ELEMENT_ORDER } from '@/lib/brand'
import { TEAM_LETTER } from '@/lib/content/about'

export const metadata: Metadata = {
  title: 'จดหมายจากทีมซินแส',
  description: TEAM_LETTER.leadTh,
}

export default function AboutPage() {
  const letter = TEAM_LETTER
  return (
    <div className="py-14 md:py-20">
      <article className="container-page mx-auto max-w-2xl">
        <div className="flex justify-center gap-3">
          {ELEMENT_ORDER.map((e) => (
            <ElementIcon key={e} element={e} size={18} />
          ))}
        </div>

        <h1 className="mt-6 text-center font-display-th text-3xl text-ink md:text-4xl">
          {letter.titleTh}
        </h1>
        <p className="mt-4 text-center text-lg text-ink-soft text-balance">{letter.leadTh}</p>

        <div className="mt-10 space-y-6 text-ink-soft">
          {letter.paragraphsTh.map((p) => (
            <p key={p} className="leading-relaxed">
              {p}
            </p>
          ))}
        </div>

        {/* P1-4 — ย่อหน้าที่ต้องมีเสมอ: AI ไม่แตะการคำนวณ (ตรงกับ DataSpec B0) */}
        <div className="mt-8 rounded-2xl border border-line bg-card p-6 shadow-card">
          <div className="flex items-center gap-2 text-sm font-medium text-gold">
            <span className="cjk">機</span> เรื่อง AI — พูดให้ชัดตั้งแต่ต้น
          </div>
          <p className="mt-3 leading-relaxed text-ink-soft">{letter.aiClarificationTh}</p>
        </div>

        <p className="mt-10 text-right font-display-th text-lg text-ink">— {letter.signatureTh}</p>

        <div className="mt-12 flex flex-wrap justify-center gap-3 border-t border-line pt-8">
          <Link href="/elements" className="btn-ghost">
            ก้านวันทั้ง 10 แบบ →
          </Link>
          <Link href="/jobseeker/new" className="btn-primary">
            เริ่มวิเคราะห์ดวงของคุณ
          </Link>
        </div>
      </article>
    </div>
  )
}
