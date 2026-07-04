import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { GoldDivider } from '@/components/ui'
import { LoginForm } from './login-form'

export const metadata: Metadata = {
  title: 'เข้าสู่ระบบ',
  description: 'เข้าสู่ระบบเพื่อจัดการออเดอร์ รายงานความเหมาะสม 命合 และเครดิตของคุณ',
}

export default async function LoginPage() {
  const session = await getSession()
  if (session) redirect(session.role === 'ADMIN' ? '/admin' : '/dashboard')

  return (
    <div>
      <h1 className="font-display-th text-2xl font-semibold text-ink">เข้าสู่ระบบ</h1>
      <p className="mt-1 text-sm text-muted">
        จัดการออเดอร์ รายงานความเหมาะสม 命合 และเครดิตของคุณได้ในที่เดียว
      </p>
      <GoldDivider />
      <LoginForm />
      <p className="mt-6 text-center text-sm text-muted">
        ยังไม่มีบัญชี?{' '}
        <Link href="/register" className="font-semibold text-cinnabar hover:text-cinnabar-deep">
          สมัครสมาชิก
        </Link>
      </p>
    </div>
  )
}
