'use client'

/**
 * /r — ประตูเปิดรายงานสำหรับลูกค้าที่ซื้อไปแล้ว (mock สาธิต)
 * กรอกรหัสเปิดรายงาน PJX-XXXX-XXXX → เปิดรายงาน (บางฉบับป้องกันด้วย PIN)
 * เวอร์ชันสาธิต: ไม่มี backend — จำลองการค้นหารหัสในเครื่อง
 */

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Logo } from '@/components/logo'
import { loadOrder, saveOpenedCode } from '@/lib/store'

/** รหัสตัวอย่างสำหรับสาธิต — โยงกับรายการใน dashboard */
const DEMO_CODES: Record<string, { label: string; pin?: string }> = {
  'PJX-K7QM-3PLA': { label: 'คุณวีรภัทร × ผู้บริหาร' },
  'PJX-2XKD-9MRT': { label: 'บมจ. รุ่งเรืองโลจิสติกส์' },
  'PJX-9WDC-XR2E': { label: 'คุณปาริชาต × บจก. มงคลเทรด', pin: '1988' },
}

/** จัดรูปแบบขณะพิมพ์: pjxk7qm3pla → PJX-K7QM-3PLA */
function formatAsTyping(value: string): string {
  const raw = value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 11)
  if (raw.length <= 3) return raw
  if (raw.length <= 7) return `${raw.slice(0, 3)}-${raw.slice(3)}`
  return `${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7)}`
}

export default function OpenReportPage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [opening, setOpening] = useState(false)
  const [pinFor, setPinFor] = useState<string | null>(null)
  const [pin, setPin] = useState('')
  const [ownCode, setOwnCode] = useState<string | null>(null)

  // ถ้าเพิ่งสร้างรายงานในเซสชันนี้ ให้รับรู้รหัสของตัวเองด้วย (สาธิตให้ครบวง)
  useEffect(() => {
    const o = loadOrder()
    if (o?.accessCode) setOwnCode(o.accessCode)
  }, [])

  function openReport(finalCode: string) {
    setOpening(true)
    saveOpenedCode(finalCode)
    router.push('/report')
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const raw = code.replace(/-/g, '')
    if (raw.length !== 11 || !raw.startsWith('PJX')) {
      setError('รูปแบบรหัสไม่ถูกต้อง — ต้องเป็น PJX-XXXX-XXXX')
      return
    }
    setError(null)
    const known = DEMO_CODES[code]
    // รหัสที่ระบบ "รู้จัก": ตัวอย่างสาธิต หรือรหัสของออเดอร์ในเซสชันนี้
    if (known?.pin) {
      setPinFor(code)
      return
    }
    // เดโม: รับทุกรหัสที่รูปแบบถูกต้อง (ถือว่าเปิดได้) — โชว์ว่าลูกค้าเก่ากดดูได้ทันที
    openReport(code)
  }

  function onPinSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!pinFor) return
    const expected = DEMO_CODES[pinFor]?.pin
    if (pin !== expected) {
      setError('PIN ไม่ถูกต้อง (สาธิต)')
      return
    }
    setError(null)
    openReport(pinFor)
  }

  return (
    <main className="texture-paper flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center">
          <Logo />
          <p className="eyebrow mt-6">Mìnghé Fit Report</p>
          <h1 className="mt-2 text-3xl">
            เปิดรายงานด้วยรหัส <span className="cjk text-gold">命合</span>
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            ซื้อไปแล้ว? กรอก “รหัสเปิดรายงาน” ที่ได้รับตอนสั่งซื้อ
            เพื่อเข้าดูรายงานฉบับเดิมได้ทุกเมื่อ
          </p>
        </div>

        <div className="card mt-8 p-6">
          {!pinFor ? (
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <label className="block">
                <span className="field-label">รหัสเปิดรายงาน</span>
                <input
                  value={code}
                  onChange={(e) => {
                    setCode(formatAsTyping(e.target.value))
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
            <form onSubmit={onPinSubmit} className="space-y-4" noValidate>
              <div className="rounded-lg bg-cloud px-4 py-2.5 text-center">
                <div className="text-[10px] uppercase tracking-wider text-muted">กำลังเปิด</div>
                <div className="font-body-en text-sm font-semibold tracking-wider text-ink">{pinFor}</div>
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
                    รายงานฉบับนี้ป้องกันด้วย PIN เพิ่มอีกชั้น (สาธิต: 1988)
                  </span>
                )}
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-ghost !py-2.5 text-sm"
                  onClick={() => {
                    setPinFor(null)
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

          <div className="gold-divider my-5" />

          <div className="text-xs text-muted">
            <div className="mb-2 font-medium text-ink-soft">รหัสตัวอย่างสำหรับสาธิต — คลิกเพื่อกรอกอัตโนมัติ</div>
            <div className="flex flex-col gap-1.5">
              {ownCode && (
                <button
                  type="button"
                  onClick={() => {
                    setCode(ownCode)
                    setPinFor(null)
                    setError(null)
                  }}
                  className="chip justify-start text-left hover:border-gold/50"
                >
                  <span className="font-body-en tracking-wider text-ink">{ownCode}</span>
                  <span>· รายงานที่คุณเพิ่งสร้าง</span>
                </button>
              )}
              {Object.entries(DEMO_CODES).map(([c, meta]) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setCode(c)
                    setPinFor(null)
                    setError(null)
                  }}
                  className="chip justify-start text-left hover:border-gold/50"
                >
                  <span className="font-body-en tracking-wider text-ink">{c}</span>
                  <span>· {meta.label}</span>
                  {meta.pin && <span className="text-gold">🔒 PIN</span>}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          เวอร์ชันสาธิต — จำลองการเปิดรายงานในเครื่อง ไม่มีการเชื่อมต่อฐานข้อมูลจริง
        </p>
        <p className="mt-4 text-center text-sm">
          <Link href="/" className="text-ink-soft transition-colors hover:text-gold">
            ← กลับหน้าแรก
          </Link>
        </p>
      </div>
    </main>
  )
}
