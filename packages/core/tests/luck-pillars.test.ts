/**
 * ชุดเทสต์ 大運 (ดวงใหญ่ 10 ปี) — สูตรที่ อ.เม ยืนยัน 8 ก.ย. 2026 (ข้อ 4.1 + 4.2)
 *
 * แนวทางไม่วนซ้ำ (non-circular) เหมือนชุด reference-charts:
 * 1. ทิศทาง — ตรวจจากกฎโดยตรง (ชายปีหยาง / หญิงปีหยิน = เดินหน้า) ครบ 4 ช่อง
 * 2. อายุเริ่มเดิน — คำนวณมือจากเวลา 節 จริง แล้วหารสาม
 * 3. ลำดับเสา — ตรวจกับวัฏจักร 60 กะจื่อ โดยอิงเสาเดือนเป็นจุดตั้งต้น
 * 4. เทียบกับ `Yun` ของ lunar-typescript ซึ่งเป็นการอิมพลีเมนต์อิสระคนละชุด
 *    (กันตัวเลขเพี้ยนเงียบ ๆ ตามความเสี่ยง R-1 ในแผนรอบ 2)
 * 5. เคสขอบ — เกิดคร่อมลี่ชุน และเกิดห่าง 節 ไม่กี่ชั่วโมง
 *
 * เวลาที่ใช้ทดสอบเป็นเวลาไทย (UTC+7) ตามค่าเริ่มต้นของ `BirthInput`
 */

import { describe, expect, it } from 'vitest'
import { Solar } from 'lunar-typescript'
import { computeBazi } from '../src/bazi'
import {
  DEFAULT_LUCK_PILLAR_COUNT,
  JIA_ZI,
  computeLuckPillars,
  jiaZiIndexOf,
  luckPillarAtYear,
} from '../src/luck-pillars'
import type { BirthInput } from '../src/types'

function chartOf(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  gender: BirthInput['gender'],
) {
  return computeBazi({ year, month, day, hour, minute, gender, useTrueSolarTime: false })
}

/** `Yun` ของ lunar-typescript — แปลงเวลาไทยเป็นเวลาปักกิ่ง (+1 ชม.) ให้อยู่กรอบเดียวกัน */
function libYun(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  gender: 'male' | 'female',
) {
  // +1 ชม. ด้วย nextHour ของไลบรารีเอง เพื่อให้ข้ามวันได้ถูกเมื่อเกิดช่วง 23:xx
  const cst = Solar.fromYmdHms(year, month, day, hour, minute, 0).nextHour(1)
  const lunar = cst.getLunar()
  return lunar.getEightChar().getYun(gender === 'male' ? 1 : 0, 2)
}

describe('วัฏจักร 60 กะจื่อ', () => {
  it('มี 60 ตัวไม่ซ้ำ เริ่ม 甲子 จบ 癸亥', () => {
    expect(JIA_ZI).toHaveLength(60)
    expect(new Set(JIA_ZI).size).toBe(60)
    expect(JIA_ZI[0]).toBe('甲子')
    expect(JIA_ZI[59]).toBe('癸亥')
    expect(jiaZiIndexOf('庚午')).toBe(6)
    expect(jiaZiIndexOf('甲午')).toBe(30)
    // ก้านกับกิ่งต้องขั้วเดียวกันเสมอ — 甲 (หยาง) คู่กับ 丑 (หยิน) จึงไม่มีจริง
    expect(jiaZiIndexOf('甲丑')).toBe(-1)
  })
})

