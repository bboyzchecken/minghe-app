/**
 * ชนิดข้อมูลของ "เนื้อหา" ที่แยกออกจาก JSX
 *
 * ทำไมต้องมี: หน้าแรกแตกเป็น 3 ที่ (หน้าแรกย่อ · /elements/[stem] · /about)
 * ถ้าเนื้อหายังฝังใน JSX การแก้คำแต่ละครั้งต้องแตะโค้ด — แยกออกมาแล้วแก้คำได้โดยไม่แตะ component
 *
 * เจ้าของ: สาย S2 (`docs/dev-plan-uat-2026-09-09.md` §5)
 */

import type { ElementKey } from '@/lib/brand'

/** บล็อกเนื้อหาทั่วไป */
export interface ContentBlock {
  id: string
  titleTh: string
  /** ย่อหน้า — หนึ่งช่องต่อหนึ่งย่อหน้า */
  paragraphsTh: string[]
}

/** สลักของ 10 ก้านวัน ใช้เป็น URL ที่ /elements/[stem] */
export type StemSlug =
  | 'jia' // 甲
  | 'yi' // 乙
  | 'bing' // 丙
  | 'ding' // 丁
  | 'wu' // 戊
  | 'ji' // 己
  | 'geng' // 庚
  | 'xin' // 辛
  | 'ren' // 壬
  | 'gui' // 癸

/** เนื้อหาหนึ่งหน้าของ /elements/[stem] — แปลงมาจากการ์ด 10 ก้านวันของชุดเนื้อหาใหม่ */
export interface StemPageContent {
  slug: StemSlug
  /** ตัวจีน เช่น 甲 */
  cn: string
  /** พินอินมีวรรณยุกต์ เช่น jiǎ */
  pinyin: string
  /** ชื่อทับศัพท์ ตรงกับ STEMS ใน @minghe/core เช่น 'เจี่ย' */
  transliterationTh: string
  /** ชื่อที่คนทั่วไปเข้าใจ เช่น 'ไม้หยาง' */
  th: string
  element: ElementKey
  yinYang: 'yang' | 'yin'
  /** คำเปรียบตามตำรา เช่น 'ต้นไม้ใหญ่ที่ยืนต้นตรง' */
  metaphorTh: string
  /** พลังที่มักพบ */
  strengthsTh: string[]
  /** บริบทงานที่สอดคล้อง */
  workContextsTh: string[]
  /** ข้อควรระวัง */
  cautionsTh: string[]
}

/** จดหมายจากทีมซินแสที่หน้า /about */
export interface LetterContent {
  titleTh: string
  leadTh: string
  paragraphsTh: string[]
  /**
   * ย่อหน้าชี้แจงเรื่อง AI — บังคับมี ตาม P1-4
   * จดหมายพูดถึง "ความเข้าใจผิดจากการนำ AI มาใช้ดูดวง" ขณะที่ MingHe ใช้ LLM เขียนรายงาน
   * ต้องระบุให้ชัดว่า AI ไม่แตะการคำนวณ ทำหน้าที่แปลผลลัพธ์ที่ซินแสกำหนดกฎไว้ (ตรงกับ DataSpec B0)
   */
  aiClarificationTh: string
  signatureTh: string
}

/** บล็อก "วิธีอ่านดวงโดยย่อ" บนหน้าแรก — ย่อจากชุดเนื้อหาเต็มเหลือ 3 หัวข้อ */
export interface PrimerContent {
  eyebrowTh: string
  titleTh: string
  leadTh: string
  items: { cn: string; titleTh: string; bodyTh: string }[]
  linkLabelTh: string
  linkHref: string
}
