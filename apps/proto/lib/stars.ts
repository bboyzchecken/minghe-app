/**
 * ดาวจุติ (神煞) — lookup table แบบย่อสำหรับ prototype
 * รองรับ 3 ดาวหลักตามสเปกรายงาน (handoff §7.2): 桃花 / 文昌 / 天乙贵人
 *
 * หมายเหตุ: core (lunar-typescript) ยังไม่รองรับ 神煞 ครบ — นี่คือตารางค้นเองตามตำรามาตรฐาน
 * (เป็นงาน spike ที่ handoff §5.4 ระบุว่าต้องเขียนเพิ่ม) พอสำหรับสาธิตหน้ารายงาน
 */

export interface StarResult {
  key: 'peach' | 'academic' | 'noble'
  cn: string
  th: string
  active: boolean
  meaning: string
  workMeaning: string
}

// กลุ่มสามประสาน → กิ่งดอกท้อ (桃花)
const PEACH_BY_GROUP: Record<string, string> = {
  申: '酉', 子: '酉', 辰: '酉',
  寅: '卯', 午: '卯', 戌: '卯',
  巳: '午', 酉: '午', 丑: '午',
  亥: '子', 卯: '子', 未: '子',
}

// ก้านวัน → กิ่งเหวินชาง (文昌)
const ACADEMIC_BY_STEM: Record<string, string> = {
  甲: '巳', 乙: '午', 丙: '申', 丁: '酉', 戊: '申',
  己: '酉', 庚: '亥', 辛: '子', 壬: '寅', 癸: '卯',
}

// ก้านวัน → กิ่งเทียนอี่กุ้ยเหริน (天乙贵人)
const NOBLE_BY_STEM: Record<string, string[]> = {
  甲: ['丑', '未'], 戊: ['丑', '未'], 庚: ['丑', '未'],
  乙: ['子', '申'], 己: ['子', '申'],
  丙: ['亥', '酉'], 丁: ['亥', '酉'],
  壬: ['卯', '巳'], 癸: ['卯', '巳'],
  辛: ['寅', '午'],
}

export function computeStars(input: {
  dayStemCn: string
  yearBranchCn: string
  branchesCn: string[] // กิ่งทั้งสี่เสา
}): StarResult[] {
  const { dayStemCn, yearBranchCn, branchesCn } = input
  const has = (b: string) => branchesCn.includes(b)

  const peachTarget = PEACH_BY_GROUP[yearBranchCn]
  const academicTarget = ACADEMIC_BY_STEM[dayStemCn]
  const nobleTargets = NOBLE_BY_STEM[dayStemCn] ?? []

  return [
    {
      key: 'peach',
      cn: '桃花',
      th: 'ดอกท้อ (เสน่ห์)',
      active: peachTarget ? has(peachTarget) : false,
      meaning: 'พลังเสน่ห์ มนุษยสัมพันธ์ ดึงดูดผู้คน',
      workMeaning: 'เด่นด้าน soft skills การเจรจา งานที่ต้องพบปะ ดูแลลูกค้า และสร้างเครือข่าย',
    },
    {
      key: 'academic',
      cn: '文昌',
      th: 'เหวินชาง (ปัญญา)',
      active: academicTarget ? has(academicTarget) : false,
      meaning: 'พลังการเรียนรู้ ตรรกะ การคิดวิเคราะห์',
      workMeaning: 'เรียนรู้ไว เหมาะงานวิเคราะห์ วิจัย วางระบบ เอกสาร และการพัฒนา R&D',
    },
    {
      key: 'noble',
      cn: '天乙贵人',
      th: 'เทียนอี่กุ้ยเหริน (ผู้อุปถัมภ์)',
      active: nobleTargets.some((b) => has(b)),
      meaning: 'มีผู้ใหญ่/ผู้อุปถัมภ์คอยช่วยเหลือในยามคับขัน',
      workMeaning: 'มักได้รับการสนับสนุนจากผู้บังคับบัญชา/พาร์ตเนอร์ ผ่านอุปสรรคด้วยความช่วยเหลือที่มาถูกจังหวะ',
    },
  ]
}
