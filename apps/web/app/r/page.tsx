/**
 * /r — ประตูเปิดรายงาน: กรอกรหัสเปิดรายงาน (MH-XXXX-XXXX) → นำทางไป /r/[code]
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { Card, GoldDivider, Seal } from '@/components/ui'
import { CodeForm } from './code-form'

export const metadata: Metadata = {
  title: 'เปิดรายงาน',
  description: 'กรอกรหัสเปิดรายงานเพื่อดูรายงานความเหมาะสม 命合 ของคุณ',
  robots: { index: false },
}

export default function OpenReportPage() {
  return (
    <main className="starfield relative flex min-h-screen flex-col items-center justify-center bg-ink px-4 py-16">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center">
          <Link href="/" aria-label="กลับหน้าแรก 命合 Mìnghé">
            <Seal size={64} />
          </Link>
          <p className="mt-6 font-display-en text-xs tracking-[0.35em] text-gold-soft">
            MÌNGHÉ FIT REPORT
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-paper">
            เปิดรายงานความเหมาะสม <span className="font-cjk">命合</span>
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-paper/70">
            รายงานทุกฉบับส่งมอบผ่าน &ldquo;รหัสเปิดรายงาน&rdquo; เฉพาะฉบับ
            เพื่อคุ้มครองข้อมูลส่วนบุคคลของผู้ถูกวิเคราะห์
          </p>
        </div>

        <Card className="mt-8">
          <CodeForm />
          <GoldDivider className="my-5" />
          <ul className="space-y-1.5 text-xs text-muted">
            <li className="flex gap-2">
              <span className="text-gold" aria-hidden>
                ◆
              </span>
              รหัสรูปแบบ MH-XXXX-XXXX ได้รับจากผู้ส่งรายงานหรืออีเมลแจ้งผล
            </li>
            <li className="flex gap-2">
              <span className="text-gold" aria-hidden>
                ◆
              </span>
              รายงานบางฉบับป้องกันด้วย PIN เพิ่มอีกชั้น — ระบบจะถามเมื่อจำเป็น
            </li>
            <li className="flex gap-2">
              <span className="text-gold" aria-hidden>
                ◆
              </span>
              ระบบบันทึกการเข้าถึงทุกครั้ง และจำกัดจำนวนครั้งการลองรหัสเพื่อความปลอดภัย
            </li>
          </ul>
        </Card>

        <p className="mt-8 text-center text-sm">
          <Link href="/" className="text-paper/60 transition-colors hover:text-gold-soft">
            ← กลับหน้าแรก 命合 Mìnghé
          </Link>
        </p>
      </div>
    </main>
  )
}
