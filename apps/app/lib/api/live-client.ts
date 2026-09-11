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
  type AccessCodeRow,
  type AccessCodeTimeline,
  type AdminLegalDoc,
  type AdminOrder,
  type AdminOrderStatus,
  type AdminOverview,
  type AdminStats,
  type AdminUserRow,
  type AuthResult,
  type CreateOrderDraft,
  type InviteResult,
  type MingheClient,
  type MeProfile,
  type MockAccount,
  type OrderRecord,
  type PaymentRecord,
  type OrgInvite,
  type OrgMember,
  type OrgRole,
  type OtpChallenge,
  type ProfileKind,
  type RedeemAccessCodeResult,
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
  type StatsBucket,
  type TrackEventInput,
  type UserCredit,
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
  phone?: string
  provider?: string
  created_at?: string
  last_login_at?: string | null
}

interface ApiPayment {
  id: number
  receipt_no: string
  order_id: number
  order_code?: string
  order_status?: string
  product: 'employer' | 'jobseeker'
  description: string
  customer_name: string
  customer_email: string
  amount_satang: number
  refund_amount_satang: number
  currency: string
  method: string
  provider_ref: string
  status: string
  refund_reason: string
  refunded_by_name: string
  refunded_at: string | null
  paid_at: string
}

interface ApiCredit {
  id: number
  user_id: number
  user_email?: string
  user_name?: string
  product: string
  depth: string
  note: string
  granted_by_name: string
  status: string
  used_order_id: number | null
  used_at: string | null
  expires_at: string | null
  created_at: string
}

interface ApiBucket {
  key: string
  revenue_employer_satang: number
  revenue_jobseeker_satang: number
  refund_satang: number
  payments_count: number
  orders_employer: number
  orders_jobseeker: number
  signups: number
  trials_started: number
  trials_paid: number
}

function toPayment(p: ApiPayment): PaymentRecord {
  return {
    id: String(p.id),
    receiptNo: p.receipt_no,
    orderId: String(p.order_id),
    orderCode: p.order_code ?? '',
    orderStatus: p.order_status ?? '',
    product: p.product,
    description: p.description,
    customerName: p.customer_name,
    customerEmail: p.customer_email,
    amount: Math.round(p.amount_satang / 100),
    refundAmount: Math.round((p.refund_amount_satang ?? 0) / 100),
    currency: p.currency || 'THB',
    method: p.method,
    providerRef: p.provider_ref,
    status: p.status === 'refunded' ? 'refunded' : p.status === 'partially_refunded' ? 'partially_refunded' : 'paid',
    refundReason: p.refund_reason ?? '',
    refundedBy: p.refunded_by_name ?? '',
    refundedAt: p.refunded_at,
    paidAt: p.paid_at,
  }
}

/* ── รหัสเข้าใช้รอบ UAT ────────────────────────────────── */

interface ApiRedeemResult {
  ok: boolean
  status: 'ok' | 'not_found' | 'expired' | 'revoked' | 'exhausted'
  reason?: string
  code?: string
  prefix?: string
  label?: string
  used_count?: number
  max_uses?: number
}

interface ApiAccessCode {
  id: number
  code: string
  prefix: string
  seq: number
  label: string
  max_uses: number
  used_count: number
  expires_at: string | null
  revoked_at: string | null
  created_at: string
}

function toAccessCode(a: ApiAccessCode): AccessCodeRow {
  return {
    id: a.id,
    code: a.code,
    prefix: a.prefix,
    seq: a.seq,
    label: a.label ?? '',
    maxUses: a.max_uses,
    usedCount: a.used_count,
    expiresAt: a.expires_at,
    revokedAt: a.revoked_at,
    createdAt: a.created_at,
  }
}

function toCredit(c: ApiCredit): UserCredit {
  return {
    id: String(c.id),
    userId: String(c.user_id),
    userEmail: c.user_email,
    userName: c.user_name,
    product: c.product === 'employer' || c.product === 'jobseeker' ? c.product : 'any',
    depth: c.depth === 'standard' || c.depth === 'premium' || c.depth === 'executive' ? c.depth : '',
    note: c.note ?? '',
    grantedBy: c.granted_by_name ?? '',
    status: c.status === 'used' ? 'used' : c.status === 'revoked' ? 'revoked' : 'available',
    usedOrderId: c.used_order_id === null ? null : String(c.used_order_id),
    usedAt: c.used_at,
    expiresAt: c.expires_at,
    createdAt: c.created_at,
  }
}

