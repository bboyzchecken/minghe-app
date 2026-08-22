'use client'

/**
 * Admin · ผู้ใช้ — ค้นหา ระงับ/คืนสิทธิ์ และ "ให้สิทธิ์ทดลอง"
 * เคสหลัก: ลูกค้าทักมาทางไลน์/แชท → หาอีเมลที่เขาสมัคร → กดให้สิทธิ์ → เขาสั่งซื้อได้ฟรี 1 ครั้ง
 */

import { useMemo, useState } from 'react'
import { GrantCreditModal } from '@/components/workspace/grant-credit-modal'
import { Icon } from '@/components/workspace/icons'
import { Badge, EmptyState, Notice, PageHeader, Panel, Segmented, Skeleton, TableWrap, fmtDate } from '@/components/workspace/ui'
import type { AdminUserRow } from '@/lib/api'
import { useAdminCredits, useAdminSetUserStatus, useAdminUsers } from '@/lib/queries'
import { useSession } from '@/lib/session'

type Filter = 'all' | 'active' | 'deactivated' | 'credited'

export default function AdminUsersPage() {
  const { user: me } = useSession()
  const users = useAdminUsers()
  const credits = useAdminCredits()
  const setStatus = useAdminSetUserStatus()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [granting, setGranting] = useState<AdminUserRow | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const creditsByUser = useMemo(() => {
    const map = new Map<string, { available: number; used: number }>()
    for (const c of credits.data ?? []) {
      const cur = map.get(c.userId) ?? { available: 0, used: 0 }
      if (c.status === 'available') cur.available++
      if (c.status === 'used') cur.used++
      map.set(c.userId, cur)
    }
    return map
  }, [credits.data])

  const rows = (users.data ?? []).filter((u) => {
    const needle = q.trim().toLowerCase()
    if (needle && !u.email.toLowerCase().includes(needle) && !u.name.toLowerCase().includes(needle)) return false
    if (filter === 'active' || filter === 'deactivated') return u.status === filter
    if (filter === 'credited') return (creditsByUser.get(u.id)?.available ?? 0) > 0
    return true
  })

  function toggle(u: AdminUserRow) {
    const next = u.status === 'active' ? 'deactivated' : 'active'
    setNotice(null)
    setError(null)
    setStatus.mutate(
      { id: u.id, status: next },
      {
        onSuccess: () => setNotice(next === 'active' ? `คืนสิทธิ์ ${u.email} แล้ว` : `ระงับบัญชี ${u.email} แล้ว`),
        onError: (e) => setError(e instanceof Error ? e.message : 'ทำรายการไม่สำเร็จ'),
      },
    )
  }

  return (
    <>
      <PageHeader
        eyebrow="Accounts"
        title="ผู้ใช้"
        description="ลูกค้าทักมาซื้อทางไลน์หรือแชท? ค้นอีเมลที่เขาสมัคร แล้วกด “ให้สิทธิ์ทดลอง” — เขาจะสั่งซื้อได้โดยยอดเป็น 0"
      />

      {error && <Notice tone="danger" onClose={() => setError(null)}>{error}</Notice>}
      {notice && <Notice tone="success" onClose={() => setNotice(null)}>{notice}</Notice>}

      <Panel
        padded={false}
        title={
          <div className="relative w-full sm:w-72">
            <Icon name="search" size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ws-faint" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นชื่อหรืออีเมล…" className="ws-input !pl-9" />
          </div>
        }
        action={
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { id: 'all', label: 'ทั้งหมด', count: users.data?.length },
              { id: 'active', label: 'ใช้งาน' },
              { id: 'deactivated', label: 'ระงับ' },
              { id: 'credited', label: 'มีสิทธิ์ทดลอง' },
            ]}
          />
        }
      >
        {users.isPending ? (
          <div className="p-5"><Skeleton rows={4} /></div>
        ) : rows.length === 0 ? (
          <div className="p-5"><EmptyState icon="users" title="ไม่พบผู้ใช้" hint="ถ้าลูกค้ายังไม่ได้สมัคร ให้เขาสมัครด้วยอีเมลก่อน แล้วค่อยให้สิทธิ์" /></div>
        ) : (
          <>
            <ul className="divide-y divide-ws-border md:hidden">
              {rows.map((u) => (
                <li key={u.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-ws-ink">{u.name}</div>
                      <div className="ws-mono truncate text-xs text-ws-muted">{u.email}</div>
                    </div>
                    <StatusBadge status={u.status} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <RoleBadge role={u.role} />
                    <CreditBadge c={creditsByUser.get(u.id)} />
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Actions u={u} isMe={u.email === me?.email} busy={setStatus.isPending} onToggle={toggle} onGrant={setGranting} />
                  </div>
                </li>
              ))}
            </ul>

            <div className="hidden px-5 md:block">
              <TableWrap>
                <thead>
                  <tr>
                    <th className="ws-th">ผู้ใช้</th>
                    <th className="ws-th">บทบาท</th>
                    <th className="ws-th">สถานะ</th>
                    <th className="ws-th">สิทธิ์ทดลอง</th>
                    <th className="ws-th">สมัครเมื่อ</th>
                    <th className="ws-th text-right">การทำงาน</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((u) => (
                    <tr key={u.id} className="ws-row">
                      <td className="ws-td">
                        <div className="font-medium">{u.name}</div>
                        <div className="ws-mono text-xs text-ws-muted">{u.email}</div>
                      </td>
                      <td className="ws-td"><RoleBadge role={u.role} /></td>
                      <td className="ws-td"><StatusBadge status={u.status} /></td>
                      <td className="ws-td"><CreditBadge c={creditsByUser.get(u.id)} /></td>
                      <td className="ws-td text-xs text-ws-muted">{u.createdAt ? fmtDate(u.createdAt) : '—'}</td>
                      <td className="ws-td">
                        <div className="flex justify-end gap-1.5">
                          <Actions u={u} isMe={u.email === me?.email} busy={setStatus.isPending} onToggle={toggle} onGrant={setGranting} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            </div>
          </>
        )}
      </Panel>

      <GrantCreditModal user={granting} onClose={() => setGranting(null)} onDone={setNotice} />
    </>
  )
}

function StatusBadge({ status }: { status: AdminUserRow['status'] }) {
  return status === 'active' ? <Badge tone="success" dot>ใช้งานอยู่</Badge> : <Badge tone="danger" dot>ถูกระงับ</Badge>
}

function RoleBadge({ role }: { role: AdminUserRow['role'] }) {
  return role === 'admin' ? <Badge tone="violet">ผู้ดูแลระบบ</Badge> : <Badge tone="neutral">ผู้ใช้ทั่วไป</Badge>
}

function CreditBadge({ c }: { c?: { available: number; used: number } }) {
  if (!c || (c.available === 0 && c.used === 0)) return <span className="text-xs text-ws-faint">—</span>
  return (
    <span className="flex flex-wrap gap-1">
      {c.available > 0 && <Badge tone="success">ใช้ได้ {c.available}</Badge>}
      {c.used > 0 && <Badge tone="neutral">ใช้แล้ว {c.used}</Badge>}
    </span>
  )
}

function Actions({ u, isMe, busy, onToggle, onGrant }: { u: AdminUserRow; isMe: boolean; busy: boolean; onToggle: (u: AdminUserRow) => void; onGrant: (u: AdminUserRow) => void }) {
  if (isMe) return <span className="text-xs text-ws-faint">บัญชีของคุณเอง</span>
  return (
    <>
      {u.role !== 'admin' && (
        <button onClick={() => onGrant(u)} disabled={u.status !== 'active'} className="ws-btn-soft ws-btn-sm">
          <Icon name="gift" size={14} /> ให้สิทธิ์ทดลอง
        </button>
      )}
      {u.status === 'active' ? (
        <button disabled={busy} onClick={() => onToggle(u)} className="ws-btn-danger ws-btn-sm">ระงับ</button>
      ) : (
        <button disabled={busy} onClick={() => onToggle(u)} className="ws-btn-ghost ws-btn-sm">คืนสิทธิ์</button>
      )}
    </>
  )
}
