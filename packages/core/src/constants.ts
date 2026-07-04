/**
 * ตารางอ้างอิงหลักของศาสตร์ปาจือ (八字)
 * แหล่งอ้างอิง: ตำราจื่อผิง (子平) มาตรฐาน — ตารางเหล่านี้เป็นค่าคลาสสิกตายตัว
 * ห้ามแก้ไขโดยไม่เทียบตำรา และมีชุดเทสต์ยืนยันความครบถ้วน/สมมาตรใน tests/
 */

import type {
  BranchInfo,
  ElementKey,
  StemInfo,
  TenGodInfo,
  TenGodKey,
  SeasonalState,
} from './types'

/** ---- ธาตุทั้งห้า (五行) ---- */

export const ELEMENTS: Record<ElementKey, { cn: string; th: string; en: string }> = {
  wood: { cn: '木', th: 'ไม้', en: 'Wood' },
  fire: { cn: '火', th: 'ไฟ', en: 'Fire' },
  earth: { cn: '土', th: 'ดิน', en: 'Earth' },
  metal: { cn: '金', th: 'ทอง', en: 'Metal' },
  water: { cn: '水', th: 'น้ำ', en: 'Water' },
}

export const ELEMENT_KEYS: ElementKey[] = ['wood', 'fire', 'earth', 'metal', 'water']

/** วงจรก่อเกิด (相生): ไม้→ไฟ→ดิน→ทอง→น้ำ→ไม้ */
export const GENERATES: Record<ElementKey, ElementKey> = {
  wood: 'fire',
  fire: 'earth',
  earth: 'metal',
  metal: 'water',
  water: 'wood',
}

/** วงจรพิฆาต (相剋): ไม้⊣ดิน, ดิน⊣น้ำ, น้ำ⊣ไฟ, ไฟ⊣ทอง, ทอง⊣ไม้ */
export const CONTROLS: Record<ElementKey, ElementKey> = {
  wood: 'earth',
  earth: 'water',
  water: 'fire',
  fire: 'metal',
  metal: 'wood',
}

/** ธาตุที่ก่อเกิดธาตุนี้ (แม่) */
export const GENERATED_BY: Record<ElementKey, ElementKey> = {
  fire: 'wood',
  earth: 'fire',
  metal: 'earth',
  water: 'metal',
  wood: 'water',
}

/** ธาตุที่พิฆาตธาตุนี้ */
export const CONTROLLED_BY: Record<ElementKey, ElementKey> = {
  earth: 'wood',
  water: 'earth',
  fire: 'water',
  metal: 'fire',
  wood: 'metal',
}

/** ---- สิบก้านฟ้า (天干) ---- */

export const STEMS: StemInfo[] = [
  { index: 0, cn: '甲', th: 'เจี่ย', element: 'wood', yinYang: 'yang' },
  { index: 1, cn: '乙', th: 'อี่', element: 'wood', yinYang: 'yin' },
  { index: 2, cn: '丙', th: 'ปิ่ง', element: 'fire', yinYang: 'yang' },
  { index: 3, cn: '丁', th: 'ติง', element: 'fire', yinYang: 'yin' },
  { index: 4, cn: '戊', th: 'อู้', element: 'earth', yinYang: 'yang' },
  { index: 5, cn: '己', th: 'จี่', element: 'earth', yinYang: 'yin' },
  { index: 6, cn: '庚', th: 'เกิง', element: 'metal', yinYang: 'yang' },
  { index: 7, cn: '辛', th: 'ซิน', element: 'metal', yinYang: 'yin' },
  { index: 8, cn: '壬', th: 'เหริน', element: 'water', yinYang: 'yang' },
  { index: 9, cn: '癸', th: 'กุ่ย', element: 'water', yinYang: 'yin' },
]

export const STEM_BY_CN: Record<string, StemInfo> = Object.fromEntries(
  STEMS.map((s) => [s.cn, s]),
)

/** ---- สิบสองกิ่งดิน (地支) พร้อมก้านแฝง (藏干) ---- */
// ลำดับก้านแฝง: ธาตุหลัก (本氣) ก่อนเสมอ ตามด้วยกลาง (中氣) และปลาย (餘氣)
// น้ำหนัก: หลัก 0.6 / กลาง 0.3 / ปลาย 0.1 — ถ้ามี 2 ตัว: 0.7/0.3 — ถ้าตัวเดียว: 1.0

