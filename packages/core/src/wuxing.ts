/**
 * วิเคราะห์ห้าธาตุ (五行) และกำลังก้านวัน (日主強弱)
 *
 * วิธีที่ใช้: แบบจื่อผิงอย่างย่อ โปร่งใสตรวจสอบได้ —
 *   得令 (ถูกฤดู)   : สถานะธาตุก้านวันในเดือนเกิด (旺相休囚死) → 0–40 คะแนน
 *   得地 (มีราก)    : ก้านแฝงในกิ่งทั้งสี่ที่เป็นธาตุเดียวกัน/ธาตุแม่ → 0–30 คะแนน
 *   得勢 (มีพวก)    : ก้านฟ้าอื่นๆ ที่เป็นพวก (比劫/印) → 0–30 คะแนน
 * รวม 0–100: ≥60 แข็ง, 45–59 สมดุล, <45 อ่อน
 *
 * ธาตุอุปการะ (喜用神 อย่างย่อ):
 *   ก้านวันแข็ง → ชอบธาตุระบาย/ใช้กำลัง (食傷, 財, 官殺)
 *   ก้านวันอ่อน → ชอบธาตุหนุน (印, 比劫)
 *   สมดุล → เสริมธาตุที่พร่องที่สุดในดวง
 */

import {
  CONTROLLED_BY,
  CONTROLS,
  ELEMENTS,
  ELEMENT_KEYS,
  GENERATED_BY,
  GENERATES,
  MONTH_SEASON_ELEMENT,
  SEASONAL_STATE_TH,
  seasonalStateOf,
  TEN_GODS,
  tenGodOf,
} from './constants'
import type {
  BaziChart,
  DayMasterAnalysis,
  ElementDistribution,
  ElementKey,
  Pillar,
  StrengthCategory,
  TenGodInfo,
  WuXingAnalysis,
} from './types'

const SEASONAL_POINTS: Record<string, number> = {
  prosperous: 40,
  strong: 30,
  resting: 15,
  trapped: 8,
  dead: 0,
}

function allPillars(chart: BaziChart): Pillar[] {
  return [chart.pillars.year, chart.pillars.month, chart.pillars.day, chart.pillars.hour]
}

/** นับการกระจายธาตุ (ก้านฟ้า 1.0 ต่อตัว + ก้านแฝงตามน้ำหนัก) */
export function elementDistribution(chart: BaziChart): ElementDistribution {
  const counts: Record<ElementKey, number> = {
    wood: 0,
    fire: 0,
    earth: 0,
    metal: 0,
    water: 0,
  }
  for (const pillar of allPillars(chart)) {
    counts[pillar.stem.element] += 1
    for (const hidden of pillar.hiddenStems) {
      counts[hidden.stem.element] += hidden.weight
    }
  }
  const total = ELEMENT_KEYS.reduce((sum, k) => sum + counts[k], 0)
  const percentages = Object.fromEntries(
    ELEMENT_KEYS.map((k) => [k, Math.round((counts[k] / total) * 1000) / 10]),
  ) as Record<ElementKey, number>

  let strongest: ElementKey = 'wood'
  let weakest: ElementKey = 'wood'
  for (const k of ELEMENT_KEYS) {
    if (counts[k] > counts[strongest]) strongest = k
    if (counts[k] < counts[weakest]) weakest = k
  }
  const missing = ELEMENT_KEYS.filter((k) => counts[k] < 0.11)

  const rounded = Object.fromEntries(
    ELEMENT_KEYS.map((k) => [k, Math.round(counts[k] * 100) / 100]),
  ) as Record<ElementKey, number>

  return { counts: rounded, percentages, strongest, weakest, missing }
}

