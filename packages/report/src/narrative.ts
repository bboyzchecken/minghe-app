/**
 * ตัวเรียบเรียงรายงานภาษาไทยแบบ deterministic
 * — ทำงานได้เต็มรูปแบบโดยไม่ต้องมี API key (LLM เป็นตัวขัดเงาเสริมเท่านั้น)
 * น้ำเสียงตามแบรนด์: สุขุม มั่นใจ ให้เกียรติศาสตร์ อธิบายมีเหตุผล อบอุ่นแบบมืออาชีพ
 */

import { ELEMENTS } from '@minghe/core'
import type { NarrativeSection, ReportData } from './types'

type AssembledData = Omit<ReportData, 'narrative' | 'faceReading'>

const ELEMENT_CHARACTER: Record<string, string> = {
  wood: 'มีพลังของการริเริ่มและเติบโต ชอบพัฒนา เรียนรู้ และขยายขอบเขต',
  fire: 'มีพลังของความกระตือรือร้นและการแสดงออก จุดประกายผู้คนรอบข้างได้',
  earth: 'มีพลังของความมั่นคงและความน่าไว้วางใจ เป็นหลักให้ผู้อื่นพักพิง',
  metal: 'มีพลังของความเฉียบคมและหลักการ ตัดสินใจชัดเจน รักษามาตรฐาน',
  water: 'มีพลังของปัญญาและความยืดหยุ่น ปรับตัวเก่ง มองเห็นทางเลือกที่คนอื่นมองข้าม',
}

