/**
 * เครื่องตั้งเสาสี่ต้น (四柱八字)
 *
 * หลักความแม่นยำ (ตามแผนหัวข้อ 13):
 * 1. ขอบเขตปี = ลี่ชุน (立春) เวลาจริง — จัดการโดย EightChar ของ lunar-typescript
 * 2. ขอบเขตเดือน = 12 สารทหลัก (節) เวลาจริง — จัดการโดย EightChar
 * 3. เสาวัน = วัฏจักร 60 วันต่อเนื่อง
 * 4. เสาเวลา = 子時 เริ่ม 23:00 + สูตร 五鼠遁 + กติกา 早/晚子時 (setSect)
 * 5. เวลาสุริยะจริง (真太陽時) — คำนวณเองใน solar-time.ts แล้วป้อนเวลาที่ปรับแล้วเข้าเครื่อง
 *
 * ใช้ lunar-typescript (ผู้พัฒนาเดียวกับ lunar-javascript / lunar-python — อัลกอริทึมเดียวกัน)
 */

import { Solar } from 'lunar-typescript'
import {
  BRANCH_BY_CN,
  STEMS,
  STEM_BY_CN,
  tenGodOf,
} from './constants'
import { findProvince, shiftDateTime, solarTimeCorrection } from './solar-time'
import type {
  BaziChart,
  BirthInput,
  Pillar,
  PillarPosition,
  StemInfo,
  TrueSolarTimeDetail,
} from './types'

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function makePillar(position: PillarPosition, ganzhi: string, dayMaster: StemInfo): Pillar {
  const stemCn = ganzhi.charAt(0)
  const branchCn = ganzhi.charAt(1)
  const stem = STEM_BY_CN[stemCn]
  const branch = BRANCH_BY_CN[branchCn]
  if (!stem || !branch) {
    throw new Error(`ganzhi ไม่ถูกต้อง: "${ganzhi}"`)
  }
  return {
    position,
    ganzhi,
    stem,
    branch,
    hiddenStems: branch.hidden.map((h) => {
      const stemInfo = stemByIndex(h.stemIndex)
      return {
        stem: stemInfo,
        weight: h.weight,
        tenGod: tenGodOf(dayMaster, stemInfo),
      }
    }),
    tenGodStem: position === 'day' ? null : tenGodOf(dayMaster, stem),
  }
}

function stemByIndex(index: number): StemInfo {
  const s = STEMS[index]
  if (!s) throw new Error(`stem index ไม่ถูกต้อง: ${index}`)
  return s
}

/**
 * ตั้งเสาสี่ต้นจากข้อมูลเกิด
 */
