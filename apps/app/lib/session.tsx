'use client'

import { useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { client, type AuthResult, type SessionUser } from '@/lib/api'

const TOKEN_KEY = 'minghe:session:token'
const USER_KEY = 'minghe:session:user'
const RETURN_KEY = 'minghe:session:returnTo'

interface SessionValue {
  user: SessionUser | null
  token: string | null
  /** true จนกว่าจะอ่านเซสชันเดิมจาก localStorage เสร็จ — ใช้กันหน้าจอกะพริบ */
  loading: boolean
  signIn: (email: string, password: string) => Promise<SessionUser>
  /** เข้าสู่ระบบด้วย Google — รับ ID token จาก Google Identity Services (F-02) */
  signInWithGoogle: (idToken: string) => Promise<SessionUser>
  /** รับเซสชันที่ได้จากทางอื่น เช่น สมัครสมาชิกสำเร็จ */
  adoptSession: (result: AuthResult) => void
  signOut: () => void
}

const SessionContext = createContext<SessionValue | null>(null)

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<SessionUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // กู้เซสชันเดิมกลับมาเมื่อรีเฟรชหน้า
  useEffect(() => {
    let cancelled = false

    async function restore() {
      try {
        const savedToken = window.localStorage.getItem(TOKEN_KEY)
        const savedUser = window.localStorage.getItem(USER_KEY)
        if (!savedToken || !savedUser) return

        // แสดงผู้ใช้ที่จำไว้ก่อน แล้วค่อยยืนยันกับแหล่งข้อมูลจริง
        if (!cancelled) {
          setToken(savedToken)
          setUser(JSON.parse(savedUser) as SessionUser)
        }

        const fresh = await client.me(savedToken)
        if (!cancelled) {
          setUser(fresh)
          window.localStorage.setItem(USER_KEY, JSON.stringify(fresh))
        }
      } catch {
        // token ใช้ไม่ได้แล้ว (หมดอายุ หรือสลับโหมด mock/live) — ล้างทิ้ง
        if (!cancelled) {
          window.localStorage.removeItem(TOKEN_KEY)
          window.localStorage.removeItem(USER_KEY)
          setToken(null)
          setUser(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void restore()
    return () => {
      cancelled = true
    }
  }, [])

  const adoptSession = useCallback(
    (result: AuthResult) => {
      // ล้าง cache ของผู้ใช้คนก่อน (ถ้ามี) กันข้อมูลข้ามบัญชี
      queryClient.clear()
      window.localStorage.setItem(TOKEN_KEY, result.token)
      window.localStorage.setItem(USER_KEY, JSON.stringify(result.user))
      setToken(result.token)
      setUser(result.user)
      setLoading(false)
    },
    [queryClient],
  )

  const signIn = useCallback(
    async (email: string, password: string) => {
      const result = await client.login(email, password)
      adoptSession(result)
      return result.user
    },
    [adoptSession],
  )

  const signInWithGoogle = useCallback(
    async (idToken: string) => {
      const result = await client.loginWithGoogle(idToken)
      adoptSession(result)
      return result.user
    },
    [adoptSession],
  )

  const signOut = useCallback(() => {
    window.localStorage.removeItem(TOKEN_KEY)
    window.localStorage.removeItem(USER_KEY)
    setToken(null)
    setUser(null)
    queryClient.clear()
  }, [queryClient])

  const value = useMemo(
    () => ({ user, token, loading, signIn, signInWithGoogle, adoptSession, signOut }),
    [user, token, loading, signIn, signInWithGoogle, adoptSession, signOut],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession ต้องอยู่ภายใน SessionProvider')
  return ctx
}

/* ── จำหน้าที่ผู้ใช้กำลังทำค้างไว้ ก่อนพาไปหน้าล็อกอิน (F-03) ── */

export function rememberReturnTo(path: string) {
  try {
    window.sessionStorage.setItem(RETURN_KEY, path)
  } catch {
    /* ignore */
  }
}

export function takeReturnTo(): string | null {
  try {
    const path = window.sessionStorage.getItem(RETURN_KEY)
    if (path) window.sessionStorage.removeItem(RETURN_KEY)
    return path
  } catch {
    return null
  }
}

/** หน้าเริ่มต้นหลังล็อกอิน — แยกตามฝั่งของบัญชี */
export function homeForUser(user: SessionUser): string {
  if (user.side === 'admin') return '/admin'
  if (user.side === 'jobseeker') return '/jobseeker/dashboard'
  return '/employer/dashboard'
}