describe('ข้อ 4.2 · ทิศทางจากเพศ + หยิน-หยางของก้านปี', () => {
  // 1984 = 甲子 (ก้านปีหยาง) · 1985 = 乙丑 (ก้านปีหยิน)
  const table = [
    { year: 1984, stemCn: '甲', gender: 'male' as const, expected: 'forward' as const },
    { year: 1984, stemCn: '甲', gender: 'female' as const, expected: 'backward' as const },
    { year: 1985, stemCn: '乙', gender: 'male' as const, expected: 'backward' as const },
    { year: 1985, stemCn: '乙', gender: 'female' as const, expected: 'forward' as const },
  ]

  for (const t of table) {
    it(`${t.gender === 'male' ? 'ชาย' : 'หญิง'} เกิดปี ${t.stemCn} → ${t.expected}`, () => {
      const chart = chartOf(t.year, 6, 15, 10, 30, t.gender)
      expect(chart.pillars.year.stem.cn).toBe(t.stemCn)

      const set = computeLuckPillars(chart)
      expect(set.detail.direction).toBe(t.expected)
      // ตรงกับการอิมพลีเมนต์อิสระของ lunar-typescript
      expect(libYun(t.year, 6, 15, 10, 30, t.gender).isForward()).toBe(t.expected === 'forward')
    })
  }
})

describe('ข้อ 4.1 · นับเวลาถึง 節 แล้วหารสาม', () => {
  it('ชายปีหยาง 1984-06-15 10:30 — นับไป 小暑 แล้วได้ 7 ปี 3 เดือน 4 วัน', () => {
    const chart = chartOf(1984, 6, 15, 10, 30, 'male')
    const set = computeLuckPillars(chart)

    // เดินหน้า → 節 ตัวถัดไปคือ 小暑 (เวลาปักกิ่ง)
    expect(set.detail.direction).toBe('forward')
    expect(set.detail.jieQiAt).toBe('1984-07-07 06:29:06')

    // คำนวณมือ: เกิด 10:30 ICT = 11:30 CST → ถึง 07-07 06:29 = 21 วัน 18 ชม. 59 นาที
    const minutes = 21 * 1440 + 18 * 60 + 59
    expect(set.detail.daysToJieQi).toBeCloseTo(minutes / 1440, 3)
    expect(minutes / 1440).toBeCloseTo(21.791, 3)

    // 3 วัน = 1 ปี → 21.791 / 3 = 7.264 ปี → 7 ปี + 0.264 × 12 ≈ 3 เดือน + เศษ
    expect(set.detail.startAt).toEqual({ years: 7, months: 3, days: 4 })
    expect(set.detail.startAge).toBe(7)
    expect(set.detail.startYear).toBe(1991)
  })

  it('หญิงปีหยาง 1984-06-15 10:30 — ถอยหลังไป 芒種 ได้ 3 ปี 2 เดือน 16 วัน', () => {
    const set = computeLuckPillars(chartOf(1984, 6, 15, 10, 30, 'female'))
    expect(set.detail.direction).toBe('backward')
    expect(set.detail.jieQiAt).toBe('1984-06-05 20:08:37')
    expect(set.detail.startAt).toEqual({ years: 3, months: 2, days: 16 })
    expect(set.detail.startAge).toBe(3)
    expect(set.detail.startYear).toBe(1987)
  })

  it('อายุเริ่มเดินตรงกับ Yun ของ lunar-typescript ทุกเคส', () => {
    const cases = [
      { y: 1984, m: 6, d: 15, h: 10, mi: 30, g: 'male' as const },
      { y: 1984, m: 6, d: 15, h: 10, mi: 30, g: 'female' as const },
      { y: 1985, m: 6, d: 15, h: 10, mi: 30, g: 'male' as const },
      { y: 1985, m: 6, d: 15, h: 10, mi: 30, g: 'female' as const },
      { y: 1990, m: 2, d: 3, h: 8, mi: 0, g: 'male' as const },
      { y: 1990, m: 2, d: 5, h: 8, mi: 0, g: 'male' as const },
      { y: 2001, m: 11, d: 30, h: 23, mi: 45, g: 'female' as const },
      { y: 1972, m: 9, d: 8, h: 0, mi: 15, g: 'male' as const },
    ]

    for (const c of cases) {
      const set = computeLuckPillars(chartOf(c.y, c.m, c.d, c.h, c.mi, c.g))
      const yun = libYun(c.y, c.m, c.d, c.h, c.mi, c.g)
      const label = `${c.y}-${c.m}-${c.d} ${c.g}`

      expect(set.detail.direction === 'forward', label).toBe(yun.isForward())
      expect(set.detail.startAt, label).toEqual({
        years: yun.getStartYear(),
        months: yun.getStartMonth(),
        days: yun.getStartDay(),
      })

      // ลำดับก้าน-กิ่งของเสาต้องตรงกันทุกเสา (lib index 0 = ช่วงก่อนเริ่มเดิน ไม่มีก้าน-กิ่ง)
      const libDaYun = yun.getDaYun(DEFAULT_LUCK_PILLAR_COUNT + 1).slice(1)
      expect(set.pillars.map((p) => p.ganzhi), label).toEqual(
        libDaYun.map((d) => d.getGanZhi()),
      )
      expect(set.pillars.map((p) => p.startYear), label).toEqual(
        libDaYun.map((d) => d.getStartYear()),
      )
    }
  })
})

