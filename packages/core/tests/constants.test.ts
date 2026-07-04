/**
 * ตรวจความครบถ้วน/สมมาตรของตารางอ้างอิงคลาสสิก
 */

import { describe, expect, it } from 'vitest'
import {
  BRANCHES,
  BRANCH_CLASHES,
  BRANCH_DESTRUCTIONS,
  BRANCH_DIRECTIONALS,
  BRANCH_HARMS,
  BRANCH_SEMI_TRINES,
  BRANCH_SIX_HARMONIES,
  BRANCH_TRINES,
  CONTROLS,
  ELEMENT_KEYS,
  GENERATES,
  STEMS,
  STEM_COMBINATIONS,
  TEN_GODS,
  tenGodOf,
} from '../src/constants'

describe('โครงสร้างก้าน-กิ่ง', () => {
  it('มี 10 ก้านฟ้า 12 กิ่งดิน', () => {
    expect(STEMS).toHaveLength(10)
    expect(BRANCHES).toHaveLength(12)
  })
  it('น้ำหนักก้านแฝงของทุกกิ่งรวม = 1.0', () => {
    for (const b of BRANCHES) {
      const sum = b.hidden.reduce((s, h) => s + h.weight, 0)
      expect(sum, `กิ่ง ${b.cn}`).toBeCloseTo(1.0, 5)
    }
  })
  it('ธาตุหลักของก้านแฝงตัวแรกตรงกับธาตุประจำกิ่ง', () => {
    for (const b of BRANCHES) {
      const main = STEMS[b.hidden[0]!.stemIndex]!
      expect(main.element, `กิ่ง ${b.cn}`).toBe(b.element)
    }
  })
})

describe('วงจรห้าธาตุ', () => {
  it('วงจรก่อเกิดครบ 5 ขั้นกลับมาที่เดิม', () => {
    let el: (typeof ELEMENT_KEYS)[number] = 'wood'
    const seen = new Set<string>()
    for (let i = 0; i < 5; i++) {
      seen.add(el)
      el = GENERATES[el]
    }
    expect(el).toBe('wood')
    expect(seen.size).toBe(5)
  })
  it('วงจรพิฆาตครบ 5 ขั้นกลับมาที่เดิม', () => {
    let el: (typeof ELEMENT_KEYS)[number] = 'wood'
    for (let i = 0; i < 5; i++) el = CONTROLS[el]
    expect(el).toBe('wood')
  })
})

describe('ตารางความสัมพันธ์กิ่งดิน — ครบถ้วนไม่ซ้ำ', () => {
  it('六合 6 คู่ ครอบคลุม 12 กิ่งพอดี', () => {
    const all = BRANCH_SIX_HARMONIES.flatMap((x) => x.pair)
    expect(all).toHaveLength(12)
    expect(new Set(all).size).toBe(12)
  })
  it('六沖 6 คู่ ครอบคลุม 12 กิ่งพอดี', () => {
    const all = BRANCH_CLASHES.flat()
    expect(all).toHaveLength(12)
    expect(new Set(all).size).toBe(12)
  })
  it('六害 6 คู่ ครอบคลุม 12 กิ่งพอดี', () => {
    const all = BRANCH_HARMS.flat()
    expect(all).toHaveLength(12)
    expect(new Set(all).size).toBe(12)
  })
  it('六破 6 คู่ ครอบคลุม 12 กิ่งพอดี', () => {
    const all = BRANCH_DESTRUCTIONS.flat()
    expect(all).toHaveLength(12)
    expect(new Set(all).size).toBe(12)
  })
  it('三合 4 ชุด ครอบคลุม 12 กิ่ง และตัวกลางคือ 子卯午酉', () => {
    const all = BRANCH_TRINES.flatMap((x) => x.trio)
    expect(all).toHaveLength(12)
    expect(new Set(all).size).toBe(12)
    const middles = BRANCH_TRINES.map((x) => x.trio[1])
    expect(new Set(middles)).toEqual(new Set(['子', '卯', '午', '酉']))
  })
  it('半三合 = 8 คู่ (ชุดละ 2)', () => {
    expect(BRANCH_SEMI_TRINES).toHaveLength(8)
  })
  it('三會 4 ชุด ครอบคลุม 12 กิ่ง', () => {
    const all = BRANCH_DIRECTIONALS.flatMap((x) => x.trio)
    expect(all).toHaveLength(12)
    expect(new Set(all).size).toBe(12)
  })
  it('天干五合 5 คู่ ครอบคลุม 10 ก้าน', () => {
    const all = STEM_COMBINATIONS.flatMap((x) => x.pair)
    expect(all).toHaveLength(10)
    expect(new Set(all).size).toBe(10)
  })
})

describe('สิบเทพ (十神)', () => {
  const stem = (cn: string) => STEMS.find((s) => s.cn === cn)!

  it('甲 เทียบ 庚 → 七殺 (ทองหยางพิฆาตไม้หยาง ขั้วเดียวกัน)', () => {
    expect(tenGodOf(stem('甲'), stem('庚')).key).toBe('QI_SHA')
  })
  it('甲 เทียบ 辛 → 正官', () => {
    expect(tenGodOf(stem('甲'), stem('辛')).key).toBe('ZHENG_GUAN')
  })
  it('甲 เทียบ 癸 → 正印 (น้ำก่อเกิดไม้ ต่างขั้ว)', () => {
    expect(tenGodOf(stem('甲'), stem('癸')).key).toBe('ZHENG_YIN')
  })
  it('甲 เทียบ 甲 → 比肩', () => {
    expect(tenGodOf(stem('甲'), stem('甲')).key).toBe('BI_JIAN')
  })
  it('甲 เทียบ 己 → 正財 (ไม้พิฆาตดิน ต่างขั้ว)', () => {
    expect(tenGodOf(stem('甲'), stem('己')).key).toBe('ZHENG_CAI')
  })
  it('丙 เทียบ 戊 → 食神 (ไฟก่อเกิดดิน ขั้วเดียวกัน)', () => {
    expect(tenGodOf(stem('丙'), stem('戊')).key).toBe('SHI_SHEN')
  })
  it('ครบทั้ง 10 เทพ ไม่มีคีย์ตกหล่น', () => {
    expect(Object.keys(TEN_GODS)).toHaveLength(10)
  })
})
