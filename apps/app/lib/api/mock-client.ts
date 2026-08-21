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
  type AdminLegalDoc,
  type AdminOrder,
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
} from './types'

const ORDERS_KEY = 'minghe:mock:orders'
const ACCOUNTS_KEY = 'minghe:mock:accounts'
const PASSWORDS_KEY = 'minghe:mock:passwords'
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

export const mockClient: MingheClient = {
  mode: 'mock',

  async mockAccounts() {
    return MOCK_ACCOUNTS
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

  async loginWithGoogle(): Promise<AuthResult> {
    throw new ClientError('การเข้าสู่ระบบด้วย Google ยังไม่เปิดใช้งาน', 501)
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
    const order: OrderRecord = {
      id: code,
      code,
      product: draft.product,
      status: 'ready',
      subjectName: draft.input.subject.name,
      orgLabel: draft.orgLabel,
      total: draft.total,
      express: draft.express ?? false,
      createdAt: new Date().toISOString(),
      input: draft.input,
    }

    const book = readOrders()
    book[email] = [order, ...ordersFor(email)]
    writeJSON(ORDERS_KEY, book)
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
}
