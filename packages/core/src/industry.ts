/**
 * ตารางธาตุอุตสาหกรรม (行業五行) — ใช้โหมด "องค์กร = ธาตุอุตสาหกรรม"
 * การจัดหมวดตามตำราประยุกต์ที่ใช้แพร่หลายในแวดวงซินแสไทย-จีน
 */

import type { ElementKey, IndustryEntry } from './types'

export const INDUSTRIES: IndustryEntry[] = [
  // 木 ไม้ — เติบโต ให้ความรู้ ธรรมชาติ
  { id: 'education', th: 'การศึกษา / โรงเรียน / ติวเตอร์', element: 'wood', note: 'ให้ความรู้ บ่มเพาะคน' },
  { id: 'publishing', th: 'สิ่งพิมพ์ / หนังสือ / คอนเทนต์ความรู้', element: 'wood', note: 'งานกระดาษและปัญญา' },
  { id: 'furniture', th: 'เฟอร์นิเจอร์ / งานไม้ / วัสดุธรรมชาติ', element: 'wood', note: 'ไม้โดยตรง' },
  { id: 'agriculture', th: 'เกษตร / ป่าไม้ / ต้นไม้ / สวน', element: 'wood', note: 'การเพาะปลูกเติบโต' },
  { id: 'textile', th: 'สิ่งทอ / เครื่องนุ่งห่ม / แฟชั่น', element: 'wood', note: 'เส้นใยจากพืช' },
  { id: 'herbal-health', th: 'สุขภาพ / สมุนไพร / เวลเนส', element: 'wood', note: 'การเยียวยาเติบโต' },

  // 火 ไฟ — พลังงาน แสงสว่าง การแสดงออก
  { id: 'energy', th: 'พลังงาน / ไฟฟ้า / เชื้อเพลิง', element: 'fire', note: 'ไฟโดยตรง' },
  { id: 'restaurant', th: 'ร้านอาหาร / ครัว / เบเกอรี่', element: 'fire', note: 'เตาไฟ ความร้อน' },
  { id: 'marketing', th: 'การตลาด / โฆษณา / อีเวนต์ / บันเทิง', element: 'fire', note: 'ความโดดเด่น แสงสี' },
  { id: 'tech-electronics', th: 'เทคโนโลยี / อิเล็กทรอนิกส์ / ซอฟต์แวร์', element: 'fire', note: 'พลังงานไฟฟ้าและนวัตกรรม' },
  { id: 'beauty', th: 'ความงาม / เครื่องสำอาง / คลินิกเสริมความงาม', element: 'fire', note: 'ความเปล่งประกาย' },

  // 土 ดิน — มั่นคง รองรับ จัดเก็บ
  { id: 'real-estate', th: 'อสังหาริมทรัพย์ / ที่ดิน / นายหน้า', element: 'earth', note: 'ดินโดยตรง' },
  { id: 'construction', th: 'ก่อสร้าง / วัสดุก่อสร้าง / รับเหมา', element: 'earth', note: 'ปูน หิน ดิน' },
  { id: 'ceramics-mining', th: 'เหมืองแร่ / เซรามิก / เครื่องปั้น', element: 'earth', note: 'ทรัพย์จากดิน' },
  { id: 'insurance', th: 'ประกันภัย / ประกันชีวิต', element: 'earth', note: 'ความมั่นคงคุ้มครอง' },
  { id: 'warehouse', th: 'คลังสินค้า / โกดัง / จัดเก็บ', element: 'earth', note: 'การรองรับจัดเก็บ' },
  { id: 'hr-admin', th: 'ทรัพยากรบุคคล / งานธุรการ / บริการจัดการ', element: 'earth', note: 'ศูนย์กลางค้ำจุนองค์กร' },

  // 金 ทอง — โลหะ ความเฉียบคม การเงิน
  { id: 'finance', th: 'การเงิน / ธนาคาร / หลักทรัพย์ / สินเชื่อ', element: 'metal', note: 'เงินทองโดยตรง' },
  { id: 'machinery', th: 'เครื่องจักร / โลหะ / วิศวกรรม', element: 'metal', note: 'โลหะโดยตรง' },
  { id: 'automotive', th: 'ยานยนต์ / อะไหล่ / ซ่อมบำรุง', element: 'metal', note: 'เหล็กและเครื่องยนต์' },
  { id: 'jewelry', th: 'อัญมณี / ทอง / เครื่องประดับ', element: 'metal', note: 'ทองคำโดยตรง' },
  { id: 'legal', th: 'กฎหมาย / บัญชี-ตรวจสอบ / กำกับดูแล', element: 'metal', note: 'ความเฉียบขาดของกฎ' },
  { id: 'medical-device', th: 'เครื่องมือแพทย์ / ฮาร์ดแวร์', element: 'metal', note: 'ความแม่นยำของโลหะ' },

  // 水 น้ำ — ไหลเวียน เชื่อมโยง ปัญญา
  { id: 'logistics', th: 'โลจิสติกส์ / ขนส่ง / เดลิเวอรี', element: 'water', note: 'การไหลเวียน' },
  { id: 'trading', th: 'การค้า / นำเข้า-ส่งออก / อีคอมเมิร์ซ', element: 'water', note: 'กระแสสินค้าและเงิน' },
  { id: 'tourism', th: 'ท่องเที่ยว / โรงแรม / สายการบิน', element: 'water', note: 'การเดินทางเคลื่อนไหว' },
  { id: 'beverage', th: 'เครื่องดื่ม / น้ำดื่ม / คาเฟ่', element: 'water', note: 'น้ำโดยตรง' },
  { id: 'media-comm', th: 'สื่อสารมวลชน / มีเดีย / ประชาสัมพันธ์', element: 'water', note: 'การไหลของข้อมูล' },
  { id: 'marine', th: 'ประมง / กิจการทางทะเล', element: 'water', note: 'น้ำโดยตรง' },
  { id: 'consulting', th: 'ที่ปรึกษา / วิจัย / วิเคราะห์ข้อมูล', element: 'water', note: 'ปัญญาที่ไหลลื่น' },
]

export function findIndustry(id: string): IndustryEntry | undefined {
  return INDUSTRIES.find((i) => i.id === id)
}

export function industriesByElement(element: ElementKey): IndustryEntry[] {
  return INDUSTRIES.filter((i) => i.element === element)
}
