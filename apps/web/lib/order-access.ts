/**
 * ตั๋วความเป็นเจ้าของออเดอร์ (order-owner token) — ปิดช่องโหว่ IDOR
 *
 * ปัญหาเดิม: ออเดอร์แบบ guest มี createdById = null ทำให้ guard เจ้าของถูกข้าม
 * ใครรู้ order id (ซึ่งอาจรั่วผ่าน Referer/history/log) ก็ชำระ/เปิดผลของคนอื่นได้
 *
 * วิธีแก้: ตอนสร้างออเดอร์ ออก JWT ผูกกับ order id เก็บใน httpOnly cookie
 * แล้วบังคับตรวจตั๋วนี้ทั้งตอนชำระเงิน (/api/orders/[id]/pay) และตอนดูสถานะ (/order/[id])
 * ทำให้ order id เพียงอย่างเดียวเปิดอะไรไม่ได้ (defense-in-depth)
 */

import 'server-only'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const COOKIE_PREFIX = 'mh_order_'
const TTL_SECONDS = 24 * 60 * 60 // 1 วัน — พอสำหรับชำระเงิน + ดูสถานะ

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET
  if (!secret || secret.length < 16) {
    throw new Error('AUTH_SECRET ไม่ได้ตั้งค่า (ต้องยาวอย่างน้อย 16 ตัวอักษร) — ดู .env.example')
  }
  return new TextEncoder().encode(secret)
}

/** ออกตั๋ว + ตั้ง cookie (เรียกหลัง createOrder) */
export async function grantOrderAccess(orderId: string): Promise<void> {
  const token = await new SignJWT({ scope: 'order-owner' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(orderId)
    .setIssuedAt()
    .setExpirationTime(`${TTL_SECONDS}s`)
    .sign(secretKey())

  const cookieStore = await cookies()
  cookieStore.set(`${COOKIE_PREFIX}${orderId}`, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: TTL_SECONDS,
  })
}

/** ตรวจว่าผู้เรียกถือตั๋วของออเดอร์นี้จริงไหม */
export async function hasOrderAccess(orderId: string): Promise<boolean> {
  const cookieStore = await cookies()
  const token = cookieStore.get(`${COOKIE_PREFIX}${orderId}`)?.value
  if (!token) return false
  try {
    const { payload } = await jwtVerify(token, secretKey())
    return payload.sub === orderId && payload.scope === 'order-owner'
  } catch {
    return false
  }
}
