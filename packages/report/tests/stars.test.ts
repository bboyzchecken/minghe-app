/**
 * เทสต์ดาวประจำดวง (神煞) — ตอบข้อ 1.1 + 1.2 ของ อ.เม
 *
 * สองเรื่องที่ต้องคุมให้ได้พร้อมกัน และเป็นคนละเรื่องกัน:
 *   ข้อ 1.1 "อำนาจ"  → ดาวไม่มีสิทธิ์ตัดสิน · ดาวที่ถูกชงหรือเกาะบนธาตุโทษต้องถูกปิดเสียง
 *   ข้อ 1.2 "พื้นที่" → ดาวที่ผ่านเกณฑ์ต้องมีหัวข้อของตัวเองในรายงาน วางท้ายลำดับ (B20)
 *
 * เทสต์ชุดนี้ผสมสองแบบ: เคสที่ปักหมุดไว้ (ตรวจค่าจริงทีละ field)
 * กับ property test ที่ไล่ดวงหลายร้อยใบเพื่อยืนยันว่ากติกาไม่มีทางหลุด
 */

import { describe, expect, it } from 'vitest'
import { analyzeWuXing, computeBazi } from '@minghe/core'
import { computeStars, visibleStars, STAR_AUTHORITY, STAR_PROMINENCE } from '../src/stars'
import type { StarKey, StarView } from '../src/stars'
import { generateReport } from '../src/index'

function starsOf(year: number, month: number, day: number, hour = 9, minute = 30) {
  const chart = computeBazi({
    year,
    month,
    day,
    hour,
    minute,
    province: 'กรุงเทพมหานคร',
    gender: 'male',
  })
  return computeStars(chart, analyzeWuXing(chart))
}

function pick(stars: StarView[], key: StarKey): StarView {
  const s = stars.find((x) => x.key === key)
  if (!s) throw new Error(`ไม่พบดาว ${key}`)
  return s
}

/** ดวงตัวอย่างกระจายทั้งปีและทั้งเดือน ใช้กับ property test */
function sampleCharts() {
  const out: StarView[][] = []
  for (let y = 1975; y <= 2004; y++) {
    for (const m of [1, 4, 7, 10]) {
      for (const d of [6, 21]) out.push(starsOf(y, m, d))
    }
  }
  return out
}

describe('การตัดสินใจเชิงออกแบบ — แยกอำนาจออกจากพื้นที่', () => {
  it('ดาวเป็นตัวขยายความ (modifier) แต่มีพื้นที่ระดับ section', () => {
    expect(STAR_AUTHORITY).toBe('modifier')
    expect(STAR_PROMINENCE).toBe('section')
  })
})

describe('ท่อกรองก่อนแสดงผล — เคสที่ปักหมุดไว้', () => {
  it('ผ่านทุกด่าน → visible พร้อมบริบทครบ', () => {
    const s = pick(starsOf(1980, 8, 3), 'academic')
    expect(s.active).toBe(true)
    expect(s.branchCn).toBe('申')
    expect(s.pillar).toBe('year')
    expect(s.pillarTh).toBeTruthy()
    expect(s.elementStatus).toBe('favorable')
    expect(s.isClashed).toBe(false)
    expect(s.domain).toBe('public') // เสาปี = พื้นที่สาธารณะ
    expect(s.visible).toBe(true)
    expect(s.mutedReasonTh).toBeNull()
  })

  it('ถูกชง → ปิดเสียง แม้ธาตุจะเป็นธาตุอุปถัมภ์ก็ตาม', () => {
    const s = pick(starsOf(1982, 11, 17), 'academic')
    expect(s.active).toBe(true)
    expect(s.elementStatus).toBe('favorable') // ธาตุดี แต่ไม่ช่วย
    expect(s.isClashed).toBe(true)
    expect(s.visible).toBe(false)
    expect(s.mutedReasonTh).toContain('ถูกชง')
  })

  it('เกาะบนธาตุโทษ (ไม่ถูกชง) → ปิดเสียง', () => {
    const s = pick(starsOf(1980, 5, 3), 'academic')
    expect(s.active).toBe(true)
    expect(s.isClashed).toBe(false)
    expect(s.elementStatus).toBe('unfavorable')
    expect(s.visible).toBe(false)
    expect(s.mutedReasonTh).toContain('ธาตุโทษ')
  })

  it('ไม่จุติ → ไม่ visible และไม่มีบริบทของเสา', () => {
    const stars = starsOf(1980, 2, 3)
    for (const s of stars) {
      expect(s.active).toBe(false)
      expect(s.visible).toBe(false)
      expect(s.branchCn).toBeNull()
      expect(s.pillar).toBeNull()
      expect(s.domain).toBeNull()
      expect(s.mutedReasonTh).toBe('ไม่จุติในดวงนี้')
    }
    expect(visibleStars(stars)).toEqual([])
  })
})

