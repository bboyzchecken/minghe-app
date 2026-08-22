import Link from 'next/link'
import type { Metadata } from 'next'
import { ElementIcon } from '@/components/element-icon'
import { AudienceSwitch } from '@/components/pricing/audience-switch'
import { BillingSteps, Check, CrossAudienceLink, Faq, PaymentNote, SectionHead } from '@/components/pricing/bits'
import {
  addonsFor,
  DEPTH_TIERS,
  EMPLOYER_PLAN_PRICE,
  EMPLOYER_WEEKLY_QUOTA,
  PLANS,
  TEAM_EXTRA_SEAT_PRICE,
  TEAM_FREE_SEATS,
  teamExtraCost,
  thb,
} from '@/lib/pricing'

export const metadata: Metadata = {
  title: 'ราคาสำหรับองค์กร',
  description: `ราคาสำหรับองค์กร/HR — สมาชิก ${EMPLOYER_PLAN_PRICE} บาท/เดือน วิเคราะห์ได้ ${EMPLOYER_WEEKLY_QUOTA} candidate ต่อสัปดาห์ เกินโควตาจ่ายรายหัว 199/299/399 บาท`,
}

const plan = PLANS.employer
const addons = addonsFor('employer')

const STEPS = [
  {
    title: `สมาชิก ${thb(EMPLOYER_PLAN_PRICE)} ฿/เดือน`,
    desc: 'ค่าใช้จ่ายประจำก้อนเดียว รวมทุกฟีเจอร์ฝั่งองค์กร ยกเลิกได้ทุกเมื่อ',
  },
  {
    title: `ใช้โควตา ${EMPLOYER_WEEKLY_QUOTA} คน/สัปดาห์`,
    desc: `วิเคราะห์ candidate ได้สัปดาห์ละ ${EMPLOYER_WEEKLY_QUOTA} คน ไม่มีค่าใช้จ่ายเพิ่ม โควตารีเซ็ตทุกวันจันทร์`,
  },
  {
    title: 'เกินโควตาค่อยจ่ายรายหัว',
    desc: 'สัปดาห์ไหนต้องดูเกินโควตา จ่ายเฉพาะคนที่เกิน เลือกความลึกได้ 199 / 299 / 399 บาท',
  },
]

/** ตัวอย่างค่าใช้จ่ายจริง — คำนวณจากค่าคงที่ชุดเดียวกับ flow ชำระเงิน */
const SCENARIOS = [
  {
    title: 'HR บริษัทเล็ก',
    detail: `เดือนละ ~${EMPLOYER_WEEKLY_QUOTA * 4} candidate — อยู่ในโควตาพอดี`,
    lines: [{ label: 'สมาชิกรายเดือน', amount: EMPLOYER_PLAN_PRICE }],
  },
  {
    title: 'สัปดาห์เร่งรับสมัคร',
    detail: 'มี candidate เกินโควตา 3 คน เลือก Standard ทั้งหมด',
    lines: [
      { label: 'สมาชิกรายเดือน', amount: EMPLOYER_PLAN_PRICE },
      { label: 'เกินโควตา 3 คน × Standard 199', amount: 3 * DEPTH_TIERS[0].price },
    ],
  },
  {
    title: 'จัดทีมใหม่ 8 คน',
    detail: `Team Roster ${TEAM_FREE_SEATS} คนแรกฟรี + วิเคราะห์ผู้บริหาร 1 คนแบบ Executive`,
    lines: [
      { label: 'สมาชิกรายเดือน', amount: EMPLOYER_PLAN_PRICE },
      { label: `สมาชิกทีมคนที่ ${TEAM_FREE_SEATS + 1}–8 (3 × ${TEAM_EXTRA_SEAT_PRICE})`, amount: teamExtraCost(8) },
      { label: 'Executive Insights 1 คน', amount: DEPTH_TIERS[2].price },
    ],
  },
]

