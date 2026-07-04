/**
 * โครงสร้างข้อมูลรายงานความเหมาะสม 命合 (Mìnghé Fit Report)
 * — JSON-serializable ทั้งหมด (เก็บลง Report.reportData ได้ตรงๆ)
 */

import type {
  AnnualOutlook,
  CompatibilityFactor,
  CompatibilityGrade,
  ElementKey,
  TrueSolarTimeDetail,
} from '@minghe/core'

export interface HiddenStemView {
  cn: string
  th: string
  element: ElementKey
  elementTh: string
  weight: number
  tenGodCn: string | null
  tenGodTh: string | null
}

export interface PillarView {
  position: 'year' | 'month' | 'day' | 'hour'
  positionTh: string
  positionMeaning: string
  ganzhi: string
  stemCn: string
  stemTh: string
  stemElement: ElementKey
  branchCn: string
  branchTh: string
  branchElement: ElementKey
  animalTh: string
  hiddenStems: HiddenStemView[]
  tenGodCn: string | null
  tenGodTh: string | null
}

export interface ChartView {
  name: string
  birthDate: string
  birthTime: string
  province?: string
  pillars: PillarView[]
  dayMasterCn: string
  dayMasterElement: ElementKey
  dayMasterElementTh: string
  zodiacTh: string
  lunarDate: string
  trueSolarTime: TrueSolarTimeDetail
}

export interface WuXingView {
  counts: Record<ElementKey, number>
  percentages: Record<ElementKey, number>
  strongest: ElementKey
  weakest: ElementKey
  missing: ElementKey[]
  strengthScore: number
  strengthCategory: 'strong' | 'balanced' | 'weak'
  strengthCategoryTh: string
  strengthExplanation: string
  scoreBreakdown: { label: string; points: number; detail: string }[]
  favorableElements: ElementKey[]
  unfavorableElements: ElementKey[]
  dominantTenGods: { cn: string; th: string; workMeaning: string; weight: number }[]
}

export interface CompatibilityView {
  score: number
  grade: CompatibilityGrade
  gradeTh: string
  summary: string
  factors: CompatibilityFactor[]
  advice: string[]
  mode: 'person' | 'company-date' | 'industry' | 'team'
}

export interface TeamPairView {
  name: string
  score: number
  gradeTh: string
  topFactors: CompatibilityFactor[]
}

export interface FaceReadingView {
  available: boolean
  notice?: string
  sections?: { title: string; content: string }[]
}

export interface NarrativeSection {
  id: string
  title: string
  paragraphs: string[]
}

export interface ReportData {
  version: 1
  meta: {
    generatedAt: string
    subjectName: string
    orgLabel: string
    mode: 'executive' | 'company-date' | 'industry'
    brand: '命合 Mìnghé'
  }
  subject: {
    chart: ChartView
    wuxing: WuXingView
  }
  org: {
    mode: 'executive' | 'company-date' | 'industry'
    label: string
    chart?: ChartView
    industry?: { id: string; th: string; element: ElementKey; elementTh: string }
  }
  compatibility: CompatibilityView
  team?: {
    overallScore: number
    overallGradeTh: string
    summary: string
    pairwise: TeamPairView[]
  }
  annual: AnnualOutlook
  faceReading: FaceReadingView
  narrative: {
    sections: NarrativeSection[]
    polishedByAI: boolean
  }
  disclaimer: string[]
}

/** ---- อินพุตของ generateReport ---- */

export interface SubjectInput {
  name: string
  gender?: 'male' | 'female'
  birthDate: string // 'YYYY-MM-DD'
  birthTime: string // 'HH:mm'
  province?: string
  longitude?: number
  lateZiRule?: 'same-day' | 'next-day'
}

export interface TeamMemberInput {
  name: string
  birthDate: string
  birthTime?: string
  province?: string
}

export type OrgInput =
  | {
      mode: 'executive'
      executiveName?: string
      birthDate: string
      birthTime: string
      province?: string
      team?: TeamMemberInput[]
    }
  | {
      mode: 'company-date'
      companyName?: string
      foundingDate: string
      team?: TeamMemberInput[]
    }
  | {
      mode: 'industry'
      industryId: string
      companyName?: string
      team?: TeamMemberInput[]
    }

export interface GenerateReportInput {
  subject: SubjectInput
  org: OrgInput
  /** รูปถ่ายหน้าตรง (ถ้ามี) สำหรับอ่านโหงวเฮ้ง */
  photo?: { base64: string; mediaType: 'image/jpeg' | 'image/png' | 'image/webp' }
  /** ปีเป้าหมายสำหรับวิเคราะห์จังหวะเวลา (default = ปีปัจจุบัน) */
  targetYear?: number
  options?: {
    /** เรียก Claude ช่วยเรียบเรียง/อ่านโหงวเฮ้ง (ต้องมี ANTHROPIC_API_KEY) */
    useAI?: boolean
  }
}

/** หมายเหตุท้ายรายงานทุกฉบับ (ตามแผนหัวข้อ 14 — PDPA/ความรับผิด) */
export const REPORT_DISCLAIMER: string[] = [
  'รายงานฉบับนี้เป็น "ข้อมูลประกอบการพิจารณาเชิงโหราศาสตร์จีน" จัดทำขึ้นเพื่อใช้เป็นข้อมูลเสริม ไม่ใช่เกณฑ์ตัดสินเพียงอย่างเดียว',
  'แนะนำให้พิจารณาร่วมกับทักษะ ประสบการณ์ ผลการสัมภาษณ์ และเครื่องมือประเมินอื่นตามหลักวิชาชีพ',
  'การใช้รูปลักษณ์หรือวันเดือนปีเกิดเป็นเกณฑ์เดียวในการตัดสินใจจ้างงาน อาจมีประเด็นด้านกฎหมายแรงงานและการเลือกปฏิบัติ โปรดใช้อย่างเหมาะสมและเป็นธรรม',
  'ข้อมูลส่วนบุคคลในรายงานได้รับการคุ้มครองตาม พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล (PDPA) — ผู้รับรายงานพึงเก็บรักษาเป็นความลับ',
]
