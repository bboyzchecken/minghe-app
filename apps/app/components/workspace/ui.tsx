'use client'

/**
 * ชิ้นส่วน UI ของ workspace — ใช้ซ้ำทุกหน้า dashboard/admin/profile
 * ตั้งใจให้เล็กและตรงไปตรงมา: หน้าไหนอยากได้อะไรมากกว่านี้ให้ประกอบจากชิ้นเหล่านี้ ไม่เพิ่ม prop
 */

import { useEffect } from 'react'
import { Icon, type IconName } from './icons'

export type Tone = 'neutral' | 'accent' | 'success' | 'warn' | 'danger' | 'info' | 'violet'

const TONE_BG: Record<Tone, string> = {
  neutral: 'bg-ws-raised text-ws-soft',
  accent: 'bg-ws-accent-soft text-ws-accent-deep',
  success: 'bg-ws-success-soft text-ws-success',
  warn: 'bg-ws-warn-soft text-ws-warn',
  danger: 'bg-ws-danger-soft text-ws-danger',
  info: 'bg-ws-info-soft text-ws-info',
  violet: 'bg-ws-violet-soft text-ws-violet',
}

const TONE_DOT: Record<Tone, string> = {
  neutral: 'bg-ws-faint',
  accent: 'bg-ws-accent',
  success: 'bg-ws-success',
  warn: 'bg-ws-warn',
  danger: 'bg-ws-danger',
  info: 'bg-ws-info',
  violet: 'bg-ws-violet',
}

