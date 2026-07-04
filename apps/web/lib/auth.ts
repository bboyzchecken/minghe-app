/**
 * ระบบ session แบบ JWT cookie (jose) — ไม่พึ่งบริการภายนอก
 * บทบาท: CLIENT | ADMIN (ตามแผนหัวข้อ 2)
 */

import 'server-only'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { prisma } from '@minghe/db'

const COOKIE_NAME = 'minghe_session'
const SESSION_DAYS = 7

export interface Session {
  userId: string
  email: string
  name: string | null
  role: 'CLIENT' | 'ADMIN'
}

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET
  if (!secret || secret.length < 16) {
    throw new Error('AUTH_SECRET ไม่ได้ตั้งค่า (ต้องยาวอย่างน้อย 16 ตัวอักษร) — ดู .env.example')
  }
  return new TextEncoder().encode(secret)
}

export async function createSession(user: {
  id: string
  email: string
  name: string | null
  role: string
}): Promise<void> {
  const token = await new SignJWT({
    email: user.email,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secretKey())

  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  })
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secretKey())
    if (!payload.sub) return null
    return {
      userId: payload.sub,
      email: (payload.email as string) ?? '',
      name: (payload.name as string | null) ?? null,
      role: payload.role === 'ADMIN' ? 'ADMIN' : 'CLIENT',
    }
  } catch {
    return null
  }
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

/** ใช้ในหน้า (app): ถ้าไม่ล็อกอิน → เด้งไปหน้า login */
export async function requireUser(): Promise<Session> {
  const session = await getSession()
  if (!session) redirect('/login')
  return session
}

/** ใช้ในหน้า admin: ต้องเป็น ADMIN เท่านั้น */
export async function requireAdmin(): Promise<Session> {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'ADMIN') redirect('/dashboard')
  return session
}

/** ---- credential helpers ---- */

export async function verifyCredentials(
  email: string,
  password: string,
): Promise<{ id: string; email: string; name: string | null; role: string } | null> {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } })
  if (!user?.passwordHash) return null
  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) return null
  return { id: user.id, email: user.email, name: user.name, role: user.role }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}
