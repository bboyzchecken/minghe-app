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
  /** credit = ใช้สิทธิ์ทดลองที่แอดมินให้ (ยอด 0) */
  paymentMethod?: string
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
  /** anon id ของ funnel — ให้ API ปิดสถิติว่าคนนี้จ่ายแล้ว */
  anonId?: string
  /** true = ไม่หักสิทธิ์ทดลองแม้จะมี */
  skipCredit?: boolean
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

/* ── Bill & Payment / สิทธิ์ทดลอง / สถิติ ────────────────── */

export type PaymentStatus = 'paid' | 'refunded' | 'partially_refunded'

/** หนึ่งใบเสร็จ — ผู้ใช้ดูย้อนหลังได้ แอดมินใช้ติดตาม/คืนเงิน */
export interface PaymentRecord {
  id: string
  receiptNo: string
  orderId: string
  orderCode: string
  orderStatus: string
  product: 'employer' | 'jobseeker'
  description: string
  customerName: string
  customerEmail: string
  /** บาท */
  amount: number
  refundAmount: number
  currency: string
  method: string
  providerRef: string
  status: PaymentStatus
  refundReason: string
  refundedBy: string
  refundedAt: string | null
  paidAt: string
}

export type CreditStatus = 'available' | 'used' | 'revoked'

/** สิทธิ์ใช้ฟรี 1 ครั้งที่แอดมินมอบให้ (ลูกค้าทักไลน์ / ขอลองใช้) */
export interface UserCredit {
  id: string
  userId: string
  userEmail?: string
  userName?: string
  product: 'any' | 'employer' | 'jobseeker'
  depth: '' | 'standard' | 'premium' | 'executive'
  note: string
  grantedBy: string
  status: CreditStatus
  usedOrderId: string | null
  usedAt: string | null
  expiresAt: string | null
  createdAt: string
}

export interface GrantCreditInput {
  product?: 'any' | 'employer' | 'jobseeker'
  depth?: 'standard' | 'premium' | 'executive'
  note?: string
  expiresDays?: number
  quantity?: number
}

export interface RefundInput {
  /** บาท — 0/ไม่ส่ง = คืนเต็มจำนวน */
  amount?: number
  reason: string
}

export type StatsGranularity = 'day' | 'month' | 'year'

/** หนึ่งช่องเวลาในกราฟย้อนหลัง — ตัวเลขเงินเป็นบาท */
export interface StatsBucket {
  key: string
  revenueEmployer: number
  revenueJobseeker: number
  refunds: number
  payments: number
  ordersEmployer: number
  ordersJobseeker: number
  signups: number
  trialsStarted: number
  trialsPaid: number
}

export interface FunnelStep {
  product: 'employer' | 'jobseeker'
  step: string
  index: number
  count: number
}

/** คนที่เริ่มลองเล่นแล้วไม่จ่าย — พร้อมขั้นสุดท้ายที่ไปถึง */
export interface DropoffUser {
  anonId: string
  userId: string | null
  email: string
  name: string
  product: 'employer' | 'jobseeker'
  lastStep: string
  lastStepIndex: number
  firstAt: string
  lastSeenAt: string
  hasCredit: boolean
}

export interface AdminStats {
  granularity: StatsGranularity
  from: string
  to: string
  series: StatsBucket[]
  thisMonth: StatsBucket
  funnel: FunnelStep[]
  dropoffs: DropoffUser[]
}

export interface TrackEventInput {
  anonId: string
  product: 'employer' | 'jobseeker'
  step: string
  stepIndex: number
  /** รหัสเข้าใช้รอบ UAT — แนบไปทุก event เพื่อย้อนดูเส้นทางรายคนได้ */
  code?: string | null
}

/* ── รหัสเข้าใช้รอบ UAT ────────────────────────────────── */

export type AccessCodeStatus = 'ok' | 'not_found' | 'expired' | 'revoked' | 'exhausted'

export interface RedeemAccessCodeResult {
  ok: boolean
  status: AccessCodeStatus
  /** เหตุผลเป็นภาษาไทยเมื่อใช้ไม่ได้ */
  reason?: string
  code?: string
  prefix?: string
  label?: string
  usedCount?: number
  maxUses?: number
}

export interface AccessCodeRow {
  id: number
  code: string
  prefix: string
  seq: number
  label: string
  maxUses: number
  usedCount: number
  expiresAt: string | null
  revokedAt: string | null
  createdAt: string
}

export interface IssueAccessCodesInput {
  prefix: string
  count: number
  maxUses?: number
  /** 'YYYY-MM-DD' — ว่าง = ไม่มีวันหมดอายุ */
  expiresAt?: string
  labels?: string[]
}

export interface AccessCodeTimelineEvent {
  step: string
  stepIndex: number
  product: 'employer' | 'jobseeker'
  at: string
}

export interface AccessCodeTimeline {
  code: string
  redemptions: { anonId: string; at: string }[]
  events: AccessCodeTimelineEvent[]
}

export interface UpdateMeInput {
  name?: string
  phone?: string
}

/** ข้อมูลโปรไฟล์เต็มของบัญชีที่ล็อกอิน (หน้า Profile) */
export interface MeProfile extends SessionUser {
  phone: string
  provider: 'email' | 'google'
  createdAt: string
  lastLoginAt: string | null
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

  /* Bill & Payment / สิทธิ์ทดลอง / สถิติ */
  meProfile(token: string): Promise<MeProfile>
  updateMe(token: string, input: UpdateMeInput): Promise<MeProfile>
  listMyPayments(token: string, organizationId?: string): Promise<PaymentRecord[]>
  listMyCredits(token: string): Promise<UserCredit[]>
  /** ส่งจุดที่ผู้ใช้เดินถึงใน wizard — ไม่ throw เด็ดขาด (สถิติห้ามทำให้โฟลว์พัง) */
  trackEvent(input: TrackEventInput, token?: string | null): Promise<void>

  /* รหัสเข้าใช้รอบ UAT — ด่านปลดล็อกแทนการชำระเงิน */
  redeemAccessCode(code: string, anonId: string, token?: string | null): Promise<RedeemAccessCodeResult>
  adminListAccessCodes(token: string, prefix?: string): Promise<AccessCodeRow[]>
  adminIssueAccessCodes(token: string, input: IssueAccessCodesInput): Promise<AccessCodeRow[]>
  adminRevokeAccessCode(token: string, id: number): Promise<void>
  adminAccessCodeTimeline(token: string, code: string): Promise<AccessCodeTimeline>
  adminStats(token: string, granularity: StatsGranularity, range?: { from?: string; to?: string }): Promise<AdminStats>
  adminListPayments(token: string, filter?: { product?: string; status?: string; search?: string }): Promise<PaymentRecord[]>
  adminRefundPayment(token: string, id: string, input: RefundInput): Promise<void>
  adminListCredits(token: string, userId?: string): Promise<UserCredit[]>
  adminGrantCredit(token: string, userId: string, input: GrantCreditInput): Promise<void>
  adminRevokeCredit(token: string, id: string): Promise<void>
}
