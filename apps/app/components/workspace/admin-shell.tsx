'use client'

/**
 * โครงของ Admin Console — ห่อทุกหน้าใต้ /admin
 * กันคนผิดฝั่ง: บัญชีที่ไม่ใช่แอดมินเห็นคำอธิบายและปุ่มกลับ ไม่ใช่หน้าว่างหรือ error
 */

import Link from 'next/link'
import { useAdminOverview } from '@/lib/queries'
import { homeForUser, useSession } from '@/lib/session'
import { WorkspaceShell, adminNav } from './shell'

function AdminGate({ children }: { children: React.ReactNode }) {
  const { user } = useSession()
  if (user && user.side !== 'admin') {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-3 text-center">
        <span className="cjk text-2xl text-gold">命合</span>
        <p className="font-medium text-ws-ink">หน้านี้สำหรับผู้ดูแลระบบเท่านั้น</p>
        <p className="text-sm text-ws-muted">
          บัญชีของคุณ ({user.email}) เป็นบัญชีฝั่ง{user.side === 'employer' ? 'องค์กร' : 'คนทำงาน'} — กลับไปยังหน้าหลักของคุณได้เลย
        </p>
        <Link href={homeForUser(user)} className="ws-btn-primary mt-2">ไปหน้า Dashboard ของฉัน</Link>
      </div>
    )
  }
  return <>{children}</>
}

/** ห่อทุกหน้าใต้ /admin — ประกอบ nav หลังรู้จำนวนงานรอรับ (badge บนเมนูคิวงาน) */
export function AdminWorkspace({ children }: { children: React.ReactNode }) {
  return (
    <AdminNavShell>
      <AdminGate>{children}</AdminGate>
    </AdminNavShell>
  )
}

function AdminNavShell({ children }: { children: React.ReactNode }) {
  const overview = useAdminOverview()
  const pending = overview.data?.orders.paid ?? 0
  return (
    <WorkspaceShell nav={adminNav(pending > 0 ? pending : undefined)} brand="Admin Console" requirePath="/admin">
      {children}
    </WorkspaceShell>
  )
}
