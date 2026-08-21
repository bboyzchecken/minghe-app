'use client'

/**
 * ลืมรหัสผ่าน (F-02) — อีเมล → OTP → ตั้งรหัสผ่านใหม่ → กลับไปหน้าเข้าสู่ระบบ
 */

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { OtpField, OtpHint } from '@/components/otp-field'
import type { OtpChallenge } from '@/lib/api'
import { useRequestPasswordReset, useResetPassword } from '@/lib/queries'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const requestOtp = useRequestPasswordReset()
  const reset = useResetPassword()

  const [email, setEmail] = useState('')
  const [challenge, setChallenge] = useState<OtpChallenge | null>(null)
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function sendOtp() {
    setError(null)
    try {
      setChallenge(await requestOtp.mutateAsync(email.trim()))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ส่งรหัสยืนยันไม่สำเร็จ')
    }
  }

  async function submitReset() {
    setError(null)
    if (password.length < 8) {
      setError('รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร')
      return
    }
    if (password !== confirm) {
      setError('รหัสผ่านทั้งสองช่องไม่ตรงกัน')
      return
    }
    try {
      await reset.mutateAsync({ email: email.trim(), ref: challenge?.ref ?? '', code, password })
      router.replace('/login?notice=password-reset')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ตั้งรหัสผ่านใหม่ไม่สำเร็จ')
    }
  }

  return (
    <div className="container-page max-w-md py-14 md:py-20">
      <div className="text-center">
        <span className="cjk text-2xl text-gold">命合</span>
        <h1 className="mt-2 text-3xl">ตั้งรหัสผ่านใหม่</h1>
        <p className="mt-2 text-sm text-ink-soft">เราจะส่งรหัสยืนยันไปที่อีเมลที่ใช้สมัคร</p>
      </div>

      <div className="card mt-8 p-6 md:p-8">
        {!challenge ? (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void sendOtp()
            }}
            noValidate
          >
            <label className="block">
              <span className="field-label">อีเมล</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="field"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </label>
            {error && <ErrorBox message={error} />}
            <button
              type="submit"
              disabled={requestOtp.isPending || !email}
              className="btn-primary mt-6 w-full py-3 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {requestOtp.isPending ? 'กำลังส่งรหัส…' : 'ส่งรหัสยืนยัน'}
            </button>
          </form>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void submitReset()
            }}
            noValidate
          >
            <OtpHint email={email} challenge={challenge} />
            {challenge.ref && (
              <>
                <OtpField value={code} onChange={setCode} />
                <label className="mt-4 block">
                  <span className="field-label">รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="field"
                    autoComplete="new-password"
                  />
                </label>
                <label className="mt-4 block">
                  <span className="field-label">ยืนยันรหัสผ่านใหม่</span>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="field"
                    autoComplete="new-password"
                  />
                </label>
              </>
            )}
            {error && <ErrorBox message={error} />}
            {challenge.ref && (
              <button
                type="submit"
                disabled={reset.isPending || code.length !== 6 || !password || !confirm}
                className="btn-primary mt-6 w-full py-3 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {reset.isPending ? 'กำลังบันทึก…' : 'ตั้งรหัสผ่านใหม่'}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setChallenge(null)
                setCode('')
                setError(null)
              }}
              className="mt-3 w-full text-center text-xs text-muted hover:text-gold"
            >
              ← แก้อีเมลหรือขอรหัสใหม่
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-ink-soft">
          <Link href="/login" className="font-medium text-gold hover:underline">
            ← กลับไปหน้าเข้าสู่ระบบ
          </Link>
        </p>
      </div>
    </div>
  )
}

function ErrorBox({ message }: { message: string }) {
  return (
    <p className="mt-4 rounded-lg border border-terracotta/40 bg-terracotta/[0.07] px-4 py-2.5 text-sm text-terracotta">
      {message}
    </p>
  )
}
