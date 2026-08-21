/**
 * แหล่งความจริงเดียวของ "บทบาท" ทั้ง 4 ฝั่ง
 *
 * ใช้ตอบคำถาม UX สองข้อที่ UAT ชี้มา:
 *   1. ทางเข้าแต่ละฝั่ง กดแล้วจะเห็นอะไร (sees)
 *   2. บทบาทนั้นทำอะไรได้/ไม่ได้ (can / cant)
 *
 * หน้า login, dashboard ทั้งสองฝั่ง, header และ Admin Console อ่านจากไฟล์นี้ที่เดียว
 * แก้สิทธิ์หรือคำอธิบายบทบาท → แก้ที่นี่แล้วขึ้นทุกหน้าพร้อมกัน
 */

import type { SessionUser } from '@/lib/api/types'

export type RoleKey = 'owner' | 'hr' | 'jobseeker' | 'admin'

export interface RoleMeta {
  key: RoleKey
  /** ป้ายสั้นบน header */
  badge: string
  /** ชื่อเต็มบนหน้า login / dashboard */
  label: string
  /** ประโยคเดียวสรุปว่าบทบาทนี้คือใคร */
  tagline: string
  color: string
  /** เข้าแล้วเห็นอะไร — แสดงเป็น preview บนหน้า login */
  sees: string[]
  /** ทำอะไรได้ */
  can: string[]
  /** ทำอะไรไม่ได้ (และเพราะอะไร) */
  cant: string[]
  home: string
}

export const ROLE_META: Record<RoleKey, RoleMeta> = {
  owner: {
    key: 'owner',
    badge: 'เจ้าของ',
    label: 'องค์กร — เจ้าของบัญชี',
    tagline: 'ผู้เปิดบัญชีองค์กร เห็นและจัดการได้ทุกอย่างในองค์กรของตัวเอง',
    color: '#b07d2b', // gold
    sees: ['Dashboard ภาพรวมองค์กร', 'ประวัติการวิเคราะห์ของทั้งองค์กร', 'Team Roster + Profile Memory'],
    can: [
      'วิเคราะห์ candidate ใหม่',
      'ดูรายงานทุกฉบับขององค์กร',
      'จัดการทีมและโปรไฟล์พนักงาน',
      'เพิ่ม/ลบสมาชิกองค์กร (HR, viewer)',
      'แก้ข้อมูลบริษัท (วันก่อตั้ง / อุตสาหกรรม)',
    ],
    cant: [],
    home: '/employer/dashboard',
  },
  hr: {
    key: 'hr',
    badge: 'HR',
    label: 'องค์กร — ฝ่ายบุคคล (HR)',
    tagline: 'สมาชิกที่เจ้าของเชิญเข้ามาช่วยงานสรรหา ใช้ข้อมูลองค์กรร่วมกัน',
    color: '#5E9BB5', // water
    sees: ['Dashboard เดียวกับเจ้าของ', 'ประวัติการวิเคราะห์ของทั้งองค์กร', 'Team Roster + Profile Memory'],
    can: ['วิเคราะห์ candidate ใหม่', 'ดูรายงานทุกฉบับขององค์กร', 'จัดการทีมและโปรไฟล์พนักงาน'],
    cant: ['เพิ่ม/ลบสมาชิกองค์กร — สงวนไว้เฉพาะเจ้าของบัญชี', 'แก้ข้อมูลบริษัท — สงวนไว้เฉพาะเจ้าของบัญชี'],
    home: '/employer/dashboard',
  },
  jobseeker: {
    key: 'jobseeker',
    badge: 'คนทำงาน',
    label: 'คนทำงาน / คนหางาน',
    tagline: 'บัญชีส่วนบุคคล เช็กว่าดวงตัวเองสมพงษ์กับบริษัทไหน',
    color: '#7B8B57', // jade
    sees: ['Dashboard บริษัทที่เคยเช็ก', 'รายงานความสมพงษ์ของตัวเอง'],
    can: ['เช็กความสมพงษ์กับบริษัทที่สนใจ', 'เปิดรายงานย้อนหลังได้ทุกเมื่อ'],
    cant: ['เห็นข้อมูลขององค์กรใด ๆ — ข้อมูลส่วนบุคคลแยกขาดจากฝั่งองค์กร'],
    home: '/jobseeker/dashboard',
  },
  admin: {
    key: 'admin',
    badge: 'แอดมิน',
    label: 'ผู้ดูแลระบบ (หลังบ้าน)',
    tagline: 'ทีมงาน Mìnghé — จัดการคำสั่งซื้อ ผู้ใช้ และเอกสาร ทำงานพร้อมกันได้หลายคน',
    color: '#2b2b2b', // ink
    sees: ['Admin Console: คิวงาน / ผู้ใช้ / เอกสารกฎหมาย', 'คำสั่งซื้อของลูกค้าทุกฝั่งในที่เดียว'],
    can: [
      'รับเรื่อง → ดำเนินการ → ส่งมอบ คำสั่งซื้อ',
      'เห็นว่างานไหนอยู่กับแอดมินคนไหน (กันทำซ้อน)',
      'ระงับ / คืนสิทธิ์บัญชีผู้ใช้',
      'จัดการเอกสารกฎหมายทั้ง 4 ฉบับ',
    ],
    cant: ['แตะงานที่แอดมินคนอื่นรับเรื่องไว้ — ต้องให้เจ้าของงานคืนคิวก่อน'],
    home: '/admin',
  },
}

/** สรุปบทบาทจากข้อมูลเซสชัน */
export function roleKeyOf(user: Pick<SessionUser, 'side' | 'orgRole'>): RoleKey {
  if (user.side === 'admin') return 'admin'
  if (user.side === 'jobseeker') return 'jobseeker'
  return user.orgRole === 'hr' ? 'hr' : 'owner'
}

export function roleOf(user: Pick<SessionUser, 'side' | 'orgRole'>): RoleMeta {
  return ROLE_META[roleKeyOf(user)]
}
