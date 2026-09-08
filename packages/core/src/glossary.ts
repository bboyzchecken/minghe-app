/**
 * คลังคำกลาง (glossary) — แหล่งเดียวของศัพท์ปาจื้อที่ใช้สื่อสารกับผู้ใช้
 *
 * ทำไมต้องมี: `SpecificationDirection` ข้อ 4 เตือนว่าถ้าไม่ล็อกคำก่อนลงมือ dev จะ map field ผิด
 * และตอนนี้ศัพท์กระจายอยู่หลายไฟล์ ทั้ง `constants.ts` · หน้าเว็บ · รายงาน
 *
 * ⚠️ สถานะ: ไฟล์นี้เป็น **โครงจาก T0-4** — คีย์ครบแล้ว แต่ค่ายังเป็น "คำเดิม" ที่ระบบใช้อยู่
 * การเทคำที่ อ.เม ยืนยัน (เช่น 用神 → "ธาตุอุปถัมภ์") เป็นงานของสาย **S1**
 * ดู `docs/dev-plan-uat-2026-09-09.md` §5
 */

import { TEN_GODS } from './constants'
import type { TenGodKey } from './types'

/** ศัพท์แกนที่ไม่ใช่สิบเทพ */
export type CoreGlossaryKey =
  | 'USEFUL_GOD' // 用神
  | 'UNFAVORABLE_GOD' // 忌神
  | 'DAY_MASTER' // 日主
  | 'MONTH_COMMAND' // 月令
  | 'PATTERN' // 格局
  | 'LUCK_PILLAR' // 大運
  | 'ANNUAL' // 流年

/** คีย์ทั้งหมดของคลังคำ = ศัพท์แกน 7 คำ + สิบเทพ 10 ตัว */
export type GlossaryKey = CoreGlossaryKey | TenGodKey

export interface GlossaryTerm {
  key: GlossaryKey
  /** ตัวเขียนจีน (ตัวเต็ม) */
  cn: string
  /** พินอินมีวรรณยุกต์ */
  pinyin: string
  /** คำไทยที่ใช้แสดงต่อผู้ใช้ — คำนี้คือคำเดียวที่ผู้ใช้จะเห็น */
  th: string
  /** ความหมายเชิงการทำงาน/องค์กร (บริบทที่ MingHe ใช้จริง) */
  workMeaning: string
}