describe('ลำดับเสาต่อจากเสาเดือน', () => {
  it('เดินหน้า — เสาแรกคือกะจื่อถัดจากเสาเดือน แล้วไล่ทีละ 1', () => {
    const chart = chartOf(1984, 6, 15, 10, 30, 'male')
    expect(chart.pillars.month.ganzhi).toBe('庚午')

    const set = computeLuckPillars(chart)
    const monthIndex = jiaZiIndexOf('庚午')
    set.pillars.forEach((p, i) => {
      expect(p.ganzhi).toBe(JIA_ZI[(monthIndex + i + 1) % 60])
      expect(p.index).toBe(i + 1)
    })
    expect(set.pillars[0]?.ganzhi).toBe('辛未')
  })

  it('ถอยหลัง — ไล่ย้อนทีละ 1 และข้ามขอบวัฏจักรได้', () => {
    const chart = chartOf(1984, 6, 15, 10, 30, 'female')
    const set = computeLuckPillars(chart, { count: 12 })
    const monthIndex = jiaZiIndexOf(chart.pillars.month.ganzhi)
    set.pillars.forEach((p, i) => {
      expect(p.ganzhi).toBe(JIA_ZI[(((monthIndex - i - 1) % 60) + 60) % 60])
    })
    // เดินย้อนจาก 庚午 (ลำดับ 6) เกิน 6 ตัวต้องวนกลับไปท้ายวัฏจักร
    expect(set.pillars[5]?.ganzhi).toBe('甲子')
    expect(set.pillars[6]?.ganzhi).toBe('癸亥')
  })

  it('ทุกเสากินเวลา 10 ปีต่อเนื่องไม่ขาดไม่ทับ', () => {
    const set = computeLuckPillars(chartOf(1984, 6, 15, 10, 30, 'male'))
    expect(set.pillars).toHaveLength(DEFAULT_LUCK_PILLAR_COUNT)
    set.pillars.forEach((p, i) => {
      expect(p.endAge - p.startAge).toBe(9)
      expect(p.endYear - p.startYear).toBe(9)
      expect(p.startYear - p.startAge).toBe(1984)
      if (i > 0) {
        const prev = set.pillars[i - 1]!
        expect(p.startYear).toBe(prev.endYear + 1)
        expect(p.startAge).toBe(prev.endAge + 1)
      }
    })
  })
})

