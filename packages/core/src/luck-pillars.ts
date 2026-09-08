/**
 * 大運 (ดวงใหญ่ช่วง 10 ปี)
 *
 * ⚠️ สถานะ: ไฟล์นี้เป็น **โครงจาก T0-4** — มีแต่ `type` กับ stub ที่ยัง throw
 * การเขียนสูตรจริงเป็นงานของสาย **S5** ดู `docs/dev-plan-uat-2026-09-09.md` §5
 *
 * สูตรที่ อ.เม ยืนยันแล้ว (คำตอบ 8 ก.ย. 2026):
 *   ข้อ 4.2 — ชายเกิดปีหยาง / หญิงเกิดปีหยิน = เดินหน้า · นอกนั้นถอยหลัง
 *   ข้อ 4.1 — นับวันจากวันเกิดถึงเจี๋ยชี่ (ตัวถัดไปถ้าเดินหน้า / ตัวก่อนหน้าถ้าถอยหลัง) แล้วหารสาม = อายุเริ่มเดิน
 *   เสาแรกนับต่อจากเสาเดือน แล้วไล่ทีละ 10 ปี
 *
 * ปลดล็อก F-21 · F-22 · F-26 ที่ค้างมาตั้งแต่ ส.ค.
 * ข้อบังคับของ S5: ใช้ `lunar-typescript` ที่มีอยู่แล้วหาเจี๋ยชี่ — ห้ามเพิ่ม dependency
 */

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
  /** อายุ (ปีเต็ม) ที่เริ่ม/สิ้นสุดช่วงนี้ */
  startAge: number
  endAge: number
  /** ค.ศ. ที่เริ่ม/สิ้นสุดช่วงนี้ */
  startYear: number
  endYear: number
}

/** ที่มาของอายุเริ่มเดินดวงใหญ่ (起運) — เก็บไว้เพื่ออธิบายผลให้ผู้ใช้ตรวจย้อนได้ */
export interface LuckStartDetail {
  direction: LuckDirection
  /** เหตุผลของทิศทาง เช่น 'ชายเกิดปีหยาง — เดินหน้า' */
  reasonTh: string
  /** จำนวนวันจากวันเกิดถึงเจี๋ยชี่ที่ใช้อ้างอิง */
  daysToJieQi: number
  /** ชื่อเจี๋ยชี่ที่ใช้ เช่น '立春' */
  jieQiCn: string
  /** อายุเริ่มเดิน = daysToJieQi / 3 */
  startAge: number
}

export interface LuckPillarSet {
  detail: LuckStartDetail
  /** เรียงจากเสาแรกไปเสาท้าย — S5 ต้องคืนอย่างน้อย 8 ช่วง */
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

/**
 * คำนวณเสาดวงใหญ่ต่อเนื่องจากเสาเดือน
 *
 * ⚠️ ยังไม่ implement — เป็น stub ของ T0-4 ไว้ให้สายอื่น import ได้โดยไม่ต้องรอ S5
 */
export function computeLuckPillars(
  _chart: BaziChart,
  _options: LuckPillarOptions = {},
): LuckPillarSet {
  throw new Error(
    'computeLuckPillars: ยังไม่ implement — งานของสาย S5 (docs/dev-plan-uat-2026-09-09.md §5)',
  )
}
