/**
 * /admin/orders/[id] — รายละเอียดออเดอร์เต็มรูปแบบ + ปุ่มจัดการรายงาน
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { findIndustry } from '@minghe/core'
import { parseOrgData, parseSubjectData, prisma, type OrgData, type SubjectData } from '@minghe/db'
import { Badge, Card, GoldDivider, Notice } from '@/components/ui'
import { addonById } from '@/lib/pricing'
import { formatBaht, formatThaiDate, formatThaiDateTime, ORDER_STATUS_TH } from '@/lib/utils'
import { OrderActions } from './actions'

export const metadata: Metadata = { title: 'รายละเอียดออเดอร์' }
export const dynamic = 'force-dynamic'

const STATUS_TONE: Record<string, 'warning' | 'info' | 'success' | 'danger'> = {
  pending: 'warning',
  processing: 'info',
  completed: 'success',
  failed: 'danger',
}

const PAYMENT_PROVIDER_TH: Record<string, string> = {
  mock: 'ชำระจำลอง (mock)',
  credits: 'เครดิตสมาชิก',
  stripe: 'Stripe',
  omise: 'Omise',
}

const PAYMENT_STATUS_TH: Record<string, string> = {
  paid: 'ชำระแล้ว',
  pending: 'รอชำระ',
  failed: 'ไม่สำเร็จ',
}

/** แถว key-value สำหรับแสดงข้อมูล */
function KV({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line/60 py-1.5 text-sm last:border-0">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="text-right font-medium text-ink">{value}</dd>
    </div>
  )
}

function parseSafe<T>(fn: () => T): T | null {
  try {
    return fn()
  } catch {
    return null
  }
}

function addonLabelsOf(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((item) => {
        const id =
          typeof item === 'string'
            ? item
            : typeof item === 'object' && item !== null && 'id' in item
              ? String((item as { id: unknown }).id)
              : ''
        if (!id) return ''
        return addonById(id)?.label ?? id
      })
      .filter(Boolean)
  } catch {
    return []
  }
}

function SubjectSection({ subject, hasPhoto }: { subject: SubjectData; hasPhoto: boolean }) {
  return (
    <dl>
      <KV label="ชื่อ" value={subject.name} />
      <KV
        label="เพศ"
        value={subject.gender === 'male' ? 'ชาย' : subject.gender === 'female' ? 'หญิง' : 'ไม่ระบุ'}
      />
      <KV label="วันเกิด" value={formatThaiDate(subject.birthDate)} />
      <KV label="เวลาเกิด" value={`${subject.birthTime} น.`} />
      {subject.province ? <KV label="จังหวัดที่เกิด" value={subject.province} /> : null}
      {typeof subject.longitude === 'number' ? (
        <KV label="ลองจิจูด" value={subject.longitude.toFixed(2)} />
      ) : null}
      {subject.lateZiRule ? (
        <KV
          label="กติกายามจื่อดึก"
          value={subject.lateZiRule === 'next-day' ? 'นับเป็นวันถัดไป' : 'นับเป็นวันเดิม'}
        />
      ) : null}
      <KV label="รูปถ่าย (โหงวเฮ้ง)" value={hasPhoto ? 'มีรูปแนบ' : 'ไม่มี'} />
      <KV
        label="ความยินยอม (PDPA)"
        value={
          subject.consentConfirmed ? (
            <Badge tone="success">ยืนยันแล้ว</Badge>
          ) : (
            <Badge tone="danger">ยังไม่ยืนยัน</Badge>
          )
        }
      />
    </dl>
  )
}

