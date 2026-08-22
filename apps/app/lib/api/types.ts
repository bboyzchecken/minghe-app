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
  organizationId?: string
  organizationName?: string
}

/**
 * ค่าตั้งที่ต้องรู้ตอน runtime — มาจาก `/mode` ของ API
 *
 * ทำไมไม่ฝังตอน build: หน้าเว็บเป็น static export ถ้าฝัง client id ของ Google ตอน build
 * แปลว่าได้ credential มาเมื่อไรต้อง build ใหม่ทุกครั้ง — อ่านตอน runtime แล้วรีสตาร์ตแค่ API พอ
 */
export interface RuntimeConfig {
  mode: Mode
  googleLoginEnabled: boolean
  googleClientId?: string
  /** เหตุผลที่ปุ่ม Google ยังกดไม่ได้ — แสดงใต้ปุ่มตรง ๆ */
  googleLoginNote?: string
  /** บัญชีทดลอง — ลิสต์ว่างเมื่อ API อยู่โหมด live */
  mockAccounts: MockAccount[]
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
  /** องค์กรที่โปรไฟล์ผู้ถูกวิเคราะห์จะถูกเก็บไว้ให้ (F-25) — มีเฉพาะฝั่ง employer */
  organizationId?: string
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

/* ── สถานที่เกิดจากลิงก์ Google Maps (F-08) ─────────────── */

export interface ResolvedPlace {
  lat: number
  lng: number
  /** ชื่อสถานที่ที่แกะได้จากลิงก์ — ว่างได้ถ้าลิงก์ไม่มีชื่อติดมา */
  label: string
  timezoneOffsetHours: number
  timezoneRegion?: string
  /** true = เดาเขตเวลาจากลองจิจูดล้วน ต้องให้ผู้ใช้ยืนยันก่อนใช้ */
  timezoneApproximate: boolean
}

/* ── องค์กรและสมาชิก (F-05) ─────────────────────────────── */

export type OrgRole = 'owner' | 'hr' | 'viewer'

export interface OrgMember {
  userId: string
  name: string
  email: string
  role: OrgRole
  status: 'active' | 'deactivated'
  /** true = แถวนี้คือผู้ใช้ที่ล็อกอินอยู่ (ห้ามลบตัวเอง) */
  isMe: boolean
}

/** คำเชิญที่ส่งไปยังอีเมลที่ยังไม่มีบัญชี — ผูกให้อัตโนมัติเมื่อเจ้าตัวเข้าระบบครั้งแรก */
export interface OrgInvite {
  id: string
  email: string
  role: OrgRole
  invitedByName: string
  createdAt: string
  expiresAt: string
}

/** ผลของการเชิญ — บอกหน้าเว็บว่าควรขึ้นข้อความแบบไหน */
export interface InviteResult {
  outcome: 'member-added' | 'role-updated' | 'invite-sent'
  email: string
  role: OrgRole
}

/* ── ระบบ memory (F-25) ─────────────────────────────────── */

export type ProfileKind = 'self' | 'candidate' | 'employee' | 'executive'

/** โปรไฟล์ที่ระบบจำไว้ ใช้ซ้ำได้โดยไม่ต้องกรอกวันเกิดใหม่ */
export interface SavedProfile {
  id: string
  kind: ProfileKind
  name: string
  gender: 'male' | 'female' | ''
  /** ISO 'YYYY-MM-DD' — แปลงเป็น DD/MM/YYYY ตอนแสดงผลเท่านั้น (F-07) */
  birthDate: string
  birthTime: string
  province: string
  placeLabel: string
  placeUrl: string
  lat?: number
  lng?: number
  timezoneOffsetHours?: number
  organizationId?: string
  createdAt: string
}

export interface SaveProfileInput {
  kind: ProfileKind
  name: string
  gender?: 'male' | 'female' | ''
  birthDate: string
  birthTime?: string
  province?: string
  placeUrl?: string
  placeLabel?: string
  lat?: number
  lng?: number
  timezoneOffsetHours?: number
  organizationId?: string
}

/** ทีมที่เก็บไว้เทียบกับ candidate ใหม่ได้เรื่อย ๆ (F-25 ข้อ ข) */
export interface SavedTeam {
  id: string
  name: string
  note: string
  memberCount: number
}

export interface SavedTeamMember {
  profileId: string
  position: string
  isLead: boolean
  profile: SavedProfile
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

  /** ค่าตั้งตอน runtime + บัญชีทดลอง (บัญชีทดลองว่างเสมอเมื่ออยู่โหมด live) */
  runtimeConfig(): Promise<RuntimeConfig>
  login(email: string, password: string): Promise<AuthResult>
  /**
   * เข้าสู่ระบบด้วย Google (F-02)
   * @param idToken ID token จาก Google Identity Services — ฝั่ง server ตรวจกับ Google อีกชั้น
   */
  loginWithGoogle(idToken: string): Promise<AuthResult>
  me(token: string): Promise<SessionUser>

  /** แกะลิงก์ Google Maps เป็นพิกัดให้ผู้ใช้ยืนยันก่อนคำนวณ (F-08) */
  resolvePlace(url: string): Promise<ResolvedPlace>

  /* สมัครสมาชิกด้วยอีเมล + OTP และรีเซ็ตรหัสผ่าน (F-02) */
  requestRegister(email: string): Promise<OtpChallenge>
  register(input: RegisterInput): Promise<AuthResult>
  requestPasswordReset(email: string): Promise<OtpChallenge>
  resetPassword(input: ResetPasswordInput): Promise<void>

  listOrders(token: string, product?: 'employer' | 'jobseeker'): Promise<OrderRecord[]>
  createOrder(token: string, draft: CreateOrderDraft): Promise<OrderRecord>
  findOrderByCode(code: string, pin?: string): Promise<OrderRecord>

  /* องค์กรและสมาชิก — F-05 */
  listOrgMembers(token: string, orgId: string): Promise<OrgMember[]>
  listOrgInvites(token: string, orgId: string): Promise<OrgInvite[]>
  inviteOrgMember(token: string, orgId: string, email: string, role: OrgRole): Promise<InviteResult>
  removeOrgMember(token: string, orgId: string, userId: string): Promise<void>
  revokeOrgInvite(token: string, orgId: string, inviteId: string): Promise<void>

  /* ระบบ memory — F-25 */
  listProfiles(token: string, opts?: { kind?: ProfileKind; organizationId?: string }): Promise<SavedProfile[]>
  saveProfile(token: string, input: SaveProfileInput): Promise<SavedProfile>
  deleteProfile(token: string, id: string): Promise<void>
  listTeams(token: string, orgId: string): Promise<SavedTeam[]>
  createTeam(token: string, orgId: string, name: string, note?: string): Promise<SavedTeam>
  listTeamMembers(token: string, teamId: string): Promise<SavedTeamMember[]>
  addTeamMember(token: string, teamId: string, profileId: string, position?: string): Promise<void>
  removeTeamMember(token: string, teamId: string, profileId: string): Promise<void>

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
