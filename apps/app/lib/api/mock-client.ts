'use client'

/**
 * โหมด mock — เก็บทุกอย่างใน localStorage ของเบราว์เซอร์
 *
 * ตั้งใจให้พฤติกรรมเหมือนโหมด live ทุกอย่างที่หน้าเว็บมองเห็น:
 * ต้องล็อกอินก่อนสั่งซื้อ, รหัสผ่านผิดก็เข้าไม่ได้, สมัครสมาชิกต้องผ่าน OTP,
 * ปุ่ม Google กดไม่ได้เหมือนกัน — จะได้ตรวจ user process ได้จริงโดยไม่ต้องยกฐานข้อมูล
 *
 * ครอบทุก endpoint ที่ live-client มี (A-03) — เพิ่ม method ใน MingheClient เมื่อไร ต้องเพิ่มที่นี่ด้วย
 */

import { generateAccessCode } from '@/lib/access-code'
import { MOCK_ACCOUNTS, DEMO_ORG_NAME } from './mock-accounts'
import {
  ClientError,
  type AccessCodeRow,
  type AccessCodeTimeline,
  type AdminLegalDoc,
  type AdminOrder,
  type AdminOverview,
  type AdminStats,
  type AdminUserRow,
  type DropoffUser,
  type FunnelStep,
  type MeProfile,
  type PaymentRecord,
  type StatsBucket,
  type StatsGranularity,
  type TrackEventInput,
  type UserCredit,
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
} from './types'

const ORDERS_KEY = 'minghe:mock:orders'
const MEMBERS_KEY = 'minghe:mock:orgMembers'
const INVITES_KEY = 'minghe:mock:orgInvites'
const PROFILES_KEY = 'minghe:mock:profiles'
const TEAMS_KEY = 'minghe:mock:teams'
const TEAM_MEMBERS_KEY = 'minghe:mock:teamMembers'
const ACCOUNTS_KEY = 'minghe:mock:accounts'
const PASSWORDS_KEY = 'minghe:mock:passwords'
const PROFILE_META_KEY = 'minghe:mock:profileMeta'
const REFUNDS_KEY = 'minghe:mock:refunds'
const CREDITS_KEY = 'minghe:mock:credits'
const EVENTS_KEY = 'minghe:mock:events'
const ACCESS_CODES_KEY = 'minghe:mock:accessCodes'
const REDEMPTIONS_KEY = 'minghe:mock:accessCodeRedemptions'
const OTP_PREFIX = 'minghe:mock:otp:'
const TOKEN_PREFIX = 'mock-token:'

/** บัญชีที่สมัครเองในโหมด mock — อยู่ในเครื่องนี้เท่านั้น */
interface RegisteredAccount {
  email: string
  password: string
  name: string
  side: 'employer' | 'jobseeker'
  orgRole?: 'owner'
  organizationName?: string
  createdAt: string
}

/** บัญชีที่ล็อกอินได้ = บัญชีทดลอง (ไฟล์) + บัญชีที่สมัครเอง (localStorage) */
interface ResolvedAccount {
  email: string
  password: string
  name: string
  side: 'employer' | 'jobseeker' | 'admin'
  orgRole?: 'owner' | 'hr'
  organizationName?: string
}

/** ประวัติตัวอย่างที่มีให้ดูตั้งแต่ล็อกอินครั้งแรก จะได้ไม่เจอ dashboard ว่างเปล่า */
const SEED_ORDERS: Record<string, OrderRecord[]> = {
  'employer@demo.minghe.work': [
    seedOrder({
      code: 'PJX-K7QM-3PLA',
      product: 'employer',
      subjectName: 'วีรภัทร',
      orgLabel: 'ผู้บริหาร (คุณบัส)',
      total: 299,
      daysAgo: 22,
      subjectBirth: ['1991-06-08', '09:15'],
    }),
    seedOrder({
      code: 'PJX-9WDC-XR2E',
      product: 'employer',
      subjectName: 'ปาริชาต',
      orgLabel: 'บจก. มงคลเทรด',
      total: 398,
      daysAgo: 24,
      subjectBirth: ['1993-12-02', '17:40'],
      pin: '1988',
    }),
  ],
  'hr@demo.minghe.work': [
    seedOrder({
      code: 'PJX-4HNB-QT8K',
      product: 'employer',
      subjectName: 'ธนกร',
      orgLabel: 'ธาตุอุตสาหกรรม: โลจิสติกส์',
      total: 199,
      daysAgo: 21,
      subjectBirth: ['1994-03-19', '11:05'],
    }),
  ],
  'jobseeker@demo.minghe.work': [
    seedOrder({
      code: 'PJX-2XKD-9MRT',
      product: 'jobseeker',
      subjectName: 'นุชนารถ',
      orgLabel: 'บมจ. รุ่งเรืองโลจิสติกส์',
      total: 199,
      daysAgo: 23,
      subjectBirth: ['1990-09-13', '15:23'],
    }),
  ],
  'admin@minghe.work': [],
}

function seedOrder(spec: {
  code: string
  product: 'employer' | 'jobseeker'
  subjectName: string
  orgLabel: string
  total: number
  daysAgo: number
  subjectBirth: [string, string]
  pin?: string
}): OrderRecord {
  const createdAt = new Date(Date.now() - spec.daysAgo * 86_400_000).toISOString()
  return {
    id: spec.code,
    code: spec.code,
    product: spec.product,
    status: 'ready',
    subjectName: spec.subjectName,
    orgLabel: spec.orgLabel,
    total: spec.total,
    express: false,
    createdAt,
    pin: spec.pin,
    input: {
      subject: {
        name: spec.subjectName,
        birthDate: spec.subjectBirth[0],
        birthTime: spec.subjectBirth[1],
        province: 'กรุงเทพมหานคร',
      },
      org: {
        mode: 'company-date',
        companyName: spec.orgLabel,
        foundingDate: '2015-03-14',
      },
      targetYear: 2026,
    },
  }
}

/* ── storage helpers ────────────────────────────────────── */

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeJSON(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* โควตาเต็มหรือปิด storage — ยอมให้ข้อมูลหายดีกว่าทำหน้าเว็บพัง */
  }
}

type OrderBook = Record<string, OrderRecord[]>

function readOrders(): OrderBook {
  return readJSON<OrderBook>(ORDERS_KEY, {})
}

function ordersFor(email: string): OrderRecord[] {
  const book = readOrders()
  if (!book[email]) {
    book[email] = SEED_ORDERS[email] ? [...SEED_ORDERS[email]] : []
    writeJSON(ORDERS_KEY, book)
  }
  return book[email]
}

/* ── บัญชี ──────────────────────────────────────────────── */

function registeredAccounts(): RegisteredAccount[] {
  return readJSON<RegisteredAccount[]>(ACCOUNTS_KEY, [])
}

function passwordOverrides(): Record<string, string> {
  return readJSON<Record<string, string>>(PASSWORDS_KEY, {})
}

function findAccount(email: string): ResolvedAccount | null {
  const normalized = email.trim().toLowerCase()
  const overrides = passwordOverrides()

  const builtIn = MOCK_ACCOUNTS.find((a) => a.email === normalized)
  if (builtIn) {
    return {
      email: builtIn.email,
      password: overrides[builtIn.email] ?? builtIn.password,
      name: builtIn.name,
      side: builtIn.side,
      orgRole: builtIn.orgRole,
      organizationName: builtIn.side === 'employer' ? DEMO_ORG_NAME : undefined,
    }
  }

  const registered = registeredAccounts().find((a) => a.email === normalized)
  if (registered) {
    return {
      email: registered.email,
      password: overrides[registered.email] ?? registered.password,
      name: registered.name,
      side: registered.side,
      orgRole: registered.orgRole,
      organizationName: registered.organizationName,
    }
  }
  return null
}

function accountByEmail(email: string): ResolvedAccount {
  const account = findAccount(email)
  if (!account) throw new ClientError('ไม่พบบัญชีนี้', 404)
  return account
}

function toSessionUser(account: ResolvedAccount): SessionUser {
  return {
    id: account.email,
    email: account.email,
    name: account.name,
    role: account.side === 'admin' ? 'admin' : 'user',
    side: account.side,
    orgRole: account.orgRole,
    // โหมด mock ไม่มี id องค์กรจริง — ใช้ค่าคงที่เป็นกุญแจให้ hooks ฝั่งหน้าเว็บใช้เหมือนกันทั้งสองโหมด
    organizationId: account.side === 'employer' ? 'mock-org' : undefined,
    organizationName: account.organizationName,
  }
}

/** token ของโหมด mock คืออีเมลที่ต่อ prefix ไว้ ไม่ใช่ token จริง */
function emailFromToken(token: string): string {
  if (!token.startsWith(TOKEN_PREFIX)) {
    throw new ClientError('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่', 401)
  }
  return token.slice(TOKEN_PREFIX.length)
}

