/**
 * เครื่องวิเคราะห์ความเข้ากัน (สมพงษ์) — ดัชนีสมพงษ์ (合 Index)
 *
 * หลักการ: คะแนนฐาน 50 แล้วบวก/ลบตามความสัมพันธ์คลาสสิก
 * ระหว่าง "เสา" ของสองดวง โดยถ่วงน้ำหนักตามความสำคัญของตำแหน่ง:
 *   เสาวัน (ตัวตน) > เสาเดือน (การงาน) > เสาปี (องค์กร/รากฐาน) > เสาเวลา (ทีมงาน)
 *
 * ทุกแต้มต้องอธิบายได้ — แต่ละปัจจัยแนบคำอธิบายภาษาไทยเสมอ
 * (engine คำนวณ / LLM มีหน้าที่เรียบเรียงเท่านั้น ห้ามให้ LLM คิดเลขเอง)
 */

import {
  BRANCH_CLASHES,
  BRANCH_DESTRUCTIONS,
  BRANCH_DIRECTIONALS,
  BRANCH_HARMS,
  BRANCH_PUNISHMENT_GROUPS,
  BRANCH_SEMI_TRINES,
  BRANCH_SIX_HARMONIES,
  BRANCH_TRINES,
  CONTROLS,
  ELEMENTS,
  GENERATES,
  PILLAR_TH,
  SELF_PUNISHMENT_BRANCHES,
  STEM_CLASHES,
  STEM_COMBINATIONS,
} from './constants'
import { computeBaziDateOnly, yearGanzhiOf } from './bazi'
import { analyzeWuXing } from './wuxing'
import type {
  AnnualOutlook,
  BaziChart,
  CompatibilityFactor,
  CompatibilityGrade,
  CompatibilityResult,
  ElementKey,
  Pillar,
  PillarPosition,
  WuXingAnalysis,
} from './types'
import { BRANCH_BY_CN, STEM_BY_CN } from './constants'

/** คู่ตำแหน่งที่นำมาเทียบ พร้อมน้ำหนัก (เหตุผลเชิงศาสตร์กำกับ) */
const PAIR_WEIGHTS: { a: PillarPosition; b: PillarPosition; weight: number }[] = [
  { a: 'day', b: 'day', weight: 3.0 }, // ตัวตน × ตัวตน — สำคัญสุด
  { a: 'day', b: 'month', weight: 2.0 }, // ตัวตนเรา × วังการงานเขา
  { a: 'month', b: 'day', weight: 2.0 },
  { a: 'day', b: 'year', weight: 1.5 }, // ตัวตน × รากฐานองค์กร
  { a: 'year', b: 'day', weight: 1.5 },
  { a: 'month', b: 'month', weight: 1.5 }, // การงาน × การงาน
  { a: 'year', b: 'year', weight: 1.0 },
  { a: 'day', b: 'hour', weight: 1.2 }, // ตัวตน × วังทีมงานเขา
  { a: 'hour', b: 'day', weight: 1.2 },
]

const BASE_POINTS = {
  STEM_COMBINE: 6,
  STEM_CLASH: -4,
  BRANCH_SIX_HARMONY: 6,
  BRANCH_SEMI_TRINE: 5,
  BRANCH_CLASH: -7,
  BRANCH_HARM: -4,
  BRANCH_PUNISHMENT: -5,
  BRANCH_SELF_PUNISHMENT: -3,
  BRANCH_DESTRUCTION: -2,
  BRANCH_TRINE_COMPLETE: 10,
  BRANCH_DIRECTIONAL_COMPLETE: 8,
} as const

function posTh(p: PillarPosition): string {
  return PILLAR_TH[p]?.th ?? p
}

