'use client'

/**
 * Wizard สร้างออเดอร์ 5 ขั้น (แผนหัวข้อ 5.3)
 * 1) ข้อมูลผู้ถูกวิเคราะห์  2) ฝ่ายองค์กร  3) บริการเสริม
 * 4) ตรวจทาน+ราคา         5) ชำระ+ประมวลผล → รหัสเปิด
 *
 * ความแม่นเริ่มที่นี่: เวลาเกิด "บังคับ" + อธิบายเหตุผล / consent PDPA บังคับ
 * รูปถ่าย optional (โหงวเฮ้ง) — อ่านเป็น data URL, จำกัด 1.5MB
 */

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { INDUSTRIES, THAI_PROVINCES, type ElementKey } from '@minghe/core'
import {
  Button,
  FieldHint,
  Input,
  Label,
  Notice,
  Select,
  Seal,
} from '@/components/ui'
import { ADDONS, SINGLE_REPORT_PRICE_SATANG } from '@/lib/pricing'
import { formatBaht } from '@/lib/utils'

const ELEMENT_TH: Record<ElementKey, string> = {
  wood: 'ไม้ (木)',
  fire: 'ไฟ (火)',
  earth: 'ดิน (土)',
  metal: 'ทอง (金)',
  water: 'น้ำ (水)',
}
const ELEMENT_ORDER: ElementKey[] = ['wood', 'fire', 'earth', 'metal', 'water']

type OrgMode = 'executive' | 'company-date' | 'industry'
interface TeamRow {
  name: string
  birthDate: string
  birthTime: string
}

const STEP_LABELS = ['ผู้ถูกวิเคราะห์', 'ฝ่ายองค์กร', 'บริการเสริม', 'ตรวจทาน', 'ชำระเงิน']

