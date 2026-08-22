'use client'

/**
 * Workspace shell — โครงหน้าทำงานที่ทุกฝั่งใช้ร่วมกัน (องค์กร / คนทำงาน / แอดมิน)
 *
 * เดสก์ท็อป: แถบเมนูซ้ายสีเข้ม + เนื้อหาขวา
 * มือถือ:    แถบหัวบาง ๆ + แถบแท็บล่าง (สูงสุด 5 รายการ) — ใช้นิ้วโป้งถึงทุกเมนู
 *
 * หน้าที่อยู่ใน shell นี้จะไม่มี header/footer ของหน้าการตลาด (site-header ซ่อนให้เองตาม path)
 */

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { RequireLogin } from '@/components/require-login'
import { IS_MOCK } from '@/lib/env'
import { roleOf } from '@/lib/roles'
import { useSession } from '@/lib/session'
import { Icon, type IconName } from './icons'

export interface NavItem {
  href: string
  label: string
  icon: IconName
  /** ตัวเลขเล็ก ๆ ข้างเมนู เช่น งานรอรับ */
  badge?: number
  /** ซ่อนจากแถบล่างบนมือถือ (เมนูรอง) */
  mobileHidden?: boolean
}

export function WorkspaceShell({
  nav,
  brand,
  children,
  requirePath,
}: {
  nav: NavItem[]
  /** ป้ายใต้โลโก้ เช่น "Admin Console" / ชื่อองค์กร */
  brand: string
  children: React.ReactNode
  /** path ที่จะเด้งกลับมาหลังล็อกอิน */
  requirePath: string
}) {
  return (
    <RequireLogin path={requirePath}>
      <ShellFrame nav={nav} brand={brand}>
        {children}
      </ShellFrame>
    </RequireLogin>
  )
}

