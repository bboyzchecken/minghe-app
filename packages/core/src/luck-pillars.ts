/**
 * 大運 (ดวงใหญ่ช่วง 10 ปี)
 *
 * สูตรที่ อ.เม ยืนยัน (คำตอบ 8 ก.ย. 2026):
 *   ข้อ 4.2 — ชายเกิดปีหยาง / หญิงเกิดปีหยิน = เดินหน้า (順行) · นอกนั้นถอยหลัง (逆行)
 *             "ปีหยาง/ปีหยิน" ดูที่ **ก้านปี** (年干) ไม่ใช่กิ่งปี
 *   ข้อ 4.1 — นับเวลาจากวันเกิดถึงเจี๋ยชี่ (節) แล้วหารสาม = อายุเริ่มเดิน
 *             เดินหน้า → นับไปหา 節 ตัวถัดไป · ถอยหลัง → นับย้อนไปหา 節 ตัวก่อนหน้า
 *             มาตราส่วนคลาสสิก: 3 วัน = 1 ปี · 1 วัน = 4 เดือน · 2 ชั่วโมง (1 時辰) = 10 วัน
 *   เสาแรกนับต่อจากเสาเดือนในวัฏจักร 60 กะจื่อ แล้วไล่ทีละ 10 ปี
 *
 * ปลดล็อก F-21 (momentum) · F-22 (dashboard คนทำงาน) · F-26 (foresight)
 *
 * ⚠️ กรอบเวลา: ตาราง 節氣 ของปฏิทินจีนอ้างเวลาปักกิ่ง (UTC+8) และเสาเดือนที่เราไล่ต่อ
 * ก็คำนวณจากกรอบเดียวกันใน `bazi.ts` — ที่นี่จึงแปลงเวลาเกิดเป็นเวลาปักกิ่งก่อนนับเสมอ
 * (ใช้เวลานาฬิกา ไม่ใช่เวลาสุริยะจริง เพราะเป็นการเทียบ "เวลาสัมบูรณ์" เหมือนเสาปี/เสาเดือน)
 */

import { Solar } from 'lunar-typescript'
import { BRANCHES, BRANCH_BY_CN, STEMS, STEM_BY_CN } from './constants'
import { shiftDateTime } from './solar-time'
import type { BaziChart, BranchInfo, StemInfo } from './types'

/** ทิศทางการเดินของดวงใหญ่ */
export type LuckDirection = 'forward' | 'backward'

export interface LuckPillar {
  /** ลำดับเสา เริ่มที่ 1 = เสาแรกที่เริ่มเดิน */
  index: number
  /** ก้าน-กิ่งของเสา เช่น '丙寅' */
  ganzhi: string
  stem: StemInfo
  branch: BranchInfo
  /** อายุจริง (ปีเต็ม) ที่เริ่ม/สิ้นสุดช่วงนี้ */
  startAge: number
  endAge: number
  /** ค.ศ. ที่เริ่ม/สิ้นสุดช่วงนี้ */
  startYear: number
  endYear: number
}

/** ที่มาของอายุเริ่มเดินดวงใหญ่ (起運) — เก็บไว้ให้ผู้ใช้ตรวจย้อนได้ว่าเลขมาจากไหน */
export interface LuckStartDetail {
  direction: LuckDirection
  /** เหตุผลของทิศทาง เช่น 'ชายเกิดปีหยาง (甲) — เดินหน้า' */
  reasonTh: string
  /** ชื่อ 節 ที่ใช้อ้างอิง เช่น '立春' */
  jieQiCn: string
  /** เวลาของ 節 นั้น 'YYYY-MM-DD HH:mm:ss' (เวลาปักกิ่ง UTC+8) */
  jieQiAt: string
  /** ระยะจากวันเกิดถึง 節 เป็นวัน (ทศนิยม) */
  daysToJieQi: number
  /** อายุเริ่มเดินแบบละเอียดตามมาตราส่วนคลาสสิก */
  startAt: { years: number; months: number; days: number }
  /** อายุจริง (ปีเต็ม) ที่เสาแรกเริ่มเดิน — ใช้เป็นหัวตาราง */
  startAge: number
  /** ค.ศ. ที่เสาแรกเริ่มเดิน */
  startYear: number
}

