import Link from 'next/link'
import { requireUser } from '@/lib/auth'
import { BrandLockup } from '@/components/ui'

const NAV = [
  { href: '/dashboard', label: 'แดชบอร์ด' },
  { href: '/order/new', label: 'สร้างออเดอร์ใหม่' },
  { href: '/account', label: 'บัญชีของฉัน' },
]

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireUser()
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="border-b border-line bg-cloud">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/dashboard">
            <BrandLockup />
          </Link>
          <nav className="hidden items-center gap-5 text-sm font-medium text-ink-soft md:flex">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-cinnabar">
                {item.label}
              </Link>
            ))}
            {session.role === 'ADMIN' ? (
              <Link href="/admin" className="text-cinnabar hover:text-cinnabar-deep">
                แผงผู้ดูแล
              </Link>
            ) : null}
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted sm:block">{session.name ?? session.email}</span>
            <form action="/api/auth/logout" method="post">
              <button className="rounded-sm border border-line px-3 py-1.5 text-xs font-semibold text-ink-soft hover:border-cinnabar hover:text-cinnabar">
                ออกจากระบบ
              </button>
            </form>
          </div>
        </div>
        {/* เมนูมือถือ */}
        <nav className="flex gap-4 overflow-x-auto border-t border-line/60 px-4 py-2 text-sm font-medium text-ink-soft md:hidden">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="whitespace-nowrap hover:text-cinnabar">
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </div>
  )
}
