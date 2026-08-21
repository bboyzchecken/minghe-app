'use client'

import type { OtpChallenge } from '@/lib/api'

/** ช่องกรอก OTP 6 หลัก — ใช้ร่วมกันระหว่างหน้าสมัครสมาชิกและหน้ารีเซ็ตรหัสผ่าน */
export function OtpField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="mt-4 block">
      <span className="field-label">รหัสยืนยัน 6 หลัก</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder="••••••"
        className="field text-center font-body-en text-xl tracking-[0.5em]"
        maxLength={6}
        autoFocus
      />
    </label>
  )
}

/**
 * บอกผู้ใช้ว่ารหัสถูกส่งไปไหน พร้อมเลขอ้างอิงไว้เทียบกับในอีเมล
 *
 * ถ้าเซิร์ฟเวอร์ส่ง devCode มา (ยังไม่ได้ตั้งค่าอีเมล + เปิด MINGHE_OTP_ECHO) จะแสดงรหัสบนหน้าจอเลย
 * พร้อมป้ายเตือนชัดเจนว่าเป็นสภาพแวดล้อมทดสอบ — บน production ค่านี้ต้องไม่มี
 */
export function OtpHint({ email, challenge }: { email: string; challenge: OtpChallenge }) {
  if (!challenge.ref) {
    return (
      <div className="rounded-lg border border-line bg-paper-warm/50 p-4 text-sm text-ink-soft">
        ถ้าอีเมล <b className="text-ink">{email}</b> ยังไม่เคยใช้ในระบบ เราได้ส่งรหัสยืนยันไปแล้ว
        — ถ้ามีบัญชีอยู่แล้วจะไม่ได้รับรหัส กรุณาเข้าสู่ระบบหรือใช้เมนูลืมรหัสผ่านแทน
      </div>
    )
  }
  return (
    <div className="rounded-lg border border-line bg-paper-warm/50 p-4 text-sm text-ink-soft">
      ส่งรหัสยืนยันไปที่ <b className="text-ink">{email}</b> แล้ว · เลขอ้างอิง{' '}
      <span className="font-body-en font-semibold tracking-wider text-ink">{challenge.ref}</span>
      <span className="block text-xs text-muted">รหัสมีอายุ 10 นาที — ตรวจกล่องจดหมายขยะด้วยหากไม่พบ</span>
      {challenge.devCode && (
        <div className="mt-3 rounded-md border border-dashed border-terracotta/50 bg-terracotta/[0.05] p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-terracotta">
            สภาพแวดล้อมทดสอบ — ยังไม่ได้ตั้งค่าส่งอีเมล
          </div>
          <div className="mt-1 font-body-en text-2xl font-semibold tracking-[0.4em] text-ink">
            {challenge.devCode}
          </div>
          <div className="text-xs text-muted">ระบบแสดงรหัสให้ตรงนี้แทนการส่งอีเมล</div>
        </div>
      )}
    </div>
  )
}