export const BRANCHES: BranchInfo[] = [
  {
    index: 0, cn: '子', th: 'จื่อ', element: 'water', yinYang: 'yang',
    animalCn: '鼠', animalTh: 'หนู',
    hidden: [{ stemIndex: 9, weight: 1.0 }], // 癸
  },
  {
    index: 1, cn: '丑', th: 'โฉ่ว', element: 'earth', yinYang: 'yin',
    animalCn: '牛', animalTh: 'วัว',
    hidden: [
      { stemIndex: 5, weight: 0.6 }, // 己
      { stemIndex: 9, weight: 0.3 }, // 癸
      { stemIndex: 7, weight: 0.1 }, // 辛
    ],
  },
  {
    index: 2, cn: '寅', th: 'อิ๋น', element: 'wood', yinYang: 'yang',
    animalCn: '虎', animalTh: 'เสือ',
    hidden: [
      { stemIndex: 0, weight: 0.6 }, // 甲
      { stemIndex: 2, weight: 0.3 }, // 丙
      { stemIndex: 4, weight: 0.1 }, // 戊
    ],
  },
  {
    index: 3, cn: '卯', th: 'เหม่า', element: 'wood', yinYang: 'yin',
    animalCn: '兔', animalTh: 'กระต่าย',
    hidden: [{ stemIndex: 1, weight: 1.0 }], // 乙
  },
  {
    index: 4, cn: '辰', th: 'เฉิน', element: 'earth', yinYang: 'yang',
    animalCn: '龍', animalTh: 'มังกร',
    hidden: [
      { stemIndex: 4, weight: 0.6 }, // 戊
      { stemIndex: 1, weight: 0.3 }, // 乙
      { stemIndex: 9, weight: 0.1 }, // 癸
    ],
  },
  {
    index: 5, cn: '巳', th: 'ซื่อ', element: 'fire', yinYang: 'yin',
    animalCn: '蛇', animalTh: 'งู',
    hidden: [
      { stemIndex: 2, weight: 0.6 }, // 丙
      { stemIndex: 6, weight: 0.3 }, // 庚
      { stemIndex: 4, weight: 0.1 }, // 戊
    ],
  },
  {
    index: 6, cn: '午', th: 'อู่', element: 'fire', yinYang: 'yang',
    animalCn: '馬', animalTh: 'ม้า',
    hidden: [
      { stemIndex: 3, weight: 0.7 }, // 丁
      { stemIndex: 5, weight: 0.3 }, // 己
    ],
  },
  {
    index: 7, cn: '未', th: 'เว่ย', element: 'earth', yinYang: 'yin',
    animalCn: '羊', animalTh: 'แพะ',
    hidden: [
      { stemIndex: 5, weight: 0.6 }, // 己
      { stemIndex: 3, weight: 0.3 }, // 丁
      { stemIndex: 1, weight: 0.1 }, // 乙
    ],
  },
  {
    index: 8, cn: '申', th: 'เซิน', element: 'metal', yinYang: 'yang',
    animalCn: '猴', animalTh: 'ลิง',
    hidden: [
      { stemIndex: 6, weight: 0.6 }, // 庚
      { stemIndex: 8, weight: 0.3 }, // 壬
      { stemIndex: 4, weight: 0.1 }, // 戊
    ],
  },
  {
    index: 9, cn: '酉', th: 'โหย่ว', element: 'metal', yinYang: 'yin',
    animalCn: '雞', animalTh: 'ไก่',
    hidden: [{ stemIndex: 7, weight: 1.0 }], // 辛
  },
  {
    index: 10, cn: '戌', th: 'ซวี', element: 'earth', yinYang: 'yang',
    animalCn: '狗', animalTh: 'สุนัข',
    hidden: [
      { stemIndex: 4, weight: 0.6 }, // 戊
      { stemIndex: 7, weight: 0.3 }, // 辛
      { stemIndex: 3, weight: 0.1 }, // 丁
    ],
  },
  {
    index: 11, cn: '亥', th: 'ไห้', element: 'water', yinYang: 'yin',
    animalCn: '豬', animalTh: 'หมู',
    hidden: [
      { stemIndex: 8, weight: 0.7 }, // 壬
      { stemIndex: 0, weight: 0.3 }, // 甲
    ],
  },
]

