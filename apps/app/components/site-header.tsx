'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { SessionUser } from '@/lib/api'
import { homeForUser, useSession } from '@/lib/session'
import { Logo } from './logo'
import { RoleBadge } from './role-badge'

const NAV = [
  { href: '/employer', label: 'สำหรับองค์กร' },
  { href: '/jobseeker', label: 'สำหรับคนทำงาน' },
  { href: '/pricing', label: 'ราคา' },
  { href: '/report', label: 'ตัวอย่างรายงาน' },
  { href: '/r', label: 'เปิดรายงาน' },
]

/**
 * ราคาแยกเป็นสองหน้าตามกลุ่มผู้ใช้ — คนที่ล็อกอินแล้วพาไปหน้าของฝั่งตัวเองเลย
 * จะได้ไม่ต้องเลือกซ้ำและไม่เห็นราคาอีกฝั่งจนสับสน
 */
function pricingHref(user: SessionUser | null): string {
  if (user?.side === 'employer') return '/pricing/employer'
  if (user?.side === 'jobseeker') return '/pricing/jobseeker'
  return '/pricing'
}

export function SiteHeader() {
  const [open, setOpen] = useState(false)
  const { user, loading, signOut } = useSession()
  const router = useRouter()

  function handleSignOut() {
    signOut()
    setOpen(false)
    router.push('/')
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/85 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between">
        {/* F-11 — โลโก้จริงแบบไม่มี tagline (ชิ้นที่ออกแบบมาสำหรับพื้นที่แคบ) */}
        <Logo variant="wordmark" height={34} />
        <nav className="hidden items-center gap-7 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href === '/pricing' ? pricingHref(user) : n.href}
              className="text-sm text-ink-soft transition-colors hover:text-gold"
            >
              {n.label}
            </Link>
          ))}

          {loading ? (
            <span className="h-8 w-28 animate-pulse rounded-md bg-paper-warm" aria-hidden="true" />
          ) : user ? (
            <>
              <Link
                href={homeForUser(user)}
                className="flex items-center gap-2 text-sm font-medium text-ink transition-colors hover:text-gold"
              >
                {user.name}
                <RoleBadge user={user} />
              </Link>
              <button onClick={handleSignOut} className="btn-ghost !px-4 !py-2 text-sm">
                ออกจากระบบ
              </button>
            </>
          ) : (
            <>
              {/* F-04 — "เข้าสู่ระบบ" ต้องอยู่ก่อนปุ่ม "เริ่มวิเคราะห์" ที่มุมขวาบน */}
              <Link href="/login" className="text-sm font-medium text-ink transition-colors hover:text-gold">
                เข้าสู่ระบบ
              </Link>
              <Link href="/employer/new" className="btn-primary text-sm">
                เริ่มวิเคราะห์
              </Link>
            </>
          )}
        </nav>

        <button
          className="md:hidden rounded-md border border-line p-2 text-ink-soft"
          onClick={() => setOpen((v) => !v)}
          aria-label="เมนู"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? <path d="M6 6l12 12M6 18L18 6" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {open && (
        <div className="border-t border-line bg-paper md:hidden">
          <nav className="container-page flex flex-col py-3">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href === '/pricing' ? pricingHref(user) : n.href}
                onClick={() => setOpen(false)}
                className="py-2.5 text-sm text-ink-soft"
              >
                {n.label}
              </Link>
            ))}

            {user ? (
              <>
                <Link
                  href={homeForUser(user)}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 py-2.5 text-sm font-medium text-ink"
                >
                  {user.name}
                  <RoleBadge user={user} />
                </Link>
                <button onClick={handleSignOut} className="btn-ghost mt-2 text-sm">
                  ออกจากระบบ
                </button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setOpen(false)} className="py-2.5 text-sm font-medium text-ink">
                  เข้าสู่ระบบ
                </Link>
                <Link href="/employer/new" onClick={() => setOpen(false)} className="btn-primary mt-2 text-sm">
                  เริ่มวิเคราะห์
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
