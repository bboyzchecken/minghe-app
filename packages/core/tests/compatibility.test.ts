/**
 * เทสต์เครื่องวิเคราะห์ธาตุ + ความเข้ากัน (สมพงษ์)
 */

import { describe, expect, it } from 'vitest'
import { computeBazi } from '../src/bazi'
import { analyzeWuXing } from '../src/wuxing'
import {
  annualOutlook,
  comparePersons,
  compareTeam,
  compareWithCompanyDate,
  compareWithIndustry,
} from '../src/compatibility'

function chartOf(y: number, mo: number, d: number, h = 12, mi = 0) {
  return computeBazi({
    year: y,
    month: mo,
    day: d,
    hour: h,
    minute: mi,
    tzOffsetHours: 8,
    useTrueSolarTime: false,
  })
}

describe('วิเคราะห์ห้าธาตุ (2000-01-01 12:00 → 己卯 丙子 戊午 戊午)', () => {
  const chart = chartOf(2000, 1, 1)
  const wu = analyzeWuXing(chart)

  it('ก้านวันคือ 戊 ธาตุดิน', () => {
    expect(chart.dayMaster.cn).toBe('戊')
    expect(chart.dayMaster.element).toBe('earth')
  })
  it('การนับธาตุถ่วงน้ำหนักถูกต้อง (ดินเด่น, ทองขาด)', () => {
    const c = wu.distribution.counts
    expect(c.earth).toBeCloseTo(3.6, 1)
    expect(c.fire).toBeCloseTo(2.4, 1)
    expect(c.wood).toBeCloseTo(1.0, 1)
    expect(c.water).toBeCloseTo(1.0, 1)
    expect(c.metal).toBeCloseTo(0, 1)
    expect(wu.distribution.strongest).toBe('earth')
    expect(wu.distribution.missing).toContain('metal')
  })
  it('ดินเกิดฤดูหนาวแต่มีพวกมาก (己丙戊 + ราก 午×2) → ค่อนข้างสมดุล เติมธาตุที่พร่อง (ทอง)', () => {
    // 得令 8 (ดินถูกจำกัดในฤดูน้ำ) + 得地 13 + 得勢 28 = 49 → balanced
    expect(wu.dayMaster.category).toBe('balanced')
    expect(wu.dayMaster.strengthScore).toBeGreaterThanOrEqual(45)
    expect(wu.dayMaster.strengthScore).toBeLessThan(60)
    expect(wu.dayMaster.favorableElements).toContain('metal')
  })
})

describe('สมพงษ์คน×คน', () => {
  // 1949-10-01 = วัน 甲子, 1949-10-02 = วัน 乙丑 → 子+丑 六合 ที่ day×day
  it('คู่ 六合 (子丑) ที่เสาวัน → มีปัจจัยบวกและมีคำอธิบายไทย', () => {
    const a = chartOf(1949, 10, 1)
    const b = chartOf(1949, 10, 2)
    const result = comparePersons(a, b, { nameA: 'พนักงาน', nameB: 'หัวหน้า' })
    const harmony = result.factors.find(
      (f) => f.code === 'BRANCH_SIX_HARMONY' && f.positions === 'day×day',
    )
    expect(harmony).toBeTruthy()
    expect(harmony!.points).toBeGreaterThan(0)
    expect(harmony!.explanation).toContain('เข้าคู่')
    expect(result.score).toBeGreaterThanOrEqual(5)
    expect(result.score).toBeLessThanOrEqual(98)
  })

  // 1949-10-07 = วัน 庚午 → 甲庚 ชงก้าน + 子午 ชงกิ่ง ที่ day×day
  it('คู่ชง (甲庚 + 子午) ที่เสาวัน → มีปัจจัยลบทั้งก้านและกิ่ง', () => {
    const a = chartOf(1949, 10, 1)
    const b = chartOf(1949, 10, 7)
    const result = comparePersons(a, b)
    expect(result.factors.some((f) => f.code === 'STEM_CLASH' && f.positions === 'day×day')).toBe(true)
    expect(result.factors.some((f) => f.code === 'BRANCH_CLASH' && f.positions === 'day×day')).toBe(true)
  })

  it('คะแนนคู่ 六合 สูงกว่าคู่ชง (สมเหตุสมผลเชิงทิศทาง)', () => {
    const a = chartOf(1949, 10, 1)
    const harmonious = comparePersons(a, chartOf(1949, 10, 2)).score
    const clashing = comparePersons(a, chartOf(1949, 10, 7)).score
    expect(harmonious).toBeGreaterThan(clashing)
  })

  it('ทุกปัจจัยมีคำอธิบายภาษาไทยและคะแนนไม่เป็นศูนย์', () => {
    const result = comparePersons(chartOf(1988, 3, 21, 8, 0), chartOf(1975, 11, 2, 14, 30))
    for (const f of result.factors) {
      expect(f.explanation.length).toBeGreaterThan(10)
      expect(f.points).not.toBe(0)
    }
  })
})

describe('สมพงษ์คน×บริษัท และ คน×อุตสาหกรรม', () => {
  it('คน×วันก่อตั้งบริษัท: ไม่ใช้เสาเวลาฝั่งบริษัท', () => {
    const person = chartOf(1990, 5, 20, 10, 0)
    const result = compareWithCompanyDate(person, 2015, 3, 9, { companyName: 'บริษัทตัวอย่าง' })
    expect(result.mode).toBe('company-date')
    for (const f of result.factors) {
      expect(f.positions.endsWith('×hour')).toBe(false)
    }
  })

  it('คน×อุตสาหกรรม: ธาตุอุปการะอันดับหนึ่งให้คะแนนสูงกว่าธาตุโทษ', () => {
    const person = chartOf(2000, 1, 1) // ก้านวันดินอ่อน → อุปการะ ไฟ/ดิน, โทษ ไม้/ทอง/น้ำ
    const wu = analyzeWuXing(person)
    const fav = wu.dayMaster.favorableElements[0]!
    const unfav = wu.dayMaster.unfavorableElements[0]!
    const good = compareWithIndustry(person, fav)
    const bad = compareWithIndustry(person, unfav)
    expect(good.score).toBeGreaterThan(bad.score)
  })

  it('คน×ทีม: คืนผลรายคู่ครบ + คะแนนรวมอยู่ในช่วง', () => {
    const subject = chartOf(1992, 8, 17, 7, 45)
    const { overall, pairwise } = compareTeam(subject, [
      { chart: chartOf(1985, 1, 30, 13, 0), name: 'สมชาย' },
      { chart: chartOf(1998, 12, 5, 21, 15), name: 'สมหญิง' },
    ])
    expect(pairwise).toHaveLength(2)
    expect(overall.score).toBeGreaterThanOrEqual(5)
    expect(overall.score).toBeLessThanOrEqual(98)
    expect(overall.mode).toBe('team')
  })
})

describe('ปฏิสัมพันธ์รายปี (流年)', () => {
  it('คนปีชวด (1984 甲子) กับปี 2026 (丙午) → ปีชง 沖太歲', () => {
    const person = chartOf(1984, 6, 1)
    const outlook = annualOutlook(person, 2026)
    expect(outlook.ganzhi).toBe('丙午')
    expect(outlook.factors.some((f) => f.titleTh.includes('ปีชง'))).toBe(true)
  })
})
