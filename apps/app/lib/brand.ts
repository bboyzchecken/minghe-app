/**
 * ข้อมูลแบรนด์ห้าธาตุ (命合 Mìnghé) — ทิศทางโทนอุ่นสว่าง
 * สีดึงมาจากไอคอนใน mockup ของอาจารย์เม
 */

export type ElementKey = 'wood' | 'fire' | 'earth' | 'metal' | 'water'

export interface ElementMeta {
  key: ElementKey
  cn: string
  th: string
  en: string
  color: string
  /** คำโปรยลักษณะพลังธาตุ (ใช้ในหน้า marketing / รายงาน) */
  vibe: string
}

export const ELEMENT_META: Record<ElementKey, ElementMeta> = {
  wood: { key: 'wood', cn: '木', th: 'ไม้', en: 'Wood', color: '#7B8B57', vibe: 'เติบโต ริเริ่ม ใฝ่เรียนรู้' },
  fire: { key: 'fire', cn: '火', th: 'ไฟ', en: 'Fire', color: '#9E3B2A', vibe: 'กระตือรือร้น จุดประกายคน' },
  earth: { key: 'earth', cn: '土', th: 'ดิน', en: 'Earth', color: '#B65E3E', vibe: 'มั่นคง น่าไว้วางใจ เป็นหลัก' },
  metal: { key: 'metal', cn: '金', th: 'ทอง', en: 'Metal', color: '#BE8A2E', vibe: 'เฉียบคม มีหลักการ ตัดสินใจชัด' },
  water: { key: 'water', cn: '水', th: 'น้ำ', en: 'Water', color: '#5E9BB5', vibe: 'ปัญญา ยืดหยุ่น ปรับตัวไว' },
}

/** ลำดับรอบวงจรเกื้อกูล (相生) — ใช้เรียงกราฟ/ไอคอนให้สม่ำเสมอ */
export const ELEMENT_ORDER: ElementKey[] = ['wood', 'fire', 'earth', 'metal', 'water']

export const elementColor = (k: ElementKey) => ELEMENT_META[k].color
export const elementTh = (k: ElementKey) => ELEMENT_META[k].th
