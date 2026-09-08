import Link from 'next/link'
import type { Metadata } from 'next'
import { ElementIcon } from '@/components/element-icon'
import { ELEMENT_META } from '@/lib/brand'
import { STEM_LIST } from '@/lib/content/stems'

export const metadata: Metadata = {
  title: 'ก้านวันทั้ง 10 แบบ',
  description:
    'ก้านวัน (日主) คือธาตุประจำตัวที่ใช้อ่านดวงทั้งใบ — ทั้งหมดมี 10 แบบ จากห้าธาตุคูณหยิน-หยาง',
}

export default function ElementsIndexPage() {
  return (
    <div className="py-14 md:py-20">
      <section className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">ก้านวัน · 十天干</span>
          <h1 className="mt-3 font-display-th text-3xl text-ink md:text-4xl">ก้านวันทั้ง 10 แบบ</h1>
          <p className="mt-4 text-ink-soft text-balance">
            ห้าธาตุแยกเป็นหยินกับหยางได้อีกชั้นหนึ่ง รวมเป็นก้านวัน 10 แบบ —
            คนธาตุไม้สองคนจึงไม่เหมือนกัน และนี่คือชั้นที่ใช้อ่านว่าคุณทำงานแบบไหนได้ดีที่สุด
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STEM_LIST.map((s) => {
            const meta = ELEMENT_META[s.element]
            return (
              <Link
                key={s.slug}
                href={`/elements/${s.slug}`}
                className="group rounded-2xl border border-line bg-card p-6 shadow-card transition hover:shadow-lift"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-12 w-12 flex-none items-center justify-center rounded-full"
                    style={{ background: `${meta.color}1a` }}
                  >
                    <ElementIcon element={s.element} size={24} />
                  </span>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="cjk text-2xl" style={{ color: meta.color }}>
                        {s.cn}
                      </span>
                      <span className="text-sm text-muted">{s.pinyin}</span>
                    </div>
                    <div className="font-display-th text-lg text-ink">{s.th}</div>
                  </div>
                </div>
                <p className="mt-4 text-sm text-ink-soft">{s.metaphorTh}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-gold transition group-hover:gap-2">
                  อ่านต่อ →
                </span>
              </Link>
            )
          })}
        </div>

        <p className="mt-10 text-center text-sm text-muted">
          ยังไม่รู้ว่าตัวเองก้านวันอะไร?{' '}
          <Link href="/jobseeker/new" className="font-medium text-gold hover:underline">
            กรอกวันเกิดแล้วระบบคำนวณให้ →
          </Link>
        </p>
      </section>
    </div>
  )
}
