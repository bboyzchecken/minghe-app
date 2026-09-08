'use client'

/**
 * การ์ดยืนยันรหัสเข้าใช้ — แทนที่ขั้นชำระเงินในรอบ UAT
 *
 * รอบนี้ยังไม่เปิดเกตเวย์ ผู้ทดสอบจึงปลดล็อกรายงานด้วย "รหัสเข้าใช้" ที่ทีมงานแจกให้
 * รหัสถูกเก็บไว้ตั้งแต่เปิดเว็บครั้งแรก (ลิงก์ ?code= หรือหน้า /access) การ์ดนี้จึงแค่
 * ยืนยันให้ผู้ใช้เห็นว่ากำลังใช้รหัสไหน และกันไม่ให้เดินต่อถ้ายังไม่มีรหัส
 *
 * ⚠️ ไม่ได้ลบระบบชำระเงิน — ปุ่มและยอดเงินยังอยู่ครบ รอเปิด GB Prime Pay กลับหลัง UAT
 */

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { readUatCode } from '@/lib/access-code'

export function AccessCodeCard({ onReady }: { onReady?: (ready: boolean) => void }) {
  const [code, setCode] = useState<string | null>(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const stored = readUatCode()
    setCode(stored)
    setChecked(true)
    onReady?.(Boolean(stored))
    // onReady เป็น setState ของหน้าแม่ — ผูกไว้ครั้งเดียวพอ ไม่งั้นจะวนไม่จบ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!checked) return null

  if (!code) {
    return (
      <div className="mt-4 rounded-lg border border-terracotta/40 bg-terracotta/[0.07] px-4 py-3 text-sm">
        <div className="font-medium text-terracotta">ยังไม่ได้กรอกรหัสเข้าใช้</div>
        <p className="mt-1 text-ink-soft">
          รอบทดสอบนี้ใช้รหัสเข้าใช้แทนการชำระเงิน — กรอกรหัสที่ทีมงานส่งให้ก่อนจึงจะเปิดรายงานได้
        </p>
        <Link href="/access" className="mt-2 inline-block font-medium text-gold hover:underline">
          ไปกรอกรหัส →
        </Link>
      </div>
    )
  }

  return (
    <div className="mt-4 rounded-lg border border-jade/40 bg-jade/[0.06] px-4 py-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-ink-soft">
          ปลดล็อกด้วยรหัสเข้าใช้ <span className="font-medium text-ink">{code}</span>
        </span>
        <Link href="/access" className="text-xs text-muted underline hover:text-ink">
          เปลี่ยนรหัส
        </Link>
      </div>
      <p className="mt-1 text-xs text-muted">
        รอบทดสอบนี้ไม่มีการเก็บเงิน — ยอดที่แสดงเป็นราคาจริงที่จะใช้เมื่อเปิดขาย
      </p>
    </div>
  )
}
