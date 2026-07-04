'use client'

/**
 * ฟอร์มกรอกรหัสเปิดรายงาน — จัดรูปแบบอัตโนมัติขณะพิมพ์ (ตัวพิมพ์ใหญ่ + ขีดคั่น)
 * แล้วนำทางไป /r/[code]
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, FieldHint, Input, Label } from '@/components/ui'

/** จัดรูปแบบขณะพิมพ์: MHXXXXXXXX → MH-XXXX-XXXX */
function formatAsTyping(value: string): string {
  const raw = value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 10)
  if (raw.length <= 2) return raw
  if (raw.length <= 6) return `${raw.slice(0, 2)}-${raw.slice(2)}`
  return `${raw.slice(0, 2)}-${raw.slice(2, 6)}-${raw.slice(6)}`
}

export function CodeForm() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [opening, setOpening] = useState(false)

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const raw = code.replace(/-/g, '')
    if (raw.length !== 10) {
      setError('โปรดกรอกรหัสให้ครบ 10 ตัวอักษร ตามรูปแบบ MH-XXXX-XXXX')
      return
    }
    setError(null)
    setOpening(true)
    router.push(`/r/${encodeURIComponent(code)}`)
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div>
        <Label htmlFor="access-code">รหัสเปิดรายงาน</Label>
        <Input
          id="access-code"
          name="access-code"
          value={code}
          onChange={(e) => {
            setCode(formatAsTyping(e.target.value))
            if (error) setError(null)
          }}
          placeholder="MH-XXXX-XXXX"
          className="text-center font-mono text-lg tracking-[0.18em]"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          inputMode="text"
          maxLength={12}
          autoFocus
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'access-code-error' : undefined}
        />
        {error ? (
          <p id="access-code-error" className="mt-1.5 text-xs font-semibold text-cinnabar-deep">
            {error}
          </p>
        ) : (
          <FieldHint>พิมพ์ได้เลยไม่ต้องใส่ขีด — ระบบจัดรูปแบบให้อัตโนมัติ</FieldHint>
        )}
      </div>
      <Button type="submit" className="w-full" disabled={opening}>
        {opening ? 'กำลังเปิดรายงาน…' : 'เปิดรายงาน'}
      </Button>
    </form>
  )
}