function pairMatch(pairs: readonly [string, string][], x: string, y: string): boolean {
  return pairs.some(([a, b]) => (a === x && b === y) || (a === y && b === x))
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

/** ความสัมพันธ์ก้านฟ้าระหว่างสองเสา */
function stemFactors(
  pillarA: Pillar,
  pillarB: Pillar,
  weight: number,
  nameA: string,
  nameB: string,
): CompatibilityFactor[] {
  const factors: CompatibilityFactor[] = []
  const sa = pillarA.stem
  const sb = pillarB.stem
  const positions = `${pillarA.position}×${pillarB.position}`

  const combo = STEM_COMBINATIONS.find(
    ({ pair }) => (pair[0] === sa.cn && pair[1] === sb.cn) || (pair[0] === sb.cn && pair[1] === sa.cn),
  )
  if (combo) {
    factors.push({
      code: 'STEM_COMBINE',
      positions,
      pair: `${sa.cn}+${sb.cn}`,
      points: round1(BASE_POINTS.STEM_COMBINE * weight),
      isPositive: true,
      titleTh: `ก้านฟ้าเข้าคู่ (天干五合) รวมเป็นธาตุ${ELEMENTS[combo.element].th}`,
      explanation: `ก้าน ${sa.cn} (${posTh(pillarA.position)}ของ${nameA}) เข้าคู่กับ ${sb.cn} (${posTh(pillarB.position)}ของ${nameB}) — พลังประสานกลมกลืน ดึงดูดและทำงานเสริมกันโดยธรรมชาติ`,
    })
  } else if (pairMatch(STEM_CLASHES, sa.cn, sb.cn)) {
    factors.push({
      code: 'STEM_CLASH',
      positions,
      pair: `${sa.cn}⚡${sb.cn}`,
      points: round1(BASE_POINTS.STEM_CLASH * weight),
      isPositive: false,
      titleTh: 'ก้านฟ้าชงกัน (天干相沖)',
      explanation: `ก้าน ${sa.cn} (${posTh(pillarA.position)}ของ${nameA}) ชงกับ ${sb.cn} (${posTh(pillarB.position)}ของ${nameB}) — แนวคิดพื้นฐานต่างขั้ว ต้องอาศัยการสื่อสารที่ชัดเจน`,
    })
  }
  return factors
}

/** ความสัมพันธ์กิ่งดินระหว่างสองเสา */
function branchFactors(
  pillarA: Pillar,
  pillarB: Pillar,
  weight: number,
  nameA: string,
  nameB: string,
): CompatibilityFactor[] {
  const factors: CompatibilityFactor[] = []
  const ba = pillarA.branch
  const bb = pillarB.branch
  const positions = `${pillarA.position}×${pillarB.position}`
  const posLabel = `${posTh(pillarA.position)}ของ${nameA} กับ ${posTh(pillarB.position)}ของ${nameB}`

  const sixHarmony = BRANCH_SIX_HARMONIES.find(
    ({ pair }) => (pair[0] === ba.cn && pair[1] === bb.cn) || (pair[0] === bb.cn && pair[1] === ba.cn),
  )
  if (sixHarmony) {
    factors.push({
      code: 'BRANCH_SIX_HARMONY',
      positions,
      pair: `${ba.cn}+${bb.cn}`,
      points: round1(BASE_POINTS.BRANCH_SIX_HARMONY * weight),
      isPositive: true,
      titleTh: `กิ่งดินเข้าคู่ (六合) รวมเป็นธาตุ${ELEMENTS[sixHarmony.element].th}`,
      explanation: `${ba.cn} (${ba.animalTh}) เข้าคู่ ${bb.cn} (${bb.animalTh}) ที่${posLabel} — สมพงษ์แบบแนบแน่น เข้าใจกันง่าย`,
    })
  }

  const semiTrine = BRANCH_SEMI_TRINES.find(
    ({ pair }) => (pair[0] === ba.cn && pair[1] === bb.cn) || (pair[0] === bb.cn && pair[1] === ba.cn),
  )
  if (semiTrine) {
    factors.push({
      code: 'BRANCH_SEMI_TRINE',
      positions,
      pair: `${ba.cn}+${bb.cn}`,
      points: round1(BASE_POINTS.BRANCH_SEMI_TRINE * weight),
      isPositive: true,
      titleTh: `ครึ่งสามประสาน (半三合) พลังธาตุ${ELEMENTS[semiTrine.element].th}`,
      explanation: `${ba.cn} (${ba.animalTh}) ประสานกับ ${bb.cn} (${bb.animalTh}) ที่${posLabel} — ร่วมมือกันได้ดีเป็นธรรมชาติ`,
    })
  }

  if (pairMatch(BRANCH_CLASHES, ba.cn, bb.cn)) {
    factors.push({
      code: 'BRANCH_CLASH',
      positions,
      pair: `${ba.cn}⚡${bb.cn}`,
      points: round1(BASE_POINTS.BRANCH_CLASH * weight),
      isPositive: false,
      titleTh: 'กิ่งดินชงกัน (六沖)',
      explanation: `${ba.cn} (${ba.animalTh}) ชงกับ ${bb.cn} (${bb.animalTh}) ที่${posLabel} — จังหวะชีวิตและวิธีทำงานสวนทาง ควรจัดบทบาทให้ไม่ทับเส้นกัน`,
    })
  }

  if (pairMatch(BRANCH_HARMS, ba.cn, bb.cn)) {
    factors.push({
      code: 'BRANCH_HARM',
      positions,
      pair: `${ba.cn}×${bb.cn}`,
      points: round1(BASE_POINTS.BRANCH_HARM * weight),
      isPositive: false,
      titleTh: 'กิ่งดินภัยกัน (六害)',
      explanation: `${ba.cn} (${ba.animalTh}) เป็นภัยกับ ${bb.cn} (${bb.animalTh}) ที่${posLabel} — ความหวังดีอาจถูกตีความผิด ต้องสื่อสารเจตนาให้ชัด`,
    })
  }

  const punishment = BRANCH_PUNISHMENT_GROUPS.find(
    (g) => g.members.includes(ba.cn) && g.members.includes(bb.cn) && ba.cn !== bb.cn,
  )
  if (punishment) {
    factors.push({
      code: 'BRANCH_PUNISHMENT',
      positions,
      pair: `${ba.cn}×${bb.cn}`,
      points: round1(BASE_POINTS.BRANCH_PUNISHMENT * weight),
      isPositive: false,
      titleTh: `กิ่งดินโทษกัน (三刑 — ${punishment.nameTh})`,
      explanation: `${ba.cn} กับ ${bb.cn} อยู่ในชุด${punishment.nameTh} (${punishment.nameCn}) ที่${posLabel} — ระวังเรื่องอำนาจ ความไว้ใจ และการล้ำเส้นบทบาท`,
    })
  }

  if (ba.cn === bb.cn && SELF_PUNISHMENT_BRANCHES.includes(ba.cn)) {
    factors.push({
      code: 'BRANCH_SELF_PUNISHMENT',
      positions,
      pair: `${ba.cn}=${bb.cn}`,
      points: round1(BASE_POINTS.BRANCH_SELF_PUNISHMENT * weight),
      isPositive: false,
      titleTh: 'โทษตัวเอง (自刑)',
      explanation: `ทั้งคู่มีกิ่ง ${ba.cn} (${ba.animalTh}) ตรงกันที่${posLabel} — จุดอ่อนแบบเดียวกันอาจขยายกันเอง ควรมีคนกลางช่วยมอง`,
    })
  }

  if (pairMatch(BRANCH_DESTRUCTIONS, ba.cn, bb.cn) && !sixHarmony && !semiTrine) {
    factors.push({
      code: 'BRANCH_DESTRUCTION',
      positions,
      pair: `${ba.cn}×${bb.cn}`,
      points: round1(BASE_POINTS.BRANCH_DESTRUCTION * weight),
      isPositive: false,
      titleTh: 'กิ่งดินทำลายกัน (六破)',
      explanation: `${ba.cn} กับ ${bb.cn} เป็นคู่ทำลายอ่อนๆ ที่${posLabel} — เรื่องเล็กน้อยจุกจิก ไม่ใช่อุปสรรคใหญ่`,
    })
  }

  return factors
}

/** ตรวจสามประสาน/สามชุมนุมที่ "ครบชุด" เมื่อรวมกิ่งของสองดวง (ต้องมีส่วนร่วมจากทั้งคู่) */
function comboCompletionFactors(
  chartA: BaziChart,
  chartB: BaziChart,
  nameA: string,
  nameB: string,
  branchesBFilter?: (p: Pillar) => boolean,
): CompatibilityFactor[] {
  const factors: CompatibilityFactor[] = []
  const pillarsA = Object.values(chartA.pillars)
  const pillarsB = Object.values(chartB.pillars).filter(branchesBFilter ?? (() => true))
  const setA = new Set(pillarsA.map((p) => p.branch.cn))
  const setB = new Set(pillarsB.map((p) => p.branch.cn))
  const union = new Set([...setA, ...setB])

  for (const { trio, element } of BRANCH_TRINES) {
    const complete = trio.every((b) => union.has(b))
    const fromA = trio.some((b) => setA.has(b) && !setB.has(b))
    const fromB = trio.some((b) => setB.has(b) && !setA.has(b))
    if (complete && fromA && fromB) {
      factors.push({
        code: 'BRANCH_TRINE',
        positions: 'รวมสองดวง',
        pair: trio.join(''),
        points: BASE_POINTS.BRANCH_TRINE_COMPLETE,
        isPositive: true,
        titleTh: `สามประสานครบชุด (三合${ELEMENTS[element].cn}局)`,
        explanation: `กิ่ง ${trio.join(', ')} ครบชุดเมื่อรวมดวงของ${nameA}และ${nameB} — พลังธาตุ${ELEMENTS[element].th}ก่อตัวเต็มวง ร่วมงานแล้วเกิดพลังทวีคูณ`,
      })
    }
  }

  for (const { trio, element, directionTh } of BRANCH_DIRECTIONALS) {
    const complete = trio.every((b) => union.has(b))
    const fromA = trio.some((b) => setA.has(b) && !setB.has(b))
    const fromB = trio.some((b) => setB.has(b) && !setA.has(b))
    if (complete && fromA && fromB) {
      factors.push({
        code: 'BRANCH_DIRECTIONAL',
        positions: 'รวมสองดวง',
        pair: trio.join(''),
        points: BASE_POINTS.BRANCH_DIRECTIONAL_COMPLETE,
        isPositive: true,
        titleTh: `สามชุมนุมครบชุด (三會${ELEMENTS[element].cn}局 — ${directionTh})`,
        explanation: `กิ่ง ${trio.join(', ')} ชุมนุมครบทิศเมื่อรวมสองดวง — กระแสธาตุ${ELEMENTS[element].th}ไหลแรง เสริมเป้าหมายร่วมกัน`,
      })
    }
  }

  return factors
}

/** ความสัมพันธ์ก้านวันต่อก้านวัน (แกนเรื่อง "ใครหล่อเลี้ยง/คุมใคร") */
function dayMasterFactor(
  wuA: WuXingAnalysis,
  wuB: WuXingAnalysis,
  nameA: string,
  nameB: string,
): CompatibilityFactor | null {
  const a = wuA.dayMaster.dayMaster
  const b = wuB.dayMaster.dayMaster
  const elA = a.element
  const elB = b.element
  const favA = wuA.dayMaster.favorableElements

  if (elA === elB) {
    return {
      code: 'DAY_MASTER_RELATION',
      positions: 'day×day',
      pair: `${a.cn}·${b.cn}`,
      points: 2,
      isPositive: true,
      titleTh: 'ก้านวันธาตุเดียวกัน — เพื่อนร่วมทาง',
      explanation: `${nameA}และ${nameB}เป็นธาตุ${ELEMENTS[elA].th}เหมือนกัน — เข้าใจวิธีคิดกันง่าย แต่ควรแบ่งบทบาท/ผลงานให้ชัดเพื่อเลี่ยงการแข่งกันเอง`,
    }
  }
  if (GENERATES[elB] === elA) {
    return {
      code: 'DAY_MASTER_RELATION',
      positions: 'day×day',
      pair: `${b.cn}→${a.cn}`,
      points: 6,
      isPositive: true,
      titleTh: `ธาตุ${ELEMENTS[elB].th}หล่อเลี้ยงธาตุ${ELEMENTS[elA].th}`,
      explanation: `ก้านวันของ${nameB} (ธาตุ${ELEMENTS[elB].th}) ก่อเกิดธาตุ${ELEMENTS[elA].th}ของ${nameA} — ฝ่ายองค์กรมีแนวโน้มเกื้อหนุน ส่งเสริมให้${nameA}เติบโต`,
    }
  }
  if (GENERATES[elA] === elB) {
    const weak = wuA.dayMaster.category === 'weak'
    return {
      code: 'DAY_MASTER_RELATION',
      positions: 'day×day',
      pair: `${a.cn}→${b.cn}`,
      points: weak ? 1 : 4,
      isPositive: true,
      titleTh: `ธาตุ${ELEMENTS[elA].th}หล่อเลี้ยงธาตุ${ELEMENTS[elB].th}`,
      explanation:
        `${nameA}เป็นฝ่ายทุ่มเทพลังให้${nameB} — เป็นผู้สร้างผลงานให้องค์กรโดยธรรมชาติ` +
        (weak ? ' แต่เนื่องจากก้านวันของตนอ่อน ควรระวังภาวะหมดแรง ให้มีการเติมพลัง/พักฟื้นสม่ำเสมอ' : ''),
    }
  }
  if (CONTROLS[elB] === elA) {
    const welcome = favA.includes(elB)
    return {
      code: 'DAY_MASTER_RELATION',
      positions: 'day×day',
      pair: `${b.cn}⊣${a.cn}`,
      points: welcome ? 5 : -4,
      isPositive: welcome,
      titleTh: welcome ? 'วินัยที่พอเหมาะ — ธาตุคุมที่เป็นคุณ' : 'แรงกดทับจากธาตุคุม',
      explanation: welcome
        ? `ธาตุ${ELEMENTS[elB].th}ของ${nameB}คุมธาตุ${ELEMENTS[elA].th}ของ${nameA} แต่ดวงของ${nameA}แข็งและต้องการธาตุนี้พอดี — โครงสร้าง/วินัยขององค์กรจะเปลี่ยนพลังส่วนเกินให้เป็นผลงาน`
        : `ธาตุ${ELEMENTS[elB].th}ของ${nameB}คุมธาตุ${ELEMENTS[elA].th}ของ${nameA} ซึ่งดวงของ${nameA}ไม่ต้องการแรงกดเพิ่ม — ควรบริหารด้วยการมอบหมายเป้าหมายมากกว่าการควบคุมใกล้ชิด`,
    }
  }
  // A ควบคุม B
  const usefulWealth = favA.includes(elB)
  return {
    code: 'DAY_MASTER_RELATION',
    positions: 'day×day',
    pair: `${a.cn}⊣${b.cn}`,
    points: usefulWealth ? 4 : -1,
    isPositive: usefulWealth,
    titleTh: usefulWealth ? 'ได้บริหารจัดการ — ธาตุทรัพย์เป็นคุณ' : 'พลังบริหารที่ต้องวางให้ถูกที่',
    explanation: usefulWealth
      ? `ธาตุ${ELEMENTS[elA].th}ของ${nameA}คุมธาตุ${ELEMENTS[elB].th}ของ${nameB}และเป็นธาตุอุปการะของ${nameA}เอง — ${nameA}จะรู้สึกได้ "จัดการงาน" อย่างมีคุณค่า เหมาะกับบทบาทที่มีความเป็นเจ้าของ`
      : `ธาตุ${ELEMENTS[elA].th}ของ${nameA}คุมธาตุ${ELEMENTS[elB].th}ของ${nameB} — ${nameA}มีแนวโน้มอยากขับเคลื่อน/ปรับเปลี่ยนแนวทางองค์กร ควรเปิดช่องรับความคิดเห็นเพื่อเปลี่ยนแรงดันเป็นนวัตกรรม`,
  }
}

/** ธาตุเกื้อหนุนกันระหว่างสองดวง (ดวงเขามีธาตุที่ดวงเราต้องการหรือไม่) */
function elementSupportFactors(
  wuA: WuXingAnalysis,
  wuB: WuXingAnalysis,
  nameA: string,
  nameB: string,
): CompatibilityFactor[] {
  const factors: CompatibilityFactor[] = []

  const check = (
    receiver: WuXingAnalysis,
    provider: WuXingAnalysis,
    receiverName: string,
    providerName: string,
  ) => {
    let matched = 0
    const matchedNames: string[] = []
    for (const fav of receiver.dayMaster.favorableElements.slice(0, 2)) {
      if ((provider.distribution.counts[fav] ?? 0) >= 1.5) {
        matched += 1
        matchedNames.push(ELEMENTS[fav].th)
      }
    }
    if (matched > 0) {
      factors.push({
        code: 'ELEMENT_SUPPORT',
        positions: 'ภาพรวมธาตุ',
        pair: matchedNames.join('/'),
        points: matched * 4,
        isPositive: true,
        titleTh: `ดวง${providerName}เติมธาตุอุปการะให้${receiverName}`,
        explanation: `ดวงของ${providerName}มีธาตุ${matchedNames.join('และ')}เด่น ซึ่งเป็นธาตุอุปการะที่ดวงของ${receiverName}ต้องการ — อยู่ใกล้กันแล้วรู้สึก "เติมเต็ม" ทำงานร่วมกันราบรื่นขึ้น`,
      })
    }

    const strongest = provider.distribution.strongest
    if (
      receiver.dayMaster.unfavorableElements.includes(strongest) &&
      (provider.distribution.counts[strongest] ?? 0) >= 3
    ) {
      factors.push({
        code: 'ELEMENT_SUPPORT',
        positions: 'ภาพรวมธาตุ',
        pair: ELEMENTS[strongest].th,
        points: -4,
        isPositive: false,
        titleTh: `ธาตุเด่นของ${providerName}เป็นธาตุโทษของ${receiverName}`,
        explanation: `ดวงของ${providerName}มีธาตุ${ELEMENTS[strongest].th}แรงมาก ซึ่งเป็นธาตุโทษของ${receiverName} — ควรถ่วงดุลด้วยสภาพแวดล้อม/ทีมที่มีธาตุ${receiver.dayMaster.favorableElements.map((e) => ELEMENTS[e].th).join('หรือ')}`,
      })
    }
  }

  check(wuA, wuB, nameA, nameB)
  check(wuB, wuA, nameB, nameA)
  return factors
}

function gradeOf(score: number): { grade: CompatibilityGrade; gradeTh: string } {
  if (score >= 80) return { grade: 'excellent', gradeTh: 'สมพงษ์ดีเยี่ยม' }
  if (score >= 65) return { grade: 'good', gradeTh: 'สมพงษ์ดี' }
  if (score >= 50) return { grade: 'fair', gradeTh: 'ปานกลาง — บริหารได้' }
  if (score >= 35) return { grade: 'caution', gradeTh: 'ควรระวัง — ต้องบริหารความต่าง' }
  return { grade: 'challenging', gradeTh: 'ท้าทายสูง' }
}

const ROLE_BY_ELEMENT: Record<ElementKey, string> = {
  wood: 'งานวางแผน พัฒนาธุรกิจ ฝึกอบรม หรืองานที่ได้ริเริ่มเติบโต',
  fire: 'งานการตลาด การนำเสนอ งานขับเคลื่อนทีม หรืองานที่ต้องใช้พลังจุดประกาย',
  earth: 'งานปฏิบัติการ ประสานงาน บริหารระบบ หรืองานที่ต้องการความมั่นคงไว้ใจได้',
  metal: 'งานการเงิน กฎระเบียบ ควบคุมคุณภาพ หรืองานที่ต้องตัดสินใจเฉียบขาด',
  water: 'งานวิเคราะห์ กลยุทธ์ การสื่อสาร โลจิสติกส์ หรืองานที่ต้องยืดหยุ่นไหลลื่น',
}

function buildAdvice(
  wuA: WuXingAnalysis,
  factors: CompatibilityFactor[],
  nameA: string,
): string[] {
  const advice: string[] = []
  const fav = wuA.dayMaster.favorableElements[0]
  if (fav) {
    advice.push(`ตำแหน่งที่เสริมดวง${nameA}: ${ROLE_BY_ELEMENT[fav]} (ธาตุอุปการะ: ${ELEMENTS[fav].th})`)
  }
  const clashes = factors.filter((f) => !f.isPositive && (f.code === 'BRANCH_CLASH' || f.code === 'STEM_CLASH'))
  if (clashes.length > 0) {
    advice.push(
      'มีคู่ชงในผัง — แนะนำแบ่งขอบเขตงานชัดเจน ตั้งจังหวะประชุมสม่ำเสมอ และใช้คนกลาง/เอกสารเป็นตัวกลางการตัดสินใจสำคัญ',
    )
  }
  const harmonies = factors.filter((f) => f.isPositive && f.points >= 8)
  if (harmonies.length >= 2) {
    advice.push('จุดประสานหลายชั้น — มอบหมายงานร่วม/โปรเจกต์คู่ได้เลย ความเข้ากันนี้จะเปลี่ยนเป็นผลงานเร็ว')
  }
  advice.push('ผลวิเคราะห์นี้เป็นข้อมูลประกอบการพิจารณาเชิงโหราศาสตร์จีน ควรใช้ร่วมกับทักษะ ประสบการณ์ และการสัมภาษณ์')
  return advice
}

function summarize(
  score: number,
  gradeTh: string,
  factors: CompatibilityFactor[],
  nameA: string,
  nameB: string,
): string {
  const positives = factors.filter((f) => f.isPositive).sort((a, b) => b.points - a.points)
  const negatives = factors.filter((f) => !f.isPositive).sort((a, b) => a.points - b.points)
  const parts: string[] = [
    `ดัชนีสมพงษ์ระหว่าง${nameA}กับ${nameB}อยู่ที่ ${score}/100 (${gradeTh})`,
  ]
  if (positives[0]) parts.push(`จุดแข็งเด่นคือ ${positives[0].titleTh}`)
  if (negatives[0]) parts.push(`จุดที่ควรบริหารคือ ${negatives[0].titleTh}`)
  return parts.join(' — ')
}

export interface ComparePersonsOptions {
  nameA?: string
  nameB?: string
  /** ตัดเสาเวลาของฝ่าย B (ใช้กับดวงบริษัทที่ไม่รู้เวลาก่อตั้ง) */
  excludeHourOfB?: boolean
  mode?: 'person' | 'company-date'
}

/** วิเคราะห์สมพงษ์ระหว่างคนสองดวง (หรือคน×ดวงวันก่อตั้งบริษัท) */
export function comparePersons(
  chartA: BaziChart,
  chartB: BaziChart,
  options: ComparePersonsOptions = {},
): CompatibilityResult {
  const nameA = options.nameA ?? 'ผู้ถูกวิเคราะห์'
  const nameB = options.nameB ?? 'อีกฝ่าย'
  const wuA = analyzeWuXing(chartA)
  const wuB = analyzeWuXing(chartB)

  const factors: CompatibilityFactor[] = []

  for (const { a, b, weight } of PAIR_WEIGHTS) {
    if (options.excludeHourOfB && b === 'hour') continue
    const pillarA = chartA.pillars[a]
    const pillarB = chartB.pillars[b]
    factors.push(...stemFactors(pillarA, pillarB, weight, nameA, nameB))
    factors.push(...branchFactors(pillarA, pillarB, weight, nameA, nameB))
  }

  factors.push(
    ...comboCompletionFactors(
      chartA,
      chartB,
      nameA,
      nameB,
      options.excludeHourOfB ? (p) => p.position !== 'hour' : undefined,
    ),
  )

  const dmFactor = dayMasterFactor(wuA, wuB, nameA, nameB)
  if (dmFactor) factors.push(dmFactor)

  factors.push(...elementSupportFactors(wuA, wuB, nameA, nameB))

  const raw = 50 + factors.reduce((sum, f) => sum + f.points, 0)
  const score = Math.max(5, Math.min(98, Math.round(raw)))
  const { grade, gradeTh } = gradeOf(score)

  return {
    score,
    grade,
    gradeTh,
    summary: summarize(score, gradeTh, factors, nameA, nameB),
    factors: factors.sort((x, y) => Math.abs(y.points) - Math.abs(x.points)),
    advice: buildAdvice(wuA, factors, nameA),
    mode: options.mode ?? 'person',
  }
}

/** สมพงษ์คน × วันก่อตั้งบริษัท (ไม่รู้เวลา → ตัดเสาเวลาฝั่งบริษัท) */
export function compareWithCompanyDate(
  chartA: BaziChart,
  foundingYear: number,
  foundingMonth: number,
  foundingDay: number,
  options: { nameA?: string; companyName?: string } = {},
): CompatibilityResult {
  const companyChart = computeBaziDateOnly(foundingYear, foundingMonth, foundingDay)
  return comparePersons(chartA, companyChart, {
    nameA: options.nameA,
    nameB: options.companyName ?? 'บริษัท',
    excludeHourOfB: true,
    mode: 'company-date',
  })
}

/** สมพงษ์คน × ธาตุอุตสาหกรรม */
export function compareWithIndustry(
  chartA: BaziChart,
  industryElement: ElementKey,
  options: { nameA?: string; industryName?: string } = {},
): CompatibilityResult {
  const nameA = options.nameA ?? 'ผู้ถูกวิเคราะห์'
  const industryName = options.industryName ?? `อุตสาหกรรมธาตุ${ELEMENTS[industryElement].th}`
  const wuA = analyzeWuXing(chartA)
  const dm = wuA.dayMaster
  const elA = dm.dayMaster.element
  const factors: CompatibilityFactor[] = []

  const favIndex = dm.favorableElements.indexOf(industryElement)
  if (favIndex === 0) {
    factors.push({
      code: 'ELEMENT_SUPPORT',
      positions: 'อุตสาหกรรม',
      pair: ELEMENTS[industryElement].th,
      points: 20,
      isPositive: true,
      titleTh: 'ตรงธาตุอุปการะอันดับหนึ่ง',
      explanation: `${industryName}เป็นธาตุ${ELEMENTS[industryElement].th} ตรงกับธาตุอุปการะอันดับแรกของ${nameA}พอดี — สภาพแวดล้อมของงานสายนี้จะหนุนดวงโดยตรง`,
    })
  } else if (favIndex > 0) {
    factors.push({
      code: 'ELEMENT_SUPPORT',
      positions: 'อุตสาหกรรม',
      pair: ELEMENTS[industryElement].th,
      points: 12,
      isPositive: true,
      titleTh: 'ตรงธาตุอุปการะรอง',
      explanation: `${industryName}เป็นธาตุ${ELEMENTS[industryElement].th} ซึ่งเป็นธาตุอุปการะลำดับรองของ${nameA} — เข้ากันได้ดี`,
    })
  }
  if (dm.unfavorableElements.includes(industryElement)) {
    factors.push({
      code: 'ELEMENT_SUPPORT',
      positions: 'อุตสาหกรรม',
      pair: ELEMENTS[industryElement].th,
      points: -10,
      isPositive: false,
      titleTh: 'เป็นธาตุโทษของดวง',
      explanation: `${industryName}เป็นธาตุ${ELEMENTS[industryElement].th} ซึ่งเป็นธาตุโทษของ${nameA} — ไม่ใช่ทำไม่ได้ แต่ต้องอาศัยทีม/สภาพแวดล้อมช่วยถ่วงดุลมากกว่าปกติ`,
    })
  }

  // ความสัมพันธ์เชิงโครงสร้างระหว่างธาตุอุตสาหกรรมกับก้านวัน
  if (GENERATES[industryElement] === elA) {
    factors.push({
      code: 'DAY_MASTER_RELATION',
      positions: 'อุตสาหกรรม',
      pair: `${ELEMENTS[industryElement].cn}→${ELEMENTS[elA].cn}`,
      points: 6,
      isPositive: true,
      titleTh: 'อุตสาหกรรมหล่อเลี้ยงตัวตน',
      explanation: `ธาตุ${ELEMENTS[industryElement].th}ของอุตสาหกรรมก่อเกิดธาตุ${ELEMENTS[elA].th}ของ${nameA} — งานสายนี้ให้พลังงานมากกว่าดูดพลัง`,
    })
  } else if (CONTROLS[industryElement] === elA && !dm.favorableElements.includes(industryElement)) {
    factors.push({
      code: 'DAY_MASTER_RELATION',
      positions: 'อุตสาหกรรม',
      pair: `${ELEMENTS[industryElement].cn}⊣${ELEMENTS[elA].cn}`,
      points: -6,
      isPositive: false,
      titleTh: 'อุตสาหกรรมกดทับตัวตน',
      explanation: `ธาตุ${ELEMENTS[industryElement].th}คุมธาตุ${ELEMENTS[elA].th}ของ${nameA} — อาจรู้สึกกดดันเรื้อรัง ควรเลือกบทบาทที่มีอิสระในสายงานนี้`,
    })
  } else if (CONTROLS[elA] === industryElement) {
    const useful = dm.favorableElements.includes(industryElement)
    factors.push({
      code: 'DAY_MASTER_RELATION',
      positions: 'อุตสาหกรรม',
      pair: `${ELEMENTS[elA].cn}⊣${ELEMENTS[industryElement].cn}`,
      points: useful ? 8 : 3,
      isPositive: true,
      titleTh: 'งานคือทรัพย์ (財) — ได้บริหารจัดการ',
      explanation: `ธาตุ${ELEMENTS[elA].th}ของ${nameA}คุมธาตุ${ELEMENTS[industryElement].th}ของอุตสาหกรรม — ตำราถือเป็น "ธาตุทรัพย์" ${useful ? 'และดวงแข็งพอจะรับทรัพย์ เหมาะมากกับงานที่วัดผลชัด' : 'แต่ควรจัดจังหวะงานไม่ให้ล้นมือ'}`,
    })
  } else if (GENERATES[elA] === industryElement) {
    const strong = dm.category === 'strong'
    factors.push({
      code: 'DAY_MASTER_RELATION',
      positions: 'อุตสาหกรรม',
      pair: `${ELEMENTS[elA].cn}→${ELEMENTS[industryElement].cn}`,
      points: strong ? 6 : 2,
      isPositive: true,
      titleTh: 'ได้ปลดปล่อยความสามารถ (食傷)',
      explanation: `ธาตุ${ELEMENTS[elA].th}ของ${nameA}ก่อเกิดธาตุ${ELEMENTS[industryElement].th}ของอุตสาหกรรม — เป็นเวทีให้แสดงฝีมือและผลิตผลงาน${strong ? ' และดวงแข็งพอที่จะทุ่มเทได้เต็มที่' : ' แต่ควรจัดจังหวะพักฟื้นไม่ให้พลังรั่วไหลเกินไป'}`,
    })
  } else if (industryElement === elA) {
    factors.push({
      code: 'DAY_MASTER_RELATION',
      positions: 'อุตสาหกรรม',
      pair: ELEMENTS[elA].cn,
      points: 4,
      isPositive: true,
      titleTh: 'ธาตุเดียวกับตัวตน',
      explanation: `อุตสาหกรรมธาตุ${ELEMENTS[industryElement].th}เป็นธาตุเดียวกับก้านวันของ${nameA} — คุ้นเคง เข้ามือ ทำได้อย่างเป็นธรรมชาติ`,
    })
  }

  const raw = 50 + factors.reduce((s, f) => s + f.points, 0)
  const score = Math.max(5, Math.min(98, Math.round(raw)))
  const { grade, gradeTh } = gradeOf(score)

  return {
    score,
    grade,
    gradeTh,
    summary: summarize(score, gradeTh, factors, nameA, industryName),
    factors: factors.sort((x, y) => Math.abs(y.points) - Math.abs(x.points)),
    advice: buildAdvice(wuA, factors, nameA),
    mode: 'industry',
  }
}

/** สมพงษ์คน × ทีม (เฉลี่ยรายคู่ + โบนัสเติมธาตุที่ทีมขาด) */
export function compareTeam(
  subjectChart: BaziChart,
  members: { chart: BaziChart; name: string }[],
  options: { nameA?: string } = {},
): { overall: CompatibilityResult; pairwise: { name: string; result: CompatibilityResult }[] } {
  const nameA = options.nameA ?? 'ผู้ถูกวิเคราะห์'
  const pairwise = members.map((m) => ({
    name: m.name,
    result: comparePersons(subjectChart, m.chart, { nameA, nameB: m.name }),
  }))

  const avg =
    pairwise.length > 0
      ? pairwise.reduce((s, p) => s + p.result.score, 0) / pairwise.length
      : 50

  const factors: CompatibilityFactor[] = []

  // ธาตุที่ทีมพร่อง แต่ผู้ถูกวิเคราะห์มีเด่น → เติมเต็มทีม
  if (members.length > 0) {
    const subjectWu = analyzeWuXing(subjectChart)
    const teamCounts: Record<ElementKey, number> = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 }
    for (const m of members) {
      const dist = analyzeWuXing(m.chart).distribution
      for (const k of Object.keys(teamCounts) as ElementKey[]) {
        teamCounts[k] += dist.counts[k]
      }
    }
    const lacking = (Object.keys(teamCounts) as ElementKey[]).filter(
      (k) => teamCounts[k] / members.length < 1.0,
    )
    for (const k of lacking) {
      if ((subjectWu.distribution.counts[k] ?? 0) >= 2) {
        factors.push({
          code: 'ELEMENT_SUPPORT',
          positions: 'ทีม',
          pair: ELEMENTS[k].th,
          points: 5,
          isPositive: true,
          titleTh: `เติมธาตุ${ELEMENTS[k].th}ที่ทีมขาด`,
          explanation: `ทีมปัจจุบันพร่องธาตุ${ELEMENTS[k].th} ขณะที่ดวงของ${nameA}มีธาตุนี้เด่น — การเข้ามาของ${nameA}ช่วยให้วงจรห้าธาตุของทีมสมบูรณ์ขึ้น`,
        })
      }
    }
  }

  const raw = avg + factors.reduce((s, f) => s + f.points, 0)
  const score = Math.max(5, Math.min(98, Math.round(raw)))
  const { grade, gradeTh } = gradeOf(score)

  const overall: CompatibilityResult = {
    score,
    grade,
    gradeTh,
    summary: `ดัชนีสมพงษ์เฉลี่ยของ${nameA}กับทีม ${members.length} คน อยู่ที่ ${score}/100 (${gradeTh})`,
    factors,
    advice: [
      'ดูรายละเอียดรายคู่ประกอบ เพื่อวางแผนการจับคู่บัดดี้/สายรายงานที่เหมาะสม',
      'ผลวิเคราะห์นี้เป็นข้อมูลประกอบการพิจารณาเชิงโหราศาสตร์จีน ควรใช้ร่วมกับทักษะ ประสบการณ์ และการสัมภาษณ์',
    ],
    mode: 'team',
  }

  return { overall, pairwise }
}

