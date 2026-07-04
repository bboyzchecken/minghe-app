'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, FieldHint, Input, Label, Notice } from '@/components/ui'

interface AuthResponse {
  ok?: boolean
  redirect?: string
  error?: string
}

export function RegisterForm() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const name = String(form.get('name') ?? '').trim()
    const email = String(form.get('email') ?? '').trim()
    const password = String(form.get('password') ?? '')

    if (!name || !email) {
      setError('โปรดกรอกชื่อและอีเมลให้ครบถ้วน')
      return
    }
    if (password.length < 8) {
      setError('รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร')
      return
    }

    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })
      const data = (await res.json().catch(() => null)) as AuthResponse | null
      if (res.ok && data?.ok) {
        router.push(data.redirect ?? '/dashboard')
        router.refresh()
        return
      }
      setError(data?.error ?? 'เกิดข้อผิดพลาด โปรดลองใหม่อีกครั้ง')
    } catch {
      setError('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ โปรดลองใหม่อีกครั้ง')
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div>
        <Label htmlFor="register-name">ชื่อ-นามสกุล</Label>
        <Input
          id="register-name"
          name="name"
          type="text"
          autoComplete="name"
          placeholder="เช่น วรัญญา ตั้งใจดี"
          required
        />
      </div>
      <div>
        <Label htmlFor="register-email">อีเมล</Label>
        <Input
          id="register-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
        />
      </div>
      <div>
        <Label htmlFor="register-password">รหัสผ่าน</Label>
        <Input
          id="register-password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          minLength={8}
          required
        />
        <FieldHint>อย่างน้อย 8 ตัวอักษร</FieldHint>
      </div>
      {error ? <Notice tone="danger">{error}</Notice> : null}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'กำลังสร้างบัญชี…' : 'สมัครสมาชิก'}
      </Button>
      <p className="text-xs text-muted">
        การสมัครสมาชิกถือว่าคุณยอมรับการเก็บและใช้ข้อมูลตามนโยบายความเป็นส่วนตัว (PDPA)
        ของ 命合 Mìnghé
      </p>
    </form>
  )
}
