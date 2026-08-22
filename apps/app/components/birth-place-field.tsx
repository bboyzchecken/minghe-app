'use client'

/**
 * สถานที่เกิด — วางลิงก์ Google Maps แทนการเลือกจังหวัด (F-08)
 *
 * สามข้อที่ตัดสินไว้ และโค้ดนี้ต้องทำให้ครบทั้งสาม:
 *   1. แกะลิงก์ไม่สำเร็จ → ตกกลับไปใช้ dropdown จังหวัดเดิม พร้อมบอกว่าความละเอียดลดลง (ไม่ปล่อยให้ทางตัน)
 *   2. รองรับคนเกิดต่างประเทศ → ต้องได้เขตเวลาจากพิกัด ไม่ใช่แค่ลองจิจูด
 *   3. แสดงชื่อสถานที่ + พิกัดให้ผู้ใช้ "ยืนยัน" ก่อนคำนวณ — พิกัดผิดเงียบ ๆ = ดวงผิดทั้งใบ
 *
 * ตัวแกะลิงก์อยู่ฝั่งเซิร์ฟเวอร์ (Go) เพราะลิงก์ย่อ maps.app.goo.gl ต้องตาม redirect
 * ซึ่งเบราว์เซอร์ทำเองไม่ได้ (ติด CORS)
 */

import { useState } from 'react'
import type { ResolvedPlace } from '@/lib/api'
import { useResolvePlace } from '@/lib/queries'
import { Field, ProvinceSelect, Select, TextInput } from './fields'

export interface BirthPlaceValue {
  province: string
  placeUrl: string
  placeLabel: string
  lat?: number
  lng?: number
  tzOffsetHours?: number
}

/** เขตเวลาที่ให้เลือกเอง เผื่อระบบเดาผิดหรือเกิดใกล้เส้นแบ่งเขตเวลา */
const TIMEZONES: { value: number; label: string }[] = [
  { value: 5, label: 'UTC+5 — ปากีสถาน' },
  { value: 5.5, label: 'UTC+5:30 — อินเดีย / ศรีลังกา' },
  { value: 5.75, label: 'UTC+5:45 — เนปาล' },
  { value: 6, label: 'UTC+6 — บังกลาเทศ' },
  { value: 6.5, label: 'UTC+6:30 — เมียนมา' },
  { value: 7, label: 'UTC+7 — ไทย / ลาว / เวียดนาม / กัมพูชา' },
  { value: 8, label: 'UTC+8 — จีน / ไต้หวัน / ฮ่องกง / สิงคโปร์ / มาเลเซีย' },
  { value: 9, label: 'UTC+9 — ญี่ปุ่น / เกาหลี' },
  { value: 10, label: 'UTC+10 — ออสเตรเลียฝั่งตะวันออก' },
  { value: 0, label: 'UTC+0 — สหราชอาณาจักร' },
  { value: 1, label: 'UTC+1 — ยุโรปกลาง' },
  { value: -5, label: 'UTC-5 — สหรัฐฯ ฝั่งตะวันออก' },
  { value: -6, label: 'UTC-6 — สหรัฐฯ ตอนกลาง' },
  { value: -7, label: 'UTC-7 — สหรัฐฯ เขตภูเขา' },
  { value: -8, label: 'UTC-8 — สหรัฐฯ ฝั่งตะวันตก' },
]

function formatOffset(hours: number): string {
  const sign = hours < 0 ? '-' : '+'
  const abs = Math.abs(hours)
  const h = Math.floor(abs)
  const m = Math.round((abs - h) * 60)
  return `UTC${sign}${h}${m ? ':' + String(m).padStart(2, '0') : ''}`
}

function formatCoord(lat: number, lng: number): string {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
}