export const BRANCH_BY_CN: Record<string, BranchInfo> = Object.fromEntries(
  BRANCHES.map((b) => [b.cn, b]),
)

/** ---- ก้านฟ้าเข้าคู่ (天干五合) ---- */
// 甲己→ดิน 乙庚→ทอง 丙辛→น้ำ 丁壬→ไม้ 戊癸→ไฟ
export const STEM_COMBINATIONS: { pair: [string, string]; element: ElementKey }[] = [
  { pair: ['甲', '己'], element: 'earth' },
  { pair: ['乙', '庚'], element: 'metal' },
  { pair: ['丙', '辛'], element: 'water' },
  { pair: ['丁', '壬'], element: 'wood' },
  { pair: ['戊', '癸'], element: 'fire' },
]

/** ---- ก้านฟ้าชง (天干相沖 / 四沖) ---- */
export const STEM_CLASHES: [string, string][] = [
  ['甲', '庚'],
  ['乙', '辛'],
  ['丙', '壬'],
  ['丁', '癸'],
]

/** ---- กิ่งดินเข้าคู่ (地支六合) ---- */
// 子丑→ดิน 寅亥→ไม้ 卯戌→ไฟ 辰酉→ทอง 巳申→น้ำ 午未→ดิน(日月合)
export const BRANCH_SIX_HARMONIES: { pair: [string, string]; element: ElementKey }[] = [
  { pair: ['子', '丑'], element: 'earth' },
  { pair: ['寅', '亥'], element: 'wood' },
  { pair: ['卯', '戌'], element: 'fire' },
  { pair: ['辰', '酉'], element: 'metal' },
  { pair: ['巳', '申'], element: 'water' },
  { pair: ['午', '未'], element: 'earth' },
]

/** ---- สามประสาน (三合局) ---- */
// ตัวกลาง (中神) คือธาตุประจำชุด: 子=น้ำ 卯=ไม้ 午=ไฟ 酉=ทอง
export const BRANCH_TRINES: { trio: [string, string, string]; element: ElementKey }[] = [
  { trio: ['申', '子', '辰'], element: 'water' },
  { trio: ['亥', '卯', '未'], element: 'wood' },
  { trio: ['寅', '午', '戌'], element: 'fire' },
  { trio: ['巳', '酉', '丑'], element: 'metal' },
]

/** ครึ่งประสาน (半三合) — คู่ที่มีตัวกลาง (中神) อยู่ด้วยเท่านั้น */
export const BRANCH_SEMI_TRINES: { pair: [string, string]; element: ElementKey }[] =
  BRANCH_TRINES.flatMap(({ trio, element }) => {
    const [start, middle, end] = trio
    return [
      { pair: [start, middle] as [string, string], element },
      { pair: [middle, end] as [string, string], element },
    ]
  })

/** ---- สามชุมนุมทิศ (三會局) ---- */
export const BRANCH_DIRECTIONALS: { trio: [string, string, string]; element: ElementKey; directionTh: string }[] = [
  { trio: ['寅', '卯', '辰'], element: 'wood', directionTh: 'ทิศตะวันออก' },
  { trio: ['巳', '午', '未'], element: 'fire', directionTh: 'ทิศใต้' },
  { trio: ['申', '酉', '戌'], element: 'metal', directionTh: 'ทิศตะวันตก' },
  { trio: ['亥', '子', '丑'], element: 'water', directionTh: 'ทิศเหนือ' },
]

/** ---- หกชง (六沖) ---- */
export const BRANCH_CLASHES: [string, string][] = [
  ['子', '午'],
  ['丑', '未'],
  ['寅', '申'],
  ['卯', '酉'],
  ['辰', '戌'],
  ['巳', '亥'],
]

/** ---- หกภัย (六害) ---- */
export const BRANCH_HARMS: [string, string][] = [
  ['子', '未'],
  ['丑', '午'],
  ['寅', '巳'],
  ['卯', '辰'],
  ['申', '亥'],
  ['酉', '戌'],
]

