import Link from 'next/link'
import type { Metadata } from 'next'
import { ElementIcon } from '@/components/element-icon'
import { AudienceSwitch } from '@/components/pricing/audience-switch'
import { BillingSteps, Check, CrossAudienceLink, Faq, PaymentNote, SectionHead } from '@/components/pricing/bits'
import {
  JOBSEEKER_PAY_PER_VIEW_PRICE,
  JOBSEEKER_PLAN_PRICE,
  JOBSEEKER_WEEKLY_QUOTA,
  PLANS,
  thb,
} from '@/lib/pricing'

export const metadata: Metadata = {
  title: 'ราคาสำหรับคนทำงาน',
  description: `ราคาสำหรับคนทำงาน — จ่ายรายครั้ง ${JOBSEEKER_PAY_PER_VIEW_PRICE} บาท/บริษัท หรือสมาชิก ${JOBSEEKER_PLAN_PRICE} บาท/เดือน เช็กได้ ${JOBSEEKER_WEEKLY_QUOTA} บริษัท/สัปดาห์`,
}

const plan = PLANS.jobseeker
const monthlyQuota = JOBSEEKER_WEEKLY_QUOTA * 4
/** จุดคุ้มทุน: จ่ายรายครั้งกี่บริษัทถึงแพงกว่าค่าสมาชิกรายเดือน */
const BREAK_EVEN = Math.ceil(JOBSEEKER_PLAN_PRICE / JOBSEEKER_PAY_PER_VIEW_PRICE)

const OPTIONS = [
  {
    id: 'payperview' as const,
    tag: 'จ่ายเท่าที่ใช้',
    name: 'Pay-per-view',
    price: JOBSEEKER_PAY_PER_VIEW_PRICE,
    unit: '฿ / บริษัท',
    lead: 'มีบริษัทในใจแค่ที่เดียว จ่ายครั้งเดียวจบ',
    features: [
      'รายงานความสมพงษ์ 1 บริษัท เต็มฉบับ',
      'ไม่มีค่าสมาชิก ไม่ตัดเงินอัตโนมัติ',
      'เก็บรายงานไว้เปิดซ้ำได้ด้วยรหัสเปิด',
    ],
    best: 'เหมาะกับคนที่กำลังตัดสินใจรับ offer ที่เดียว',
  },
  {
    id: 'subscription' as const,
    tag: 'คุ้มกว่าถ้าเช็กหลายที่',
    name: 'สมาชิกรายเดือน',
    price: JOBSEEKER_PLAN_PRICE,
    unit: `฿ / เดือน`,
    lead: `เช็กได้ ${JOBSEEKER_WEEKLY_QUOTA} บริษัท/สัปดาห์ (สูงสุด ~${monthlyQuota} บริษัท/เดือน)`,
    features: plan.features,
    best: 'เหมาะกับช่วงกำลังหางานจริงจัง สมัครหลายที่พร้อมกัน',
    highlight: true,
  },
]

const STEPS = [
  {
    title: 'กรอกข้อมูลบริษัท',
    desc: 'วันก่อตั้ง (ถ้าทราบ) หรือใช้ประเภทอุตสาหกรรมแทนได้ — กรอกเองได้ทันที',
  },
  {
    title: 'เลือกวิธีจ่าย',
    desc: `จ่ายครั้งเดียว ${thb(JOBSEEKER_PAY_PER_VIEW_PRICE)} ฿ ต่อบริษัท หรือสมัครสมาชิก ${thb(JOBSEEKER_PLAN_PRICE)} ฿/เดือน`,
  },
  {
    title: 'รับรายงาน',
    desc: 'ได้รหัสเปิดรายงานทันทีหลังชำระเงิน เปิดอ่านซ้ำได้ทุกเมื่อ',
  },
]

const INCLUDED = [
  'ผังปาจือ (八字) ของคุณ + ธาตุองค์กร',
  'ดัชนีความสมพงษ์ระหว่างคุณกับที่นั่น',
  'จุดที่เกื้อกูลกัน และจุดที่ต้องระวัง',
  'คำแนะนำก่อนตัดสินใจสมัคร/ตอบรับงาน',
]

