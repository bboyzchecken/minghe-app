'use client'

import { INDUSTRIES } from '@minghe/core'
import type { GenerateReportInput, OrgInput } from '@minghe/report/types'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { BirthFields, Field, Select, TextInput, emptyBirth, type BirthValue } from '@/components/forms'
import { ElementIcon } from '@/components/element-icon'
import { Stepper, type StepDef } from '@/components/stepper'
import { ELEMENT_META } from '@/lib/brand'
import { thb } from '@/lib/pricing'
import { generateAccessCode, saveOrder, type PriceLine } from '@/lib/store'

const STEPS: StepDef[] = [
  { label: 'ข้อมูลของคุณ', element: 'metal' },
  { label: 'บริษัทที่สนใจ', element: 'water' },
  { label: 'ชำระเงิน', element: 'fire' },
]

const SIZES = ['สตาร์ทอัพ/เล็ก (Agile)', 'ขนาดกลาง (SME)', 'องค์กรใหญ่ (Corporate)']
const DIRECTIONS = ['เหนือ', 'ใต้', 'ตะวันออก', 'ตะวันตก', 'ตะวันออกเฉียงเหนือ', 'ตะวันออกเฉียงใต้', 'ตะวันตกเฉียงเหนือ', 'ตะวันตกเฉียงใต้']