/* ── หัวหน้า ─────────────────────────────────────────────── */

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: string
  description?: React.ReactNode
  actions?: React.ReactNode
  eyebrow?: string
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3 md:mb-6">
      <div className="min-w-0">
        {eyebrow && <div className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-ws-muted">{eyebrow}</div>}
        <h1 className="text-xl font-semibold md:text-2xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-ws-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

/* ── กล่อง ───────────────────────────────────────────────── */

export function Panel({
  title,
  description,
  action,
  children,
  className = '',
  padded = true,
}: {
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  padded?: boolean
}) {
  return (
    <section className={`ws-panel ${className}`}>
      {(title || action) && (
        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-ws-border px-4 py-3 md:px-5">
          <div>
            {title && <h2 className="text-sm font-semibold text-ws-ink md:text-base">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-ws-muted">{description}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={padded ? 'p-4 md:p-5' : ''}>{children}</div>
    </section>
  )
}

/* ── ตัวเลขสรุป ─────────────────────────────────────────── */

export function StatTile({
  label,
  value,
  hint,
  tone = 'neutral',
  icon,
  delta,
}: {
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
  tone?: Tone
  icon?: IconName
  /** เปลี่ยนแปลงเทียบช่วงก่อน เช่น "+12%" */
  delta?: { value: string; positive: boolean }
}) {
  return (
    <div className="ws-panel p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-ws-muted">{label}</span>
        {icon && (
          <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${TONE_BG[tone]}`}>
            <Icon name={icon} size={15} />
          </span>
        )}
      </div>
      <div className="ws-mono mt-2 text-2xl font-semibold leading-none text-ws-ink md:text-[28px]">{value}</div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-ws-muted">
        {delta && (
          <span className={`ws-mono font-medium ${delta.positive ? 'text-ws-success' : 'text-ws-danger'}`}>{delta.value}</span>
        )}
        {hint && <span>{hint}</span>}
      </div>
    </div>
  )
}

/* ── ป้าย ────────────────────────────────────────────────── */

export function Badge({ tone = 'neutral', children, dot }: { tone?: Tone; children: React.ReactNode; dot?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-medium ${TONE_BG[tone]}`}>
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${TONE_DOT[tone]}`} />}
      {children}
    </span>
  )
}

/* ── ข้อความผลลัพธ์ ─────────────────────────────────────── */

export function Notice({ tone = 'info', children, onClose }: { tone?: Tone; children: React.ReactNode; onClose?: () => void }) {
  return (
    <div className={`mb-4 flex items-start justify-between gap-3 rounded-lg px-4 py-2.5 text-sm ${TONE_BG[tone]}`}>
      <span>{children}</span>
      {onClose && (
        <button onClick={onClose} className="opacity-70 hover:opacity-100" aria-label="ปิด">
          <Icon name="x" size={14} />
        </button>
      )}
    </div>
  )
}

/* ── ว่าง / โหลด ─────────────────────────────────────────── */

export function EmptyState({ icon = 'inbox', title, hint, action }: { icon?: IconName; title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-ws-border-strong bg-ws-raised/50 px-6 py-10 text-center">
      <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-ws-surface text-ws-faint shadow-ws">
        <Icon name={icon} size={20} />
      </span>
      <div className="text-sm font-medium text-ws-text">{title}</div>
      {hint && <div className="mt-1 max-w-sm text-xs text-ws-muted">{hint}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Skeleton({ rows = 3, height = 'h-14' }: { rows?: number; height?: string }) {
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={`${height} animate-pulse rounded-lg bg-ws-raised`} />
      ))}
    </div>
  )
}

/* ── สวิตช์เลือก ────────────────────────────────────────── */

export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { id: T; label: string; count?: number }[]
}) {
  return (
    <div className="inline-flex max-w-full overflow-x-auto rounded-lg border border-ws-border bg-ws-raised p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition ${
            value === o.id ? 'bg-ws-surface text-ws-ink shadow-ws' : 'text-ws-muted hover:text-ws-text'
          }`}
        >
          {o.label}
          {o.count !== undefined && <span className="ws-mono ml-1 text-ws-faint">{o.count}</span>}
        </button>
      ))}
    </div>
  )
}

/* ── หน้าต่างซ้อน ───────────────────────────────────────── */

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
  printable,
}: {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  wide?: boolean
  /** ใส่ class receipt-print ให้สั่งพิมพ์เฉพาะกล่องนี้ */
  printable?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ws-ink/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={`${printable ? 'receipt-print' : ''} max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-ws-surface shadow-ws-lg sm:rounded-2xl ${
          wide ? 'sm:max-w-2xl' : 'sm:max-w-md'
        }`}
        role="dialog"
        aria-modal="true"
      >
        {title && (
          <div className="no-print flex items-center justify-between border-b border-ws-border px-5 py-3">
            <h3 className="text-base font-semibold text-ws-ink">{title}</h3>
            <button onClick={onClose} className="rounded-md p-1 text-ws-muted hover:bg-ws-raised" aria-label="ปิด">
              <Icon name="x" size={18} />
            </button>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

/* ── ตาราง ──────────────────────────────────────────────── */

/** ตารางที่เลื่อนแนวนอนได้บนมือถือ (หน้าไม่เลื่อนตาม) */
export function TableWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-4 overflow-x-auto md:-mx-5">
      <table className="w-full min-w-[640px] text-sm">{children}</table>
    </div>
  )
}

/* ── รูปแบบค่า ──────────────────────────────────────────── */

export function baht(n: number): string {
  return `฿${n.toLocaleString('th-TH')}`
}

export function fmtDate(iso: string | null | undefined, withTime = false): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  })
}

export function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.round(diff / 60_000)
  if (m < 1) return 'เมื่อสักครู่'
  if (m < 60) return `${m} นาทีที่แล้ว`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} ชม.ที่แล้ว`
  const d = Math.round(h / 24)
  if (d < 30) return `${d} วันที่แล้ว`
  return fmtDate(iso)
}

export const PRODUCT_LABEL: Record<'employer' | 'jobseeker' | 'any', string> = {
  employer: 'องค์กร',
  jobseeker: 'คนทำงาน',
  any: 'ทุกฝั่ง',
}

export function ProductBadge({ product }: { product: 'employer' | 'jobseeker' | 'any' }) {
  return <Badge tone={product === 'employer' ? 'accent' : product === 'jobseeker' ? 'success' : 'neutral'}>{PRODUCT_LABEL[product]}</Badge>
}

export const METHOD_LABEL: Record<string, string> = {
  pending_gateway: 'รอตัดเงิน (gateway)',
  credit: 'สิทธิ์ทดลอง',
  seed: 'ข้อมูลตัวอย่าง',
  promptpay: 'PromptPay',
  card: 'บัตรเครดิต',
}

export function methodLabel(m: string): string {
  return METHOD_LABEL[m] ?? m
}