export function OrderWizard({
  isLoggedIn,
  credits,
  userEmail,
}: {
  isLoggedIn: boolean
  credits: number
  userEmail: string | null
}) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [error, setError] = useState<string | null>(null)

  // ---- ขั้น 1: ผู้ถูกวิเคราะห์ ----
  const [name, setName] = useState('')
  const [gender, setGender] = useState<'male' | 'female' | ''>('')
  const [birthDate, setBirthDate] = useState('')
  const [birthTime, setBirthTime] = useState('')
  const [province, setProvince] = useState('')
  const [photoDataUrl, setPhotoDataUrl] = useState<string | undefined>()
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [consent, setConsent] = useState(false)

  // ---- ขั้น 2: องค์กร ----
  const [orgMode, setOrgMode] = useState<OrgMode>('executive')
  const [execName, setExecName] = useState('')
  const [execBirthDate, setExecBirthDate] = useState('')
  const [execBirthTime, setExecBirthTime] = useState('')
  const [execProvince, setExecProvince] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [foundingDate, setFoundingDate] = useState('')
  const [industryId, setIndustryId] = useState('')
  const [team, setTeam] = useState<TeamRow[]>([])

  // ---- ขั้น 3: บริการเสริม + PIN ----
  const [addonIds, setAddonIds] = useState<string[]>([])
  const [pin, setPin] = useState('')

  // ---- ขั้น 4: ชำระ ----
  const [useCredit, setUseCredit] = useState(isLoggedIn && credits > 0)
  const [guestEmail, setGuestEmail] = useState(userEmail ?? '')

  // ---- ขั้น 5: ผล ----
  const [submitting, setSubmitting] = useState(false)
  const [accessCode, setAccessCode] = useState<string | null>(null)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const addonTotal = useMemo(
    () => addonIds.reduce((s, id) => s + (ADDONS.find((a) => a.id === id)?.priceSatang ?? 0), 0),
    [addonIds],
  )
  const reportPrice = useCredit && isLoggedIn ? 0 : SINGLE_REPORT_PRICE_SATANG
  const total = reportPrice + addonTotal

  const industriesByElement = useMemo(
    () =>
      ELEMENT_ORDER.map((el) => ({
        element: el,
        items: INDUSTRIES.filter((i) => i.element === el),
      })),
    [],
  )

  function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPhotoError(null)
    const file = e.target.files?.[0]
    if (!file) {
      setPhotoDataUrl(undefined)
      return
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setPhotoError('รองรับเฉพาะไฟล์ JPEG, PNG หรือ WebP')
      return
    }
    if (file.size > 1.5 * 1024 * 1024) {
      setPhotoError('ไฟล์ใหญ่เกินไป (จำกัด 1.5MB) — โปรดย่อรูปก่อนอัปโหลด')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setPhotoDataUrl(reader.result as string)
    reader.onerror = () => setPhotoError('อ่านไฟล์ไม่สำเร็จ โปรดลองใหม่')
    reader.readAsDataURL(file)
  }

  function validateStep1(): string | null {
    if (!name.trim()) return 'กรุณาระบุชื่อผู้ถูกวิเคราะห์'
    if (!birthDate) return 'กรุณาระบุวันเกิด'
    if (!birthTime) return 'กรุณาระบุเวลาเกิด — เป็นข้อมูลสำคัญที่สุดต่อความแม่นยำของผังปาจือ'
    if (!consent) return 'กรุณายืนยันความยินยอมของเจ้าของข้อมูล (PDPA) ก่อนดำเนินการต่อ'
    return null
  }

  function validateStep2(): string | null {
    if (orgMode === 'executive') {
      if (!execBirthDate) return 'กรุณาระบุวันเกิดของผู้บริหาร'
      if (!execBirthTime) return 'กรุณาระบุเวลาเกิดของผู้บริหาร'
    } else if (orgMode === 'company-date') {
      if (!foundingDate) return 'กรุณาระบุวันก่อตั้งบริษัท'
    } else if (orgMode === 'industry') {
      if (!industryId) return 'กรุณาเลือกสายอุตสาหกรรม'
    }
    for (const m of team) {
      if (m.name.trim() && !m.birthDate) return `สมาชิกทีม "${m.name}" ยังไม่ได้ระบุวันเกิด`
    }
    return null
  }

  function next() {
    setError(null)
    if (step === 1) {
      const e = validateStep1()
      if (e) return setError(e)
    }
    if (step === 2) {
      const e = validateStep2()
      if (e) return setError(e)
    }
    if (step === 3 && pin && !/^\d{4,6}$/.test(pin)) {
      return setError('PIN ต้องเป็นตัวเลข 4-6 หลัก (หรือเว้นว่างไว้)')
    }
    if (step === 4 && !isLoggedIn) {
      // ช่องอีเมล guest อยู่ที่ step 4 เท่านั้น — ต้องตรวจก่อนออกจากขั้นนี้
      // ไม่งั้นจะไปติดที่ step 5 ที่ไม่มีช่องให้แก้
      if (!guestEmail.trim()) {
        return setError('กรุณาระบุอีเมลติดต่อสำหรับการสั่งซื้อแบบไม่มีบัญชี')
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail.trim())) {
        return setError('รูปแบบอีเมลไม่ถูกต้อง')
      }
    }
    setStep((s) => Math.min(5, s + 1))
  }
  function back() {
    setError(null)
    setStep((s) => Math.max(1, s - 1))
  }

  function buildOrgPayload() {
    const cleanTeam = team
      .filter((m) => m.name.trim() && m.birthDate)
      .map((m) => ({
        name: m.name.trim(),
        birthDate: m.birthDate,
        ...(m.birthTime ? { birthTime: m.birthTime } : {}),
      }))
    if (orgMode === 'executive') {
      return {
        mode: 'executive' as const,
        ...(execName.trim() ? { executiveName: execName.trim() } : {}),
        birthDate: execBirthDate,
        birthTime: execBirthTime,
        ...(execProvince ? { province: execProvince } : {}),
        ...(cleanTeam.length ? { team: cleanTeam } : {}),
      }
    }
    if (orgMode === 'company-date') {
      return {
        mode: 'company-date' as const,
        ...(companyName.trim() ? { companyName: companyName.trim() } : {}),
        foundingDate,
        ...(cleanTeam.length ? { team: cleanTeam } : {}),
      }
    }
    return {
      mode: 'industry' as const,
      industryId,
      ...(companyName.trim() ? { companyName: companyName.trim() } : {}),
      ...(cleanTeam.length ? { team: cleanTeam } : {}),
    }
  }

  async function submit() {
    setError(null)
    if (!isLoggedIn && !guestEmail.trim()) {
      return setError('กรุณาระบุอีเมลติดต่อสำหรับการสั่งซื้อแบบไม่มีบัญชี')
    }
    setSubmitting(true)
    try {
      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: {
            name: name.trim(),
            ...(gender ? { gender } : {}),
            birthDate,
            birthTime,
            ...(province ? { province } : {}),
            consentConfirmed: true,
          },
          org: buildOrgPayload(),
          addonIds,
          ...(photoDataUrl ? { photoDataUrl } : {}),
          ...(pin ? { pin } : {}),
          ...(!isLoggedIn ? { guestEmail: guestEmail.trim() } : {}),
          useCredit: isLoggedIn ? useCredit : false,
        }),
      })
      const orderJson = (await orderRes.json()) as { orderId?: string; error?: string }
      if (!orderRes.ok || !orderJson.orderId) {
        throw new Error(orderJson.error ?? 'สร้างออเดอร์ไม่สำเร็จ')
      }
      setOrderId(orderJson.orderId)

      const payRes = await fetch(`/api/orders/${orderJson.orderId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: useCredit && isLoggedIn ? 'credits' : 'mock',
          ...(pin ? { pin } : {}),
        }),
      })
      const payJson = (await payRes.json()) as { accessCode?: string; error?: string }
      if (!payRes.ok || !payJson.accessCode) {
        throw new Error(payJson.error ?? 'การชำระเงิน/ประมวลผลไม่สำเร็จ')
      }
      setAccessCode(payJson.accessCode)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด โปรดลองใหม่')
    } finally {
      setSubmitting(false)
    }
  }

  // ---- หน้าผลลัพธ์ (สำเร็จ) ----
  if (accessCode) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <div className="flex justify-center">
          <Seal size={64} />
        </div>
        <h1 className="mt-6 text-2xl font-semibold text-ink">รายงานของคุณพร้อมแล้ว</h1>
        <p className="mt-2 text-sm text-muted">รหัสเปิดรายงาน — เก็บไว้ให้ดี ใช้เปิดดูและพิมพ์ PDF ได้</p>
        <div className="mt-6 rounded-lg border border-gold/40 bg-paper-warm/60 p-6">
          <p className="font-mono text-3xl font-semibold tracking-[0.15em] text-cinnabar">
            {accessCode}
          </p>
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(accessCode)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              } catch {
                /* noop */
              }
            }}
            className="mt-3 text-xs font-semibold text-muted hover:text-cinnabar"
          >
            {copied ? '✓ คัดลอกแล้ว' : 'คัดลอกรหัส'}
          </button>
        </div>
        {pin ? (
          <Notice tone="info" className="mt-4 text-left">
            รายงานนี้ตั้ง PIN ไว้ — โปรดส่ง PIN ให้ผู้รับ <strong>แยกช่องทาง</strong> กับรหัสเปิดรายงาน
            เพื่อความปลอดภัย
          </Notice>
        ) : null}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button href={`/r/${accessCode}`}>เปิดรายงาน</Button>
          {orderId ? (
            <Button variant="outline" href={`/order/${orderId}`}>
              ดูสถานะออเดอร์
            </Button>
          ) : null}
        </div>
        <p className="mt-6 text-sm">
          <Link href={isLoggedIn ? '/dashboard' : '/'} className="text-muted hover:text-cinnabar">
            {isLoggedIn ? 'ไปแดชบอร์ด' : 'กลับหน้าแรก'}
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* progress */}
      <ol className="mb-8 flex items-center justify-between">
        {STEP_LABELS.map((label, i) => {
          const n = i + 1
          const active = step === n
          const done = step > n
          return (
            <li key={label} className="flex flex-1 flex-col items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                  done
                    ? 'bg-cinnabar text-paper'
                    : active
                      ? 'bg-ink text-paper ring-2 ring-gold ring-offset-2'
                      : 'border border-line bg-cloud text-muted'
                }`}
              >
                {done ? '✓' : n}
              </div>
              <span
                className={`mt-1.5 hidden text-[11px] sm:block ${active ? 'font-semibold text-ink' : 'text-muted'}`}
              >
                {label}
              </span>
            </li>
          )
        })}
      </ol>

      {error ? (
        <Notice tone="danger" className="mb-5">
          {error}
        </Notice>
      ) : null}

      {/* ---- STEP 1 ---- */}
      {step === 1 ? (
        <div className="space-y-5">
          <div>
            <h1 className="text-xl font-semibold text-ink">ข้อมูลผู้ถูกวิเคราะห์</h1>
            <p className="mt-1 text-sm text-muted">ข้อมูลนี้ใช้ตั้งผังปาจือ (命盘) — ยิ่งแม่นยิ่งดี</p>
          </div>
          <div>
            <Label htmlFor="name">ชื่อ-นามสกุล *</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น สมชาย ใจดี" />
          </div>
          <div>
            <Label htmlFor="gender">เพศ</Label>
            <Select id="gender" value={gender} onChange={(e) => setGender(e.target.value as 'male' | 'female' | '')}>
              <option value="">ไม่ระบุ</option>
              <option value="male">ชาย</option>
              <option value="female">หญิง</option>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="birthDate">วันเกิด *</Label>
              <Input id="birthDate" type="date" value={birthDate} min="1900-01-01" max="2100-12-31" onChange={(e) => setBirthDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="birthTime">เวลาเกิด *</Label>
              <Input id="birthTime" type="time" value={birthTime} onChange={(e) => setBirthTime(e.target.value)} />
              <FieldHint>บังคับ — เวลาเกิดกำหนด "เสาเวลา" และปรับเวลาสุริยะจริง ต่างกันไม่กี่นาทีเปลี่ยนผลได้</FieldHint>
            </div>
          </div>
          <div>
            <Label htmlFor="province">จังหวัดที่เกิด</Label>
            <Select id="province" value={province} onChange={(e) => setProvince(e.target.value)}>
              <option value="">ไม่ทราบ / เกิดต่างประเทศ (ไม่ปรับเวลาสุริยะจริง)</option>
              {THAI_PROVINCES.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </Select>
            <FieldHint>ใช้คำนวณเวลาสุริยะจริง (真太陽時) ตามลองจิจูด — ในไทยต่างได้ถึง ±30 นาที</FieldHint>
          </div>
          <div>
            <Label htmlFor="photo">รูปถ่ายหน้าตรง (ไม่บังคับ — สำหรับอ่านโหงวเฮ้ง)</Label>
            <input
              id="photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={onPhotoChange}
              className="block w-full text-sm text-ink-soft file:mr-3 file:rounded-sm file:border-0 file:bg-ink file:px-4 file:py-2 file:text-sm file:font-semibold file:text-paper hover:file:bg-ink-soft"
            />
            <FieldHint>หน้าตรง แสงชัด ไม่ใส่แว่นดำ/หมวกบังหน้า · JPEG/PNG/WebP ไม่เกิน 1.5MB</FieldHint>
            {photoError ? <p className="mt-1 text-xs font-semibold text-cinnabar-deep">{photoError}</p> : null}
            {photoDataUrl ? (
              <div className="mt-3 flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoDataUrl} alt="ตัวอย่างรูปที่อัปโหลด" className="h-20 w-20 rounded-md border border-line object-cover" />
                <button onClick={() => setPhotoDataUrl(undefined)} className="text-xs text-muted hover:text-cinnabar">
                  ลบรูป
                </button>
              </div>
            ) : null}
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-md border border-line bg-cloud p-4">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-4 w-4 accent-cinnabar" />
            <span className="text-sm text-ink-soft">
              ข้าพเจ้ายืนยันว่าได้รับความยินยอมจากเจ้าของข้อมูลในการใช้วันเดือนปีเกิด เวลาเกิด และรูปถ่าย
              เพื่อจัดทำรายงานความเหมาะสม ตาม{' '}
              <Link href="/privacy" target="_blank" className="font-semibold text-cinnabar underline">
                นโยบายความเป็นส่วนตัว
              </Link>{' '}
              (PDPA) *
            </span>
          </label>
        </div>
      ) : null}

      {/* ---- STEP 2 ---- */}
      {step === 2 ? (
        <div className="space-y-5">
          <div>
            <h1 className="text-xl font-semibold text-ink">ฝ่ายองค์กรที่จะเทียบความเข้ากัน</h1>
            <p className="mt-1 text-sm text-muted">เลือกสิ่งที่จะนำมา "ดูสมพงษ์" กับผู้ถูกวิเคราะห์</p>
          </div>
          <div className="grid gap-3">
            {([
              { mode: 'executive', label: 'ดวงผู้บริหาร', desc: 'เทียบกับหัวหน้า/เจ้าของกิจการโดยตรง (ต้องรู้วัน-เวลาเกิด)' },
              { mode: 'company-date', label: 'วันก่อตั้งบริษัท', desc: 'เทียบกับ "ดวงบริษัท" จากวันจดทะเบียน/เปิดกิจการ' },
              { mode: 'industry', label: 'ธาตุอุตสาหกรรม', desc: 'เทียบกับธรรมชาติของสายงาน/อุตสาหกรรม' },
            ] as const).map((opt) => (
              <label
                key={opt.mode}
                className={`flex cursor-pointer items-start gap-3 rounded-md border p-4 ${
                  orgMode === opt.mode ? 'border-cinnabar bg-cinnabar/5' : 'border-line bg-cloud'
                }`}
              >
                <input type="radio" name="orgMode" checked={orgMode === opt.mode} onChange={() => setOrgMode(opt.mode)} className="mt-1 h-4 w-4 accent-cinnabar" />
                <span>
                  <span className="block text-sm font-semibold text-ink">{opt.label}</span>
                  <span className="block text-xs text-muted">{opt.desc}</span>
                </span>
              </label>
            ))}
          </div>

          {orgMode === 'executive' ? (
            <div className="space-y-4 rounded-md border border-line bg-cloud p-4">
              <div>
                <Label htmlFor="execName">ชื่อผู้บริหาร</Label>
                <Input id="execName" value={execName} onChange={(e) => setExecName(e.target.value)} placeholder="เช่น คุณวิชัย" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="execBirthDate">วันเกิด *</Label>
                  <Input id="execBirthDate" type="date" value={execBirthDate} min="1900-01-01" max="2100-12-31" onChange={(e) => setExecBirthDate(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="execBirthTime">เวลาเกิด *</Label>
                  <Input id="execBirthTime" type="time" value={execBirthTime} onChange={(e) => setExecBirthTime(e.target.value)} />
                </div>
              </div>
              <div>
                <Label htmlFor="execProvince">จังหวัดที่เกิด</Label>
                <Select id="execProvince" value={execProvince} onChange={(e) => setExecProvince(e.target.value)}>
                  <option value="">ไม่ทราบ / ต่างประเทศ</option>
                  {THAI_PROVINCES.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          ) : null}

          {orgMode === 'company-date' ? (
            <div className="space-y-4 rounded-md border border-line bg-cloud p-4">
              <div>
                <Label htmlFor="companyName">ชื่อบริษัท</Label>
                <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="เช่น บจก. รุ่งเรืองการค้า" />
              </div>
              <div>
                <Label htmlFor="foundingDate">วันก่อตั้ง/จดทะเบียน *</Label>
                <Input id="foundingDate" type="date" value={foundingDate} min="1900-01-01" max="2100-12-31" onChange={(e) => setFoundingDate(e.target.value)} />
                <FieldHint>ไม่ต้องระบุเวลา — ระบบจะไม่ใช้เสาเวลาฝั่งบริษัท</FieldHint>
              </div>
            </div>
          ) : null}

          {orgMode === 'industry' ? (
            <div className="space-y-4 rounded-md border border-line bg-cloud p-4">
              <div>
                <Label htmlFor="companyName2">ชื่อบริษัท (ไม่บังคับ)</Label>
                <Input id="companyName2" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="industryId">สายอุตสาหกรรม *</Label>
                <Select id="industryId" value={industryId} onChange={(e) => setIndustryId(e.target.value)}>
                  <option value="">— เลือกสายอุตสาหกรรม —</option>
                  {industriesByElement.map((group) => (
                    <optgroup key={group.element} label={`ธาตุ${ELEMENT_TH[group.element]}`}>
                      {group.items.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.th}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </Select>
              </div>
            </div>
          ) : null}

          {/* ทีม */}
          <div className="rounded-md border border-line bg-cloud p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-ink">ทีม (ถ้ามี)</p>
              <button
                onClick={() => team.length < 5 && setTeam([...team, { name: '', birthDate: '', birthTime: '' }])}
                disabled={team.length >= 5}
                className="text-xs font-semibold text-cinnabar disabled:text-muted"
              >
                + เพิ่มสมาชิก
              </button>
            </div>
            <p className="mt-1 text-xs text-muted">วิเคราะห์ความเข้ากันกับเพื่อนร่วมทีมรายคน (สูงสุด 5 คน)</p>
            {team.map((m, i) => (
              <div key={i} className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
                <Input placeholder="ชื่อ" value={m.name} onChange={(e) => setTeam(team.map((r, j) => (j === i ? { ...r, name: e.target.value } : r)))} />
                <Input type="date" value={m.birthDate} onChange={(e) => setTeam(team.map((r, j) => (j === i ? { ...r, birthDate: e.target.value } : r)))} />
                <Input type="time" value={m.birthTime} onChange={(e) => setTeam(team.map((r, j) => (j === i ? { ...r, birthTime: e.target.value } : r)))} />
                <button onClick={() => setTeam(team.filter((_, j) => j !== i))} className="px-2 text-sm text-cinnabar-deep hover:underline">
                  ลบ
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* ---- STEP 3 ---- */}
      {step === 3 ? (
        <div className="space-y-5">
          <div>
            <h1 className="text-xl font-semibold text-ink">บริการเสริม</h1>
            <p className="mt-1 text-sm text-muted">เลือกเพิ่มได้ตามต้องการ (ไม่บังคับ)</p>
          </div>
          <div className="space-y-3">
            {ADDONS.map((a) => (
              <label
                key={a.id}
                className={`flex cursor-pointer items-start gap-3 rounded-md border p-4 ${
                  addonIds.includes(a.id) ? 'border-cinnabar bg-cinnabar/5' : 'border-line bg-cloud'
                }`}
              >
                <input
                  type="checkbox"
                  checked={addonIds.includes(a.id)}
                  onChange={(e) =>
                    setAddonIds(e.target.checked ? [...addonIds, a.id] : addonIds.filter((x) => x !== a.id))
                  }
                  className="mt-1 h-4 w-4 accent-cinnabar"
                />
                <span className="flex-1">
                  <span className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-ink">{a.label}</span>
                    <span className="font-mono text-sm text-cinnabar">+{formatBaht(a.priceSatang)}</span>
                  </span>
                  <span className="block text-xs text-muted">{a.description}</span>
                </span>
              </label>
            ))}
          </div>
          <div className="rounded-md border border-line bg-cloud p-4">
            <Label htmlFor="pin">ตั้ง PIN ป้องกันรายงาน (ไม่บังคับ)</Label>
            <Input
              id="pin"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="ตัวเลข 4-6 หลัก"
              className="max-w-40 font-mono tracking-[0.3em]"
            />
            <FieldHint>ถ้าตั้ง PIN ผู้เปิดรายงานต้องกรอก PIN ก่อน — ส่ง PIN แยกช่องทางกับรหัสเปิดรายงาน</FieldHint>
          </div>
        </div>
      ) : null}

      {/* ---- STEP 4 ---- */}
      {step === 4 ? (
        <div className="space-y-5">
          <div>
            <h1 className="text-xl font-semibold text-ink">ตรวจทานและราคา</h1>
            <p className="mt-1 text-sm text-muted">ตรวจสอบข้อมูลก่อนชำระเงิน</p>
          </div>
          <div className="space-y-3 rounded-md border border-line bg-cloud p-5 text-sm">
            <Row label="ผู้ถูกวิเคราะห์" value={`${name}${gender ? ` (${gender === 'male' ? 'ชาย' : 'หญิง'})` : ''}`} />
            <Row label="วัน-เวลาเกิด" value={`${birthDate} ${birthTime} น.${province ? ` · ${province}` : ''}`} />
            <Row label="รูปถ่ายโหงวเฮ้ง" value={photoDataUrl ? 'แนบแล้ว' : 'ไม่แนบ'} />
            <div className="gold-divider my-2" />
            <Row
              label="ฝ่ายองค์กร"
              value={
                orgMode === 'executive'
                  ? `ดวงผู้บริหาร${execName ? ` — ${execName}` : ''} (${execBirthDate} ${execBirthTime})`
                  : orgMode === 'company-date'
                    ? `วันก่อตั้งบริษัท${companyName ? ` — ${companyName}` : ''} (${foundingDate})`
                    : `ธาตุอุตสาหกรรม — ${INDUSTRIES.find((i) => i.id === industryId)?.th ?? ''}`
              }
            />
            {team.filter((m) => m.name.trim() && m.birthDate).length > 0 ? (
              <Row label="ทีม" value={`${team.filter((m) => m.name.trim() && m.birthDate).length} คน`} />
            ) : null}
            {addonIds.length > 0 ? (
              <Row label="บริการเสริม" value={addonIds.map((id) => ADDONS.find((a) => a.id === id)?.label).join(', ')} />
            ) : null}
            {pin ? <Row label="PIN ป้องกัน" value="ตั้งไว้แล้ว" /> : null}
          </div>

          {/* ราคา */}
          <div className="rounded-md border border-gold/40 bg-paper-warm/60 p-5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-soft">รายงานความเหมาะสม 命合</span>
              <span className={useCredit && isLoggedIn ? 'text-muted line-through' : 'text-ink'}>
                {formatBaht(SINGLE_REPORT_PRICE_SATANG)}
              </span>
            </div>
            {useCredit && isLoggedIn ? (
              <div className="mt-1 flex items-center justify-between text-sm">
                <span className="text-jade">ชำระด้วยเครดิต (−1 เครดิต)</span>
                <span className="text-jade">ฟรี</span>
              </div>
            ) : null}
            {addonIds.map((id) => {
              const a = ADDONS.find((x) => x.id === id)
              if (!a) return null
              return (
                <div key={id} className="mt-1 flex items-center justify-between text-sm">
                  <span className="text-ink-soft">{a.label}</span>
                  <span className="text-ink">{formatBaht(a.priceSatang)}</span>
                </div>
              )
            })}
            <div className="gold-divider my-3" />
            <div className="flex items-center justify-between">
              <span className="font-semibold text-ink">รวมทั้งสิ้น</span>
              <span className="font-mono text-xl font-semibold text-cinnabar">{formatBaht(total)}</span>
            </div>
          </div>

          {isLoggedIn && credits > 0 ? (
            <label className="flex cursor-pointer items-center gap-3 rounded-md border border-line bg-cloud p-4">
              <input type="checkbox" checked={useCredit} onChange={(e) => setUseCredit(e.target.checked)} className="h-4 w-4 accent-cinnabar" />
              <span className="text-sm text-ink-soft">
                ใช้เครดิตสมาชิก 1 เครดิต (คงเหลือ {credits} เครดิต) — ชำระเฉพาะค่าบริการเสริม
              </span>
            </label>
          ) : null}

          {!isLoggedIn ? (
            <div>
              <Label htmlFor="guestEmail">อีเมลติดต่อ *</Label>
              <Input id="guestEmail" type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} placeholder="you@email.com" />
              <FieldHint>ใช้ส่งข้อมูลออเดอร์ · หรือ <Link href="/register" className="text-cinnabar underline">สมัครสมาชิก</Link> เพื่อเก็บประวัติรายงาน</FieldHint>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* ---- STEP 5 ---- */}
      {step === 5 ? (
        <div className="space-y-5 text-center">
          <div>
            <h1 className="text-xl font-semibold text-ink">ชำระเงินและเริ่มวิเคราะห์</h1>
            <p className="mt-1 text-sm text-muted">
              ยอดชำระ <span className="font-semibold text-cinnabar">{formatBaht(total)}</span>
              {useCredit && isLoggedIn ? ' (+ 1 เครดิต)' : ''}
            </p>
          </div>
          <Notice tone="info" className="text-left">
            ระบบสาธิตใช้การชำระเงินจำลอง (mock) — เมื่อกดยืนยัน ระบบจะประมวลผลและออกรหัสเปิดรายงานทันที
            (เชื่อมต่อ Stripe/Omise ได้ที่ <code className="font-mono text-xs">lib/orders.ts</code>)
          </Notice>
          <Button onClick={submit} disabled={submitting} className="w-full">
            {submitting ? 'เครื่องคำนวณกำลังตั้งเสาสี่ต้น…' : `ชำระเงินและเริ่มวิเคราะห์ · ${formatBaht(total)}`}
          </Button>
          <p className="text-xs text-muted">เมื่อกดยืนยัน ถือว่ายอมรับข้อตกลงการใช้งานและนโยบายความเป็นส่วนตัว</p>
        </div>
      ) : null}

      {/* ปุ่มนำทาง */}
      {!accessCode ? (
        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={back}
            disabled={step === 1 || submitting}
            className="rounded-md px-4 py-2 text-sm font-semibold text-muted hover:text-ink disabled:invisible"
          >
            ← ย้อนกลับ
          </button>
          {step < 5 ? (
            <Button onClick={next}>ถัดไป →</Button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium text-ink">{value}</span>
    </div>
  )
}
