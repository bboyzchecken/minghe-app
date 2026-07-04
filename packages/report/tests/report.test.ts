/**
 * เทสต์การประกอบรายงาน (โหมด deterministic — ไม่เรียก AI)
 */

import { describe, expect, it } from 'vitest'
import { generateReport } from '../src/index'

const subject = {
  name: 'สมชาย ใจดี',
  gender: 'male' as const,
  birthDate: '1992-08-17',
  birthTime: '07:45',
  province: 'กรุงเทพมหานคร',
}

describe('generateReport (ไม่ใช้ AI)', () => {
  it('โหมดผู้บริหาร: ได้รายงานครบโครงสร้าง + narrative ไทย', async () => {
    const report = await generateReport({
      subject,
      org: {
        mode: 'executive',
        executiveName: 'คุณวิชัย',
        birthDate: '1970-03-05',
        birthTime: '14:30',
        province: 'เชียงใหม่',
      },
      targetYear: 2026,
      options: { useAI: false },
    })

    expect(report.version).toBe(1)
    expect(report.meta.subjectName).toBe(subject.name)
    expect(report.subject.chart.pillars).toHaveLength(4)
    expect(report.subject.chart.trueSolarTime.applied).toBe(true)
    expect(report.org.chart).toBeTruthy()
    expect(report.compatibility.score).toBeGreaterThanOrEqual(5)
    expect(report.compatibility.score).toBeLessThanOrEqual(98)
    expect(report.narrative.polishedByAI).toBe(false)
    expect(report.narrative.sections.length).toBeGreaterThanOrEqual(5)
    expect(report.narrative.sections[0]!.paragraphs[0]).toContain('命合')
    expect(report.disclaimer.length).toBeGreaterThanOrEqual(3)
    expect(report.faceReading.available).toBe(false)
    // ต้อง serialize เป็น JSON ได้ (เก็บลง DB)
    expect(() => JSON.stringify(report)).not.toThrow()
  })

  it('โหมดวันก่อตั้งบริษัท + ทีม: มีผลทีมรายคู่', async () => {
    const report = await generateReport({
      subject,
      org: {
        mode: 'company-date',
        companyName: 'บจก. รุ่งเรืองการค้า',
        foundingDate: '2015-03-09',
        team: [
          { name: 'สมหญิง', birthDate: '1988-11-20', birthTime: '09:00' },
          { name: 'อนันต์', birthDate: '1995-04-02' },
        ],
      },
      targetYear: 2026,
      options: { useAI: false },
    })
    expect(report.org.mode).toBe('company-date')
    expect(report.team).toBeTruthy()
    expect(report.team!.pairwise).toHaveLength(2)
    expect(report.narrative.sections.some((s) => s.id === 'team')).toBe(true)
  })

  it('โหมดอุตสาหกรรม: แนบข้อมูลธาตุอุตสาหกรรม', async () => {
    const report = await generateReport({
      subject,
      org: { mode: 'industry', industryId: 'finance' },
      targetYear: 2026,
      options: { useAI: false },
    })
    expect(report.org.industry?.element).toBe('metal')
    expect(report.compatibility.mode).toBe('industry')
  })

  it('อินพุตผิดรูปแบบ → โยน error ที่อ่านรู้เรื่อง', async () => {
    await expect(
      generateReport({
        subject: { ...subject, birthDate: '17/08/1992' },
        org: { mode: 'industry', industryId: 'finance' },
        options: { useAI: false },
      }),
    ).rejects.toThrow('รูปแบบวันที่ไม่ถูกต้อง')
  })
})
