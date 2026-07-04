/**
 * UI primitives ตามแบรนด์ 命合 — ใช้ร่วมกันทุกหน้า
 * (server-component friendly — ไม่มี client hooks)
 */

import Link from 'next/link'
import type { ElementKey } from '@minghe/core'
import { cn } from '@/lib/utils'

/** ---- ตราประทับ 命合 (Seal Mark) ---- */
export function Seal({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex select-none items-center justify-center rounded-md bg-cinnabar text-center font-cjk font-bold leading-none text-paper',
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.42, borderRadius: size * 0.22 }}
      aria-hidden
    >
      命<br />合
    </span>
  )
}

/** โลโก้เต็ม: ตราประทับ + wordmark */
export function BrandLockup({ dark = false, className }: { dark?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <Seal size={36} />
      <span className="flex flex-col leading-tight">
        <span className={cn('font-display-en text-lg tracking-[0.25em]', dark ? 'text-paper' : 'text-ink')}>
          MÍNGHÉ
        </span>
        <span className={cn('text-[11px]', dark ? 'text-gold-soft' : 'text-muted')}>
          หมิงเหอ · ดูสมพงษ์คนกับองค์กร
        </span>
      </span>
    </span>
  )
}

/** ---- ปุ่ม ---- */
type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'gold'

const buttonStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-cinnabar text-paper hover:bg-cinnabar-deep focus-visible:outline-cinnabar shadow-sm',
  outline:
    'border border-line bg-transparent text-ink hover:border-gold hover:text-cinnabar-deep',
  ghost: 'bg-transparent text-ink hover:bg-paper-warm',
  gold: 'border border-gold bg-transparent text-gold hover:bg-gold hover:text-ink',
}

export function Button({
  variant = 'primary',
  href,
  className,
  children,
  ...props
}: {
  variant?: ButtonVariant
  href?: string
  className?: string
  children: React.ReactNode
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const classes = cn(
    'inline-flex items-center justify-center gap-2 rounded-md px-5 py-2.5 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50',
    buttonStyles[variant],
    className,
  )
  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    )
  }
  return (
    <button className={classes} {...props}>
      {children}
    </button>
  )
}

/** ---- การ์ด ---- */
export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('rounded-lg border border-line bg-cloud p-6 shadow-card', className)}>
      {children}
    </div>
  )
}

export function SectionTitle({
  eyebrow,
  title,
  description,
  dark = false,
  className,
}: {
  eyebrow?: string
  title: string
  description?: string
  dark?: boolean
  className?: string
}) {
  return (
    <div className={cn('mx-auto max-w-2xl text-center', className)}>
      {eyebrow ? (
        <p className={cn('mb-2 text-sm font-semibold tracking-wide', dark ? 'text-gold-soft' : 'text-cinnabar')}>
          {eyebrow}
        </p>
      ) : null}
      <h2 className={cn('text-3xl font-semibold md:text-4xl', dark ? 'text-paper' : 'text-ink')}>
        {title}
      </h2>
      {description ? (
        <p className={cn('mt-3 text-base', dark ? 'text-paper/70' : 'text-muted')}>{description}</p>
      ) : null}
    </div>
  )
}

export function GoldDivider({ className }: { className?: string }) {
  return <div className={cn('gold-divider my-6', className)} />
}

/** ---- ฟอร์ม ---- */
export function Label({
  className,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn('mb-1.5 block text-sm font-semibold text-ink', className)} {...props}>
      {children}
    </label>
  )
}

const inputBase =
  'w-full rounded-sm border border-line bg-cloud px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/60 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold'

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputBase, className)} {...props} />
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(inputBase, 'bg-cloud', className)} {...props}>
      {children}
    </select>
  )
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputBase, 'min-h-24', className)} {...props} />
}

export function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-xs text-muted">{children}</p>
}

/** ---- ป้าย/สถานะ ---- */
export function Badge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'gold'
  className?: string
  children: React.ReactNode
}) {
  const tones = {
    neutral: 'bg-paper-warm text-ink-soft border-line',
    success: 'bg-jade/10 text-jade border-jade/30',
    warning: 'bg-gold/10 text-gold border-gold/40',
    danger: 'bg-cinnabar-deep/10 text-cinnabar-deep border-cinnabar-deep/30',
    info: 'bg-element-water/10 text-element-water border-element-water/30',
    gold: 'bg-gold-soft/30 text-ink border-gold/40',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

/** ---- ห้าธาตุ ---- */
export const ELEMENT_COLOR: Record<ElementKey, string> = {
  wood: '#5C9A6F',
  fire: '#C24A32',
  earth: '#C89B4A',
  metal: '#9AA0AC',
  water: '#2E4372',
}

export const ELEMENT_TH: Record<ElementKey, string> = {
  wood: 'ไม้',
  fire: 'ไฟ',
  earth: 'ดิน',
  metal: 'ทอง',
  water: 'น้ำ',
}

export const ELEMENT_CN: Record<ElementKey, string> = {
  wood: '木',
  fire: '火',
  earth: '土',
  metal: '金',
  water: '水',
}

export function ElementChip({ element, className }: { element: ElementKey; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold text-white',
        className,
      )}
      style={{ backgroundColor: ELEMENT_COLOR[element] }}
    >
      <span className="font-cjk">{ELEMENT_CN[element]}</span>
      {ELEMENT_TH[element]}
    </span>
  )
}

