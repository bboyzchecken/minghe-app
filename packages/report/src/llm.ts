/**
 * ส่วนเสริม AI (Anthropic Claude) — ใช้เมื่อมี ANTHROPIC_API_KEY เท่านั้น
 *
 * ขอบเขตหน้าที่ (ตามแผนหัวข้อ 13): LLM "เรียบเรียง" เท่านั้น
 * ห้ามคำนวณเสา/ธาตุ/คะแนนเอง — ตัวเลขและโครงสร้างทั้งหมดมาจาก engine
 * ถ้าเรียกไม่สำเร็จ ระบบ fallback เป็นข้อความ deterministic เสมอ (รายงานไม่มีทางค้าง)
 */

import Anthropic from '@anthropic-ai/sdk'
import type { FaceReadingView, NarrativeSection, ReportData } from './types'

function getClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null
  return new Anthropic({ apiKey })
}

function getModel(): string {
  return process.env.ANTHROPIC_MODEL || 'claude-sonnet-5'
}

/** ดึง JSON ก้อนแรกออกจากข้อความตอบกลับ */
function extractJson<T>(text: string): T | null {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null
  try {
    return JSON.parse(text.slice(start, end + 1)) as T
  } catch {
    return null
  }
}

/**
 * ขัดเงาภาษาของ narrative ด้วย Claude (คงข้อเท็จจริง/ตัวเลข/ศัพท์เฉพาะทั้งหมด)
 * คืน null ถ้าเรียกไม่ได้ → ผู้เรียกใช้ข้อความเดิม
 */
export async function polishNarrative(
  sections: NarrativeSection[],
  context: { subjectName: string; orgLabel: string; score: number },
): Promise<NarrativeSection[] | null> {
  const client = getClient()
  if (!client) return null

  try {
    const response = await client.messages.create({
      model: getModel(),
      max_tokens: 8000,
      system:
        'คุณคือบรรณาธิการรายงานโหราศาสตร์จีนระดับมืออาชีพของแพลตฟอร์ม 命合 Mìnghé ' +
        'น้ำเสียงแบรนด์: สุขุม มั่นใจ ให้เกียรติศาสตร์ อธิบายมีเหตุผล อบอุ่นแบบมืออาชีพ ' +
        'ไม่ขายฝันเวอร์ ไม่ใช้ภาษาหมอดูข้างทาง ไม่ตลกโปกฮา ' +
        'หน้าที่ของคุณคือ "เรียบเรียงภาษาให้สละสลวย" เท่านั้น — ' +
        'ห้ามเปลี่ยนตัวเลข คะแนน ชื่อเสา อักษรจีน ธาตุ หรือข้อเท็จจริงใดๆ ' +
        'ห้ามเพิ่มคำทำนายใหม่ที่ไม่มีในต้นฉบับ ห้ามตัดคำเตือน/หมายเหตุออก',
      messages: [
        {
          role: 'user',
          content:
            `เรียบเรียงรายงานความเหมาะสมของคุณ${context.subjectName}กับ${context.orgLabel} ` +
            `(ดัชนีสมพงษ์ ${context.score}/100) ให้ภาษาลื่นไหลเป็นธรรมชาติขึ้น โดยคงโครงสร้าง section เดิมทุกประการ\n\n` +
            `ตอบเป็น JSON เท่านั้น รูปแบบ: {"sections":[{"id":"...","title":"...","paragraphs":["..."]}]}\n\n` +
            `ต้นฉบับ:\n${JSON.stringify({ sections }, null, 1)}`,
        },
      ],
    })

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
    const parsed = extractJson<{ sections: NarrativeSection[] }>(text)
    if (!parsed?.sections || !Array.isArray(parsed.sections)) return null

    // ความปลอดภัย: ต้องมี section ครบทุก id เดิม ไม่งั้นถือว่าใช้ไม่ได้
    const originalIds = new Set(sections.map((s) => s.id))
    const polishedIds = new Set(parsed.sections.map((s) => s.id))
    for (const id of originalIds) {
      if (!polishedIds.has(id)) return null
    }
    return parsed.sections
  } catch {
    return null
  }
}

