/**
 * ดาวจุติ (神煞) — ตารางค้นตามตำรามาตรฐาน + ท่อกรองก่อนนำมาแสดง
 *
 * รองรับ 3 ดาวหลักตามสเปกรายงาน (handoff §7.2): 桃花 / 文昌 / 天乙贵人
 * core (lunar-typescript) ยังไม่รองรับ 神煞 ครบ — ตารางนี้จึงเขียนเอง
 *
 * ---- การตัดสินใจเชิงออกแบบจากคำตอบ อ.เม 8 ก.ย. 2026 ----
 * อ่านข้อ 1.1 กับ 1.2 คู่กันแล้วต้องแยก "อำนาจ" ออกจาก "พื้นที่" ไม่ใช่ค่าเดียว:
 *
 *   ข้อ 1.1 → ดาว **ไม่มีสิทธิ์ตัดสิน** พูดถึงได้ต่อเมื่อผ่านการตรวจว่าไม่ถูกชง
 *             และเป็นธาตุที่ดวงต้องการ  →  STAR_AUTHORITY = 'modifier'
 *   ข้อ 1.2 → ดาวควรมีพื้นที่ **เท่า ๆ กับหัวข้ออื่น** ไม่ใช่ประโยคแทรก
 *             →  STAR_PROMINENCE = 'section'
 *
 * ผลคือ: ดาวได้หัวข้อของตัวเองในรายงาน แต่วางไว้ท้ายลำดับ (DataSpec B20)
 * และห้ามใช้ล้มข้อสรุปที่มาจากโครงสร้างธาตุเด็ดขาด
 */

import { BRANCH_CLASHES, ELEMENTS, PILLAR_TH } from '@minghe/core'
import type { BaziChart, ElementKey, PillarPosition, WuXingAnalysis } from '@minghe/core'

/** ดาวเป็นตัวขยายความ ห้าม override ข้อสรุปจากโครงสร้างธาตุ (ข้อ 1.1) */
export const STAR_AUTHORITY = 'modifier' as const
/** ดาวมีหัวข้อของตัวเองในรายงาน (ข้อ 1.2) */
export const STAR_PROMINENCE = 'section' as const

export type StarKey = 'peach' | 'academic' | 'noble'
/** เสาปี/เดือน = พื้นที่สาธารณะ · เสาวัน/ยาม = พื้นที่ส่วนตัว */
export type StarDomain = 'public' | 'private'
/** ธาตุของกิ่งที่ดาวเกาะ เทียบกับธาตุอุปถัมภ์/ธาตุโทษของดวง (喜/忌) */
export type StarElementStatus = 'favorable' | 'unfavorable' | 'neutral'

export interface StarView {
  key: StarKey
  cn: string
  th: string
  /** ดาวจุติในดวงนี้หรือไม่ */
  active: boolean
  meaning: string
  workMeaning: string
  /** กิ่งที่ดาวเกาะ — null เมื่อไม่จุติ */
  branchCn: string | null
  /** เสาที่ดาวเกาะ — null เมื่อไม่จุติ */
  pillar: PillarPosition | null
  pillarTh: string | null
  /** ธาตุของกิ่งที่ดาวเกาะ — null เมื่อไม่จุติ */
  element: ElementKey | null
  elementStatus: StarElementStatus
  /** กิ่งที่ดาวเกาะถูกชง (六沖) โดยกิ่งอื่นในดวงเดียวกันหรือไม่ */
  isClashed: boolean
  domain: StarDomain | null
  /** ผ่านท่อกรองแล้วนำมาแสดงได้หรือไม่ */
  visible: boolean
  /** เหตุผลที่ถูกปิดเสียง — null เมื่อ visible */
  mutedReasonTh: string | null
}

// กลุ่มสามประสานของกิ่งปี → กิ่งดอกท้อ (桃花)
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

const STAR_META: Record<StarKey, { cn: string; th: string; meaning: string; workMeaning: string }> = {
  peach: {
    cn: '桃花',
    th: 'ดอกท้อ (เสน่ห์)',
    meaning: 'พลังเสน่ห์ มนุษยสัมพันธ์ ดึงดูดผู้คน',
    workMeaning: 'เด่นด้าน soft skills การเจรจา งานที่ต้องพบปะ ดูแลลูกค้า และสร้างเครือข่าย',
  },
  academic: {
    cn: '文昌',
    th: 'เหวินชาง (ปัญญา)',
    meaning: 'พลังการเรียนรู้ ตรรกะ การคิดวิเคราะห์',
    workMeaning: 'เรียนรู้ไว เหมาะงานวิเคราะห์ วิจัย วางระบบ เอกสาร และการพัฒนา R&D',
  },
  noble: {
    cn: '天乙贵人',
    th: 'เทียนอี่กุ้ยเหริน (ผู้อุปถัมภ์)',
    meaning: 'มีผู้ใหญ่/ผู้อุปถัมภ์คอยช่วยเหลือในยามคับขัน',
    workMeaning:
      'มักได้รับการสนับสนุนจากผู้บังคับบัญชา/พาร์ตเนอร์ ผ่านอุปสรรคด้วยความช่วยเหลือที่มาถูกจังหวะ',
  },
}

