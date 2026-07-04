import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { prisma } from '@minghe/db'
import { requireUser } from '@/lib/auth'
import { planById } from '@/lib/pricing'
import { formatBaht, formatThaiDate, formatThaiDateTime } from '@/lib/utils'
import { Badge, Card, GoldDivider, Notice } from '@/components/ui'
import { BuyCreditsForm } from './buy-credits-form'

export const metadata: Metadata = { title: 'บัญชีของฉัน' }

const ROLE_TH: Record<string, string> = {
  CLIENT: 'สมาชิก',
  ADMIN: 'ผู้ดูแลระบบ',
}

const PROVIDER_TH: Record<string, string> = {
  mock: 'ชำระทดสอบ',
  credits: 'เครดิตรายงาน',
  stripe: 'Stripe',
  omise: 'Omise',
}

const PAYMENT_STATUS_TH: Record<string, { label: string; tone: 'success' | 'warning' | 'danger' }> = {
  paid: { label: 'ชำระแล้ว', tone: 'success' },
  pending: { label: 'รอดำเนินการ', tone: 'warning' },
  failed: { label: 'ไม่สำเร็จ', tone: 'danger' },
}

const SUB_STATUS_TH: Record<string, { label: string; tone: 'success' | 'warning' | 'danger' }> = {
  active: { label: 'ใช้งานอยู่', tone: 'success' },
  past_due: { label: 'ค้างชำระ', tone: 'warning' },
  canceled: { label: 'ยกเลิกแล้ว', tone: 'danger' },
}

export default async function AccountPage() {
  const session = await requireUser()
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      subscription: true,
      payments: { orderBy: { createdAt: 'desc' }, take: 10 },
    },
  })
  if (!user) redirect('/login')

  const sub = user.subscription
  const plan = sub ? planById(sub.plan) : undefined
  const subStatus = sub ? (SUB_STATUS_TH[sub.status] ?? { label: sub.status, tone: 'warning' as const }) : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display-th text-3xl font-semibold text-ink">บัญชีของฉัน</h1>
        <p className="mt-1 text-sm text-muted">
          โปรไฟล์ เครดิตรายงาน แพ็กเกจสมาชิก และประวัติการชำระเงินของคุณ
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ---- คอลัมน์ซ้าย: โปรไฟล์ + ประวัติการชำระเงิน ---- */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-lg font-semibold text-ink">ข้อมูลโปรไฟล์</h2>
              <Badge tone={user.role === 'ADMIN' ? 'gold' : 'neutral'}>
                {ROLE_TH[user.role] ?? user.role}
              </Badge>
            </div>
            <GoldDivider className="my-4" />
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold text-muted">ชื่อ</dt>
                <dd className="mt-0.5 text-sm text-ink">{user.name ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-muted">อีเมล</dt>
                <dd className="mt-0.5 text-sm text-ink">{user.email}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-muted">วันที่สมัครสมาชิก</dt>
                <dd className="mt-0.5 text-sm text-ink">{formatThaiDate(user.createdAt)}</dd>
              </div>
            </dl>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-ink">ประวัติการชำระเงินล่าสุด</h2>
            <p className="mt-0.5 text-xs text-muted">แสดง 10 รายการล่าสุด</p>
            <GoldDivider className="my-4" />
            {user.payments.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted">ยังไม่มีประวัติการชำระเงิน</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs font-semibold text-muted">
                      <th className="pb-2 pr-3">วันที่</th>
                      <th className="pb-2 pr-3">ช่องทาง</th>
                      <th className="pb-2 pr-3 text-right">จำนวนเงิน</th>
                      <th className="pb-2 text-right">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {user.payments.map((payment) => {
                      const status = PAYMENT_STATUS_TH[payment.status] ?? {
                        label: payment.status,
                        tone: 'warning' as const,
                      }
                      return (
                        <tr key={payment.id} className="border-b border-line/60 last:border-0">
                          <td className="py-2.5 pr-3 text-ink-soft">
                            {formatThaiDateTime(payment.createdAt)}
                          </td>
                          <td className="py-2.5 pr-3 text-ink-soft">
                            {PROVIDER_TH[payment.provider] ?? payment.provider}
                          </td>
                          <td className="py-2.5 pr-3 text-right font-mono text-ink">
                            {formatBaht(payment.amount)}
                          </td>
                          <td className="py-2.5 text-right">
                            <Badge tone={status.tone}>{status.label}</Badge>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* ---- คอลัมน์ขวา: เครดิต + สมาชิก + PDPA ---- */}
        <div className="space-y-6">
          <Card>
            <h2 className="text-lg font-semibold text-ink">เครดิตรายงานคงเหลือ</h2>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-mono text-5xl font-semibold text-cinnabar">{user.credits}</span>
              <span className="text-sm text-muted">เครดิต</span>
            </div>
            <p className="mt-1 text-xs text-muted">1 เครดิต = รายงานความเหมาะสม 命合 1 ฉบับ</p>
            <GoldDivider className="my-4" />
            <BuyCreditsForm />
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-ink">แพ็กเกจสมาชิก</h2>
            <GoldDivider className="my-4" />
            {sub && subStatus ? (
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-ink">{plan?.label ?? sub.plan}</span>
                  <Badge tone={subStatus.tone}>{subStatus.label}</Badge>
                </div>
                <div className="flex items-center justify-between text-ink-soft">
                  <span>โควตารอบนี้</span>
                  <span className="font-mono">
                    {sub.reportsUsed}/{sub.reportsQuota} รายงาน
                  </span>
                </div>
                <div className="flex items-center justify-between text-ink-soft">
                  <span>ต่ออายุวันที่</span>
                  <span>{formatThaiDate(sub.renewsAt)}</span>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted">
                <p>ยังไม่มีแพ็กเกจรายเดือน — เหมาะสำหรับ HR ที่วิเคราะห์เป็นประจำ</p>
                <Link
                  href="/pricing"
                  className="mt-3 inline-block font-semibold text-cinnabar hover:text-cinnabar-deep"
                >
                  ดูแพ็กเกจสมาชิก →
                </Link>
              </div>
            )}
          </Card>

          <Notice tone="info">
            <p className="font-semibold">สิทธิของเจ้าของข้อมูล (PDPA)</p>
            <p className="mt-1">
              คุณมีสิทธิขอเข้าถึง แก้ไข หรือลบข้อมูลส่วนบุคคลของคุณและของผู้ถูกวิเคราะห์ได้ทุกเมื่อ
              แจ้งความประสงค์ได้ที่{' '}
              <a
                href="mailto:privacy@minghe.app"
                className="font-semibold text-cinnabar hover:text-cinnabar-deep"
              >
                privacy@minghe.app
              </a>{' '}
              — เราดำเนินการภายใน 30 วันตามที่กฎหมายกำหนด
            </p>
          </Notice>
        </div>
      </div>
    </div>
  )
}
