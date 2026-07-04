import type { Metadata } from 'next'
import Link from 'next/link'
import { Badge, Button, Card, GoldDivider, Notice, SectionTitle } from '@/components/ui'
import { ADDONS, PLANS, REPORT_PACKS } from '@/lib/pricing'
import { formatBaht } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'ราคาและแพ็กเกจ',
  description:
    'ราคารายงานความเหมาะสม 命合 — รายงานเดี่ยว แพ็กเครดิต แผนสมาชิกรายเดือน และบริการเสริม รวมถึงปรึกษาซินแสตัวจริง',
}

export default function PricingPage() {
  return (
    <div className="texture-paper bg-paper">
      <div className="mx-auto max-w-6xl px-4 py-16 md:py-20">
        <SectionTitle
          eyebrow="ราคาและแพ็กเกจ"
          title="ลงทุนกับการตัดสินใจเรื่องคน อย่างคุ้มค่า"
          description="เลือกได้ตามจังหวะการใช้งาน — ซื้อรายครั้ง ซื้อเป็นแพ็กเครดิต หรือสมัครสมาชิกรายเดือนสำหรับองค์กร"
        />

        {/* ---- แพ็กรายงาน ---- */}
        <section className="mt-14">
          <h2 className="text-center text-2xl font-semibold text-ink">แพ็กรายงาน</h2>
          <p className="mt-2 text-center text-sm text-muted">
            จ่ายครั้งเดียว ไม่มีค่าบริการรายเดือน — สมาชิกจะได้รับเป็น &ldquo;เครดิต&rdquo;
            เก็บไว้ใช้สร้างออเดอร์เมื่อไรก็ได้
          </p>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {REPORT_PACKS.map((pack) => (
              <Card
                key={pack.id}
                className={
                  pack.highlight
                    ? 'relative flex flex-col border-gold ring-1 ring-gold'
                    : 'relative flex flex-col'
                }
              >
                {pack.highlight ? (
                  <Badge tone="gold" className="absolute -top-3 left-1/2 -translate-x-1/2">
                    คุ้มที่สุด
                  </Badge>
                ) : null}
                <p className="text-sm font-semibold text-muted">{pack.label}</p>
                <p className="mt-3 font-mono text-4xl font-semibold text-ink">
                  {formatBaht(pack.priceSatang)}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {pack.reports} รายงาน · เฉลี่ย {formatBaht(pack.perReportSatang)}/รายงาน
                </p>
                <ul className="mt-5 flex-1 space-y-2 text-sm text-ink-soft">
                  <li className="flex gap-2">
                    <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                    รายงานความเหมาะสม 命合 ฉบับเต็ม
                  </li>
                  <li className="flex gap-2">
                    <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                    ผังปาจือ (命盘) + โหงวเฮ้ง + ดัชนีสมพงษ์ (合 Index)
                  </li>
                  <li className="flex gap-2">
                    <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                    ส่งมอบผ่านรหัสเปิดรายงาน + PIN
                  </li>
                </ul>
                <Button
                  href="/order/new"
                  variant={pack.highlight ? 'primary' : 'outline'}
                  className="mt-6 w-full"
                >
                  เริ่มวิเคราะห์ความเหมาะสม
                </Button>
              </Card>
            ))}
          </div>
          <Notice tone="info" className="mx-auto mt-8 max-w-3xl">
            <strong className="font-semibold">วิธีใช้เครดิต:</strong> ผู้ใช้ทั่วไป (guest)
            ชำระเป็นรายครั้งตอนสร้างออเดอร์ ส่วนสมาชิกที่ซื้อแพ็กจะได้รับเครดิตเข้าบัญชี
            ใช้หักค่ารายงานได้ทันทีโดยไม่ต้องชำระซ้ำ — เครดิตไม่มีวันหมดอายุ
          </Notice>
        </section>

        <GoldDivider className="my-16" />

        {/* ---- แผนสมาชิกรายเดือน ---- */}
        <section>
          <h2 className="text-center text-2xl font-semibold text-ink">
            แผนสมาชิกรายเดือน สำหรับองค์กร
          </h2>
          <p className="mt-2 text-center text-sm text-muted">
            เหมาะกับทีม HR และองค์กรที่วิเคราะห์ต่อเนื่องทุกเดือน
          </p>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {PLANS.map((plan) => (
              <Card
                key={plan.id}
                className={
                  plan.highlight
                    ? 'relative flex flex-col border-gold ring-1 ring-gold'
                    : 'relative flex flex-col'
                }
              >
                {plan.highlight ? (
                  <Badge tone="gold" className="absolute -top-3 left-1/2 -translate-x-1/2">
                    ยอดนิยม
                  </Badge>
                ) : null}
                <p className="font-display-en text-lg tracking-widest text-ink">{plan.label}</p>
                <p className="mt-3 font-mono text-4xl font-semibold text-ink">
                  {formatBaht(plan.priceSatangPerMonth)}
                  <span className="ml-1 text-sm font-normal text-muted">/เดือน</span>
                </p>
                <p className="mt-1 text-sm text-muted">โควตา {plan.reportsQuota} รายงานต่อเดือน</p>
                <ul className="mt-5 flex-1 space-y-2 text-sm text-ink-soft">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span
                        aria-hidden
                        className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold"
                      />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  href="/register"
                  variant={plan.highlight ? 'primary' : 'outline'}
                  className="mt-6 w-full"
                >
                  สมัครสมาชิกเริ่มต้นใช้งาน
                </Button>
              </Card>
            ))}
          </div>
        </section>

        <GoldDivider className="my-16" />

        {/* ---- บริการเสริม ---- */}
        <section>
          <h2 className="text-center text-2xl font-semibold text-ink">บริการเสริม (Add-on)</h2>
          <p className="mt-2 text-center text-sm text-muted">
            เลือกเพิ่มได้ในขั้นตอนสร้างออเดอร์ คิดราคาต่อรายงาน
          </p>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {ADDONS.map((addon) => (
              <Card
                key={addon.id}
                className={
                  addon.id === 'sinsae-call'
                    ? 'flex flex-col border-gold ring-1 ring-gold'
                    : 'flex flex-col'
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-semibold text-ink">{addon.label}</h3>
                  {addon.id === 'sinsae-call' ? <Badge tone="gold">แนะนำ</Badge> : null}
                </div>
                <p className="mt-2 flex-1 text-sm text-muted">{addon.description}</p>
                <p className="mt-4 font-mono text-2xl font-semibold text-ink">
                  +{formatBaht(addon.priceSatang)}
                </p>
              </Card>
            ))}
          </div>
        </section>

        {/* ---- CTA ---- */}
        <section className="mt-16 rounded-lg bg-ink px-6 py-12 text-center starfield">
          <h2 className="font-display-th text-2xl font-semibold text-paper md:text-3xl">
            พร้อมรู้แล้วหรือยัง ว่าใช่หรือไม่ใช่
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-paper/70">
            สร้างออเดอร์แรกได้เลยโดยไม่ต้องสมัครสมาชิก หรือสมัครสมาชิกเพื่อสะสมเครดิตและดูผลย้อนหลัง
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-4">
            <Button href="/order/new">เริ่มวิเคราะห์ความเหมาะสม</Button>
            <Button variant="gold" href="/register">
              สมัครสมาชิก
            </Button>
          </div>
          <p className="mt-6 text-xs text-paper/50">
            มีคำถามเรื่องราคาแบบองค์กรขนาดใหญ่?{' '}
            <Link href="/terms" className="underline underline-offset-4 hover:text-gold-soft">
              อ่านข้อตกลงการใช้งาน
            </Link>{' '}
            หรือติดต่อทีมงานที่ hello@minghe.app
          </p>
        </section>
      </div>
    </div>
  )
}
