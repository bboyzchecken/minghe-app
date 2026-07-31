'use client'

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

export interface BirthValue {
  name: string
  gender: 'male' | 'female' | ''
  birthDate: string
  birthTime: string
  province: string
}

export const emptyBirth: BirthValue = {
  name: '',
  gender: '',
  birthDate: '',
  birthTime: '',
  province: '',
}

export function BirthFields({
  value,
  onChange,
  nameLabel = 'ชื่อ',
  showGender = true,
  showName = true,
}: {
  value: BirthValue
  onChange: (v: BirthValue) => void
  nameLabel?: string
  showGender?: boolean
  showName?: boolean
}) {
  const set = (patch: Partial<BirthValue>) => onChange({ ...value, ...patch })
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {showName && (
        <Field label={nameLabel} className={showGender ? '' : 'sm:col-span-2'}>
          <TextInput
            value={value.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="เช่น พรนิษฐ์"
          />
        </Field>
      )}
      {showGender && (
        <Field label="เพศ">
          <Select value={value.gender} onChange={(e) => set({ gender: e.target.value as BirthValue['gender'] })}>
            <option value="">— ระบุ —</option>
            <option value="female">หญิง</option>
            <option value="male">ชาย</option>
          </Select>
        </Field>
      )}
      <Field label="วันเกิด (ค.ศ.)">
        <TextInput type="date" value={value.birthDate} onChange={(e) => set({ birthDate: e.target.value })} />
      </Field>
      <Field label="เวลาเกิด" hint="ยิ่งแม่นยิ่งดี — เสาเวลาเป็นหัวใจของความแม่น">
        <TextInput type="time" value={value.birthTime} onChange={(e) => set({ birthTime: e.target.value })} />
      </Field>
      <Field label="จังหวัดเกิด" hint="ใช้ปรับเวลาสุริยะจริง (真太陽時)" className="sm:col-span-2">
        <ProvinceSelect value={value.province} onChange={(v) => set({ province: v })} />
      </Field>
    </div>
  )
}
