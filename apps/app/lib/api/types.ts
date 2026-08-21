/**
 * สัญญากลางระหว่างหน้าเว็บกับแหล่งข้อมูล
 *
 * มีสอง implementation ที่สลับกันได้ด้วย MINGHE_MODE ใน .env ของ root:
 *   mock — เก็บทุกอย่างในเบราว์เซอร์ ไม่ต้องมี API/ฐานข้อมูล (ใช้ตรวจ user process)
 *   live — เรียก Go API ที่ apps/api (ของจริง)
 *
 * หน้าเว็บทุกหน้าเรียกผ่าน hooks ใน `lib/queries.ts` (TanStack Query) ซึ่งห่อ interface นี้อีกชั้น
 * ไม่ควรมีที่ไหน fetch เองตรง ๆ
 */

import type { GenerateReportInput } from '@minghe/report/types'
import type { Mode } from '@/lib/env'

export type Side = 'employer' | 'jobseeker' | 'admin'

export interface SessionUser {
  id: string
  email: string
  name: string
  role: 'admin' | 'user'
  side: Side
  /** บทบาทในองค์กร — ใช้แยก UI เจ้าของ vs HR (มีเฉพาะ side employer) */
  orgRole?: 'owner' | 'hr' | 'viewer'
  organizationName?: string
}

/** บัญชีทดลองที่กดเข้าระบบได้ทันทีในโหมด mock */
export interface MockAccount {
  email: string
  password: string
  name: string
  label: string
  detail: string
  side: Side
  orgRole?: 'owner' | 'hr'
}

export type OrderStatus = 'processing' | 'ready'

export interface OrderRecord {
  id: string
  code: string
  product: 'employer' | 'jobseeker'
  status: OrderStatus
  subjectName: string
  orgLabel: string
  total: number
  express: boolean
  createdAt: string
  /** snapshot ของสิ่งที่กรอก — ใช้ประกอบรายงานฝั่ง client */
  input: GenerateReportInput
  pin?: string
}

export interface CreateOrderDraft {
  product: 'employer' | 'jobseeker'
  depth?: 'standard' | 'premium' | 'executive'
  express?: boolean
  total: number
  input: GenerateReportInput
  orgLabel: string
  orgMode?: 'executive' | 'company-date' | 'industry'
}

export interface AuthResult {
  token: string
  user: SessionUser
}

/**
 * ผลของการขอ OTP
 * devCode มีค่าเฉพาะเมื่อเซิร์ฟเวอร์ยังไม่ได้ตั้งค่าส่งอีเมลและเปิด MINGHE_OTP_ECHO ไว้
 * (สภาพแวดล้อมทดสอบ / เดโมใน LAN) — บน production ต้องไม่มีค่านี้เด็ดขาด
 */
export interface OtpChallenge {
  ref: string
  devCode?: string
}

export type AccountType = 'employer' | 'jobseeker'

export interface RegisterInput {
  email: string
  ref: string
  code: string
  name: string
  password: string
  accountType: AccountType
  /** ชื่อองค์กร — บังคับเมื่อ accountType = employer (ผู้สมัครเป็นเจ้าของบัญชีองค์กร) */
  organizationName?: string
}

export interface ResetPasswordInput {
  email: string
  ref: string
  code: string
  password: string
}

/* ── ฝั่งผู้ดูแลระบบ (Admin Console) ─────────────────────── */

export type AdminOrderStatus = 'paid' | 'processing' | 'delivered' | 'other'

export interface AdminOrder {
  id: string
  code: string
  product: 'employer' | 'jobseeker'
  subjectName: string
  orgLabel: string
  customerEmail: string
  total: number
  express: boolean
  status: AdminOrderStatus
  /** ชื่อแอดมินที่รับเรื่องไว้ — null คือยังอยู่ในคิวกลาง */
  assignee: string | null
  assigneeIsMe: boolean
  createdAt: string
}

export interface AdminUserRow {
  id: string
  email: string
  name: string
  role: 'admin' | 'user'
  status: 'active' | 'deactivated'
  createdAt?: string
}

export interface AdminLegalDoc {
  slug: string
  title: string
  version: string
  status: 'draft' | 'published'
}

export interface AdminOverview {
  orders: { paid: number; processing: number; delivered: number }
  usersTotal: number
  usersActive: number
  legalPublished: number
  legalTotal: number
}

/** error ที่หน้าเว็บแสดงข้อความให้ผู้ใช้อ่านได้โดยตรง */
export class ClientError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message)
    this.name = 'ClientError'
  }
}

export interface MingheClient {
  readonly mode: Mode

  /** บัญชีทดลอง — คืนลิสต์ว่างเมื่ออยู่โหมด live */
  mockAccounts(): Promise<MockAccount[]>
  login(email: string, password: string): Promise<AuthResult>
  /** ยังไม่เปิดใช้งาน — โยน ClientError เสมอในเฟสนี้ (F-02) */
  loginWithGoogle(): Promise<AuthResult>
  me(token: string): Promise<SessionUser>

  /* สมัครสมาชิกด้วยอีเมล + OTP และรีเซ็ตรหัสผ่าน (F-02) */
  requestRegister(email: string): Promise<OtpChallenge>
  register(input: RegisterInput): Promise<AuthResult>
  requestPasswordReset(email: string): Promise<OtpChallenge>
  resetPassword(input: ResetPasswordInput): Promise<void>

  listOrders(token: string, product?: 'employer' | 'jobseeker'): Promise<OrderRecord[]>
  createOrder(token: string, draft: CreateOrderDraft): Promise<OrderRecord>
  findOrderByCode(code: string, pin?: string): Promise<OrderRecord>

  /* Admin Console — เรียกได้เฉพาะบัญชี role=admin (ฝั่ง server บังคับอีกชั้น) */
  adminOverview(token: string): Promise<AdminOverview>
  adminListOrders(token: string): Promise<AdminOrder[]>
  adminClaimOrder(token: string, id: string): Promise<void>
  adminReleaseOrder(token: string, id: string): Promise<void>
  adminProcessOrder(token: string, id: string): Promise<void>
  adminDeliverOrder(token: string, id: string): Promise<void>
  adminListUsers(token: string): Promise<AdminUserRow[]>
  adminSetUserStatus(token: string, id: string, status: 'active' | 'deactivated'): Promise<void>
  adminListLegal(token: string): Promise<AdminLegalDoc[]>
}
