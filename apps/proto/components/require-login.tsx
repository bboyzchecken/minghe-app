'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { ElementIcon } from '@/components/element-icon'
import { rememberReturnTo, useSession } from '@/lib/session'

/**
 * ห่อหน้าที่ต้องล็อกอินก่อนเข้า (dashboard ทั้งสองฝั่ง)
 *
 * จำหน้าปลายทางไว้ก่อนพาไปล็อกอิน จะได้เด้งกลับมาที่เดิมหลังเข้าระบบสำเร็จ
 */
export function RequireLogin({ path, children }: { path: string; children: React.ReactNode }) {
  const { user, loading } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (loading || user) return
    rememberReturnTo(path)
    router.replace('/login')
  }, [loading, user, path, router])

  if (loading) {
    return (
      <div className="container-page flex min-h-[50vh] flex-col items-center justify-center gap-3 py-20">
        <div className="flex gap-2">
          {(['metal', 'water', 'wood', 'fire'] as const).map((e, i) => (
            <span key={e} className="animate-bounce" style={{ animationDelay: `${i * 120}ms` }}>
              <ElementIcon element={e} size={20} />
            </span>
          ))}
        </div>
        <p className="text-sm text-muted">กำลังตรวจสอบเซสชัน…</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container-page flex min-h-[50vh] flex-col items-center justify-center gap-3 py-20 text-center">
        <p className="text-ink-soft">หน้านี้ต้องเข้าสู่ระบบก่อน</p>
        <Link href="/login" className="btn-primary">
          ไปหน้าเข้าสู่ระบบ
        </Link>
      </div>
    )
  }

  return <>{children}</>
}
