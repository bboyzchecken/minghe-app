/**
 * ราคาและแพ็กเกจ (ตามแผนหัวข้อ 9) — ราคาเก็บเป็นสตางค์เสมอ
 */

export interface ReportPack {
  id: string
  label: string
  reports: number
  priceSatang: number
  perReportSatang: number
  highlight?: boolean
}

export const REPORT_PACKS: ReportPack[] = [
  { id: 'single', label: 'รายงานเดี่ยว', reports: 1, priceSatang: 49000, perReportSatang: 49000 },
  {
    id: 'pack3',
    label: 'แพ็ก 3 รายงาน',
    reports: 3,
    priceSatang: 129000,
    perReportSatang: 43000,
    highlight: true,
  },
  { id: 'pack10', label: 'แพ็ก 10 รายงาน', reports: 10, priceSatang: 390000, perReportSatang: 39000 },
]

export interface Plan {
  id: 'starter' | 'business' | 'agency'
  label: string
  priceSatangPerMonth: number
  reportsQuota: number
  features: string[]
  highlight?: boolean
}

export const PLANS: Plan[] = [
  {
    id: 'starter',
    label: 'Starter',
    priceSatangPerMonth: 99000,
    reportsQuota: 5,
    features: ['5 รายงาน/เดือน', 'จัดเก็บผลย้อนหลัง', 'ส่งด้วยรหัสเปิดที่ปลอดภัย'],
  },
  {
    id: 'business',
    label: 'Business',
    priceSatangPerMonth: 290000,
    reportsQuota: 20,
    features: ['20 รายงาน/เดือน', 'วิเคราะห์ความเข้ากันทั้งทีม', 'คิวประมวลผลด่วน (priority)'],
    highlight: true,
  },
  {
    id: 'agency',
    label: 'Agency',
    priceSatangPerMonth: 690000,
    reportsQuota: 60,
    features: ['60 รายงาน/เดือน', 'White-label เบื้องต้น', 'API สำหรับระบบของคุณ'],
  },
]

export interface Addon {
  id: 'rush' | 'deep-analysis' | 'sinsae-call'
  label: string
  description: string
  priceSatang: number
}

export const ADDONS: Addon[] = [
  {
    id: 'rush',
    label: 'ด่วนพิเศษ',
    description: 'ได้รับผลภายใน 3 ชั่วโมง',
    priceSatang: 20000,
  },
  {
    id: 'deep-analysis',
    label: 'วิเคราะห์เชิงลึก',
    description: 'ดวงประจำปี + จังหวะเวลามงคลสำหรับการเริ่มงาน/เลื่อนตำแหน่ง',
    priceSatang: 30000,
  },
  {
    id: 'sinsae-call',
    label: 'ปรึกษาซินแสตัวจริง',
    description: 'วิดีโอคอลกับซินแส 45 นาที อธิบายรายงานพร้อมถาม-ตอบ',
    priceSatang: 150000,
  },
]

export const SINGLE_REPORT_PRICE_SATANG = 49000

export function addonById(id: string): Addon | undefined {
  return ADDONS.find((a) => a.id === id)
}

export function packById(id: string): ReportPack | undefined {
  return REPORT_PACKS.find((p) => p.id === id)
}

export function planById(id: string): Plan | undefined {
  return PLANS.find((p) => p.id === id)
}

/** ราคารวมของออเดอร์: รายงานเดี่ยว + add-ons (จ่ายด้วยเครดิต = 0 บาทส่วนรายงาน) */
export function orderTotalSatang(options: { useCredit: boolean; addonIds: string[] }): number {
  const base = options.useCredit ? 0 : SINGLE_REPORT_PRICE_SATANG
  const addons = options.addonIds
    .map((id) => addonById(id)?.priceSatang ?? 0)
    .reduce((s, x) => s + x, 0)
  return base + addons
}
