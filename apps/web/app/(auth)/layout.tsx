import Link from 'next/link'
import { BrandLockup } from '@/components/ui'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="starfield flex min-h-screen flex-col items-center justify-center bg-ink px-4 py-12">
      <Link href="/" className="mb-8">
        <BrandLockup dark />
      </Link>
      <div className="w-full max-w-md rounded-lg border border-gold/20 bg-paper p-8 shadow-card">
        {children}
      </div>
      <p className="mt-6 max-w-sm text-center text-xs text-paper/50">
        ข้อมูลของคุณได้รับการคุ้มครองตาม พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล (PDPA)
      </p>
    </div>
  )
}