/** วิเคราะห์กำลังก้านวัน + ธาตุอุปการะ */
export function dayMasterAnalysis(chart: BaziChart): DayMasterAnalysis {
  const dm = chart.dayMaster
  const dmElement = dm.element
  const breakdown: { label: string; points: number; detail: string }[] = []

  // 1) 得令 — ฤดูเกิด
  const monthBranch = chart.pillars.month.branch
  const seasonElement = MONTH_SEASON_ELEMENT[monthBranch.cn] ?? monthBranch.element
  const state = seasonalStateOf(dmElement, seasonElement)
  const seasonPoints = SEASONAL_POINTS[state] ?? 0
  breakdown.push({
    label: 'ถูกฤดู (得令)',
    points: seasonPoints,
    detail: `เกิดเดือนกิ่ง ${monthBranch.cn} (ฤดูธาตุ${ELEMENTS[seasonElement].th}) — ธาตุ${ELEMENTS[dmElement].th}อยู่ในสถานะ${SEASONAL_STATE_TH[state]}`,
  })

  // 2) 得地 — รากในกิ่ง
  let rootPoints = 0
  const rootDetails: string[] = []
  for (const pillar of allPillars(chart)) {
    for (const hidden of pillar.hiddenStems) {
      if (hidden.stem.element === dmElement) {
        rootPoints += hidden.weight * 10
        rootDetails.push(`${hidden.stem.cn} ใน ${pillar.branch.cn}`)
      } else if (hidden.stem.element === GENERATED_BY[dmElement]) {
        rootPoints += hidden.weight * 5
      }
    }
  }
  rootPoints = Math.min(30, Math.round(rootPoints))
  breakdown.push({
    label: 'มีราก (得地)',
    points: rootPoints,
    detail: rootDetails.length
      ? `มีรากธาตุเดียวกันในกิ่ง: ${rootDetails.join(', ')}`
      : 'แทบไม่มีรากธาตุเดียวกันในกิ่งดิน',
  })

  // 3) 得勢 — พวกบนก้านฟ้า (ไม่นับก้านวันเอง)
  let supportPoints = 0
  const supporters: string[] = []
  for (const pillar of allPillars(chart)) {
    if (pillar.position === 'day') continue
    const el = pillar.stem.element
    if (el === dmElement) {
      supportPoints += 10
      supporters.push(`${pillar.stem.cn} (ธาตุเดียวกัน)`)
    } else if (el === GENERATED_BY[dmElement]) {
      supportPoints += 8
      supporters.push(`${pillar.stem.cn} (ธาตุแม่)`)
    }
  }
  supportPoints = Math.min(30, supportPoints)
  breakdown.push({
    label: 'มีพวก (得勢)',
    points: supportPoints,
    detail: supporters.length ? `ก้านฟ้าที่หนุน: ${supporters.join(', ')}` : 'ก้านฟ้าอื่นไม่หนุนก้านวัน',
  })

  const strengthScore = Math.min(100, seasonPoints + rootPoints + supportPoints)

  let category: StrengthCategory
  let categoryTh: string
  if (strengthScore >= 60) {
    category = 'strong'
    categoryTh = 'ก้านวันแข็ง (身強)'
  } else if (strengthScore >= 45) {
    category = 'balanced'
    categoryTh = 'ค่อนข้างสมดุล (中和)'
  } else {
    category = 'weak'
    categoryTh = 'ก้านวันอ่อน (身弱)'
  }

  const dist = elementDistribution(chart)
  let favorable: ElementKey[]
  let unfavorable: ElementKey[]
  let explanation: string

  if (category === 'strong') {
    favorable = [GENERATES[dmElement], CONTROLS[dmElement], CONTROLLED_BY[dmElement]]
    unfavorable = [GENERATED_BY[dmElement], dmElement]
    explanation =
      `ก้านวัน ${dm.cn} (ธาตุ${ELEMENTS[dmElement].th}) มีกำลังแข็ง — ` +
      `ธาตุอุปการะคือธาตุที่ช่วยระบายและใช้กำลัง ได้แก่ ${favorable
        .map((e) => ELEMENTS[e].th)
        .join(', ')} ส่วนธาตุ${ELEMENTS[GENERATED_BY[dmElement]].th}และธาตุ${ELEMENTS[dmElement].th}จะยิ่งเสริมให้ล้นเกิน`
  } else if (category === 'weak') {
    favorable = [GENERATED_BY[dmElement], dmElement]
    unfavorable = [CONTROLLED_BY[dmElement], GENERATES[dmElement], CONTROLS[dmElement]]
    explanation =
      `ก้านวัน ${dm.cn} (ธาตุ${ELEMENTS[dmElement].th}) กำลังอ่อน — ` +
      `ธาตุอุปการะคือธาตุที่เข้ามาหนุน ได้แก่ ${favorable
        .map((e) => ELEMENTS[e].th)
        .join(', ')} ควรเลี่ยงสภาพแวดล้อมที่ธาตุ${ELEMENTS[CONTROLLED_BY[dmElement]].th}แรงเกิน`
  } else {
    // สมดุล → เติมธาตุที่พร่องที่สุด
    const sorted = [...ELEMENT_KEYS].sort((a, b) => dist.counts[a] - dist.counts[b])
    favorable = sorted.slice(0, 2)
    unfavorable = [dist.strongest]
    explanation =
      `ก้านวัน ${dm.cn} (ธาตุ${ELEMENTS[dmElement].th}) ค่อนข้างสมดุล — ` +
      `เสริมธาตุที่พร่องคือ ${favorable.map((e) => ELEMENTS[e].th).join(', ')} เพื่อรักษาความกลมกลืนของดวง`
  }

  return {
    dayMaster: dm,
    seasonalState: state,
    strengthScore,
    category,
    categoryTh,
    favorableElements: favorable,
    unfavorableElements: unfavorable,
    explanation,
    scoreBreakdown: breakdown,
  }
}

/** สิบเทพเด่นในดวง (นับน้ำหนักจากก้านฟ้า 1.0 + ก้านแฝงตามน้ำหนัก) */
export function dominantTenGods(chart: BaziChart): { tenGod: TenGodInfo; weight: number }[] {
  const weights = new Map<string, number>()
  for (const pillar of allPillars(chart)) {
    if (pillar.tenGodStem) {
      weights.set(pillar.tenGodStem.key, (weights.get(pillar.tenGodStem.key) ?? 0) + 1)
    }
    for (const hidden of pillar.hiddenStems) {
      if (!hidden.tenGod) continue
      // ก้านแฝงของกิ่งวันคือส่วนหนึ่งของตัวตน ไม่นับ 比肩 ของก้านวันเอง
      weights.set(hidden.tenGod.key, (weights.get(hidden.tenGod.key) ?? 0) + hidden.weight)
    }
  }
  return [...weights.entries()]
    .map(([key, weight]) => ({
      tenGod: TEN_GODS[key as keyof typeof TEN_GODS],
      weight: Math.round(weight * 100) / 100,
    }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 4)
}

export function analyzeWuXing(chart: BaziChart): WuXingAnalysis {
  return {
    distribution: elementDistribution(chart),
    dayMaster: dayMasterAnalysis(chart),
    dominantTenGods: dominantTenGods(chart),
  }
}

// re-export เพื่อความสะดวกของผู้ใช้ภายนอก
export { tenGodOf }