/**
 * อ่านโหงวเฮ้งจากรูปถ่ายด้วย Claude vision
 * กรอบการอ่าน: สามส่วน (三停) / ห้าอวัยวะ (五官) / สิบสองวัง (十二宮) เชิงการทำงาน
 */
export async function readFace(
  photo: { base64: string; mediaType: 'image/jpeg' | 'image/png' | 'image/webp' },
  subjectName: string,
): Promise<FaceReadingView> {
  const client = getClient()
  if (!client) {
    return {
      available: false,
      notice:
        'การอ่านโหงวเฮ้งยังไม่พร้อมใช้งานในออเดอร์นี้ (ระบบ AI vision ไม่ได้เปิดใช้) — รายงานฉบับนี้วิเคราะห์จากผังปาจือเป็นหลัก',
    }
  }

  try {
    const response = await client.messages.create({
      model: getModel(),
      max_tokens: 4000,
      system:
        'คุณคือซินแสโหงวเฮ้ง (面相) มืออาชีพของแพลตฟอร์ม 命合 Mìnghé วิเคราะห์ใบหน้าตามตำราจีนคลาสสิก ' +
        'ด้วยน้ำเสียงสุขุม ให้เกียรติ และสร้างสรรค์ — เน้นข้อสังเกตเชิงการทำงาน/บุคลิกภาพที่นำไปใช้ได้ ' +
        'หลีกเลี่ยงการฟันธงเชิงลบรุนแรงหรือคำทำนายเรื่องสุขภาพ/อายุขัย ' +
        'ระบุเสมอว่าเป็นข้อสังเกตเชิงศาสตร์ประกอบการพิจารณา ไม่ใช่ข้อเท็จจริงทางวิทยาศาสตร์',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: photo.mediaType,
                data: photo.base64,
              },
            },
            {
              type: 'text',
              text:
                `อ่านโหงวเฮ้งของคุณ${subjectName}จากรูปนี้ ตามกรอบ:\n` +
                `1. สามส่วน (三停) — สัดส่วนหน้าผาก/กลางหน้า/คาง สื่อถึงช่วงวัยและฐานพลัง\n` +
                `2. ห้าอวัยวะ (五官) — คิ้ว ตา จมูก ปาก หู เชิงบุคลิกภาพการทำงาน\n` +
                `3. ภาพรวมวังที่เกี่ยวกับการงาน (官祿宮) ทรัพย์ (財帛宮) และการเข้าสังคม\n\n` +
                `ถ้ารูปไม่ชัด/ไม่เห็นหน้าตรง ให้ระบุข้อจำกัดตรงๆ\n` +
                `ตอบเป็น JSON เท่านั้น: {"ok":true,"sections":[{"title":"...","content":"..."}]} ` +
                `หรือ {"ok":false,"reason":"..."} ถ้าอ่านไม่ได้`,
            },
          ],
        },
      ],
    })

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
    const parsed = extractJson<{
      ok: boolean
      reason?: string
      sections?: { title: string; content: string }[]
    }>(text)

    if (!parsed) {
      return { available: false, notice: 'ระบบอ่านโหงวเฮ้งตอบกลับในรูปแบบที่ไม่คาดคิด — ข้ามส่วนนี้' }
    }
    if (!parsed.ok || !parsed.sections?.length) {
      return {
        available: false,
        notice: `ไม่สามารถอ่านโหงวเฮ้งจากรูปที่ส่งมาได้${parsed.reason ? `: ${parsed.reason}` : ''} — แนะนำรูปหน้าตรง แสงชัด ไม่ใส่แว่นดำ/หมวก`,
      }
    }
    return { available: true, sections: parsed.sections }
  } catch {
    return {
      available: false,
      notice: 'เกิดข้อขัดข้องชั่วคราวในการอ่านโหงวเฮ้ง — รายงานฉบับนี้วิเคราะห์จากผังปาจือเป็นหลัก',
    }
  }
}

export function aiAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY)
}

export type { ReportData }
