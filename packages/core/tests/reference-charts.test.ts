/**
 * ชุดเทสต์ยืนยันความแม่นของเสาสี่ต้น (ตามแผนหัวข้อ 13 — เกณฑ์ผ่าน: ตรง 100%)
 *
 * แนวทางไม่วนซ้ำ (non-circular):
 * 1. เสาวัน — เทียบกับสูตร JDN อิสระ + จุดยึด 1949-10-01 = วัน 甲子 (ข้อเท็จจริงตำรา)
 * 2. ดวงอ้างอิงเต็มผัง — คำนวณมือด้วยกฎ 五虎遁/五鼠遁 + ขอบสารทที่รู้แน่ชัด
 * 3. เคสขอบ — ใช้เวลา 立春/芒種 จริงจากตารางสารท แล้วทดสอบก่อน/หลังอินสแตนต์
 */

import { describe, expect, it } from 'vitest'
import {
  computeBazi,
  computeBaziDateOnly,
  jieQiInstant,
  yearGanzhiOf,
} from '../src/bazi'
import { findProvince } from '../src/solar-time'

const STEM_CN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const BRANCH_CN = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

/** Julian Day Number (ปฏิทินเกรกอเรียน) — สูตรมาตรฐาน อิสระจาก lunar-typescript */
function jdn(y: number, m: number, d: number): number {
  const a = Math.floor((14 - m) / 12)
  const yy = y + 4800 - a
  const mm = m + 12 * a - 3
  return (
    d +
    Math.floor((153 * mm + 2) / 5) +
    365 * yy +
    Math.floor(yy / 4) -
    Math.floor(yy / 100) +
    Math.floor(yy / 400) -
    32045
  )
}

const ANCHOR_JDN = jdn(1949, 10, 1) // วัน 甲子 (ดัชนี 0 ในวัฏจักร 60)

function expectedDayGanzhi(y: number, m: number, d: number): string {
  const idx = (((jdn(y, m, d) - ANCHOR_JDN) % 60) + 60) % 60
  return `${STEM_CN[idx % 10]}${BRANCH_CN[idx % 12]}`
}

function chartOf(
  y: number,
  mo: number,
  d: number,
  h = 12,
  mi = 0,
  extra: Partial<Parameters<typeof computeBazi>[0]> = {},
) {
  return computeBazi({
    year: y,
    month: mo,
    day: d,
    hour: h,
    minute: mi,
    tzOffsetHours: 8,
    useTrueSolarTime: false,
    ...extra,
  })
}

function ganzhiOf(chart: ReturnType<typeof computeBazi>): [string, string, string, string] {
  return [
    chart.pillars.year.ganzhi,
    chart.pillars.month.ganzhi,
    chart.pillars.day.ganzhi,
    chart.pillars.hour.ganzhi,
  ]
}

describe('เสาวัน — วัฏจักร 60 วันต่อเนื่อง (เทียบสูตร JDN อิสระ)', () => {
  const dates: [number, number, number][] = [
    [1900, 3, 15],
    [1925, 7, 4],
    [1949, 10, 1],
    [1955, 2, 24],
    [1968, 12, 31],
    [1975, 1, 1],
    [1984, 2, 29],
    [1990, 6, 15],
    [1996, 8, 8],
    [1999, 12, 31],
    [2000, 1, 1],
    [2000, 2, 29],
    [2004, 4, 20],
    [2010, 10, 10],
    [2015, 5, 5],
    [2020, 2, 29],
    [2023, 11, 22],
    [2024, 6, 30],
    [2025, 12, 25],
    [2026, 7, 3],
  ]
  for (const [y, m, d] of dates) {
    it(`${y}-${m}-${d} เสาวัน = ${expectedDayGanzhi(y, m, d)}`, () => {
      expect(chartOf(y, m, d).pillars.day.ganzhi).toBe(expectedDayGanzhi(y, m, d))
    })
  }
})