export default function JobSeekerWizard() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [generating, setGenerating] = useState(false)

  const [me, setMe] = useState<BirthValue>({ ...emptyBirth })
  const [companyMode, setCompanyMode] = useState<'company-date' | 'industry'>('company-date')
  const [companyName, setCompanyName] = useState('')
  const [foundingDate, setFoundingDate] = useState('')
  const [industryId, setIndustryId] = useState('')
  const [direction, setDirection] = useState('')
  const [size, setSize] = useState('')
  const [billing, setBilling] = useState<'payperview' | 'subscription'>('payperview')

  const meOk = me.birthDate !== '' && me.birthTime !== ''
  const companyOk = companyMode === 'company-date' ? foundingDate !== '' : industryId !== ''
  const canNext = step === 0 ? meOk : step === 1 ? companyOk : true

  const total = billing === 'payperview' ? 199 : 399
  const priceLines: PriceLine[] =
    billing === 'payperview'
      ? [{ label: 'เช็กความสมพงษ์ 1 บริษัท (Pay-per-view)', amount: 199 }]
      : [{ label: 'สมาชิกรายเดือน (3 บริษัท/สัปดาห์)', amount: 399 }]

  function buildInput(): GenerateReportInput {
    let org: OrgInput
    if (companyMode === 'company-date') {
      org = { mode: 'company-date', companyName: companyName || 'บริษัทที่สนใจ', foundingDate }
    } else {
      org = { mode: 'industry', industryId, companyName: companyName || undefined }
    }
    return {
      subject: {
        name: me.name || 'คุณ',
        gender: me.gender || undefined,
        birthDate: me.birthDate,
        birthTime: me.birthTime,
        province: me.province || undefined,
      },
      org,
      targetYear: 2026,
    }
  }

  function confirm() {
    setGenerating(true)
    saveOrder({
      product: 'jobseeker',
      input: buildInput(),
      priceLines,
      total,
      accessCode: generateAccessCode(),
      createdAt: new Date().toISOString(),
    })
    setTimeout(() => router.push('/report'), 1600)
  }

  return (
    <div className="container-page max-w-3xl py-10 md:py-14">
      <div className="mb-8 text-center">
        <span className="eyebrow">Job Seeker · เช็กบริษัท</span>
        <h1 className="mt-2 text-3xl">บริษัทนี้ส่งเสริมดวงคุณไหม?</h1>
      </div>

      <div className="mb-10">
        <Stepper steps={STEPS} current={step} />
      </div>

      <div className="card p-6 md:p-9">
        {step === 0 && (
          <div className="fade-up">
            <h2 className="text-2xl">ข้อมูลวันเกิดของคุณ</h2>
            <p className="mb-6 mt-1 text-sm text-ink-soft">ใช้ตั้งเสาสี่ต้นของคุณ เพื่อเทียบกับพลังงานของบริษัท</p>
            <BirthFields value={me} onChange={setMe} nameLabel="ชื่อของคุณ" />
          </div>
        )}

        {step === 1 && (
          <div className="fade-up">
            <h2 className="text-2xl">บริษัทที่สนใจ</h2>
            <p className="mb-6 mt-1 text-sm text-ink-soft">กรอกข้อมูลบริษัทเอง (เฟสถัดไปจะเชื่อม DBD ให้ค้นอัตโนมัติ)</p>

            <div className="mb-5 grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => setCompanyMode('company-date')}
                className={`rounded-lg border p-4 text-left transition ${companyMode === 'company-date' ? 'border-gold bg-gold/[0.06]' : 'border-line bg-cloud hover:border-gold/40'}`}
              >
                <ElementIcon element="earth" size={20} />
                <div className="mt-2 font-medium text-ink">รู้วันก่อตั้ง</div>
                <div className="text-xs text-ink-soft">ใช้ธาตุกำเนิดองค์กร (แม่นกว่า)</div>
              </button>
              <button
                onClick={() => setCompanyMode('industry')}
                className={`rounded-lg border p-4 text-left transition ${companyMode === 'industry' ? 'border-gold bg-gold/[0.06]' : 'border-line bg-cloud hover:border-gold/40'}`}
              >
                <ElementIcon element="wood" size={20} />
                <div className="mt-2 font-medium text-ink">รู้แค่ประเภทธุรกิจ</div>
                <div className="text-xs text-ink-soft">ใช้ธาตุอุตสาหกรรม</div>
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="ชื่อบริษัท" className="sm:col-span-2">
                <TextInput value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="เช่น บมจ. รุ่งเรืองโลจิสติกส์" />
              </Field>
              {companyMode === 'company-date' ? (
                <Field label="วันก่อตั้ง (ค.ศ.)" className="sm:col-span-2">
                  <TextInput type="date" value={foundingDate} onChange={(e) => setFoundingDate(e.target.value)} />
                </Field>
              ) : (
                <Field label="ประเภทอุตสาหกรรม" className="sm:col-span-2">
                  <Select value={industryId} onChange={(e) => setIndustryId(e.target.value)}>
                    <option value="">— เลือกอุตสาหกรรม —</option>
                    {INDUSTRIES.map((ind) => (
                      <option key={ind.id} value={ind.id}>
                        {ind.th} ({ELEMENT_META[ind.element].th})
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
              <Field label="ทิศทางที่ตั้ง (ฮวงจุ้ย)" hint="ไม่บังคับ">
                <Select value={direction} onChange={(e) => setDirection(e.target.value)}>
                  <option value="">— ไม่ระบุ —</option>
                  {DIRECTIONS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </Select>
              </Field>
              <Field label="ขนาดองค์กร" hint="ไม่บังคับ">
                <Select value={size} onChange={(e) => setSize(e.target.value)}>
                  <option value="">— ไม่ระบุ —</option>
                  {SIZES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </Select>
              </Field>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="fade-up">
            <h2 className="text-2xl">เลือกวิธีชำระ</h2>
            <p className="mb-6 mt-1 text-sm text-ink-soft">ระบบสาธิต — ชำระเงินจำลอง (mock)</p>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => setBilling('payperview')}
                className={`rounded-lg border p-5 text-left transition ${billing === 'payperview' ? 'border-gold bg-gold/[0.06]' : 'border-line bg-cloud hover:border-gold/40'}`}
              >
                <div className="font-medium text-ink">Pay-per-view</div>
                <div className="mt-1 text-2xl font-semibold text-gold">199 ฿</div>
                <div className="text-xs text-ink-soft">เช็ก 1 บริษัท จ่ายครั้งเดียว</div>
              </button>
              <button
                onClick={() => setBilling('subscription')}
                className={`rounded-lg border p-5 text-left transition ${billing === 'subscription' ? 'border-gold bg-gold/[0.06]' : 'border-line bg-cloud hover:border-gold/40'}`}
              >
                <div className="flex items-center gap-2 font-medium text-ink">
                  รายเดือน <span className="chip !py-0.5 text-[10px]">คุ้มกว่า</span>
                </div>
                <div className="mt-1 text-2xl font-semibold text-gold">399 ฿<span className="text-sm text-muted">/เดือน</span></div>
                <div className="text-xs text-ink-soft">เช็กได้ 3 บริษัท/สัปดาห์</div>
              </button>
            </div>

            <div className="mt-6 rounded-lg border border-line bg-paper-warm/50 p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium text-ink">ยอดชำระ</span>
                <span className="font-display-en text-2xl font-semibold text-gold">{thb(total)} ฿</span>
              </div>
            </div>

            {generating ? (
              <div className="mt-6 flex flex-col items-center gap-3 py-4 text-center">
                <div className="flex gap-2">
                  {(['metal', 'water', 'wood', 'fire'] as const).map((e, i) => (
                    <span key={e} className="animate-bounce" style={{ animationDelay: `${i * 120}ms` }}>
                      <ElementIcon element={e} size={20} />
                    </span>
                  ))}
                </div>
                <div className="font-display-th text-lg text-ink">เครื่องคำนวณกำลังตั้งเสาสี่ต้น…</div>
              </div>
            ) : (
              <button onClick={confirm} className="btn-primary mt-6 w-full py-4 text-base">
                ยืนยันชำระ {thb(total)} บาท และดูผล
              </button>
            )}
          </div>
        )}

        {!generating && (
          <div className="mt-8 flex items-center justify-between">
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className={`btn-ghost ${step === 0 ? 'pointer-events-none opacity-0' : ''}`}
            >
              ← ย้อนกลับ
            </button>
            {step < 2 && (
              <button onClick={() => canNext && setStep((s) => s + 1)} disabled={!canNext} className="btn-primary">
                ถัดไป →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