/** แถบสัดส่วนห้าธาตุ (ใช้ในรายงาน/ดวง) */
export function ElementBar({
  percentages,
  className,
}: {
  percentages: Record<ElementKey, number>
  className?: string
}) {
  const order: ElementKey[] = ['wood', 'fire', 'earth', 'metal', 'water']
  return (
    <div className={cn('space-y-2', className)}>
      {order.map((el) => (
        <div key={el} className="flex items-center gap-3">
          <span className="w-16 shrink-0 text-sm">
            <span className="font-cjk">{ELEMENT_CN[el]}</span> {ELEMENT_TH[el]}
          </span>
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-paper-warm">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(100, percentages[el])}%`,
                backgroundColor: ELEMENT_COLOR[el],
              }}
            />
          </div>
          <span className="w-12 shrink-0 text-right font-mono text-xs text-muted">
            {percentages[el]}%
          </span>
        </div>
      ))}
    </div>
  )
}

/** วงแหวนคะแนนดัชนีสมพงษ์ */
export function ScoreRing({
  score,
  label,
  size = 140,
}: {
  score: number
  label?: string
  size?: number
}) {
  const stroke = 10
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const filled = (score / 100) * circumference
  const color = score >= 80 ? '#4F8073' : score >= 65 ? '#C1A15C' : score >= 50 ? '#C89B4A' : '#9C3A27'
  return (
    <div className="inline-flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E5DCC9"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference - filled}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text
          x="50%"
          y="47%"
          textAnchor="middle"
          dominantBaseline="central"
          className="font-mono"
          fontSize={size * 0.24}
          fontWeight={600}
          fill="#16182E"
        >
          {score}
        </text>
        <text
          x="50%"
          y="64%"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={size * 0.09}
          fill="#6E6E7C"
        >
          / 100
        </text>
      </svg>
      {label ? <span className="mt-1 text-sm font-semibold text-ink">{label}</span> : null}
    </div>
  )
}

/** ป้ายเสาปาจือ (ใช้แสดงผังดวง) */
export function PillarCard({
  positionTh,
  ganzhi,
  stemTh,
  branchTh,
  animalTh,
  tenGodTh,
  stemElement,
  branchElement,
}: {
  positionTh: string
  ganzhi: string
  stemTh: string
  branchTh: string
  animalTh: string
  tenGodTh?: string | null
  stemElement: ElementKey
  branchElement: ElementKey
}) {
  return (
    <div className="print-avoid-break flex flex-col items-center rounded-md border border-line bg-cloud p-4 text-center">
      <span className="text-xs font-semibold text-muted">{positionTh}</span>
      <span className="mt-2 font-cjk text-4xl font-bold leading-none text-ink">
        {ganzhi.charAt(0)}
      </span>
      <span
        className="mt-1 text-[11px] font-semibold"
        style={{ color: ELEMENT_COLOR[stemElement] }}
      >
        {stemTh} · {ELEMENT_TH[stemElement]}
      </span>
      <span className="mt-2 font-cjk text-4xl font-bold leading-none text-ink">
        {ganzhi.charAt(1)}
      </span>
      <span
        className="mt-1 text-[11px] font-semibold"
        style={{ color: ELEMENT_COLOR[branchElement] }}
      >
        {branchTh} ({animalTh}) · {ELEMENT_TH[branchElement]}
      </span>
      {tenGodTh ? <span className="mt-2 text-[11px] text-muted">{tenGodTh}</span> : null}
    </div>
  )
}

/** สถิติย่อ (dashboard/admin) */
export function Stat({
  label,
  value,
  hint,
}: {
  label: string
  value: string | number
  hint?: string
}) {
  return (
    <Card className="p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 font-mono text-2xl font-semibold text-ink">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </Card>
  )
}

/** กล่องแจ้งเตือน */
export function Notice({
  tone = 'info',
  children,
  className,
}: {
  tone?: 'info' | 'success' | 'warning' | 'danger'
  children: React.ReactNode
  className?: string
}) {
  const tones = {
    info: 'border-element-water/30 bg-element-water/5 text-ink',
    success: 'border-jade/30 bg-jade/5 text-ink',
    warning: 'border-gold/40 bg-gold/5 text-ink',
    danger: 'border-cinnabar-deep/30 bg-cinnabar-deep/5 text-ink',
  }
  return (
    <div className={cn('rounded-md border px-4 py-3 text-sm', tones[tone], className)}>
      {children}
    </div>
  )
}
