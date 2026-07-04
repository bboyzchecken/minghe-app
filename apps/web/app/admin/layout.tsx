import Link from 'next/link'
import { requireAdmin } from '@/lib/auth'
import { BrandLockup, Badge } from '@/components/ui'

const NAV = [
  { href: '/admin', label: 'ภาพรวม' },
  { href: '/admin/orders', label: 'ออเดอร์' },
  { href: '/admin/users', label: 'ผู้ใช้' },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin()
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="border-b border-gold/30 bg-ink">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link href="/admin">
              <BrandLockup dark />
            </Link>
            <Badge tone="gold">ผู้ดูแลระบบ</Badge>
          </div>
          <nav className="flex items-center gap-5 text-sm font-medium text-paper/80">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-gold-soft">
                {item.label}
              </Link>
            ))}
            <Link href="/dashboard" className="hover:text-gold-soft">
              มุมมองลูกค้า
            </Link>
            <form action="/api/auth/logout" method="post">
              <button className="rounded-sm border border-paper/30 px-3 py-1.5 text-xs font-semibold text-paper/80 hover:border-gold hover:text-gold-soft">
                ออกจากระบบ
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <p className="mb-4 text-xs text-muted">เข้าสู่ระบบในฐานะ {session.email}</p>
        {children}
      </main>
    </div>
  )
}
