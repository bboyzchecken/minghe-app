'use client'

import { BirthPlaceField } from './birth-place-field'
import { DateInput } from './date-input'
import { Field, Select, TextInput } from './fields'

// หน้าจอเดิมนำเข้าชิ้นส่วนพื้นฐานจากไฟล์นี้อยู่ — ส่งต่อให้เหมือนเดิมจะได้ไม่ต้องแก้ทุกหน้า
export { Field, Select, TextInput, ProvinceSelect } from './fields'

export interface BirthValue {
  name: string
  gender: 'male' | 'female' | ''
  birthDate: string
  birthTime: string
  /** จังหวัดเกิด — ทางสำรองเมื่อยังไม่มีพิกัดจากลิงก์ Google Maps (F-08 ข้อ 1) */
  province: string
  /** ลิงก์ Google Maps ที่ผู้ใช้วางไว้ เก็บไว้ให้ตรวจย้อนได้ว่าพิกัดมาจากไหน */
  placeUrl: string
  /** ชื่อสถานที่ที่แกะได้จากลิงก์ */
  placeLabel: string
  lat?: number
  lng?: number
  /** เขตเวลาที่ผู้ใช้ยืนยัน — ไม่มีค่า = ไทย (UTC+7) */
  tzOffsetHours?: number
}

export const emptyBirth: BirthValue = {
  name: '',
  gender: '',
  birthDate: '',
  birthTime: '',
  province: '',
  placeUrl: '',
  placeLabel: '',
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
      <Field label="วัน/เดือน/ปี เกิด (ค.ศ.)" hint="ตัวอย่าง: 31/01/1990">
        <DateInput value={value.birthDate} onChange={(birthDate) => set({ birthDate })} />
      </Field>
      <Field label="เวลาเกิด" hint="ยิ่งแม่นยิ่งดี — เสาเวลาเป็นหัวใจของความแม่น">
        <TextInput type="time" value={value.birthTime} onChange={(e) => set({ birthTime: e.target.value })} />
      </Field>
      {/* F-08 — ลิงก์ Google Maps เป็นทางหลัก จังหวัดเป็นทางสำรองอยู่ในตัว component */}
      <BirthPlaceField value={value} onChange={set} className="sm:col-span-2" />
    </div>
  )
}
