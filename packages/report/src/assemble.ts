/**
 * ประกอบข้อมูลรายงานจากเครื่องคำนวณ (@minghe/core)
 * — ส่วนนี้ deterministic 100%: engine คำนวณ / LLM มีหน้าที่เรียบเรียงทีหลังเท่านั้น
 */

import {
  analyzeWuXing,
  annualOutlook,
  comparePersons,
  compareTeam,
  compareWithCompanyDate,
  compareWithIndustry,
  computeBazi,
  computeBaziDateOnly,
  ELEMENTS,
  findIndustry,
  PILLAR_TH,
  type BaziChart,
  type BirthInput,
  type CompatibilityResult,
  type Pillar,
  type WuXingAnalysis,
} from '@minghe/core'
import type {
  ChartView,
  CompatibilityView,
  GenerateReportInput,
  PillarView,
  ReportData,
  SubjectInput,
  TeamPairView,
  WuXingView,
} from './types'
import { REPORT_DISCLAIMER } from './types'

export function parseDate(date: string): { year: number; month: number; day: number } {
  const [y, m, d] = date.split('-').map(Number)
  if (!y || !m || !d) throw new Error(`รูปแบบวันที่ไม่ถูกต้อง: "${date}" (ต้องเป็น YYYY-MM-DD)`)
  return { year: y, month: m, day: d }
}

export function parseTime(time: string): { hour: number; minute: number } {
  const [h, mi] = time.split(':').map(Number)
  if (h == null || Number.isNaN(h) || mi == null || Number.isNaN(mi)) {
    throw new Error(`รูปแบบเวลาไม่ถูกต้อง: "${time}" (ต้องเป็น HH:mm)`)
  }
  return { hour: h, minute: mi }
}

export function toBirthInput(subject: {
  birthDate: string
  birthTime: string
  province?: string
  longitude?: number
  lateZiRule?: 'same-day' | 'next-day'
  gender?: 'male' | 'female'
  name?: string
}): BirthInput {
  const { year, month, day } = parseDate(subject.birthDate)
  const { hour, minute } = parseTime(subject.birthTime)
  return {
    year,
    month,
    day,
    hour,
    minute,
    tzOffsetHours: 7,
    province: subject.province,
    longitude: subject.longitude,
    lateZiRule: subject.lateZiRule,
    gender: subject.gender,
    name: subject.name,
  }
}

function pillarView(pillar: Pillar): PillarView {
  const positionInfo = PILLAR_TH[pillar.position]
  return {
    position: pillar.position,
    positionTh: positionInfo?.th ?? pillar.position,
    positionMeaning: positionInfo?.meaning ?? '',
    ganzhi: pillar.ganzhi,
    stemCn: pillar.stem.cn,
    stemTh: pillar.stem.th,
    stemElement: pillar.stem.element,
    branchCn: pillar.branch.cn,
    branchTh: pillar.branch.th,
    branchElement: pillar.branch.element,
    animalTh: pillar.branch.animalTh,
    hiddenStems: pillar.hiddenStems.map((h) => ({
      cn: h.stem.cn,
      th: h.stem.th,
      element: h.stem.element,
      elementTh: ELEMENTS[h.stem.element].th,
      weight: h.weight,
      tenGodCn: h.tenGod?.cn ?? null,
      tenGodTh: h.tenGod?.th ?? null,
    })),
    tenGodCn: pillar.tenGodStem?.cn ?? null,
    tenGodTh: pillar.tenGodStem?.th ?? null,
  }
}

export function chartView(
  chart: BaziChart,
  meta: { name: string; birthDate: string; birthTime: string; province?: string },
): ChartView {
  return {
    name: meta.name,
    birthDate: meta.birthDate,
    birthTime: meta.birthTime,
    province: meta.province,
    pillars: [
      pillarView(chart.pillars.year),
      pillarView(chart.pillars.month),
      pillarView(chart.pillars.day),
      pillarView(chart.pillars.hour),
    ],
    dayMasterCn: chart.dayMaster.cn,
    dayMasterElement: chart.dayMaster.element,
    dayMasterElementTh: ELEMENTS[chart.dayMaster.element].th,
    zodiacTh: chart.zodiac.th,
    lunarDate: chart.lunarDate,
    trueSolarTime: chart.trueSolarTime,
  }
}

export function wuxingView(analysis: WuXingAnalysis): WuXingView {
  const dm = analysis.dayMaster
  return {
    counts: analysis.distribution.counts,
    percentages: analysis.distribution.percentages,
    strongest: analysis.distribution.strongest,
    weakest: analysis.distribution.weakest,
    missing: analysis.distribution.missing,
    strengthScore: dm.strengthScore,
    strengthCategory: dm.category,
    strengthCategoryTh: dm.categoryTh,
    strengthExplanation: dm.explanation,
    scoreBreakdown: dm.scoreBreakdown,
    favorableElements: dm.favorableElements,
    unfavorableElements: dm.unfavorableElements,
    dominantTenGods: analysis.dominantTenGods.map((t) => ({
      cn: t.tenGod.cn,
      th: t.tenGod.th,
      workMeaning: t.tenGod.workMeaning,
      weight: t.weight,
    })),
  }
}

