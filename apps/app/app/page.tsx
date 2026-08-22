import Link from 'next/link'
import { ELEMENT_META, ELEMENT_ORDER } from '@/lib/brand'
import { ElementIcon } from '@/components/element-icon'
import { Logo } from '@/components/logo'
import { ElementGallery } from '@/components/element-gallery'

const STEP_DETAIL =
  'วิเคราะห์ความสมพงษ์ ความส่งเสริมและสิ่งที่ต้องระวัง จากดวงของบริษัท เทียบกับดวงว่าที่ทีมงาน'

const STEPS = [
  { n: '01', th: 'Data Collection', detail: STEP_DETAIL },
  { n: '02', th: 'Modeling', detail: STEP_DETAIL },
  { n: '03', th: 'Scenario Analysis', detail: STEP_DETAIL },
  { n: '04', th: 'Story telling', detail: STEP_DETAIL },
]

export default function LandingPage() {
  return (
    <>
      {/* ---------- HERO ---------- */}
      <section className="relative overflow-hidden">
        <div className="container-page grid gap-12 py-14 md:grid-cols-[1.05fr_0.95fr] md:py-20 md:items-center">
          <div className="fade-up">
            <span className="eyebrow">命合 · Mìnghé — Reveal Destiny</span>
            <h1 className="mt-4 font-display-en text-5xl font-semibold leading-[1.03] text-ink md:text-[4.25rem]">
              เมื่อ “คนที่ใช่”
              <br />
              เจอ “ที่ที่ใช่”
            </h1>
            {/* F-13 — copy ตามสไลด์หน้า 5 */}
            <p className="mt-6 max-w-xl text-lg text-ink-soft text-balance">
              แพลตฟอร์มวิเคราะห์ <b className="text-ink">ความสมพงษ์ระหว่างคนกับองค์กร</b> ด้วยศาสตร์ปาจือ (八字)
            </p>
            <p className="mt-3 max-w-xl text-ink-soft text-balance">
              การบริหารชีวิตและบริหารทีม เพื่อขับเคลื่อนองค์กรสู่เป้าหมายด้วยองค์ความรู้นับพันปี
            </p>
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
              <img
                src="/img/hero-elements.jpg"
                alt="命合 Mìnghé — ไม้ ไฟ ดิน ทอง น้ำ ครบห้าธาตุ"
                className="aspect-[3/4] w-full object-cover object-center"
                width={960}
                height={1280}
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
          <span className="eyebrow">เบื้องหลังความสำเร็จนับพันปี</span>
          <h2 className="mt-3 text-3xl md:text-4xl">โลกไปไว แต่คุณไปได้ไกลกว่า</h2>
          <p className="mt-3 text-ink-soft text-balance">
            ศาสตร์ปาจื้อเฉพาะทางด้านการบริหาร จากการเก็บข้อมูลกว่าพันปีด้วยศาสตร์ตะวันออก Bazi Work Specialized
            Analytics เพื่อคุณและองค์กร
          </p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {/* F-15 — headline/desc ของการ์ดทั้งสองใบตามสไลด์หน้า 6 */}
          <ProductCard
            img="/img/employer.jpg"
            tag="สำหรับองค์กร"
            title="Employer"
            headline="เช็กก่อนตัดสินใจ เคมีทีมจะเปลี่ยนอย่างไร เขาอยู่นานไหม เพราะเลือกคนที่ใช่ไปได้ไกลกว่า"
            desc="วิเคราะห์ความสมพงษ์ ความส่งเสริมและสิ่งที่ต้องระวัง จากดวงของบริษัทเทียบกับดวงว่าที่ทีมงาน"
            points={['โควตา 6 candidate/สัปดาห์', 'วิเคราะห์รวมทั้งทีม (cross-data)', 'ซินแสตรวจทานแพ็กพรีเมียม']}
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
              <div key={s.n} className="relative rounded-2xl border border-line bg-cloud p-5">
                <span className="font-display-en text-3xl font-semibold text-gold/70">{s.n}</span>
                <h3 className="mt-2 font-display-en text-lg font-semibold">{s.th}</h3>
                <p className="mt-1.5 text-sm text-ink-soft">{s.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- FIVE ELEMENTS ---------- */}
      <section className="container-page py-12 md:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">ห้าธาตุ · 五行</span>
          <h2 className="mt-3 text-3xl md:text-4xl">พื้นดวงของคุณคือธาตุอะไร</h2>
          <p className="mt-3 text-ink-soft">ทุกคนมีพื้นดวง (ก้านวัน / 日主) เป็นหนึ่งในห้าธาตุ — เป็นจุดเริ่มของการอ่านความเข้ากัน</p>
        </div>
        <div className="mt-10">
          <ElementGallery />
        </div>
      </section>

      {/* ---------- BRAND BAND ---------- */}
      <section className="container-page py-8 md:py-12">
        <div className="relative overflow-hidden rounded-[28px] border border-line shadow-card">
          <img
            src="/img/brand-band.jpg"
            alt="命合 Mìnghé — ห้าธาตุ"
            loading="lazy"
            className="h-56 w-full object-cover md:h-72"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-paper/95 via-paper/55 to-transparent" />
          <div className="absolute inset-0 flex flex-col justify-center px-8 md:px-14">
            {/* F-11 — โลโก้จริงจากไฟล์แบรนด์ (มี tagline อยู่ในตัว) */}
            <Logo variant="lockup" height={56} href={null} />
            <p className="mt-2 max-w-sm text-sm text-ink-soft">
              ห้าธาตุที่ต่างกันไม่ใช่เรื่องดีหรือร้าย — แต่คือการรู้จังหวะที่จะเสริมกัน
            </p>
          </div>
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="container-page py-14">
        <div className="relative overflow-hidden rounded-[28px] bg-ink px-8 py-16 text-center text-paper md:px-16">
          <div className="starfield-soft pointer-events-none absolute inset-0 opacity-40" />
          <div className="relative">
            <span className="cjk text-3xl text-gold-soft">命合</span>
            <h2 className="mt-3 text-3xl text-paper md:text-4xl">พร้อมดูว่าดวงใครเข้ากับที่ไหน?</h2>
            <p className="mx-auto mt-3 max-w-xl text-paper/75">
              กรอกข้อมูลและดูตัวอย่างผลได้ก่อน — สมัครสมาชิกเฉพาะตอนต้องการรายงานฉบับเต็ม
            </p>
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
        <img
          src={img}
          alt={title}
          loading="lazy"
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
