'use client'

/**
 * กล่อง "คุณมีสิทธิ์ใช้ฟรี" บนขั้นชำระเงินของ wizard
 * แสดงเมื่อแอดมินให้สิทธิ์ทดลองไว้ — ผู้ใช้เลือกได้ว่าจะใช้ครั้งนี้หรือเก็บไว้
 */

import { useMyCredits } from '@/lib/queries'

export function useApplicableCredit(product: 'employer' | 'jobseeker', depth?: string) {
  const { data } = useMyCredits()
  const now = Date.now()
  return (
    (data ?? []).find(
      (c) =>
        c.status === 'available' &&
        (c.product === 'any' || c.product === product) &&
        (!c.depth || !depth || c.depth === depth) &&
        (!c.expiresAt || new Date(c.expiresAt).getTime() > now),
    ) ?? null
  )
}

export function CreditNotice({
  credit,
  skip,
  onSkipChange,
}: {
  credit: ReturnType<typeof useApplicableCredit>
  skip: boolean
  onSkipChange: (v: boolean) => void
}) {
  if (!credit) return null
  return (
    <div className="mt-4 rounded-lg border border-jade/50 bg-jade/[0.08] px-4 py-3 text-sm">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 text-jade">🎁</span>
        <div className="flex-1">
          <div className="font-medium text-ink">คุณมีสิทธิ์ใช้งานฟรี 1 ครั้ง{credit.grantedBy ? ` จาก ${credit.grantedBy}` : ''}</div>
          <div className="text-xs text-ink-soft">
            {skip ? 'ครั้งนี้จะชำระตามปกติ และเก็บสิทธิ์ไว้ใช้ครั้งอื่น' : 'ครั้งนี้ไม่ต้องชำระเงิน — ระบบหักสิทธิ์ให้อัตโนมัติ และออกใบเสร็จ 0 บาทไว้ให้'}
          </div>
          <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-xs text-ink-soft">
            <input type="checkbox" checked={skip} onChange={(e) => onSkipChange(e.target.checked)} className="h-3.5 w-3.5 accent-[#b07d2b]" />
            เก็บสิทธิ์ไว้ ครั้งนี้ชำระเงินตามปกติ
          </label>
        </div>
      </div>
    </div>
  )
}