describe('ดวงอ้างอิงเต็มผัง (คำนวณมืออิสระด้วยกฎ 五虎遁/五鼠遁)', () => {
  it('1949-10-01 12:00 → 己丑 癸酉 甲子 庚午', () => {
    expect(ganzhiOf(chartOf(1949, 10, 1, 12, 0))).toEqual(['己丑', '癸酉', '甲子', '庚午'])
  })
  it('2000-01-01 12:00 → 己卯 丙子 戊午 戊午 (ก่อนลี่ชุน = ยังเป็นปีเถาะ)', () => {
    expect(ganzhiOf(chartOf(2000, 1, 1, 12, 0))).toEqual(['己卯', '丙子', '戊午', '戊午'])
  })
  it('1984-06-01 12:00 → 甲子 己巳 丙寅 甲午', () => {
    expect(ganzhiOf(chartOf(1984, 6, 1, 12, 0))).toEqual(['甲子', '己巳', '丙寅', '甲午'])
  })
  it('1993-11-11 09:30 → 癸酉 癸亥 丙申 癸巳', () => {
    expect(ganzhiOf(chartOf(1993, 11, 11, 9, 30))).toEqual(['癸酉', '癸亥', '丙申', '癸巳'])
  })
  it('2020-06-21 18:00 → 庚子 壬午 乙未 乙酉', () => {
    expect(ganzhiOf(chartOf(2020, 6, 21, 18, 0))).toEqual(['庚子', '壬午', '乙未', '乙酉'])
  })
})

describe('ขอบเขตปี = ลี่ชุน (立春) เวลาจริง', () => {
  it('ปี 2024: ก่อน/หลังอินสแตนต์ลี่ชุน 15 นาที → ปีเปลี่ยน 癸卯 → 甲辰', () => {
    const instant = jieQiInstant(2024, '立春')
    expect(instant).toBeTruthy()
    const [datePart, timePart] = (instant as string).split(' ')
    const [Y, M, D] = (datePart as string).split('-').map(Number)
    const [h, mi] = (timePart as string).split(':').map(Number)

    const before = chartOf(Y!, M!, D!, h!, mi! - 15 < 0 ? 0 : mi!, {})
    // ใช้ shift ผ่านนาทีตรงๆ: ก่อน 15 นาที / หลัง 15 นาที
    const mkAt = (offsetMin: number) => {
      const total = h! * 60 + mi! + offsetMin
      const hh = Math.floor(((total % 1440) + 1440) % 1440 / 60)
      const mm = ((total % 60) + 60) % 60
      const dayShift = Math.floor(total / 1440)
      return chartOf(Y!, M!, D! + dayShift, hh, mm)
    }
    expect(mkAt(-15).pillars.year.ganzhi).toBe('癸卯')
    expect(mkAt(15).pillars.year.ganzhi).toBe('甲辰')
    void before
  })

  it('ผู้เกิดในไทย (UTC+7): เทียบลี่ชุนด้วยเวลาสัมบูรณ์ ไม่ใช่เวลานาฬิกาท้องถิ่น', () => {
    // ลี่ชุน 2024 เวลาปักกิ่ง L → เวลาไทยสัมบูรณ์เดียวกัน = L − 1 ชม.
    const instant = jieQiInstant(2024, '立春') as string
    const [datePart, timePart] = instant.split(' ')
    const [Y, M, D] = (datePart as string).split('-').map(Number)
    const [h, mi] = (timePart as string).split(':').map(Number)

    const mkThai = (offsetMinAbsolute: number) => {
      // เวลาไทย = เวลาปักกิ่ง − 60 นาที
      const total = h! * 60 + mi! + offsetMinAbsolute - 60
      const hh = Math.floor((((total % 1440) + 1440) % 1440) / 60)
      const mm = ((total % 60) + 60) % 60
      const dayShift = Math.floor(total / 1440)
      return computeBazi({
        year: Y!,
        month: M!,
        day: D! + dayShift,
        hour: hh,
        minute: mm,
        tzOffsetHours: 7,
        useTrueSolarTime: false,
      })
    }
    // 30 นาทีก่อนอินสแตนต์สัมบูรณ์ → ยังปีเก่า / 30 นาทีหลัง → ปีใหม่
    expect(mkThai(-30).pillars.year.ganzhi).toBe('癸卯')
    expect(mkThai(30).pillars.year.ganzhi).toBe('甲辰')
  })
})

describe('ขอบเขตเดือน = สารทหลัก (節) เวลาจริง', () => {
  it('ปี 2020: ก่อน/หลัง芒種 → เดือนเปลี่ยน 辛巳 → 壬午', () => {
    const instant = jieQiInstant(2020, '芒種') as string
    expect(instant).toBeTruthy()
    const [datePart, timePart] = instant.split(' ')
    const [Y, M, D] = (datePart as string).split('-').map(Number)
    const [h, mi] = (timePart as string).split(':').map(Number)
    const mkAt = (offsetMin: number) => {
      const total = h! * 60 + mi! + offsetMin
      const hh = Math.floor((((total % 1440) + 1440) % 1440) / 60)
      const mm = ((total % 60) + 60) % 60
      const dayShift = Math.floor(total / 1440)
      return chartOf(Y!, M!, D! + dayShift, hh, mm)
    }
    expect(mkAt(-20).pillars.month.ganzhi).toBe('辛巳')
    expect(mkAt(20).pillars.month.ganzhi).toBe('壬午')
  })
})

