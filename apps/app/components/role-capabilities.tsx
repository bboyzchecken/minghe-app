'use client'

import type { SessionUser } from '@/lib/api/types'
import { roleOf } from '@/lib/roles'

/**
 * การ์ด "คุณเข้าใช้ในฐานะอะไร ทำอะไรได้/ไม่ได้"
 *
 * วางไว้บน dashboard ทุกฝั่ง — ตอบคำถามแรกของผู้ทดสอบเมื่อล็อกอินด้วยบัญชีต่างกัน
 * ว่า "แล้วหน้านี้ต่างจากอีกบัญชียังไง" โดยไม่ต้องไปไล่กดหาเอง
 */
export function RoleCapabilities({ user }: { user: SessionUser }) {
  const role = roleOf(user)
  return (
    <div
      className="rounded-xl border border-line bg-card p-5 shadow-soft"
      style={{ borderLeftWidth: 4, borderLeftColor: role.color }}
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">คุณเข้าใช้ในฐานะ</div>
          <div className="mt-0.5 font-medium text-ink">{role.label}</div>
        </div>
        <span
          className="rounded-full px-2.5 py-1 text-xs font-semibold"
          style={{ color: role.color, background: `${role.color}14` }}
        >
          {role.badge}
        </span>
      </div>
      <p className="mt-2 text-xs text-ink-soft">{role.tagline}</p>

      <ul className="mt-3 space-y-1.5">
        {role.can.map((c) => (
          <li key={c} className="flex items-start gap-2 text-xs text-ink-soft">
            <span className="mt-px flex-none text-jade">✓</span>
            {c}
          </li>
        ))}
        {role.cant.map((c) => (
          <li key={c} className="flex items-start gap-2 text-xs text-muted">
            <span className="mt-px flex-none text-terracotta">🔒</span>
            {c}
          </li>
        ))}
      </ul>
    </div>
  )
}
