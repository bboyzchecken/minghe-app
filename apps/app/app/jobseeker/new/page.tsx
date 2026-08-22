'use client'

import { INDUSTRIES } from '@minghe/core'
import type { GenerateReportInput, OrgInput } from '@minghe/report/types'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { BirthFields, Field, Select, TextInput, emptyBirth, type BirthValue } from '@/components/forms'
import { ProfilePicker } from '@/components/memory-picker'
import { placeFields } from '@/lib/place'
import { ConsentCheckbox } from '@/components/consent-checkbox'
import { DateInput } from '@/components/date-input'
import { ElementIcon } from '@/components/element-icon'
import { Stepper, type StepDef } from '@/components/stepper'
import { ELEMENT_META } from '@/lib/brand'
import {
  JOBSEEKER_PAY_PER_VIEW_PRICE,
  JOBSEEKER_PLAN_PRICE,
  JOBSEEKER_WEEKLY_QUOTA,
  thb,
} from '@/lib/pricing'
import { useCreateOrder } from '@/lib/queries'
import { CreditNotice, useApplicableCredit } from '@/components/credit-notice'
import { rememberReturnTo, useSession } from '@/lib/session'
import { anonId, track } from '@/lib/track'
import { clearWizardDraft, loadWizardDraft, saveCurrentOrder, saveWizardDraft } from '@/lib/store'

const DRAFT_KEY = 'jobseeker'

interface PriceLine {
  label: string
  amount: number
}

interface Draft {
  step: number
  me: BirthValue
  companyMode: 'company-date' | 'industry'
  companyName: string
  foundingDate: string
  industryId: string
  direction: string
  size: string
  billing: 'payperview' | 'subscription'
}

const STEPS: StepDef[] = [
  { label: 'ข้อมูลของคุณ', element: 'metal' },
  { label: 'บริษัทที่สนใจ', element: 'water' },
  { label: 'ชำระเงิน', element: 'fire' },
]

const SIZES = ['สตาร์ทอัพ/เล็ก (Agile)', 'ขนาดกลาง (SME)', 'องค์กรใหญ่ (Corporate)']
const DIRECTIONS = ['เหนือ', 'ใต้', 'ตะวันออก', 'ตะวันตก', 'ตะวันออกเฉียงเหนือ', 'ตะวันออกเฉียงใต้', 'ตะวันตกเฉียงเหนือ', 'ตะวันตกเฉียงใต้']