export function BirthPlaceField({
  value,
  onChange,
  className = '',
}: {
  value: BirthPlaceValue
  onChange: (patch: Partial<BirthPlaceValue>) => void
  className?: string
}) {
  const resolve = useResolvePlace()
  const [url, setUrl] = useState(value.placeUrl)
  const [pending, setPending] = useState<ResolvedPlace | null>(null)
  const [tz, setTz] = useState<number>(7)
  const [error, setError] = useState<string | null>(null)

  // ค่าจากข้างนอกเปลี่ยน (เช่น ผู้ใช้เลือกโปรไฟล์จากคลัง หรือกู้ร่างที่ค้างไว้) → ล้างของเดิมในช่อง
  // ไม่งั้นลิงก์ของคนก่อนหน้าจะค้างอยู่ แล้วเผลอกด "ตรวจสอบลิงก์" ได้พิกัดของคนละคน
  const [syncedUrl, setSyncedUrl] = useState(value.placeUrl)
  if (value.placeUrl !== syncedUrl) {
    setSyncedUrl(value.placeUrl)
    setUrl(value.placeUrl)
    setPending(null)
    setError(null)
  }

  const confirmed = value.lat != null && value.lng != null

  async function check() {
    setError(null)
    setPending(null)
    try {
      const place = await resolve.mutateAsync(url.trim())
      setPending(place)
      setTz(place.timezoneOffsetHours)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'แกะพิกัดจากลิงก์นี้ไม่ได้')
    }
  }

  function confirmPlace() {
    if (!pending) return
    setSyncedUrl(url.trim())
    onChange({
      placeUrl: url.trim(),
      placeLabel: pending.label,
      lat: pending.lat,
      lng: pending.lng,
      tzOffsetHours: tz,
    })
    setPending(null)
  }

  function clearPlace() {
    setSyncedUrl('')
    setUrl('')
    onChange({ placeUrl: '', placeLabel: '', lat: undefined, lng: undefined, tzOffsetHours: undefined })
    setPending(null)
    setError(null)
  }

  /* ── ยืนยันพิกัดแล้ว ─────────────────────────────────── */
  if (confirmed) {
    return (
      <div className={className}>
        <span className="field-label">สถานที่เกิด</span>
        <div className="rounded-lg border border-jade/40 bg-jade/[0.06] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-ink">
                {value.placeLabel || 'พิกัดจากลิงก์ Google Maps'}
              </div>
              <div className="mt-0.5 font-body-en text-xs text-ink-soft">
                {formatCoord(value.lat!, value.lng!)} · {formatOffset(value.tzOffsetHours ?? 7)}
              </div>
            </div>
            <button type="button" onClick={clearPlace} className="text-xs text-gold hover:underline">
              เปลี่ยน
            </button>
          </div>
          <p className="mt-2 text-xs text-muted">
            ใช้พิกัดนี้คำนวณเวลาสุริยะจริง (真太陽時) — แม่นกว่าการใช้จุดกึ่งกลางจังหวัด
          </p>
        </div>
      </div>
    )
  }

  /* ── รอผู้ใช้ยืนยันพิกัดที่แกะได้ ─────────────────────── */
  if (pending) {
    return (
      <div className={className}>
        <span className="field-label">ยืนยันสถานที่เกิด</span>
        <div className="rounded-lg border border-gold/40 bg-gold/[0.06] p-4">
          <div className="text-sm text-ink">
            {pending.label ? (
              <>
                พบสถานที่: <b>{pending.label}</b>
              </>
            ) : (
              'ลิงก์นี้ไม่มีชื่อสถานที่ติดมา — ตรวจจากพิกัดด้านล่างว่าถูกต้องไหม'
            )}
          </div>
          <div className="mt-1 font-body-en text-xs text-ink-soft">{formatCoord(pending.lat, pending.lng)}</div>
          <a
            href={`https://www.google.com/maps/@${pending.lat},${pending.lng},15z`}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-1 inline-block text-xs text-gold hover:underline"
          >
            เปิดพิกัดนี้ใน Google Maps เพื่อตรวจ ↗
          </a>

          <label className="mt-4 block">
            <span className="field-label">เขตเวลาของสถานที่เกิด</span>
            <Select value={String(tz)} onChange={(e) => setTz(Number(e.target.value))}>
              {TIMEZONES.map((zone) => (
                <option key={zone.value} value={zone.value}>
                  {zone.label}
                </option>
              ))}
            </Select>
            <span className="mt-1 block text-xs text-muted">
              {pending.timezoneApproximate
                ? '⚠️ ระบบเดาเขตเวลาจากลองจิจูด — กรุณาตรวจให้ตรงกับประเทศที่เกิดจริง'
                : `ระบบตั้งให้เป็น ${formatOffset(pending.timezoneOffsetHours)}${
                    pending.timezoneRegion ? ` (${pending.timezoneRegion})` : ''
                  } — แก้ได้ถ้าไม่ตรง`}
            </span>
          </label>

          <div className="mt-4 flex gap-2">
            <button type="button" onClick={confirmPlace} className="btn-primary !px-5 !py-2 text-sm">
              ใช้พิกัดนี้
            </button>
            <button type="button" onClick={() => setPending(null)} className="btn-ghost !px-5 !py-2 text-sm">
              แก้ลิงก์
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ── ยังไม่มีพิกัด: วางลิงก์ หรือใช้จังหวัดเป็นทางสำรอง ─ */
  return (
    <div className={className}>
      <Field
        label="สถานที่เกิด — ลิงก์ Google Maps"
        hint="ค้นหาโรงพยาบาลหรือสถานที่เกิดใน Google Maps › กด แชร์ › กด คัดลอกลิงก์ แล้วนำมาวางที่นี่ เพื่อคำนวณเวลาสุริยคติที่แม่นยำ"
      >
        <div className="flex gap-2">
          <TextInput
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://maps.app.goo.gl/…"
            inputMode="url"
            className="flex-1"
          />
          <button
            type="button"
            onClick={() => void check()}
            disabled={!url.trim() || resolve.isPending}
            className="btn-ghost flex-none !px-4 !py-2 text-sm disabled:opacity-50"
          >
            {resolve.isPending ? 'กำลังตรวจ…' : 'ตรวจสอบลิงก์'}
          </button>
        </div>
      </Field>

      {error && (
        <p className="mt-2 rounded-lg border border-terracotta/40 bg-terracotta/[0.07] px-3 py-2 text-xs text-terracotta">
          {error}
        </p>
      )}

      {/* ทางสำรองตามข้อสรุป F-08 ข้อ 1 — ไม่มีลิงก์ก็ยังทำต่อได้ */}
      <div className="mt-4 rounded-lg border border-dashed border-line bg-paper-warm/40 p-3">
        <Field
          label="ไม่มีลิงก์? เลือกจังหวัดเกิดแทน"
          hint="ใช้จุดกึ่งกลางจังหวัดคำนวณ — ความละเอียดของเวลาสุริยะลดลงเล็กน้อย แต่พอสำหรับคนเกิดในไทย"
        >
          <ProvinceSelect value={value.province} onChange={(province) => onChange({ province })} />
        </Field>
      </div>
    </div>
  )
}
