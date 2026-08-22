'use client'

/**
 * โหมด live — เรียก Go API ที่ apps/api
 *
 * ข้อควรรู้: engine ปาจืออยู่ใน packages/core ซึ่งเป็น TypeScript
 * API จึงทำหน้าที่เก็บและส่งต่อข้อมูล (บัญชี โปรไฟล์ คำสั่งซื้อ ความยินยอม)
 * ส่วนตัวรายงานยังประกอบในเบราว์เซอร์จาก snapshot ที่บันทึกไว้ตอนสั่งซื้อ
 *
 * API_BASE_URL เป็น path สัมพัทธ์ได้ (เช่น `/backend`) — ใน Docker nginx จะ proxy ไปที่ service api
 * ทำให้เปิดจากเครื่องไหนในเครือข่ายก็ได้โดยไม่ต้องฝัง IP ตอน build
 */

import type { GenerateReportInput } from '@minghe/report/types'
import { isoToDisplay } from '@/components/date-input'
import { API_BASE_URL } from '@/lib/env'
import {
  ClientError,
  type AdminLegalDoc,
  type AdminOrder,
  type AdminOrderStatus,
  type AdminOverview,
  type AdminUserRow,
  type AuthResult,
  type CreateOrderDraft,
  type InviteResult,
  type MingheClient,
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
  type SessionUser,
  type Side,
} from './types'

/** รูปแบบ snapshot ที่ฝากไว้ในฟิลด์ input ของคำสั่งซื้อ */
interface OrderSnapshot {
  report: GenerateReportInput
  orgLabel: string
  express: boolean
}

interface ApiUser {
  id: number
  email: string
  name: string
  role: string
  status?: string
}

interface ApiMember {
  user_id: number
  role: string
  status: string
  user?: ApiUser | null
}

interface ApiInvite {
  id: number
  email: string
  role: string
  invited_by_name: string
  created_at: string
  expires_at: string
}

interface ApiProfile {
  id: number
  kind: string
  name: string
  gender: string
  birth_date: string
  birth_time: string
  birth_province: string
  birth_place_url: string
  birth_place_label: string
  birth_lat: number | null
  birth_lng: number | null
  birth_timezone_offset_hours: number | null
  organization_id: number | null
  created_at: string
}

interface ApiTeam {
  id: number
  name: string
  note: string
}

interface ApiTeamMember {
  profile_id: number
  position: string
  is_lead: boolean
  profile?: ApiProfile | null
}

function toOrgRole(role: string): OrgRole {
  return role === 'owner' || role === 'hr' ? role : 'viewer'
}

function toSavedProfile(p: ApiProfile): SavedProfile {
  const kind: ProfileKind =
    p.kind === 'self' || p.kind === 'employee' || p.kind === 'executive' ? p.kind : 'candidate'
  return {
    id: String(p.id),
    kind,
    name: p.name,
    // API ส่งวันเกิดเป็น timestamp เต็ม — หน้าเว็บใช้แค่ส่วนวันที่ (ISO) แล้วค่อยแปลงเป็น DD/MM/YYYY ตอนแสดง
    birthDate: (p.birth_date ?? '').slice(0, 10),
    birthTime: p.birth_time ?? '',
    gender: p.gender === 'male' || p.gender === 'female' ? p.gender : '',
    province: p.birth_province ?? '',
    placeLabel: p.birth_place_label ?? '',
    placeUrl: p.birth_place_url ?? '',
    lat: p.birth_lat ?? undefined,
    lng: p.birth_lng ?? undefined,
    timezoneOffsetHours: p.birth_timezone_offset_hours ?? undefined,
    organizationId: p.organization_id ? String(p.organization_id) : undefined,
    createdAt: p.created_at,
  }
}

/** แปลงฟอร์มเป็น body ของ API — ใช้ร่วมกันทั้งตอนสั่งซื้อและตอนบันทึกเข้าคลัง (F-25) */
function toProfileBody(input: SaveProfileInput) {
  return {
    kind: input.kind,
    name: input.name,
    gender: input.gender ?? '',
    birth_date: isoToDisplay(input.birthDate),
    birth_time: input.birthTime ?? '',
    birth_province: input.province ?? '',
    birth_place_url: input.placeUrl ?? '',
    birth_place_label: input.placeLabel ?? '',
    birth_lat: input.lat ?? null,
    birth_lng: input.lng ?? null,
    birth_timezone_offset_hours: input.timezoneOffsetHours ?? null,
    organization_id: input.organizationId ? Number(input.organizationId) : null,
  }
}

