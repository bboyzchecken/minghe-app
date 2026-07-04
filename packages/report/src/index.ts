/**
 * @minghe/report — สร้างรายงานความเหมาะสม 命合 (Mìnghé Fit Report)
 *
 * ลำดับงาน: engine คำนวณ (deterministic) → เรียบเรียงไทย (deterministic)
 * → [ถ้ามี API key] Claude ขัดเงาภาษา + อ่านโหงวเฮ้งจากรูป
 */

import { assembleReport } from './assemble'
import { buildNarrative } from './narrative'
import { aiAvailable, polishNarrative, readFace } from './llm'
import type { FaceReadingView, GenerateReportInput, ReportData } from './types'

export * from './types'
export { assembleReport, buildNarrative, polishNarrative, readFace, aiAvailable }

export async function generateReport(input: GenerateReportInput): Promise<ReportData> {
  // 1) คำนวณทั้งหมดด้วย engine (ห้าม LLM แตะตัวเลข)
  const { data } = assembleReport(input)

  // 2) เรียบเรียงไทยแบบ deterministic
  const baseSections = buildNarrative(data)

  // 3) ส่วนเสริม AI
  const useAI = input.options?.useAI ?? aiAvailable()

  let faceReading: FaceReadingView
  if (input.photo && useAI) {
    faceReading = await readFace(input.photo, input.subject.name)
  } else if (input.photo) {
    faceReading = {
      available: false,
      notice: 'ออเดอร์นี้แนบรูปมา แต่ระบบอ่านโหงวเฮ้งไม่ได้เปิดใช้งาน — วิเคราะห์จากผังปาจือเป็นหลัก',
    }
  } else {
    faceReading = {
      available: false,
      notice: 'ไม่ได้แนบรูปถ่าย — รายงานฉบับนี้วิเคราะห์จากผังปาจือเป็นหลัก',
    }
  }

  let sections = baseSections
  let polishedByAI = false
  if (useAI) {
    const polished = await polishNarrative(baseSections, {
      subjectName: input.subject.name,
      orgLabel: data.meta.orgLabel,
      score: data.compatibility.score,
    })
    if (polished) {
      sections = polished
      polishedByAI = true
    }
  }

  return {
    ...data,
    faceReading,
    narrative: { sections, polishedByAI },
  }
}
