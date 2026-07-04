import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { GoldDivider } from '@/components/ui'
import { RegisterForm } from './register-form'

export const metadata: Metadata = {
  title: 'สมัครสมาชิก',
  description: 'สร้างบัญชี 命合 Mìnghé เพื่อสั่งรายงานความเหมาะสม สะสมเครดิต และเก็บผลย้อนหลัง',
}

export default async function RegisterPage() {
  const session = await getSession()
  if (session) redirect(session.role === 'ADMIN' ? '/admin' : '/dashboard')

  return (
    <div>
      <h1 className="font-display-th text-2xl font-semibold text-ink">สมัครสมาชิก</h1>
      <p className="mt-1 text-sm text-muted">
        สร้างบัญชีเพื่อสั่งรายงานความเหมาะสม 命合 สะสมเครดิต และเก็บผลวิเคราะห์ย้อนหลัง
      </p>
      <GoldDivider />
      <RegisterForm />
      <p className="mt-6 text-center text-sm text-muted">
        มีบัญชีอยู่แล้ว?{' '}
        <Link href="/login" className="font-semibold text-cinnabar hover:text-cinnabar-deep">
          เข้าสู่ระบบ
        </Link>
      </p>
    </div>
  )
}
