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
 * ปุ่ม Google ยังแสดงอยู่เสมอ ค่านี้คุมแค่ว่ากดแล้วทำงานได้ไหม
 * ตอนนี้ตั้งใจปิดไว้ รอ OAuth client จริง (F-02)
 */
export const GOOGLE_LOGIN_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_LOGIN_ENABLED === 'true'