export default function JobSeekerWizard() {
  const router = useRouter()
  const { user, loading: sessionLoading } = useSession()
  const createOrder = useCreateOrder()
  const [step, setStep] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  const [me, setMe] = useState<BirthValue>({ ...emptyBirth })
  const [companyMode, setCompanyMode] = useState<'company-date' | 'industry'>('company-date')
  const [companyName, setCompanyName] = useState('')
  const [foundingDate, setFoundingDate] = useState('')
  const [industryId, setIndustryId] = useState('')
  const [direction, setDirection] = useState('')
  const [size, setSize] = useState('')
  const [billing, setBilling] = useState<'payperview' | 'subscription'>('payperview')
  const [consented, setConsented] = useState(false)

  // กู้ร่างที่กรอกค้างไว้ กรณีถูกพาไปหน้าล็อกอินกลางคัน (F-03)
  useEffect(() => {
    const draft = loadWizardDraft<Draft>(DRAFT_KEY)
    if (!draft) return
    setStep(draft.step)
    setMe(draft.me)
    setCompanyMode(draft.companyMode)
    setCompanyName(draft.companyName)
    setFoundingDate(draft.foundingDate)
    setIndustryId(draft.industryId)
    setDirection(draft.direction)
    setSize(draft.size)
    setBilling(draft.billing)
    clearWizardDraft(DRAFT_KEY)
  }, [])

  const meOk = me.birthDate !== '' && me.birthTime !== ''
  const companyOk = companyMode === 'company-date' ? foundingDate !== '' : industryId !== ''
  const canNext = step === 0 ? meOk : step === 1 ? companyOk : true

  const total = billing === 'payperview' ? JOBSEEKER_PAY_PER_VIEW_PRICE : JOBSEEKER_PLAN_PRICE
  const [skipCredit, setSkipCredit] = useState(false)
  const credit = useApplicableCredit('jobseeker')
  const payable = credit && !skipCredit ? 0 : null

  // funnel — บอกแอดมินว่าคนที่ลองเล่นไปถึงขั้นไหน (ไม่เก็บข้อมูลที่กรอก)
  const { token } = useSession()
  useEffect(() => {
    const names = ['step_me', 'step_company', 'checkout_view']
    if (step === 0) track('jobseeker', 'wizard_start', 0, token)
    track('jobseeker', names[step] ?? `step_${step}`, step + 1, token)
    if (step === 2 && !sessionLoading && !user) track('jobseeker', 'login_gate', 5, token)
  }, [step, sessionLoading, user, token])
  const priceLines: PriceLine[] =
    billing === 'payperview'
      ? [{ label: 'เช็กความสมพงษ์ 1 บริษัท (Pay-per-view)', amount: JOBSEEKER_PAY_PER_VIEW_PRICE }]
      : [
          {
            label: `สมาชิกรายเดือน (${JOBSEEKER_WEEKLY_QUOTA} บริษัท/สัปดาห์)`,
            amount: JOBSEEKER_PLAN_PRICE,
          },
        ]

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
        ...placeFields(me),
      },
      org,
      targetYear: 2026,
    }
  }

  /** ป้ายกำกับบริษัท ใช้ในประวัติที่ dashboard */
  function orgLabel(): string {
    if (companyName) return companyName
    if (companyMode === 'industry') {
      return `ธาตุอุตสาหกรรม: ${INDUSTRIES.find((i) => i.id === industryId)?.th ?? '-'}`
    }
    return 'บริษัทที่สนใจ'
  }

  async function confirm() {
    if (!consented || !user) return
    setGenerating(true)
    setCheckoutError(null)

    try {
      const order = await createOrder.mutateAsync({
        product: 'jobseeker',
        total,
        input: buildInput(),
        orgLabel: orgLabel(),
        orgMode: companyMode,
        anonId: anonId(),
        skipCredit,
      })
      saveCurrentOrder(order)
      router.push('/report')
    } catch (e) {
      setCheckoutError(e instanceof Error ? e.message : 'สั่งซื้อไม่สำเร็จ')
      setGenerating(false)
    }
  }

  /** F-03 — เล่นโฟลว์ได้ก่อน แต่ต้องล็อกอินก่อนชำระเงิน */
  function goToLogin() {
    saveWizardDraft(DRAFT_KEY, {
      step,
      me,
      companyMode,
      companyName,
      foundingDate,
      industryId,
      direction,
      size,
      billing,
    })
    rememberReturnTo('/jobseeker/new')
    router.push('/login')
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
            {/* F-25 — เคยเช็กแล้วไม่ต้องกรอกวันเกิดใหม่ */}
            <ProfilePicker label="ใช้ข้อมูลที่เคยกรอกไว้" kind="self" onPick={(v) => setMe({ ...me, ...v })} />
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
                <Field label="วัน/เดือน/ปี ก่อตั้ง (ค.ศ.)" hint="ตัวอย่าง: 31/01/1990" className="sm:col-span-2">
                  <DateInput value={foundingDate} onChange={setFoundingDate} />
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
            <p className="mb-6 mt-1 text-sm text-ink-soft">ช่องทางชำระออนไลน์ (GB Prime Pay) อยู่ระหว่างเชื่อมต่อ — ระบบจะบันทึกคำสั่งซื้อและออกรหัสเปิดรายงานทันทีโดยยังไม่ตัดเงินจริง</p>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => setBilling('payperview')}
                className={`rounded-lg border p-5 text-left transition ${billing === 'payperview' ? 'border-gold bg-gold/[0.06]' : 'border-line bg-cloud hover:border-gold/40'}`}
              >
                <div className="font-medium text-ink">Pay-per-view</div>
                <div className="mt-1 text-2xl font-semibold text-gold">{thb(JOBSEEKER_PAY_PER_VIEW_PRICE)} ฿</div>
                <div className="text-xs text-ink-soft">เช็ก 1 บริษัท จ่ายครั้งเดียว</div>
              </button>
              <button
                onClick={() => setBilling('subscription')}
                className={`rounded-lg border p-5 text-left transition ${billing === 'subscription' ? 'border-gold bg-gold/[0.06]' : 'border-line bg-cloud hover:border-gold/40'}`}
              >
                <div className="flex items-center gap-2 font-medium text-ink">
                  รายเดือน <span className="chip !py-0.5 text-[10px]">คุ้มกว่า</span>
                </div>
                <div className="mt-1 text-2xl font-semibold text-gold">
                  {thb(JOBSEEKER_PLAN_PRICE)} ฿<span className="text-sm text-muted">/เดือน</span>
                </div>
                <div className="text-xs text-ink-soft">เช็กได้ {JOBSEEKER_WEEKLY_QUOTA} บริษัท/สัปดาห์</div>
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
            ) : sessionLoading ? (
              <div className="mt-6 h-14 animate-pulse rounded-lg bg-paper-warm" aria-hidden="true" />
            ) : !user ? (
              <LoginGate onLogin={goToLogin} />
            ) : (
              <>
                <div className="mt-6 rounded-lg border border-line bg-cloud px-4 py-3 text-sm text-ink-soft">
                  ชำระเงินในนาม <span className="font-medium text-ink">{user.name}</span> ({user.email})
                </div>
                <CreditNotice credit={credit} skip={skipCredit} onSkipChange={setSkipCredit} />

                {/* F-06 — กล่องยินยอมต้องถูกติ๊กก่อนจึงจะชำระเงินได้ */}
                <ConsentCheckbox checked={consented} onChange={setConsented} />

                {checkoutError && (
                  <p className="mt-4 rounded-lg border border-terracotta/40 bg-terracotta/[0.07] px-4 py-2.5 text-sm text-terracotta">
                    {checkoutError}
                  </p>
                )}

                <button
                  onClick={() => void confirm()}
                  disabled={!consented}
                  className="btn-primary mt-4 w-full py-4 text-base disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {payable === 0 ? 'ใช้สิทธิ์ทดลอง (0 บาท) และดูผล' : `ยืนยันชำระ ${thb(total)} บาท และดูผล`}
                </button>
                {!consented && (
                  <p className="mt-3 text-center text-xs text-muted">
                    กรุณาติ๊กยอมรับเงื่อนไขก่อนดำเนินการชำระเงิน
                  </p>
                )}
              </>
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

/**
 * F-03 — ผู้ใช้กรอกฟอร์มได้โดยไม่ต้องล็อกอิน แต่ต้องมีบัญชีก่อนชำระเงิน
 */
function LoginGate({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="mt-6 rounded-xl border border-gold/40 bg-gold/[0.06] p-6 text-center">
      <div className="font-medium text-ink">ต้องเข้าสู่ระบบก่อนชำระเงิน</div>
      <p className="mx-auto mt-2 max-w-sm text-sm text-ink-soft">
        เพื่อให้รายงานผูกกับบัญชีของคุณ เปิดดูย้อนหลังได้ทุกเมื่อ
        และระบบจำข้อมูลที่กรอกไว้ให้ในครั้งถัดไป
      </p>
      <button onClick={onLogin} className="btn-primary mt-5 px-8">
        เข้าสู่ระบบ / สมัครสมาชิก
      </button>
      <p className="mt-3 text-xs text-muted">ข้อมูลที่กรอกไว้จะยังอยู่เมื่อกลับมา</p>
    </div>
  )
}
