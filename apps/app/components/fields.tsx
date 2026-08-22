'use client'

/**
 * ชิ้นส่วนฟอร์มพื้นฐานที่ใช้ซ้ำทั้งโปรเจกต์
 *
 * แยกออกจาก `forms.tsx` เพราะ `birth-place-field.tsx` ต้องใช้ชิ้นส่วนเหล่านี้
 * ขณะที่ `forms.tsx` ก็ต้องใช้ `birth-place-field.tsx` — ถ้าอยู่ไฟล์เดียวกันจะ import วนกัน
 */

import { THAI_PROVINCES } from '@minghe/core'

export function Field({
  label,
  hint,
  children,
  className = '',
}: {
  label?: string
  hint?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <label className={`block ${className}`}>
      {label && <span className="field-label">{label}</span>}
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  )
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`field ${props.className ?? ''}`} />
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`field ${props.className ?? ''}`} />
}

const PROVINCES = [...THAI_PROVINCES].sort((a, b) => a.name.localeCompare(b.name, 'th'))

export function ProvinceSelect({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">— เลือกจังหวัดเกิด —</option>
      {PROVINCES.map((p) => (
        <option key={p.name} value={p.name}>
          {p.name}
        </option>
      ))}
    </Select>
  )
}
