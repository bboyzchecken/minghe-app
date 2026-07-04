'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, FieldHint, Notice } from '@/components/ui'
import { REPORT_PACKS } from '@/lib/pricing'
import { cn, formatBaht } from '@/lib/utils'

interface BuyResponse {
  ok?: boolean
  credits?: number
  error?: string
}

export function BuyCreditsForm() {
  const router = useRouter()
  const [packId, setPackId] = useState<string>(
    REPORT_PACKS.find((p) => p.highlight)?.id ?? REPORT_PACKS[0]?.id ?? 'single',
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)
    try {
      const res = await fetch('/api/credits/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId }),
      })
      const data = (await res.json().catch(() => null)) as BuyResponse | null
      if (res.ok && data?.ok) {
        setSuccess(`เติมเครดิตสำเร็จ +${data.credits ?? ''} เครดิต — ยอดคงเหลืออัปเดตแล้ว`)
        router.refresh()
      } else {
        setError(data?.error ?? 'เกิดข้อผิดพลาด โปรดลองใหม่อีกครั้ง')
      }
    } catch {
      setError('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ โปรดลองใหม่อีกครั้ง')
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-sm font-semibold text-ink">เติมแพ็กรายงาน</p>
      <div className="space-y-2" role="radiogroup" aria-label="เลือกแพ็กรายงาน">
        {REPORT_PACKS.map((pack) => {
          const selected = packId === pack.id
          return (
            <label
              key={pack.id}
              className={cn(
                'flex cursor-pointer items-center justify-between gap-3 rounded-md border px-4 py-3 transition-colors',
                selected ? 'border-gold bg-gold/5' : 'border-line bg-cloud hover:border-gold/60',
              )}
            >
              <span className="flex items-center gap-3">
                <input
                  type="radio"
                  name="pack"
                  value={pack.id}
                  checked={selected}
                  onChange={() => setPackId(pack.id)}
                  className="accent-cinnabar"
                />
                <span className="flex flex-col">
                  <span className="text-sm font-semibold text-ink">
                    {pack.label}
                    {pack.highlight ? (
                      <span className="ml-2 rounded-full bg-gold/10 px-2 py-0.5 text-[10px] font-semibold text-gold">
                        คุ้มที่สุด
                      </span>
                    ) : null}
                  </span>
                  <span className="text-xs text-muted">
                    เฉลี่ย {formatBaht(pack.perReportSatang)}/รายงาน
                  </span>
                </span>
              </span>
              <span className="shrink-0 font-mono text-sm font-semibold text-ink">
                {formatBaht(pack.priceSatang)}
              </span>
            </label>
          )
        })}
      </div>
      {error ? <Notice tone="danger">{error}</Notice> : null}
      {success ? <Notice tone="success">{success}</Notice> : null}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'กำลังดำเนินการ…' : 'ชำระเงินและเติมเครดิต'}
      </Button>
      <FieldHint>
        โหมดทดสอบ: ระบบบันทึกการชำระเงินสำเร็จทันที (โครงพร้อมเชื่อม Stripe/Omise)
      </FieldHint>
    </form>
  )
}
