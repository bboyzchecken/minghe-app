/**
 * ชนิดข้อมูลกลางของเครื่องคำนวณ 命合 Mìnghé
 * (pure TypeScript — ไม่ผูกกับ framework ใด)
 */

export type ElementKey = 'wood' | 'fire' | 'earth' | 'metal' | 'water'
export type YinYang = 'yang' | 'yin'
export type PillarPosition = 'year' | 'month' | 'day' | 'hour'

export interface StemInfo {
  /** 0–9 (甲=0) */
  index: number
  cn: string
  th: string
  element: ElementKey
  yinYang: YinYang
}

export interface HiddenStemEntry {
  stemIndex: number
  /** น้ำหนักพลัง: ธาตุหลัก (本氣) 0.6–1.0, กลาง (中氣) 0.3, ปลาย (餘氣) 0.1 */
  weight: number
}

export interface BranchInfo {
  /** 0–11 (子=0) */
  index: number
  cn: string
  th: string
  element: ElementKey
  yinYang: YinYang
  animalCn: string
  animalTh: string
  hidden: HiddenStemEntry[]
}

/** สิบเทพ (十神) — ความสัมพันธ์ของก้านใดๆ ต่อก้านวัน (日主) */
export type TenGodKey =
  | 'BI_JIAN' // 比肩
  | 'JIE_CAI' // 劫財
  | 'SHI_SHEN' // 食神
  | 'SHANG_GUAN' // 傷官
  | 'PIAN_CAI' // 偏財
  | 'ZHENG_CAI' // 正財
  | 'QI_SHA' // 七殺
  | 'ZHENG_GUAN' // 正官
  | 'PIAN_YIN' // 偏印
  | 'ZHENG_YIN' // 正印

export interface TenGodInfo {
  key: TenGodKey
  cn: string
  th: string
  /** ความหมายเชิงการทำงาน/องค์กร */
  workMeaning: string
}

export interface PillarHiddenStem {
  stem: StemInfo
  weight: number
  tenGod: TenGodInfo | null
}

export interface Pillar {
  position: PillarPosition
  ganzhi: string
  stem: StemInfo
  branch: BranchInfo
  hiddenStems: PillarHiddenStem[]
  /** สิบเทพของก้านเสานี้เทียบก้านวัน (เสาวันเป็น null = ตัวตน) */
  tenGodStem: TenGodInfo | null
}

export interface TrueSolarTimeDetail {
  /** เวลานาฬิกาที่กรอกมา */
  clockTime: string
  /** เวลาสุริยะจริงหลังปรับ */
  solarTime: string
  /** นาทีชดเชยจากลองจิจูด (ลบ = ช้ากว่านาฬิกา) */
  longitudeCorrectionMinutes: number
  /** สมการเวลา (Equation of Time) นาที */
  equationOfTimeMinutes: number
  /** รวมการปรับทั้งหมด (นาที) */
  totalCorrectionMinutes: number
  longitude: number
  applied: boolean
}

export interface BirthInput {
  /** ค.ศ. */
  year: number
  month: number
  day: number
  /** เวลาเกิดตามนาฬิกา (บังคับ — หัวใจของความแม่น) */
  hour: number
  minute: number
  /** โซนเวลา ชม. (ไทย = 7) */
  tzOffsetHours?: number
  /** ลองจิจูดสถานที่เกิด (องศาตะวันออก) */
  longitude?: number
  /** ชื่อจังหวัดไทย — ใช้หาลองจิจูดอัตโนมัติ */
  province?: string
  /** ปรับเวลาสุริยะจริง (真太陽時) — ค่าเริ่มต้น true เมื่อรู้พิกัด */
  useTrueSolarTime?: boolean
  /**
   * กติกา 晚子時 (23:00–23:59):
   * 'same-day'  = เสาวันคงเป็นวันเดิม (流派 2 — ค่าเริ่มต้น)
   * 'next-day'  = เสาวันนับเป็นวันถัดไป (流派 1)
   */
  lateZiRule?: 'same-day' | 'next-day'
  gender?: 'male' | 'female'
  name?: string
}

