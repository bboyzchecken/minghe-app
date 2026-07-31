'use client'

import { INDUSTRIES } from '@minghe/core'
import type { GenerateReportInput, OrgInput, TeamMemberInput } from '@minghe/report/types'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { BirthFields, Field, Select, TextInput, emptyBirth, type BirthValue } from '@/components/forms'
import { ElementIcon } from '@/components/element-icon'
import { Stepper, type StepDef } from '@/components/stepper'
import { ELEMENT_META } from '@/lib/brand'
import { ADDONS, DEPTH_TIERS, SPEED_OPTIONS, TEAM_FREE_SEATS, teamExtraCost, thb } from '@/lib/pricing'
import { generateAccessCode, saveOrder, type PriceLine } from '@/lib/store'

const STEPS: StepDef[] = [
  { label: 'ผู้ถูกวิเคราะห์', element: 'metal' },
  { label: 'ฝ่ายองค์กร', element: 'water' },
  { label: 'บริการเสริม', element: 'wood' },
  { label: 'ตรวจทาน', element: 'earth' },
  { label: 'ชำระเงิน', element: 'fire' },
]

type OrgMode = 'executive' | 'company-date' | 'industry'
type AddonId = 'executive-analysis' | 'consult'

export default function EmployerWizard() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [generating, setGenerating] = useState(false)

  const [subject, setSubject] = useState<BirthValue>({ ...emptyBirth })
  const [orgMode, setOrgMode] = useState<OrgMode>('executive')
  const [exec, setExec] = useState<BirthValue>({ ...emptyBirth, name: '' })
  const [companyName, setCompanyName] = useState('')
  const [foundingDate, setFoundingDate] = useState('')
  const [industryId, setIndustryId] = useState('')
  const [team, setTeam] = useState<BirthValue[]>([])

  const [depth, setDepth] = useState<'standard' | 'premium' | 'executive'>('premium')
  const [speed, setSpeed] = useState<'standard' | 'express'>('standard')
  const [addons, setAddons] = useState<Record<AddonId, boolean>>({ 'executive-analysis': false, consult: false })

  const depthTier = DEPTH_TIERS.find((d) => d.id === depth)!
  const teamExtra = teamExtraCost(team.length)

  const priceLines: PriceLine[] = useMemo(() => {
    const lines: PriceLine[] = [{ label: `รายงาน · ${depthTier.label}`, amount: depthTier.price }]
    if (speed === 'express') lines.push({ label: 'Express — ผลด่วน 3 ชม.', amount: 99 })
    if (addons['executive-analysis']) lines.push({ label: 'Executive Analysis', amount: 89 })
    if (addons.consult) lines.push({ label: 'Master Consultation (45 นาที)', amount: 1500 })
    if (teamExtra > 0)
      lines.push({ label: `สมาชิกทีมเพิ่ม (${team.length - TEAM_FREE_SEATS} คน × 16)`, amount: teamExtra })
    return lines
  }, [depthTier, speed, addons, teamExtra, team.length])

  const total = priceLines.reduce((s, l) => s + l.amount, 0)

  // ---- validation ----
  const subjectOk = subject.birthDate !== '' && subject.birthTime !== ''
  const orgOk =
    orgMode === 'executive'
      ? exec.birthDate !== '' && exec.birthTime !== ''
      : orgMode === 'company-date'
        ? foundingDate !== ''
        : industryId !== ''
  const canNext = step === 0 ? subjectOk : step === 1 ? orgOk : true

  const toTeamInput = (): TeamMemberInput[] =>
    team
      .filter((m) => m.birthDate)
      .map((m) => ({
        name: m.name || 'สมาชิกทีม',
        birthDate: m.birthDate,
        birthTime: m.birthTime || undefined,
        province: m.province || undefined,
      }))

  function buildInput(): GenerateReportInput {
    const teamInput = toTeamInput()
    let org: OrgInput
    if (orgMode === 'executive') {
      org = {
        mode: 'executive',
        executiveName: exec.name || 'ผู้บริหาร',
        birthDate: exec.birthDate,
        birthTime: exec.birthTime,
        province: exec.province || undefined,
        team: teamInput,
      }
    } else if (orgMode === 'company-date') {
      org = { mode: 'company-date', companyName: companyName || 'บริษัท', foundingDate, team: teamInput }
    } else {
      org = { mode: 'industry', industryId, companyName: companyName || undefined, team: teamInput }
    }
    return {
      subject: {
        name: subject.name || 'ผู้ถูกวิเคราะห์',
        gender: subject.gender || undefined,
        birthDate: subject.birthDate,
        birthTime: subject.birthTime,
        province: subject.province || undefined,
      },
      org,
      targetYear: 2026,
    }
  }

  function confirmPayment() {
    setGenerating(true)
    const order = {
      product: 'employer' as const,
      input: buildInput(),
      priceLines,
      total,
      accessCode: generateAccessCode(),
      express: speed === 'express',
      createdAt: new Date().toISOString(),
    }
    saveOrder(order)
    // จำลองเวลา "ตั้งเสาสี่ต้น" ก่อนเปิดรายงาน
    setTimeout(() => router.push('/report'), 1800)
  }

  return (
    <div className="container-page max-w-4xl py-10 md:py-14">
      <div className="mb-8 text-center">
        <span className="eyebrow">Employer · วิเคราะห์ candidate</span>
        <h1 className="mt-2 text-3xl">สร้างรายงานความสมพงษ์</h1>
      </div>

      <div className="mb-10">
        <Stepper steps={STEPS} current={step} />
      </div>

      <div className="card p-6 md:p-9">
        {step === 0 && (
          <StepShell title="ข้อมูลผู้ถูกวิเคราะห์" subtitle="candidate หรือพนักงานที่ต้องการดูความเข้ากัน">
            <BirthFields value={subject} onChange={setSubject} nameLabel="ชื่อผู้ถูกวิเคราะห์" />
          </StepShell>
        )}

        {step === 1 && (
          <StepShell title="ฝ่ายองค์กร" subtitle="เทียบดวงกับอะไร — เลือกได้ตามที่มีข้อมูล (cross-data)">
            <div className="mb-6 grid gap-3 sm:grid-cols-3">
              <ModeCard active={orgMode === 'executive'} onClick={() => setOrgMode('executive')} title="ดวงผู้บริหาร" desc="เทียบกับหัวหน้า/เจ้าของ" el="water" />
              <ModeCard active={orgMode === 'company-date'} onClick={() => setOrgMode('company-date')} title="วันก่อตั้งบริษัท" desc="ธาตุกำเนิดองค์กร" el="earth" />
              <ModeCard active={orgMode === 'industry'} onClick={() => setOrgMode('industry')} title="ธาตุอุตสาหกรรม" desc="ประเภทธุรกิจ" el="wood" />
            </div>

            {orgMode === 'executive' && (
              <BirthFields value={exec} onChange={setExec} nameLabel="ชื่อผู้บริหาร" showGender={false} />
            )}
            {orgMode === 'company-date' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="ชื่อบริษัท">
                  <TextInput value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="เช่น บจก. มงคลเทรด" />
                </Field>
                <Field label="วันก่อตั้ง (ค.ศ.)" hint="ไม่ต้องระบุเวลา — ใช้ธาตุวันก่อตั้ง">
                  <TextInput type="date" value={foundingDate} onChange={(e) => setFoundingDate(e.target.value)} />
                </Field>
              </div>
            )}
            {orgMode === 'industry' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="ชื่อบริษัท (ไม่บังคับ)">
                  <TextInput value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                </Field>
                <Field label="ประเภทอุตสาหกรรม">
                  <Select value={industryId} onChange={(e) => setIndustryId(e.target.value)}>
                    <option value="">— เลือกอุตสาหกรรม —</option>
                    {INDUSTRIES.map((ind) => (
                      <option key={ind.id} value={ind.id}>
                        {ind.th} ({ELEMENT_META[ind.element].th})
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            )}

            <TeamRoster team={team} setTeam={setTeam} />
          </StepShell>
        )}

        {step === 2 && (
          <StepShell title="บริการเสริม" subtitle="เลือกความลึกของรายงาน ความเร็ว และบริการเพิ่มเติม">
            <div className="mb-2 text-sm font-medium text-ink-soft">ระดับความลึกของรายงาน</div>
            <div className="grid gap-3 sm:grid-cols-3">
              {DEPTH_TIERS.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDepth(d.id)}
                  className={`rounded-lg border p-4 text-left transition ${
                    depth === d.id ? 'border-gold bg-gold/[0.06] shadow-soft' : 'border-line bg-cloud hover:border-gold/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-ink">{d.label}</span>
                    <span className="cjk text-sm text-muted">{d.cn}</span>
                  </div>
                  <div className="mt-1 text-lg font-semibold text-gold">{thb(d.price)} ฿</div>
                  <p className="mt-1 text-xs text-ink-soft">{d.blurb}</p>
                </button>
              ))}
            </div>

            <div className="mb-2 mt-7 text-sm font-medium text-ink-soft">ความเร็วในการส่งมอบ</div>
            <div className="grid gap-3 sm:grid-cols-2">
              {SPEED_OPTIONS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSpeed(s.id)}
                  className={`flex items-center justify-between rounded-lg border p-4 text-left transition ${
                    speed === s.id ? 'border-gold bg-gold/[0.06]' : 'border-line bg-cloud hover:border-gold/40'
                  } ${s.highlight ? 'ring-1 ring-gold/30' : ''}`}
                >
                  <div>
                    <div className="font-medium text-ink">
                      {s.label} {s.highlight && <span className="chip ml-1 !py-0.5 text-[10px]">แนะนำ</span>}
                    </div>
                    <div className="text-xs text-ink-soft">{s.detail}</div>
                  </div>
                  <div className="text-sm font-semibold text-gold">{s.price === 0 ? 'ฟรี' : `+${s.price}`}</div>
                </button>
              ))}
            </div>

            <div className="mb-2 mt-7 text-sm font-medium text-ink-soft">บริการเสริม (เลือกได้หลายรายการ)</div>
            <div className="space-y-3">
              {ADDONS.filter((a) => a.id !== 'express').map((a) => {
                const isAddon = a.id === 'executive-analysis' || a.id === 'consult'
                const checked = isAddon ? addons[a.id as AddonId] : false
                return (
                  <label
                    key={a.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition ${
                      a.comingSoon
                        ? 'cursor-not-allowed border-dashed border-line bg-paper-warm/40 opacity-70'
                        : checked
                          ? 'border-gold bg-gold/[0.06]'
                          : 'border-line bg-cloud hover:border-gold/40'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 accent-[#b07d2b]"
                      disabled={a.comingSoon}
                      checked={checked}
                      onChange={(e) => isAddon && setAddons((v) => ({ ...v, [a.id]: e.target.checked }))}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-ink">{a.label}</span>
                        {a.comingSoon && <span className="chip !py-0.5 text-[10px] text-terracotta">Coming Soon</span>}
                      </div>
                      <p className="text-xs text-ink-soft">{a.description}</p>
                    </div>
                    <div className="text-sm font-semibold text-gold">
                      {a.comingSoon ? 'เร็วๆ นี้' : `+${thb(a.price ?? 0)}`}
                    </div>
                  </label>
                )
              })}
            </div>
          </StepShell>
        )}

        {step === 3 && (
          <StepShell title="ตรวจทานก่อนชำระเงิน" subtitle="ตรวจสอบข้อมูลและยอดชำระ">
            <ReviewRow label="ผู้ถูกวิเคราะห์" value={`${subject.name || 'ไม่ระบุชื่อ'} · เกิด ${subject.birthDate} ${subject.birthTime} ${subject.province || ''}`} />
            <ReviewRow
              label="ฝ่ายองค์กร"
              value={
                orgMode === 'executive'
                  ? `ผู้บริหาร ${exec.name || '(ไม่ระบุ)'} · ${exec.birthDate} ${exec.birthTime}`
                  : orgMode === 'company-date'
                    ? `${companyName || 'บริษัท'} · ก่อตั้ง ${foundingDate}`
                    : `อุตสาหกรรม: ${INDUSTRIES.find((i) => i.id === industryId)?.th ?? '-'}`
              }
            />
            {team.length > 0 && <ReviewRow label="ทีม" value={`${team.length} คน${teamExtra > 0 ? ` (เกิน ${TEAM_FREE_SEATS} คนแรก)` : ' (ฟรี)'}`} />}
            <ReviewRow label="แพ็กเกจ" value={`${depthTier.label} · ${speed === 'express' ? 'Express 3 ชม.' : 'Standard 24 ชม.'}`} />

            <div className="mt-6 rounded-lg border border-line bg-paper-warm/50 p-5">
              {priceLines.map((l) => (
                <div key={l.label} className="flex justify-between py-1 text-sm">
                  <span className="text-ink-soft">{l.label}</span>
                  <span className="text-ink">{thb(l.amount)} ฿</span>
                </div>
              ))}
              <div className="gold-divider my-3" />
              <div className="flex items-center justify-between">
                <span className="font-medium text-ink">ยอดชำระรวม</span>
                <span className="font-display-en text-2xl font-semibold text-gold">{thb(total)} ฿</span>
              </div>
            </div>
          </StepShell>
        )}

        {step === 4 && (
          <StepShell title="ชำระเงินและเริ่มวิเคราะห์" subtitle={`ยอดชำระ ${thb(total)} บาท`}>
            <div className="rounded-lg border border-line bg-paper-warm/50 p-4 text-sm text-ink-soft">
              ระบบสาธิตใช้การชำระเงินจำลอง (mock) — เมื่อกดยืนยัน ระบบจะประมวลผลและออกรหัสเปิดรายงานทันที
              (พร้อมเชื่อมต่อ Stripe / Omise ในเฟสถัดไป)
            </div>

            {generating ? (
              <div className="mt-6 flex flex-col items-center gap-3 py-6 text-center">
                <div className="flex gap-2">
                  {(['metal', 'water', 'wood', 'fire'] as const).map((e, i) => (
                    <span key={e} className="animate-bounce" style={{ animationDelay: `${i * 120}ms` }}>
                      <ElementIcon element={e} size={22} />
                    </span>
                  ))}
                </div>
                <div className="font-display-th text-lg text-ink">เครื่องคำนวณกำลังตั้งเสาสี่ต้น…</div>
                <div className="text-sm text-muted">เพื่อส่งให้ซินแสตรวจสอบและตีความ</div>
              </div>
            ) : (
              <button onClick={confirmPayment} className="btn-primary mt-6 w-full py-4 text-base">
                ยืนยันชำระ {thb(total)} บาท และเริ่มวิเคราะห์
              </button>
            )}
            <p className="mt-3 text-center text-xs text-muted">
              เมื่อกดยืนยัน ถือว่ายอมรับข้อตกลงการใช้งานและนโยบายความเป็นส่วนตัว (PDPA)
            </p>
          </StepShell>
        )}

        {/* ---- nav ---- */}
        {!generating && (
          <div className="mt-8 flex items-center justify-between">
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className={`btn-ghost ${step === 0 ? 'pointer-events-none opacity-0' : ''}`}
            >
              ← ย้อนกลับ
            </button>
            {step < 4 && (
              <button onClick={() => canNext && setStep((s) => s + 1)} disabled={!canNext} className="btn-primary">
                {step === 3 ? 'ไปหน้าชำระเงิน' : 'ถัดไป'} →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function StepShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="fade-up">
      <h2 className="text-2xl">{title}</h2>
      <p className="mb-6 mt-1 text-sm text-ink-soft">{subtitle}</p>
      {children}
    </div>
  )
}

function ModeCard({
  active,
  onClick,
  title,
  desc,
  el,
}: {
  active: boolean
  onClick: () => void
  title: string
  desc: string
  el: 'water' | 'earth' | 'wood'
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border p-4 text-left transition ${
        active ? 'border-gold bg-gold/[0.06] shadow-soft' : 'border-line bg-cloud hover:border-gold/40'
      }`}
    >
      <ElementIcon element={el} size={22} />
      <div className="mt-2 font-medium text-ink">{title}</div>
      <div className="text-xs text-ink-soft">{desc}</div>
    </button>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-line py-3 last:border-0 sm:flex-row sm:justify-between">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-sm text-ink sm:text-right">{value}</span>
    </div>
  )
}

function TeamRoster({ team, setTeam }: { team: BirthValue[]; setTeam: (t: BirthValue[]) => void }) {
  return (
    <div className="mt-8 rounded-lg border border-line bg-paper-warm/40 p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-ink">Team Roster — วิเคราะห์รวมทั้งทีม</div>
          <div className="text-xs text-ink-soft">5 คนแรกฟรี · คนที่ 6 เป็นต้นไป +16 บาท/คน</div>
        </div>
        <button
          onClick={() => setTeam([...team, { ...emptyBirth }])}
          className="btn-ghost !px-4 !py-2 text-xs"
        >
          + เพิ่มสมาชิก
        </button>
      </div>
      {team.length > 0 && (
        <div className="mt-4 space-y-4">
          {team.map((m, i) => (
            <div key={i} className="rounded-lg border border-line bg-cloud p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-muted">สมาชิกคนที่ {i + 1}</span>
                <button
                  onClick={() => setTeam(team.filter((_, j) => j !== i))}
                  className="text-xs text-terracotta hover:underline"
                >
                  ลบ
                </button>
              </div>
              <BirthFields
                value={m}
                onChange={(v) => setTeam(team.map((x, j) => (j === i ? v : x)))}
                nameLabel="ชื่อสมาชิก"
                showGender={false}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
