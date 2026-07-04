'use client'

/**
 * ฟอร์มปรับเครดิตผู้ใช้ (+/-) ต่อแถวในตาราง /admin/users
 * เรียก POST /api/admin/users/[id]/credits พร้อม confirm ก่อนทำ
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface CreditFormProps {
  userId: string
  email: string
}

export function CreditForm({ userId, email }: CreditFormProps) {
  const router = useRouter()
  const [amount, setAmount] = useState('1')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function adjust(sign: 1 | -1): Promise<void> {
    const n = Number(amount)
    if (!Number.isInteger(n) || n < 1 || n > 1000) {
      setError('กรอกจำนวนเต็ม 1-1,000')
      return
    }
    const delta = sign * n
    const confirmText =
      sign === 1
        ? `ยืนยันเติมเครดิต ${n} หน่วยให้ ${email}?`
        : `ยืนยันหักเครดิต ${n} หน่วยจาก ${email}?`
    if (!window.confirm(confirmText)) return

    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/users/${userId}/credits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setError(data.error ?? 'ปรับเครดิตไม่สำเร็จ โปรดลองอีกครั้ง')
        return
      }
      router.refresh()
    } catch {
      setError('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ')
    } finally {
      setBusy(false)
    }
  }

  const btnBase =
    'inline-flex h-8 w-8 items-center justify-center rounded-sm border text-sm font-bold transition-colors disabled:pointer-events-none disabled:opacity-50'

  return (
    <div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => void adjust(-1)}
          disabled={busy}
          className={cn(btnBase, 'border-line text-cinnabar-deep hover:border-cinnabar-deep')}
          aria-label={`หักเครดิตของ ${email}`}
          title="หักเครดิต"
        >
          −
        </button>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="numeric"
          disabled={busy}
          aria-label={`จำนวนเครดิตที่จะปรับของ ${email}`}
          className="h-8 w-14 rounded-sm border border-line bg-cloud px-2 text-center font-mono text-sm text-ink focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
        />
        <button
          type="button"
          onClick={() => void adjust(1)}
          disabled={busy}
          className={cn(btnBase, 'border-line text-jade hover:border-jade')}
          aria-label={`เติมเครดิตให้ ${email}`}
          title="เติมเครดิต"
        >
          +
        </button>
      </div>
      {error ? <p className="mt-1 text-xs text-cinnabar-deep">{error}</p> : null}
    </div>
  )
}
