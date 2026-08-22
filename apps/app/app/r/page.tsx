'use client'

/**
 * /r — ประตูเปิดรายงานสำหรับลูกค้าที่ซื้อไปแล้ว
 *
 * ไม่ต้องล็อกอิน: กรอกรหัส PJX-XXXX-XXXX (บางฉบับมี PIN เพิ่มอีกชั้น)
 * โหมด mock ค้นในเบราว์เซอร์ · โหมด live ยิงไปที่ POST /r
 */

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Logo } from '@/components/logo'
import { formatAccessCode } from '@/lib/access-code'
import { IS_MOCK } from '@/lib/env'
import { useOpenReportByCode } from '@/lib/queries'
import { saveCurrentOrder } from '@/lib/store'

export default function OpenReportPage() {
  const router = useRouter()
  const openReport = useOpenReportByCode()
  const [code, setCode] = useState('')
  const [pin, setPin] = useState('')
  const [needsPin, setNeedsPin] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function open(finalCode: string, finalPin?: string) {
    setError(null)
    try {
      const order = await openReport.mutateAsync({ code: finalCode, pin: finalPin })
      saveCurrentOrder(order)
      router.push('/report')
    } catch (e) {
      const message = e instanceof Error ? e.message : 'เปิดรายงานไม่สำเร็จ'
      // รายงานที่ล็อกด้วย PIN จะแจ้งกลับมาแบบนี้ — เปลี่ยนไปหน้ากรอก PIN แทนการฟ้อง error
      if (message.includes('PIN') && !needsPin) {
        setNeedsPin(true)
        setError(null)
      } else {
        setError(message)
      }
    }
  }

  const opening = openReport.isPending

  return (
    <main className="texture-paper flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center">
          <Logo variant="lockup" height={46} />
          <p className="eyebrow mt-6">Mìnghé Fit Report</p>
          <h1 className="mt-2 text-3xl">
            เปิดรายงานด้วยรหัส <span className="cjk text-gold">命合</span>
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            ซื้อไปแล้ว? กรอก “รหัสเปิดรายงาน” ที่ได้รับตอนสั่งซื้อ เพื่อเข้าดูรายงานฉบับเดิมได้ทุกเมื่อ
          </p>
        </div>

        <div className="card mt-8 p-6">
          {!needsPin ? (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const raw = code.replace(/-/g, '')
                if (raw.length !== 11 || !raw.startsWith('PJX')) {
                  setError('รูปแบบรหัสไม่ถูกต้อง — ต้องเป็น PJX-XXXX-XXXX')
                  return
                }
                void open(code)
              }}
              className="space-y-4"
              noValidate
            >
              <label className="block">
                <span className="field-label">รหัสเปิดรายงาน</span>
                <input
                  value={code}
                  onChange={(e) => {
                    setCode(formatAccessCode(e.target.value))
                    if (error) setError(null)
                  }}
                  placeholder="PJX-XXXX-XXXX"
                  className="field text-center font-body-en text-lg tracking-[0.18em]"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  maxLength={13}
                  autoFocus
                  aria-invalid={error ? true : undefined}
                />
                {error ? (
                  <span className="mt-1.5 block text-xs font-semibold text-el-fire">{error}</span>
                ) : (
                  <span className="mt-1.5 block text-xs text-muted">
                    พิมพ์ได้เลยไม่ต้องใส่ขีด — ระบบจัดรูปแบบให้อัตโนมัติ
                  </span>
                )}
              </label>
              <button type="submit" className="btn-primary w-full" disabled={opening}>
                {opening ? 'กำลังเปิดรายงาน…' : 'เปิดรายงาน'}
              </button>
            </form>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                void open(code, pin)
              }}
              className="space-y-4"
              noValidate
            >
              <div className="rounded-lg bg-cloud px-4 py-2.5 text-center">
                <div className="text-[10px] uppercase tracking-wider text-muted">กำลังเปิด</div>
                <div className="font-body-en text-sm font-semibold tracking-wider text-ink">{code}</div>
              </div>
              <label className="block">
                <span className="field-label">กรอก PIN เพื่อยืนยัน</span>
                <input
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value.replace(/\D/g, '').slice(0, 6))
                    if (error) setError(null)
                  }}
                  type="password"
                  inputMode="numeric"
                  placeholder="••••"
                  className="field text-center font-body-en text-lg tracking-[0.4em]"
                  autoComplete="off"
                  maxLength={6}
                  autoFocus
                  aria-invalid={error ? true : undefined}
                />
                {error ? (
                  <span className="mt-1.5 block text-xs font-semibold text-el-fire">{error}</span>
                ) : (
                  <span className="mt-1.5 block text-xs text-muted">
                    รายงานฉบับนี้ป้องกันด้วย PIN เพิ่มอีกชั้น
                  </span>
                )}
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-ghost !py-2.5 text-sm"
                  onClick={() => {
                    setNeedsPin(false)
                    setPin('')
                    setError(null)
                  }}
                >
                  ← ย้อนกลับ
                </button>
                <button type="submit" className="btn-primary flex-1 !py-2.5" disabled={opening}>
                  {opening ? 'กำลังเปิด…' : 'เปิดรายงาน'}
                </button>
              </div>
            </form>
          )}

          {IS_MOCK && (
            <>
              <div className="gold-divider my-5" />
              <div className="text-xs text-muted">
                <div className="mb-2 font-medium text-ink-soft">
                  โหมดสาธิต — รหัสตัวอย่าง คลิกเพื่อกรอกอัตโนมัติ
                </div>
                <div className="flex flex-col gap-1.5">
                  {MOCK_CODES.map((sample) => (
                    <button
                      key={sample.code}
                      type="button"
                      onClick={() => {
                        setCode(sample.code)
                        setNeedsPin(false)
                        setError(null)
                      }}
                      className="chip justify-start text-left hover:border-gold/50"
                    >
                      <span className="font-body-en tracking-wider text-ink">{sample.code}</span>
                      <span>· {sample.label}</span>
                      {sample.pin && <span className="text-gold">🔒 PIN {sample.pin}</span>}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <p className="mt-4 text-center text-sm">
          <Link href="/" className="text-ink-soft transition-colors hover:text-gold">
            ← กลับหน้าแรก
          </Link>
        </p>
      </div>
    </main>
  )
}

/** ตรงกับประวัติตัวอย่างใน lib/api/mock-client.ts — แสดงเฉพาะโหมด mock */
const MOCK_CODES = [
  { code: 'PJX-K7QM-3PLA', label: 'คุณวีรภัทร × ผู้บริหาร' },
  { code: 'PJX-2XKD-9MRT', label: 'บมจ. รุ่งเรืองโลจิสติกส์' },
  { code: 'PJX-9WDC-XR2E', label: 'คุณปาริชาต × บจก. มงคลเทรด', pin: '1988' },
]