/* ── OTP จำลอง ──────────────────────────────────────────── */

interface OtpRecord {
  ref: string
  code: string
  expiresAt: number
  attempts: number
}

const OTP_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function randomRef(): string {
  let out = ''
  for (let i = 0; i < 4; i++) out += OTP_ALPHABET[Math.floor(Math.random() * OTP_ALPHABET.length)]
  return out
}

function issueOtp(purpose: 'register' | 'reset', email: string): OtpChallenge {
  const record: OtpRecord = {
    ref: randomRef(),
    code: String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0'),
    expiresAt: Date.now() + 10 * 60_000,
    attempts: 0,
  }
  writeJSON(OTP_PREFIX + purpose + ':' + email, record)
  // โหมด mock ไม่มีอีเมลจริง — ส่งรหัสกลับมาให้หน้าจอแสดง เหมือน API ตอนเปิด MINGHE_OTP_ECHO
  return { ref: record.ref, devCode: record.code }
}

function consumeOtp(purpose: 'register' | 'reset', email: string, ref: string, code: string) {
  const key = OTP_PREFIX + purpose + ':' + email
  const record = readJSON<OtpRecord | null>(key, null)
  if (!record || record.ref !== ref.toUpperCase() || record.expiresAt < Date.now()) {
    throw new ClientError('รหัสยืนยันไม่ถูกต้องหรือหมดอายุ', 401)
  }
  if (record.attempts >= 5) {
    throw new ClientError('กรอกรหัสผิดเกินจำนวนที่กำหนด กรุณาขอรหัสใหม่', 401)
  }
  if (record.code !== code) {
    record.attempts++
    writeJSON(key, record)
    throw new ClientError('รหัสยืนยันไม่ถูกต้องหรือหมดอายุ', 401)
  }
  try {
    window.localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

/* ── ข้อมูลจำลองฝั่ง Admin Console ──────────────────────── */

const ADMIN_QUEUE_KEY = 'minghe:mock:adminQueue'
const USER_STATUS_KEY = 'minghe:mock:userStatus'

/** แอดมินสมมุติอีกคน — ไว้แสดงว่าระบบกันงานชนกันระหว่างแอดมินหลายคนอย่างไร */
const OTHER_ADMIN = { name: 'สมหมาย (แอดมินกะเช้า)', email: 'sommai@minghe.work' }

interface QueueRow extends Omit<AdminOrder, 'assigneeIsMe'> {
  assigneeEmail: string | null
}

function seedQueue(): QueueRow[] {
  const ago = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString()
  return [
    // งานใหม่ในคิวกลาง — ยังไม่มีใครรับ
    { id: 'q1', code: 'PJX-8Q2N-M4RC', product: 'employer', subjectName: 'ปาริชาต', orgLabel: 'บจก. มงคลเทรด', customerEmail: 'employer@demo.minghe.work', total: 398, express: true, status: 'paid', assignee: null, assigneeEmail: null, createdAt: ago(2) },
    { id: 'q2', code: 'PJX-3TFW-8HKD', product: 'jobseeker', subjectName: 'กมลชนก', orgLabel: 'บจก. ไฟร์เวิร์ค เอเจนซี', customerEmail: 'jobseeker@demo.minghe.work', total: 199, express: false, status: 'paid', assignee: null, assigneeEmail: null, createdAt: ago(5) },
    // งานที่แอดมินอีกคนถืออยู่ — กดแล้วต้องโดนกัน
    { id: 'q3', code: 'PJX-4HNB-QT8K', product: 'employer', subjectName: 'ธนกร', orgLabel: 'ธาตุอุตสาหกรรม: โลจิสติกส์', customerEmail: 'hr@demo.minghe.work', total: 199, express: false, status: 'paid', assignee: OTHER_ADMIN.name, assigneeEmail: OTHER_ADMIN.email, createdAt: ago(8) },
    { id: 'q4', code: 'PJX-7GHN-QW3B', product: 'jobseeker', subjectName: 'อรทัย', orgLabel: 'บจก. ไฟร์เวิร์ค เอเจนซี', customerEmail: 'jobseeker@demo.minghe.work', total: 199, express: false, status: 'processing', assignee: OTHER_ADMIN.name, assigneeEmail: OTHER_ADMIN.email, createdAt: ago(26) },
    // งานที่จบแล้ว
    { id: 'q5', code: 'PJX-K7QM-3PLA', product: 'employer', subjectName: 'วีรภัทร', orgLabel: 'ผู้บริหาร (คุณบัส)', customerEmail: 'employer@demo.minghe.work', total: 299, express: false, status: 'delivered', assignee: OTHER_ADMIN.name, assigneeEmail: OTHER_ADMIN.email, createdAt: ago(24 * 22) },
    { id: 'q6', code: 'PJX-2XKD-9MRT', product: 'jobseeker', subjectName: 'นุชนารถ', orgLabel: 'บมจ. รุ่งเรืองโลจิสติกส์', customerEmail: 'jobseeker@demo.minghe.work', total: 199, express: false, status: 'delivered', assignee: OTHER_ADMIN.name, assigneeEmail: OTHER_ADMIN.email, createdAt: ago(24 * 23) },
  ]
}

function readQueue(): QueueRow[] {
  const existing = readJSON<QueueRow[] | null>(ADMIN_QUEUE_KEY, null)
  if (existing) return existing
  const seeded = seedQueue()
  writeJSON(ADMIN_QUEUE_KEY, seeded)
  return seeded
}

/** ตรวจว่าเป็นแอดมินจริงก่อนทุก action ฝั่งหลังบ้าน — เลียนแบบ middleware ของ API */
function requireAdmin(token: string): ResolvedAccount {
  const account = accountByEmail(emailFromToken(token))
  if (account.side !== 'admin') throw new ClientError('เฉพาะผู้ดูแลระบบเท่านั้น', 403)
  return account
}

function mutateQueue(token: string, id: string, fn: (row: QueueRow, me: ResolvedAccount) => void) {
  const me = requireAdmin(token)
  const rows = readQueue()
  const row = rows.find((r) => r.id === id)
  if (!row) throw new ClientError('ไม่พบคำสั่งซื้อนี้', 404)
  fn(row, me)
  writeJSON(ADMIN_QUEUE_KEY, rows)
}

function readUserStatus(): Record<string, 'active' | 'deactivated'> {
  return readJSON<Record<string, 'active' | 'deactivated'>>(USER_STATUS_KEY, {})
}

/** ผู้ใช้ในระบบ = บัญชีทดลอง + บัญชีที่สมัครเอง + ลูกค้าสมมุติอีกสองราย ให้ตารางดูสมจริง */
function mockUsers(): AdminUserRow[] {
  const overrides = readUserStatus()
  const base: AdminUserRow[] = [
    ...MOCK_ACCOUNTS.map((a) => ({
      id: a.email,
      email: a.email,
      name: a.name,
      role: (a.side === 'admin' ? 'admin' : 'user') as 'admin' | 'user',
      status: 'active' as const,
    })),
    ...registeredAccounts().map((a) => ({
      id: a.email,
      email: a.email,
      name: a.name,
      role: 'user' as const,
      status: 'active' as const,
      createdAt: a.createdAt,
    })),
    { id: 'somsri@gmail.com', email: 'somsri@gmail.com', name: 'สมศรี ใจดี', role: 'user', status: 'active' },
    { id: 'wirat@company.co.th', email: 'wirat@company.co.th', name: 'วิรัตน์ พาณิชย์', role: 'user', status: 'deactivated' },
  ]
  return base.map((u) => ({ ...u, status: overrides[u.email] ?? u.status }))
}

/* ── Bill & Payment / สิทธิ์ทดลอง / สถิติ (จำลอง) ─────────── */

interface RefundNote {
  amount: number
  reason: string
  by: string
  at: string
}

interface StoredCredit extends Omit<UserCredit, 'userEmail' | 'userName'> {}

interface StoredEvent {
  anonId: string
  userEmail: string | null
  product: 'employer' | 'jobseeker'
  step: string
  stepIndex: number
  /** รหัสเข้าใช้รอบ UAT — ว่างได้เมื่อผู้ใช้เข้ามาโดยไม่มีรหัส */
  code?: string
  at: string
}

function readRefunds(): Record<string, RefundNote> {
  return readJSON<Record<string, RefundNote>>(REFUNDS_KEY, {})
}

function readCredits(): StoredCredit[] {
  return readJSON<StoredCredit[]>(CREDITS_KEY, [])
}

function readEvents(): StoredEvent[] {
  return readJSON<StoredEvent[]>(EVENTS_KEY, [])
}

/* ── รหัสเข้าใช้รอบ UAT ────────────────────────────────── */

interface StoredAccessCode {
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

interface StoredRedemption {
  code: string
  anonId: string
  at: string
}

/**
 * ชุดรหัสตั้งต้นของโหมดสาธิต — มีไว้ให้ลองโฟลว์ได้โดยไม่ต้องมีแอดมินออกรหัสก่อน
 * ใช้ prefix เดียวกับตัวอย่างในแผน เพื่อให้เอกสารกับของจริงตรงกัน
 */
const DEMO_ACCESS_PREFIX = 'G1S1-2026'

function seedAccessCodes(): StoredAccessCode[] {
  const now = new Date().toISOString()
  return Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    code: `${DEMO_ACCESS_PREFIX}-${String(i + 1).padStart(2, '0')}`,
    prefix: DEMO_ACCESS_PREFIX,
    seq: i + 1,
    label: '',
    maxUses: 0,
    usedCount: 0,
    expiresAt: null,
    revokedAt: null,
    createdAt: now,
  }))
}