const FAQ = [
  {
    q: `ควรจ่ายรายครั้งหรือสมัครรายเดือนดี?`,
    a: `ถ้าเช็กบริษัทเดียวจบ จ่ายรายครั้ง ${thb(JOBSEEKER_PAY_PER_VIEW_PRICE)} บาทถูกกว่า — แต่ถ้าเช็กตั้งแต่ ${BREAK_EVEN} บริษัทขึ้นไปในเดือนเดียว สมาชิกรายเดือน ${thb(JOBSEEKER_PLAN_PRICE)} บาทคุ้มกว่า และยังเหลือโควตาให้เช็กต่อได้อีก`,
  },
  {
    q: 'จ่ายรายครั้งแล้วต้องสมัครสมาชิกไหม?',
    a: 'ไม่ต้อง — จ่ายรายครั้งคือจบเป็นครั้ง ๆ ไม่มีการตัดเงินรอบถัดไป (ต้องมีบัญชีเพื่อเก็บรายงานและออกรหัสเปิดให้เท่านั้น)',
  },
  {
    q: `โควตา ${JOBSEEKER_WEEKLY_QUOTA} บริษัท/สัปดาห์ ใช้ไม่หมดแล้วทบได้ไหม?`,
    a: 'ไม่ทบ โควตารีเซ็ตทุกวันจันทร์ — ถ้าสัปดาห์นั้นอยากเช็กเพิ่ม สามารถจ่ายรายครั้งเสริมได้',
  },
  {
    q: 'ไม่รู้วันก่อตั้งบริษัท ใช้ได้ไหม?',
    a: 'ได้ — ระบบใช้ประเภทอุตสาหกรรม ทิศที่ตั้ง และขนาดองค์กรมาประเมินธาตุองค์กรแทน ผลจะละเอียดที่สุดเมื่อมีวันก่อตั้ง (เฟสถัดไปจะเชื่อม DBD ให้ค้นอัตโนมัติ)',
  },
  {
    q: 'บริษัทที่ถูกเช็กจะรู้ไหมว่าเราเช็ก?',
    a: (
      <>
        ไม่รู้ — รายงานเป็นของคุณคนเดียว เปิดด้วยรหัสของคุณเอง และไม่มีการแจ้งไปยังบริษัท อ่านเพิ่มที่{' '}
        <Link href="/legal/privacy" className="text-gold hover:underline">
          นโยบายความเป็นส่วนตัว
        </Link>
      </>
    ),
  },
]