function ShellFrame({ nav, brand, children }: { nav: NavItem[]; brand: string; children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, signOut } = useSession()
  const role = user ? roleOf(user) : null

  function handleSignOut() {
    signOut()
    router.push('/')
  }

  const isActive = (href: string) =>
    pathname === href || (href !== '/admin' && pathname.startsWith(href + '/')) || (href === '/admin' && pathname === '/admin')

  const mobileNav = nav.filter((n) => !n.mobileHidden).slice(0, 5)

  return (
    <div className="ws-root flex">
      {/* ── sidebar (desktop) ── */}
      <aside className="no-print sticky top-0 hidden h-screen w-60 flex-none flex-col bg-ws-sidebar text-ws-sidebar-text md:flex">
        <div className="flex items-center gap-2.5 px-5 pb-4 pt-5">
          <span className="cjk text-xl leading-none text-gold-soft">命合</span>
          <div className="min-w-0">
            <div className="font-display-en text-base font-semibold leading-tight text-white">Mìnghé</div>
            <div className="truncate text-[11px] text-ws-sidebar-text/70">{brand}</div>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 px-3">
          {nav.map((n) => {
            const active = isActive(n.href)
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  active ? 'bg-white/10 font-medium text-white' : 'text-ws-sidebar-text hover:bg-ws-sidebar-hover hover:text-white'
                }`}
              >
                <Icon name={n.icon} size={17} className={active ? 'text-white' : 'text-ws-sidebar-text/80'} />
                <span className="flex-1">{n.label}</span>
                {n.badge ? (
                  <span className="rounded-full bg-ws-danger px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                    {n.badge}
                  </span>
                ) : null}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-white/10 p-3">
          <Link href="/" className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-ws-sidebar-text/80 hover:bg-ws-sidebar-hover hover:text-white">
            <Icon name="external" size={14} /> ไปหน้าเว็บไซต์
          </Link>
          <div className="mt-1 flex items-center gap-3 rounded-lg px-3 py-2">
            <Avatar name={user?.name ?? ''} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-white">{user?.name}</div>
              <div className="truncate text-[11px] text-ws-sidebar-text/70">{role?.badge} · {user?.email}</div>
            </div>
            <button onClick={handleSignOut} title="ออกจากระบบ" className="rounded-md p-1.5 text-ws-sidebar-text/70 hover:bg-ws-sidebar-hover hover:text-white">
              <Icon name="logout" size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── main ── */}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        {/* top bar (mobile) */}
        <header className="no-print sticky top-0 z-30 flex h-14 items-center justify-between border-b border-ws-border bg-ws-surface/95 px-4 backdrop-blur md:hidden">
          <div className="flex items-center gap-2">
            <span className="cjk text-lg leading-none text-gold">命合</span>
            <span className="text-sm font-semibold text-ws-ink">{brand}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href={nav.find((n) => n.icon === 'user')?.href ?? '/'} className="flex items-center gap-2">
              <Avatar name={user?.name ?? ''} small />
            </Link>
            <button onClick={handleSignOut} title="ออกจากระบบ" className="rounded-md p-1.5 text-ws-muted hover:bg-ws-raised">
              <Icon name="logout" size={18} />
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 pb-24 pt-5 md:px-8 md:pb-10 md:pt-7">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
          {IS_MOCK && (
            <p className="mx-auto mt-8 max-w-6xl text-center text-[11px] text-ws-faint">
              โหมดสาธิต — ข้อมูลเก็บในเบราว์เซอร์เครื่องนี้ · สถิติย้อนหลังเป็นตัวเลขจำลองบวกกับรายการจริงในเครื่อง
            </p>
          )}
        </main>

        {/* bottom tabs (mobile) */}
        <nav className="no-print fixed inset-x-0 bottom-0 z-30 grid border-t border-ws-border bg-ws-surface/95 backdrop-blur md:hidden" style={{ gridTemplateColumns: `repeat(${mobileNav.length}, minmax(0, 1fr))` }}>
          {mobileNav.map((n) => {
            const active = isActive(n.href)
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`relative flex flex-col items-center gap-0.5 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] text-[10px] ${
                  active ? 'text-ws-accent' : 'text-ws-muted'
                }`}
              >
                <Icon name={n.icon} size={20} />
                <span className="font-medium">{n.label}</span>
                {n.badge ? (
                  <span className="absolute right-[calc(50%-18px)] top-1 rounded-full bg-ws-danger px-1 text-[9px] font-semibold leading-4 text-white">
                    {n.badge}
                  </span>
                ) : null}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}

function Avatar({ name, small }: { name: string; small?: boolean }) {
  const initial = name.trim().charAt(0).toUpperCase() || '?'
  return (
    <span
      className={`inline-flex flex-none items-center justify-center rounded-full bg-ws-accent font-semibold text-white ${
        small ? 'h-8 w-8 text-xs' : 'h-9 w-9 text-sm'
      }`}
      aria-hidden="true"
    >
      {initial}
    </span>
  )
}

/* ── เมนูมาตรฐานของแต่ละฝั่ง ──────────────────────────── */

export function adminNav(pendingCount?: number): NavItem[] {
  return [
    { href: '/admin', label: 'ภาพรวม', icon: 'home' },
    { href: '/admin/queue', label: 'คิวงาน', icon: 'inbox', badge: pendingCount },
    { href: '/admin/billing', label: 'การเงิน', icon: 'receipt' },
    { href: '/admin/users', label: 'ผู้ใช้', icon: 'users' },
    { href: '/admin/stats', label: 'สถิติ', icon: 'chart' },
    { href: '/admin/legal', label: 'เอกสารกฎหมาย', icon: 'file', mobileHidden: true },
  ]
}

export const employerNav: NavItem[] = [
  { href: '/employer/dashboard', label: 'ภาพรวม', icon: 'home' },
  { href: '/employer/new', label: 'วิเคราะห์', icon: 'plus' },
  { href: '/employer/memory', label: 'คลังข้อมูล', icon: 'database' },
  { href: '/employer/billing', label: 'การชำระเงิน', icon: 'receipt' },
  { href: '/employer/profile', label: 'โปรไฟล์', icon: 'user' },
]

export const jobseekerNav: NavItem[] = [
  { href: '/jobseeker/dashboard', label: 'ภาพรวม', icon: 'home' },
  { href: '/jobseeker/new', label: 'เช็กบริษัท', icon: 'plus' },
  { href: '/jobseeker/billing', label: 'การชำระเงิน', icon: 'receipt' },
  { href: '/jobseeker/profile', label: 'โปรไฟล์', icon: 'user' },
]

/** path ที่อยู่ใน workspace — site-header/footer ใช้ตัดสินว่าจะซ่อนตัวเอง */
export function isWorkspacePath(pathname: string): boolean {
  return (
    pathname.startsWith('/admin') ||
    /^\/(employer|jobseeker)\/(dashboard|billing|profile|memory)/.test(pathname)
  )
}
