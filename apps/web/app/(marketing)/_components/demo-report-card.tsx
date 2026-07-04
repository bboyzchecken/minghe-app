/**
 * การ์ดตัวอย่างรายงานความเหมาะสม 命合 (mock) — ใช้บน landing
 * ส่วนบทวิเคราะห์เบลอไว้ พร้อม overlay ชวนไปดูรายงานเดโมจริง
 */

import Link from 'next/link'
import { Badge, Card, PillarCard, ScoreRing } from '@/components/ui'

/** ผังตัวอย่าง 己卯 丙子 戊午 戊午 (วันเกิดธาตุดิน 戊) */
const DEMO_PILLARS = [
  {
    positionTh: 'เสาปี (年柱)',
    ganzhi: '己卯',
    stemTh: 'จี่',
    branchTh: 'เหม่า',
    animalTh: 'กระต่าย',
    tenGodTh: 'เจี๋ยไฉ (มิตรชิงทรัพย์)',
    stemElement: 'earth',
    branchElement: 'wood',
  },
  {
    positionTh: 'เสาเดือน (月柱)',
    ganzhi: '丙子',
    stemTh: 'ปิ่ง',
    branchTh: 'จื่อ',
    animalTh: 'หนู',
    tenGodTh: 'เพียนอิ้น (ตราเบี่ยง)',
    stemElement: 'fire',
    branchElement: 'water',
  },
  {
    positionTh: 'เสาวัน (日柱)',
    ganzhi: '戊午',
    stemTh: 'อู้',
    branchTh: 'อู่',
    animalTh: 'ม้า',
    tenGodTh: 'ธาตุประจำตัว (日主)',
    stemElement: 'earth',
    branchElement: 'fire',
  },
  {
    positionTh: 'เสายาม (時柱)',
    ganzhi: '戊午',
    stemTh: 'อู้',
    branchTh: 'อู่',
    animalTh: 'ม้า',
    tenGodTh: 'ปี่เจียน (มิตรร่วมธาตุ)',
    stemElement: 'earth',
    branchElement: 'fire',
  },
] as const

export function DemoReportCard() {
  return (
    <Card className="relative overflow-hidden p-6 md:p-8">
      {/* หัวรายงาน */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-wide text-muted">
            รายงานความเหมาะสม 命合
          </p>
          <p className="mt-1 font-display-th text-xl font-semibold text-ink">
            คุณสมชาย × บริษัทเรืองรุ่ง จำกัด
          </p>
          <p className="text-xs text-muted">ตำแหน่ง: ผู้จัดการฝ่ายขาย · อุตสาหกรรมค้าปลีก</p>
        </div>
        <Badge tone="gold">เอกสารตัวอย่าง</Badge>
      </div>

      {/* คะแนน */}
      <div className="mt-5 flex justify-center">
        <ScoreRing score={82} label="ดัชนีสมพงษ์ (合 Index)" />
      </div>

      {/* ผังปาจือ */}
      <p className="mt-6 text-sm font-semibold text-ink">ผังปาจือ (命盘)</p>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {DEMO_PILLARS.map((p) => (
          <PillarCard key={p.positionTh} {...p} />
        ))}
      </div>

      {/* บทวิเคราะห์ (เบลอ) + overlay */}
      <div className="relative mt-6">
        <div className="select-none space-y-3 blur-sm" aria-hidden>
          <p className="text-sm font-semibold text-ink">บทวิเคราะห์จากซินแส</p>
          <p className="text-sm text-ink-soft">
            วันเกิดธาตุดิน (戊) กำลังแกร่ง ได้ไฟหนุนจากเสาเดือนและเสายาม ธาตุอุปการะคือทองและน้ำ
            เหมาะกับงานที่ต้องเจรจาและบริหารทรัพยากร องค์กรธาตุน้ำช่วยระบายกำลังส่วนเกิน
            เกื้อหนุนกันในเกณฑ์ดีมาก...
          </p>
          <p className="text-sm text-ink-soft">
            โหงวเฮ้งโซนกลางเด่น สันจมูกมีเนื้อรับ สอดคล้องกับจังหวะการเงินของผัง ช่วงอายุ 36–45
            เป็นรอบทรัพย์เข้า ควรวางบทบาทให้ได้ดูแลทีมขายโดยตรง...
          </p>
        </div>
        <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-cloud via-cloud/70 to-transparent pb-2">
          <Link
            href="/r/MH-DEMO-2569"
            className="inline-flex items-center gap-2 rounded-md border border-gold bg-paper px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-gold hover:text-ink"
          >
            เปิดดูรายงานเดโมฉบับเต็ม →
          </Link>
        </div>
      </div>
    </Card>
  )
}
