'use client'

/**
 * รับรหัสเข้าใช้จากลิงก์ `?code=…` แล้วเก็บไว้ตั้งแต่วินาทีแรกที่ผู้ทดสอบเปิดเว็บ
 *
 * ทำไมต้องรับตั้งแต่หน้าแรก ไม่รอตอนจะเปิดรายงาน (ตัดสิน 8 ก.ย. 2026 · แผน §3.2):
 * ถ้ารอไปถามตอนท้าย เราจะไม่รู้เลยว่า "คนที่หายไปกลางทางคือใคร"
 * ซึ่งเป็นข้อมูลที่มีค่าที่สุดของ UAT
 *
 * อ่านจาก `window.location.search` ตรง ๆ แทน `useSearchParams` เพราะแอปเป็น static export
 * — hook นั้นบังคับให้ต้องมี Suspense ครอบทั้งเลย์เอาต์โดยไม่จำเป็น
 *
 * คอมโพเนนต์นี้ไม่เรนเดอร์อะไรเลย และไม่ตรวจรหัสกับเซิร์ฟเวอร์
 * (การตรวจจริงเกิดที่หน้า /access และตอนปลดล็อกรายงาน)
 */

import { useEffect } from 'react'
import { looksLikeUatCode, readUatCode, saveUatCode } from '@/lib/access-code'

export function AccessCodeCapture() {
  useEffect(() => {
    let raw: string | null = null
    try {
      raw = new URLSearchParams(window.location.search).get('code')
    } catch {
      return
    }
    if (!raw) return

    const code = raw.trim().toUpperCase()
    if (!looksLikeUatCode(code)) return
    if (readUatCode() === code) return
    saveUatCode(code)
  }, [])

  return null
}
