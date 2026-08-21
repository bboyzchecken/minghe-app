import Link from 'next/link'

export const metadata = { title: 'เข้าสู่ระบบ' }

/**
 * หน้าเข้าสู่ระบบ — mockup UI เท่านั้น (ยังไม่ต่อ backend)
 *
 * สร้างขึ้นเพื่อรองรับ F-04 (ปุ่ม "เข้าสู่ระบบ" มุมขวาบน) และแสดงโครง F-02
 * (ล็อกอินด้วยอีเมล + Google) ให้ตรวจ user process ตาม Note ข้อ 1
 * การทำงานจริงรออยู่ที่ POST /auth/login และ /auth/google ในฝั่ง API
 */
export default function LoginPage() {
  return (
    <div className="container-page max-w-md py-16 md:py-24">
      <div className="text-center">
        <span className="cjk text-2xl text-gold">命合</span>
        <h1 className="mt-2 text-3xl">เข้าสู่ระบบ</h1>
        <p className="mt-2 text-sm text-ink-soft">
          เข้าเพื่อดูรายงานที่เคยสร้าง และข้อมูลที่ระบบจำไว้ให้
        </p>
      </div>

      <div className="card mt-8 p-6 md:p-8">
        <div className="rounded-lg border border-dashed border-gold/40 bg-gold/[0.05] px-4 py-3 text-xs text-ink-soft">
          เวอร์ชันสาธิต — หน้านี้ยังไม่เชื่อมระบบสมาชิกจริง ใช้เพื่อตรวจโฟลว์การใช้งาน
        </div>

        <button
          type="button"
          disabled
          className="mt-5 flex w-full items-center justify-center gap-3 rounded-lg border border-line bg-cloud px-4 py-3 text-sm font-medium text-ink transition hover:border-gold/40 disabled:opacity-60"
        >
          <GoogleMark />
          เข้าสู่ระบบด้วย Google
        </button>

        <div className="my-5 flex items-center gap-3 text-xs text-muted">
          <span className="h-px flex-1 bg-line" />
          หรือใช้อีเมล
          <span className="h-px flex-1 bg-line" />
        </div>

        <label className="block">
          <span className="field-label">อีเมล</span>
          <input type="email" className="field" placeholder="you@example.com" disabled />
        </label>
        <label className="mt-4 block">
          <span className="field-label">รหัสผ่าน</span>
          <input type="password" className="field" placeholder="••••••••" disabled />
        </label>

        <button type="button" disabled className="btn-primary mt-6 w-full py-3 disabled:opacity-60">
          เข้าสู่ระบบ
        </button>

        <p className="mt-5 text-center text-sm text-ink-soft">
          ยังไม่มีบัญชี?{' '}
          <span className="font-medium text-gold">สมัครสมาชิก</span>
          {' · '}
          <Link href="/r" className="font-medium text-gold hover:underline">
            เปิดรายงานด้วยรหัส
          </Link>
        </p>
      </div>

      <p className="mt-6 text-center text-xs text-muted">
        การเข้าสู่ระบบถือว่ายอมรับ{' '}
        <Link href="/legal/terms" className="text-gold hover:underline">เงื่อนไขการใช้งาน</Link> และ{' '}
        <Link href="/legal/privacy" className="text-gold hover:underline">นโยบายความเป็นส่วนตัว</Link>
      </p>
    </div>
  )
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}
