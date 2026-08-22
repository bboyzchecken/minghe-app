import Link from 'next/link'
import type { Metadata } from 'next'
import { ElementIcon } from '@/components/element-icon'
import { Check, Faq, PaymentNote } from '@/components/pricing/bits'
import {
  EMPLOYER_PLAN_PRICE,
  EMPLOYER_WEEKLY_QUOTA,
  JOBSEEKER_PAY_PER_VIEW_PRICE,
  JOBSEEKER_PLAN_PRICE,
  JOBSEEKER_WEEKLY_QUOTA,
  thb,
} from '@/lib/pricing'

export const metadata: Metadata = {
  title: 'ราคา',
  description:
    'ราคา 命合 Mìnghé — เลือกดูราคาฝั่งองค์กร (699 บาท/เดือน) หรือฝั่งคนทำงาน (เริ่ม 199 บาท/ครั้ง) แยกกันชัดเจน',
}

/**
 * หน้าราคา = ประตูสองบาน
 *
 * เดิมหน้านี้วางราคาองค์กรกับคนทำงานไว้ด้วยกัน + ตารางความลึก/บริการเสริมที่ใช้ได้ไม่เท่ากัน
 * ผู้ใช้ UAT อ่านแล้วเอาตัวเลขข้ามฝั่งกัน (เช่น 199 ของ pay-per-view กับ 199 ของรายงาน Standard)
 * ตอนนี้จึงให้เลือกก่อนว่าเป็นใคร แล้วเห็นเฉพาะราคาของฝั่งตัวเอง
 */
const DOORS = [
  {
    href: '/pricing/employer',
    el: 'metal' as const,
    tint: '#BE8A2E',
    eyebrow: 'For Employers',
    title: 'ฉันเป็นองค์กร / HR',
    lead: 'มองหา candidate ที่เข้ากับผู้บริหาร ทีม และวัฒนธรรมองค์กร',
    price: `${thb(EMPLOYER_PLAN_PRICE)} ฿`,
    unit: '/เดือน',
    hint: `รวมโควตา ${EMPLOYER_WEEKLY_QUOTA} candidate ต่อสัปดาห์`,
    points: ['Team Roster วิเคราะห์ทั้งทีม', 'Profile Memory auto-fill', 'บริการเสริม: ผลด่วน · ปรึกษาซินแส'],
    cta: 'ดูราคาสำหรับองค์กร',
  },
  {
    href: '/pricing/jobseeker',
    el: 'water' as const,
    tint: '#5E9BB5',
    eyebrow: 'For Job Seekers',
    title: 'ฉันเป็นคนทำงาน',
    lead: 'เช็กว่าบริษัทที่กำลังสมัคร/ได้ offer สมพงษ์กับดวงเราไหม',
    price: `${thb(JOBSEEKER_PAY_PER_VIEW_PRICE)} ฿`,
    unit: '/บริษัท',
    hint: `หรือรายเดือน ${thb(JOBSEEKER_PLAN_PRICE)} ฿ · เช็กได้ ${JOBSEEKER_WEEKLY_QUOTA} บริษัท/สัปดาห์`,
    points: ['จ่ายครั้งเดียวก็ใช้ได้ ไม่ต้องสมัครสมาชิก', 'เก็บประวัติบริษัทที่เคยเช็ก', 'ไม่มีค่าใช้จ่ายแอบแฝง'],
    cta: 'ดูราคาสำหรับคนทำงาน',
  },
]

