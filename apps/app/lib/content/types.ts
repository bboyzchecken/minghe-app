/**
 * ชนิดข้อมูลของ "เนื้อหา" ที่แยกออกจาก JSX
 *
 * ทำไมต้องมี: หน้าแรกกำลังจะแตกเป็น 3 ที่ (หน้าแรกย่อ · /elements/[stem] · /about)
 * ถ้าเนื้อหายังฝังใน JSX การแก้คำแต่ละครั้งต้องแตะโค้ด — แยกออกมาก่อนแล้วค่อยเทเนื้อหาใหม่ลง
 *
 * ⚠️ สถานะ: ไฟล์นี้เป็น **โครงจาก T0-4** — มีแต่ `type` ยังไม่มีเนื้อหา
 * การเทเนื้อหาจริงเป็นงานของสาย **S2** ดู `docs/dev-plan-uat-2026-09-09.md` §5
 */

/** บล็อกเนื้อหาทั่วไป — ใช้กับ Strip ที่ย่อแล้วบนหน้าแรก */
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
  cn: string
  pinyin: string
  /** ชื่อไทย เช่น 'ไม้หยาง' */
  th: string
  /** คำเปรียบ เช่น 'ต้นไม้ใหญ่ที่ยืนต้นตรง' */
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
  paragraphsTh: string[]
  /**
   * ย่อหน้าชี้แจงเรื่อง AI — บังคับมี ตาม P1-4
   * จดหมายพูดถึง "ความเข้าใจผิดจากการนำ AI มาใช้ดูดวง" ขณะที่ MingHe ใช้ LLM เขียนรายงาน
   * ต้องระบุให้ชัดว่า AI ไม่แตะการคำนวณ ทำหน้าที่แปลผลลัพธ์ที่ซินแสกำหนดกฎไว้ (ตรงกับ DataSpec B0)
   */
  aiClarificationTh: string
  signatureTh: string
}
