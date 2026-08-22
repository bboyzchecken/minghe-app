'use client'

/**
 * Funnel tracking — บันทึกว่าผู้ใช้เดินถึงขั้นไหนใน wizard
 *
 * ตอบคำถามของแอดมิน "คนที่ลองเล่นแต่ไม่จ่าย ไปสะดุดตรงไหน" (หน้า /admin → สถิติ)
 * เก็บแค่ชื่อขั้น + เวลา ไม่เก็บสิ่งที่กรอก (PDPA) · ผู้ใช้ที่ยังไม่ล็อกอินระบุด้วย anon id
 * ที่สุ่มไว้ใน localStorage — เมื่อล็อกอินแล้ว API ผูก anon id เข้ากับบัญชีให้เอง
 *
 * ทุกการเรียกเป็น fire-and-forget: ล้มเหลวเงียบ ๆ ไม่มีทางทำให้โฟลว์สั่งซื้อสะดุด
 */

import { client } from '@/lib/api'

const ANON_KEY = 'minghe:anon'

export function anonId(): string {
  if (typeof window === 'undefined') return ''
  try {
    let id = window.localStorage.getItem(ANON_KEY)
    if (!id) {
      id = `a-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
      window.localStorage.setItem(ANON_KEY, id)
    }
    return id
  } catch {
    return 'a-nostorage'
  }
}

/** กันส่งซ้ำในเซสชันเดียว (ผู้ใช้กดย้อนกลับ-ถัดไปหลายรอบไม่ควรนับหลายครั้ง) */
const sent = new Set<string>()

export function track(
  product: 'employer' | 'jobseeker',
  step: string,
  stepIndex: number,
  token?: string | null,
): void {
  const key = `${product}:${step}`
  if (sent.has(key)) return
  sent.add(key)
  void client.trackEvent({ anonId: anonId(), product, step, stepIndex }, token ?? null)
}

/** ชื่อขั้นที่อ่านได้ — ใช้ในหน้าแอดมิน */
export const STEP_LABELS: Record<string, string> = {
  wizard_start: 'เปิดหน้ากรอก',
  step_subject: 'กรอกผู้ถูกวิเคราะห์',
  step_org: 'กรอกฝ่ายองค์กร',
  step_addons: 'เลือกบริการเสริม',
  step_me: 'กรอกข้อมูลตัวเอง',
  step_company: 'กรอกบริษัท',
  step_review: 'หน้าตรวจทาน',
  checkout_view: 'เห็นหน้าชำระเงิน',
  login_gate: 'ติดหน้าล็อกอิน',
  paid: 'ชำระเงินแล้ว',
}

export function stepLabel(step: string): string {
  return STEP_LABELS[step] ?? step
}
