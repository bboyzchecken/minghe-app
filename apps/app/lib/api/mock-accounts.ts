import type { MockAccount } from './types'

/**
 * บัญชีทดลองทุกฝั่งของระบบ
 *
 * ต้องตรงกับ `apps/api/pkg/models/mockaccount.go` — ฝั่ง API ใช้ลิสต์นั้น seed ผู้ใช้จริง
 * เมื่ออยู่โหมด live+API mock ปุ่มบนหน้า login จะมาจาก API ไม่ใช่ไฟล์นี้
 *
 * รหัสผ่านชุดนี้ตั้งใจให้เดาง่ายและประกาศได้ เพราะมีผลเฉพาะโหมด mock เท่านั้น
 */
export const MOCK_ACCOUNTS: MockAccount[] = [
  {
    email: 'employer@demo.minghe.work',
    password: 'demo1234',
    name: 'คุณบัส (เจ้าของบริษัท)',
    label: 'ฝั่งองค์กร — เจ้าของ',
    detail: 'บจก. ตัวอย่างโลจิสติกส์ · เห็นทุกอย่าง จัดการทีมและสมาชิกได้',
    side: 'employer',
    orgRole: 'owner',
  },
  {
    email: 'hr@demo.minghe.work',
    password: 'demo1234',
    name: 'คุณแนน (ฝ่ายบุคคล)',
    label: 'ฝั่งองค์กร — HR',
    detail: 'บจก. ตัวอย่างโลจิสติกส์ · วิเคราะห์ candidate ได้ แต่เพิ่มสมาชิกไม่ได้',
    side: 'employer',
    orgRole: 'hr',
  },
  {
    email: 'jobseeker@demo.minghe.work',
    password: 'demo1234',
    name: 'คุณนุช (คนหางาน)',
    label: 'ฝั่งคนทำงาน',
    detail: 'บัญชีบุคคลทั่วไป · เช็กความสมพงษ์กับบริษัทที่สนใจ',
    side: 'jobseeker',
  },
  {
    email: 'admin@minghe.work',
    password: 'changeme1234',
    name: 'ผู้ดูแลระบบ',
    label: 'ผู้ดูแลระบบ',
    detail: 'จัดการคำสั่งซื้อ ผู้ใช้ และเอกสารกฎหมาย',
    side: 'admin',
  },
]

export const DEMO_ORG_NAME = 'บจก. ตัวอย่างโลจิสติกส์'
