import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { BrandLockup } from '@/components/ui'

/**
 * เลย์เอาต์ order flow — เปิดให้ทั้งสมาชิกและ guest (ตามแผนหัวข้อ 8)
 */
export default async function OrderLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="border-b border-line bg-cloud">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <Link href="/">
            <BrandLockup />
          </Link>
          <div className="text-sm text-muted">
            {session ? (
              <Link href="/dashboard" className="hover:text-cinnabar">
                แดชบอร์ดของฉัน
              </Link>
            ) : (
              <span>
                มีบัญชีแล้ว?{' '}
                <Link href="/login" className="font-semibold text-cinnabar hover:underline">
                  เข้าสู่ระบบ
                </Link>
              </span>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">{children}</main>
      <footer className="border-t border-line py-4 text-center text-xs text-muted">
        ข้อมูลของคุณได้รับการคุ้มครองตาม PDPA · 命合 Mìnghé
      </footer>
    </div>
  )
}