function OrgSection({ org }: { org: OrgData }) {
  return (
    <dl>
      {org.mode === 'executive' ? (
        <>
          <KV label="โหมดอ้างอิง" value="ดวงผู้บริหาร" />
          {org.executiveName ? <KV label="ชื่อผู้บริหาร" value={org.executiveName} /> : null}
          <KV label="วันเกิดผู้บริหาร" value={formatThaiDate(org.birthDate)} />
          <KV label="เวลาเกิด" value={`${org.birthTime} น.`} />
          {org.province ? <KV label="จังหวัด" value={org.province} /> : null}
        </>
      ) : org.mode === 'company-date' ? (
        <>
          <KV label="โหมดอ้างอิง" value="วันก่อตั้งบริษัท" />
          {org.companyName ? <KV label="ชื่อบริษัท" value={org.companyName} /> : null}
          <KV label="วันก่อตั้ง" value={formatThaiDate(org.foundingDate)} />
        </>
      ) : (
        <>
          <KV label="โหมดอ้างอิง" value="ธาตุอุตสาหกรรม" />
          {org.companyName ? <KV label="ชื่อบริษัท" value={org.companyName} /> : null}
          <KV label="อุตสาหกรรม" value={findIndustry(org.industryId)?.th ?? org.industryId} />
        </>
      )}
      {org.team && org.team.length > 0 ? (
        <KV
          label={`ทีมงาน (${org.team.length} คน)`}
          value={
            <span className="block text-right">
              {org.team.map((m, i) => (
                <span key={`${m.name}-${i}`} className="block">
                  {m.name} · {formatThaiDate(m.birthDate)}
                  {m.birthTime ? ` ${m.birthTime} น.` : ''}
                </span>
              ))}
            </span>
          }
        />
      ) : null}
    </dl>
  )
}

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      createdBy: { select: { email: true, name: true } },
      payment: true,
      assets: { select: { type: true } },
      report: {
        include: {
          accessLogs: { orderBy: { accessedAt: 'desc' }, take: 10 },
        },
      },
    },
  })
  if (!order) notFound()

  const subject = parseSafe(() => parseSubjectData(order.subjectData))
  const org = parseSafe(() => parseOrgData(order.orgData))
  const addonLabels = addonLabelsOf(order.addons)
  const hasPhoto = order.assets.some((a) => a.type === 'photo')
  const report = order.report

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted">
            <Link href="/admin/orders" className="hover:text-cinnabar">
              ออเดอร์ทั้งหมด
            </Link>{' '}
            / รายละเอียด
          </p>
          <h1 className="mt-1 flex items-center gap-3 text-2xl font-semibold text-ink">
            ออเดอร์ <span className="font-mono">{order.id.slice(-8).toUpperCase()}</span>
            <Badge tone={STATUS_TONE[order.status] ?? 'neutral'}>
              {ORDER_STATUS_TH[order.status] ?? order.status}
            </Badge>
          </h1>
        </div>
        {report && !report.revoked ? (
          <Link
            href={`/r/${report.accessCode}`}
            target="_blank"
            className="rounded-md border border-gold px-4 py-2 text-sm font-semibold text-gold hover:bg-gold hover:text-ink"
          >
            เปิดรายงาน ↗
          </Link>
        ) : null}
      </div>

      {order.errorNote ? (
        <Notice tone="danger">
          <span className="font-semibold">บันทึกข้อผิดพลาด:</span> {order.errorNote}
        </Notice>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-lg font-semibold text-ink">ข้อมูลออเดอร์</h2>
          <dl>
            <KV label="รหัสออเดอร์" value={<span className="font-mono text-xs">{order.id}</span>} />
            <KV label="วันที่สร้าง" value={formatThaiDateTime(order.createdAt)} />
            {order.completedAt ? (
              <KV label="เสร็จสมบูรณ์เมื่อ" value={formatThaiDateTime(order.completedAt)} />
            ) : null}
            <KV
              label="ผู้สร้าง"
              value={
                order.createdBy
                  ? `${order.createdBy.email}${order.createdBy.name ? ` (${order.createdBy.name})` : ''}`
                  : `${order.guestEmail ?? 'ไม่ระบุอีเมล'} (guest)`
              }
            />
            <KV
              label="บริการเสริม"
              value={addonLabels.length > 0 ? addonLabels.join(', ') : 'ไม่มี'}
            />
            <KV label="ราคารวม" value={formatBaht(order.priceSatang)} />
          </dl>
          <GoldDivider />
          <h2 className="mb-3 text-lg font-semibold text-ink">การชำระเงิน</h2>
          {order.payment ? (
            <dl>
              <KV
                label="ยอดชำระ"
                value={
                  order.payment.provider === 'credits'
                    ? `${formatBaht(order.payment.amount)} (ตัดเครดิต 1 เครดิต)`
                    : formatBaht(order.payment.amount)
                }
              />
              <KV
                label="ช่องทาง"
                value={PAYMENT_PROVIDER_TH[order.payment.provider] ?? order.payment.provider}
              />
              <KV
                label="สถานะ"
                value={
                  <Badge tone={order.payment.status === 'paid' ? 'success' : 'warning'}>
                    {PAYMENT_STATUS_TH[order.payment.status] ?? order.payment.status}
                  </Badge>
                }
              />
              <KV label="วันที่ชำระ" value={formatThaiDateTime(order.payment.createdAt)} />
            </dl>
          ) : (
            <p className="text-sm text-muted">ยังไม่มีรายการชำระเงิน</p>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 text-lg font-semibold text-ink">ผู้ถูกวิเคราะห์</h2>
          {subject ? (
            <SubjectSection subject={subject} hasPhoto={hasPhoto} />
          ) : (
            <p className="text-sm text-muted">อ่านข้อมูลไม่ได้ (รูปแบบไม่ถูกต้อง)</p>
          )}
          <GoldDivider />
          <h2 className="mb-3 text-lg font-semibold text-ink">องค์กร / ทีม</h2>
          {org ? (
            <OrgSection org={org} />
          ) : (
            <p className="text-sm text-muted">อ่านข้อมูลไม่ได้ (รูปแบบไม่ถูกต้อง)</p>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 text-lg font-semibold text-ink">รายงานความเหมาะสม 命合</h2>
          {report ? (
            <dl>
              <KV
                label="รหัสเปิดรายงาน"
                value={<span className="font-mono font-semibold">{report.accessCode}</span>}
              />
              <KV label="ออกเมื่อ" value={formatThaiDateTime(report.createdAt)} />
              <KV label="จำนวนครั้งที่เปิด" value={report.viewCount} />
              <KV label="PIN เสริม" value={report.pinHash ? 'ตั้งแล้ว' : 'ไม่มี'} />
              <KV
                label="วันหมดอายุ"
                value={report.expiresAt ? formatThaiDateTime(report.expiresAt) : 'ไม่หมดอายุ'}
              />
              <KV
                label="สถานะการเข้าถึง"
                value={
                  report.revoked ? (
                    <Badge tone="danger">เพิกถอนแล้ว</Badge>
                  ) : (
                    <Badge tone="success">เปิดใช้งาน</Badge>
                  )
                }
              />
            </dl>
          ) : (
            <p className="text-sm text-muted">
              ยังไม่มีรายงาน —{' '}
              {order.payment?.status === 'paid'
                ? 'ออเดอร์ชำระแล้ว สามารถสั่งประมวลผลได้ด้านล่าง'
                : 'ต้องชำระเงินก่อนจึงจะประมวลผลได้'}
            </p>
          )}
          <GoldDivider />
          <h2 className="mb-3 text-lg font-semibold text-ink">จัดการ</h2>
          <OrderActions
            orderId={order.id}
            hasReport={Boolean(report)}
            isPaid={order.payment?.status === 'paid'}
            revoked={report?.revoked ?? false}
            hasPin={Boolean(report?.pinHash)}
          />
        </Card>

        <Card>
          <h2 className="mb-3 text-lg font-semibold text-ink">ประวัติการเข้าถึงรายงาน</h2>
          {report && report.accessLogs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs font-semibold text-muted">
                    <th className="px-3 py-2">เวลาเข้าถึง</th>
                    <th className="px-3 py-2">IP (hash)</th>
                  </tr>
                </thead>
                <tbody>
                  {report.accessLogs.map((log) => (
                    <tr key={log.id} className="border-b border-line/60 last:border-0">
                      <td className="px-3 py-2 text-xs text-ink-soft">
                        {formatThaiDateTime(log.accessedAt)}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-muted">{log.ipHash ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted">
              {report ? 'ยังไม่มีการเปิดรายงาน' : 'ยังไม่มีรายงาน จึงไม่มีประวัติการเข้าถึง'}
            </p>
          )}
          <p className="mt-3 text-xs text-muted">แสดง 10 รายการล่าสุด — IP เก็บแบบ hash ทางเดียวตามแนวทาง PDPA</p>
        </Card>
      </div>
    </div>
  )
}