function readAccessCodes(): StoredAccessCode[] {
  const rows = readJSON<StoredAccessCode[]>(ACCESS_CODES_KEY, [])
  if (rows.length > 0) return rows
  const seeded = seedAccessCodes()
  writeJSON(ACCESS_CODES_KEY, seeded)
  return seeded
}

function normalizeCode(value: string): string {
  return value.trim().toUpperCase()
}

/** เลขใบเสร็จจำลอง — คงที่ต่อรหัสคำสั่งซื้อ (ออกใหม่ทุกครั้งไม่ได้ ใบเสร็จต้องนิ่ง) */
function receiptNoFor(order: OrderRecord): string {
  const ym = order.createdAt.slice(0, 7).replace('-', '')
  let h = 0
  for (const ch of order.code) h = (h * 31 + ch.charCodeAt(0)) % 9000
  return `RCP-${ym}-${String(1000 + h).padStart(4, '0')}`
}

function describeOrder(o: OrderRecord): string {
  const base = o.product === 'jobseeker' ? 'เช็กความสมพงษ์กับบริษัท' : 'รายงานความสมพงษ์'
  return `${base}${o.express ? ' + Express' : ''} (${o.code})`
}

/** ทุกคำสั่งซื้อ = หนึ่งใบเสร็จ (รวมยอด 0 จากสิทธิ์ทดลอง) */
function paymentsOf(email: string, orders: OrderRecord[]): PaymentRecord[] {
  const account = findAccount(email)
  const refunds = readRefunds()
  const queue = readQueue()
  return orders.map((o) => {
    const refund = refunds[o.code]
    const status: PaymentRecord['status'] = !refund
      ? 'paid'
      : refund.amount >= o.total
        ? 'refunded'
        : 'partially_refunded'
    const q = queue.find((r) => r.code === o.code)
    return {
      id: o.code,
      receiptNo: receiptNoFor(o),
      orderId: o.code,
      orderCode: o.code,
      orderStatus: refund && status === 'refunded' ? 'refunded' : (q?.status ?? 'delivered'),
      product: o.product,
      description: describeOrder(o),
      customerName: account?.name ?? email,
      customerEmail: email,
      amount: o.total,
      refundAmount: refund?.amount ?? 0,
      currency: 'THB',
      method: o.paymentMethod ?? (o.total === 0 ? 'credit' : 'pending_gateway'),
      providerRef: o.paymentMethod === 'credit' ? 'CREDIT' : `PRE-${o.code}`,
      status,
      refundReason: refund?.reason ?? '',
      refundedBy: refund?.by ?? '',
      refundedAt: refund?.at ?? null,
      paidAt: o.createdAt,
    }
  })
}

/** ลูกค้าทุกราย (บัญชีทดลอง + สมัครเอง) → รวมใบเสร็จทั้งหมดให้แอดมิน */
function allPayments(): PaymentRecord[] {
  const emails = new Set<string>([...MOCK_ACCOUNTS.map((a) => a.email), ...registeredAccounts().map((a) => a.email)])
  const out: PaymentRecord[] = []
  for (const email of emails) {
    const account = findAccount(email)
    if (!account || account.side === 'admin') continue
    out.push(...paymentsOf(email, ordersFor(email)))
  }
  // คิวงานจำลองมีคำสั่งซื้อที่ไม่ได้อยู่ใน order book ของใคร — ออกใบเสร็จให้ด้วย
  const seen = new Set(out.map((p) => p.orderCode))
  for (const row of readQueue()) {
    if (seen.has(row.code)) continue
    const pseudo: OrderRecord = {
      id: row.code,
      code: row.code,
      product: row.product,
      status: 'ready',
      subjectName: row.subjectName,
      orgLabel: row.orgLabel,
      total: row.total,
      express: row.express,
      createdAt: row.createdAt,
      input: { subject: { name: row.subjectName, birthDate: '1990-01-01', birthTime: '00:00' }, org: { mode: 'industry', industryId: 'logistics' }, targetYear: 2026 },
    }
    const [p] = paymentsOf(row.customerEmail, [pseudo])
    out.push({ ...p, customerName: row.customerEmail.split('@')[0] })
  }
  return out.sort((a, b) => b.paidAt.localeCompare(a.paidAt))
}

function usableCredit(email: string, product: 'employer' | 'jobseeker'): StoredCredit | null {
  const now = Date.now()
  return (
    readCredits().find(
      (c) =>
        c.userId === email &&
        c.status === 'available' &&
        (c.product === 'any' || c.product === product) &&
        (!c.expiresAt || new Date(c.expiresAt).getTime() > now),
    ) ?? null
  )
}

/* ── สถิติย้อนหลังจำลอง ──
 * ของจริงมาจาก payments/orders/users/events ใน MySQL · โหมด mock มีข้อมูลแค่ไม่กี่แถว
 * จึงสังเคราะห์ประวัติย้อนหลังแบบ "สุ่มคงที่" (seed จาก key) ให้กราฟมีรูปร่างพอให้ทดสอบ UI
 * แล้วบวกตัวเลขจริงของเดือน/วันปัจจุบันทับเข้าไป
 */
function seeded(key: string, salt: number): number {
  let h = salt
  for (const ch of key) h = (h * 33 + ch.charCodeAt(0)) >>> 0
  return ((h % 1000) / 1000)
}

function bucketKey(date: Date, g: StatsGranularity): string {
  const iso = date.toISOString()
  return g === 'year' ? iso.slice(0, 4) : g === 'month' ? iso.slice(0, 7) : iso.slice(0, 10)
}

function bucketKeys(g: StatsGranularity): string[] {
  const now = new Date()
  const keys: string[] = []
  if (g === 'day') {
    for (let i = 29; i >= 0; i--) keys.push(bucketKey(new Date(now.getTime() - i * 86_400_000), g))
  } else if (g === 'month') {
    for (let i = 11; i >= 0; i--) keys.push(bucketKey(new Date(now.getFullYear(), now.getMonth() - i, 15), g))
  } else {
    for (let i = 4; i >= 0; i--) keys.push(String(now.getFullYear() - i))
  }
  return keys
}

function synthBucket(key: string, g: StatsGranularity): StatsBucket {
  const scale = g === 'day' ? 1 : g === 'month' ? 26 : 300
  const r = (n: number) => seeded(key, n)
  const empOrders = Math.round(r(1) * 4 * scale)
  const jsOrders = Math.round(r(2) * 6 * scale)
  return {
    key,
    revenueEmployer: empOrders * 299 + Math.round(r(3) * 200 * scale),
    revenueJobseeker: jsOrders * 199,
    refunds: r(4) > 0.85 ? 199 * Math.max(1, Math.round(scale / 10)) : 0,
    payments: empOrders + jsOrders,
    ordersEmployer: empOrders,
    ordersJobseeker: jsOrders,
    signups: Math.round(r(5) * 5 * scale),
    trialsStarted: Math.round((empOrders + jsOrders) * (2.2 + r(6))),
    trialsPaid: empOrders + jsOrders,
  }
}

function realBucketsInto(series: StatsBucket[], g: StatsGranularity) {
  const byKey = new Map(series.map((b) => [b.key, b]))
  for (const p of allPayments()) {
    const b = byKey.get(bucketKey(new Date(p.paidAt), g))
    if (!b) continue
    const net = p.amount - p.refundAmount
    if (p.product === 'jobseeker') b.revenueJobseeker += net
    else b.revenueEmployer += net
    b.refunds += p.refundAmount
    b.payments += 1
    if (p.product === 'jobseeker') b.ordersJobseeker += 1
    else b.ordersEmployer += 1
  }
  const started = new Map<string, Set<string>>()
  const paid = new Map<string, Set<string>>()
  for (const e of readEvents()) {
    const k = bucketKey(new Date(e.at), g)
    if (!byKey.has(k)) continue
    const target = e.step === 'paid' ? paid : e.step === 'wizard_start' ? started : null
    if (!target) continue
    if (!target.has(k)) target.set(k, new Set())
    target.get(k)!.add(e.anonId)
  }
  for (const [k, set] of started) byKey.get(k)!.trialsStarted += set.size
  for (const [k, set] of paid) byKey.get(k)!.trialsPaid += set.size
  for (const a of registeredAccounts()) {
    const b = byKey.get(bucketKey(new Date(a.createdAt), g))
    if (b) b.signups += 1
  }
}

