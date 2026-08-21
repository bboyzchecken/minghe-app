'use client'

/**
 * DateInput — ช่องกรอกวันที่รูปแบบ วัน/เดือน/ปี (DD/MM/YYYY)
 *
 * ทำไมไม่ใช้ <input type="date">:
 *   native date input จะแสดงลำดับวัน–เดือน–ปี ตาม locale ของเบราว์เซอร์เสมอ
 *   เครื่องที่ตั้งเป็น en-US จะขึ้น MM/DD/YYYY ซึ่งเป็นสิ่งที่ UAT แจ้งมา (F-07)
 *   component นี้จึงคุมรูปแบบเองทั้งหมด ให้เห็นเป็น DD/MM/YYYY เหมือนกันทุกเครื่อง
 *
 * ค่าที่รับ–ส่งออกยังเป็น ISO (YYYY-MM-DD) เหมือนเดิม เพื่อไม่กระทบ engine ปาจือ
 */

import { useEffect, useState } from 'react'

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/

/** ISO (2026-01-31) → ข้อความที่แสดง (31/01/2026) */
export function isoToDisplay(iso: string): string {
  const m = ISO_RE.exec(iso)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : ''
}

/** ตรวจว่าเป็นวันที่ที่มีอยู่จริง (กัน 31/02, 31/04) */
function isRealDate(d: number, m: number, y: number): boolean {
  if (y < 1900 || y > 2200 || m < 1 || m > 12 || d < 1) return false
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
}

/** ข้อความ DD/MM/YYYY → ISO — คืน '' ถ้ายังไม่ครบหรือไม่ใช่วันที่จริง */
export function displayToIso(display: string): string {
  const digits = display.replace(/\D/g, '')
  if (digits.length !== 8) return ''
  const d = Number(digits.slice(0, 2))
  const m = Number(digits.slice(2, 4))
  const y = Number(digits.slice(4, 8))
  if (!isRealDate(d, m, y)) return ''
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** ใส่ / คั่นให้อัตโนมัติระหว่างพิมพ์ */
function maskDigits(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean)
  return parts.join('/')
}

export function DateInput({
  value,
  onChange,
  placeholder = 'DD/MM/YYYY',
  className = '',
  ...rest
}: {
  /** ค่า ISO (YYYY-MM-DD) — '' ถ้ายังไม่ได้กรอก */
  value: string
  /** ส่งกลับเป็น ISO — '' เมื่อยังกรอกไม่ครบหรือวันที่ไม่มีอยู่จริง */
  onChange: (iso: string) => void
  placeholder?: string
  className?: string
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'>) {
  const [text, setText] = useState(() => isoToDisplay(value))

  // sync เมื่อค่าถูกเปลี่ยนจากภายนอก (เช่น กดย้อนกลับใน wizard แล้วโหลดค่าเดิม)
  useEffect(() => {
    if (displayToIso(text) !== value) setText(isoToDisplay(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const complete = text.replace(/\D/g, '').length === 8
  const invalid = complete && displayToIso(text) === ''

  return (
    <>
      <input
        {...rest}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        maxLength={10}
        placeholder={placeholder}
        value={text}
        onChange={(e) => {
          const masked = maskDigits(e.target.value)
          setText(masked)
          onChange(displayToIso(masked))
        }}
        className={`field ${invalid ? '!border-terracotta' : ''} ${className}`}
      />
      {invalid && (
        <span className="mt-1 block text-xs text-terracotta">
          วันที่ไม่ถูกต้อง — กรุณาระบุ วัน/เดือน/ปี เช่น 31/01/1990
        </span>
      )}
    </>
  )
}
