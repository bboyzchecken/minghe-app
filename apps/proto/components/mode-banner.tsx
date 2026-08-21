'use client'

import { API_BASE_URL, GOOGLE_LOGIN_ENABLED, IS_MOCK } from '@/lib/env'

/**
 * แถบบอกโหมดที่กำลังทำงานอยู่
 *
 * มีเพื่อไม่ให้เกิดความสับสนว่ากำลังดูข้อมูลจำลองหรือข้อมูลจริง —
 * เป็นคำถามแรกที่ผู้ทดสอบมักถามเวลาเห็นเลขไม่ตรงกับที่คาด
 */
export function ModeBanner() {
  return (
    <div
      className={`no-print border-b text-center text-xs ${
        IS_MOCK ? 'border-gold/30 bg-gold/[0.08] text-ink-soft' : 'border-jade/30 bg-jade/[0.07] text-ink-soft'
      }`}
    >
      <div className="container-page flex flex-wrap items-center justify-center gap-x-3 gap-y-1 py-1.5">
        <span className="inline-flex items-center gap-1.5 font-medium">
          <span
            className={`h-1.5 w-1.5 rounded-full ${IS_MOCK ? 'bg-gold' : 'bg-jade'}`}
            aria-hidden="true"
          />
          {IS_MOCK ? 'โหมดสาธิต (mock)' : 'โหมดใช้งานจริง (live)'}
        </span>
        <span className="text-muted">
          {IS_MOCK
            ? 'ข้อมูลเก็บในเบราว์เซอร์เครื่องนี้เท่านั้น · มีบัญชีทดลองให้กดที่หน้าเข้าสู่ระบบ'
            : `เชื่อมกับ API ที่ ${API_BASE_URL}`}
        </span>
        {!GOOGLE_LOGIN_ENABLED && <span className="text-muted">· Google login ยังไม่เปิดใช้งาน</span>}
      </div>
    </div>
  )
}