interface ApiOrder {
  id: number
  code: string
  product: 'employer' | 'jobseeker'
  status: string
  amount_satang: number
  created_at: string
  has_pin: boolean
  input: OrderSnapshot | null
  assigned_admin_id: number | null
  assigned_admin_name: string
  customer_email?: string
}

async function call<T>(
  path: string,
  options: { method?: string; token?: string; body?: unknown } = {},
): Promise<T> {
  const { method = 'GET', token, body } = options

  let res: Response
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ClientError('ติดต่อเซิร์ฟเวอร์ไม่ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง')
  }

  const text = await res.text()
  const payload = text ? safeParse(text) : null

  if (!res.ok) {
    const message =
      (payload as { error?: string } | null)?.error ?? `คำขอไม่สำเร็จ (HTTP ${res.status})`
    throw new ClientError(message, res.status)
  }
  return payload as T
}

/**
 * เหมือน call() แต่คืน status code มาด้วย
 * ใช้ตอนที่ "สำเร็จ" มีหลายความหมาย เช่น เชิญสมาชิกแล้วได้ 201/200/202 คนละเรื่องกัน
 */
async function callWithStatus<T>(
  path: string,
  options: { method?: string; token?: string; body?: unknown } = {},
): Promise<{ status: number; data: T }> {
  const { method = 'GET', token, body } = options

  let res: Response
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ClientError('ติดต่อเซิร์ฟเวอร์ไม่ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง')
  }

  const text = await res.text()
  const payload = text ? safeParse(text) : null

  if (!res.ok) {
    const message =
      (payload as { error?: string } | null)?.error ?? `คำขอไม่สำเร็จ (HTTP ${res.status})`
    throw new ClientError(message, res.status)
  }
  return { status: res.status, data: payload as T }
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

/**
 * ฝั่งของผู้ใช้ไม่ได้เก็บเป็นคอลัมน์ใน API — สรุปจากบทบาทและการเป็นสมาชิกองค์กร
 * ผู้ดูแลระบบมาก่อน จากนั้นถ้าอยู่ในองค์กรใดองค์กรหนึ่งถือเป็นฝั่งองค์กร
 */
async function resolveSide(
  token: string,
  role: string,
  userId: number,
): Promise<{
  side: Side
  orgRole?: 'owner' | 'hr' | 'viewer'
  organizationId?: string
  organizationName?: string
}> {
  if (role === 'admin') return { side: 'admin' }

  try {
    const res = await call<{ data: { id: number; name: string }[] | null }>('/api/organizations', {
      token,
    })
    const orgs = res.data ?? []
    if (orgs.length > 0) {
      const org = orgs[0]
      // หา role ในองค์กร — ใช้แยก UI เจ้าของ vs HR
      let orgRole: 'owner' | 'hr' | 'viewer' | undefined
      try {
        const members = await call<{ data: { user_id: number; role: string }[] | null }>(
          `/api/organizations/${org.id}/members`,
          { token },
        )
        const mine = (members.data ?? []).find((m) => m.user_id === userId)
        if (mine && (mine.role === 'owner' || mine.role === 'hr' || mine.role === 'viewer')) {
          orgRole = mine.role
        }
      } catch {
        /* อ่าน role ไม่ได้ก็ยังใช้งานฝั่งองค์กรได้ */
      }
      return { side: 'employer', orgRole, organizationId: String(org.id), organizationName: org.name }
    }
  } catch {
    // องค์กรอ่านไม่ได้ก็ไม่ควรทำให้ล็อกอินล้ม — ถือว่าเป็นฝั่งคนทำงาน
  }
  return { side: 'jobseeker' }
}

async function toSessionUser(token: string, user: ApiUser): Promise<SessionUser> {
  const resolved = await resolveSide(token, user.role, user.id)
  return {
    id: String(user.id),
    email: user.email,
    name: user.name,
    role: user.role === 'admin' ? 'admin' : 'user',
    ...resolved,
  }
}