function funnelFromEvents(): FunnelStep[] {
  const agg = new Map<string, { product: 'employer' | 'jobseeker'; step: string; index: number; ids: Set<string> }>()
  for (const e of readEvents()) {
    const k = `${e.product}:${e.step}`
    if (!agg.has(k)) agg.set(k, { product: e.product, step: e.step, index: e.stepIndex, ids: new Set() })
    agg.get(k)!.ids.add(e.anonId)
  }
  const real = [...agg.values()].map((a) => ({ product: a.product, step: a.step, index: a.index, count: a.ids.size }))
  // ฐานจำลองให้ funnel มีรูปร่าง (ลดหลั่นตามขั้น)
  const base: FunnelStep[] = []
  const steps: Record<'employer' | 'jobseeker', string[]> = {
    employer: ['wizard_start', 'step_subject', 'step_org', 'step_addons', 'step_review', 'checkout_view', 'login_gate', 'paid'],
    jobseeker: ['wizard_start', 'step_me', 'step_company', 'step_review', 'checkout_view', 'login_gate', 'paid'],
  }
  for (const product of ['employer', 'jobseeker'] as const) {
    const list = steps[product]
    let n = product === 'employer' ? 84 : 126
    list.forEach((step, i) => {
      const r = real.find((x) => x.product === product && x.step === step)
      base.push({ product, step, index: step === 'paid' ? 99 : i, count: n + (r?.count ?? 0) })
      n = Math.round(n * (step === 'login_gate' ? 0.55 : 0.82))
    })
  }
  return base
}

function dropoffsFromEvents(): DropoffUser[] {
  const byAnon = new Map<string, DropoffUser & { paid: boolean }>()
  for (const e of [...readEvents()].sort((a, b) => a.at.localeCompare(b.at))) {
    const k = `${e.anonId}:${e.product}`
    const acc = e.userEmail ? findAccount(e.userEmail) : null
    const cur = byAnon.get(k) ?? {
      anonId: e.anonId,
      userId: e.userEmail,
      email: e.userEmail ?? '',
      name: acc?.name ?? '',
      product: e.product,
      lastStep: e.step,
      lastStepIndex: e.stepIndex,
      firstAt: e.at,
      lastSeenAt: e.at,
      hasCredit: e.userEmail ? usableCredit(e.userEmail, e.product) !== null : false,
      paid: false,
    }
    if (e.step === 'paid') cur.paid = true
    if (e.stepIndex >= cur.lastStepIndex) {
      cur.lastStep = e.step
      cur.lastStepIndex = e.stepIndex
    }
    cur.lastSeenAt = e.at
    if (e.userEmail) {
      cur.userId = e.userEmail
      cur.email = e.userEmail
      cur.name = acc?.name ?? cur.name
    }
    byAnon.set(k, cur)
  }
  const real = [...byAnon.values()].filter((d) => !d.paid).map(({ paid: _p, ...d }) => d)
  // ตัวอย่างสองรายให้เห็นหน้าตาตาราง (คนที่ล็อกอินแล้วแต่ไม่จ่าย / คนที่ยังไม่สมัคร)
  const h = (n: number) => new Date(Date.now() - n * 3_600_000).toISOString()
  const samples: DropoffUser[] = [
    { anonId: 'anon-sample-1', userId: 'somsri@gmail.com', email: 'somsri@gmail.com', name: 'สมศรี ใจดี', product: 'jobseeker', lastStep: 'checkout_view', lastStepIndex: 4, firstAt: h(30), lastSeenAt: h(29), hasCredit: usableCredit('somsri@gmail.com', 'jobseeker') !== null },
    { anonId: 'anon-sample-2', userId: null, email: '', name: '', product: 'employer', lastStep: 'login_gate', lastStepIndex: 6, firstAt: h(52), lastSeenAt: h(51), hasCredit: false },
  ]
  return [...real, ...samples].sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt))
}

/* ── แกะลิงก์ Google Maps ฝั่งเบราว์เซอร์ (F-08) ───────────
 * ใช้รูปแบบเดียวกับตัวแกะใน Go (apps/api/pkg/utils/geo) เพื่อให้ผลตรงกันทั้งสองโหมด
 */

const AT_PATTERN = /@(-?\d+\.\d+),(-?\d+\.\d+)/
const DATA_PATTERN = /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/
const COORD_PATTERN = /^(-?\d+\.\d+),\s*(-?\d+\.\d+)$/
const PLACE_PATTERN = /\/maps\/place\/([^/@]+)/

const MAPS_HOSTS = [
  'maps.app.goo.gl',
  'goo.gl',
  'maps.google.com',
  'www.google.com',
  'google.com',
  'www.google.co.th',
  'google.co.th',
]

function isShortMapsLink(raw: string): boolean {
  try {
    return ['maps.app.goo.gl', 'goo.gl'].includes(new URL(raw.trim()).host.toLowerCase())
  } catch {
    return false
  }
}

function extractPlaceFromUrl(raw: string): ResolvedPlace | null {
  let parsed: URL
  try {
    parsed = new URL(raw.trim())
  } catch {
    return null
  }
  if (parsed.protocol !== 'https:' || !MAPS_HOSTS.includes(parsed.host.toLowerCase())) return null

  const full = parsed.toString()
  const match =
    DATA_PATTERN.exec(full) ??
    AT_PATTERN.exec(full) ??
    ['q', 'll', 'center', 'daddr']
      .map((key) => COORD_PATTERN.exec((parsed.searchParams.get(key) ?? '').trim()))
      .find(Boolean)
  if (!match) return null

  const lat = Number(match[1])
  const lng = Number(match[2])
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

  const labelMatch = PLACE_PATTERN.exec(parsed.pathname)
  const label = labelMatch ? decodeURIComponent(labelMatch[1]).replace(/\+/g, ' ') : ''

  // เดาเขตเวลาแบบเดียวกับฝั่ง Go แต่ย่อเหลือกรณีที่พบบ่อย — หน้าเว็บให้ผู้ใช้ยืนยันอยู่แล้ว
  const inThailand = lat >= 5.5 && lat <= 20.5 && lng >= 97.3 && lng <= 105.7
  return {
    lat,
    lng,
    label,
    timezoneOffsetHours: inThailand ? 7 : Math.round(lng / 15),
    timezoneRegion: inThailand ? 'ไทย' : undefined,
    timezoneApproximate: !inThailand,
  }
}

/* ── คลังข้อมูลจำลอง: สมาชิกองค์กร / โปรไฟล์ / ทีม ────────
 * ทุกอย่างผูกกับ "อีเมลเจ้าของบัญชี" เพราะโหมด mock ไม่มี id องค์กรจริง
 * หน้าเว็บส่ง orgId อะไรมาก็ได้ ที่นี่ใช้เจ้าของเซสชันเป็นขอบเขตแทน
 */

interface StoredMember {
  userId: string
  name: string
  email: string
  role: OrgRole
}

interface StoredInvite {
  id: string
  email: string
  role: OrgRole
  invitedByName: string
  createdAt: string
  expiresAt: string
}

interface StoredTeam {
  id: string
  name: string
  note: string
}

interface StoredTeamMember {
  teamId: string
  profileId: string
  position: string
  isLead: boolean
}

/** ขอบเขตของข้อมูลองค์กรในโหมด mock = องค์กรของบัญชีที่ล็อกอินอยู่ */
function orgScope(token: string): ResolvedAccount {
  const account = accountByEmail(emailFromToken(token))
  if (account.side !== 'employer') {
    throw new ClientError('บัญชีนี้ไม่ได้อยู่ในองค์กร', 403)
  }
  return account
}

/**
 * ขอบเขตของข้อมูลในโหมด mock
 *
 * บัญชีทดลอง**ฝั่งองค์กร**ทั้งหมด (เจ้าของ + HR) ถือว่าอยู่องค์กรเดียวกัน จึงใช้คีย์ร่วมกัน —
 * จะได้เห็นทีมและโปรไฟล์ชุดเดียวกันเหมือนอยู่บริษัทเดียวกันจริง
 *
 * ที่เหลือแยกตามอีเมล — สำคัญกับฝั่งคนทำงานเป็นพิเศษ เพราะบทบาทนั้นระบุไว้ว่า
 * "เห็นข้อมูลขององค์กรใด ๆ ไม่ได้" ถ้าใช้คีย์ร่วมจะเห็นโปรไฟล์พนักงานของบริษัททันที
 */
function scopeKey(account: ResolvedAccount): string {
  const sharesDemoOrg =
    account.side === 'employer' && MOCK_ACCOUNTS.some((a) => a.email === account.email)
  return sharesDemoOrg ? DEMO_ORG_NAME : account.email
}

