/**
 * ราคาแพ็กเกจ (สเปกใหม่ 4/7/2026) — หน่วยเป็นบาท
 * อ้างอิง handoff: Employer 699/เดือน (6 candidate/สัปดาห์), JobSeeker 399/เดือน (3/สัปดาห์) หรือ 199/ครั้ง
 *
 * ⚠️ Open item (จาก handoff §10): "Executive Analysis +89" (add-on) vs "Executive Insights +399"
 * (over-quota tier) ยังต้องเคลียร์ว่าเป็นฟีเจอร์เดียวกันไหม
 * — หน้าเว็บยังแสดงทั้งคู่ตามเอกสาร แต่แยกหมวดให้ชัด (ระดับรายงาน vs บริการเสริม)
 * และไม่โชว์หมายเหตุ "รอสรุป" ให้ลูกค้าเห็นแล้ว
 *
 * ⚠️ หน้าราคาถูกแยกเป็นสองหน้าตามกลุ่มผู้ใช้ (/pricing/employer, /pricing/jobseeker)
 * ข้อมูลในไฟล์นี้จึงติดป้าย `audience` ไว้ เพื่อไม่ให้ราคาฝั่งหนึ่งไปโผล่อีกฝั่ง
 */

/** กลุ่มผู้ใช้ที่ราคาแต่ละรายการใช้ได้ */
export type Audience = 'employer' | 'jobseeker'

/* ---- ตัวเลขหลัก (ใช้ร่วมกันทั้งหน้าเว็บและ flow ชำระเงิน) ---- */
export const EMPLOYER_PLAN_PRICE = 699
export const EMPLOYER_WEEKLY_QUOTA = 6
export const JOBSEEKER_PLAN_PRICE = 399
export const JOBSEEKER_WEEKLY_QUOTA = 3
/** จ่ายรายครั้งฝั่งคนทำงาน = ราคารายงาน Standard 1 ฉบับ (เท่ากับ DEPTH_TIERS.standard) */
export const JOBSEEKER_PAY_PER_VIEW_PRICE = 199

export interface DepthTier {
  id: 'standard' | 'premium' | 'executive'
  label: string
  cn: string
  price: number
  blurb: string
  highlight?: boolean
}

/** ระดับความลึกของ insight (ใช้เป็นราคาต่อคน / ราคาเมื่อเกินโควตา) */
export const DEPTH_TIERS: DepthTier[] = [
  {
    id: 'standard',
    label: 'Standard Insights',
    cn: '基础',
    price: 199,
    blurb: 'ผังปาจือ + ห้าธาตุ + ดัชนีสมพงษ์ + คำแนะนำหลัก',
  },
  {
    id: 'premium',
    label: 'Premium Insights',
    cn: '进阶',
    price: 299,
    blurb: 'เพิ่มสิบเทพเชิง % · ดาวจุติ · จังหวะดวงปีจร',
    highlight: true,
  },
  {
    id: 'executive',
    label: 'Executive Insights',
    cn: '深度',
    price: 399,
    blurb: 'วิเคราะห์เชิงลึก + cross-data ผู้บริหาร × บริษัท × อุตสาหกรรม + เกณฑ์อ่านดวงที่ซินแสอนุมัติ',
  },
]

export interface Addon {
  id: 'express' | 'executive-analysis' | 'consult' | 'physiognomy'
  label: string
  cn: string
  price: number | null
  description: string
  turnaround?: string
  comingSoon?: boolean
  /** เปิดขายให้ใครบ้าง — ตอนนี้ flow สั่งซื้อบริการเสริมมีเฉพาะฝั่งองค์กร */
  audience: Audience[]
}