function toOrderRecord(order: ApiOrder): OrderRecord {
  const snapshot = order.input
  const report = snapshot?.report
  return {
    id: String(order.id),
    code: order.code,
    product: order.product,
    // draft = ยังไม่ได้จ่าย · นอกนั้นถือว่าเปิดอ่านได้ (รายงานประกอบฝั่ง client)
    status: order.status === 'draft' ? 'processing' : 'ready',
    subjectName: report?.subject.name ?? 'ไม่ระบุชื่อ',
    orgLabel: snapshot?.orgLabel ?? '—',
    total: Math.round(order.amount_satang / 100),
    express: snapshot?.express ?? false,
    createdAt: order.created_at,
    input: report as GenerateReportInput,
  }
}

function toChallenge(res: { ref: string; dev_code?: string }): OtpChallenge {
  return { ref: res.ref ?? '', devCode: res.dev_code || undefined }
}

export const liveClient: MingheClient = {
  mode: 'live',

  async runtimeConfig(): Promise<RuntimeConfig> {
    // /mode บอกทั้งโหมดของ API, สถานะปุ่ม Google และบัญชีทดลอง (ถ้า API อยู่โหมด mock)
    try {
      const res = await call<{
        mode: string
        google_login_enabled: boolean
        google_client_id?: string
        google_login_note?: string
        mock_accounts: (MockAccount & { org_role?: string })[] | null
      }>('/mode')
      return {
        mode: res.mode === 'mock' ? 'mock' : 'live',
        googleLoginEnabled: Boolean(res.google_login_enabled && res.google_client_id),
        googleClientId: res.google_client_id || undefined,
        googleLoginNote: res.google_login_note || undefined,
        mockAccounts: (res.mock_accounts ?? []).map((a) => ({
          ...a,
          orgRole: a.org_role === 'owner' || a.org_role === 'hr' ? a.org_role : undefined,
        })),
      }
    } catch {
      // ติดต่อ API ไม่ได้ — ปิดปุ่ม Google ไว้ก่อน ดีกว่าปล่อยให้กดแล้วค้าง
      return { mode: 'live', googleLoginEnabled: false, mockAccounts: [] }
    }
  },

  async login(email, password) {
    const res = await call<{ token: string; user: ApiUser }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    })
    return { token: res.token, user: await toSessionUser(res.token, res.user) }
  },

  /**
   * ส่ง ID token ที่ได้จาก Google Identity Services ให้ Go ตรวจกับ Google แล้วออก session (F-02)
   * ฝั่งหน้าเว็บไม่แตะ client secret เลย — อยู่ที่ server ที่เดียวตามที่ตัดสินไว้
   */
  async loginWithGoogle(idToken: string): Promise<AuthResult> {
    const res = await call<{ token: string; user: ApiUser }>('/auth/google', {
      method: 'POST',
      body: { id_token: idToken },
    })
    return { token: res.token, user: await toSessionUser(res.token, res.user) }
  },

  /* ── สถานที่เกิดจากลิงก์ Google Maps (F-08) ─────────────── */

  async resolvePlace(url): Promise<ResolvedPlace> {
    const res = await call<{
      lat: number
      lng: number
      label: string
      timezone_offset_hours: number
      timezone_region?: string
      timezone_approximate: boolean
    }>('/geo/resolve', { method: 'POST', body: { url } })
    return {
      lat: res.lat,
      lng: res.lng,
      label: res.label,
      timezoneOffsetHours: res.timezone_offset_hours,
      timezoneRegion: res.timezone_region,
      timezoneApproximate: res.timezone_approximate,
    }
  },

  async me(token) {
    const user = await call<ApiUser>('/api/me', { token })
    return toSessionUser(token, user)
  },

  /* ── สมัครสมาชิก / รีเซ็ตรหัสผ่าน (F-02) ───────────────── */

  async requestRegister(email) {
    const res = await call<{ ref: string; dev_code?: string }>('/auth/requestRegister', {
      method: 'POST',
      body: { email },
    })
    return toChallenge(res)
  },

  /**
   * สมัคร → (ถ้าเป็นองค์กร) สร้างองค์กรให้ผู้สมัครเป็นเจ้าของ → สรุปฝั่งของผู้ใช้
   * ถ้าสร้างองค์กรไม่สำเร็จ บัญชียังใช้ได้ในฐานะคนทำงาน และไปตั้งองค์กรภายหลังได้
   */
  async register(input: RegisterInput) {
    const res = await call<{ token: string; user: ApiUser }>('/auth/register', {
      method: 'POST',
      body: {
        email: input.email,
        ref: input.ref,
        code: input.code,
        name: input.name,
        password: input.password,
      },
    })

    if (input.accountType === 'employer' && input.organizationName?.trim()) {
      try {
        await call('/api/organizations', {
          method: 'POST',
          token: res.token,
          body: { name: input.organizationName.trim() },
        })
      } catch {
        /* บัญชีสร้างสำเร็จแล้ว — องค์กรตั้งทีหลังได้ ไม่ควรทำให้การสมัครล้ม */
      }
    }

    return { token: res.token, user: await toSessionUser(res.token, res.user) }
  },

  async requestPasswordReset(email) {
    const res = await call<{ ref: string; dev_code?: string }>('/auth/requestResetPassword', {
      method: 'POST',
      body: { email },
    })
    return toChallenge(res)
  },

  async resetPassword(input: ResetPasswordInput) {
    await call('/auth/resetPassword', {
      method: 'PATCH',
      body: { email: input.email, ref: input.ref, code: input.code, password: input.password },
    })
  },

  /* ── คำสั่งซื้อ ─────────────────────────────────────────── */

  async listOrders(token, product) {
    const query = product ? `?product=${product}` : ''
    const res = await call<{ data: ApiOrder[] | null }>(`/api/orders${query}`, { token })
    return (res.data ?? []).map(toOrderRecord)
  },

  /**
   * สั่งซื้อในโหมด live ใช้ 4 ขั้น เพื่อให้ทุกอย่างถูกบันทึกครบตามที่ UAT ขอ:
   *   1. บันทึกความยินยอม (F-06) — ต้องมีก่อนจึงจะจ่ายได้
   *   2. สร้างโปรไฟล์ผู้ถูกวิเคราะห์ (F-25 ระบบ memory)
   *   3. สร้างคำสั่งซื้อพร้อม snapshot ของฟอร์ม
   *   4. ยืนยันการชำระเงิน (ยังเป็นการยืนยันฝั่ง client จนกว่า GB Prime Pay จะเชื่อมเสร็จ — Q0-3)
   */
  async createOrder(token, draft) {
    const consent = await call<{ id: number }>('/consents', {
      method: 'POST',
      token,
      body: { documents: ['terms', 'privacy', 'refund'] },
    })

    const subject = draft.input.subject
    const profile = await call<{ id: number }>('/api/profiles', {
      method: 'POST',
      token,
      body: toProfileBody({
        kind: draft.product === 'jobseeker' ? 'self' : 'candidate',
        name: subject.name,
        gender: subject.gender ?? '',
        birthDate: subject.birthDate,
        birthTime: subject.birthTime ?? '',
        province: subject.province ?? '',
        placeUrl: subject.placeUrl,
        placeLabel: subject.placeLabel,
        lat: subject.latitude,
        lng: subject.longitude,
        timezoneOffsetHours: subject.tzOffsetHours,
        // โปรไฟล์ฝั่งองค์กรเป็นของ "องค์กร" ไม่ใช่ของคนกรอก — HR ลาออกแล้วข้อมูลยังอยู่กับบริษัท
        organizationId: draft.product === 'employer' ? draft.organizationId : undefined,
      }),
    })

    const snapshot: OrderSnapshot = {
      report: draft.input,
      orgLabel: draft.orgLabel,
      express: draft.express ?? false,
    }

    const created = await call<ApiOrder>('/api/orders', {
      method: 'POST',
      token,
      body: {
        product: draft.product,
        depth: draft.depth ?? 'premium',
        speed: draft.express ? 'express' : 'standard',
        subject_profile_id: profile.id,
        org_mode: draft.orgMode,
        input: snapshot,
      },
    })

    const paid = await call<ApiOrder>(`/api/orders/${created.id}/pay`, {
      method: 'POST',
      token,
      body: { consent_id: consent.id, method: 'pending_gateway', payment_ref: `PRE-${created.code}` },
    })

    return toOrderRecord(paid)
  },

  async findOrderByCode(code, pin) {
    const res = await call<{ order: ApiOrder }>('/r', {
      method: 'POST',
      body: { code, pin: pin ?? '' },
    })
    return toOrderRecord(res.order)
  },

  /* ── องค์กรและสมาชิก (F-05) ─────────────────────────────── */

  async listOrgMembers(token, orgId): Promise<OrgMember[]> {
    const myId = userIdFromToken(token)
    const res = await call<{ data: ApiMember[] | null }>(`/api/organizations/${orgId}/members`, { token })
    return (res.data ?? []).map((m) => ({
      userId: String(m.user_id),
      name: m.user?.name || '(ยังไม่ได้ตั้งชื่อ)',
      email: m.user?.email || '—',
      role: toOrgRole(m.role),
      status: m.user?.status === 'deactivated' ? 'deactivated' : 'active',
      isMe: m.user_id === myId,
    }))
  },

  async listOrgInvites(token, orgId): Promise<OrgInvite[]> {
    const res = await call<{ data: ApiInvite[] | null }>(`/api/organizations/${orgId}/invites`, { token })
    return (res.data ?? []).map((i) => ({
      id: String(i.id),
      email: i.email,
      role: toOrgRole(i.role),
      invitedByName: i.invited_by_name,
      createdAt: i.created_at,
      expiresAt: i.expires_at,
    }))
  },

  /**
   * เชิญสมาชิกด้วยอีเมล — API ตอบต่างกันตามว่าอีเมลนั้นมีบัญชีแล้วหรือยัง
   * 201 = เข้าเป็นสมาชิกทันที · 200 = เปลี่ยนบทบาทของสมาชิกเดิม · 202 = ค้างเป็นคำเชิญ
   */
  async inviteOrgMember(token, orgId, email, role): Promise<InviteResult> {
    const res = await callWithStatus<{ id?: number; user_id?: number }>(
      `/api/organizations/${orgId}/members`,
      { method: 'POST', token, body: { email, role } },
    )
    const outcome =
      res.status === 202 ? 'invite-sent' : res.status === 200 ? 'role-updated' : 'member-added'
    return { outcome, email, role }
  },

  async removeOrgMember(token, orgId, userId) {
    await call(`/api/organizations/${orgId}/members/${userId}`, { method: 'DELETE', token })
  },

  async revokeOrgInvite(token, orgId, inviteId) {
    await call(`/api/organizations/${orgId}/invites/${inviteId}`, { method: 'DELETE', token })
  },

  /* ── ระบบ memory (F-25) ─────────────────────────────────── */

  async listProfiles(token, opts): Promise<SavedProfile[]> {
    const params = new URLSearchParams({ limit: '100' })
    if (opts?.kind) params.set('kind', opts.kind)
    if (opts?.organizationId) params.set('organization_id', opts.organizationId)
    const res = await call<{ data: ApiProfile[] | null }>(`/api/profiles?${params.toString()}`, { token })
    return (res.data ?? []).map(toSavedProfile)
  },

  async saveProfile(token, input): Promise<SavedProfile> {
    const created = await call<ApiProfile>('/api/profiles', {
      method: 'POST',
      token,
      body: toProfileBody(input),
    })
    return toSavedProfile(created)
  },

  async deleteProfile(token, id) {
    await call(`/api/profiles/${id}`, { method: 'DELETE', token })
  },

  async listTeams(token, orgId): Promise<SavedTeam[]> {
    const res = await call<{ data: ApiTeam[] | null }>(`/api/organizations/${orgId}/teams`, { token })
    const teams = res.data ?? []
    // จำนวนสมาชิกไม่ได้มากับรายการทีม — ดึงทีละทีมเพื่อให้การ์ดบอกจำนวนได้
    // ทีมต่อองค์กรมีไม่กี่ทีม จึงยังคุ้มกว่าการเพิ่ม endpoint ใหม่ตอนนี้
    return Promise.all(
      teams.map(async (t) => {
        let memberCount = 0
        try {
          const members = await call<{ data: ApiTeamMember[] | null }>(`/api/teams/${t.id}/members`, { token })
          memberCount = (members.data ?? []).length
        } catch {
          /* นับไม่ได้ก็ยังแสดงทีมได้ */
        }
        return { id: String(t.id), name: t.name, note: t.note ?? '', memberCount }
      }),
    )
  },

  async createTeam(token, orgId, name, note): Promise<SavedTeam> {
    const created = await call<ApiTeam>(`/api/organizations/${orgId}/teams`, {
      method: 'POST',
      token,
      body: { name, note: note ?? '' },
    })
    return { id: String(created.id), name: created.name, note: created.note ?? '', memberCount: 0 }
  },

  async listTeamMembers(token, teamId): Promise<SavedTeamMember[]> {
    const res = await call<{ data: ApiTeamMember[] | null }>(`/api/teams/${teamId}/members`, { token })
    return (res.data ?? [])
      .filter((m): m is ApiTeamMember & { profile: ApiProfile } => Boolean(m.profile))
      .map((m) => ({
        profileId: String(m.profile_id),
        position: m.position ?? '',
        isLead: Boolean(m.is_lead),
        profile: toSavedProfile(m.profile),
      }))
  },

  async addTeamMember(token, teamId, profileId, position) {
    await call(`/api/teams/${teamId}/members`, {
      method: 'POST',
      token,
      body: { profile_id: Number(profileId), position: position ?? '' },
    })
  },

  async removeTeamMember(token, teamId, profileId) {
    await call(`/api/teams/${teamId}/members/${profileId}`, { method: 'DELETE', token })
  },

  /* ── Admin Console ──────────────────────────────────────── */

  async adminOverview(token): Promise<AdminOverview> {
    const res = await call<{
      orders: Record<string, number>
      users_total: number
      users_active: number
      legal_published: number
      legal_total: number
    }>('/admin/overview', { token })
    return {
      orders: {
        paid: res.orders.paid ?? 0,
        processing: res.orders.processing ?? 0,
        delivered: res.orders.delivered ?? 0,
      },
      usersTotal: res.users_total,
      usersActive: res.users_active,
      legalPublished: res.legal_published,
      legalTotal: res.legal_total,
    }
  },

  async adminListOrders(token): Promise<AdminOrder[]> {
    const myId = userIdFromToken(token)
    const res = await call<{ data: ApiOrder[] | null }>('/admin/orders', { token })
    return (res.data ?? [])
      .filter((o) => o.status !== 'draft') // งานที่ลูกค้ายังกรอกไม่จบไม่ใช่งานของแอดมิน
      .map((o) => {
        const snapshot = o.input
        const status: AdminOrderStatus =
          o.status === 'paid' || o.status === 'processing' || o.status === 'delivered'
            ? o.status
            : 'other'
        return {
          id: String(o.id),
          code: o.code,
          product: o.product,
          subjectName: snapshot?.report?.subject.name ?? 'ไม่ระบุชื่อ',
          orgLabel: snapshot?.orgLabel ?? '—',
          customerEmail: o.customer_email ?? '—',
          total: Math.round(o.amount_satang / 100),
          express: snapshot?.express ?? false,
          status,
          assignee: o.assigned_admin_name || null,
          assigneeIsMe: o.assigned_admin_id !== null && o.assigned_admin_id === myId,
          createdAt: o.created_at,
        }
      })
  },

  async adminClaimOrder(token, id) {
    await call(`/admin/orders/${id}/claim`, { method: 'POST', token })
  },

  async adminReleaseOrder(token, id) {
    await call(`/admin/orders/${id}/claim`, { method: 'DELETE', token })
  },

  async adminProcessOrder(token, id) {
    await call(`/admin/orders/${id}/process`, { method: 'POST', token })
  },

  async adminDeliverOrder(token, id) {
    await call(`/admin/orders/${id}/deliver`, { method: 'POST', token })
  },

  async adminListUsers(token): Promise<AdminUserRow[]> {
    const res = await call<{
      data: { id: number; email: string; name: string; role: string; status: string; created_at: string }[] | null
    }>('/admin/users?limit=100', { token })
    return (res.data ?? []).map((u) => ({
      id: String(u.id),
      email: u.email,
      name: u.name,
      role: u.role === 'admin' ? 'admin' : 'user',
      status: u.status === 'active' ? 'active' : 'deactivated',
      createdAt: u.created_at,
    }))
  },

  async adminSetUserStatus(token, id, status) {
    await call(`/admin/users/${id}/status`, { method: 'PATCH', token, body: { status } })
  },

  async adminListLegal(token): Promise<AdminLegalDoc[]> {
    const res = await call<{
      data: { slug: string; title: string; version: string; status: string }[] | null
    }>('/admin/legal', { token })
    return (res.data ?? []).map((d) => ({
      slug: d.slug,
      title: d.title,
      version: d.version,
      status: d.status === 'published' ? 'published' : 'draft',
    }))
  },
}

/** อ่าน user id จาก payload ของ JWT — ใช้เทียบว่างานไหนเป็น "ของฉัน" */
function userIdFromToken(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return typeof payload.id === 'number' ? payload.id : null
  } catch {
    return null
  }
}