const CORE_TERMS: Record<CoreGlossaryKey, GlossaryTerm> = {
  USEFUL_GOD: {
    key: 'USEFUL_GOD',
    cn: '用神',
    pinyin: 'yòngshén',
    // TODO(S1): อ.เม ยืนยันคำว่า "ธาตุอุปถัมภ์" (ข้อ 2.1) — ค่าปัจจุบันคือคำเดิมที่ใช้อยู่ 16 จุด
    th: 'ธาตุอุปการะ',
    workMeaning:
      'ธาตุที่ดวงต้องการเพื่อกลับเข้าสมดุล — ใช้ตอบว่าอุตสาหกรรมและสภาพแวดล้อมงานแบบไหนเกื้อหนุนเจ้าของดวง',
  },
  UNFAVORABLE_GOD: {
    key: 'UNFAVORABLE_GOD',
    cn: '忌神',
    pinyin: 'jìshén',
    th: 'ธาตุโทษ',
    workMeaning:
      'ธาตุที่ซ้ำเติมความไม่สมดุลของดวง — ใช้เตือนว่าสภาพแวดล้อมงานแบบไหนต้องบริหารเป็นพิเศษ',
  },
  DAY_MASTER: {
    key: 'DAY_MASTER',
    cn: '日主',
    pinyin: 'rìzhǔ',
    th: 'ก้านวัน (ตัวตน)',
    workMeaning: 'ก้านฟ้าของเสาวัน = ตัวเจ้าของดวง เป็นจุดอ้างอิงที่ใช้คิดสิบเทพทั้งหมด',
  },
  MONTH_COMMAND: {
    key: 'MONTH_COMMAND',
    cn: '月令',
    pinyin: 'yuèlìng',
    th: 'เสาเดือน (ฤดูเจ้าเรือน)',
    workMeaning: 'ฤดูที่เสาเดือนกำหนด — ตัวชี้ขาดว่าก้านวันได้กำลังจากฤดูหรือไม่ (得令)',
  },
  PATTERN: {
    key: 'PATTERN',
    cn: '格局',
    pinyin: 'géjú',
    // TODO(S1): ยังไม่มีคำไทยที่ใช้อยู่จริงในระบบ — ค่านี้เป็นคำตั้งต้น รอ S1 ยืนยัน
    th: 'โครงสร้างดวง',
    workMeaning: 'โครงหลักของดวงที่สรุปจากเสาเดือนและสิบเทพเด่น — กำหนดแนวการอ่านของทั้งใบ',
  },
  LUCK_PILLAR: {
    key: 'LUCK_PILLAR',
    cn: '大運',
    pinyin: 'dàyùn',
    // TODO(S1): ยังไม่มีคำไทยที่ใช้อยู่จริงในระบบ — ค่านี้เป็นคำตั้งต้น รอ S1 ยืนยัน
    th: 'ดวงใหญ่ (ช่วง 10 ปี)',
    workMeaning: 'ช่วงจังหวะ 10 ปีที่เดินต่อจากเสาเดือน — ใช้ตอบว่าช่วงไหนควรรุก ช่วงไหนควรตั้งหลัก',
  },
  ANNUAL: {
    key: 'ANNUAL',
    cn: '流年',
    pinyin: 'liúnián',
    th: 'ปีจร',
    workMeaning: 'อิทธิพลของก้าน-กิ่งประจำปีที่ซ้อนลงบนดวงใหญ่ — ใช้ตอบจังหวะระยะสั้นรายปี',
  },
}

/** พินอินของสิบเทพ — ส่วนที่ `TEN_GODS` ยังไม่มี */
const TEN_GOD_PINYIN: Record<TenGodKey, string> = {
  BI_JIAN: 'bǐjiān',
  JIE_CAI: 'jiécái',
  SHI_SHEN: 'shíshén',
  SHANG_GUAN: 'shāngguān',
  PIAN_CAI: 'piāncái',
  ZHENG_CAI: 'zhèngcái',
  QI_SHA: 'qīshā',
  ZHENG_GUAN: 'zhèngguān',
  PIAN_YIN: 'piānyìn',
  ZHENG_YIN: 'zhèngyìn',
}

/**
 * สิบเทพยกค่ามาจาก `TEN_GODS` โดยตรง ไม่ก๊อบซ้ำ
 * — แก้คำที่เดียวที่ `constants.ts` แล้วคลังคำตามทันที
 */
const TEN_GOD_TERMS = Object.fromEntries(
  (Object.keys(TEN_GODS) as TenGodKey[]).map((key) => {
    const g = TEN_GODS[key]
    const term: GlossaryTerm = {
      key,
      cn: g.cn,
      pinyin: TEN_GOD_PINYIN[key],
      th: g.th,
      workMeaning: g.workMeaning,
    }
    return [key, term]
  }),
) as Record<TenGodKey, GlossaryTerm>

/** คลังคำกลางทั้งหมด — ทุกที่ที่จะแสดงศัพท์ปาจื้อต่อผู้ใช้ ให้อ่านจากตัวนี้ */
export const GLOSSARY: Record<GlossaryKey, GlossaryTerm> = {
  ...CORE_TERMS,
  ...TEN_GOD_TERMS,
}

export const GLOSSARY_KEYS = Object.keys(GLOSSARY) as GlossaryKey[]

/** อ่านคำจากคลัง — ใช้แทนการพิมพ์ศัพท์ตรง ๆ ในหน้าเว็บและรายงาน */
export function term(key: GlossaryKey): GlossaryTerm {
  return GLOSSARY[key]
}