function compatibilityView(result: CompatibilityResult): CompatibilityView {
  return {
    score: result.score,
    grade: result.grade,
    gradeTh: result.gradeTh,
    summary: result.summary,
    factors: result.factors,
    advice: result.advice,
    mode: result.mode,
  }
}

export interface AssembledReport {
  data: Omit<ReportData, 'narrative' | 'faceReading'>
  subjectChart: BaziChart
}

/** ประกอบส่วนคำนวณทั้งหมดของรายงาน (ยังไม่รวม narrative/โหงวเฮ้ง) */
export function assembleReport(input: GenerateReportInput): AssembledReport {
  const subject: SubjectInput = input.subject
  const subjectChart = computeBazi(toBirthInput(subject))
  const subjectWu = analyzeWuXing(subjectChart)
  const org = input.org

  let orgLabel: string
  let orgChartData: ChartView | undefined
  let industryData: ReportData['org']['industry']
  let compat: CompatibilityResult

  if (org.mode === 'executive') {
    orgLabel = org.executiveName ?? 'ผู้บริหาร'
    const execChart = computeBazi(
      toBirthInput({
        birthDate: org.birthDate,
        birthTime: org.birthTime,
        province: org.province,
        name: orgLabel,
      }),
    )
    orgChartData = chartView(execChart, {
      name: orgLabel,
      birthDate: org.birthDate,
      birthTime: org.birthTime,
      province: org.province,
    })
    compat = comparePersons(subjectChart, execChart, {
      nameA: subject.name,
      nameB: orgLabel,
    })
  } else if (org.mode === 'company-date') {
    orgLabel = org.companyName ?? 'บริษัท'
    const { year, month, day } = parseDate(org.foundingDate)
    const companyChart = computeBaziDateOnly(year, month, day)
    orgChartData = chartView(companyChart, {
      name: orgLabel,
      birthDate: org.foundingDate,
      birthTime: '(ไม่ระบุเวลา — ไม่ใช้เสาเวลา)',
    })
    compat = compareWithCompanyDate(subjectChart, year, month, day, {
      nameA: subject.name,
      companyName: orgLabel,
    })
  } else {
    const industry = findIndustry(org.industryId)
    if (!industry) throw new Error(`ไม่รู้จักอุตสาหกรรม: ${org.industryId}`)
    orgLabel = org.companyName ? `${org.companyName} (${industry.th})` : industry.th
    industryData = {
      id: industry.id,
      th: industry.th,
      element: industry.element,
      elementTh: ELEMENTS[industry.element].th,
    }
    compat = compareWithIndustry(subjectChart, industry.element, {
      nameA: subject.name,
      industryName: industry.th,
    })
  }

  // วิเคราะห์ทีม (ถ้ามี)
  let team: ReportData['team']
  const teamMembers = org.team ?? []
  if (teamMembers.length > 0) {
    const memberCharts = teamMembers.map((m) => ({
      name: m.name,
      chart: computeBazi(
        toBirthInput({
          birthDate: m.birthDate,
          birthTime: m.birthTime ?? '12:00',
          province: m.province,
          name: m.name,
        }),
      ),
    }))
    const { overall, pairwise } = compareTeam(subjectChart, memberCharts, {
      nameA: subject.name,
    })
    team = {
      overallScore: overall.score,
      overallGradeTh: overall.gradeTh,
      summary: overall.summary,
      pairwise: pairwise.map(
        (p): TeamPairView => ({
          name: p.name,
          score: p.result.score,
          gradeTh: p.result.gradeTh,
          topFactors: p.result.factors.slice(0, 3),
        }),
      ),
    }
  }

  const targetYear = input.targetYear ?? new Date().getFullYear()
  const annual = annualOutlook(subjectChart, targetYear)

  const data: Omit<ReportData, 'narrative' | 'faceReading'> = {
    version: 1,
    meta: {
      generatedAt: new Date().toISOString(),
      subjectName: subject.name,
      orgLabel,
      mode: org.mode,
      brand: '命合 Mìnghé',
    },
    subject: {
      chart: chartView(subjectChart, {
        name: subject.name,
        birthDate: subject.birthDate,
        birthTime: subject.birthTime,
        province: subject.province,
      }),
      wuxing: wuxingView(subjectWu),
    },
    org: {
      mode: org.mode,
      label: orgLabel,
      chart: orgChartData,
      industry: industryData,
    },
    compatibility: compatibilityView(compat),
    team,
    annual,
    disclaimer: REPORT_DISCLAIMER,
  }

  return { data, subjectChart }
}