export default function JobSeekerPricing() {
  return (
    <div className="container-page py-8 md:py-10">
      <AudienceSwitch />

      {/* hero */}
      <div className="mx-auto max-w-2xl text-center">
        <span className="chip" style={{ borderColor: '#5E9BB566', color: '#5E9BB5' }}>
          <ElementIcon element="water" size={14} /> ราคาสำหรับคนทำงาน
        </span>
        <h1 className="mt-4 text-4xl">จ่ายรายครั้งก็ได้ ไม่ต้องผูกรายเดือน</h1>
        <p className="mt-3 text-balance text-ink-soft">
          หน้านี้แสดงเฉพาะราคาฝั่งคนทำงาน — ทุกตัวเลขคิดต่อ “บริษัทที่เช็ก” 1 แห่ง
          ไม่เกี่ยวกับแพ็กเกจฝั่งองค์กร
        </p>
      </div>

      {/* สองตัวเลือก */}
      <div className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-2">
        {OPTIONS.map((o) => (
          <div
            key={o.id}
            className={`relative flex flex-col rounded-xl border bg-card p-8 shadow-card ${
              o.highlight ? 'border-element-water' : 'border-line'
            }`}
          >
            <span
              className={`absolute -top-3 left-8 rounded-full px-3 py-1 text-xs font-medium ${
                o.highlight ? 'bg-element-water text-cloud' : 'border border-line bg-cloud text-ink-soft'
              }`}
            >
              {o.tag}
            </span>

            <div className="text-sm font-medium text-ink-soft">{o.name}</div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="font-display-en text-5xl font-semibold text-ink">{thb(o.price)}</span>
              <span className="text-sm text-muted">{o.unit}</span>
            </div>
            <p className="mt-2 text-sm text-element-water">{o.lead}</p>

            <ul className="mt-5 flex-1 space-y-2.5">
              {o.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-ink-soft">
                  <Check /> {f}
                </li>
              ))}
            </ul>

            <div className="mt-5 rounded-lg bg-paper-warm/60 p-3 text-xs text-ink-soft">{o.best}</div>

            <Link
              href="/jobseeker/new"
              className={`mt-6 ${o.highlight ? 'btn-primary' : 'btn-ghost'}`}
            >
              {o.highlight ? 'สมัครสมาชิก' : 'เช็กบริษัทเดียว'}
            </Link>
          </div>
        ))}
      </div>

      <p className="mx-auto mt-5 max-w-2xl rounded-lg border border-line bg-cloud px-5 py-3 text-center text-sm text-ink-soft">
        <b className="text-ink">จุดคุ้มทุนง่าย ๆ:</b> เช็ก 1 บริษัท → จ่ายรายครั้งถูกกว่า ·
        เช็กตั้งแต่ {BREAK_EVEN} บริษัทขึ้นไปในเดือนเดียว → สมาชิกรายเดือนคุ้มกว่า
      </p>

      {/* ขั้นตอน */}
      <section className="mx-auto mt-16 max-w-4xl">
        <SectionHead
          eyebrow="How it works"
          title="ใช้ยังไง — 3 ขั้นจบ"
          desc="ไม่มีค่าใช้จ่ายแอบแฝง เห็นยอดชำระก่อนกดยืนยันเสมอ"
        />
        <div className="mt-6">
          <BillingSteps steps={STEPS} />
        </div>
      </section>

      {/* ได้อะไรบ้าง */}
      <section className="mx-auto mt-16 max-w-4xl">
        <div className="grid gap-6 rounded-xl border border-line bg-card p-7 shadow-soft sm:grid-cols-[1fr_1fr] sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <ElementIcon element="water" size={20} />
              <h2 className="text-xl">ในราคานั้นได้อะไรบ้าง</h2>
            </div>
            <p className="mt-2 text-sm text-ink-soft">
              รายงาน 1 ฉบับ = 1 บริษัท ทั้งสองวิธีจ่ายได้รายงานแบบเดียวกัน ต่างกันแค่วิธีชำระเงิน
            </p>
            <Link href="/report" className="mt-4 inline-block text-sm text-gold hover:underline">
              ดูตัวอย่างรายงานฉบับเต็ม →
            </Link>
          </div>
          <ul className="space-y-2.5">
            {INCLUDED.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-ink-soft">
                <Check /> {f}
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-4 text-center text-xs text-muted">
          บริการเสริม (ผลด่วน · ปรึกษาซินแสตัวต่อตัว) เปิดเฉพาะฝั่งองค์กรในเฟสนี้ —
          ฝั่งคนทำงานรายงานส่งภายใน 24 ชั่วโมง
        </p>
      </section>

      {/* FAQ */}
      <section className="mt-16">
        <SectionHead title="คำถามที่พบบ่อย (ฝั่งคนทำงาน)" />
        <Faq items={FAQ} />
      </section>

      {/* CTA */}
      <section className="mx-auto mt-16 max-w-4xl">
        <div className="starfield-soft rounded-xl bg-ink px-8 py-12 text-center text-paper">
          <h2 className="text-3xl text-paper">ที่ที่ใช่ กำลังรออยู่</h2>
          <p className="mx-auto mt-2 max-w-lg text-paper/80">
            เริ่มเช็กบริษัทแรกได้ทันที เลือกวิธีจ่ายตอนสรุปยอด
          </p>
          <Link href="/jobseeker/new" className="btn-primary mt-6">
            เช็กบริษัท
          </Link>
        </div>
      </section>

      <CrossAudienceLink
        el="metal"
        title="กำลังหาราคาสำหรับบริษัท?"
        desc="ถ้าคุณเป็น HR หรือเจ้าของกิจการที่ต้องวิเคราะห์ candidate ราคาเป็นคนละชุดกับหน้านี้"
        href="/pricing/employer"
        cta="ดูราคาสำหรับองค์กร"
      />

      <PaymentNote />
    </div>
  )
}
