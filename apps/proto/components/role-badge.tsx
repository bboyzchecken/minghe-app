'use client'

import type { SessionUser } from '@/lib/api/types'
import { roleOf } from '@/lib/roles'

/**
 * ป้ายบทบาทข้างชื่อผู้ใช้ — ให้รู้ทันทีว่ากำลังใช้งานในฐานะอะไร
 * (เจ้าของ / HR / คนทำงาน / แอดมิน) สีตาม ROLE_META
 */
export function RoleBadge({ user, size = 'sm' }: { user: SessionUser; size?: 'sm' | 'md' }) {
  const role = roleOf(user)
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs'
      }`}
      style={{ color: role.color, borderColor: `${role.color}55`, background: `${role.color}0f` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: role.color }} aria-hidden="true" />
      {role.badge}
    </span>
  )
}
