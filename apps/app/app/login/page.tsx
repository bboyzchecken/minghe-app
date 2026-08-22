'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { GoogleSignInButton } from '@/components/google-sign-in-button'
import { type MockAccount } from '@/lib/api'
import { IS_MOCK } from '@/lib/env'
import { useMockAccounts } from '@/lib/queries'
import { ROLE_META, roleKeyOf, type RoleMeta } from '@/lib/roles'
import { homeForUser, takeReturnTo, useSession } from '@/lib/session'

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const { user, loading, signIn } = useSession()
  const { data: accounts = [] } = useMockAccounts()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // ข้อความแจ้งจากหน้าอื่น เช่น รีเซ็ตรหัสผ่านสำเร็จ
  const notice = params.get('notice') === 'password-reset' ? 'ตั้งรหัสผ่านใหม่เรียบร้อย เข้าสู่ระบบด้วยรหัสผ่านใหม่ได้เลย' : null

  // ทางออกจากหน้านี้มีทางเดียว — ทั้งกรณีเพิ่งล็อกอินสำเร็จ และกรณีมีเซสชันอยู่แล้ว
  // (แยกเป็นสองที่เมื่อไร returnTo จะถูกอ่านซ้ำแล้วหายไปก่อนได้ใช้)
  useEffect(() => {
    if (loading || !user) return
    router.replace(takeReturnTo() ?? homeForUser(user))
  }, [loading, user, router])

  async function submit(nextEmail: string, nextPassword: string) {
    setBusy(true)
    setError(null)
    try {
      await signIn(nextEmail, nextPassword)
      // ไม่ต้อง navigate เอง — effect ด้านบนจัดการให้เมื่อ user ถูกตั้งค่าแล้ว
    } catch (e) {
      setError(e instanceof Error ? e.message : 'เข้าสู่ระบบไม่สำเร็จ')
      setBusy(false)
    }
  }

  return (
    <div className="container-page max-w-md py-14 md:py-20">
      <div className="text-center">
        <span className="cjk text-2xl text-gold">命合</span>
        <h1 className="mt-2 text-3xl">เข้าสู่ระบบ</h1>
        <p className="mt-2 text-sm text-ink-soft">
          เข้าเพื่อดูรายงานที่เคยสร้าง และข้อมูลที่ระบบจำไว้ให้
        </p>
      </div>

      <div className="card mt-8 p-6 md:p-8">
        {notice && (
          <p className="mb-5 rounded-lg border border-jade/40 bg-jade/[0.07] px-4 py-2.5 text-sm text-jade">
            {notice}
          </p>
        )}

        {/* F-02 — ปุ่มเปิดใช้งานเองเมื่อ API ประกาศว่ามี OAuth client แล้ว */}
        <GoogleSignInButton onError={setError} disabled={busy} />

        <div className="my-5 flex items-center gap-3 text-xs text-muted">
          <span className="h-px flex-1 bg-line" />
          หรือใช้อีเมล
          <span className="h-px flex-1 bg-line" />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            void submit(email, password)
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
          <label className="mt-4 block">
            <span className="flex items-center justify-between">
              <span className="field-label">รหัสผ่าน</span>
              <Link href="/forgot-password" className="text-xs text-gold hover:underline">
                ลืมรหัสผ่าน?
              </Link>
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </label>

          {error && (
            <p className="mt-4 rounded-lg border border-terracotta/40 bg-terracotta/[0.07] px-4 py-2.5 text-sm text-terracotta">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || !email || !password}
            className="btn-primary mt-6 w-full py-3 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-ink-soft">
          ยังไม่มีบัญชี?{' '}
          <Link href="/register" className="font-medium text-gold hover:underline">
            สมัครสมาชิก
          </Link>
        </p>

        {accounts.length > 0 && (
          <>
            <div className="gold-divider my-6" />
            <div className="text-sm font-medium text-ink">บัญชีทดลอง — คลิกเพื่อเข้าใช้ทันที</div>
            <p className="mt-1 text-xs text-muted">
              {IS_MOCK
                ? 'เปิดอยู่เพราะระบบทำงานในโหมดสาธิต — ตั้งค่าที่ MINGHE_MODE ใน .env ของโปรเจกต์'
                : 'เซิร์ฟเวอร์ที่เชื่อมอยู่ตั้งเป็นโหมดสาธิต จึงยังเปิดบัญชีทดลองไว้'}
            </p>

            {/* จัดกลุ่มตามฝั่ง + บอกชัดว่าเข้าแล้วเห็นอะไร ทำอะไรได้ (UAT: ทางเข้ายังไม่ชัด) */}
            <div className="mt-4 space-y-5">
              {GROUPS.map((group) => {
                const groupAccounts = accounts.filter(group.match)
                if (groupAccounts.length === 0) return null
                return (
                  <div key={group.title}>
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
                      {group.title}
                    </div>
                    <div className="space-y-2">
                      {groupAccounts.map((account) => (
                        <AccountCard
                          key={account.email}
                          account={account}
                          busy={busy}
                          onPick={() => {
                            setEmail(account.email)
                            setPassword(account.password)
                            void submit(account.email, account.password)
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        <p className="mt-6 text-center text-sm text-ink-soft">
          ซื้อไปแล้วแต่ยังไม่มีบัญชี?{' '}
          <Link href="/r" className="font-medium text-gold hover:underline">
            เปิดรายงานด้วยรหัส
          </Link>
        </p>
      </div>

      <p className="mt-6 text-center text-xs text-muted">
        การเข้าสู่ระบบถือว่ายอมรับ{' '}
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

const GROUPS: { title: string; match: (a: MockAccount) => boolean }[] = [
  { title: 'ฝั่งองค์กร (Employer)', match: (a) => a.side === 'employer' },
  { title: 'ฝั่งคนทำงาน (Job Seeker)', match: (a) => a.side === 'jobseeker' },
  { title: 'หลังบ้าน (ทีมงาน Mìnghé)', match: (a) => a.side === 'admin' },
]

function roleForAccount(account: MockAccount): RoleMeta {
  return ROLE_META[roleKeyOf({ side: account.side, orgRole: account.orgRole })]
}

/**
 * การ์ดบัญชีทดลอง — แถบสีบทบาท + preview ว่ากดแล้วจะเห็นอะไร ทำอะไรได้/ไม่ได้
 * เนื้อหามาจาก ROLE_META ที่เดียว จึงตรงกับที่ dashboard แต่ละฝั่งแสดงเสมอ
 */
function AccountCard({
  account,
  busy,
  onPick,
}: {
  account: MockAccount
  busy: boolean
  onPick: () => void
}) {
  const role = roleForAccount(account)
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onPick}
      className="group w-full overflow-hidden rounded-lg border border-line bg-cloud text-left transition hover:border-gold/50 hover:shadow-soft disabled:opacity-60"
      style={{ borderLeftWidth: 3, borderLeftColor: role.color }}
    >
      <div className="p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-sm font-medium text-ink">
            {account.name}
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{ color: role.color, background: `${role.color}14` }}
            >
              {role.badge}
            </span>
          </span>
          <span className="font-body-en text-[11px] text-muted">{account.email}</span>
        </div>

        <div className="mt-2 grid gap-1 text-xs">
          <div className="flex items-start gap-1.5 text-ink-soft">
            <span className="mt-0.5 flex-none text-muted">เห็น:</span>
            <span>{role.sees.join(' · ')}</span>
          </div>
          <div className="flex items-start gap-1.5 text-ink-soft">
            <span className="mt-0.5 flex-none text-jade">ทำได้:</span>
            <span>{role.can.slice(0, 3).join(' · ')}</span>
          </div>
          {role.cant.length > 0 && (
            <div className="flex items-start gap-1.5 text-ink-soft">
              <span className="mt-0.5 flex-none text-terracotta">ทำไม่ได้:</span>
              <span>{role.cant[0]}</span>
            </div>
          )}
        </div>
      </div>
    </button>
  )
}
