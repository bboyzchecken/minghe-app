'use client'

/**
 * โปรไฟล์ผู้ใช้ (ใช้ร่วมกันฝั่งองค์กรและคนทำงาน)
 * - ข้อมูลบัญชี แก้ชื่อ/เบอร์ได้
 * - บทบาทและสิทธิ์ (ตอบคำถาม "ฉันทำอะไรได้บ้าง")
 * - ข้อมูลที่ระบบจำไว้ (PDPA: ลบได้)
 * - ความปลอดภัย: เปลี่ยนรหัสผ่าน / ขอลบบัญชี
 */

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { isoToDisplay } from '@/components/date-input'
import { roleOf } from '@/lib/roles'
import { useDeleteProfile, useMeProfile, useMyPayments, useOrders, useSavedProfiles, useUpdateMe } from '@/lib/queries'
import { useSession } from '@/lib/session'
import { Icon } from './icons'
import { Badge, Notice, PageHeader, Panel, Skeleton, StatTile, baht, fmtDate } from './ui'

export function UserProfilePage({ side }: { side: 'employer' | 'jobseeker' }) {
  const { user } = useSession()
  const me = useMeProfile()
  const update = useUpdateMe()
  const orders = useOrders(side)
  const payments = useMyPayments()
  const profiles = useSavedProfiles(side === 'jobseeker' ? 'self' : undefined)
  const deleteProfile = useDeleteProfile()

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (me.data) {
      setName(me.data.name)
      setPhone(me.data.phone)
    }
  }, [me.data])

  const dirty = me.data ? name.trim() !== me.data.name || phone.trim() !== me.data.phone : false
  const role = user ? roleOf(user) : null
  const spent = (payments.data ?? []).reduce((s, p) => s + p.amount - p.refundAmount, 0)

  function save() {
    setNotice(null)
    setError(null)
    update.mutate(
      { name: name.trim(), phone: phone.trim() },
      {
        onSuccess: () => setNotice('บันทึกข้อมูลแล้ว'),
        onError: (e) => setError(e.message),
      },
    )
  }

  return (
    <>
      <PageHeader eyebrow="บัญชีของฉัน" title="โปรไฟล์" description="ข้อมูลบัญชี บทบาท และสิ่งที่ระบบจำไว้ให้คุณ" />

      {notice && <Notice tone="success" onClose={() => setNotice(null)}>{notice}</Notice>}
      {error && <Notice tone="danger" onClose={() => setError(null)}>{error}</Notice>}

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatTile label={side === 'employer' ? 'รายงานทั้งหมด' : 'บริษัทที่เช็ก'} value={orders.data?.length ?? '—'} icon="file" tone="accent" />
        <StatTile label="ยอดใช้จ่ายรวม" value={baht(spent)} icon="wallet" hint={<Link href={`/${side}/billing`} className="text-ws-accent hover:underline">ดูใบเสร็จ</Link>} />
        <StatTile label="สมาชิกตั้งแต่" value={me.data ? fmtDate(me.data.createdAt) : '—'} icon="clock" hint={me.data?.provider === 'google' ? 'เข้าด้วย Google' : 'เข้าด้วยอีเมล'} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <Panel title="ข้อมูลบัญชี" description="ชื่อที่แสดงบนใบเสร็จและในทีม">
            {me.isPending ? (
              <Skeleton rows={2} />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="ws-label">ชื่อ</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} className="ws-input" />
                </div>
                <div>
                  <label className="ws-label">เบอร์โทร (ไม่บังคับ)</label>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08x-xxx-xxxx" className="ws-input ws-mono" />
                </div>
                <div>
                  <label className="ws-label">อีเมล</label>
                  <input value={me.data?.email ?? ''} readOnly className="ws-input ws-mono bg-ws-raised text-ws-muted" />
                  <p className="mt-1 text-[11px] text-ws-faint">อีเมลใช้เป็นชื่อบัญชี เปลี่ยนไม่ได้</p>
                </div>
                {side === 'employer' && (
                  <div>
                    <label className="ws-label">องค์กร</label>
                    <input value={user?.organizationName ?? '—'} readOnly className="ws-input bg-ws-raised text-ws-muted" />
                  </div>
                )}
                <div className="flex items-end sm:col-span-2">
                  <button onClick={save} disabled={!dirty || !name.trim() || update.isPending} className="ws-btn-primary">
                    {update.isPending ? 'กำลังบันทึก…' : 'บันทึกการเปลี่ยนแปลง'}
                  </button>
                </div>
              </div>
            )}
          </Panel>

          <Panel title={side === 'jobseeker' ? 'ข้อมูลดวงของคุณที่ระบบจำไว้' : 'โปรไฟล์ที่บันทึกไว้ล่าสุด'} description="ข้อมูลเหล่านี้เป็นของคุณ — ลบได้ทุกเมื่อ (PDPA)"
            action={side === 'employer' ? <Link href="/employer/memory" className="ws-btn-ghost ws-btn-sm">จัดการคลังข้อมูล</Link> : undefined}
          >
            {profiles.isPending ? (
              <Skeleton rows={2} height="h-12" />
            ) : (profiles.data ?? []).length === 0 ? (
              <p className="text-sm text-ws-muted">ยังไม่มี — ระบบจะจำให้อัตโนมัติเมื่อสั่งวิเคราะห์ครั้งแรก</p>
            ) : (
              <ul className="divide-y divide-ws-border">
                {(profiles.data ?? []).slice(0, 6).map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-ws-ink">{p.name}</div>
                      <div className="text-xs text-ws-muted">
                        เกิด {isoToDisplay(p.birthDate)}{p.birthTime ? ` ${p.birthTime}` : ''}{p.placeLabel || p.province ? ` · ${p.placeLabel || p.province}` : ''}
                      </div>
                    </div>
                    <button
                      onClick={() => void deleteProfile.mutateAsync(p.id).catch(() => undefined)}
                      className="ws-btn-ghost ws-btn-sm text-ws-danger"
                    >
                      ลบ
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-5">
          {role && (
            <Panel title="บทบาทของคุณ">
              <div className="flex items-center justify-between">
                <div className="font-medium text-ws-ink">{role.label}</div>
                <Badge tone={side === 'employer' ? 'accent' : 'success'}>{role.badge}</Badge>
              </div>
              <p className="mt-1 text-xs text-ws-muted">{role.tagline}</p>
              <ul className="mt-3 space-y-1.5 text-xs">
                {role.can.map((c) => (
                  <li key={c} className="flex items-start gap-2 text-ws-soft"><Icon name="check" size={13} className="mt-0.5 flex-none text-ws-success" />{c}</li>
                ))}
                {role.cant.map((c) => (
                  <li key={c} className="flex items-start gap-2 text-ws-muted"><Icon name="x" size={13} className="mt-0.5 flex-none text-ws-faint" />{c}</li>
                ))}
              </ul>
            </Panel>
          )}

          <Panel title="ความปลอดภัย">
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/forgot-password" className="flex items-center justify-between rounded-lg border border-ws-border px-3 py-2 hover:bg-ws-raised">
                  เปลี่ยนรหัสผ่าน <Icon name="arrow-right" size={14} className="text-ws-faint" />
                </Link>
              </li>
              <li className="rounded-lg border border-ws-border px-3 py-2 text-xs text-ws-muted">
                เข้าสู่ระบบล่าสุด {me.data?.lastLoginAt ? fmtDate(me.data.lastLoginAt, true) : '—'}
              </li>
            </ul>
            <p className="mt-3 text-[11px] text-ws-faint">
              ต้องการลบบัญชีและข้อมูลทั้งหมด? แจ้งที่ info@minghe.work — ดู <Link href="/legal/refund" className="text-ws-accent hover:underline">นโยบายการขอลบบัญชี</Link>
            </p>
          </Panel>
        </div>
      </div>
    </>
  )
}