describe('กติกาที่ต้องเป็นจริงกับทุกดวง (property test)', () => {
  const all = sampleCharts()

  it('ตัวอย่างครอบคลุมทุกกิ่งของท่อกรองจริง', () => {
    const flat = all.flat()
    expect(flat.length).toBeGreaterThan(500)
    expect(flat.some((s) => s.visible)).toBe(true)
    expect(flat.some((s) => s.active && s.isClashed)).toBe(true)
    expect(flat.some((s) => s.active && s.elementStatus === 'unfavorable')).toBe(true)
    expect(flat.some((s) => !s.active)).toBe(true)
  })

  it('visible ก็ต่อเมื่อจุติ ไม่ถูกชง และไม่ใช่ธาตุโทษ — ไม่มีข้อยกเว้น', () => {
    for (const s of all.flat()) {
      const shouldShow = s.active && !s.isClashed && s.elementStatus !== 'unfavorable'
      expect(s.visible, `${s.key} ${s.branchCn ?? '-'}`).toBe(shouldShow)
      expect(s.mutedReasonTh === null, `${s.key}`).toBe(s.visible)
    }
  })

  it('ดาวทุกดวงคืนครบ 3 ดวงและไม่ซ้ำคีย์', () => {
    for (const stars of all) {
      expect(stars).toHaveLength(3)
      expect(new Set(stars.map((s) => s.key)).size).toBe(3)
    }
  })

  it('เสาปี/เดือน = สาธารณะ · เสาวัน/ยาม = ส่วนตัว', () => {
    for (const s of all.flat()) {
      if (!s.pillar) continue
      const expected = s.pillar === 'year' || s.pillar === 'month' ? 'public' : 'private'
      expect(s.domain, `${s.key} ${s.pillar}`).toBe(expected)
    }
  })

  it('ดาวที่จุติต้องมีบริบทครบ — กิ่ง เสา ธาตุ ไม่เป็น null', () => {
    for (const s of all.flat()) {
      if (!s.active) continue
      expect(s.branchCn, s.key).toBeTruthy()
      expect(s.pillar, s.key).toBeTruthy()
      expect(s.pillarTh, s.key).toBeTruthy()
      expect(s.element, s.key).toBeTruthy()
    }
  })
})

describe('หัวข้อ "ดาวประจำดวง" ในรายงาน', () => {
  const input = {
    subject: {
      name: 'สมชาย ใจดี',
      gender: 'male' as const,
      birthDate: '1980-08-03',
      birthTime: '09:30',
      province: 'กรุงเทพมหานคร',
    },
    org: {
      mode: 'executive' as const,
      executiveName: 'คุณวิชัย',
      birthDate: '1970-03-05',
      birthTime: '14:30',
      province: 'เชียงใหม่',
    },
    targetYear: 2026,
    options: { useAI: false },
  }

  it('มี section ของตัวเอง และวางท้ายลำดับก่อนบทสรุปเท่านั้น (B20)', async () => {
    const report = await generateReport(input)
    const ids = report.narrative.sections.map((s) => s.id)

    expect(ids).toContain('stars')
    const starIdx = ids.indexOf('stars')
    // ต้องอยู่หลังข้อสรุปเรื่องความเข้ากันและจังหวะเวลา — ห้ามขึ้นก่อนเป็น headline
    expect(starIdx).toBeGreaterThan(ids.indexOf('compatibility'))
    expect(starIdx).toBeGreaterThan(ids.indexOf('timing'))
    // และต้องอยู่ก่อนบทสรุปปิดท้าย
    expect(starIdx).toBeLessThan(ids.indexOf('closing'))
  })

  it('ย่อหน้านำบอกชัดว่าดาวไม่ใช่ตัวชี้ขาด', async () => {
    const report = await generateReport(input)
    const section = report.narrative.sections.find((s) => s.id === 'stars')!
    expect(section.title).toContain('ดาวประจำดวง')
    expect(section.paragraphs[0]).toContain('ไม่ใช่ตัวชี้ขาด')
  })

  it('ดาวที่ถูกปิดเสียงต้องไม่โผล่ในเนื้อหาของหัวข้อนี้', async () => {
    // ดวงนี้มีทั้งดาวที่ผ่านและดาวที่ตกด่าน
    const report = await generateReport(input)
    const section = report.narrative.sections.find((s) => s.id === 'stars')!
    const text = section.paragraphs.join('\n')

    const muted = report.stars.filter((s) => !s.visible)
    const shown = report.stars.filter((s) => s.visible)
    expect(muted.length).toBeGreaterThan(0)

    for (const s of muted) expect(text, `${s.key} ถูกปิดเสียงแต่ยังโผล่`).not.toContain(s.cn)
    for (const s of shown) expect(text, `${s.key} ผ่านเกณฑ์แต่ไม่ถูกแสดง`).toContain(s.cn)
  })

  it('ดวงที่ไม่มีดาวผ่านเกณฑ์เลย — ยังมีหัวข้อ และใช้น้ำเสียงให้กำลังใจ', async () => {
    const report = await generateReport({
      ...input,
      subject: { ...input.subject, birthDate: '1980-02-03' },
    })
    expect(report.stars.every((s) => !s.visible)).toBe(true)

    const section = report.narrative.sections.find((s) => s.id === 'stars')!
    const text = section.paragraphs.join('\n')
    expect(text).toContain('ไม่ใช่ข้อด้อย')
  })

  it('ReportData แนบดาวทุกดวงมาให้ตรวจย้อนได้ ไม่ใช่เฉพาะตัวที่แสดง', async () => {
    const report = await generateReport(input)
    expect(report.stars).toHaveLength(3)
    for (const s of report.stars) {
      expect(typeof s.visible).toBe('boolean')
      expect(s.visible === (s.mutedReasonTh === null)).toBe(true)
    }
  })
})