describe('เสาเวลา — 子時 เริ่ม 23:00 + กติกา 早/晚子時', () => {
  // 1949-10-05 = วัน 戊辰 (anchor+4)
  it('22:59 → กิ่งเวลา 亥 / 23:01 → กิ่งเวลา 子', () => {
    expect(chartOf(1949, 10, 5, 22, 59).pillars.hour.branch.cn).toBe('亥')
    expect(chartOf(1949, 10, 5, 23, 1).pillars.hour.branch.cn).toBe('子')
  })
  it("晚子時 23:01 กติกา 'same-day' → เสาวันคงเป็น 戊辰", () => {
    const chart = chartOf(1949, 10, 5, 23, 1, { lateZiRule: 'same-day' })
    expect(chart.pillars.day.ganzhi).toBe('戊辰')
  })
  it("晚子時 23:01 กติกา 'next-day' → เสาวันเป็น 己巳", () => {
    const chart = chartOf(1949, 10, 5, 23, 1, { lateZiRule: 'next-day' })
    expect(chart.pillars.day.ganzhi).toBe('己巳')
  })
  it('早子時 00:30 → วัน 戊辰 เสาเวลา 壬子 (五鼠遁: 戊癸日起壬子)', () => {
    const chart = chartOf(1949, 10, 5, 0, 30)
    expect(chart.pillars.day.ganzhi).toBe('戊辰')
    expect(chart.pillars.hour.ganzhi).toBe('壬子')
  })
  it('五鼠遁 เที่ยงวัน: วัน 丙寅 (1949-10-03) 12:00 → เสาเวลา 甲午', () => {
    expect(chartOf(1949, 10, 3, 12, 0).pillars.hour.ganzhi).toBe('甲午')
  })
})

describe('เวลาสุริยะจริง (真太陽時) — กรุงเทพฯ', () => {
  it('กลางเดือน ก.พ. กรุงเทพฯ: การชดเชยรวมประมาณ −29 ถึง −34 นาที', () => {
    const chart = computeBazi({
      year: 1990,
      month: 2,
      day: 15,
      hour: 23,
      minute: 10,
      tzOffsetHours: 7,
      province: 'กรุงเทพมหานคร',
      useTrueSolarTime: true,
    })
    expect(chart.trueSolarTime.applied).toBe(true)
    expect(chart.trueSolarTime.totalCorrectionMinutes).toBeLessThan(-29)
    expect(chart.trueSolarTime.totalCorrectionMinutes).toBeGreaterThan(-34)
    // 23:10 นาฬิกา − ~32 นาที → ~22:38 → กิ่งเวลายังเป็น 亥 (ไม่ใช่ 子)
    expect(chart.pillars.hour.branch.cn).toBe('亥')
  })
  it('เคสเดียวกันแต่ปิดเวลาสุริยะจริง → กิ่งเวลาเป็น 子 (พิสูจน์ว่าการชดเชยเปลี่ยนเสาได้จริง)', () => {
    const chart = computeBazi({
      year: 1990,
      month: 2,
      day: 15,
      hour: 23,
      minute: 10,
      tzOffsetHours: 7,
      useTrueSolarTime: false,
    })
    expect(chart.trueSolarTime.applied).toBe(false)
    expect(chart.pillars.hour.branch.cn).toBe('子')
  })
  it('รู้จักจังหวัดไทยครบ: เชียงใหม่ลองจิจูดตะวันตกกว่ากรุงเทพฯ → ชดเชยติดลบมากกว่า', () => {
    const cm = findProvince('เชียงใหม่')
    const bkk = findProvince('กรุงเทพมหานคร')
    expect(cm).toBeTruthy()
    expect(bkk).toBeTruthy()
    expect(cm!.longitude).toBeLessThan(bkk!.longitude)
  })
})

describe('ตัวช่วยอื่น', () => {
  it('yearGanzhiOf(2026) = 丙午', () => {
    expect(yearGanzhiOf(2026)).toBe('丙午')
  })
  it('computeBaziDateOnly ให้เสาปี/เดือน/วันถูกต้อง (2000-01-01 → 己卯 丙子 戊午)', () => {
    const chart = computeBaziDateOnly(2000, 1, 1)
    expect(chart.pillars.year.ganzhi).toBe('己卯')
    expect(chart.pillars.month.ganzhi).toBe('丙子')
    expect(chart.pillars.day.ganzhi).toBe('戊午')
  })
})
