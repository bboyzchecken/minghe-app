'use client'

/**
 * ปุ่ม "เข้าสู่ระบบด้วย Google" (F-02)
 *
 * สถานะของปุ่มมาจาก `/mode` ของ API ตอน runtime ไม่ใช่ค่าที่ฝังตอน build
 * — ได้ OAuth client id มาเมื่อไร ตั้งใน .env แล้วรีสตาร์ตแค่ API ปุ่มก็ใช้งานได้ทันที
 *
 * โหมดสาธิตไม่มี server ไว้ตรวจ ID token กับ Google จึงเปลี่ยนเป็นตัวเลือก "บัญชี Google จำลอง"
 * ขั้นตอนที่ผู้ใช้เห็นเหมือนของจริง (กด → เลือกบัญชี → เข้าระบบทันทีโดยไม่ต้องกรอกรหัสผ่าน)
 */

import { useState } from 'react'
import { IS_MOCK } from '@/lib/env'
import { mockGoogleToken, requestGoogleIdToken } from '@/lib/google'
import { useRuntimeConfig } from '@/lib/queries'
import { useSession } from '@/lib/session'

export function GoogleSignInButton({
  onError,
  disabled = false,
}: {
  onError: (message: string | null) => void
  disabled?: boolean
}) {
  const { data: config, isPending } = useRuntimeConfig()
  const { signInWithGoogle } = useSession()
  const [busy, setBusy] = useState(false)
  const [picking, setPicking] = useState(false)

  const enabled = Boolean(config?.googleLoginEnabled) && !isPending
  const demoAccounts = (config?.mockAccounts ?? []).filter((a) => a.side !== 'admin')

  async function signIn(idToken: string) {
    setBusy(true)
    onError(null)
    try {
      await signInWithGoogle(idToken)
      // ไม่ต้อง navigate เอง — หน้า login/register มี effect ที่พาไปต่อเมื่อมีเซสชันแล้ว
    } catch (e) {
      onError(e instanceof Error ? e.message : 'เข้าสู่ระบบด้วย Google ไม่สำเร็จ')
    } finally {
      setBusy(false)
      setPicking(false)
    }
  }

  async function handleClick() {
    if (IS_MOCK || !config?.googleClientId) {
      setPicking((v) => !v)
      return
    }
    onError(null)
    try {
      const idToken = await requestGoogleIdToken(config.googleClientId)
      await signIn(idToken)
    } catch (e) {
      onError(e instanceof Error ? e.message : 'เปิดหน้าต่างของ Google ไม่สำเร็จ')
    }
  }

  return (
    <div>
      <button
        type="button"
        disabled={disabled || busy || !enabled}
        title={enabled ? undefined : 'ยังไม่เปิดใช้งาน'}
        onClick={() => void handleClick()}
        className="flex w-full items-center justify-center gap-3 rounded-lg border border-line bg-cloud px-4 py-3 text-sm font-medium text-ink transition hover:border-gold/40 disabled:cursor-not-allowed disabled:opacity-55"
      >
        <GoogleMark />
        {busy ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบด้วย Google'}
      </button>

      {!enabled && !isPending && (
        <p className="mt-2 text-center text-xs text-muted">
          {config?.googleLoginNote ?? 'เร็ว ๆ นี้ — อยู่ระหว่างเชื่อมต่อ Google'}
        </p>
      )}

      {picking && (
        <div className="mt-3 rounded-lg border border-line bg-cloud p-3">
          <div className="text-xs font-medium text-ink">เลือกบัญชี Google (จำลอง)</div>
          <p className="mt-1 text-[11px] text-muted">
            โหมดสาธิตไม่มีเซิร์ฟเวอร์ไว้ตรวจกับ Google — เลือกบัญชีเพื่อดูโฟลว์หลังเข้าระบบ
          </p>
          <div className="mt-2 space-y-1.5">
            {demoAccounts.map((account) => (
              <button
                key={account.email}
                type="button"
                disabled={busy}
                onClick={() => void signIn(mockGoogleToken(account.email))}
                className="flex w-full items-center justify-between gap-2 rounded-md border border-line px-3 py-2 text-left text-xs transition hover:border-gold/50 disabled:opacity-60"
              >
                <span className="text-ink">{account.name}</span>
                <span className="font-body-en text-[11px] text-muted">{account.email}</span>
              </button>
            ))}
            {demoAccounts.length === 0 && (
              <p className="text-[11px] text-muted">ไม่มีบัญชีสาธิตให้เลือกในโหมดนี้</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}
