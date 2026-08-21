'use client'

/**
 * ชั้น TanStack Query ระหว่างหน้าจอกับ `lib/api` (Q0-1 / A-02)
 *
 * หน้าจอทุกหน้าเรียกข้อมูลผ่าน hooks ในไฟล์นี้เท่านั้น — ไม่เรียก `client` ตรง ๆ
 * ข้อดีที่ได้ทันที: cache ข้ามหน้า, loading/error state กลาง, invalidate หลัง mutation,
 * และสลับ mock/live โดยหน้าจอไม่รู้ (client ข้างใต้เป็น interface เดียวกัน)
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  client,
  type AdminLegalDoc,
  type AdminOrder,
  type AdminOverview,
  type AdminUserRow,
  type CreateOrderDraft,
  type MockAccount,
  type OrderRecord,
  type OtpChallenge,
  type RegisterInput,
  type ResetPasswordInput,
} from '@/lib/api'
import { useSession } from '@/lib/session'

/* ── query keys — รวมไว้ที่เดียวจะได้ invalidate ถูกชุด ─── */

export const queryKeys = {
  mockAccounts: ['mock-accounts'] as const,
  orders: (userId: string, product?: 'employer' | 'jobseeker') =>
    ['orders', userId, product ?? 'all'] as const,
  admin: {
    all: ['admin'] as const,
    overview: ['admin', 'overview'] as const,
    orders: ['admin', 'orders'] as const,
    users: ['admin', 'users'] as const,
    legal: ['admin', 'legal'] as const,
  },
}

/* ── บัญชีทดลอง (หน้า login) ───────────────────────────── */

export function useMockAccounts() {
  return useQuery<MockAccount[]>({
    queryKey: queryKeys.mockAccounts,
    queryFn: () => client.mockAccounts(),
    staleTime: Infinity,
  })
}

/* ── สมัครสมาชิก / รีเซ็ตรหัสผ่าน (F-02) ───────────────── */

export function useRequestRegister() {
  return useMutation<OtpChallenge, Error, string>({
    mutationFn: (email) => client.requestRegister(email),
  })
}

/** สมัครสำเร็จ → เซสชันถูกตั้งให้ทันที (ไม่ต้องล็อกอินซ้ำ) */
export function useRegister() {
  const { adoptSession } = useSession()
  return useMutation({
    mutationFn: (input: RegisterInput) => client.register(input),
    onSuccess: (result) => adoptSession(result),
  })
}

export function useRequestPasswordReset() {
  return useMutation<OtpChallenge, Error, string>({
    mutationFn: (email) => client.requestPasswordReset(email),
  })
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (input: ResetPasswordInput) => client.resetPassword(input),
  })
}

/* ── คำสั่งซื้อ / รายงาน ───────────────────────────────── */

export function useOrders(product?: 'employer' | 'jobseeker') {
  const { token, user } = useSession()
  return useQuery<OrderRecord[]>({
    queryKey: queryKeys.orders(user?.id ?? 'anonymous', product),
    queryFn: () => client.listOrders(token!, product),
    enabled: Boolean(token && user),
  })
}

export function useCreateOrder() {
  const { token, user } = useSession()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (draft: CreateOrderDraft) => {
      if (!token) throw new Error('ต้องเข้าสู่ระบบก่อนสั่งซื้อ')
      return client.createOrder(token, draft)
    },
    onSuccess: () => {
      // ประวัติบน dashboard และคิวงานฝั่งแอดมินเปลี่ยนทันที
      void queryClient.invalidateQueries({ queryKey: ['orders', user?.id ?? 'anonymous'] })
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.all })
    },
  })
}

export function useOpenReportByCode() {
  return useMutation({
    mutationFn: ({ code, pin }: { code: string; pin?: string }) => client.findOrderByCode(code, pin),
  })
}

/* ── Admin Console ─────────────────────────────────────── */

function useAdminEnabled() {
  const { token, user } = useSession()
  return { token, enabled: Boolean(token && user?.side === 'admin') }
}

export function useAdminOverview() {
  const { token, enabled } = useAdminEnabled()
  return useQuery<AdminOverview>({
    queryKey: queryKeys.admin.overview,
    queryFn: () => client.adminOverview(token!),
    enabled,
  })
}

export function useAdminOrders() {
  const { token, enabled } = useAdminEnabled()
  return useQuery<AdminOrder[]>({
    queryKey: queryKeys.admin.orders,
    queryFn: () => client.adminListOrders(token!),
    enabled,
    // คิวงานมีแอดมินหลายคนแก้พร้อมกัน — ดึงใหม่เป็นระยะให้เห็นงานที่คนอื่นเพิ่งรับ
    refetchInterval: 30_000,
  })
}

export function useAdminUsers() {
  const { token, enabled } = useAdminEnabled()
  return useQuery<AdminUserRow[]>({
    queryKey: queryKeys.admin.users,
    queryFn: () => client.adminListUsers(token!),
    enabled,
  })
}

export function useAdminLegal() {
  const { token, enabled } = useAdminEnabled()
  return useQuery<AdminLegalDoc[]>({
    queryKey: queryKeys.admin.legal,
    queryFn: () => client.adminListLegal(token!),
    enabled,
  })
}

export type AdminOrderAction = 'claim' | 'release' | 'process' | 'deliver'

/**
 * ทุก action บนคิวงานผ่านทางเดียว — สำเร็จหรือโดนกัน (409 งานของคนอื่น) ก็ดึงข้อมูลใหม่เสมอ
 * เพราะสถานะอาจถูกแอดมินคนอื่นเปลี่ยนไปแล้ว
 */
export function useAdminOrderAction() {
  const { token } = useSession()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ action, id }: { action: AdminOrderAction; id: string }) => {
      if (!token) throw new Error('เซสชันหมดอายุ')
      switch (action) {
        case 'claim':
          return client.adminClaimOrder(token, id)
        case 'release':
          return client.adminReleaseOrder(token, id)
        case 'process':
          return client.adminProcessOrder(token, id)
        case 'deliver':
          return client.adminDeliverOrder(token, id)
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.orders })
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.overview })
    },
  })
}

export function useAdminSetUserStatus() {
  const { token } = useSession()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'deactivated' }) => {
      if (!token) throw new Error('เซสชันหมดอายุ')
      return client.adminSetUserStatus(token, id, status)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.users })
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.overview })
    },
  })
}

/** รีเฟรชทุกอย่างของ Admin Console ด้วยปุ่มเดียว */
export function useRefreshAdmin() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.admin.all })
}