export interface BaziChart {
  input: BirthInput
  trueSolarTime: TrueSolarTimeDetail
  pillars: {
    year: Pillar
    month: Pillar
    day: Pillar
    hour: Pillar
  }
  /** ก้านวัน = ตัวตน (日主) */
  dayMaster: StemInfo
  /** นักษัตรปีเกิด (ตามลี่ชุน) */
  zodiac: { cn: string; th: string }
  /** วันเดือนปีจันทรคติจีน (เพื่อแสดงผล) */
  lunarDate: string
}

/** ระดับกำลังของธาตุตามฤดู (旺相休囚死) */
export type SeasonalState = 'prosperous' | 'strong' | 'resting' | 'trapped' | 'dead'

export interface ElementDistribution {
  counts: Record<ElementKey, number>
  percentages: Record<ElementKey, number>
  strongest: ElementKey
  weakest: ElementKey
  missing: ElementKey[]
}

export type StrengthCategory = 'strong' | 'balanced' | 'weak'

export interface DayMasterAnalysis {
  dayMaster: StemInfo
  seasonalState: SeasonalState
  /** คะแนนกำลัง 0–100 */
  strengthScore: number
  category: StrengthCategory
  categoryTh: string
  /** ธาตุอุปการะ (เรียงตามลำดับความสำคัญ) */
  favorableElements: ElementKey[]
  /** ธาตุโทษ */
  unfavorableElements: ElementKey[]
  explanation: string
  scoreBreakdown: { label: string; points: number; detail: string }[]
}

export interface WuXingAnalysis {
  distribution: ElementDistribution
  dayMaster: DayMasterAnalysis
  /** สิบเทพเด่นในดวง (นับถ่วงน้ำหนัก) */
  dominantTenGods: { tenGod: TenGodInfo; weight: number }[]
}

/** ---- ความเข้ากัน (สมพงษ์) ---- */

export type RelationCode =
  | 'STEM_COMBINE' // 天干五合
  | 'STEM_CLASH' // 天干相沖
  | 'STEM_GENERATE' // 相生 (ก้าน)
  | 'STEM_CONTROL' // 相剋 (ก้าน)
  | 'BRANCH_SIX_HARMONY' // 六合
  | 'BRANCH_SEMI_TRINE' // 半三合
  | 'BRANCH_TRINE' // 三合 (ครบสามตัวเมื่อรวมสองดวง)
  | 'BRANCH_DIRECTIONAL' // 三會 (ครบสามตัวเมื่อรวมสองดวง)
  | 'BRANCH_CLASH' // 六沖
  | 'BRANCH_HARM' // 六害
  | 'BRANCH_PUNISHMENT' // 三刑
  | 'BRANCH_SELF_PUNISHMENT' // 自刑
  | 'BRANCH_DESTRUCTION' // 六破
  | 'ELEMENT_SUPPORT' // ธาตุเกื้อหนุนกัน
  | 'DAY_MASTER_RELATION' // ความสัมพันธ์ก้านวันต่อก้านวัน

export interface CompatibilityFactor {
  code: RelationCode
  /** ตำแหน่งเสาที่เกี่ยวข้อง เช่น 'day×day' */
  positions: string
  /** ตัวอักษรที่เกิดความสัมพันธ์ เช่น '子+丑' */
  pair: string
  points: number
  isPositive: boolean
  titleTh: string
  explanation: string
}

export type CompatibilityGrade = 'excellent' | 'good' | 'fair' | 'caution' | 'challenging'

export interface CompatibilityResult {
  /** ดัชนีสมพงษ์ (合 Index) 0–100 */
  score: number
  grade: CompatibilityGrade
  gradeTh: string
  summary: string
  factors: CompatibilityFactor[]
  advice: string[]
  mode: 'person' | 'company-date' | 'industry' | 'team'
}

export interface IndustryEntry {
  id: string
  th: string
  element: ElementKey
  note: string
}

export interface AnnualOutlook {
  year: number
  ganzhi: string
  animalTh: string
  factors: CompatibilityFactor[]
  summary: string
}
