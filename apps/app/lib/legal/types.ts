/**
 * โครงสร้างเอกสารกฎหมาย (F-01)
 *
 * เก็บเป็นข้อมูลใน repo ไม่ใช่ในฐานข้อมูล เพราะ:
 *   1. หน้าเว็บเป็น static export — payment gateway และผู้ตรวจต้องเปิดอ่านได้เสมอ ไม่ขึ้นกับ API
 *   2. ทุกการแก้ถ้อยคำเห็นได้ใน git diff — ตรวจทานย้อนหลังได้ว่าใครแก้อะไรตอนไหน
 *
 * เวอร์ชันของเอกสารที่ใช้เป็นหลักฐาน "ผู้ใช้ยอมรับฉบับไหน" ยังมาจากฝั่ง Go เหมือนเดิม
 * (ตาราง legal_documents) — ตราบใดที่ยังไม่มีฉบับ published ระบบจะบันทึกเป็น `draft`
 * ซึ่งตรงกับความจริงว่าเอกสารยังไม่มีผลบังคับใช้
 */

export interface LegalTable {
  head: string[]
  rows: string[][]
}

export interface LegalSection {
  heading: string
  paragraphs?: string[]
  bullets?: string[]
  table?: LegalTable
  /** กล่องเน้นข้อความสำคัญ เช่น ข้อจำกัดความรับผิด */
  callout?: string
}

export interface LegalDoc {
  slug: 'terms' | 'privacy' | 'refund' | 'cookies'
  title: string
  cn: string
  /** เวอร์ชันร่าง — ต้องตรงกับที่ตั้งใน LEGAL_*_VERSION ของ .env ตอนประกาศใช้จริง */
  version: string
  status: 'draft' | 'published'
  /** วันที่แก้ไขร่างล่าสุด (ไม่ใช่วันที่มีผลบังคับใช้) */
  revised: string
  intro: string
  sections: LegalSection[]
  /** สิ่งที่ยังต้องเติมหรือยืนยันก่อนประกาศใช้ — แสดงให้เห็นชัดบนหน้าเว็บระหว่างเป็นร่าง */
  pending: string[]
}

/**
 * ข้อมูลผู้ให้บริการ — GB Prime Pay บังคับให้แสดงบนเว็บ (Q0-3)
 *
 * ค่าที่อยู่ในวงเล็บเหลี่ยมคือ "ยังไม่ได้รับข้อมูล" ตั้งใจปล่อยเป็นตัวยึดที่มองเห็นชัด
 * ห้ามเดาหรือกรอกตัวเลขสมมุติ — เอกสารกฎหมายที่มีข้อมูลนิติบุคคลผิดใช้ไม่ได้
 */
export const SELLER = {
  brand: '命合 Mìnghé',
  legalName: '[ชื่อนิติบุคคลตามหนังสือรับรอง]',
  registrationNo: '[เลขทะเบียนนิติบุคคล 13 หลัก]',
  address: '[ที่อยู่จดทะเบียน]',
  email: 'info@minghe.work',
  website: 'https://minghe.work',
  /** ผู้ตรวจและอนุมัติเนื้อหาก่อนประกาศใช้ */
  reviewer: '[ผู้ตรวจเอกสาร — ทนายความ / เจ้าของธุรกิจ]',
} as const

/** true เมื่อข้อความมีตัวยึดที่ยังไม่ได้เติม — ใช้ไฮไลต์บนหน้าเว็บ */
export const PLACEHOLDER_PATTERN = /(\[[^\]]+\])/g