describe('เคสขอบ', () => {
  it('เกิดคร่อมลี่ชุน — เปลี่ยนทั้งเสาปีและทิศทาง', () => {
    // 立春 ปี 1990 = 1990-02-04 (เวลาปักกิ่ง)
    const before = chartOf(1990, 2, 3, 8, 0, 'male')
    const after = chartOf(1990, 2, 5, 8, 0, 'male')

    expect(before.pillars.year.ganzhi).toBe('己巳') // ยังเป็นปีก่อน (己 = หยิน)
    expect(after.pillars.year.ganzhi).toBe('庚午') // ข้ามปีแล้ว (庚 = หยาง)

    const setBefore = computeLuckPillars(before)
    const setAfter = computeLuckPillars(after)
    expect(setBefore.detail.direction).toBe('backward') // ชาย + ปีหยิน
    expect(setAfter.detail.direction).toBe('forward') // ชาย + ปีหยาง
    expect(setBefore.detail.jieQiCn).not.toBe(setAfter.detail.jieQiCn)
  })

  it('เกิดห่าง 節 ไม่กี่ชั่วโมง — เริ่มเดินดวงใหญ่ตั้งแต่อายุ 0', () => {
    // 小暑 1984-07-07 06:29:06 CST = 05:29 ตามเวลาไทย · เกิดก่อนหน้านั้น 2.5 ชม.
    const chart = chartOf(1984, 7, 7, 3, 0, 'male')
    expect(chart.pillars.month.ganzhi).toBe('庚午') // ยังไม่ข้าม 節 จึงยังเป็นเดือน 午

    const set = computeLuckPillars(chart)
    expect(set.detail.direction).toBe('forward')
    expect(set.detail.startAt.years).toBe(0)
    expect(set.detail.startAt.months).toBe(0)
    expect(set.detail.startAge).toBe(0)
    expect(set.detail.startYear).toBe(1984)
    expect(set.pillars[0]?.startYear).toBe(1984)
  })

  it('เกิดเวลา 23:xx — ยังคำนวณได้และตรงกับ lunar-typescript', () => {
    const set = computeLuckPillars(chartOf(2001, 11, 30, 23, 45, 'female'))
    const yun = libYun(2001, 11, 30, 23, 45, 'female')
    expect(set.detail.direction === 'forward').toBe(yun.isForward())
    expect(set.detail.startAt).toEqual({
      years: yun.getStartYear(),
      months: yun.getStartMonth(),
      days: yun.getStartDay(),
    })
  })
})

describe('อินเทอร์เฟซ', () => {
  it('ไม่ระบุเพศ → โยน error ที่บอกสาเหตุชัด', () => {
    const chart = computeBazi({
      year: 1984,
      month: 6,
      day: 15,
      hour: 10,
      minute: 30,
      useTrueSolarTime: false,
    })
    expect(() => computeLuckPillars(chart)).toThrow(/gender/)
  })

  it('count กำหนดจำนวนเสาได้ และค่าเริ่มต้นคือ 8', () => {
    const chart = chartOf(1984, 6, 15, 10, 30, 'male')
    expect(computeLuckPillars(chart).pillars).toHaveLength(8)
    expect(computeLuckPillars(chart, { count: 12 }).pillars).toHaveLength(12)
    expect(() => computeLuckPillars(chart, { count: 0 })).toThrow()
  })

  it('luckPillarAtYear หาเสาที่ครอบปีที่ระบุได้', () => {
    const set = computeLuckPillars(chartOf(1984, 6, 15, 10, 30, 'male'))
    expect(luckPillarAtYear(set, 1991)?.ganzhi).toBe('辛未')
    expect(luckPillarAtYear(set, 2000)?.ganzhi).toBe('辛未')
    expect(luckPillarAtYear(set, 2001)?.ganzhi).toBe('壬申')
    expect(luckPillarAtYear(set, 1990)).toBeNull() // ก่อนเริ่มเดินดวงใหญ่
    expect(luckPillarAtYear(set, 2100)).toBeNull()
  })

  it('ก้าน-กิ่งของแต่ละเสาแตกเป็น stem/branch ที่ตรงกัน', () => {
    const set = computeLuckPillars(chartOf(1985, 6, 15, 10, 30, 'female'))
    for (const p of set.pillars) {
      expect(p.stem.cn + p.branch.cn).toBe(p.ganzhi)
      expect(p.stem.yinYang).toBe(p.branch.yinYang) // ก้าน-กิ่งในวัฏจักร 60 ขั้วตรงกันเสมอ
    }
  })
})
