import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { BrandLockup, Button } from './ui'

/** เฮดเดอร์หน้า marketing (public) */
export async function SiteHeader() {
  const session = await getSession()
  return (
    <header className="sticky top-0 z-40 border-b border-line/60 bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" aria-label="命合 Mìnghé — หน้าแรก">
          <BrandLockup />
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-ink-soft md:flex">
          <Link href="/#how-it-works" className="hover:text-cinnabar">
            วิธีทำงาน
          </Link>
          <Link href="/pricing" className="hover:text-cinnabar">
            ราคา
          </Link>
          <Link href="/r" className="hover:text-cinnabar">
            เปิดรายงานด้วยรหัส
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          {session ? (
            <Button variant="outline" href={session.role === 'ADMIN' ? '/admin' : '/dashboard'}>
              {session.role === 'ADMIN' ? 'แผงผู้ดูแล' : 'แดชบอร์ดของฉัน'}
            </Button>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden text-sm font-medium text-ink-soft hover:text-cinnabar sm:block"
              >
                เข้าสู่ระบบ
              </Link>
              <Button href="/order/new">เริ่มวิเคราะห์ความเหมาะสม</Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
