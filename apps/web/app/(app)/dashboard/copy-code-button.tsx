'use client'

/**
 * ปุ่มคัดลอก "รหัสเปิดรายงาน" — ใช้ navigator.clipboard
 * แสดงสถานะ "คัดลอกแล้ว" ชั่วครู่หลังคัดลอกสำเร็จ
 */

import { useRef, useState } from 'react'
import { cn } from '@/lib/utils'

export function CopyCodeButton({ code, className }: { code: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      // เบราว์เซอร์ไม่รองรับ clipboard (เช่น ไม่ใช่ secure context) — ไม่ต้องทำอะไร
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="คัดลอกรหัสเปิดรายงาน"
      aria-live="polite"
      className={cn(
        'inline-flex items-center gap-1 rounded-sm border px-2 py-1 text-xs font-semibold transition-colors',
        copied
          ? 'border-jade/40 bg-jade/10 text-jade'
          : 'border-line bg-transparent text-ink-soft hover:border-gold hover:text-cinnabar-deep',
        className,
      )}
    >
      {copied ? 'คัดลอกแล้ว' : 'คัดลอกรหัส'}
    </button>
  )
}
