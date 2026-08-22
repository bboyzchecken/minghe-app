'use client'

/**
 * สมาชิกองค์กร + ฟอร์มเชิญสมาชิกจริง (F-05)
 *
 * จุดที่เจ้าของกับ HR ต่างกันชัดที่สุด — HR เห็นรายชื่อได้แต่เชิญคนไม่ได้
 * สิทธิ์นี้ถูกบังคับสองชั้น: ซ่อนฟอร์มที่ UI และ API ตอบ 403 ถ้าเรียกตรง
 *
 * เชิญอีเมลที่ยังไม่มีบัญชีได้ — คำเชิญจะค้างไว้แล้วผูกให้อัตโนมัติเมื่อเจ้าตัวเข้าระบบครั้งแรก
 * (ไม่งั้นเจ้าของต้องไปไล่บอกให้อีกฝ่ายสมัครก่อน แล้วค่อยกลับมากดเพิ่ม)
 */

import { useState } from 'react'
import type { OrgRole, SessionUser } from '@/lib/api'
import {
  useInviteOrgMember,
  useOrgInvites,
  useOrgMembers,
  useRemoveOrgMember,
  useRevokeOrgInvite,
} from '@/lib/queries'

const ROLE_LABEL: Record<OrgRole, string> = {
  owner: 'เจ้าของ',
  hr: 'HR',
  viewer: 'ผู้ดูอย่างเดียว',
}

const ROLE_COLOR: Record<OrgRole, string> = {
  owner: '#b07d2b',
  hr: '#5E9BB5',
  viewer: '#7a7369',
}