const PILLAR_ORDER: PillarPosition[] = ['year', 'month', 'day', 'hour']

function domainOf(pillar: PillarPosition): StarDomain {
  return pillar === 'year' || pillar === 'month' ? 'public' : 'private'
}

/** กิ่งนี้ถูกกิ่งอื่นในดวงเดียวกันชงหรือไม่ (六沖) */
function clashedWithin(branchCn: string, allBranches: string[]): boolean {
  return BRANCH_CLASHES.some(
    ([a, b]) =>
      (a === branchCn && allBranches.includes(b)) || (b === branchCn && allBranches.includes(a)),
  )
}

/**
 * คำนวณดาวจุติพร้อมข้อมูลบริบทและผลของท่อกรอง
 *
 * ท่อกรองก่อนแสดงผล — ดาวต้องผ่านครบทุกชั้นจึงจะ `visible`:
 *   1. จุติจริงในดวง
 *   2. กิ่งที่เกาะไม่ถูกชง
 *   3. ธาตุของกิ่งไม่ใช่ธาตุโทษของดวง
 * ดาวที่ตกด่านถูก "ปิดเสียง" — ยังอยู่ในข้อมูลให้ตรวจย้อนได้ แต่ห้ามนำไปแสดง
 */
export function computeStars(chart: BaziChart, wuxing: WuXingAnalysis): StarView[] {
  const dayStemCn = chart.dayMaster.cn
  const yearBranchCn = chart.pillars.year.branch.cn
  const branches = PILLAR_ORDER.map((p) => ({ pillar: p, info: chart.pillars[p].branch }))
  const allBranchCn = branches.map((b) => b.info.cn)

  const favorable = wuxing.dayMaster.favorableElements
  const unfavorable = wuxing.dayMaster.unfavorableElements

  const targetsOf = (key: StarKey): string[] => {
    if (key === 'peach') {
      const t = PEACH_BY_GROUP[yearBranchCn]
      return t ? [t] : []
    }
    if (key === 'academic') {
      const t = ACADEMIC_BY_STEM[dayStemCn]
      return t ? [t] : []
    }
    return NOBLE_BY_STEM[dayStemCn] ?? []
  }

  return (Object.keys(STAR_META) as StarKey[]).map((key) => {
    const meta = STAR_META[key]
    const targets = targetsOf(key)
    // เสาแรกสุด (ปี→เดือน→วัน→ยาม) ที่กิ่งตรงกับเป้าหมายของดาวนี้
    const hit = branches.find((b) => targets.includes(b.info.cn))

    if (!hit) {
      return {
        key,
        ...meta,
        active: false,
        branchCn: null,
        pillar: null,
        pillarTh: null,
        element: null,
        elementStatus: 'neutral' as const,
        isClashed: false,
        domain: null,
        visible: false,
        mutedReasonTh: 'ไม่จุติในดวงนี้',
      }
    }

    const element = hit.info.element
    const elementStatus: StarElementStatus = favorable.includes(element)
      ? 'favorable'
      : unfavorable.includes(element)
        ? 'unfavorable'
        : 'neutral'
    const isClashed = clashedWithin(hit.info.cn, allBranchCn)

    // ลำดับเหตุผลสำคัญ — ชงก่อน เพราะเป็นเหตุที่หนักกว่าเรื่องธาตุ
    let mutedReasonTh: string | null = null
    if (isClashed) {
      mutedReasonTh = `กิ่ง ${hit.info.cn} ที่ดาวเกาะถูกชงในดวงเดียวกัน — พลังของดาวถูกกระทบจนไม่ควรนำมาอ่าน`
    } else if (elementStatus === 'unfavorable') {
      mutedReasonTh = `ดาวเกาะบนกิ่งธาตุ${ELEMENTS[element].th} ซึ่งเป็นธาตุโทษของดวงนี้ — ไม่นำมาอ่านตามเกณฑ์`
    }

    return {
      key,
      ...meta,
      active: true,
      branchCn: hit.info.cn,
      pillar: hit.pillar,
      pillarTh: PILLAR_TH[hit.pillar]?.th ?? null,
      element,
      elementStatus,
      isClashed,
      domain: domainOf(hit.pillar),
      visible: mutedReasonTh === null,
      mutedReasonTh,
    }
  })
}

/** เฉพาะดาวที่ผ่านท่อกรอง — ใช้ตัวนี้ทุกครั้งที่จะแสดงผล */
export function visibleStars(stars: StarView[]): StarView[] {
  return stars.filter((s) => s.visible)
}