export interface LuckPillarSet {
  detail: LuckStartDetail
  /** เรียงจากเสาแรกไปเสาท้าย */
  pillars: LuckPillar[]
}

export interface LuckPillarOptions {
  /** จำนวนเสาที่ต้องการ (ค่าเริ่มต้น 8 = ครอบ 80 ปี) */
  count?: number
}

/** จำนวนเสาเริ่มต้นที่คืนกลับ */
export const DEFAULT_LUCK_PILLAR_COUNT = 8

/** ปีต่อหนึ่งเสาดวงใหญ่ */
export const YEARS_PER_LUCK_PILLAR = 10

/** นาทีต่อ 1 ปีของอายุเริ่มเดิน — 3 วัน = 1 ปี */
const MINUTES_PER_YEAR = 3 * 24 * 60
/** 1 วัน = 4 เดือน → 1 เดือน = 6 ชั่วโมง */
const MINUTES_PER_MONTH = MINUTES_PER_YEAR / 12
/** 2 ชั่วโมง (1 時辰) = 10 วัน → 1 วัน = 12 นาที */
const MINUTES_PER_DAY = MINUTES_PER_MONTH / 30

/** วัฏจักร 60 กะจื่อ (甲子 … 癸亥) */
export const JIA_ZI: string[] = Array.from({ length: 60 }, (_, i) => {
  const stem = STEMS[i % 10]
  const branch = BRANCHES[i % 12]
  if (!stem || !branch) throw new Error(`สร้างวัฏจักร 60 กะจื่อไม่สำเร็จที่ลำดับ ${i}`)
  return stem.cn + branch.cn
})

/** ลำดับของก้าน-กิ่งหนึ่งๆ ในวัฏจักร 60 (คืน -1 ถ้าไม่ใช่คู่ที่มีอยู่จริง) */
export function jiaZiIndexOf(ganzhi: string): number {
  return JIA_ZI.indexOf(ganzhi)
}

function stemBranchOf(ganzhi: string): { stem: StemInfo; branch: BranchInfo } {
  const stem = STEM_BY_CN[ganzhi.charAt(0)]
  const branch = BRANCH_BY_CN[ganzhi.charAt(1)]
  if (!stem || !branch) throw new Error(`ก้าน-กิ่งไม่ถูกต้อง: "${ganzhi}"`)
  return { stem, branch }
}

/**
 * คำนวณเสาดวงใหญ่ (大運) ต่อเนื่องจากเสาเดือน
 *
 * @throws ถ้าไม่ได้ระบุเพศใน `chart.input.gender` — สูตรทิศทางใช้เพศเป็นตัวแปรบังคับ
 */
