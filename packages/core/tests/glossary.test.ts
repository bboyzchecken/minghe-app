/**
 * ชุดเทสต์คลังคำกลาง (glossary) — ปิด F-09
 *
 * หน้าที่ของเทสต์ชุดนี้มีสองอย่าง:
 * 1. ยืนยันว่าทุกคีย์มีครบ 4 field และไม่มีค่าว่าง (เกณฑ์ผ่านที่แผนกำหนด)
 * 2. **ล็อกคำที่ อ.เม ยืนยันเอง** ไม่ให้เปลี่ยนกลับโดยไม่ตั้งใจ และกันคำเก่า
 *    หลุดกลับเข้ามาใน `packages/core/src` (สแกนไฟล์ซอร์สจริง)
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { TEN_GODS } from '../src/constants'
import { GLOSSARY, GLOSSARY_KEYS, term } from '../src/glossary'
import type { GlossaryKey } from '../src/glossary'
import type { TenGodKey } from '../src/types'

const CORE_KEYS: GlossaryKey[] = [
  'USEFUL_GOD',
  'UNFAVORABLE_GOD',
  'DAY_MASTER',
  'MONTH_COMMAND',
  'PATTERN',
  'LUCK_PILLAR',
  'ANNUAL',
]

/** คำที่เลิกใช้แล้ว — ห้ามโผล่ในซอร์สของ core อีก */
const RETIRED_TERMS = ['ธาตุอุปการะ', 'ธาตุโปรด']

const SRC_DIR = fileURLToPath(new URL('../src', import.meta.url))

function tsFilesIn(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) return tsFilesIn(full)
    return name.endsWith('.ts') ? [full] : []
  })
}

describe('ความครบถ้วนของคลังคำ', () => {
  it('มีครบทั้งศัพท์แกน 7 คำและสิบเทพ 10 ตัว รวม 17 คีย์', () => {
    expect(GLOSSARY_KEYS).toHaveLength(17)
    for (const key of CORE_KEYS) expect(GLOSSARY_KEYS).toContain(key)
    for (const key of Object.keys(TEN_GODS) as TenGodKey[]) {
      expect(GLOSSARY_KEYS).toContain(key)
    }
  })

  it('ทุกคีย์มีครบ 4 field และไม่มีค่าว่าง', () => {
    for (const key of GLOSSARY_KEYS) {
      const t = GLOSSARY[key]
      expect(t, key).toBeDefined()
      for (const field of ['cn', 'pinyin', 'th', 'workMeaning'] as const) {
        expect(typeof t[field], `${key}.${field}`).toBe('string')
        expect(t[field].trim(), `${key}.${field}`).not.toBe('')
      }
    }
  })

  it('field `key` ตรงกับคีย์ที่ใช้เก็บเสมอ', () => {
    for (const key of GLOSSARY_KEYS) {
      expect(GLOSSARY[key].key).toBe(key)
    }
  })

  it('คำไทยและตัวจีนไม่ซ้ำกันข้ามคำ', () => {
    const th = GLOSSARY_KEYS.map((k) => GLOSSARY[k].th)
    const cn = GLOSSARY_KEYS.map((k) => GLOSSARY[k].cn)
    expect(new Set(th).size).toBe(th.length)
    expect(new Set(cn).size).toBe(cn.length)
  })

  it('พินอินมีวรรณยุกต์กำกับทุกคำ', () => {
    // ตัวอักษรมีเครื่องหมายเสียง เช่น ǎ ì ú หรือ ü — กัน pinyin ที่พิมพ์แบบไม่มีวรรณยุกต์
    const toned = /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]/
    for (const key of GLOSSARY_KEYS) {
      expect(toned.test(GLOSSARY[key].pinyin), `${key} = ${GLOSSARY[key].pinyin}`).toBe(true)
    }
  })

  it('`term()` คืนคำเดียวกับที่อยู่ในตาราง', () => {
    for (const key of GLOSSARY_KEYS) {
      expect(term(key)).toBe(GLOSSARY[key])
    }
  })
})

describe('คำที่ อ.เม ยืนยัน (คำตอบ 8 ก.ย. 2026)', () => {
  it('用神 = "ธาตุอุปถัมภ์" — ข้อ 2.1', () => {
    expect(GLOSSARY.USEFUL_GOD.cn).toBe('用神')
    expect(GLOSSARY.USEFUL_GOD.th).toBe('ธาตุอุปถัมภ์')
  })

  it('คำที่เลิกใช้แล้วต้องไม่อยู่ในคลังคำ', () => {
    for (const key of GLOSSARY_KEYS) {
      for (const retired of RETIRED_TERMS) {
        expect(GLOSSARY[key].th, key).not.toContain(retired)
        expect(GLOSSARY[key].workMeaning, key).not.toContain(retired)
      }
    }
  })

  it('คำที่เลิกใช้แล้วต้องไม่หลุดกลับเข้ามาใน packages/core/src', () => {
    const files = tsFilesIn(SRC_DIR)
    // กันเทสต์ผ่านฟรีเพราะหาไฟล์ไม่เจอ
    expect(files.length).toBeGreaterThan(5)

    const offenders: string[] = []
    for (const file of files) {
      const content = readFileSync(file, 'utf8')
      for (const retired of RETIRED_TERMS) {
        if (content.includes(retired)) offenders.push(`${file} → "${retired}"`)
      }
    }
    expect(offenders).toEqual([])
  })
})

describe('สิบเทพยกค่ามาจาก TEN_GODS ไม่ก๊อบซ้ำ', () => {
  it('cn / th / workMeaning ตรงกับ constants.ts ทุกตัว', () => {
    for (const key of Object.keys(TEN_GODS) as TenGodKey[]) {
      const g = GLOSSARY[key]
      const c = TEN_GODS[key]
      expect(g.cn, key).toBe(c.cn)
      expect(g.th, key).toBe(c.th)
      expect(g.workMeaning, key).toBe(c.workMeaning)
    }
  })
})
