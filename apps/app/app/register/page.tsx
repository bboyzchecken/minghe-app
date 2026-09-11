'use client'

/**
 * สมัครสมาชิกด้วยอีเมล (F-02) — สองขั้น
 *   1. อีเมล + เลือกว่าเป็นองค์กรหรือคนทำงาน → ขอ OTP
 *   2. กรอก OTP + ชื่อ + รหัสผ่าน → สร้างบัญชี (ฝั่งองค์กรจะได้องค์กรที่ตัวเองเป็นเจ้าของทันที)
 *
 * ต้องยืนยันอีเมลก่อนใช้งานเสมอ เพราะรายงานส่งทางอีเมล — พิมพ์ผิด = จ่ายแล้วไม่ได้ของ (ข้อสรุป F-02)
 * ยกเว้นเมื่อ API ปิด OTP ไว้ (/mode → otp_required=false) จะเหลือขั้นเดียว กรอกทุกอย่างแล้วสร้างบัญชีเลย
 * สมัครสำเร็จแล้วเข้าระบบทันที และเด้งกลับไปหน้าที่ค้างไว้ (F-03)
 */

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { GoogleSignInButton } from '@/components/google-sign-in-button'
import { OtpField, OtpHint } from '@/components/otp-field'
import type { AccountType, OtpChallenge } from '@/lib/api'
import { useRegister, useRequestRegister, useRuntimeConfig } from '@/lib/queries'
import { homeForUser, takeReturnTo, useSession } from '@/lib/session'