function toBucket(b: ApiBucket): StatsBucket {
  return {
    key: b.key,
    revenueEmployer: Math.round(b.revenue_employer_satang / 100),
    revenueJobseeker: Math.round(b.revenue_jobseeker_satang / 100),
    refunds: Math.round(b.refund_satang / 100),
    payments: b.payments_count,
    ordersEmployer: b.orders_employer,
    ordersJobseeker: b.orders_jobseeker,
    signups: b.signups,
    trialsStarted: b.trials_started,
    trialsPaid: b.trials_paid,
  }
}

function toMeProfile(user: ApiUser, session: SessionUser): MeProfile {
  return {
    ...session,
    phone: user.phone ?? '',
    provider: user.provider === 'google' ? 'google' : 'email',
    createdAt: user.created_at ?? '',
    lastLoginAt: user.last_login_at ?? null,
  }
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
  payment_method?: string
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
    paymentMethod: order.payment_method,
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
        otp_required?: boolean
        mock_accounts: (MockAccount & { org_role?: string })[] | null
      }>('/mode')
      return {
        mode: res.mode === 'mock' ? 'mock' : 'live',
        googleLoginEnabled: Boolean(res.google_login_enabled && res.google_client_id),
        googleClientId: res.google_client_id || undefined,
        googleLoginNote: res.google_login_note || undefined,
        // API รุ่นก่อนไม่มีฟิลด์นี้ → ถือว่ายังบังคับ OTP
        otpRequired: res.otp_required !== false,
        mockAccounts: (res.mock_accounts ?? []).map((a) => ({
          ...a,
          orgRole: a.org_role === 'owner' || a.org_role === 'hr' ? a.org_role : undefined,
        })),
      }
    } catch {
      // ติดต่อ API ไม่ได้ — ปิดปุ่ม Google ไว้ก่อน ดีกว่าปล่อยให้กดแล้วค้าง
      return { mode: 'live', googleLoginEnabled: false, otpRequired: true, mockAccounts: [] }
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
      body: {
        consent_id: consent.id,
        method: 'pending_gateway',
        payment_ref: `PRE-${created.code}`,
        anon_id: draft.anonId ?? '',
        skip_credit: draft.skipCredit ?? false,
      },
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

  /* ── Bill & Payment / สิทธิ์ทดลอง / สถิติ ──────────────── */

  async meProfile(token): Promise<MeProfile> {
    const user = await call<ApiUser>('/api/me', { token })
    return toMeProfile(user, await toSessionUser(token, user))
  },

  async updateMe(token, input): Promise<MeProfile> {
    const user = await call<ApiUser>('/api/me', { method: 'PATCH', token, body: { name: input.name, phone: input.phone } })
    return toMeProfile(user, await toSessionUser(token, user))
  },

  async listMyPayments(token, organizationId): Promise<PaymentRecord[]> {
    const query = organizationId ? `?organization_id=${organizationId}` : ''
    const res = await call<{ data: ApiPayment[] | null }>(`/api/me/payments${query}`, { token })
    return (res.data ?? []).map(toPayment).sort((a, b) => b.paidAt.localeCompare(a.paidAt))
  },

  async listMyCredits(token): Promise<UserCredit[]> {
    const res = await call<{ data: ApiCredit[] | null }>('/api/me/credits', { token })
    return (res.data ?? []).map(toCredit)
  },

  async redeemAccessCode(code, anonId, token): Promise<RedeemAccessCodeResult> {
    const res = await call<{ data: ApiRedeemResult }>('/access-codes/redeem', {
      method: 'POST',
      token: token ?? undefined,
      body: { code, anon_id: anonId },
    })
    const d = res.data
    return {
      ok: d.ok,
      status: d.status,
      reason: d.reason,
      code: d.code,
      prefix: d.prefix,
      label: d.label,
      usedCount: d.used_count,
      maxUses: d.max_uses,
    }
  },

  async adminListAccessCodes(token, prefix): Promise<AccessCodeRow[]> {
    const qs = prefix ? `?prefix=${encodeURIComponent(prefix)}` : ''
    const res = await call<{ data: ApiAccessCode[] | null }>(`/admin/access-codes${qs}`, { token })
    return (res.data ?? []).map(toAccessCode)
  },

  async adminIssueAccessCodes(token, input): Promise<AccessCodeRow[]> {
    const res = await call<{ data: ApiAccessCode[] | null }>('/admin/access-codes', {
      method: 'POST',
      token,
      body: {
        prefix: input.prefix,
        count: input.count,
        max_uses: input.maxUses ?? 0,
        expires_at: input.expiresAt ?? '',
        labels: input.labels ?? [],
      },
    })
    return (res.data ?? []).map(toAccessCode)
  },

  async adminRevokeAccessCode(token, id): Promise<void> {
    await call(`/admin/access-codes/${id}/revoke`, { method: 'POST', token })
  },

  async adminAccessCodeTimeline(token, code): Promise<AccessCodeTimeline> {
    const res = await call<{
      data: {
        code: string
        redemptions: { anon_id: string; created_at: string }[] | null
        events: { step: string; step_index: number; product: 'employer' | 'jobseeker'; created_at: string }[] | null
      }
    }>(`/admin/access-codes/${encodeURIComponent(code)}/timeline`, { token })
    return {
      code: res.data.code,
      redemptions: (res.data.redemptions ?? []).map((r) => ({ anonId: r.anon_id, at: r.created_at })),
      events: (res.data.events ?? []).map((e) => ({
        step: e.step,
        stepIndex: e.step_index,
        product: e.product,
        at: e.created_at,
      })),
    }
  },

  async trackEvent(input: TrackEventInput, token) {
    try {
      await call('/events', {
        method: 'POST',
        token: token ?? undefined,
        body: {
          anon_id: input.anonId,
          product: input.product,
          step: input.step,
          step_index: input.stepIndex,
          code: input.code ?? '',
        },
      })
    } catch {
      /* สถิติหายหนึ่งจุด ไม่ทำให้ผู้ใช้สะดุด */
    }
  },

  async adminStats(token, granularity, range): Promise<AdminStats> {
    const params = new URLSearchParams({ granularity })
    if (range?.from) params.set('from', range.from)
    if (range?.to) params.set('to', range.to)
    const res = await call<{
      granularity: string
      from: string
      to: string
      series: ApiBucket[] | null
      this_month: ApiBucket
      funnel: { product: 'employer' | 'jobseeker'; step: string; index: number; count: number }[] | null
      dropoffs:
        | {
            anon_id: string
            user_id: number | null
            email: string
            name: string
            product: 'employer' | 'jobseeker'
            last_step: string
            last_step_index: number
            first_at: string
            last_seen_at: string
            has_credit: boolean
          }[]
        | null
    }>(`/admin/stats?${params.toString()}`, { token })
    return {
      granularity,
      from: res.from,
      to: res.to,
      series: (res.series ?? []).map(toBucket),
      thisMonth: toBucket(res.this_month),
      funnel: (res.funnel ?? []).map((f) => ({ product: f.product, step: f.step, index: f.index, count: f.count })),
      dropoffs: (res.dropoffs ?? []).map((d) => ({
        anonId: d.anon_id,
        userId: d.user_id === null ? null : String(d.user_id),
        email: d.email ?? '',
        name: d.name ?? '',
        product: d.product,
        lastStep: d.last_step,
        lastStepIndex: d.last_step_index,
        firstAt: d.first_at,
        lastSeenAt: d.last_seen_at,
        hasCredit: d.has_credit,
      })),
    }
  },

  async adminListPayments(token, filter): Promise<PaymentRecord[]> {
    const params = new URLSearchParams({ limit: '100' })
    if (filter?.product) params.set('product', filter.product)
    if (filter?.status) params.set('status', filter.status)
    if (filter?.search) params.set('search', filter.search)
    const res = await call<{ data: ApiPayment[] | null }>(`/admin/payments?${params.toString()}`, { token })
    return (res.data ?? []).map(toPayment)
  },

  async adminRefundPayment(token, id, input) {
    await call(`/admin/payments/${id}/refund`, {
      method: 'POST',
      token,
      body: { amount_satang: Math.round((input.amount ?? 0) * 100), reason: input.reason },
    })
  },

  async adminListCredits(token, userId): Promise<UserCredit[]> {
    const query = userId ? `?user_id=${userId}` : ''
    const res = await call<{ data: ApiCredit[] | null }>(`/admin/credits${query}`, { token })
    return (res.data ?? []).map(toCredit)
  },

  async adminGrantCredit(token, userId, input) {
    await call(`/admin/users/${userId}/credits`, {
      method: 'POST',
      token,
      body: {
        product: input.product ?? 'any',
        depth: input.depth ?? '',
        note: input.note ?? '',
        expires_days: input.expiresDays ?? 0,
        quantity: input.quantity ?? 1,
      },
    })
  },

  async adminRevokeCredit(token, id) {
    await call(`/admin/credits/${id}`, { method: 'DELETE', token })
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