export function buildNarrative(data: AssembledData): NarrativeSection[] {
  const { subject, org, compatibility, annual, meta } = data
  const chart = subject.chart
  const wu = subject.wuxing
  const dmTh = chart.dayMasterElementTh
  const name = meta.subjectName

  const sections: NarrativeSection[] = []

  // 1) บทนำ
  sections.push({
    id: 'intro',
    title: 'บทนำ',
    paragraphs: [
      `รายงานความเหมาะสม 命合 ฉบับนี้ วิเคราะห์ความเข้ากัน (สมพงษ์) ระหว่างคุณ${name} กับ${org.label} ` +
        `ด้วยศาสตร์ปาจือ (八字) ตามหลักซินแสตัวจริง — ตั้งเสาสี่ต้นด้วยขอบเขตปีลี่ชุน (立春) ขอบเขตเดือนตามสารทหลัก (節) ` +
        `และปรับเวลาเกิดเป็นเวลาสุริยะจริง (真太陽時) ตามพิกัดสถานที่เกิด เพื่อความแม่นยำสูงสุดของเสาเวลา`,
      chart.trueSolarTime.applied
        ? `เวลาเกิดตามนาฬิกา ${chart.trueSolarTime.clockTime} น. เมื่อปรับเป็นเวลาสุริยะจริง ณ สถานที่เกิดแล้ว ` +
          `คือ ${chart.trueSolarTime.solarTime} น. (ชดเชยรวม ${chart.trueSolarTime.totalCorrectionMinutes} นาที ` +
          `จากลองจิจูดและสมการเวลา) — ผังปาจือในรายงานนี้ตั้งจากเวลาสุริยะจริงดังกล่าว`
        : `หมายเหตุ: การวิเคราะห์นี้ใช้เวลานาฬิกาโดยตรง เนื่องจากไม่ได้ระบุพิกัดสถานที่เกิด`,
    ],
  })

  // 2) ผังปาจือ
  const dayPillar = chart.pillars.find((p) => p.position === 'day')
  const monthPillar = chart.pillars.find((p) => p.position === 'month')
  const favTh = wu.favorableElements.map((e) => ELEMENTS[e].th).join(' และ ')
  sections.push({
    id: 'bazi',
    title: `ผังปาจือ (命盘) ของคุณ${name}`,
    paragraphs: [
      `จากผังปาจือของคุณ${name} ก้านวัน (日主) คือ ${chart.dayMasterCn} ธาตุ${dmTh} — ` +
        `${ELEMENT_CHARACTER[chart.dayMasterElement] ?? ''} เกิดปีนักษัตร${chart.zodiacTh} ` +
        `เสาวันคือ ${dayPillar?.ganzhi ?? ''} และเสาเดือน (วังการงาน) คือ ${monthPillar?.ganzhi ?? ''}`,
      `กำลังของก้านวันประเมินได้ ${wu.strengthScore}/100 จัดเป็น${wu.strengthCategoryTh} — ${wu.strengthExplanation}`,
      `ธาตุอุปการะของดวงนี้คือ ${favTh} — การได้อยู่ในสภาพแวดล้อม บทบาท หรือทีมที่มีพลังธาตุเหล่านี้ ` +
        `จะช่วยหนุนให้คุณ${name}ทำงานได้ลื่นไหลและมีกำลังใจมั่นคงขึ้น`,
      wu.missing.length > 0
        ? `ข้อสังเกต: ดวงนี้พร่องธาตุ${wu.missing.map((e) => ELEMENTS[e].th).join(', ')} ` +
          `ซึ่งไม่ใช่ข้อบกพร่อง แต่เป็นตัวบอกว่าพลังด้านใดควรอาศัยสภาพแวดล้อมหรือเพื่อนร่วมงานมาเติมเต็ม`
        : `ดวงนี้มีครบทั้งห้าธาตุ — เป็นโครงสร้างที่ยืดหยุ่น ปรับตัวเข้ากับสภาพแวดล้อมหลากหลายได้`,
    ],
  })

  // 3) ดัชนีสมพงษ์
  const topPositive = compatibility.factors.filter((f) => f.isPositive).slice(0, 3)
  const topNegative = compatibility.factors.filter((f) => !f.isPositive).slice(0, 3)
  const compatParagraphs: string[] = [
    `ดัชนีสมพงษ์ (合 Index) ระหว่างคุณ${name}กับ${org.label} อยู่ที่ ${compatibility.score} จาก 100 ` +
      `จัดอยู่ในเกณฑ์ "${compatibility.gradeTh}"`,
  ]
  if (topPositive.length > 0) {
    compatParagraphs.push(
      `จุดประสานที่เด่นที่สุด: ` +
        topPositive.map((f) => `${f.titleTh} — ${f.explanation}`).join(' · '),
    )
  }
  if (topNegative.length > 0) {
    compatParagraphs.push(
      `จุดที่ควรบริหาร: ` + topNegative.map((f) => `${f.titleTh} — ${f.explanation}`).join(' · '),
    )
  } else {
    compatParagraphs.push('ไม่พบคู่ชง คู่ภัย หรือคู่โทษที่มีนัยสำคัญระหว่างสองดวงนี้')
  }
  sections.push({
    id: 'compatibility',
    title: `ความเข้ากันกับ${org.label}`,
    paragraphs: compatParagraphs,
  })

  // 4) ทีม (ถ้ามี)
  if (data.team && data.team.pairwise.length > 0) {
    sections.push({
      id: 'team',
      title: 'ความเข้ากันกับทีม',
      paragraphs: [
        data.team.summary,
        ...data.team.pairwise.map(
          (p) =>
            `กับคุณ${p.name}: ${p.score}/100 (${p.gradeTh})` +
            (p.topFactors[0] ? ` — ปัจจัยเด่น: ${p.topFactors[0].titleTh}` : ''),
        ),
      ],
    })
  }

  // 5) ข้อเสนอแนะ
  sections.push({
    id: 'recommendations',
    title: 'ข้อเสนอแนะเชิงปฏิบัติ',
    paragraphs: [...compatibility.advice],
  })

  // 6) จังหวะเวลา
  sections.push({
    id: 'timing',
    title: `จังหวะเวลา ปี ${annual.year}`,
    paragraphs: [
      `ปี ${annual.year} เป็นปี ${annual.ganzhi} (ปี${annual.animalTh}) — ${annual.summary}`,
      ...(annual.factors.length > 0 ? annual.factors.map((f) => f.explanation) : []),
    ],
  })

  // 7) ปิดท้าย
  sections.push({
    id: 'closing',
    title: 'บทสรุป',
    paragraphs: [
      `โดยรวม ดวงของคุณ${name}กับ${org.label}มีดัชนีสมพงษ์ ${compatibility.score}/100 (${compatibility.gradeTh}) — ` +
        `${compatibility.summary}`,
      `命合 เชื่อว่าการรู้ "ความเข้ากัน" ล่วงหน้า ไม่ใช่การตัดสินใคร แต่คือการเตรียมวิธีทำงานร่วมกันให้ถูกจังหวะ — ` +
        `เมื่อ "คนที่ใช่" เจอ "ที่ที่ใช่" พลังของทั้งคนและองค์กรจะเสริมกันเอง`,
    ],
  })

  return sections
}