/** ---- สามโทษ (三刑) ---- */
// 寅巳申 = โทษอาศัยอำนาจ (恃勢之刑), 丑戌未 = โทษเนรคุณ (無恩之刑), 子卯 = โทษไร้มารยาท (無禮之刑)
export const BRANCH_PUNISHMENT_GROUPS: { members: string[]; nameTh: string; nameCn: string }[] = [
  { members: ['寅', '巳', '申'], nameTh: 'โทษอาศัยอำนาจ', nameCn: '恃勢之刑' },
  { members: ['丑', '戌', '未'], nameTh: 'โทษเนรคุณ', nameCn: '無恩之刑' },
  { members: ['子', '卯'], nameTh: 'โทษไร้มารยาท', nameCn: '無禮之刑' },
]

/** โทษตัวเอง (自刑): 辰辰 午午 酉酉 亥亥 */
export const SELF_PUNISHMENT_BRANCHES: string[] = ['辰', '午', '酉', '亥']

/** ---- หกทำลาย (六破) — น้ำหนักเบา ใช้ประกอบ ---- */
export const BRANCH_DESTRUCTIONS: [string, string][] = [
  ['子', '酉'],
  ['卯', '午'],
  ['辰', '丑'],
  ['未', '戌'],
  ['寅', '亥'],
  ['巳', '申'],
]

/** ---- สิบเทพ (十神) ---- */

export const TEN_GODS: Record<TenGodKey, TenGodInfo> = {
  BI_JIAN: {
    key: 'BI_JIAN', cn: '比肩', th: 'ปี่เจียน (มิตรร่วมธาตุ)',
    workMeaning: 'เพื่อนร่วมงานระดับเดียวกัน ความเป็นตัวของตัวเอง การยืนหยัด',
  },
  JIE_CAI: {
    key: 'JIE_CAI', cn: '劫財', th: 'เจี๋ยไฉ (มิตรชิงทรัพย์)',
    workMeaning: 'การแข่งขัน ความกล้าเสี่ยง ต้องระวังเรื่องผลประโยชน์ร่วม',
  },
  SHI_SHEN: {
    key: 'SHI_SHEN', cn: '食神', th: 'สือเสิน (เทพโภชนา)',
    workMeaning: 'ความคิดสร้างสรรค์เชิงบวก การผลิตผลงาน ความประณีต',
  },
  SHANG_GUAN: {
    key: 'SHANG_GUAN', cn: '傷官', th: 'ซางกวน (ขุนนางบาดเจ็บ)',
    workMeaning: 'หัวคิดนอกกรอบ กล้าท้าทายกฎ เก่งแต่ต้องการอิสระ',
  },
  PIAN_CAI: {
    key: 'PIAN_CAI', cn: '偏財', th: 'เพียนไฉ (ทรัพย์ลอย)',
    workMeaning: 'ไหวพริบการเงิน โอกาสเฉพาะหน้า การเจรจาธุรกิจ',
  },
  ZHENG_CAI: {
    key: 'ZHENG_CAI', cn: '正財', th: 'เจิ้งไฉ (ทรัพย์แท้)',
    workMeaning: 'ความขยันสะสม ความละเอียดเรื่องเงิน ความรับผิดชอบต่อทรัพย์สิน',
  },
  QI_SHA: {
    key: 'QI_SHA', cn: '七殺', th: 'ชีซา (อำนาจกล้า)',
    workMeaning: 'ความเด็ดขาด กล้าตัดสินใจ เหมาะงานกดดันสูง แต่ต้องมีวินัยกำกับ',
  },
  ZHENG_GUAN: {
    key: 'ZHENG_GUAN', cn: '正官', th: 'เจิ้งกวน (ขุนนางแท้)',
    workMeaning: 'วินัย ความถูกต้อง เคารพระบบ เหมาะกับสายบริหาร/กำกับดูแล',
  },
  PIAN_YIN: {
    key: 'PIAN_YIN', cn: '偏印', th: 'เพียนอิ้น (ตราเบี่ยง)',
    workMeaning: 'ปัญญานอกตำรา ชอบศาสตร์เฉพาะทาง คิดลึกแต่เก็บตัว',
  },
  ZHENG_YIN: {
    key: 'ZHENG_YIN', cn: '正印', th: 'เจิ้งอิ้น (ตราแท้)',
    workMeaning: 'การเรียนรู้ ความเมตตา ผู้อุปถัมภ์ เหมาะงานวิชาการ/พี่เลี้ยง',
  },
}

