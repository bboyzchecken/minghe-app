'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input, Label, Notice } from '@/components/ui'

interface AuthResponse {
  ok?: boolean
  redirect?: string
  error?: string
}

export function LoginForm() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // อ่านค่าฟอร์มก่อน await — currentTarget อาจหายหลัง async
    const form = new FormData(event.currentTarget)
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: String(form.get('email') ?? ''),
          password: String(form.get('password') ?? ''),
        }),
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
        <Label htmlFor="login-email">อีเมล</Label>
        <Input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
        />
      </div>
      <div>
        <Label htmlFor="login-password">รหัสผ่าน</Label>
        <Input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          required
        />
      </div>
      {error ? <Notice tone="danger">{error}</Notice> : null}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
      </Button>
    </form>
  )
}