function readScoped<T>(key: string, account: ResolvedAccount, seed: () => T[]): T[] {
  const book = readJSON<Record<string, T[]>>(key, {})
  const scope = scopeKey(account)
  if (!book[scope]) {
    book[scope] = seed()
    writeJSON(key, book)
  }
  return book[scope]
}

function writeScoped<T>(key: string, account: ResolvedAccount, rows: T[]) {
  const book = readJSON<Record<string, T[]>>(key, {})
  book[scopeKey(account)] = rows
  writeJSON(key, book)
}

function seedMembers(): StoredMember[] {
  return MOCK_ACCOUNTS.filter((a) => a.side === 'employer').map((a) => ({
    userId: a.email,
    name: a.name,
    email: a.email,
    role: (a.orgRole ?? 'viewer') as OrgRole,
  }))
}

/** โปรไฟล์ตัวอย่างในคลัง — ให้หน้า memory ไม่ว่างเปล่าตั้งแต่เข้าครั้งแรก */
function seedProfiles(): SavedProfile[] {
  const ago = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString()
  return [
    {
      id: 'p-exec-1',
      kind: 'executive',
      name: 'คุณบัส (เจ้าของบริษัท)',
      gender: 'male',
      birthDate: '1978-11-04',
      birthTime: '07:20',
      province: 'กรุงเทพมหานคร',
      placeLabel: '',
      placeUrl: '',
      createdAt: ago(40),
    },
    {
      id: 'p-emp-1',
      kind: 'employee',
      name: 'ธนกร (หัวหน้าคลังสินค้า)',
      gender: 'male',
      birthDate: '1994-03-19',
      birthTime: '11:05',
      province: 'ชลบุรี',
      placeLabel: '',
      placeUrl: '',
      createdAt: ago(30),
    },
    {
      id: 'p-emp-2',
      kind: 'employee',
      name: 'ปาริชาต (ฝ่ายจัดซื้อ)',
      gender: 'female',
      birthDate: '1993-12-02',
      birthTime: '17:40',
      province: 'กรุงเทพมหานคร',
      placeLabel: '',
      placeUrl: '',
      createdAt: ago(28),
    },
  ]
}

function seedTeams(): StoredTeam[] {
  return [{ id: 't-ops', name: 'ทีมปฏิบัติการคลังสินค้า', note: 'ทีมที่รับ candidate ใหม่บ่อยที่สุด' }]
}

function seedTeamMembers(): StoredTeamMember[] {
  return [
    { teamId: 't-ops', profileId: 'p-emp-1', position: 'หัวหน้าทีม', isLead: true },
    { teamId: 't-ops', profileId: 'p-emp-2', position: 'ฝ่ายจัดซื้อ', isLead: false },
  ]
}

function nextId(prefix: string): string {
  return prefix + '-' + Math.random().toString(36).slice(2, 9)
}