export function OrgMembersCard({ user }: { user: SessionUser }) {
  const isOwner = user.orgRole !== 'hr' && user.orgRole !== 'viewer'
  const { data: members = [], isPending, error } = useOrgMembers()
  const { data: invites = [] } = useOrgInvites()
  const invite = useInviteOrgMember()
  const removeMember = useRemoveOrgMember()
  const revokeInvite = useRevokeOrgInvite()

  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<OrgRole>('hr')
  const [notice, setNotice] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  async function submit() {
    setFormError(null)
    setNotice(null)
    const trimmed = email.trim()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) {
      setFormError('กรุณากรอกอีเมลให้ถูกต้อง')
      return
    }
    try {
      const result = await invite.mutateAsync({ email: trimmed, role })
      setEmail('')
      setOpen(false)
      setNotice(
        result.outcome === 'invite-sent'
          ? `ส่งคำเชิญไปที่ ${result.email} แล้ว — จะเข้าเป็นสมาชิกอัตโนมัติเมื่อสมัครด้วยอีเมลนี้`
          : result.outcome === 'role-updated'
            ? `อัปเดตบทบาทของ ${result.email} เป็น ${ROLE_LABEL[result.role]} แล้ว`
            : `เพิ่ม ${result.email} เข้าองค์กรเรียบร้อย`,
      )
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'เชิญสมาชิกไม่สำเร็จ')
    }
  }

  return (
    <div className="rounded-xl border border-line bg-card p-6 shadow-soft">
      <div className="flex items-center justify-between">
        <h2 className="text-lg">สมาชิกองค์กร</h2>
        {!isPending && <span className="text-xs text-muted">{members.length} คน</span>}
      </div>

      {error && (
        <p className="mt-3 rounded-lg border border-terracotta/40 bg-terracotta/[0.07] px-3 py-2 text-xs text-terracotta">
          {error.message}
        </p>
      )}

      <div className="mt-3 space-y-2">
        {isPending ? (
          <div className="h-12 animate-pulse rounded-lg bg-paper-warm" aria-hidden="true" />
        ) : (
          members.map((member) => (
            <div
              key={member.userId}
              className="flex items-center justify-between gap-2 rounded-lg bg-paper-warm/50 px-3 py-2"
            >
              <div className="min-w-0">
                <div className="truncate text-sm text-ink">
                  {member.name}
                  {member.isMe && <span className="ml-1 text-xs text-muted">(คุณ)</span>}
                </div>
                <div className="truncate font-body-en text-[11px] text-muted">{member.email}</div>
              </div>
              <div className="flex flex-none items-center gap-2">
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{ color: ROLE_COLOR[member.role], background: `${ROLE_COLOR[member.role]}14` }}
                >
                  {ROLE_LABEL[member.role]}
                </span>
                {isOwner && !member.isMe && member.role !== 'owner' && (
                  <button
                    onClick={() => void removeMember.mutateAsync(member.userId).catch(() => undefined)}
                    disabled={removeMember.isPending}
                    className="text-[11px] text-terracotta hover:underline disabled:opacity-50"
                  >
                    นำออก
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {invites.length > 0 && (
        <div className="mt-4">
          <div className="text-xs font-medium text-ink">รอตอบรับ</div>
          <div className="mt-2 space-y-1.5">
            {invites.map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-line px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="truncate font-body-en text-xs text-ink">{row.email}</div>
                  <div className="text-[11px] text-muted">
                    เชิญเป็น {ROLE_LABEL[row.role]} · ยังไม่ได้สมัครสมาชิก
                  </div>
                </div>
                {isOwner && (
                  <button
                    onClick={() => void revokeInvite.mutateAsync(row.id).catch(() => undefined)}
                    className="flex-none text-[11px] text-terracotta hover:underline"
                  >
                    ยกเลิก
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {notice && (
        <p className="mt-4 rounded-lg border border-jade/40 bg-jade/[0.07] px-3 py-2 text-xs text-jade">
          {notice}
        </p>
      )}

      {!isOwner ? (
        <p className="mt-4 flex items-start gap-2 rounded-lg bg-paper-warm/60 px-3 py-2 text-xs text-muted">
          <span>🔒</span>
          การเพิ่ม/ลบสมาชิกสงวนไว้เฉพาะเจ้าของบัญชีองค์กร — ติดต่อเจ้าของบัญชีหากต้องการเพิ่มคน
        </p>
      ) : open ? (
        <form
          className="mt-4 rounded-lg border border-line bg-paper-warm/40 p-3"
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
          }}
          noValidate
        >
          <label className="block">
            <span className="field-label">อีเมลผู้ถูกเชิญ</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field"
              placeholder="colleague@company.co.th"
              autoComplete="off"
            />
          </label>
          <label className="mt-3 block">
            <span className="field-label">บทบาท</span>
            <select value={role} onChange={(e) => setRole(e.target.value as OrgRole)} className="field">
              <option value="hr">HR — วิเคราะห์ candidate และจัดการทีมได้</option>
              <option value="viewer">ผู้ดูอย่างเดียว — เปิดอ่านรายงานได้</option>
              <option value="owner">เจ้าของ — จัดการได้ทุกอย่างรวมถึงสมาชิก</option>
            </select>
          </label>

          <p className="mt-2 text-[11px] text-muted">
            ยังไม่มีบัญชีก็เชิญได้ — ระบบจะพาเข้าองค์กรให้อัตโนมัติเมื่อเขาสมัครด้วยอีเมลนี้
          </p>

          {formError && <p className="mt-2 text-xs text-terracotta">{formError}</p>}

          <div className="mt-3 flex gap-2">
            <button type="submit" disabled={invite.isPending} className="btn-primary !py-2 text-xs disabled:opacity-50">
              {invite.isPending ? 'กำลังส่ง…' : 'ส่งคำเชิญ'}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost !py-2 text-xs">
              ยกเลิก
            </button>
          </div>
        </form>
      ) : (
        <button onClick={() => setOpen(true)} className="btn-ghost mt-4 w-full !py-2 text-sm">
          + เชิญสมาชิกใหม่
        </button>
      )}
    </div>
  )
}
