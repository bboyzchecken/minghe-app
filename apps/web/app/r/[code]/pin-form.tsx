'use client'

/**
 * ฟอร์มกรอก PIN เปิดรายงาน — POST /api/reports/open แล้ว refresh หน้าเมื่อผ่าน
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input, Label } from '@/components/ui'

export function PinForm({ code }: { code: string }) {
  const router = useRouter()
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (pin.length < 4) {
      setError('โปรดกรอก PIN ให้ครบถ้วน')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/reports/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, pin }),
      })
      const json = (await res.json()) as { ok?: boolean; error?: string }
      if (res.ok && json.ok) {
        router.refresh()
      } else {
        setError(json.error ?? 'ไม่สามารถเปิดรายงานได้')
        setSubmitting(false)
      }
    } catch {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ โปรดลองใหม่')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div>
        <Label htmlFor="report-pin">PIN สำหรับเปิดรายงาน</Label>
        <Input
          id="report-pin"
          name="pin"
          type="password"
          inputMode="numeric"
          value={pin}
          onChange={(e) => {
            setPin(e.target.value.replace(/\D/g, '').slice(0, 6))
            if (error) setError(null)
          }}
          placeholder="••••"
          className="text-center font-mono text-lg tracking-[0.4em]"
          autoComplete="off"
          maxLength={6}
          autoFocus
          aria-invalid={error ? true : undefined}
        />
        {error ? (
          <p className="mt-1.5 text-xs font-semibold text-cinnabar-deep">{error}</p>
        ) : null}
      </div>
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? 'กำลังตรวจสอบ…' : 'เปิดรายงาน'}
      </Button>
    </form>
  )
}
