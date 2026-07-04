import type { Metadata } from 'next'
import Link from 'next/link'
import { Badge, Button, Card, GoldDivider, Seal, SectionTitle } from '@/components/ui'
import { ADDONS, REPORT_PACKS } from '@/lib/pricing'
import { formatBaht } from '@/lib/utils'
import { DemoReportCard } from './_components/demo-report-card'

export const metadata: Metadata = {
  title: '命合 Mìnghé — เมื่อ "คนที่ใช่" เจอ "ที่ที่ใช่"',
  description:
    'วิเคราะห์ความเหมาะสมของพนักงานกับองค์กรด้วยปาจือ (八字) และโหงวเฮ้ง แม่นยำระดับซินแสตัวจริง — รับรายงานความเหมาะสม 命合 ผ่านรหัสเปิดรายงานที่ปลอดภัย',
}

/** แถบความแม่นยำ 3 จุด (มาตรฐานการคำนวณ) */
const PRECISION_POINTS = [
  {
    cn: '立春',
    title: 'ขอบเขตปีที่ลี่ชุน',
    detail: 'เปลี่ยนปีนักษัตรที่วันลี่ชุนตามตำราแท้ ไม่ใช่ 1 มกราคม และไม่ใช่วันตรุษจีน',
  },
  {
    cn: '節',
    title: 'สารทหลัก 12 จุด',
    detail: 'กำหนดเสาเดือนจากสารทหลัก (節) ทั้ง 12 จุดตามตำแหน่งดวงอาทิตย์จริง',
  },
  {
    cn: '真太陽時',
    title: 'เวลาสุริยะจริง',
    detail: 'ปรับเวลาเกิดเป็นเวลาสุริยะจริงตามจังหวัดเกิด — ต่างกันได้ถึง ±30 นาทีในไทย',
  },
]

/** ขั้นตอนการทำงาน 3 ขั้น */
const HOW_IT_WORKS = [
  {
    step: '①',
    title: 'ส่งข้อมูลและรูป',
    detail:
      'กรอกวัน-เวลา-จังหวัดเกิดของพนักงานหรือผู้สมัคร พร้อมรูปใบหน้าสำหรับอ่านโหงวเฮ้ง และข้อมูลองค์กรที่ต้องการดูความเข้ากัน',
  },
  {
    step: '②',
    title: 'เครื่องคำนวณ + ซินแสดิจิทัลวิเคราะห์',
    detail:
      'ระบบตั้งผังปาจือ (命盘) วิเคราะห์กำลังธาตุ ธาตุอุปการะ และประเมินดัชนีสมพงษ์ (合 Index) ระหว่างคนกับองค์กรตามตำราจื่อผิงมาตรฐาน',
  },
  {
    step: '③',
    title: 'รับรายงานผ่านรหัสเปิดรายงาน',
    detail:
      'ได้รับรหัสเปิดรายงานพร้อม PIN สำหรับเข้าอ่านรายงานความเหมาะสม 命合 ฉบับเต็ม อ่านออนไลน์หรือสั่งพิมพ์เป็นเอกสารได้ทันที',
  },
]

/** Key messages 4 เสาหลัก */
const KEY_MESSAGES = [
  {
    cn: '準',
    title: 'แม่นยำจริง',
    detail:
      'คำนวณด้วยหลักลี่ชุน สารทหลัก และเวลาสุริยะจริง อ้างอิงตำราจื่อผิง (子平) มาตรฐาน — ไม่ใช่โปรแกรมดูดวงแบบประมาณการ',
  },
  {
    cn: '合',
    title: 'ดูความเข้ากัน ไม่ใช่ดูดวงเดี่ยว',
    detail:
      'หัวใจของ 命合 คือความสัมพันธ์ระหว่างผังของคนกับธาตุขององค์กรและทีม — เพราะคนเก่งจะเปล่งประกายเมื่ออยู่ถูกที่',
  },
  {
    cn: '密',
    title: 'มืออาชีพและเป็นความลับ',
    detail:
      'รายงานส่งมอบผ่านรหัสเปิดรายงาน + PIN เพิกถอนการเข้าถึงได้ทุกเมื่อ พร้อมบันทึกการเข้าอ่านทุกครั้ง ข้อมูลใช้จัดทำรายงานเท่านั้น',
  },
  {
    cn: '用',
    title: 'นำไปใช้ได้จริง',
    detail:
      'ไม่หยุดแค่คำทำนาย — รายงานให้ข้อเสนอแนะการวางตำแหน่งงาน แนวทางการสื่อสาร และจุดที่ควรระวัง ในภาษาที่ HR ใช้ต่อได้ทันที',
  },
]

