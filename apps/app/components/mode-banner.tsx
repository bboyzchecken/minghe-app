'use client'

import { IS_MOCK } from '@/lib/env'

/**
 * แถบเตือนเฉพาะโหมด mock
 *
 * โหมด live คือของจริง จึงไม่แสดงอะไร — แถบนี้มีไว้กันความสับสนเวลาเปิดโหมดสาธิต
 * ให้ลูกค้าตรวจ user process แล้วเห็นตัวเลขไม่ตรงกับที่คาด (Q0-2)
 */
export function ModeBanner() {
  if (!IS_MOCK) return null
  return (
    <div className="no-print border-b border-gold/30 bg-gold/[0.08] text-center text-xs text-ink-soft">
      <div className="container-page flex flex-wrap items-center justify-center gap-x-3 gap-y-1 py-1.5">
        <span className="inline-flex items-center gap-1.5 font-medium">
          <span className="h-1.5 w-1.5 rounded-full bg-gold" aria-hidden="true" />
          โหมดสาธิต (mock)
        </span>
        <span className="text-muted">
          ข้อมูลเก็บในเบราว์เซอร์เครื่องนี้เท่านั้น · มีบัญชีทดลองให้กดที่หน้าเข้าสู่ระบบ
        </span>
      </div>
    </div>
  )
}
