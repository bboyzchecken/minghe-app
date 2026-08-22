'use client'

/**
 * "ให้สิทธิ์ทดลองใช้" — แอดมินใช้กับลูกค้าที่ทักมาซื้อ/ขอลองทางไลน์หรือแชท
 *
 * ผลลัพธ์: ผู้ใช้คนนั้นเดินโฟลว์สั่งซื้อตามปกติ แต่ขั้นชำระเงินระบบหักสิทธิ์ให้ ยอดเป็น 0
 * และยังออกใบเสร็จ 0 บาทไว้ใน Bill & Payment เป็นหลักฐาน
 */

import { useState } from 'react'
import type { AdminUserRow, GrantCreditInput } from '@/lib/api'
import { useAdminGrantCredit } from '@/lib/queries'
import { Modal } from './ui'

export function GrantCreditModal({
  user,
  onClose,
  onDone,
}: {
  user: Pick<AdminUserRow, 'id' | 'email' | 'name'> | null
  onClose: () => void
  onDone: (message: string) => void
}) {
  const grant = useAdminGrantCredit()
  const [product, setProduct] = useState<NonNullable<GrantCreditInput['product']>>('any')
  const [depth, setDepth] = useState<'' | NonNullable<GrantCreditInput['depth']>>('')
  const [quantity, setQuantity] = useState(1)
  const [expiresDays, setExpiresDays] = useState(30)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  function submit() {
    if (!user) return
    setError(null)
    grant.mutate(
      { userId: user.id, input: { product, depth: depth || undefined, quantity, expiresDays, note } },
      {
        onSuccess: () => {
          onDone(`ให้สิทธิ์ทดลอง ${quantity} ครั้งแก่ ${user.email} แล้ว — เขาสั่งซื้อได้เลยโดยไม่ต้องจ่าย`)
          onClose()
        },
        onError: (e) => setError(e instanceof Error ? e.message : 'ทำรายการไม่สำเร็จ'),
      },
    )
  }

  return (
    <Modal open={user !== null} onClose={onClose} title="ให้สิทธิ์ทดลองใช้">
      {user && (
        <div className="space-y-4">
          <div className="rounded-lg bg-ws-raised px-3 py-2 text-sm">
            <div className="font-medium text-ws-ink">{user.name}</div>
            <div className="ws-mono text-xs text-ws-muted">{user.email}</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="ws-label">ใช้กับฝั่ง</label>
              <select value={product} onChange={(e) => setProduct(e.target.value as typeof product)} className="ws-input">
                <option value="any">ฝั่งไหนก็ได้</option>
                <option value="employer">องค์กร</option>
                <option value="jobseeker">คนทำงาน</option>
              </select>
            </div>
            <div>
              <label className="ws-label">ระดับรายงาน</label>
              <select value={depth} onChange={(e) => setDepth(e.target.value as typeof depth)} className="ws-input">
                <option value="">ระดับไหนก็ได้</option>
                <option value="standard">Standard</option>
                <option value="premium">Premium</option>
                <option value="executive">Executive</option>
              </select>
            </div>
            <div>
              <label className="ws-label">จำนวนครั้ง</label>
              <input type="number" min={1} max={10} value={quantity} onChange={(e) => setQuantity(Math.min(10, Math.max(1, Number(e.target.value) || 1)))} className="ws-input ws-mono" />
            </div>
            <div>
              <label className="ws-label">หมดอายุใน (วัน)</label>
              <input type="number" min={0} max={365} value={expiresDays} onChange={(e) => setExpiresDays(Math.max(0, Number(e.target.value) || 0))} className="ws-input ws-mono" />
              <p className="mt-1 text-[11px] text-ws-faint">0 = ไม่หมดอายุ</p>
            </div>
          </div>

          <div>
            <label className="ws-label">บันทึกภายใน (ลูกค้าไม่เห็น)</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="เช่น ทักไลน์ 22/8 ขอลองก่อนตัดสินใจซื้อแพ็กรายเดือน" className="ws-input" />
          </div>

          {error && <p className="rounded-lg bg-ws-danger-soft px-3 py-2 text-sm text-ws-danger">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button onClick={onClose} className="ws-btn-ghost">ยกเลิก</button>
            <button onClick={submit} disabled={grant.isPending} className="ws-btn-primary">
              {grant.isPending ? 'กำลังบันทึก…' : 'ให้สิทธิ์'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
