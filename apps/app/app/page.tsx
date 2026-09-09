import Link from 'next/link'
import { ELEMENT_META, ELEMENT_ORDER } from '@/lib/brand'
import { ElementIcon } from '@/components/element-icon'
import { Logo } from '@/components/logo'
import { Picture } from '@/components/picture'
import { ElementGallery } from '@/components/element-gallery'
import {
  BRAND_BAND,
  CTA,
  ELEMENTS_SECTION,
  HERO,
  PRIMER,
  PRODUCTS_INTRO,
  STEPS,
} from '@/lib/content/home'

export default function LandingPage() {
  return (
    <>
      {/* ---------- HERO ---------- */}
      <section className="relative overflow-hidden">
        <div className="container-page grid gap-12 py-14 md:grid-cols-[1.05fr_0.95fr] md:py-20 md:items-center">
          <div className="fade-up">
            <span className="eyebrow">{HERO.eyebrowTh}</span>
            <h1 className="mt-4 font-display-en text-5xl font-semibold leading-[1.03] text-ink md:text-[4.25rem]">
              {HERO.titleLine1Th}
              <br />
              {HERO.titleLine2Th}
            </h1>
            {/* F-13 — copy ตามสไลด์หน้า 5 */}
            <p className="mt-6 max-w-xl text-lg text-ink-soft text-balance">{HERO.leadTh}</p>
            <p className="mt-3 max-w-xl text-ink-soft text-balance">{HERO.subLeadTh}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              {/* F-12 — กล่องสีทองเปลี่ยนเป็น "ฉันเป็นองค์กร" ให้เข้าคู่กับ "ฉันเป็นคนหางาน" */}
              <Link href="/employer/new" className="btn-primary">
                ฉันเป็นองค์กร
              </Link>
              <Link href="/jobseeker/new" className="btn-ghost">
                ฉันเป็นคนหางาน →
              </Link>
            </div>
            <p className="mt-4 text-sm text-ink-soft">
              ซื้อไปแล้ว?{' '}
              <Link href="/r" className="font-medium text-gold hover:underline">
                เปิดรายงานด้วยรหัส →
              </Link>
            </p>
            <div className="mt-9 flex items-center gap-5">
              {ELEMENT_ORDER.map((e) => (
                <div key={e} className="flex flex-col items-center gap-1.5">
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-full"
                    style={{ background: `${ELEMENT_META[e].color}18` }}
                  >
                    <ElementIcon element={e} size={20} />
                  </span>
                  <span className="text-[11px] text-muted">{ELEMENT_META[e].th}</span>
                </div>
              ))}
            </div>
          </div>

          {/* hero image + floating score card */}
          <div className="fade-up relative">
            <div className="relative overflow-hidden rounded-[28px] border border-line shadow-lift">
              {/* F-16 — ภาพ hero ที่ represent ครบห้าธาตุ (ไม้ ไฟ ดิน ทอง น้ำ) ตามสไลด์หน้า 5 */}
              <Picture
                src="/img/hero-elements.jpg"
                alt="命合 Mìnghé — ไม้ ไฟ ดิน ทอง น้ำ ครบห้าธาตุ"
                className="aspect-[3/4] w-full object-cover object-center"
                width={960}
                height={1280}
                priority
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/25 via-transparent to-transparent" />
            </div>

            {/* floating glass card */}
            <div className="absolute -bottom-5 -left-3 w-[62%] rounded-2xl border border-white/40 bg-cloud/80 p-4 shadow-lift backdrop-blur-md sm:-left-6">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">ดัชนีสมพงษ์</span>
                <span className="cjk text-sm text-jade">合 · สมพงษ์ดี</span>
              </div>
              <div className="mt-1 flex items-end gap-2">
                <span className="font-display-en text-4xl font-semibold text-ink">82</span>
                <span className="mb-1 text-xs text-muted">/ 100</span>
              </div>
              <div className="mt-2 space-y-1.5">
                {(['wood', 'metal', 'water'] as const).map((el, i) => (
                  <div key={el} className="flex items-center gap-2">
                    <ElementIcon element={el} size={12} />
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper-warm">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${[34, 26, 18][i]}%`, background: ELEMENT_META[el].color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* precision badge */}
            <div className="absolute -right-2 top-6 rounded-full border border-gold/30 bg-cloud/85 px-3 py-1.5 text-xs font-medium text-gold shadow-soft backdrop-blur-md sm:-right-4">
              真太陽時 · เวลาสุริยะจริง
            </div>
          </div>
        </div>
      </section>

      {/* ---------- TWO PRODUCTS ---------- */}
      <section className="container-page py-10 md:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">{PRODUCTS_INTRO.eyebrowTh}</span>
          <h2 className="mt-3 text-3xl md:text-4xl">{PRODUCTS_INTRO.titleTh}</h2>
          <p className="mt-3 text-ink-soft text-balance">{PRODUCTS_INTRO.leadTh}</p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {/* F-15 — headline/desc ของการ์ดทั้งสองใบตามสไลด์หน้า 6 */}
          <ProductCard
            img="/img/employer.jpg"
            tag="สำหรับองค์กร"
            title="Employer"
            headline="เช็กก่อนตัดสินใจ เคมีทีมจะเปลี่ยนอย่างไร เขาอยู่นานไหม เพราะเลือกคนที่ใช่ไปได้ไกลกว่า"
            desc="วิเคราะห์ความสมพงษ์ ความส่งเสริมและสิ่งที่ต้องระวัง จากดวงของบริษัทเทียบกับดวงว่าที่ทีมงาน"
            points={['โควตา 6 candidate/สัปดาห์', 'วิเคราะห์รวมทั้งทีม (cross-data)', 'เกณฑ์อ่านดวงกำหนดและอนุมัติโดยซินแส']}
            price="699 บาท/เดือน"
            href="/employer"
            cta="ดูฝั่งองค์กร"
            accent="metal"
          />
          <ProductCard
            img="/img/jobseeker.jpg"
            tag="สำหรับคนทำงาน"
            title="Job Seeker"
            headline="เช็กก่อนตัดสินใจ อยู่แล้วก้าวหน้าไหม จังหวะนี้มูฟได้หรือเปล่า"
            desc="วิเคราะห์ความสมพงษ์ ความส่งเสริมและสิ่งที่ต้องระวัง จากดวงของคุณเทียบกับดวงบริษัท ด้วยวันก่อตั้ง ธาตุอุตสาหกรรม และทิศที่ตั้ง"
            points={['199 บาท / 1 บริษัท', 'หรือ 399/เดือน (3 บริษัท/สัปดาห์)', 'กรอกข้อมูลบริษัทเองได้ทันที']}
            price="เริ่ม 199 บาท"
            href="/jobseeker"
            cta="ดูฝั่งคนทำงาน"
            accent="water"
          />
        </div>
      </section>

      {/* ---------- HOW IT WORKS ---------- */}
      <section className="container-page py-12 md:py-16">
        <div className="rounded-[28px] border border-line bg-card p-8 shadow-card md:p-12">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <span className="eyebrow">ขั้นตอน</span>
              <h2 className="mt-2 text-3xl">ทำงานอย่างไร</h2>
            </div>
            <p className="max-w-md text-sm text-ink-soft">
              ข้อมูลพันปี
              <br />
              วิถี Data Science
            </p>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.id} className="relative rounded-2xl border border-line bg-cloud p-5">
                <span className="font-display-en text-3xl font-semibold text-gold/70">{s.id}</span>
                <h3 className="mt-2 font-display-en text-lg font-semibold">{s.titleTh}</h3>
                <p className="mt-1.5 text-sm text-ink-soft">{s.paragraphsTh[0]}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- PRIMER — วิธีอ่านดวงโดยย่อ 3 ชั้น ---------- */}
      <section className="container-page py-12 md:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">{PRIMER.eyebrowTh}</span>
          <h2 className="mt-3 text-3xl md:text-4xl">{PRIMER.titleTh}</h2>
          <p className="mt-3 text-ink-soft text-balance">{PRIMER.leadTh}</p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {PRIMER.items.map((it) => (
            <div key={it.cn} className="rounded-2xl border border-line bg-card p-6 shadow-card">
              <span className="cjk text-2xl text-gold">{it.cn}</span>
              <h3 className="mt-2 font-display-th text-lg text-ink">{it.titleTh}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{it.bodyTh}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center">
          <Link href={PRIMER.linkHref} className="font-medium text-gold hover:underline">
            {PRIMER.linkLabelTh} →
          </Link>
        </p>
      </section>

      {/* ---------- FIVE ELEMENTS ---------- */}
      <section className="container-page py-12 md:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">{ELEMENTS_SECTION.eyebrowTh}</span>
          <h2 className="mt-3 text-3xl md:text-4xl">{ELEMENTS_SECTION.titleTh}</h2>
          <p className="mt-3 text-ink-soft">{ELEMENTS_SECTION.leadTh}</p>
        </div>
        <div className="mt-10">
          <ElementGallery />
        </div>
        {/* P1-5 — หน้าแรกคง 5 ธาตุ แล้วส่งคนที่อยากละเอียดกว่านั้นลงไป 10 ก้านวัน */}
        <p className="mt-6 text-center">
          <Link href={ELEMENTS_SECTION.drillDownHref} className="font-medium text-gold hover:underline">
            {ELEMENTS_SECTION.drillDownLabelTh} →
          </Link>
        </p>
      </section>

      {/* ---------- BRAND BAND ---------- */}
      <section className="container-page py-8 md:py-12">
        <div className="relative overflow-hidden rounded-[28px] border border-line shadow-card">
          <Picture
            src="/img/brand-band.jpg"
            alt="命合 Mìnghé — ห้าธาตุ"
            width={1440}
            height={608}
            className="h-56 w-full object-cover md:h-72"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-paper/95 via-paper/55 to-transparent" />
          <div className="absolute inset-0 flex flex-col justify-center px-8 md:px-14">
            {/* F-11 — โลโก้จริงจากไฟล์แบรนด์ (มี tagline อยู่ในตัว) */}
            <Logo variant="lockup" height={56} href={null} />
            <p className="mt-2 max-w-sm text-sm text-ink-soft">{BRAND_BAND.captionTh}</p>
          </div>
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="container-page py-14">
        <div className="relative overflow-hidden rounded-[28px] bg-ink px-8 py-16 text-center text-paper md:px-16">
          <div className="starfield-soft pointer-events-none absolute inset-0 opacity-40" />
          <div className="relative">
            <span className="cjk text-3xl text-gold-soft">命合</span>
            <h2 className="mt-3 text-3xl text-paper md:text-4xl">{CTA.titleTh}</h2>
            <p className="mx-auto mt-3 max-w-xl text-paper/75">{CTA.leadTh}</p>
            <div className="mt-4 flex justify-center gap-3">
              {ELEMENT_ORDER.map((e) => (
                <ElementIcon key={e} element={e} size={18} color={ELEMENT_META[e].color} />
              ))}
            </div>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link href="/employer/new" className="btn-primary">
                เริ่มวิเคราะห์
              </Link>
              <Link href="/report" className="btn border border-paper/30 text-paper hover:bg-paper/10">
                ดูรายงานตัวอย่าง
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

function ProductCard({
  img,
  tag,
  title,
  headline,
  desc,
  points,
  price,
  href,
  cta,
  accent,
}: {
  img: string
  tag: string
  title: string
  headline: string
  desc: string
  points: string[]
  price: string
  href: string
  cta: string
  accent: 'metal' | 'water'
}) {
  const color = ELEMENT_META[accent].color
  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-[28px] border border-line bg-card shadow-card transition hover:shadow-lift"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <Picture
          src={img}
          alt={title}
          width={1024}
          height={1280}
          className="h-full w-full object-cover object-top transition duration-500 group-hover:scale-[1.04]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/40 via-ink/5 to-transparent" />
        <span
          className="absolute left-5 top-5 inline-flex items-center gap-1.5 rounded-full bg-cloud/85 px-3 py-1 text-xs font-medium backdrop-blur-sm"
          style={{ color }}
        >
          <ElementIcon element={accent} size={14} /> {tag}
        </span>
        <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between">
          <h3 className="font-display-en text-4xl font-semibold text-paper drop-shadow">{title}</h3>
          <span className="rounded-full bg-cloud/90 px-3 py-1 text-sm font-medium" style={{ color }}>
            {price}
          </span>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-7">
        <p className="font-display-th text-lg leading-snug text-ink">{headline}</p>
        <p className="mt-2 text-sm text-ink-soft">{desc}</p>
        <ul className="mt-4 space-y-2">
          {points.map((p) => (
            <li key={p} className="flex items-start gap-2 text-sm text-ink-soft">
              <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full" style={{ background: color }} />
              {p}
            </li>
          ))}
        </ul>
        <span className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-gold transition group-hover:gap-2">
          {cta} →
        </span>
      </div>
    </Link>
  )
}