export const ADDONS: Addon[] = [
  {
    id: 'express',
    label: 'Express — ผลด่วน',
    cn: '加急',
    price: 99,
    description: 'ได้รับผลภายใน 3 ชั่วโมง (ปกติ 24 ชั่วโมง)',
    turnaround: '3 ชม.',
    audience: ['employer'],
  },
  {
    id: 'executive-analysis',
    label: 'Executive Analysis',
    cn: '高管',
    price: 89,
    description: 'วิเคราะห์เจาะจงบทบาทผู้บริหาร/หัวหน้าทีมเพิ่มเติม',
    turnaround: '24 ชม.',
    audience: ['employer'],
  },
  {
    id: 'consult',
    label: 'Master Consultation',
    cn: '面谈',
    price: 1500,
    description: 'วิดีโอคอลกับซินแสตัวจริง 45 นาที อธิบายรายงาน + ถาม-ตอบ',
    audience: ['employer'],
  },
  {
    id: 'physiognomy',
    label: 'Face Reading — โหงวเฮ้ง',
    cn: '面相',
    price: null,
    description: 'อ่านโหงวเฮ้งจากภาพถ่ายประกอบผังปาจือ',
    comingSoon: true,
    audience: ['employer', 'jobseeker'],
  },
]

/** บริการเสริมที่กลุ่มผู้ใช้นั้นซื้อได้จริงในเฟสนี้ */
export function addonsFor(audience: Audience): Addon[] {
  return ADDONS.filter((a) => a.audience.includes(audience))
}

export interface SpeedOption {
  id: 'standard' | 'express'
  label: string
  cn: string
  price: number
  detail: string
  highlight?: boolean
}

export const SPEED_OPTIONS: SpeedOption[] = [
  { id: 'standard', label: 'Standard Delivery', cn: '标准', price: 0, detail: 'ได้รับผลภายใน 24 ชั่วโมง' },
  {
    id: 'express',
    label: 'Express Delivery',
    cn: '加急',
    price: 99,
    detail: 'ได้รับผลภายใน 3 ชั่วโมง',
    highlight: true,
  },
]

/** แผนสมาชิก */
export interface Plan {
  id: 'employer' | 'jobseeker'
  name: string
  price: number
  period: string
  quota: string
  features: string[]
  overQuota: string[]
  highlight?: boolean
}

export const PLANS: Record<'employer' | 'jobseeker', Plan> = {
  employer: {
    id: 'employer',
    name: 'Employer · องค์กร',
    price: EMPLOYER_PLAN_PRICE,
    period: '/เดือน',
    quota: `วิเคราะห์ได้ ${EMPLOYER_WEEKLY_QUOTA} candidate ต่อสัปดาห์`,
    features: [
      `โควตา ${EMPLOYER_WEEKLY_QUOTA} candidate/สัปดาห์ (รีเซ็ตทุกจันทร์)`,
      'Team Roster — จำรายชื่อทีม วิเคราะห์รวมทั้งทีม',
      'Profile Memory — จำโปรไฟล์บริษัท+ผู้บริหาร auto-fill',
      'Cross-Data — ผู้บริหาร × วันก่อตั้ง × ธาตุอุตสาหกรรม',
    ],
    overQuota: ['เกินโควตา: Standard +199 · Premium +299 · Executive +399 / คน'],
    highlight: true,
  },
  jobseeker: {
    id: 'jobseeker',
    name: 'Job Seeker · คนทำงาน',
    price: JOBSEEKER_PLAN_PRICE,
    period: '/เดือน',
    quota: `เช็กบริษัทได้ ${JOBSEEKER_WEEKLY_QUOTA} แห่งต่อสัปดาห์`,
    features: [
      `โควตา ${JOBSEEKER_WEEKLY_QUOTA} บริษัท/สัปดาห์`,
      'เช็กความสมพงษ์ก่อนสมัคร/ตอบรับงาน',
      'กรอกข้อมูลบริษัทเอง (เชื่อม DBD ในเฟสถัดไป)',
      'เก็บประวัติบริษัทที่เคยเช็ก',
    ],
    overQuota: [`หรือจ่ายรายครั้ง ${JOBSEEKER_PAY_PER_VIEW_PRICE} บาท / 1 บริษัท (Pay-per-view)`],
  },
}

/** โปรทีม: 5 คนแรกฟรี, คนที่ 6+ = 16 บาท/คน */
export const TEAM_FREE_SEATS = 5
export const TEAM_EXTRA_SEAT_PRICE = 16

export function teamExtraCost(memberCount: number): number {
  return Math.max(0, memberCount - TEAM_FREE_SEATS) * TEAM_EXTRA_SEAT_PRICE
}

export function thb(n: number): string {
  return n.toLocaleString('th-TH')
}
