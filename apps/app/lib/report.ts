/**
 * ตัวประกอบรายงานฝั่ง client
 * — เรียก assembleReport + buildNarrative จาก @minghe/report โดยตรง
 *   (import แบบ subpath เพื่อ "ไม่" ลาก @anthropic-ai/sdk เข้ามาใน bundle)
 * ทุกอย่าง deterministic รันในเบราว์เซอร์ได้ 100%
 */

import { assembleReport } from '@minghe/report/assemble'
import { buildNarrative } from '@minghe/report/narrative'
import type { GenerateReportInput, ReportData } from '@minghe/report/types'

export type { GenerateReportInput, ReportData } from '@minghe/report/types'

export function buildReport(input: GenerateReportInput): ReportData {
  const { data } = assembleReport(input)
  const sections = buildNarrative(data)
  return {
    ...data,
    faceReading: {
      available: false,
      notice: 'วิเคราะห์จากผังปาจือเป็นหลัก — บริการอ่านโหงวเฮ้งจะเปิดให้บริการในเฟสถัดไป',
    },
    narrative: { sections, polishedByAI: false },
  }
}

export interface TenGodPct {
  cn: string
  th: string
  workMeaning: string
  percent: number
}

/** แปลงสิบเทพเด่น (ถ่วงน้ำหนัก) เป็น % ตามสเปกรายงาน §7.2 */
export function tenGodsPercent(
  dominant: { cn: string; th: string; workMeaning: string; weight: number }[],
): TenGodPct[] {
  const top = dominant.slice(0, 5)
  const total = top.reduce((s, d) => s + d.weight, 0) || 1
  return top.map((d) => ({
    cn: d.cn,
    th: d.th,
    workMeaning: d.workMeaning,
    percent: Math.round((d.weight / total) * 100),
  }))
}

/** อินพุตตัวอย่าง (ใช้กับหน้า /report เมื่อยังไม่มีออเดอร์จริง) */
export const DEMO_INPUT: GenerateReportInput = {
  subject: {
    name: 'พรนิษฐ์',
    gender: 'female',
    // ดวงนี้มี 文昌 จุติที่เสาปี (กิ่ง 申) และผ่านท่อกรองดาว — รายงานตัวอย่างจึงโชว์
    // หัวข้อ "ดาวประจำดวง" ได้จริง ไม่ใช่ empty state (ดู packages/report/src/stars.ts)
    birthDate: '1980-08-03',
    birthTime: '08:45',
    province: 'กรุงเทพมหานคร',
  },
  org: {
    mode: 'executive',
    executiveName: 'คุณบัส (ผู้บริหาร)',
    birthDate: '1980-11-03',
    birthTime: '06:30',
    province: 'กรุงเทพมหานคร',
    team: [
      { name: 'ธนโชติ', birthDate: '1988-02-14', birthTime: '13:20', province: 'เชียงใหม่' },
      { name: 'ศิริพร', birthDate: '1995-09-30', birthTime: '22:10', province: 'ขอนแก่น' },
    ],
  },
  targetYear: 2026,
}