const FAQ = [
  {
    q: `โควตา ${EMPLOYER_WEEKLY_QUOTA} candidate/สัปดาห์ นับยังไง และสะสมข้ามสัปดาห์ได้ไหม?`,
    a: 'นับตามจำนวนรายงานที่สั่งวิเคราะห์ในสัปดาห์นั้น รีเซ็ตทุกวันจันทร์ และไม่สะสมข้ามสัปดาห์ — สัปดาห์ไหนใช้ไม่ครบก็ไม่ทบไปสัปดาห์ถัดไป แต่สัปดาห์ไหนใช้เกินก็จ่ายเฉพาะส่วนที่เกินเป็นรายหัว',
  },
  {
    q: '199 / 299 / 399 คือค่าอะไร ต้องจ่ายทุกเดือนไหม?',
    a: `เป็นราคา "ต่อ candidate 1 คน" ที่จ่ายเฉพาะตอนใช้เกินโควตาของสัปดาห์นั้นเท่านั้น ไม่ใช่ค่าสมาชิกและไม่ใช่ค่ารายเดือน — ถ้าใช้ไม่เกินโควตา จ่ายแค่ค่าสมาชิก ${thb(EMPLOYER_PLAN_PRICE)} บาท/เดือนก้อนเดียว`,
  },
  {
    q: 'Executive Insights (399) กับ Executive Analysis (+89) ต่างกันยังไง?',
    a: 'Executive Insights คือ “ระดับความลึกของรายงาน” ทั้งฉบับ ส่วน Executive Analysis เป็น “บริการเสริม” ที่เพิ่มบทวิเคราะห์เจาะบทบาทผู้บริหาร/หัวหน้าทีมเข้าไปในรายงานที่สั่งอยู่แล้ว — เลือกอย่างใดอย่างหนึ่งหรือทั้งคู่ก็ได้',
  },
  {
    q: 'Team Roster คิดเงินยังไง?',
    a: `จำรายชื่อทีมไว้ในระบบและวิเคราะห์ความเข้ากันทั้งทีมได้ — ${TEAM_FREE_SEATS} คนแรกฟรี คนที่ ${TEAM_FREE_SEATS + 1} เป็นต้นไปคิด ${TEAM_EXTRA_SEAT_PRICE} บาท/คน (โปร “คนละครึ่งพลัส”)`,
  },
  {
    q: 'ข้อมูลวันเกิด candidate เก็บยังไงตาม PDPA?',
    a: (
      <>
        เก็บเท่าที่จำเป็นต่อการคำนวณ มีกล่องยินยอมก่อนชำระเงินทุกครั้ง และลบข้อมูลได้ตามคำขอ — อ่าน{' '}
        <Link href="/legal/privacy" className="text-gold hover:underline">
          นโยบายความเป็นส่วนตัว
        </Link>
      </>
    ),
  },
]

