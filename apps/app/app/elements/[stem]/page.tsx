import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ElementIcon } from '@/components/element-icon'
import { ELEMENT_META } from '@/lib/brand'
import { STEM_CONTENT, STEM_ORDER } from '@/lib/content/stems'
import type { StemSlug } from '@/lib/content/types'

/** static export — ต้องบอกล่วงหน้าว่าจะสร้างหน้าอะไรบ้าง (10 หน้า) */
export function generateStaticParams() {
  return STEM_ORDER.map((stem) => ({ stem }))
}

type Params = { stem: string }

function contentOf(stem: string) {
  return (STEM_ORDER as string[]).includes(stem) ? STEM_CONTENT[stem as StemSlug] : null
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>
}): Promise<Metadata> {
  const { stem } = await params
  const s = contentOf(stem)
  if (!s) return { title: 'ไม่พบก้านวันนี้' }
  return {
    title: `${s.th} (${s.cn}) — ก้านวัน`,
    description: `${s.th} · ${s.cn} ${s.pinyin} — ${s.metaphorTh}`,
  }
}

export default async function StemPage({ params }: { params: Promise<Params> }) {
  const { stem } = await params
  const s = contentOf(stem)
  if (!s) notFound()

  const meta = ELEMENT_META[s.element]
  const polarityTh = s.yinYang === 'yang' ? 'หยาง (陽)' : 'หยิน (陰)'
  const idx = STEM_ORDER.indexOf(s.slug)
  const prev = STEM_ORDER[(idx - 1 + STEM_ORDER.length) % STEM_ORDER.length]
  const next = STEM_ORDER[(idx + 1) % STEM_ORDER.length]

  return (
    <div className="py-14 md:py-20">
      <article className="container-page mx-auto max-w-3xl">
        <Link href="/elements" className="text-sm text-muted hover:text-ink">
          ← ก้านวันทั้ง 10 แบบ
        </Link>

        {/* ---------- หัวเรื่อง ---------- */}
        <header className="mt-6 flex flex-wrap items-center gap-5">
          <span
            className="flex h-20 w-20 flex-none items-center justify-center rounded-full"
            style={{ background: `${meta.color}1a` }}
          >
            <ElementIcon element={s.element} size={40} />
          </span>
          <div>
            <div className="flex items-baseline gap-3">
              <span className="cjk text-5xl" style={{ color: meta.color }}>
                {s.cn}
              </span>
              <span className="text-lg text-muted">
                {s.pinyin} · {s.transliterationTh}
              </span>
            </div>
            <h1 className="mt-1 font-display-th text-3xl text-ink md:text-4xl">{s.th}</h1>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="chip" style={{ borderColor: `${meta.color}66`, color: meta.color }}>
                <ElementIcon element={s.element} size={12} /> ธาตุ{meta.th} · {meta.cn}
              </span>
              <span className="chip">{polarityTh}</span>
            </div>
          </div>
        </header>

        <p className="mt-8 border-l-2 pl-5 font-display-th text-xl leading-relaxed text-ink" style={{ borderColor: meta.color }}>
          {s.metaphorTh}
        </p>

        {/* ---------- เนื้อหา 3 ส่วน ---------- */}
        <div className="mt-10 space-y-8">
          <StemList title="พลังที่มักพบ" items={s.strengthsTh} color={meta.color} />
          <StemList title="บริบทงานที่สอดคล้อง" items={s.workContextsTh} color={meta.color} />
          <StemList title="ข้อควรระวัง" items={s.cautionsTh} color={meta.color} />
        </div>

        {/* ---------- ข้อจำกัดที่ต้องบอกให้ชัด ---------- */}
        <p className="mt-10 rounded-2xl bg-paper-warm/60 p-5 text-sm text-ink-soft">
          ก้านวันเป็นจุดตั้งต้นของการอ่าน ไม่ใช่คำตอบสุดท้าย — ดวงจริงต้องอ่านร่วมกับเสาเดือน
          กำลังแข็ง-อ่อน และโครงสร้างสิบเทพทั้งใบ คนก้านวันเดียวกันจึงอ่านออกมาไม่เหมือนกัน
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/jobseeker/new" className="btn-primary">
            คำนวณก้านวันของคุณ
          </Link>
          <Link href="/about" className="btn-ghost">
            อ่านจดหมายจากทีมซินแส →
          </Link>
        </div>

        {/* ---------- ไปก้านถัดไป ---------- */}
        <nav className="mt-12 flex justify-between border-t border-line pt-6 text-sm">
          <Link href={`/elements/${prev}`} className="text-ink-soft hover:text-ink">
            ← {STEM_CONTENT[prev].cn} {STEM_CONTENT[prev].th}
          </Link>
          <Link href={`/elements/${next}`} className="text-ink-soft hover:text-ink">
            {STEM_CONTENT[next].cn} {STEM_CONTENT[next].th} →
          </Link>
        </nav>
      </article>
    </div>
  )
}

function StemList({ title, items, color }: { title: string; items: string[]; color: string }) {
  if (items.length === 0) return null
  return (
    <section>
      <h2 className="font-display-th text-xl text-ink">{title}</h2>
      <ul className="mt-3 space-y-2">
        {items.map((it) => (
          <li key={it} className="flex items-start gap-3 text-ink-soft">
            <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full" style={{ background: color }} />
            {it}
          </li>
        ))}
      </ul>
    </section>
  )
}
