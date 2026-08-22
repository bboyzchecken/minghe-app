/**
 * ค่าตั้งที่มาจาก .env ของ root project (ผ่าน next.config.mjs)
 *
 * แก้ที่ `D:\kami\minghe-app\.env` ที่เดียว แล้วรีสตาร์ต dev server
 */

export type Mode = 'mock' | 'live'

/** ค่าที่ไม่รู้จักถือเป็น live เสมอ — กันการเผลอเปิดบัญชีทดลองบนของจริง */
export const MODE: Mode = process.env.NEXT_PUBLIC_MINGHE_MODE === 'mock' ? 'mock' : 'live'

export const IS_MOCK = MODE === 'mock'

export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:5000').replace(
  /\/+$/,
  '',
)

/**
 * ค่าตั้งตอน build ของปุ่ม Google — เป็นแค่ค่าตั้งต้น (F-02)
 *
 * แหล่งความจริงจริง ๆ คือ `/mode` ของ API ที่อ่านตอน runtime ผ่าน `useRuntimeConfig()`
 * เพราะหน้าเว็บเป็น static export: ถ้ายึดค่าตอน build แปลว่าได้ client id มาแล้วต้อง build ใหม่
 * ค่านี้เหลือไว้ให้หน้าจอมีคำตอบระหว่างที่ยังโหลด `/mode` ไม่เสร็จเท่านั้น
 */
export const GOOGLE_LOGIN_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_LOGIN_ENABLED === 'true'
