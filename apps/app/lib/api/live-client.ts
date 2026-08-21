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
  type MingheClient,
  type MockAccount,
  type OrderRecord,
  type OtpChallenge,
  type RegisterInput,
  type ResetPasswordInput,
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
): Promise<{ side: Side; orgRole?: 'owner' | 'hr' | 'viewer'; organizationName?: string }> {
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
      return { side: 'employer', orgRole, organizationName: org.name }
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

  async mockAccounts() {
    // API อาจถูกตั้งเป็นโหมด mock อยู่ — ถ้าใช่จะส่งบัญชีทดลองกลับมาให้แสดงเป็นปุ่ม
    try {
      const res = await call<{ mock_accounts: (MockAccount & { org_role?: string })[] | null }>('/mode')
      return (res.mock_accounts ?? []).map((a) => ({
        ...a,
        orgRole: a.org_role === 'owner' || a.org_role === 'hr' ? a.org_role : undefined,
      }))
    } catch {
      return []
    }
  },

  async login(email, password) {
    const res = await call<{ token: string; user: ApiUser }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    })
    return { token: res.token, user: await toSessionUser(res.token, res.user) }
  },

  async loginWithGoogle(): Promise<AuthResult> {
    // ปุ่มบนหน้าเว็บถูกปิดอยู่แล้ว ทางนี้เป็นชั้นกันพลาด
    throw new ClientError('การเข้าสู่ระบบด้วย Google ยังไม่เปิดใช้งาน', 501)
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
      body: {
        kind: draft.product === 'jobseeker' ? 'self' : 'candidate',
        name: subject.name,
        gender: subject.gender ?? '',
        birth_date: isoToDisplay(subject.birthDate),
        birth_time: subject.birthTime ?? '',
        birth_province: subject.province ?? '',
      },
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
