'use client'

import Link from 'next/link'

/**
 * กล่องยินยอมก่อนชำระเงิน (F-06 — Form UX Guide หน้า 15)
 *
 * ข้อความตามต้นฉบับ:
 *   "ฉันได้อ่านและยอมรับ [เงื่อนไขการใช้งาน] [นโยบายความเป็นส่วนตัว] และ [นโยบายการคืนเงิน]"
 *
 * หมายเหตุ: เวอร์ชันนี้ยังไม่บันทึก audit log ว่ายอมรับเมื่อไร/เวอร์ชันไหน
 * — ต้องรอ backend (ดู API: POST /api/consents)
 */
export function ConsentCheckbox({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label
      className={`mt-6 flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition ${
        checked ? 'border-gold bg-gold/[0.06]' : 'border-line bg-cloud hover:border-gold/40'
      }`}
    >
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 flex-none accent-[#b07d2b]"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="text-sm leading-relaxed text-ink-soft">
        ฉันได้อ่านและยอมรับ{' '}
        <LegalLink href="/legal/terms">เงื่อนไขการใช้งาน</LegalLink>{' '}
        <LegalLink href="/legal/privacy">นโยบายความเป็นส่วนตัว</LegalLink> และ{' '}
        <LegalLink href="/legal/refund">นโยบายการคืนเงิน</LegalLink>
      </span>
    </label>
  )
}

function LegalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="font-medium text-gold underline underline-offset-2 hover:text-gold/80"
    >
      {children}
    </Link>
  )
}