const SHARED_FAQ = [
  {
    q: 'ทำไมต้องแยกราคาสองหน้า?',
    a: 'เพราะสองฝั่งซื้อคนละอย่างกัน — องค์กรซื้อ "จำนวน candidate ที่วิเคราะห์ได้ต่อสัปดาห์" ส่วนคนทำงานซื้อ "รายงานบริษัทเป็นฉบับ" การเอามารวมหน้าเดียวทำให้ตัวเลขที่บังเอิญเท่ากันดูเหมือนเป็นเรื่องเดียวกัน ทั้งที่คนละเงื่อนไข',
  },
  {
    q: 'สมัครฝั่งไหนแล้วข้ามไปใช้อีกฝั่งได้ไหม?',
    a: 'บัญชีหนึ่งใช้ได้ทีละบทบาท — สมาชิกองค์กรจะเห็นเมนูฝั่งองค์กร ส่วนบัญชีคนทำงานจะเห็นฝั่งคนทำงาน ถ้าต้องการทั้งสองบทบาท ติดต่อทีมงานเพื่อเปิดให้',
  },
  {
    q: 'รายงานที่ได้ต่างกันไหมระหว่างสองฝั่ง?',
    a: 'แกนการคำนวณเดียวกัน (ผังปาจือ + ห้าธาตุ + ดัชนีสมพงษ์) แต่มุมของรายงานต่างกัน — ฝั่งองค์กรอ่านว่า "คนนี้เข้ากับทีมและผู้บริหารแค่ไหน" ฝั่งคนทำงานอ่านว่า "ที่นี่ส่งเสริมดวงเราแค่ไหน"',
  },
  {
    q: 'ชำระเงินยังไง และขอใบเสร็จ/ใบกำกับภาษีได้ไหม?',
    a: 'ชำระผ่าน GB Prime Pay รองรับบัตรเครดิต/เดบิต และ QR PromptPay (อยู่ระหว่างเชื่อมต่อ) · ต้องการเอกสารในนามนิติบุคคล แจ้งได้ที่ info@minghe.work',
  },
]

export default function PricingHub() {
  return (
    <div className="container-page py-14 md:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <span className="eyebrow">ราคาแพ็กเกจ</span>
        <h1 className="mt-3 text-4xl">โปร่งใส · จ่ายเท่าที่ใช้</h1>
        <p className="mt-3 text-balance text-ink-soft">
          ราคาฝั่งองค์กรกับฝั่งคนทำงานคิดคนละแบบ — เลือกว่าคุณคือใคร แล้วดูเฉพาะราคาของคุณ
          ไม่ต้องอ่านปนกัน
        </p>
      </div>

      <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
        {DOORS.map((d) => (
          <Link
            key={d.href}
            href={d.href}
            className="group relative flex flex-col rounded-xl border border-line bg-card p-8 shadow-card transition duration-200 hover:-translate-y-1 hover:shadow-lift"
            style={{ borderTopColor: d.tint, borderTopWidth: 3 }}
          >
            <div className="flex items-center gap-2">
              <ElementIcon element={d.el} size={22} />
              <span className="font-body-en text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: d.tint }}>
                {d.eyebrow}
              </span>
            </div>

            <h2 className="mt-4 text-2xl">{d.title}</h2>
            <p className="mt-1.5 text-sm text-ink-soft">{d.lead}</p>

            <div className="mt-6 flex items-baseline gap-1.5">
              <span className="text-xs text-muted">เริ่มต้น</span>
              <span className="font-display-en text-4xl font-semibold text-ink">{d.price}</span>
              <span className="text-sm text-muted">{d.unit}</span>
            </div>
            <div className="mt-1 text-sm text-gold">{d.hint}</div>

            <ul className="mt-5 flex-1 space-y-2">
              {d.points.map((p) => (
                <li key={p} className="flex items-start gap-2 text-sm text-ink-soft">
                  <Check /> {p}
                </li>
              ))}
            </ul>

            <span className="btn-ghost mt-6 justify-center group-hover:border-gold group-hover:text-gold">
              {d.cta} →
            </span>
          </Link>
        ))}
      </div>

      <p className="mt-8 text-center text-sm text-muted">
        ยังไม่แน่ใจว่าเหมาะกับแบบไหน?{' '}
        <Link href="/report" className="text-gold hover:underline">
          ดูตัวอย่างรายงานก่อน
        </Link>
      </p>

      <section className="mt-16">
        <h2 className="text-center text-2xl sm:text-3xl">คำถามที่พบบ่อย</h2>
        <Faq items={SHARED_FAQ} />
      </section>

      <PaymentNote />
    </div>
  )
}