export const mockClient: MingheClient = {
  mode: 'mock',

  async runtimeConfig(): Promise<RuntimeConfig> {
    return {
      mode: 'mock',
      // โหมด mock ไม่มี server ไว้ตรวจ ID token กับ Google — ปุ่มจึงเปิดเป็น "บัญชี Google สาธิต" แทน
      // โฟลว์ที่ผู้ใช้เห็นเหมือนของจริงทุกขั้น ต่างแค่ตัวยืนยันตัวตน
      googleLoginEnabled: true,
      googleClientId: undefined,
      googleLoginNote: 'โหมดสาธิต — เลือกบัญชี Google จำลองได้โดยไม่ต้องมี OAuth client',
      mockAccounts: MOCK_ACCOUNTS,
    }
  },

  async login(email, password) {
    const account = findAccount(email)
    // ข้อความเดียวกันทั้งกรณีไม่มีบัญชีและรหัสผิด เหมือนฝั่ง API จริง
    if (!account || account.password !== password) {
      throw new ClientError('อีเมลหรือรหัสผ่านไม่ถูกต้อง', 401)
    }
    if (readUserStatus()[account.email] === 'deactivated') {
      throw new ClientError('บัญชีนี้ถูกระงับการใช้งาน', 403)
    }
    return { token: TOKEN_PREFIX + account.email, user: toSessionUser(account) }
  },

  /**
   * โหมดสาธิตของ Google login (F-02)
   *
   * หน้าเว็บส่ง `mock-google:<อีเมล>` มาแทน ID token จริง
   * ผลลัพธ์ที่ผู้ใช้เห็นเหมือนโหมด live: ได้ session ทันทีโดยไม่ต้องกรอกรหัสผ่าน
   * และถ้าอีเมลนั้นยังไม่มีบัญชี ระบบจะสร้างให้เป็นบัญชีคนทำงาน เหมือน Go ทำฝั่ง live
   */
  async loginWithGoogle(idToken: string): Promise<AuthResult> {
    const prefix = 'mock-google:'
    if (!idToken.startsWith(prefix)) {
      throw new ClientError('โหมดสาธิตรับได้เฉพาะบัญชี Google จำลอง', 501)
    }
    const email = idToken.slice(prefix.length).trim().toLowerCase()

    let account = findAccount(email)
    if (!account) {
      const created: RegisteredAccount = {
        email,
        // บัญชีที่มาจาก Google ไม่มีรหัสผ่าน — ใส่ค่าที่ล็อกอินด้วยฟอร์มไม่ผ่าน
        password: '\u0000google',
        name: email.split('@')[0],
        side: 'jobseeker',
        createdAt: new Date().toISOString(),
      }
      writeJSON(ACCOUNTS_KEY, [...registeredAccounts(), created])
      account = accountByEmail(email)
    }
    if (readUserStatus()[account.email] === 'deactivated') {
      throw new ClientError('บัญชีนี้ถูกระงับการใช้งาน', 403)
    }
    return { token: TOKEN_PREFIX + account.email, user: toSessionUser(account) }
  },

  /**
   * แกะลิงก์ Google Maps ในเบราว์เซอร์ (F-08)
   *
   * ข้อจำกัดที่ยอมรับไว้: ลิงก์ย่อ (maps.app.goo.gl) แกะในโหมด mock ไม่ได้จริง ๆ
   * เพราะต้องยิงตาม redirect ซึ่งเบราว์เซอร์ติด CORS — เป็นเหตุผลเดียวกับที่ฟีเจอร์นี้ต้องมี Go API
   * กรณีนั้นจะบอกผู้ใช้ตรง ๆ แล้วให้ใช้ทางสำรอง (จังหวัดเกิด) ตามที่ตัดสินไว้ใน F-08 ข้อ 1
   */
  async resolvePlace(url): Promise<ResolvedPlace> {
    const place = extractPlaceFromUrl(url)
    if (!place) {
      throw new ClientError(
        isShortMapsLink(url)
          ? 'โหมดสาธิตแกะลิงก์ย่อ (maps.app.goo.gl) ไม่ได้ — เปิดลิงก์ในเบราว์เซอร์แล้วคัดลอกลิงก์เต็มจากแถบที่อยู่ หรือเลือกจังหวัดเกิดแทน'
          : 'แกะพิกัดจากลิงก์นี้ไม่ได้ — กรุณาคัดลอกลิงก์จากปุ่ม แชร์ ใน Google Maps อีกครั้ง',
        422,
      )
    }
    return place
  },

  async me(token) {
    return toSessionUser(accountByEmail(emailFromToken(token)))
  },

  /* ── สมัครสมาชิก / รีเซ็ตรหัสผ่าน (F-02) ───────────────── */

  async requestRegister(email) {
    const normalized = email.trim().toLowerCase()
    // มีบัญชีอยู่แล้ว → ตอบเหมือนสำเร็จแต่ไม่มี ref (ไม่เปิดเผยว่าอีเมลไหนมีในระบบ) — พฤติกรรมเดียวกับ API
    if (findAccount(normalized)) return { ref: '' }
    return issueOtp('register', normalized)
  },

  async register(input: RegisterInput) {
    const email = input.email.trim().toLowerCase()
    if (findAccount(email)) throw new ClientError('อีเมลนี้มีบัญชีอยู่แล้ว', 409)
    consumeOtp('register', email, input.ref, input.code)

    const account: RegisteredAccount = {
      email,
      password: input.password,
      name: input.name.trim(),
      side: input.accountType,
      orgRole: input.accountType === 'employer' ? 'owner' : undefined,
      organizationName:
        input.accountType === 'employer' ? input.organizationName?.trim() || 'องค์กรของฉัน' : undefined,
      createdAt: new Date().toISOString(),
    }
    writeJSON(ACCOUNTS_KEY, [...registeredAccounts(), account])

    const resolved = accountByEmail(email)
    return { token: TOKEN_PREFIX + email, user: toSessionUser(resolved) }
  },

  async requestPasswordReset(email) {
    const normalized = email.trim().toLowerCase()
    if (!findAccount(normalized)) return { ref: '' }
    return issueOtp('reset', normalized)
  },

  async resetPassword(input: ResetPasswordInput) {
    const email = input.email.trim().toLowerCase()
    if (!findAccount(email)) throw new ClientError('ไม่พบบัญชีนี้', 404)
    consumeOtp('reset', email, input.ref, input.code)
    writeJSON(PASSWORDS_KEY, { ...passwordOverrides(), [email]: input.password })
  },

  /* ── คำสั่งซื้อ ─────────────────────────────────────────── */

  async listOrders(token, product) {
    const orders = ordersFor(emailFromToken(token))
    const filtered = product ? orders.filter((o) => o.product === product) : orders
    return [...filtered].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  },

  async createOrder(token, draft) {
    const email = emailFromToken(token)
    const code = generateAccessCode()

    // สิทธิ์ทดลองที่แอดมินให้ไว้ — หักอัตโนมัติเหมือน API จริง (ยอดเป็น 0 แต่ยังออกใบเสร็จ)
    const credit = draft.skipCredit ? null : usableCredit(email, draft.product)
    if (credit) {
      const credits = readCredits()
      const target = credits.find((c) => c.id === credit.id)
      if (target) {
        target.status = 'used'
        target.usedOrderId = code
        target.usedAt = new Date().toISOString()
        writeJSON(CREDITS_KEY, credits)
      }
    }

    const order: OrderRecord = {
      id: code,
      code,
      product: draft.product,
      status: 'ready',
      subjectName: draft.input.subject.name,
      orgLabel: draft.orgLabel,
      total: credit ? 0 : draft.total,
      express: draft.express ?? false,
      createdAt: new Date().toISOString(),
      input: draft.input,
      paymentMethod: credit ? 'credit' : 'pending_gateway',
    }

    if (draft.anonId) {
      writeJSON(EVENTS_KEY, [
        ...readEvents().slice(-1999),
        { anonId: draft.anonId, userEmail: email, product: draft.product, step: 'paid', stepIndex: 99, at: order.createdAt },
      ])
    }

    const book = readOrders()
    book[email] = [order, ...ordersFor(email)]
    writeJSON(ORDERS_KEY, book)

    // โหมด live เก็บโปรไฟล์ผู้ถูกวิเคราะห์ไว้ตอนสั่งซื้อ (F-25) — ที่นี่ต้องเหมือนกัน
    // ฝั่งคนทำงานก็เก็บด้วย (kind=self) จะได้ไม่ต้องกรอกวันเกิดตัวเองใหม่ทุกครั้งที่เช็กบริษัท
    const account = findAccount(email)
    if (account && account.side !== 'admin') {
      const subject = draft.input.subject
      const profiles = readScoped(PROFILES_KEY, account, () =>
        account.side === 'employer' ? seedProfiles() : [],
      )
      writeScoped(PROFILES_KEY, account, [
        {
          id: nextId('p'),
          kind: draft.product === 'jobseeker' ? 'self' : 'candidate',
          name: subject.name,
          gender: subject.gender ?? '',
          birthDate: subject.birthDate,
          birthTime: subject.birthTime ?? '',
          province: subject.province ?? '',
          placeLabel: subject.placeLabel ?? '',
          placeUrl: subject.placeUrl ?? '',
          lat: subject.latitude,
          lng: subject.longitude,
          timezoneOffsetHours: subject.tzOffsetHours,
          createdAt: order.createdAt,
        },
        ...profiles,
      ])
    }

    return order
  },

  async findOrderByCode(code, pin) {
    const book = readOrders()
    // ค้นทุกบัญชี — ลูกค้าเปิดรายงานด้วยรหัสได้โดยไม่ต้องล็อกอิน
    const all = [...Object.values(book).flat(), ...Object.values(SEED_ORDERS).flat()]
    const found = all.find((o) => o.code === code)
    if (!found) {
      throw new ClientError('ไม่พบรายงานที่ตรงกับรหัสนี้', 404)
    }
    if (found.pin && found.pin !== pin) {
      throw new ClientError('PIN ไม่ถูกต้อง', 401)
    }
    return found
  },

  /* ── องค์กรและสมาชิก (F-05) ─────────────────────────────── */

  async listOrgMembers(token): Promise<OrgMember[]> {
    const me = orgScope(token)
    return readScoped(MEMBERS_KEY, me, seedMembers).map((m) => ({
      userId: m.userId,
      name: m.name,
      email: m.email,
      role: m.role,
      status: readUserStatus()[m.email] === 'deactivated' ? 'deactivated' : 'active',
      isMe: m.email === me.email,
    }))
  },

  async listOrgInvites(token): Promise<OrgInvite[]> {
    const me = orgScope(token)
    return readScoped<StoredInvite>(INVITES_KEY, me, () => [])
  },

  async inviteOrgMember(token, _orgId, email, role): Promise<InviteResult> {
    const me = orgScope(token)
    if (me.orgRole !== 'owner') {
      throw new ClientError('เฉพาะเจ้าของบัญชีองค์กรเท่านั้นที่เพิ่มสมาชิกได้', 403)
    }

    const normalized = email.trim().toLowerCase()
    const members = readScoped(MEMBERS_KEY, me, seedMembers)
    const existing = members.find((m) => m.email === normalized)
    if (existing) {
      existing.role = role
      writeScoped(MEMBERS_KEY, me, members)
      return { outcome: 'role-updated', email: normalized, role }
    }

    // มีบัญชีอยู่แล้ว → เข้าเป็นสมาชิกทันที · ยังไม่มีบัญชี → ค้างเป็นคำเชิญ (เหมือนฝั่ง API)
    const account = findAccount(normalized)
    if (account) {
      writeScoped(MEMBERS_KEY, me, [
        ...members,
        { userId: account.email, name: account.name, email: account.email, role },
      ])
      return { outcome: 'member-added', email: normalized, role }
    }

    const invites = readScoped<StoredInvite>(INVITES_KEY, me, () => [])
    const kept = invites.filter((i) => i.email !== normalized)
    writeScoped<StoredInvite>(INVITES_KEY, me, [
      ...kept,
      {
        id: nextId('inv'),
        email: normalized,
        role,
        invitedByName: me.name,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 14 * 86_400_000).toISOString(),
      },
    ])
    return { outcome: 'invite-sent', email: normalized, role }
  },

  async removeOrgMember(token, _orgId, userId) {
    const me = orgScope(token)
    if (me.orgRole !== 'owner') throw new ClientError('เฉพาะเจ้าของบัญชีองค์กรเท่านั้น', 403)
    const members = readScoped(MEMBERS_KEY, me, seedMembers)
    const target = members.find((m) => m.userId === userId)
    if (target?.role === 'owner') throw new ClientError('ลบเจ้าของบัญชีองค์กรออกไม่ได้', 409)
    writeScoped(MEMBERS_KEY, me, members.filter((m) => m.userId !== userId))
  },

  async revokeOrgInvite(token, _orgId, inviteId) {
    const me = orgScope(token)
    if (me.orgRole !== 'owner') throw new ClientError('เฉพาะเจ้าของบัญชีองค์กรเท่านั้น', 403)
    const invites = readScoped<StoredInvite>(INVITES_KEY, me, () => [])
    writeScoped<StoredInvite>(INVITES_KEY, me, invites.filter((i) => i.id !== inviteId))
  },

  /* ── ระบบ memory (F-25) ─────────────────────────────────── */

  async listProfiles(token, opts): Promise<SavedProfile[]> {
    const account = accountByEmail(emailFromToken(token))
    const rows = readScoped(PROFILES_KEY, account, () =>
      account.side === 'employer' ? seedProfiles() : [],
    )
    const filtered = opts?.kind ? rows.filter((p) => p.kind === opts.kind) : rows
    return [...filtered].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  },

  async saveProfile(token, input: SaveProfileInput): Promise<SavedProfile> {
    const account = accountByEmail(emailFromToken(token))
    const rows = readScoped(PROFILES_KEY, account, () =>
      account.side === 'employer' ? seedProfiles() : [],
    )
    const kind: ProfileKind = input.kind
    const profile: SavedProfile = {
      id: nextId('p'),
      kind,
      name: input.name,
      gender: input.gender ?? '',
      birthDate: input.birthDate,
      birthTime: input.birthTime ?? '',
      province: input.province ?? '',
      placeLabel: input.placeLabel ?? '',
      placeUrl: input.placeUrl ?? '',
      lat: input.lat,
      lng: input.lng,
      timezoneOffsetHours: input.timezoneOffsetHours,
      createdAt: new Date().toISOString(),
    }
    writeScoped(PROFILES_KEY, account, [profile, ...rows])
    return profile
  },

  async deleteProfile(token, id) {
    const account = accountByEmail(emailFromToken(token))
    const rows = readScoped(PROFILES_KEY, account, () =>
      account.side === 'employer' ? seedProfiles() : [],
    )
    writeScoped(PROFILES_KEY, account, rows.filter((p) => p.id !== id))

    // ลบโปรไฟล์แล้วต้องหลุดจากทุกทีมด้วย ไม่งั้นทีมจะอ้างคนที่ไม่มีอยู่แล้ว
    const links = readScoped<StoredTeamMember>(TEAM_MEMBERS_KEY, account, seedTeamMembers)
    writeScoped<StoredTeamMember>(TEAM_MEMBERS_KEY, account, links.filter((l) => l.profileId !== id))
  },

  async listTeams(token): Promise<SavedTeam[]> {
    const me = orgScope(token)
    const links = readScoped<StoredTeamMember>(TEAM_MEMBERS_KEY, me, seedTeamMembers)
    return readScoped<StoredTeam>(TEAMS_KEY, me, seedTeams).map((t) => ({
      ...t,
      memberCount: links.filter((l) => l.teamId === t.id).length,
    }))
  },

  async createTeam(token, _orgId, name, note): Promise<SavedTeam> {
    const me = orgScope(token)
    const teams = readScoped<StoredTeam>(TEAMS_KEY, me, seedTeams)
    const team: StoredTeam = { id: nextId('t'), name, note: note ?? '' }
    writeScoped<StoredTeam>(TEAMS_KEY, me, [...teams, team])
    return { ...team, memberCount: 0 }
  },

  async listTeamMembers(token, teamId): Promise<SavedTeamMember[]> {
    const me = orgScope(token)
    const profiles = readScoped(PROFILES_KEY, me, seedProfiles)
    return readScoped<StoredTeamMember>(TEAM_MEMBERS_KEY, me, seedTeamMembers)
      .filter((l) => l.teamId === teamId)
      .map((l) => ({
        profileId: l.profileId,
        position: l.position,
        isLead: l.isLead,
        profile: profiles.find((p) => p.id === l.profileId),
      }))
      .filter((m): m is SavedTeamMember => Boolean(m.profile))
  },

  async addTeamMember(token, teamId, profileId, position) {
    const me = orgScope(token)
    const links = readScoped<StoredTeamMember>(TEAM_MEMBERS_KEY, me, seedTeamMembers)
    if (links.some((l) => l.teamId === teamId && l.profileId === profileId)) {
      throw new ClientError('โปรไฟล์นี้อยู่ในทีมแล้ว', 409)
    }
    writeScoped<StoredTeamMember>(TEAM_MEMBERS_KEY, me, [
      ...links,
      { teamId, profileId, position: position ?? '', isLead: false },
    ])
  },

  async removeTeamMember(token, teamId, profileId) {
    const me = orgScope(token)
    const links = readScoped<StoredTeamMember>(TEAM_MEMBERS_KEY, me, seedTeamMembers)
    writeScoped<StoredTeamMember>(
      TEAM_MEMBERS_KEY,
      me,
      links.filter((l) => !(l.teamId === teamId && l.profileId === profileId)),
    )
  },

  /* ── Admin Console ──────────────────────────────────────── */

  async adminOverview(token): Promise<AdminOverview> {
    requireAdmin(token)
    const rows = readQueue()
    const users = mockUsers()
    const count = (s: string) => rows.filter((r) => r.status === s).length
    return {
      orders: { paid: count('paid'), processing: count('processing'), delivered: count('delivered') },
      usersTotal: users.length,
      usersActive: users.filter((u) => u.status === 'active').length,
      legalPublished: 0, // เอกสารทั้งสี่ยังเป็นฉบับร่าง (F-01)
      legalTotal: 4,
    }
  },

  async adminListOrders(token): Promise<AdminOrder[]> {
    const me = requireAdmin(token)
    // งานที่ลูกค้าเพิ่งสั่งในเซสชันนี้ (จ่ายแล้วเปิดอ่านได้ทันทีในโหมด mock) ต้องโผล่ในคิวด้วย
    const seen = new Set(readQueue().map((r) => r.code))
    const extra: QueueRow[] = Object.entries(readOrders()).flatMap(([email, orders]) =>
      orders
        .filter((o) => !seen.has(o.code))
        .map((o) => ({
          id: o.code,
          code: o.code,
          product: o.product,
          subjectName: o.subjectName,
          orgLabel: o.orgLabel,
          customerEmail: email,
          total: o.total,
          express: o.express,
          status: 'delivered' as const,
          assignee: null,
          assigneeEmail: null,
          createdAt: o.createdAt,
        })),
    )
    return [...readQueue(), ...extra]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(({ assigneeEmail, ...row }) => ({ ...row, assigneeIsMe: assigneeEmail === me.email }))
  },

  async adminClaimOrder(token, id) {
    mutateQueue(token, id, (row, me) => {
      if (row.assigneeEmail && row.assigneeEmail !== me.email) {
        throw new ClientError(`งานนี้อยู่กับ ${row.assignee} แล้ว`, 409)
      }
      row.assignee = me.name
      row.assigneeEmail = me.email
    })
  },

  async adminReleaseOrder(token, id) {
    mutateQueue(token, id, (row) => {
      row.assignee = null
      row.assigneeEmail = null
    })
  },

  async adminProcessOrder(token, id) {
    mutateQueue(token, id, (row, me) => {
      if (row.status !== 'paid') throw new ClientError('ดำเนินการได้เฉพาะงานที่ชำระเงินแล้ว', 409)
      if (row.assigneeEmail && row.assigneeEmail !== me.email) {
        throw new ClientError(`งานนี้อยู่กับ ${row.assignee} แล้ว`, 409)
      }
      // งานว่างถือว่ารับเรื่องอัตโนมัติ — พฤติกรรมเดียวกับ API จริง
      row.assignee = me.name
      row.assigneeEmail = me.email
      row.status = 'processing'
    })
  },

  async adminDeliverOrder(token, id) {
    mutateQueue(token, id, (row, me) => {
      if (row.status !== 'processing') throw new ClientError('ส่งมอบได้เฉพาะงานที่กำลังดำเนินการ', 409)
      if (row.assigneeEmail && row.assigneeEmail !== me.email) {
        throw new ClientError(`งานนี้อยู่กับ ${row.assignee} แล้ว — ให้เจ้าของงานเป็นผู้ส่งมอบ`, 409)
      }
      row.status = 'delivered'
    })
  },

  async adminListUsers(token): Promise<AdminUserRow[]> {
    requireAdmin(token)
    return mockUsers()
  },

  async adminSetUserStatus(token, id, status) {
    const me = requireAdmin(token)
    if (id === me.email) throw new ClientError('ระงับบัญชีของตัวเองไม่ได้', 409)
    writeJSON(USER_STATUS_KEY, { ...readUserStatus(), [id]: status })
  },

  async adminListLegal(token): Promise<AdminLegalDoc[]> {
    requireAdmin(token)
    return [
      { slug: 'terms', title: 'เงื่อนไขการใช้งาน', version: '0.1-draft', status: 'draft' },
      { slug: 'privacy', title: 'นโยบายความเป็นส่วนตัว (PDPA)', version: '0.1-draft', status: 'draft' },
      { slug: 'refund', title: 'นโยบายการคืนเงินและการขอลบบัญชี', version: '0.1-draft', status: 'draft' },
      { slug: 'cookies', title: 'นโยบายคุกกี้', version: '0.1-draft', status: 'draft' },
    ]
  },

  /* ── Bill & Payment / สิทธิ์ทดลอง / สถิติ ──────────────── */

  async meProfile(token): Promise<MeProfile> {
    const account = accountByEmail(emailFromToken(token))
    const meta = readJSON<Record<string, { name?: string; phone?: string }>>(PROFILE_META_KEY, {})[account.email] ?? {}
    const registered = registeredAccounts().find((a) => a.email === account.email)
    return {
      ...toSessionUser({ ...account, name: meta.name ?? account.name }),
      phone: meta.phone ?? '',
      provider: 'email',
      createdAt: registered?.createdAt ?? '2026-08-01T09:00:00.000Z',
      lastLoginAt: new Date().toISOString(),
    }
  },

  async updateMe(token, input): Promise<MeProfile> {
    const email = emailFromToken(token)
    const all = readJSON<Record<string, { name?: string; phone?: string }>>(PROFILE_META_KEY, {})
    all[email] = { ...all[email], ...(input.name ? { name: input.name.trim() } : {}), ...(input.phone !== undefined ? { phone: input.phone.trim() } : {}) }
    writeJSON(PROFILE_META_KEY, all)
    // บัญชีที่สมัครเองเปลี่ยนชื่อได้จริง (บัญชีทดลองเก็บเป็น override)
    if (input.name) {
      const accounts = registeredAccounts()
      const mine = accounts.find((a) => a.email === email)
      if (mine) {
        mine.name = input.name.trim()
        writeJSON(ACCOUNTS_KEY, accounts)
      }
    }
    return this.meProfile(token)
  },

  async listMyPayments(token, organizationId): Promise<PaymentRecord[]> {
    const email = emailFromToken(token)
    const mine = paymentsOf(email, ordersFor(email))
    if (!organizationId) return mine
    // องค์กรเดียวกัน (บัญชีทดลอง owner + HR) เห็นใบเสร็จร่วมกัน
    const account = findAccount(email)
    const peers = [...MOCK_ACCOUNTS, ...registeredAccounts()]
      .filter((a) => a.side === 'employer' && a.email !== email)
      .filter((a) => ('organizationName' in a ? a.organizationName : DEMO_ORG_NAME) === (account?.organizationName ?? DEMO_ORG_NAME))
    const extra = peers.flatMap((a) => paymentsOf(a.email, ordersFor(a.email)))
    return [...mine, ...extra].sort((a, b) => b.paidAt.localeCompare(a.paidAt))
  },

  async listMyCredits(token): Promise<UserCredit[]> {
    const email = emailFromToken(token)
    return readCredits().filter((c) => c.userId === email)
  },

  async redeemAccessCode(code, anonId, token): Promise<RedeemAccessCodeResult> {
    const normalized = normalizeCode(code)
    const rows = readAccessCodes()
    const row = rows.find((r) => r.code === normalized)
    if (!row) return { ok: false, status: 'not_found', reason: 'ไม่พบรหัสนี้ในระบบ — ตรวจตัวสะกดอีกครั้ง' }
    if (row.revokedAt) return { ok: false, status: 'revoked', reason: 'รหัสนี้ถูกยกเลิกแล้ว' }
    if (row.expiresAt && new Date(row.expiresAt) < new Date()) {
      return { ok: false, status: 'expired', reason: 'รหัสนี้หมดอายุแล้ว' }
    }
    if (row.maxUses > 0 && row.usedCount >= row.maxUses) {
      return { ok: false, status: 'exhausted', reason: 'รหัสนี้ใช้ครบจำนวนที่กำหนดไว้แล้ว' }
    }

    row.usedCount += 1
    writeJSON(ACCESS_CODES_KEY, rows)
    writeJSON(REDEMPTIONS_KEY, [
      ...readJSON<StoredRedemption[]>(REDEMPTIONS_KEY, []).slice(-499),
      { code: row.code, anonId, at: new Date().toISOString() },
    ])
    void token
    return {
      ok: true,
      status: 'ok',
      code: row.code,
      prefix: row.prefix,
      label: row.label,
      usedCount: row.usedCount,
      maxUses: row.maxUses,
    }
  },

  async adminListAccessCodes(token, prefix): Promise<AccessCodeRow[]> {
    requireAdmin(token)
    const rows = readAccessCodes()
    const p = prefix ? normalizeCode(prefix) : ''
    return rows.filter((r) => !p || r.prefix === p)
  },

  async adminIssueAccessCodes(token, input): Promise<AccessCodeRow[]> {
    requireAdmin(token)
    const prefix = normalizeCode(input.prefix)
    if (!prefix) throw new ClientError('ต้องระบุ prefix ของกลุ่ม')
    const rows = readAccessCodes()
    const maxSeq = rows.filter((r) => r.prefix === prefix).reduce((m, r) => Math.max(m, r.seq), 0)
    const maxId = rows.reduce((m, r) => Math.max(m, r.id), 0)
    const now = new Date().toISOString()

    const created: StoredAccessCode[] = Array.from({ length: input.count }, (_, i) => ({
      id: maxId + i + 1,
      code: `${prefix}-${String(maxSeq + i + 1).padStart(2, '0')}`,
      prefix,
      seq: maxSeq + i + 1,
      label: input.labels?.[i]?.trim() ?? '',
      maxUses: input.maxUses ?? 0,
      usedCount: 0,
      expiresAt: input.expiresAt ? `${input.expiresAt}T23:59:59.000Z` : null,
      revokedAt: null,
      createdAt: now,
    }))
    writeJSON(ACCESS_CODES_KEY, [...rows, ...created])
    return created
  },

  async adminRevokeAccessCode(token, id): Promise<void> {
    requireAdmin(token)
    const rows = readAccessCodes()
    const row = rows.find((r) => r.id === id)
    if (!row) throw new ClientError('ไม่พบรหัสนี้')
    row.revokedAt = new Date().toISOString()
    writeJSON(ACCESS_CODES_KEY, rows)
  },

  async adminAccessCodeTimeline(token, code): Promise<AccessCodeTimeline> {
    requireAdmin(token)
    const normalized = normalizeCode(code)
    return {
      code: normalized,
      redemptions: readJSON<StoredRedemption[]>(REDEMPTIONS_KEY, [])
        .filter((r) => r.code === normalized)
        .map((r) => ({ anonId: r.anonId, at: r.at })),
      events: readEvents()
        .filter((e) => e.code === normalized)
        .map((e) => ({ step: e.step, stepIndex: e.stepIndex, product: e.product, at: e.at })),
    }
  },

  async trackEvent(input, token) {
    let userEmail: string | null = null
    try {
      userEmail = token ? emailFromToken(token) : null
    } catch {
      userEmail = null
    }
    writeJSON(EVENTS_KEY, [
      ...readEvents().slice(-1999),
      {
        anonId: input.anonId,
        userEmail,
        product: input.product,
        step: input.step,
        stepIndex: input.stepIndex,
        code: input.code ? normalizeCode(input.code) : '',
        at: new Date().toISOString(),
      },
    ])
  },

  async adminStats(token, granularity): Promise<AdminStats> {
    requireAdmin(token)
    const keys = bucketKeys(granularity)
    const series = keys.map((k) => synthBucket(k, granularity))
    realBucketsInto(series, granularity)
    const monthKey = bucketKey(new Date(), 'month')
    const thisMonth = synthBucket(monthKey, 'month')
    realBucketsInto([thisMonth], 'month')
    return {
      granularity,
      from: keys[0],
      to: keys[keys.length - 1],
      series,
      thisMonth,
      funnel: funnelFromEvents(),
      dropoffs: dropoffsFromEvents(),
    }
  },

  async adminListPayments(token, filter): Promise<PaymentRecord[]> {
    requireAdmin(token)
    const q = filter?.search?.trim().toLowerCase() ?? ''
    return allPayments().filter(
      (p) =>
        (!filter?.product || p.product === filter.product) &&
        (!filter?.status || p.status === filter.status) &&
        (!q || p.receiptNo.toLowerCase().includes(q) || p.customerEmail.toLowerCase().includes(q) || p.orderCode.toLowerCase().includes(q)),
    )
  },

  async adminRefundPayment(token, id, input) {
    const me = requireAdmin(token)
    const payment = allPayments().find((p) => p.id === id)
    if (!payment) throw new ClientError('ไม่พบรายการชำระเงินนี้', 404)
    if (payment.status === 'refunded') throw new ClientError('รายการนี้คืนเงินเต็มจำนวนไปแล้ว', 409)
    const remaining = payment.amount - payment.refundAmount
    const amount = !input.amount || input.amount <= 0 || input.amount > remaining ? remaining : input.amount
    writeJSON(REFUNDS_KEY, {
      ...readRefunds(),
      [payment.orderCode]: { amount: payment.refundAmount + amount, reason: input.reason, by: me.name, at: new Date().toISOString() },
    })
  },

  async adminListCredits(token, userId): Promise<UserCredit[]> {
    requireAdmin(token)
    return readCredits()
      .filter((c) => !userId || c.userId === userId)
      .map((c) => ({ ...c, userEmail: c.userId, userName: findAccount(c.userId)?.name ?? mockUsers().find((u) => u.id === c.userId)?.name ?? '' }))
  },

  async adminGrantCredit(token, userId, input) {
    const me = requireAdmin(token)
    if (!mockUsers().some((u) => u.id === userId)) throw new ClientError('ไม่พบผู้ใช้นี้', 404)
    const qty = Math.min(10, Math.max(1, input.quantity ?? 1))
    const expiresAt = input.expiresDays ? new Date(Date.now() + input.expiresDays * 86_400_000).toISOString() : null
    const fresh: StoredCredit[] = Array.from({ length: qty }, () => ({
      id: nextId('cr'),
      userId,
      product: input.product ?? 'any',
      depth: input.depth ?? '',
      note: input.note ?? '',
      grantedBy: me.name,
      status: 'available',
      usedOrderId: null,
      usedAt: null,
      expiresAt,
      createdAt: new Date().toISOString(),
    }))
    writeJSON(CREDITS_KEY, [...fresh, ...readCredits()])
  },

  async adminRevokeCredit(token, id) {
    requireAdmin(token)
    const credits = readCredits()
    const target = credits.find((c) => c.id === id)
    if (!target) throw new ClientError('ไม่พบสิทธิ์นี้', 404)
    if (target.status === 'used') throw new ClientError('สิทธิ์นี้ถูกใช้ไปแล้ว ยกเลิกไม่ได้', 409)
    target.status = 'revoked'
    writeJSON(CREDITS_KEY, credits)
  },
}
