'use client'

/**
 * Bill & Payment — ตารางใบเสร็จ + หน้าต่างดูใบเสร็จ (พิมพ์ได้)
 * ใช้ทั้งฝั่งผู้ใช้ (ดูย้อนหลัง) และฝั่งแอดมิน (ติดตาม / คืนเงิน)
 */

import { useState } from 'react'
import type { PaymentRecord } from '@/lib/api'
import { Icon } from './icons'
import { Badge, EmptyState, Modal, ProductBadge, TableWrap, baht, fmtDate, methodLabel, type Tone } from './ui'

export function paymentTone(status: PaymentRecord['status']): Tone {
  return status === 'refunded' ? 'danger' : status === 'partially_refunded' ? 'warn' : 'success'
}

export function paymentStatusLabel(status: PaymentRecord['status']): string {
  return status === 'refunded' ? 'คืนเงินแล้ว' : status === 'partially_refunded' ? 'คืนบางส่วน' : 'ชำระแล้ว'
}

export function PaymentsTable({
  payments,
  showCustomer,
  onRefund,
  emptyHint,
}: {
  payments: PaymentRecord[]
  showCustomer?: boolean
  onRefund?: (p: PaymentRecord) => void
  emptyHint?: string
}) {
  const [viewing, setViewing] = useState<PaymentRecord | null>(null)

  if (payments.length === 0) {
    return <EmptyState icon="receipt" title="ยังไม่มีรายการชำระเงิน" hint={emptyHint} />
  }

  return (
    <>
      {/* มือถือ: การ์ดต่อรายการ */}
      <ul className="space-y-2 md:hidden">
        {payments.map((p) => (
          <li key={p.id} className="rounded-xl border border-ws-border p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="ws-mono text-xs text-ws-muted">{p.receiptNo}</div>
                <div className="mt-0.5 truncate text-sm font-medium text-ws-ink">{p.description}</div>
                {showCustomer && <div className="truncate text-xs text-ws-muted">{p.customerEmail}</div>}
              </div>
              <div className="ws-mono text-right text-base font-semibold text-ws-ink">{baht(p.amount)}</div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-ws-muted">
              <Badge tone={paymentTone(p.status)} dot>{paymentStatusLabel(p.status)}</Badge>
              <ProductBadge product={p.product} />
              <span>{fmtDate(p.paidAt)}</span>
            </div>
            <div className="mt-2 flex gap-2">
              <button onClick={() => setViewing(p)} className="ws-btn-ghost ws-btn-sm flex-1">
                <Icon name="receipt" size={14} /> ใบเสร็จ
              </button>
              {onRefund && p.status !== 'refunded' && p.amount > 0 && (
                <button onClick={() => onRefund(p)} className="ws-btn-danger ws-btn-sm flex-1">คืนเงิน</button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {/* เดสก์ท็อป: ตาราง */}
      <div className="hidden md:block">
        <TableWrap>
          <thead>
            <tr>
              <th className="ws-th">เลขที่ใบเสร็จ</th>
              <th className="ws-th">รายการ</th>
              {showCustomer && <th className="ws-th">ลูกค้า</th>}
              <th className="ws-th">ฝั่ง</th>
              <th className="ws-th text-right">ยอด</th>
              <th className="ws-th">วิธีชำระ</th>
              <th className="ws-th">สถานะ</th>
              <th className="ws-th">วันที่</th>
              <th className="ws-th" />
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="ws-row">
                <td className="ws-td ws-mono text-xs">{p.receiptNo}</td>
                <td className="ws-td">
                  <div className="max-w-[260px] truncate">{p.description}</div>
                  {p.refundAmount > 0 && (
                    <div className="text-[11px] text-ws-danger">คืนแล้ว {baht(p.refundAmount)} · {p.refundReason}</div>
                  )}
                </td>
                {showCustomer && (
                  <td className="ws-td">
                    <div className="text-sm">{p.customerName}</div>
                    <div className="ws-mono text-[11px] text-ws-muted">{p.customerEmail}</div>
                  </td>
                )}
                <td className="ws-td"><ProductBadge product={p.product} /></td>
                <td className="ws-td ws-mono text-right font-medium">{baht(p.amount)}</td>
                <td className="ws-td text-xs text-ws-soft">{methodLabel(p.method)}</td>
                <td className="ws-td"><Badge tone={paymentTone(p.status)} dot>{paymentStatusLabel(p.status)}</Badge></td>
                <td className="ws-td whitespace-nowrap text-xs text-ws-muted">{fmtDate(p.paidAt, true)}</td>
                <td className="ws-td">
                  <div className="flex justify-end gap-1.5">
                    <button onClick={() => setViewing(p)} className="ws-btn-ghost ws-btn-sm" title="ดูใบเสร็จ">
                      <Icon name="receipt" size={14} /> ใบเสร็จ
                    </button>
                    {onRefund && p.status !== 'refunded' && p.amount > 0 && (
                      <button onClick={() => onRefund(p)} className="ws-btn-danger ws-btn-sm">คืนเงิน</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </div>

      <ReceiptModal payment={viewing} onClose={() => setViewing(null)} />
    </>
  )
}

/* ── ใบเสร็จ ────────────────────────────────────────────── */

export function ReceiptModal({ payment, onClose }: { payment: PaymentRecord | null; onClose: () => void }) {
  function print() {
    document.body.classList.add('printing-receipt')
    const cleanup = () => document.body.classList.remove('printing-receipt')
    window.addEventListener('afterprint', cleanup, { once: true })
    window.print()
    // Safari บางรุ่นไม่ยิง afterprint
    setTimeout(cleanup, 1500)
  }

  return (
    <Modal open={payment !== null} onClose={onClose} printable>
      {payment && (
        <div className="text-ws-text">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="cjk text-2xl leading-none text-gold">命合</span>
                <span className="font-display-en text-xl font-semibold text-ws-ink">Mìnghé</span>
              </div>
              <div className="mt-1 text-xs text-ws-muted">minghe.work · info@minghe.work</div>
            </div>
            <div className="text-right">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-ws-muted">ใบเสร็จรับเงิน</div>
              <div className="ws-mono text-sm font-semibold text-ws-ink">{payment.receiptNo}</div>
              <div className="text-xs text-ws-muted">{fmtDate(payment.paidAt, true)}</div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 rounded-xl bg-ws-raised p-4 text-sm sm:grid-cols-2">
            <div>
              <div className="text-[11px] text-ws-muted">ลูกค้า</div>
              <div className="font-medium text-ws-ink">{payment.customerName || '—'}</div>
              <div className="ws-mono text-xs text-ws-soft">{payment.customerEmail}</div>
            </div>
            <div>
              <div className="text-[11px] text-ws-muted">อ้างอิง</div>
              <div className="ws-mono text-xs text-ws-soft">คำสั่งซื้อ {payment.orderCode}</div>
              <div className="ws-mono text-xs text-ws-soft">{payment.providerRef || '—'}</div>
            </div>
          </div>

          <table className="mt-5 w-full text-sm">
            <thead>
              <tr className="border-b border-ws-border text-left text-[11px] uppercase tracking-wide text-ws-muted">
                <th className="py-2 font-semibold">รายการ</th>
                <th className="py-2 text-right font-semibold">จำนวนเงิน</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-ws-border/70">
                <td className="py-3">
                  {payment.description}
                  <div className="text-xs text-ws-muted">วิธีชำระ: {methodLabel(payment.method)}</div>
                </td>
                <td className="ws-mono py-3 text-right">{baht(payment.amount)}</td>
              </tr>
              {payment.refundAmount > 0 && (
                <tr className="border-b border-ws-border/70 text-ws-danger">
                  <td className="py-3">
                    คืนเงิน {fmtDate(payment.refundedAt)}
                    <div className="text-xs">{payment.refundReason}</div>
                  </td>
                  <td className="ws-mono py-3 text-right">−{baht(payment.refundAmount)}</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <td className="pt-3 text-right font-medium">ยอดสุทธิ</td>
                <td className="ws-mono pt-3 text-right text-lg font-semibold text-ws-ink">{baht(payment.amount - payment.refundAmount)}</td>
              </tr>
            </tfoot>
          </table>

          <div className="mt-4 flex items-center justify-between gap-3">
            <Badge tone={paymentTone(payment.status)} dot>{paymentStatusLabel(payment.status)}</Badge>
            <p className="text-[10px] text-ws-faint">เอกสารนี้ออกโดยระบบอัตโนมัติ · ยอดเป็นเงินบาท (THB)</p>
          </div>

          <div className="no-print mt-5 flex justify-end gap-2">
            <button onClick={onClose} className="ws-btn-ghost">ปิด</button>
            <button onClick={print} className="ws-btn-primary">
              <Icon name="printer" size={15} /> พิมพ์ / บันทึก PDF
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