export function computeBazi(input: BirthInput): BaziChart {
  const tz = input.tzOffsetHours ?? 7

  let longitude = input.longitude
  if (longitude == null && input.province) {
    longitude = findProvince(input.province)?.longitude
  }

  const wantTrueSolar = input.useTrueSolarTime ?? longitude != null
  const applied = Boolean(wantTrueSolar && longitude != null)

  let y = input.year
  let m = input.month
  let d = input.day
  let h = input.hour
  let min = input.minute

  let longitudeCorrectionMinutes = 0
  let equationOfTime = 0
  let totalCorrection = 0

  if (applied && longitude != null) {
    const corr = solarTimeCorrection(y, m, d, h, longitude, tz)
    longitudeCorrectionMinutes = corr.longitudeCorrectionMinutes
    equationOfTime = corr.equationOfTimeMinutes
    totalCorrection = corr.totalMinutes
    const shifted = shiftDateTime(y, m, d, h, min, corr.totalMinutes)
    y = shifted.year
    m = shifted.month
    d = shifted.day
    h = shifted.hour
    min = shifted.minute
  }

  const trueSolarTime: TrueSolarTimeDetail = {
    clockTime: `${pad(input.hour)}:${pad(input.minute)}`,
    solarTime: `${pad(h)}:${pad(min)}`,
    longitudeCorrectionMinutes,
    equationOfTimeMinutes: equationOfTime,
    totalCorrectionMinutes: totalCorrection,
    longitude: longitude ?? Number.NaN,
    applied,
  }

  // เสาวัน + เสาเวลา: ใช้เวลาสุริยะจริงท้องถิ่น (ขอบวัน/ขอบชั่วโมงจีนยึดดวงอาทิตย์ ณ ที่เกิด)
  const solar = Solar.fromYmdHms(y, m, d, h, min, 0)
  const lunar = solar.getLunar()
  const eightChar = lunar.getEightChar()
  // sect 2 = 晚子時 เสาวันคงวันเดิม (ค่าเริ่มต้น), sect 1 = นับวันถัดไป
  eightChar.setSect(input.lateZiRule === 'next-day' ? 1 : 2)

  // เสาปี + เสาเดือน: ขอบเขตคือ "อินสแตนต์สารท (節氣)" ซึ่งเป็นเวลาสัมบูรณ์ทางดาราศาสตร์
  // ตารางสารทของปฏิทินจีนอ้างเวลาปักกิ่ง (UTC+8) — จึงต้องแปลงเวลานาฬิกาที่เกิด
  // เป็นเวลาปักกิ่งก่อนเทียบ ไม่เช่นนั้นผู้เกิดในไทย (UTC+7) ใกล้ลี่ชุน/รอยต่อสารท
  // จะคลาดไป 1 ชั่วโมง (ใช้เวลานาฬิกาเดิม ไม่ใช่เวลาสุริยะ เพราะนี่คือการเทียบเวลาสัมบูรณ์)
  const cst = shiftDateTime(
    input.year,
    input.month,
    input.day,
    input.hour,
    input.minute,
    (8 - tz) * 60,
  )
  const yearMonthEightChar = Solar.fromYmdHms(cst.year, cst.month, cst.day, cst.hour, cst.minute, 0)
    .getLunar()
    .getEightChar()

  const dayGanzhi = eightChar.getDay()
  const dayMaster = STEM_BY_CN[dayGanzhi.charAt(0)]
  if (!dayMaster) throw new Error(`ก้านวันไม่ถูกต้อง: ${dayGanzhi}`)

  const yearPillar = makePillar('year', yearMonthEightChar.getYear(), dayMaster)
  const monthPillar = makePillar('month', yearMonthEightChar.getMonth(), dayMaster)
  const dayPillar = makePillar('day', dayGanzhi, dayMaster)
  const hourPillar = makePillar('hour', eightChar.getTime(), dayMaster)

  return {
    input,
    trueSolarTime,
    pillars: {
      year: yearPillar,
      month: monthPillar,
      day: dayPillar,
      hour: hourPillar,
    },
    dayMaster,
    zodiac: { cn: yearPillar.branch.animalCn, th: yearPillar.branch.animalTh },
    lunarDate: lunar.toString(),
  }
}

/**
 * ตั้งเสาจากวันอย่างเดียว (ใช้กับวันก่อตั้งบริษัทที่ไม่รู้เวลา)
 * เสาเวลาใช้เที่ยงวันแต่ผู้เรียกควรตัดเสาเวลาออกจากการวิเคราะห์
 */
export function computeBaziDateOnly(year: number, month: number, day: number): BaziChart {
  return computeBazi({
    year,
    month,
    day,
    hour: 12,
    minute: 0,
    useTrueSolarTime: false,
  })
}

/** กานจือของปี ค.ศ. หนึ่งๆ (ยึดลี่ชุน — ใช้กลางปีจึงปลอดภัยเสมอ) */
export function yearGanzhiOf(year: number): string {
  const solar = Solar.fromYmdHms(year, 7, 1, 12, 0, 0)
  return solar.getLunar().getEightChar().getYear()
}

/**
 * เวลาจริงของสารท (節氣) ตามชื่อจีน เช่น '立春' ของปีปฏิทินหนึ่งๆ
 * คืนค่า ISO string 'YYYY-MM-DD HH:mm:ss' (โซนเวลา UTC+8 ตามหลักปฏิทินจีน)
 */
export function jieQiInstant(year: number, name: string): string | null {
  // ตารางสารทภายใน lib ใช้อักษรจีนตัวย่อ — รองรับชื่อตัวเต็มด้วย
  const TRADITIONAL_TO_SIMPLIFIED: Record<string, string> = {
    驚蟄: '惊蛰',
    穀雨: '谷雨',
    小滿: '小满',
    芒種: '芒种',
    處暑: '处暑',
  }
  const key = TRADITIONAL_TO_SIMPLIFIED[name] ?? name
  // ใช้กลางปีเพื่อให้ตารางสารทของปีจันทรคติครอบคลุม 立春 ต้นปีนั้น
  const lunar = Solar.fromYmdHms(year, 6, 1, 12, 0, 0).getLunar()
  const table = lunar.getJieQiTable()
  const solar = table[key]
  if (!solar) return null
  return solar.toYmdHms()
}