/** กลุ่มที่เหมาะกับบริการ */
const AUDIENCES = [
  {
    title: 'HR และทีมสรรหา',
    detail:
      'ใช้เป็นข้อมูลอีกมิติประกอบการพิจารณาผู้สมัครและการวางตำแหน่งงาน ควบคู่กับทักษะ ประสบการณ์ และการสัมภาษณ์',
  },
  {
    title: 'เจ้าของกิจการและผู้บริหาร',
    detail:
      'ดูความเข้ากันของคนสำคัญกับธาตุขององค์กรและทีมบริหาร ก่อนตัดสินใจแต่งตั้ง เลื่อนตำแหน่ง หรือจัดทีมใหม่',
  },
  {
    title: 'คนทำงานที่กำลังเลือกที่ทาง',
    detail:
      'อยากรู้ว่าองค์กรแบบไหน อุตสาหกรรมใด เกื้อหนุนธาตุของเราที่สุด — ใช้รายงานเป็นเข็มทิศก่อนย้ายงานครั้งสำคัญ',
  },
]

export default function LandingPage() {
  return (
    <>
      {/* ---- Hero ---- */}
      <section className="starfield bg-ink">
        <div className="mx-auto max-w-6xl px-4 pb-20 pt-24 text-center md:pb-28 md:pt-32">
          <Seal size={92} className="mx-auto shadow-lg" />
          <h1 className="mx-auto mt-8 max-w-3xl font-display-th text-4xl font-semibold text-paper md:text-6xl">
            เมื่อ &ldquo;คนที่ใช่&rdquo; เจอ &ldquo;ที่ที่ใช่&rdquo;
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-paper/75">
            วิเคราะห์ความเหมาะสมของพนักงานกับองค์กรด้วยปาจือ (八字) และโหงวเฮ้ง
            แม่นยำระดับซินแสตัวจริง
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <Button href="/order/new" className="px-7 py-3 text-base">
              เริ่มวิเคราะห์ความเหมาะสม
            </Button>
            <Button variant="gold" href="/r/MH-DEMO-2569" className="px-7 py-3 text-base">
              ดูตัวอย่างรายงาน
            </Button>
          </div>
          <p className="mt-7 text-sm text-paper/50">
            รายงานความเหมาะสม 命合 · ส่งมอบผ่านรหัสเปิดรายงานที่ปลอดภัย
          </p>
        </div>

        {/* แถบความแม่นยำ */}
        <div className="border-t border-gold/25">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 md:grid-cols-3">
            {PRECISION_POINTS.map((p) => (
              <div key={p.title} className="flex items-start gap-4">
                <span className="font-cjk text-2xl font-bold leading-tight text-gold-soft">
                  {p.cn}
                </span>
                <div>
                  <p className="font-semibold text-paper">{p.title}</p>
                  <p className="mt-1 text-sm text-paper/60">{p.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- How it works ---- */}
      <section id="how-it-works" className="texture-paper bg-paper py-20">
        <div className="mx-auto max-w-6xl px-4">
          <SectionTitle
            eyebrow="วิธีทำงาน"
            title="สามขั้นตอน สู่คำตอบว่าใช่หรือไม่ใช่"
            description="ส่งข้อมูลไม่กี่นาที ระบบและซินแสดิจิทัลจัดการที่เหลือ — ได้รายงานฉบับมืออาชีพพร้อมใช้"
          />
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {HOW_IT_WORKS.map((s) => (
              <Card key={s.title} className="relative">
                <span className="font-display-th text-4xl text-gold" aria-hidden>
                  {s.step}
                </span>
                <h3 className="mt-3 text-xl font-semibold text-ink">{s.title}</h3>
                <p className="mt-2 text-sm text-muted">{s.detail}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ---- ตัวอย่างรายงาน ---- */}
      <section className="texture-paper bg-paper-warm py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <p className="text-sm font-semibold tracking-wide text-cinnabar">ตัวอย่างรายงาน</p>
              <h2 className="mt-2 text-3xl font-semibold text-ink md:text-4xl">
                รายงานความเหมาะสม 命合 หน้าตาเป็นอย่างไร
              </h2>
              <GoldDivider className="my-6 max-w-xs" />
              <ul className="space-y-4 text-ink-soft">
                <li className="flex gap-3">
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                  <span>
                    <strong className="font-semibold text-ink">ดัชนีสมพงษ์ (合 Index)</strong>{' '}
                    คะแนนความเข้ากันของคนกับองค์กร 0–100 พร้อมเกณฑ์การอ่านค่า
                  </span>
                </li>
                <li className="flex gap-3">
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                  <span>
                    <strong className="font-semibold text-ink">ผังปาจือ (命盘) เต็มรูป</strong>{' '}
                    สี่เสาแปดอักษร กำลังธาตุ ธาตุอุปการะ และเทพสิบประจำเสา
                  </span>
                </li>
                <li className="flex gap-3">
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                  <span>
                    <strong className="font-semibold text-ink">บทวิเคราะห์จากซินแส</strong>{' '}
                    อ่านผังร่วมกับโหงวเฮ้ง สรุปจุดแข็ง จุดที่ควรระวัง และข้อเสนอแนะที่ใช้ได้จริง
                  </span>
                </li>
              </ul>
              <div className="mt-8">
                <Button variant="outline" href="/r/MH-DEMO-2569">
                  เปิดรายงานเดโม (รหัส MH-DEMO-2569)
                </Button>
              </div>
            </div>
            <DemoReportCard />
          </div>
        </div>
      </section>

      {/* ---- Key messages 4 เสาหลัก ---- */}
      <section className="texture-paper bg-paper py-20">
        <div className="mx-auto max-w-6xl px-4">
          <SectionTitle
            eyebrow="ทำไมต้อง 命合"
            title="สี่เสาหลักของหมิงเหอ"
            description="เราให้เกียรติศาสตร์โบราณด้วยการคำนวณอย่างเคร่งครัด และให้เกียรติผู้ใช้ด้วยความเป็นมืออาชีพ"
          />
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {KEY_MESSAGES.map((m) => (
              <Card key={m.title}>
                <span className="font-cjk text-3xl font-bold text-cinnabar" aria-hidden>
                  {m.cn}
                </span>
                <h3 className="mt-3 text-lg font-semibold text-ink">{m.title}</h3>
                <p className="mt-2 text-sm text-muted">{m.detail}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ---- ราคา (ย่อ) ---- */}
      <section className="texture-paper bg-paper-warm py-20">
        <div className="mx-auto max-w-6xl px-4">
          <SectionTitle
            eyebrow="ราคา"
            title="เริ่มต้นเพียงรายงานเดียว"
            description="ซื้อเป็นแพ็กยิ่งคุ้ม — สมาชิกได้เครดิตไว้สร้างออเดอร์เมื่อไรก็ได้"
          />
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {REPORT_PACKS.map((pack) => (
              <Card
                key={pack.id}
                className={
                  pack.highlight
                    ? 'relative border-gold shadow-card ring-1 ring-gold'
                    : 'relative'
                }
              >
                {pack.highlight ? (
                  <Badge tone="gold" className="absolute -top-3 left-1/2 -translate-x-1/2">
                    คุ้มที่สุด
                  </Badge>
                ) : null}
                <p className="text-sm font-semibold text-muted">{pack.label}</p>
                <p className="mt-2 font-mono text-3xl font-semibold text-ink">
                  {formatBaht(pack.priceSatang)}
                </p>
                <p className="mt-1 text-sm text-muted">
                  เฉลี่ย {formatBaht(pack.perReportSatang)}/รายงาน · {pack.reports} รายงาน
                </p>
              </Card>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Button href="/order/new">เริ่มวิเคราะห์ความเหมาะสม</Button>
            <Link
              href="/pricing"
              className="text-sm font-semibold text-ink-soft underline-offset-4 hover:text-cinnabar hover:underline"
            >
              ดูราคาและแพ็กเกจทั้งหมด →
            </Link>
          </div>
        </div>
      </section>

      {/* ---- กลุ่มเป้าหมาย + บริการเสริม ---- */}
      <section className="texture-paper bg-paper py-20">
        <div className="mx-auto max-w-6xl px-4">
          <SectionTitle
            eyebrow="เหมาะกับใคร"
            title="ทุกการตัดสินใจเรื่องคน ควรมีข้อมูลครบทุกมิติ"
          />
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {AUDIENCES.map((a) => (
              <Card key={a.title}>
                <h3 className="text-lg font-semibold text-ink">{a.title}</h3>
                <p className="mt-2 text-sm text-muted">{a.detail}</p>
              </Card>
            ))}
          </div>

          <GoldDivider className="my-14" />

          <SectionTitle
            eyebrow="บริการเสริม"
            title="ต่อยอดรายงานให้ลึกยิ่งขึ้น"
            description="เลือกเพิ่มได้ตอนสร้างออเดอร์ — โดยเฉพาะการนั่งคุยกับซินแสตัวจริงแบบตัวต่อตัว"
          />
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {ADDONS.map((addon) => (
              <Card
                key={addon.id}
                className={
                  addon.id === 'sinsae-call' ? 'border-gold ring-1 ring-gold' : undefined
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-semibold text-ink">{addon.label}</h3>
                  {addon.id === 'sinsae-call' ? <Badge tone="gold">แนะนำ</Badge> : null}
                </div>
                <p className="mt-2 text-sm text-muted">{addon.description}</p>
                <p className="mt-4 font-mono text-xl font-semibold text-ink">
                  +{formatBaht(addon.priceSatang)}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ---- CTA ปิดท้าย ---- */}
      <section className="starfield bg-ink">
        <div className="mx-auto max-w-3xl px-4 py-20 text-center md:py-24">
          <Seal size={64} className="mx-auto" />
          <h2 className="mt-6 font-display-th text-3xl font-semibold text-paper md:text-4xl">
            ให้ดวงดาวช่วยยืนยัน ว่าคนที่ใช่กำลังจะอยู่ถูกที่
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-paper/70">
            เริ่มจากรายงานเดียว รู้ลึกทั้งผังปาจือ โหงวเฮ้ง และดัชนีสมพงษ์ (合 Index)
            ระหว่างคนกับองค์กรของคุณ
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button href="/order/new" className="px-7 py-3 text-base">
              เริ่มวิเคราะห์ความเหมาะสม
            </Button>
            <Button variant="gold" href="/pricing" className="px-7 py-3 text-base">
              ดูราคาและแพ็กเกจ
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}
