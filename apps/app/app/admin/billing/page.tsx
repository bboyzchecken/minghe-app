'use client'

/**
 * Admin · การเงิน — Bill & Payment ทุกราย + คืนเงิน + สิทธิ์ทดลองที่เคยให้
 * ใช้ตอนลูกค้าแจ้งปัญหา: ค้นเลขใบเสร็จ/อีเมล → เห็นยอด วิธีจ่าย สถานะงาน → กดคืนเงินพร้อมเหตุผล
 */

import { useMemo, useState } from 'react'
import { Icon } from '@/components/workspace/icons'
import { PaymentsTable } from '@/components/workspace/payments'
import { Badge, Modal, Notice, PRODUCT_LABEL, PageHeader, Panel, ProductBadge, Segmented, Skeleton, StatTile, TableWrap, baht, fmtDate } from '@/components/workspace/ui'
import type { PaymentRecord } from '@/lib/api'
import { useAdminCredits, useAdminPayments, useAdminRefund, useAdminRevokeCredit } from '@/lib/queries'

type Tab = 'payments' | 'credits'
type StatusFilter = '' | 'paid' | 'refunded' | 'partially_refunded'

export default function AdminBillingPage() {
  const [tab, setTab] = useState<Tab>('payments')
  const [q, setQ] = useState('')
  const [product, setProduct] = useState<'' | 'employer' | 'jobseeker'>('')
  const [status, setStatus] = useState<StatusFilter>('')
  const [refunding, setRefunding] = useState<PaymentRecord | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const payments = useAdminPayments({ product: product || undefined, status: status || undefined, search: q.trim() || undefined })
  const credits = useAdminCredits()
  const revoke = useAdminRevokeCredit()

  const rows = payments.data ?? []
  const totals = useMemo(() => {
    const ym = new Date().toISOString().slice(0, 7)
    const month = rows.filter((p) => p.paidAt.slice(0, 7) === ym)
    return {
      month: month.reduce((s, p) => s + p.amount - p.refundAmount, 0),
      monthEmp: month.filter((p) => p.product === 'employer').reduce((s, p) => s + p.amount - p.refundAmount, 0),
      monthJs: month.filter((p) => p.product === 'jobseeker').reduce((s, p) => s + p.amount - p.refundAmount, 0),
      refunds: rows.reduce((s, p) => s + p.refundAmount, 0),
      creditsOpen: (credits.data ?? []).filter((c) => c.status === 'available').length,
    }
  }, [rows, credits.data])

  return (
    <>
      <PageHeader
        eyebrow="Finance"
        title="การเงิน"
        description="ใบเสร็จทุกรายการของลูกค้าทั้งสองฝั่ง — ค้นหา ตรวจสอบ และบันทึกการคืนเงินได้จากที่นี่"
        actions={
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { id: 'payments', label: 'รายการชำระเงิน', count: rows.length },
              { id: 'credits', label: 'สิทธิ์ทดลอง', count: credits.data?.length },
            ]}
          />
        }
      />

      {error && <Notice tone="danger" onClose={() => setError(null)}>{error}</Notice>}
      {notice && <Notice tone="success" onClose={() => setNotice(null)}>{notice}</Notice>}

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="รับชำระเดือนนี้ (สุทธิ)" value={baht(totals.month)} icon="wallet" tone="accent" hint={`องค์กร ${baht(totals.monthEmp)} · คนทำงาน ${baht(totals.monthJs)}`} />
        <StatTile label="คืนเงินรวม (ในรายการที่แสดง)" value={baht(totals.refunds)} icon="receipt" tone={totals.refunds > 0 ? 'danger' : 'neutral'} />
        <StatTile label="สิทธิ์ทดลองที่ยังไม่ถูกใช้" value={totals.creditsOpen} icon="gift" tone="success" />
        <StatTile label="ช่องทางชำระเงิน" value="รอ Gateway" icon="shield" tone="warn" hint="GB Prime Pay ยังไม่เชื่อม (Q0-3) — ยอดที่เห็นคือยอดที่ต้องเรียกเก็บ" />
      </div>

      {tab === 'payments' ? (
        <Panel
          padded={false}
          title={
            <div className="relative w-full sm:w-72">
              <Icon name="search" size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ws-faint" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="เลขใบเสร็จ / อีเมล / รหัสคำสั่งซื้อ" className="ws-input !pl-9" />
            </div>
          }
          action={
            <div className="flex flex-wrap gap-2">
              <select value={product} onChange={(e) => setProduct(e.target.value as typeof product)} className="ws-input !w-auto !py-1.5 text-xs">
                <option value="">ทุกฝั่ง</option>
                <option value="employer">องค์กร</option>
                <option value="jobseeker">คนทำงาน</option>
              </select>
              <select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} className="ws-input !w-auto !py-1.5 text-xs">
                <option value="">ทุกสถานะ</option>
                <option value="paid">ชำระแล้ว</option>
                <option value="partially_refunded">คืนบางส่วน</option>
                <option value="refunded">คืนเงินแล้ว</option>
              </select>
            </div>
          }
        >
          <div className="p-4 md:p-5">
            {payments.isPending ? (
              <Skeleton rows={4} />
            ) : payments.error ? (
              <p className="text-sm text-ws-danger">{payments.error.message}</p>
            ) : (
              <PaymentsTable payments={rows} showCustomer onRefund={setRefunding} emptyHint="ลองเปลี่ยนตัวกรองหรือคำค้น" />
            )}
          </div>
        </Panel>
      ) : (
        <Panel title="สิทธิ์ทดลองที่เคยให้" description="ให้สิทธิ์ใหม่ได้จากหน้า ผู้ใช้ หรือจากรายชื่อ “ลองเล่นแล้วไม่จ่าย” ในหน้า สถิติ" padded={false}>
          {credits.isPending ? (
            <div className="p-5"><Skeleton rows={3} /></div>
          ) : (credits.data ?? []).length === 0 ? (
            <p className="p-5 text-sm text-ws-muted">ยังไม่เคยให้สิทธิ์ทดลองใคร</p>
          ) : (
            <div className="px-4 md:px-5">
              <TableWrap>
                <thead>
                  <tr>
                    <th className="ws-th">ผู้ใช้</th>
                    <th className="ws-th">ใช้กับ</th>
                    <th className="ws-th">สถานะ</th>
                    <th className="ws-th">บันทึก</th>
                    <th className="ws-th">ให้โดย</th>
                    <th className="ws-th">หมดอายุ</th>
                    <th className="ws-th" />
                  </tr>
                </thead>
                <tbody>
                  {(credits.data ?? []).map((c) => (
                    <tr key={c.id} className="ws-row">
                      <td className="ws-td">
                        <div className="text-sm">{c.userName || '—'}</div>
                        <div className="ws-mono text-xs text-ws-muted">{c.userEmail ?? c.userId}</div>
                      </td>
                      <td className="ws-td">
                        <ProductBadge product={c.product} />
                        {c.depth && <span className="ml-1 text-xs text-ws-muted">{c.depth}</span>}
                      </td>
                      <td className="ws-td">
                        {c.status === 'available' ? <Badge tone="success" dot>ใช้ได้</Badge> : c.status === 'used' ? <Badge tone="neutral" dot>ใช้แล้ว {c.usedAt ? fmtDate(c.usedAt) : ''}</Badge> : <Badge tone="danger" dot>ยกเลิก</Badge>}
                      </td>
                      <td className="ws-td max-w-[240px] truncate text-xs text-ws-soft">{c.note || '—'}</td>
                      <td className="ws-td text-xs text-ws-muted">{c.grantedBy} · {fmtDate(c.createdAt)}</td>
                      <td className="ws-td text-xs text-ws-muted">{c.expiresAt ? fmtDate(c.expiresAt) : 'ไม่หมดอายุ'}</td>
                      <td className="ws-td text-right">
                        {c.status === 'available' && (
                          <button
                            disabled={revoke.isPending}
                            onClick={() =>
                              revoke.mutate(c.id, {
                                onSuccess: () => setNotice(`ยกเลิกสิทธิ์ของ ${c.userEmail ?? c.userId} แล้ว`),
                                onError: (e) => setError(e instanceof Error ? e.message : 'ทำรายการไม่สำเร็จ'),
                              })
                            }
                            className="ws-btn-danger ws-btn-sm"
                          >
                            ยกเลิก
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            </div>
          )}
        </Panel>
      )}

      <RefundModal payment={refunding} onClose={() => setRefunding(null)} onDone={(msg) => { setNotice(msg); setRefunding(null) }} onError={setError} />
    </>
  )
}

function RefundModal({ payment, onClose, onDone, onError }: { payment: PaymentRecord | null; onClose: () => void; onDone: (m: string) => void; onError: (m: string) => void }) {
  const refund = useAdminRefund()
  const [mode, setMode] = useState<'full' | 'partial'>('full')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const remaining = payment ? payment.amount - payment.refundAmount : 0

  function submit() {
    if (!payment || !reason.trim()) return
    const amt = mode === 'full' ? 0 : Number(amount)
    if (mode === 'partial' && (!amt || amt <= 0 || amt > remaining)) {
      onError(`จำนวนเงินต้องอยู่ระหว่าง 1 – ${remaining} บาท`)
      return
    }
    refund.mutate(
      { id: payment.id, input: { amount: amt, reason: reason.trim() } },
      {
        onSuccess: () => {
          onDone(`บันทึกคืนเงิน ${baht(mode === 'full' ? remaining : amt)} ของ ${payment.receiptNo} แล้ว`)
          setReason('')
          setAmount('')
          setMode('full')
        },
        onError: (e) => onError(e instanceof Error ? e.message : 'ทำรายการไม่สำเร็จ'),
      },
    )
  }

  return (
    <Modal open={payment !== null} onClose={onClose} title="บันทึกการคืนเงิน">
      {payment && (
        <div className="space-y-4">
          <div className="rounded-lg bg-ws-raised px-3 py-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="ws-mono text-xs text-ws-muted">{payment.receiptNo}</span>
              <ProductBadge product={payment.product} />
            </div>
            <div className="mt-1 font-medium text-ws-ink">{payment.description}</div>
            <div className="ws-mono text-xs text-ws-muted">{payment.customerEmail} · {PRODUCT_LABEL[payment.product]}</div>
            <div className="mt-2 flex justify-between text-sm">
              <span className="text-ws-muted">คืนได้สูงสุด</span>
              <b className="ws-mono">{baht(remaining)}</b>
            </div>
          </div>

          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { id: 'full', label: `เต็มจำนวน (${baht(remaining)})` },
              { id: 'partial', label: 'บางส่วน' },
            ]}
          />
          {mode === 'partial' && (
            <div>
              <label className="ws-label">จำนวนเงิน (บาท)</label>
              <input type="number" min={1} max={remaining} value={amount} onChange={(e) => setAmount(e.target.value)} className="ws-input ws-mono" />
            </div>
          )}
          <div>
            <label className="ws-label">เหตุผล (ลูกค้าเห็นในใบเสร็จ)</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="เช่น ลูกค้ากรอกวันเกิดผิด ขอยกเลิกภายใน 24 ชม." className="ws-input" />
          </div>
          <p className="rounded-lg bg-ws-warn-soft px-3 py-2 text-xs text-ws-warn">
            นี่คือการบันทึกทางบัญชี — การโอนเงินคืนจริงยังต้องทำผ่านช่องทางที่ลูกค้าจ่ายมา (gateway/โอน) จนกว่าระบบชำระเงินออนไลน์จะเชื่อมเสร็จ
          </p>
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="ws-btn-ghost">ยกเลิก</button>
            <button onClick={submit} disabled={refund.isPending || !reason.trim()} className="ws-btn-danger !bg-ws-danger !text-white hover:!bg-red-800">
              {refund.isPending ? 'กำลังบันทึก…' : 'ยืนยันคืนเงิน'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
