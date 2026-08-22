/**
 * แปลงค่าสถานที่เกิดระหว่างฟอร์ม (`BirthValue`) กับอินพุตของ engine และคลังข้อมูล
 *
 * รวมไว้ที่เดียวเพราะมีสามที่ที่ต้องแปลงเหมือนกันเป๊ะ ๆ:
 * wizard ฝั่งองค์กร · wizard ฝั่งคนทำงาน · หน้าคลังข้อมูล (F-08 + F-25)
 */

import type { BirthValue } from '@/components/forms'
import type { SavedProfile, SaveProfileInput, ProfileKind } from '@/lib/api'

/** ส่วนของสถานที่เกิดที่ส่งเข้า engine — ตัดฟิลด์ว่างทิ้งเพื่อไม่ให้ทับค่า default */
export function placeFields(value: BirthValue): {
  province?: string
  longitude?: number
  latitude?: number
  placeLabel?: string
  placeUrl?: string
  tzOffsetHours?: number
} {
  return {
    province: value.province || undefined,
    longitude: value.lng,
    latitude: value.lat,
    placeLabel: value.placeLabel || undefined,
    placeUrl: value.placeUrl || undefined,
    tzOffsetHours: value.tzOffsetHours,
  }
}

/** ข้อความสั้นสำหรับหน้าตรวจทาน — ชื่อสถานที่มาก่อนชื่อจังหวัดถ้ามี */
export function placeSummary(value: Pick<BirthValue, 'placeLabel' | 'province'>): string {
  return value.placeLabel || value.province || ''
}

/** เอาโปรไฟล์ในคลังมาเติมฟอร์ม (F-25) */
export function profileToBirthValue(profile: SavedProfile): BirthValue {
  return {
    name: profile.name,
    gender: profile.gender,
    birthDate: profile.birthDate,
    birthTime: profile.birthTime,
    province: profile.province,
    placeUrl: profile.placeUrl,
    placeLabel: profile.placeLabel,
    lat: profile.lat,
    lng: profile.lng,
    tzOffsetHours: profile.timezoneOffsetHours,
  }
}

/** เก็บสิ่งที่กรอกในฟอร์มเข้าคลัง (F-25) */
export function birthValueToProfileInput(value: BirthValue, kind: ProfileKind): SaveProfileInput {
  return {
    kind,
    name: value.name.trim() || 'ไม่ระบุชื่อ',
    gender: value.gender,
    birthDate: value.birthDate,
    birthTime: value.birthTime,
    province: value.province,
    placeUrl: value.placeUrl,
    placeLabel: value.placeLabel,
    lat: value.lat,
    lng: value.lng,
    timezoneOffsetHours: value.tzOffsetHours,
  }
}

const KIND_LABEL: Record<ProfileKind, string> = {
  self: 'ตัวฉันเอง',
  candidate: 'ผู้สมัคร',
  employee: 'พนักงาน',
  executive: 'ผู้บริหาร',
}

export function profileKindLabel(kind: ProfileKind): string {
  return KIND_LABEL[kind]
}