/**
 * คำนวณสิบเทพของก้าน `other` เทียบก้านวัน `dayMaster`
 * กติกา: ธาตุเดียวกัน→比劫 / 日主ก่อเกิด→食傷 / 日主พิฆาต→財 / พิฆาต日主→官殺 / ก่อเกิด日主→印
 * ขั้วเดียวกัน→ตัวคี่ (比肩/食神/偏財/七殺/偏印), ต่างขั้ว→ตัวคู่
 */
export function tenGodOf(dayMaster: StemInfo, other: StemInfo): TenGodInfo {
  const samePolarity = dayMaster.yinYang === other.yinYang
  if (other.element === dayMaster.element) {
    return samePolarity ? TEN_GODS.BI_JIAN : TEN_GODS.JIE_CAI
  }
  if (GENERATES[dayMaster.element] === other.element) {
    return samePolarity ? TEN_GODS.SHI_SHEN : TEN_GODS.SHANG_GUAN
  }
  if (CONTROLS[dayMaster.element] === other.element) {
    return samePolarity ? TEN_GODS.PIAN_CAI : TEN_GODS.ZHENG_CAI
  }
  if (CONTROLS[other.element] === dayMaster.element) {
    return samePolarity ? TEN_GODS.QI_SHA : TEN_GODS.ZHENG_GUAN
  }
  // other ก่อเกิด day master
  return samePolarity ? TEN_GODS.PIAN_YIN : TEN_GODS.ZHENG_YIN
}

/** ---- กำลังธาตุตามฤดู (旺相休囚死) จากกิ่งเดือน ---- */

/** ธาตุประจำฤดูของกิ่งเดือน (เดือนดิน 辰戌丑未 = ดิน) */
export const MONTH_SEASON_ELEMENT: Record<string, ElementKey> = {
  寅: 'wood', 卯: 'wood',
  巳: 'fire', 午: 'fire',
  申: 'metal', 酉: 'metal',
  亥: 'water', 子: 'water',
  辰: 'earth', 戌: 'earth', 丑: 'earth', 未: 'earth',
}

/**
 * สถานะของธาตุ `element` ในเดือนที่มีธาตุฤดู `seasonElement`
 * 旺=ธาตุเดียวกับฤดู, 相=ฤดูก่อเกิด, 休=ก่อเกิดฤดู(พักผ่อน), 囚=พิฆาตฤดู(ถูกขัง), 死=ถูกฤดูพิฆาต
 */
export function seasonalStateOf(element: ElementKey, seasonElement: ElementKey): SeasonalState {
  if (element === seasonElement) return 'prosperous'
  if (GENERATES[seasonElement] === element) return 'strong'
  if (GENERATES[element] === seasonElement) return 'resting'
  if (CONTROLS[element] === seasonElement) return 'trapped'
  return 'dead'
}

export const SEASONAL_STATE_TH: Record<SeasonalState, string> = {
  prosperous: 'รุ่งเรือง (旺)',
  strong: 'แข็งแรง (相)',
  resting: 'พักตัว (休)',
  trapped: 'ถูกจำกัด (囚)',
  dead: 'อ่อนกำลัง (死)',
}

/** ---- ป้ายเสาภาษาไทย ---- */
export const PILLAR_TH: Record<string, { th: string; meaning: string }> = {
  year: { th: 'เสาปี', meaning: 'รากฐาน บรรพบุรุษ ภาพลักษณ์ต่อสังคม' },
  month: { th: 'เสาเดือน', meaning: 'การงาน อาชีพ ความสัมพันธ์กับผู้บังคับบัญชา' },
  day: { th: 'เสาวัน', meaning: 'ตัวตน อุปนิสัยแท้ คู่ชีวิต' },
  hour: { th: 'เสาเวลา', meaning: 'ความคิดลึกๆ อนาคต ทีมงานใต้บังคับบัญชา' },
}