export default function EmployerPricing() {
  return (
    <div className="container-page py-8 md:py-10">
      <AudienceSwitch />

      {/* hero */}
      <div className="mx-auto max-w-2xl text-center">
        <span className="chip" style={{ borderColor: '#BE8A2E66', color: '#BE8A2E' }}>
          <ElementIcon element="metal" size={14} /> ราคาสำหรับองค์กร / HR
        </span>
        <h1 className="mt-4 text-4xl">จ่ายก้อนเดียวต่อเดือน ใช้ได้ทั้งทีม HR</h1>
        <p className="mt-3 text-balance text-ink-soft">
          หน้านี้แสดงเฉพาะราคาฝั่งองค์กร — ทุกตัวเลขด้านล่างคิดต่อ “candidate ที่วิเคราะห์”
          ไม่เกี่ยวกับแพ็กเกจฝั่งคนทำงาน
        </p>
      </div>

      {/* แผนหลัก */}
      <div className="mx-auto mt-10 max-w-3xl">
        <div className="relative overflow-hidden rounded-xl border border-gold bg-card p-8 shadow-card sm:p-10">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gold/10 blur-2xl" />
          <div className="grid gap-8 sm:grid-cols-[1fr_1.1fr] sm:items-start">
            <div>
              <div className="flex items-center gap-2">
                <ElementIcon element="metal" size={22} />
                <span className="text-sm font-medium text-ink-soft">{plan.name}</span>
              </div>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="font-display-en text-6xl font-semibold text-ink">{thb(plan.price)}</span>
                <span className="text-lg text-muted">฿ {plan.period}</span>
              </div>
              <div className="mt-2 inline-flex rounded-full bg-gold/[0.12] px-3 py-1 text-sm font-medium text-gold">
                {plan.quota}
              </div>
              <Link href="/employer/new" className="btn-primary mt-6 w-full">
                เริ่มวิเคราะห์ candidate
              </Link>
              <p className="mt-3 text-center text-xs text-muted">
                กรอกข้อมูลได้ก่อน สมัครสมาชิกตอนชำระเงิน · ยกเลิกได้ทุกเมื่อ
              </p>
            </div>

            <div>
              <div className="text-sm font-medium text-ink">รวมอยู่ในสมาชิกแล้ว</div>
              <ul className="mt-3 space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-ink-soft">
                    <Check /> {f}
                  </li>
                ))}
                <li className="flex items-start gap-2 text-sm text-ink-soft">
                  <Check /> รหัสเปิดรายงานปลอดภัย (ตั้ง PIN · กำหนดวันหมดอายุ · เพิกถอนได้)
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* คิดเงินยังไง */}
      <section className="mx-auto mt-16 max-w-4xl">
        <SectionHead
          eyebrow="How billing works"
          title="คิดเงินยังไง — อ่านจบใน 3 ขั้น"
          desc="ค่าสมาชิกคือก้อนหลัก ส่วนที่เหลือจ่ายเฉพาะเมื่อใช้เกินโควตาเท่านั้น"
        />
        <div className="mt-6">
          <BillingSteps steps={STEPS} />
        </div>
      </section>

      {/* เกินโควตา */}
      <section className="mx-auto mt-16 max-w-4xl">
        <SectionHead
          eyebrow="Over quota"
          title={`เกินโควตา ${EMPLOYER_WEEKLY_QUOTA} คน/สัปดาห์ แล้วจ่ายเท่าไร`}
          desc="ราคาต่อ candidate 1 คน — เลือกความลึกได้ตามความสำคัญของตำแหน่ง"
        />
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {DEPTH_TIERS.map((d) => (
            <div
              key={d.id}
              className={`relative rounded-lg border bg-card p-6 ${
                d.highlight ? 'border-gold shadow-soft' : 'border-line'
              }`}
            >
              {d.highlight && (
                <span className="absolute -top-2.5 right-5 rounded-full bg-gold px-2.5 py-0.5 text-[10px] font-medium text-cloud">
                  เลือกบ่อยที่สุด
                </span>
              )}
              <div className="flex items-baseline justify-between">
                <span className="font-medium text-ink">{d.label}</span>
                <span className="cjk text-sm text-muted">{d.cn}</span>
              </div>
              <div className="mt-2 font-display-en text-3xl font-semibold text-gold">
                {thb(d.price)} <span className="text-sm text-muted">฿ / candidate</span>
              </div>
              <p className="mt-2 text-sm text-ink-soft">{d.blurb}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-muted">
          จ่ายเป็นครั้ง เฉพาะคนที่เกินโควตาของสัปดาห์นั้น — ไม่ใช่ค่าบริการรายเดือนที่เพิ่มขึ้น
        </p>
      </section>

      {/* Team Roster */}
      <section className="mx-auto mt-16 max-w-4xl">
        <div className="grid gap-6 rounded-xl border border-line bg-card p-7 shadow-soft sm:grid-cols-[1.1fr_0.9fr] sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <ElementIcon element="wood" size={20} />
              <h2 className="text-xl">Team Roster — วิเคราะห์ทั้งทีม</h2>
            </div>
            <p className="mt-2 text-sm text-ink-soft">
              เก็บรายชื่อทีมไว้ในระบบ เลือกจากคลังมาวิเคราะห์ความเข้ากันทั้งทีมได้ทุกครั้งที่มี candidate ใหม่
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="chip">{TEAM_FREE_SEATS} คนแรก ฟรี</span>
              <span className="chip">
                คนที่ {TEAM_FREE_SEATS + 1} เป็นต้นไป {TEAM_EXTRA_SEAT_PRICE} ฿/คน
              </span>
            </div>
          </div>
          <div className="rounded-lg bg-paper-warm/60 p-5">
            <div className="text-xs font-medium text-ink-soft">ตัวอย่าง</div>
            <ul className="mt-2 space-y-1.5 text-sm text-ink-soft">
              {[5, 8, 12].map((n) => (
                <li key={n} className="flex items-center justify-between">
                  <span>ทีม {n} คน</span>
                  <span className="font-medium text-ink">
                    {teamExtraCost(n) === 0 ? 'ฟรี' : `+${thb(teamExtraCost(n))} ฿`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* บริการเสริม */}
      <section className="mx-auto mt-16 max-w-4xl">
        <SectionHead
          eyebrow="Add-ons"
          title="บริการเสริม (เลือกได้ต่อการวิเคราะห์)"
          desc="ไม่บังคับ — ติ๊กเพิ่มตอนสั่งวิเคราะห์เฉพาะครั้งที่ต้องการ"
        />
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {addons.map((a) => (
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
      </section>

      {/* ตัวอย่างบิล */}
      <section className="mx-auto mt-16 max-w-4xl">
        <SectionHead
          eyebrow="Real cost"
          title="เดือนหนึ่งจ่ายจริงเท่าไร"
          desc="ตัวอย่างการใช้งานจริง 3 แบบ (ราคารวมเป็นเงินบาท)"
        />
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {SCENARIOS.map((s) => {
            const total = s.lines.reduce((sum, l) => sum + l.amount, 0)
            return (
              <div key={s.title} className="flex flex-col rounded-lg border border-line bg-card p-6">
                <div className="font-medium text-ink">{s.title}</div>
                <p className="mt-1 text-xs text-ink-soft">{s.detail}</p>
                <ul className="mt-4 flex-1 space-y-1.5 text-sm text-ink-soft">
                  {s.lines.map((l) => (
                    <li key={l.label} className="flex items-baseline justify-between gap-3">
                      <span className="text-xs">{l.label}</span>
                      <span className="flex-none">{thb(l.amount)}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex items-baseline justify-between border-t border-line pt-3">
                  <span className="text-sm font-medium text-ink">รวม</span>
                  <span className="font-display-en text-2xl font-semibold text-gold">{thb(total)} ฿</span>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* FAQ */}
      <section className="mt-16">
        <SectionHead title="คำถามที่พบบ่อย (ฝั่งองค์กร)" />
        <Faq items={FAQ} />
      </section>

      {/* CTA */}
      <section className="mx-auto mt-16 max-w-4xl">
        <div className="starfield-soft rounded-xl bg-ink px-8 py-12 text-center text-paper">
          <h2 className="text-3xl text-paper">พร้อมวิเคราะห์ candidate คนแรก?</h2>
          <p className="mx-auto mt-2 max-w-lg text-paper/80">เริ่มกรอกข้อมูลได้ทันที สมัครสมาชิกตอนชำระเงิน</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/employer/new" className="btn-primary">
              เริ่มวิเคราะห์
            </Link>
            <Link href="/report" className="btn-ghost !border-paper/30 !text-paper hover:!bg-paper/10">
              ดูตัวอย่างรายงาน
            </Link>
          </div>
        </div>
      </section>

      <CrossAudienceLink
        el="water"
        title="เข้ามาผิดฝั่ง?"
        desc="ถ้าคุณเป็นคนทำงานที่อยากเช็กบริษัทก่อนตอบรับงาน ราคาเป็นคนละชุดกับหน้านี้"
        href="/pricing/jobseeker"
        cta="ดูราคาสำหรับคนทำงาน"
      />

      <PaymentNote />
    </div>
  )
}
