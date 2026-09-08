'use client'

/**
 * หน้ากรอกรหัสเข้าใช้ — ทางเข้าที่สองของผู้ทดสอบ UAT
 * (ทางแรกคือลิงก์ `?code=…` ที่แจกทางไลน์ ซึ่ง AccessCodeCapture รับให้อัตโนมัติ)
 *
 * รหัสถูกตรวจกับเซิร์ฟเวอร์ทันทีที่กด เพื่อให้ผู้ทดสอบรู้ตั้งแต่ต้นว่ารหัสใช้ได้จริง
 * ไม่ใช่ไปเจอปัญหาเอาตอนจะเปิดรายงาน
 */

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { client } from '@/lib/api'
import { clearUatCode, looksLikeUatCode, readUatCode, saveUatCode } from '@/lib/access-code'
import { anonId } from '@/lib/track'
import { Field, TextInput } from '@/components/fields'
import { ElementIcon } from '@/components/element-icon'

export default function AccessPage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [saved, setSaved] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const existing = readUatCode()
    if (existing) {
      setSaved(existing)
      setCode(existing)
    }
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const value = code.trim().toUpperCase()
    setError('')

    if (!looksLikeUatCode(value)) {
      setError('รูปแบบรหัสไม่ถูกต้อง — ตัวอย่าง G1S1-2026-07')
      return
    }

    setBusy(true)
    try {
      const result = await client.redeemAccessCode(value, anonId())
      if (!result.ok) {
        setError(result.reason ?? 'รหัสนี้ใช้ไม่ได้')
        return
      }
      saveUatCode(value)
      setSaved(value)
      router.push('/')
    } catch {
      setError('ตรวจรหัสไม่สำเร็จ — ลองใหม่อีกครั้ง')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="py-14 md:py-20">
      <div className="container-page mx-auto max-w-md">
        <div className="rounded-[28px] border border-line bg-card p-8 shadow-card">
          <div className="flex justify-center gap-2">
            {(['wood', 'fire', 'earth', 'metal', 'water'] as const).map((e) => (
              <ElementIcon key={e} element={e} size={16} />
            ))}
          </div>
          <h1 className="mt-5 text-center font-display-th text-2xl text-ink">รหัสเข้าใช้</h1>
          <p className="mt-3 text-center text-sm text-ink-soft">
            กรอกรหัสที่ทีมงานส่งให้ เพื่อเข้าร่วมรอบทดสอบ — รหัสนี้ใช้แทนการชำระเงินในรอบนี้
          </p>

          {saved && (
            <div className="mt-5 rounded-lg border border-jade/40 bg-jade/[0.06] p-4 text-sm">
              <div className="text-ink">
                รหัสที่ใช้อยู่ตอนนี้: <span className="font-medium">{saved}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  clearUatCode()
                  setSaved(null)
                  setCode('')
                }}
                className="mt-2 text-xs text-muted underline hover:text-ink"
              >
                ใช้รหัสอื่นแทน
              </button>
            </div>
          )}

          <form onSubmit={submit} className="mt-6 space-y-4">
            <Field label="รหัสเข้าใช้" hint="ตัวอย่าง G1S1-2026-07 — พิมพ์เล็กหรือใหญ่ก็ได้">
              <TextInput
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="G1S1-2026-07"
                autoComplete="off"
                spellCheck={false}
              />
            </Field>

            {error && (
              <p className="rounded-lg border border-terracotta/40 bg-terracotta/[0.06] px-3 py-2 text-sm text-terracotta">
                {error}
              </p>
            )}

            <button type="submit" disabled={busy} className="btn-primary w-full disabled:opacity-60">
              {busy ? 'กำลังตรวจรหัส…' : 'ยืนยันรหัส'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-muted">
            ยังไม่มีรหัส?{' '}
            <a href="mailto:info@minghe.work" className="text-gold hover:underline">
              ติดต่อทีมงาน
            </a>{' '}
            ·{' '}
            <Link href="/" className="text-gold hover:underline">
              กลับหน้าแรก
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