export function computeLuckPillars(
  chart: BaziChart,
  options: LuckPillarOptions = {},
): LuckPillarSet {
  const count = options.count ?? DEFAULT_LUCK_PILLAR_COUNT
  if (count < 1) throw new Error(`count ต้องมากกว่า 0 — ได้รับ ${count}`)

  const input = chart.input
  const gender = input.gender
  if (!gender) {
    throw new Error(
      'computeLuckPillars: ต้องระบุ gender (สูตร 大運 ใช้เพศร่วมกับหยิน-หยางของก้านปีตัดสินทิศทาง)',
    )
  }

  // แปลงเป็นเวลาปักกิ่งให้ตรงกรอบเดียวกับตาราง 節氣 และเสาเดือนใน bazi.ts
  const tz = input.tzOffsetHours ?? 7
  const cst = shiftDateTime(input.year, input.month, input.day, input.hour, input.minute, (8 - tz) * 60)
  const birthSolar = Solar.fromYmdHms(cst.year, cst.month, cst.day, cst.hour, cst.minute, 0)
  const lunar = birthSolar.getLunar()

  // ---- ข้อ 4.2 · ทิศทาง ----
  const yearStem = chart.pillars.year.stem
  const yangYear = yearStem.yinYang === 'yang'
  const male = gender === 'male'
  const forward = yangYear === male
  const direction: LuckDirection = forward ? 'forward' : 'backward'
  const reasonTh =
    `${male ? 'ชาย' : 'หญิง'}เกิดปี${yangYear ? 'หยาง' : 'หยิน'} (${yearStem.cn} ${yearStem.th}) — ` +
    `${forward ? 'เดินหน้า (順行)' : 'ถอยหลัง (逆行)'}`

  // ---- ข้อ 4.1 · นับเวลาถึง 節 แล้วหารสาม ----
  const jie = forward ? lunar.getNextJie() : lunar.getPrevJie()
  const jieSolar = jie.getSolar()
  // เดินหน้า: เกิด → 節 ถัดไป · ถอยหลัง: 節 ก่อนหน้า → เกิด (ทั้งสองทางเป็นค่าบวก)
  const minutes = forward
    ? jieSolar.subtractMinute(birthSolar)
    : birthSolar.subtractMinute(jieSolar)

  let rest = Math.max(0, Math.floor(minutes))
  const years = Math.floor(rest / MINUTES_PER_YEAR)
  rest -= years * MINUTES_PER_YEAR
  const months = Math.floor(rest / MINUTES_PER_MONTH)
  rest -= months * MINUTES_PER_MONTH
  const days = Math.floor(rest / MINUTES_PER_DAY)

  // วันที่เริ่มเดินดวงใหญ่จริง = วันเกิด + อายุที่แปลงได้
  const startSolar = birthSolar.nextYear(years).nextMonth(months).next(days)
  const birthYear = birthSolar.getYear()
  const firstStartYear = startSolar.getYear()
  const firstStartAge = firstStartYear - birthYear

  const detail: LuckStartDetail = {
    direction,
    reasonTh,
    jieQiCn: jie.getName(),
    jieQiAt: jieSolar.toYmdHms(),
    daysToJieQi: minutes / (24 * 60),
    startAt: { years, months, days },
    startAge: firstStartAge,
    startYear: firstStartYear,
  }

  // ---- ไล่เสาต่อจากเสาเดือน ช่วงละ 10 ปี ----
  const monthIndex = jiaZiIndexOf(chart.pillars.month.ganzhi)
  if (monthIndex < 0) {
    throw new Error(`เสาเดือนไม่อยู่ในวัฏจักร 60 กะจื่อ: "${chart.pillars.month.ganzhi}"`)
  }

  const pillars: LuckPillar[] = []
  for (let i = 1; i <= count; i++) {
    const offset = forward ? i : -i
    const ganzhi = JIA_ZI[(((monthIndex + offset) % 60) + 60) % 60]
    if (!ganzhi) throw new Error(`คำนวณก้าน-กิ่งของเสาที่ ${i} ไม่สำเร็จ`)
    const { stem, branch } = stemBranchOf(ganzhi)
    const startAge = firstStartAge + (i - 1) * YEARS_PER_LUCK_PILLAR
    const startYear = firstStartYear + (i - 1) * YEARS_PER_LUCK_PILLAR
    pillars.push({
      index: i,
      ganzhi,
      stem,
      branch,
      startAge,
      endAge: startAge + YEARS_PER_LUCK_PILLAR - 1,
      startYear,
      endYear: startYear + YEARS_PER_LUCK_PILLAR - 1,
    })
  }

  return { detail, pillars }
}

/** เสาดวงใหญ่ที่ครอบปี ค.ศ. ที่ระบุ — คืน null ถ้าปีนั้นอยู่นอกช่วงที่คำนวณไว้ */
export function luckPillarAtYear(set: LuckPillarSet, year: number): LuckPillar | null {
  return set.pillars.find((p) => year >= p.startYear && year <= p.endYear) ?? null
}