/** ปฏิสัมพันธ์ดวงกับปีปัจจุบัน/ปีเป้าหมาย (流年) — ใช้ประกอบหัวข้อ "จังหวะเวลา" */
export function annualOutlook(chart: BaziChart, year: number): AnnualOutlook {
  const ganzhi = yearGanzhiOf(year)
  const stemCn = ganzhi.charAt(0)
  const branchCn = ganzhi.charAt(1)
  const branch = BRANCH_BY_CN[branchCn]
  const stem = STEM_BY_CN[stemCn]
  const factors: CompatibilityFactor[] = []

  if (!branch || !stem) {
    return { year, ganzhi, animalTh: '', factors, summary: '' }
  }

  const dayBranch = chart.pillars.day.branch
  const yearBranch = chart.pillars.year.branch

  if (pairMatch(BRANCH_CLASHES, branch.cn, yearBranch.cn)) {
    factors.push({
      code: 'BRANCH_CLASH',
      positions: `ปี${year}×เสาปี`,
      pair: `${branch.cn}⚡${yearBranch.cn}`,
      points: -5,
      isPositive: false,
      titleTh: `ปีชง (沖太歲) ปี ${year}`,
      explanation: `กิ่งปี ${branch.cn} (${branch.animalTh}) ชงกับกิ่งปีเกิด ${yearBranch.cn} (${yearBranch.animalTh}) — ปีแห่งความเปลี่ยนแปลง เหมาะกับการวางแผนรอบคอบ ไม่เหมาะเริ่มงานเสี่ยงสูงโดยไม่มีแผนสำรอง`,
    })
  }
  if (pairMatch(BRANCH_CLASHES, branch.cn, dayBranch.cn)) {
    factors.push({
      code: 'BRANCH_CLASH',
      positions: `ปี${year}×เสาวัน`,
      pair: `${branch.cn}⚡${dayBranch.cn}`,
      points: -4,
      isPositive: false,
      titleTh: 'ปีชงเสาวัน',
      explanation: `กิ่งปี ${branch.cn} ชงกับกิ่งวันเกิด — ปีที่ควรดูแลสมดุลชีวิต-งานเป็นพิเศษ`,
    })
  }
  const sixHarmony = BRANCH_SIX_HARMONIES.find(
    ({ pair }) =>
      (pair[0] === branch.cn && (pair[1] === dayBranch.cn || pair[1] === yearBranch.cn)) ||
      (pair[1] === branch.cn && (pair[0] === dayBranch.cn || pair[0] === yearBranch.cn)),
  )
  if (sixHarmony) {
    factors.push({
      code: 'BRANCH_SIX_HARMONY',
      positions: `ปี${year}`,
      pair: sixHarmony.pair.join('+'),
      points: 5,
      isPositive: true,
      titleTh: 'ปีสมพงษ์ (合太歲)',
      explanation: `กิ่งปี ${branch.cn} เข้าคู่กับดวงกำเนิด — ปีที่เอื้อต่อการเริ่มงานใหม่ ผูกสัมพันธ์ และขยายเครือข่าย`,
    })
  }

  const summary =
    factors.length === 0
      ? `ปี ${year} (${ganzhi} ปี${branch.animalTh}) ไม่มีคู่ชง/คู่สมพงษ์เด่นกับดวงกำเนิด — เดินงานได้ตามปกติ`
      : factors.map((f) => f.titleTh).join(' · ')

  return { year, ganzhi, animalTh: branch.animalTh, factors, summary }
}