export default function RegisterPage() {
  const router = useRouter()
  const { user, loading } = useSession()
  const { data: config } = useRuntimeConfig()
  const requestOtp = useRequestRegister()
  const register = useRegister()

  const [accountType, setAccountType] = useState<AccountType>('employer')
  const [email, setEmail] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [challenge, setChallenge] = useState<OtpChallenge | null>(null)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)

  // ยังโหลด /mode ไม่เสร็จ → ถือว่าต้องใช้ OTP ไว้ก่อน
  const otpRequired = config?.otpRequired ?? true

  // สมัครสำเร็จ (หรือมีเซสชันอยู่แล้ว) → ออกจากหน้านี้ทางเดียว
  useEffect(() => {
    if (loading || !user) return
    router.replace(takeReturnTo() ?? homeForUser(user))
  }, [loading, user, router])

  function organizationMissing() {
    if (accountType === 'employer' && !organizationName.trim()) {
      setError('กรุณาระบุชื่อองค์กร')
      return true
    }
    return false
  }

  async function sendOtp() {
    setError(null)
    if (organizationMissing()) return
    try {
      const result = await requestOtp.mutateAsync(email.trim())
      setChallenge(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ส่งรหัสยืนยันไม่สำเร็จ')
    }
  }

  async function submitRegister() {
    setError(null)
    if (organizationMissing()) return
    if (password.length < 8) {
      setError('รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร')
      return
    }
    if (password !== confirm) {
      setError('รหัสผ่านทั้งสองช่องไม่ตรงกัน')
      return
    }
    try {
      await register.mutateAsync({
        email: email.trim(),
        ref: challenge?.ref ?? '',
        code,
        name: name.trim(),
        password,
        accountType,
        organizationName: accountType === 'employer' ? organizationName.trim() : undefined,
      })
      // เซสชันถูกตั้งใน useRegister → effect ด้านบนพาไปหน้าถัดไป
    } catch (e) {
      setError(e instanceof Error ? e.message : 'สมัครสมาชิกไม่สำเร็จ')
    }
  }

  const step = challenge ? 2 : 1

  const accountFields = (
    <>
      <label className="mt-4 block">
        <span className="field-label">ชื่อที่ใช้แสดง</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="field"
          placeholder={accountType === 'employer' ? 'เช่น คุณบัส' : 'เช่น คุณนุช'}
          autoComplete="name"
        />
      </label>
      <label className="mt-4 block">
        <span className="field-label">รหัสผ่าน (อย่างน้อย 8 ตัวอักษร)</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="field"
          autoComplete="new-password"
        />
      </label>
      <label className="mt-4 block">
        <span className="field-label">ยืนยันรหัสผ่าน</span>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="field"
          autoComplete="new-password"
        />
      </label>
    </>
  )

  return (
    <div className="container-page max-w-md py-14 md:py-20">
      <div className="text-center">
        <span className="cjk text-2xl text-gold">命合</span>
        <h1 className="mt-2 text-3xl">สมัครสมาชิก</h1>
        <p className="mt-2 text-sm text-ink-soft">
          บัญชีเดียวใช้ได้ทั้งฝั่งองค์กรและคนทำงาน — เริ่มจากฝั่งที่คุณใช้บ่อยที่สุด
        </p>
      </div>

      <div className="card mt-8 p-6 md:p-8">
        {otpRequired && (
          <ol className="mb-6 flex items-center gap-2 text-xs text-muted">
            <StepDot n={1} active={step === 1} done={step > 1} label="อีเมล" />
            <span className="h-px flex-1 bg-line" />
            <StepDot n={2} active={step === 2} done={false} label="ยืนยัน + ตั้งรหัสผ่าน" />
          </ol>
        )}

        {step === 1 && (
          <>
            {/* สมัครด้วย Google ได้เลย ไม่ต้องผ่าน OTP — บัญชี Google ยืนยันอีเมลมาแล้ว (F-02) */}
            <GoogleSignInButton onError={setError} />
            <div className="my-5 flex items-center gap-3 text-xs text-muted">
              <span className="h-px flex-1 bg-line" />
              หรือสมัครด้วยอีเมล
              <span className="h-px flex-1 bg-line" />
            </div>
          </>
        )}

        {step === 1 && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void (otpRequired ? sendOtp() : submitRegister())
            }}
            noValidate
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <TypeCard
                active={accountType === 'employer'}
                onClick={() => setAccountType('employer')}
                title="ฉันเป็นองค์กร"
                desc="วิเคราะห์ candidate และทีม · คุณจะเป็นเจ้าของบัญชีองค์กร"
              />
              <TypeCard
                active={accountType === 'jobseeker'}
                onClick={() => setAccountType('jobseeker')}
                title="ฉันเป็นคนหางาน"
                desc="เช็กความสมพงษ์กับบริษัทที่สนใจ"
              />
            </div>

            {accountType === 'employer' && (
              <label className="mt-4 block">
                <span className="field-label">ชื่อองค์กร</span>
                <input
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  className="field"
                  placeholder="เช่น บจก. มงคลเทรด"
                  autoComplete="organization"
                />
                <span className="mt-1 block text-xs text-muted">
                  แนะนำให้ใช้ชื่อตามข้อมูลจดทะเบียน (DBD) — แก้ไขภายหลังได้
                </span>
              </label>
            )}

            <label className="mt-4 block">
              <span className="field-label">อีเมล</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="field"
                placeholder="you@example.com"
                autoComplete="email"
              />
              <span className="mt-1 block text-xs text-muted">
                {otpRequired
                  ? 'ใช้อีเมลอะไรก็ได้ — รายงานและรหัสเปิดจะส่งไปที่อีเมลนี้ จึงต้องยืนยันก่อนใช้งาน'
                  : 'ใช้อีเมลอะไรก็ได้ — รายงานและรหัสเปิดจะส่งไปที่อีเมลนี้ ตรวจตัวสะกดให้ถูกต้อง'}
              </span>
            </label>

            {!otpRequired && accountFields}

            {error && <ErrorBox message={error} />}

            {otpRequired ? (
              <button
                type="submit"
                disabled={requestOtp.isPending || !email}
                className="btn-primary mt-6 w-full py-3 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {requestOtp.isPending ? 'กำลังส่งรหัส…' : 'ส่งรหัสยืนยันไปที่อีเมล'}
              </button>
            ) : (
              <button
                type="submit"
                disabled={register.isPending || !email || !name || !password || !confirm}
                className="btn-primary mt-6 w-full py-3 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {register.isPending ? 'กำลังสร้างบัญชี…' : 'สร้างบัญชีและเข้าสู่ระบบ'}
              </button>
            )}
          </form>
        )}

        {step === 2 && challenge && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void submitRegister()
            }}
            noValidate
          >
            <OtpHint email={email} challenge={challenge} />
            <OtpField value={code} onChange={setCode} />

            {accountFields}

            {error && <ErrorBox message={error} />}

            <button
              type="submit"
              disabled={register.isPending || code.length !== 6 || !name || !password || !confirm}
              className="btn-primary mt-6 w-full py-3 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {register.isPending ? 'กำลังสร้างบัญชี…' : 'สร้างบัญชีและเข้าสู่ระบบ'}
            </button>

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
          มีบัญชีอยู่แล้ว?{' '}
          <Link href="/login" className="font-medium text-gold hover:underline">
            เข้าสู่ระบบ
          </Link>
        </p>
      </div>

      <p className="mt-6 text-center text-xs text-muted">
        การสมัครถือว่ายอมรับ{' '}
        <Link href="/legal/terms" className="text-gold hover:underline">
          เงื่อนไขการใช้งาน
        </Link>{' '}
        และ{' '}
        <Link href="/legal/privacy" className="text-gold hover:underline">
          นโยบายความเป็นส่วนตัว
        </Link>
      </p>
    </div>
  )
}

function StepDot({ n, active, done, label }: { n: number; active: boolean; done: boolean; label: string }) {
  return (
    <li className="flex items-center gap-1.5">
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold ${
          active ? 'bg-gold text-cloud' : done ? 'bg-jade text-cloud' : 'bg-paper-warm text-muted'
        }`}
      >
        {done ? '✓' : n}
      </span>
      <span className={active ? 'font-medium text-ink' : ''}>{label}</span>
    </li>
  )
}

function TypeCard({
  active,
  onClick,
  title,
  desc,
}: {
  active: boolean
  onClick: () => void
  title: string
  desc: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border p-4 text-left transition ${
        active ? 'border-gold bg-gold/[0.06] shadow-soft' : 'border-line bg-cloud hover:border-gold/40'
      }`}
    >
      <div className="font-medium text-ink">{title}</div>
      <div className="mt-1 text-xs text-ink-soft">{desc}</div>
    </button>
  )
}

function ErrorBox({ message }: { message: string }) {
  return (
    <p className="mt-4 rounded-lg border border-terracotta/40 bg-terracotta/[0.07] px-4 py-2.5 text-sm text-terracotta">
      {message}
    </p>
  )
}
