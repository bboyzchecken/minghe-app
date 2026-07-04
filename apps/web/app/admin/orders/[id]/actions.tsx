'use client'

/**
 * ปุ่มจัดการออเดอร์ฝั่ง admin — เรียก API พร้อม confirm ก่อนทุกครั้ง
 * (ประมวลผล / สร้างรายงานใหม่ / เพิกถอน-คืนสิทธิ์ / ตั้ง PIN / ตั้งวันหมดอายุ)
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, FieldHint, Input, Label, Notice, Select } from '@/components/ui'

interface OrderActionsProps {
  orderId: string
  hasReport: boolean
  isPaid: boolean
  revoked: boolean
  hasPin: boolean
}

type Feedback = { tone: 'success' | 'danger'; text: string } | null

const EXPIRY_OPTIONS = [
  { value: '30', label: '30 วันนับจากวันนี้' },
  { value: '90', label: '90 วันนับจากวันนี้' },
  { value: '180', label: '180 วันนับจากวันนี้' },
  { value: 'none', label: 'ไม่หมดอายุ' },
]

export function OrderActions({ orderId, hasReport, isPaid, revoked, hasPin }: OrderActionsProps) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [pin, setPin] = useState('')
  const [expiry, setExpiry] = useState('')

  async function callApi(options: {
    action: string
    path: string
    body?: unknown
    confirmText: string
    successText: string
  }): Promise<boolean> {
    if (!window.confirm(options.confirmText)) return false
    setBusy(options.action)
    setFeedback(null)
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/${options.path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: options.body === undefined ? '{}' : JSON.stringify(options.body),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setFeedback({ tone: 'danger', text: data.error ?? 'เกิดข้อผิดพลาด โปรดลองอีกครั้ง' })
        return false
      }
      setFeedback({ tone: 'success', text: options.successText })
      router.refresh()
      return true
    } catch {
      setFeedback({ tone: 'danger', text: 'เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ โปรดลองอีกครั้ง' })
      return false
    } finally {
      setBusy(null)
    }
  }

  function handleSetPin(): void {
    if (!/^[0-9]{4,8}$/.test(pin)) {
      setFeedback({ tone: 'danger', text: 'PIN ต้องเป็นตัวเลข 4-8 หลัก' })
      return
    }
    void callApi({
      action: 'pin',
      path: 'pin',
      body: { pin },
      confirmText: 'ยืนยันตั้ง PIN ใหม่สำหรับรายงานนี้? ผู้เปิดรายงานจะต้องกรอก PIN ทุกครั้ง',
      successText: 'ตั้ง PIN เรียบร้อย — อย่าลืมแจ้ง PIN ให้ผู้รับรายงาน',
    }).then((ok) => {
      if (ok) setPin('')
    })
  }

  function handleClearPin(): void {
    void callApi({
      action: 'clear-pin',
      path: 'pin',
      body: { pin: null },
      confirmText: 'ยืนยันล้าง PIN? รายงานจะเปิดได้ด้วยรหัสเปิดรายงานเพียงอย่างเดียว',
      successText: 'ล้าง PIN เรียบร้อย',
    })
  }

  function handleSetExpiry(): void {
    if (!expiry) {
      setFeedback({ tone: 'danger', text: 'โปรดเลือกอายุการเข้าถึงก่อน' })
      return
    }
    const days = expiry === 'none' ? null : Number(expiry)
    void callApi({
      action: 'expiry',
      path: 'expiry',
      body: { days },
      confirmText:
        days === null
          ? 'ยืนยันตั้งให้รายงานนี้ไม่มีวันหมดอายุ?'
          : `ยืนยันตั้งวันหมดอายุเป็น ${days} วันนับจากวันนี้?`,
      successText: 'บันทึกวันหมดอายุเรียบร้อย',
    })
  }

  return (
    <div className="space-y-5">
      {feedback ? <Notice tone={feedback.tone}>{feedback.text}</Notice> : null}

      <div className="flex flex-wrap gap-3">
        {!hasReport ? (
          <Button
            onClick={() =>
              void callApi({
                action: 'process',
                path: 'process',
                confirmText: 'ยืนยันประมวลผลออเดอร์นี้? ระบบจะคำนวณผังปาจือ (命盘) และออกรหัสเปิดรายงาน',
                successText: 'ประมวลผลเรียบร้อย — ออกรหัสเปิดรายงานแล้ว',
              })
            }
            disabled={busy !== null || !isPaid}
          >
            {busy === 'process' ? 'กำลังประมวลผล…' : 'ประมวลผลออเดอร์'}
          </Button>
        ) : (
          <>
            <Button
              variant="outline"
              onClick={() =>
                void callApi({
                  action: 'regenerate',
                  path: 'regenerate',
                  confirmText:
                    'ยืนยันสร้างรายงานใหม่ทับของเดิม? เนื้อหารายงานจะถูกคำนวณใหม่ทั้งหมด (รหัสเปิดรายงานเดิมยังใช้ได้)',
                  successText: 'สร้างรายงานใหม่เรียบร้อย — รหัสเปิดรายงานเดิมยังใช้ได้',
                })
              }
              disabled={busy !== null}
            >
              {busy === 'regenerate' ? 'กำลังสร้างใหม่…' : 'สร้างรายงานใหม่'}
            </Button>
            <Button
              variant={revoked ? 'gold' : 'outline'}
              className={revoked ? undefined : 'border-cinnabar-deep/40 text-cinnabar-deep hover:border-cinnabar-deep'}
              onClick={() =>
                void callApi({
                  action: 'revoke',
                  path: 'revoke',
                  confirmText: revoked
                    ? 'ยืนยันคืนสิทธิ์การเข้าถึง? รหัสเปิดรายงานจะกลับมาใช้ได้อีกครั้ง'
                    : 'ยืนยันเพิกถอนรายงาน? ผู้ถือรหัสเปิดรายงานจะเปิดดูไม่ได้จนกว่าจะคืนสิทธิ์',
                  successText: revoked ? 'คืนสิทธิ์การเข้าถึงเรียบร้อย' : 'เพิกถอนรายงานเรียบร้อย',
                })
              }
              disabled={busy !== null}
            >
              {busy === 'revoke'
                ? 'กำลังบันทึก…'
                : revoked
                  ? 'คืนสิทธิ์การเข้าถึง'
                  : 'เพิกถอนรายงาน'}
            </Button>
          </>
        )}
      </div>

      {!hasReport && !isPaid ? (
        <FieldHint>ออเดอร์ยังไม่ได้ชำระเงิน — ประมวลผลได้เมื่อมีรายการชำระเงินสำเร็จแล้วเท่านั้น</FieldHint>
      ) : null}

      {hasReport ? (
        <>
          <div>
            <Label htmlFor="admin-pin">PIN เสริม {hasPin ? '(ตั้งไว้แล้ว — ตั้งใหม่เพื่อแทนที่)' : ''}</Label>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                id="admin-pin"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                inputMode="numeric"
                autoComplete="off"
                maxLength={8}
                placeholder="ตัวเลข 4-8 หลัก"
                className="w-40"
              />
              <Button variant="outline" onClick={handleSetPin} disabled={busy !== null}>
                {busy === 'pin' ? 'กำลังบันทึก…' : hasPin ? 'เปลี่ยน PIN' : 'ตั้ง PIN'}
              </Button>
              {hasPin ? (
                <Button variant="ghost" onClick={handleClearPin} disabled={busy !== null}>
                  {busy === 'clear-pin' ? 'กำลังล้าง…' : 'ล้าง PIN'}
                </Button>
              ) : null}
            </div>
            <FieldHint>PIN เป็นชั้นความปลอดภัยเสริมของรหัสเปิดรายงาน — ระบบเก็บเฉพาะค่า hash</FieldHint>
          </div>

          <div>
            <Label htmlFor="admin-expiry">อายุการเข้าถึงรายงาน</Label>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                id="admin-expiry"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                className="w-56"
              >
                <option value="">— เลือกอายุการเข้าถึง —</option>
                {EXPIRY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
              <Button variant="outline" onClick={handleSetExpiry} disabled={busy !== null}>
                {busy === 'expiry' ? 'กำลังบันทึก…' : 'ตั้งวันหมดอายุ'}
              </Button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
