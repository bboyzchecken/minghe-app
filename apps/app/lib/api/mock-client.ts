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
} from './types'

const ORDERS_KEY = 'minghe:mock:orders'
const MEMBERS_KEY = 'minghe:mock:orgMembers'
const INVITES_KEY = 'minghe:mock:orgInvites'
const PROFILES_KEY = 'minghe:mock:profiles'
const TEAMS_KEY = 'minghe:mock:teams'
const TEAM_MEMBERS_KEY = 'minghe:mock:teamMembers'
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
}
