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
  type InviteResult,
  type MockAccount,
  type OrderRecord,
  type OrgInvite,
  type OrgMember,
  type OrgRole,
  type OtpChallenge,
  type ProfileKind,
  type RegisterInput,
  type ResetPasswordInput,
  type ResolvedPlace,
  type RuntimeConfig,
  type SaveProfileInput,
  type SavedProfile,
  type SavedTeam,
  type SavedTeamMember,
} from '@/lib/api'
import { useSession } from '@/lib/session'

/* ── query keys — รวมไว้ที่เดียวจะได้ invalidate ถูกชุด ─── */

export const queryKeys = {
  runtimeConfig: ['runtime-config'] as const,
  orders: (userId: string, product?: 'employer' | 'jobseeker') =>
    ['orders', userId, product ?? 'all'] as const,
  org: {
    all: ['org'] as const,
    members: (orgId: string) => ['org', orgId, 'members'] as const,
    invites: (orgId: string) => ['org', orgId, 'invites'] as const,
  },
  memory: {
    all: ['memory'] as const,
    profiles: (scope: string, kind?: ProfileKind) => ['memory', scope, 'profiles', kind ?? 'all'] as const,
    teams: (orgId: string) => ['memory', orgId, 'teams'] as const,
    teamMembers: (teamId: string) => ['memory', 'team', teamId, 'members'] as const,
  },
  admin: {
    all: ['admin'] as const,
    overview: ['admin', 'overview'] as const,
    orders: ['admin', 'orders'] as const,
    users: ['admin', 'users'] as const,
    legal: ['admin', 'legal'] as const,
  },
}

/* ── ค่าตั้งตอน runtime + บัญชีทดลอง (หน้า login) ────────── */

export function useRuntimeConfig() {
  return useQuery<RuntimeConfig>({
    queryKey: queryKeys.runtimeConfig,
    queryFn: () => client.runtimeConfig(),
    staleTime: Infinity,
  })
}

export function useMockAccounts(): { data: MockAccount[] } {
  const { data } = useRuntimeConfig()
  return { data: data?.mockAccounts ?? [] }
}

/* ── สถานที่เกิดจากลิงก์ Google Maps (F-08) ─────────────── */

/**
 * แกะลิงก์เป็นพิกัดเพื่อให้ผู้ใช้ยืนยัน "ก่อน" คำนวณ
 * ไม่ cache ผลไว้ เพราะผู้ใช้แก้ลิงก์แล้วต้องได้ผลใหม่เสมอ
 */
export function useResolvePlace() {
  return useMutation<ResolvedPlace, Error, string>({
    mutationFn: (url) => client.resolvePlace(url),
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

/* ── องค์กรและสมาชิก (F-05) ─────────────────────────────── */

/** ทุก hook ฝั่งองค์กรใช้ id เดียวกันจากเซสชัน — ไม่มีที่ไหนต้องรู้ id เอง */
function useOrgScope() {
  const { token, user } = useSession()
  const orgId = user?.organizationId
  return { token, orgId, enabled: Boolean(token && orgId) }
}

export function useOrgMembers() {
  const { token, orgId, enabled } = useOrgScope()
  return useQuery<OrgMember[]>({
    queryKey: queryKeys.org.members(orgId ?? 'none'),
    queryFn: () => client.listOrgMembers(token!, orgId!),
    enabled,
  })
}

export function useOrgInvites() {
  const { token, orgId, enabled } = useOrgScope()
  return useQuery<OrgInvite[]>({
    queryKey: queryKeys.org.invites(orgId ?? 'none'),
    queryFn: () => client.listOrgInvites(token!, orgId!),
    enabled,
  })
}

export function useInviteOrgMember() {
  const { token, orgId } = useOrgScope()
  const queryClient = useQueryClient()
  return useMutation<InviteResult, Error, { email: string; role: OrgRole }>({
    mutationFn: ({ email, role }) => {
      if (!token || !orgId) throw new Error('ยังไม่ได้เข้าสู่ระบบในฐานะบัญชีองค์กร')
      return client.inviteOrgMember(token, orgId, email, role)
    },
    // เชิญแล้วอาจกลายเป็นสมาชิกทันทีหรือค้างเป็นคำเชิญ — รีเฟรชทั้งสองรายการเสมอ
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.org.all }),
  })
}

export function useRemoveOrgMember() {
  const { token, orgId } = useOrgScope()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => {
      if (!token || !orgId) throw new Error('เซสชันหมดอายุ')
      return client.removeOrgMember(token, orgId, userId)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.org.all }),
  })
}

export function useRevokeOrgInvite() {
  const { token, orgId } = useOrgScope()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (inviteId: string) => {
      if (!token || !orgId) throw new Error('เซสชันหมดอายุ')
      return client.revokeOrgInvite(token, orgId, inviteId)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.org.all }),
  })
}

/* ── ระบบ memory: โปรไฟล์และทีม (F-25) ──────────────────── */

export function useSavedProfiles(kind?: ProfileKind) {
  const { token, user } = useSession()
  const scope = user?.organizationId ?? user?.id ?? 'anonymous'
  return useQuery<SavedProfile[]>({
    queryKey: queryKeys.memory.profiles(scope, kind),
    queryFn: () =>
      client.listProfiles(token!, { kind, organizationId: user?.organizationId }),
    enabled: Boolean(token && user),
  })
}

export function useSaveProfile() {
  const { token, user } = useSession()
  const queryClient = useQueryClient()
  return useMutation<SavedProfile, Error, SaveProfileInput>({
    mutationFn: (input) => {
      if (!token) throw new Error('ต้องเข้าสู่ระบบก่อนบันทึกข้อมูล')
      return client.saveProfile(token, { ...input, organizationId: user?.organizationId })
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.memory.all }),
  })
}

export function useDeleteProfile() {
  const { token } = useSession()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => {
      if (!token) throw new Error('เซสชันหมดอายุ')
      return client.deleteProfile(token, id)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.memory.all }),
  })
}

export function useTeams() {
  const { token, orgId, enabled } = useOrgScope()
  return useQuery<SavedTeam[]>({
    queryKey: queryKeys.memory.teams(orgId ?? 'none'),
    queryFn: () => client.listTeams(token!, orgId!),
    enabled,
  })
}

export function useCreateTeam() {
  const { token, orgId } = useOrgScope()
  const queryClient = useQueryClient()
  return useMutation<SavedTeam, Error, { name: string; note?: string }>({
    mutationFn: ({ name, note }) => {
      if (!token || !orgId) throw new Error('ยังไม่ได้เข้าสู่ระบบในฐานะบัญชีองค์กร')
      return client.createTeam(token, orgId, name, note)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.memory.all }),
  })
}

export function useTeamMembers(teamId: string | null) {
  const { token } = useSession()
  return useQuery<SavedTeamMember[]>({
    queryKey: queryKeys.memory.teamMembers(teamId ?? 'none'),
    queryFn: () => client.listTeamMembers(token!, teamId!),
    enabled: Boolean(token && teamId),
  })
}

export function useAddTeamMember() {
  const { token } = useSession()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ teamId, profileId, position }: { teamId: string; profileId: string; position?: string }) => {
      if (!token) throw new Error('เซสชันหมดอายุ')
      return client.addTeamMember(token, teamId, profileId, position)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.memory.all }),
  })
}

export function useRemoveTeamMember() {
  const { token } = useSession()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ teamId, profileId }: { teamId: string; profileId: string }) => {
      if (!token) throw new Error('เซสชันหมดอายุ')
      return client.removeTeamMember(token, teamId, profileId)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.memory.all }),
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
