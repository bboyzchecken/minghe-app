'use client'

import type { PairHighlight, ReportData, TeamPairView } from '@minghe/report/types'
import { ELEMENT_META, ELEMENT_ORDER, type ElementKey } from '@/lib/brand'
import { ElementIcon } from '@/components/element-icon'
import { starsFromChart, tenGodsPercent } from '@/lib/report'

const GRADE_COLOR: Record<string, string> = {
  excellent: '#7B8B57',
  good: '#7B8B57',
  fair: '#BE8A2E',
  caution: '#B25C3C',
  challenging: '#9E3B2A',
}

export function ReportView({
  data,
  accessCode,
  isDemo,
}: {
  data: ReportData
  accessCode?: string
  isDemo?: boolean
}) {
  const chart = data.subject.chart
  const wu = data.subject.wuxing
  const compat = data.compatibility
  const gradeColor = GRADE_COLOR[compat.grade] ?? '#BE8A2E'
  const tenGods = tenGodsPercent(wu.dominantTenGods)
  const stars = starsFromChart(chart)

  return (
    <article className="report-doc mx-auto max-w-3xl">
      {/* ---- header ---- */}
      <header className="rounded-xl border border-line bg-card p-7 shadow-card md:p-9">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="cjk text-2xl text-gold">命合</span>
              <span className="font-display-en text-xl font-semibold text-gold">Ming He</span>
            </div>
            <div className="mt-1 text-xs uppercase tracking-widest text-muted">Compatibility Fit Report</div>
          </div>
          {accessCode && (
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-muted">รหัสเปิดรายงาน</div>
              <div className="font-body-en text-sm font-semibold tracking-wider text-ink">{accessCode}</div>
            </div>
          )}
        </div>

        <div className="gold-divider my-6" />

        <div className="grid items-center gap-6 sm:grid-cols-[1fr_auto]">
          <div>
            <div className="text-sm text-muted">ความสมพงษ์ระหว่าง</div>
            <div className="mt-1 text-2xl text-ink">
              คุณ{data.meta.subjectName} <span className="text-muted">×</span> {data.meta.orgLabel}
            </div>
            <p className="mt-2 max-w-md text-sm text-ink-soft">{compat.summary}</p>
          </div>
          <ScoreRing score={compat.score} label={compat.gradeTh} color={gradeColor} />
        </div>
      </header>

      {isDemo && (
        <div className="mt-4 rounded-lg border border-dashed border-gold/50 bg-gold/[0.05] p-3 text-center text-xs text-ink-soft">
          นี่คือ <b>รายงานตัวอย่าง</b> ที่คำนวณปาจือจริงในเบราว์เซอร์ — ลอง
          <a href="/employer/new" className="mx-1 font-medium text-gold underline">
            สร้างรายงานของคุณเอง
          </a>
        </div>
      )}

      {/* ---- pillars ---- */}
      <Section title="ผังปาจือ (命盘)" cn="四柱">
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {chart.pillars.map((p) => (
            <PillarCard key={p.position} pillar={p} />
          ))}
        </div>
        <div className="mt-4 grid gap-3 rounded-lg bg-paper-warm/50 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Fact label="พื้นดวง (ก้านวัน)" value={`${chart.dayMasterCn} · ธาตุ${chart.dayMasterElementTh}`} el={chart.dayMasterElement} />
          <Fact label="ปีนักษัตร" value={chart.zodiacTh} />
          {/* F-08 — บอกว่าเวลาสุริยะคำนวณจากที่ไหน เพื่อให้ผู้อ่านตรวจย้อนได้ว่าพิกัดถูกคน */}
          <Fact label="สถานที่เกิด" value={chart.province || 'ไม่ได้ระบุ'} />
          <Fact
            label="เวลาสุริยะจริง"
            value={
              chart.trueSolarTime.applied
                ? `${chart.trueSolarTime.solarTime} น. (ปรับ ${chart.trueSolarTime.totalCorrectionMinutes} นาที)`
                : 'ใช้เวลานาฬิกา (ไม่ระบุสถานที่เกิด)'
            }
          />
        </div>
      </Section>

      {/* ---- day master strength + five elements ---- */}
      <Section title="พลังก้านวัน & ห้าธาตุ" cn="日主 · 五行">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border border-line bg-cloud p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-ink-soft">กำลังก้านวัน</span>
              <span className="text-sm font-medium" style={{ color: ELEMENT_META[chart.dayMasterElement].color }}>
                {wu.strengthCategoryTh}
              </span>
            </div>
            <div className="mt-3 flex items-end gap-2">
              <span className="font-display-en text-4xl font-semibold text-ink">{wu.strengthScore}</span>
              <span className="mb-1 text-sm text-muted">/ 100</span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-paper-warm">
              <div
                className="h-full rounded-full"
                style={{ width: `${wu.strengthScore}%`, background: ELEMENT_META[chart.dayMasterElement].color }}
              />
            </div>
            <p className="mt-3 text-xs leading-relaxed text-ink-soft">{wu.strengthExplanation}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="text-xs text-muted">ธาตุอุปการะ:</span>
              {wu.favorableElements.map((e) => (
                <span key={e} className="chip !py-0.5" style={{ borderColor: `${ELEMENT_META[e].color}66` }}>
                  <ElementIcon element={e} size={12} /> {ELEMENT_META[e].th}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-line bg-cloud p-5">
            <div className="mb-3 text-sm text-ink-soft">สัดส่วนห้าธาตุในดวง</div>
            <div className="space-y-2.5">
              {ELEMENT_ORDER.map((e) => {
                const pct = Math.round(wu.percentages[e] ?? 0)
                return (
                  <div key={e} className="flex items-center gap-2">
                    <span className="flex w-14 items-center gap-1 text-xs text-ink-soft">
                      <ElementIcon element={e} size={13} /> {ELEMENT_META[e].th}
                    </span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-paper-warm">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: ELEMENT_META[e].color }} />
                    </div>
                    <span className="w-9 text-right text-xs text-muted">{pct}%</span>
                  </div>
                )
              })}
            </div>
            {wu.missing.length > 0 && (
              <p className="mt-3 text-xs text-muted">
                พร่องธาตุ: {wu.missing.map((e) => ELEMENT_META[e].th).join(', ')} — อาศัยสภาพแวดล้อม/ทีมมาเติมเต็ม
              </p>
            )}
          </div>
        </div>
      </Section>

      {/* ---- ten gods % ---- */}
      <Section flow title="สิบเทพเชิงสัดส่วน" cn="十神" hint="โครงสร้างพลังงานเชิงการทำงานที่เด่นในดวง">
        <div className="space-y-3">
          {tenGods.map((g) => (
            <div key={g.cn} className="rounded-lg border border-line bg-cloud p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-ink">
                  <span className="cjk mr-1.5 text-gold">{g.cn}</span>
                  {g.th}
                </span>
                <span className="text-sm font-semibold text-gold">{g.percent}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-paper-warm">
                <div className="h-full rounded-full bg-gold" style={{ width: `${g.percent}%` }} />
              </div>
              <p className="mt-2 text-xs text-ink-soft">{g.workMeaning}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ---- stars ---- */}
      <Section flow title="ดาวจุติ" cn="神煞" hint="ดาวเสริมที่สะท้อนพรสวรรค์เฉพาะด้าน">
        <div className="grid gap-3 sm:grid-cols-3">
          {stars.map((s) => (
            <div
              key={s.key}
              className={`rounded-lg border p-4 ${s.active ? 'border-jade/50 bg-jade/[0.06]' : 'border-line bg-paper-warm/30'}`}
            >
              <div className="flex items-center justify-between">
                <span className="cjk text-lg text-ink">{s.cn}</span>
                <span className={`text-[11px] font-medium ${s.active ? 'text-jade' : 'text-muted'}`}>
                  {s.active ? '● จุติ' : '○ ไม่จุติ'}
                </span>
              </div>
              <div className="mt-0.5 text-sm font-medium text-ink">{s.th}</div>
              <p className="mt-1.5 text-xs text-ink-soft">{s.active ? s.workMeaning : s.meaning}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ---- compatibility factors ---- */}
      <Section title="ปัจจัยความเข้ากัน" cn="合冲" hint="ความสัมพันธ์ระหว่างสองดวง">
        <div className="grid gap-4 sm:grid-cols-2">
          <FactorList title="จุดประสาน" positive factors={compat.factors.filter((f) => f.isPositive)} />
          <FactorList title="จุดที่ควรบริหาร" positive={false} factors={compat.factors.filter((f) => !f.isPositive)} />
        </div>
      </Section>

      {/* ---- team ---- F-20: รายคู่ต้องบอกได้ว่า "what's in it" ไม่ใช่แค่คะแนน ---- */}
      {data.team && data.team.pairwise.length > 0 && (
        <Section flow title="ความเข้ากันกับทีม รายคน" cn="团队">
          <div className="mb-4 rounded-lg bg-paper-warm/50 p-4">
            <div className="flex items-start justify-between gap-4">
              <span className="text-sm text-ink-soft">{data.team.summary}</span>
              <span className="font-display-en text-2xl font-semibold leading-none text-ink">
                {data.team.overallScore}
              </span>
            </div>
            {data.team.pairSummary && (
              <p className="mt-2 border-t border-line/60 pt-2 text-sm text-ink">{data.team.pairSummary}</p>
            )}
          </div>

          <div className="space-y-3">
            {data.team.pairwise.map((p, i) => (
              <PairCard key={`${p.name}-${i}`} pair={p} rank={i + 1} />
            ))}
          </div>

          <p className="mt-4 text-xs text-muted">
            เรียงจากเข้ากันได้ดีที่สุดไปหาคู่ที่ต้องบริหารความต่างมากที่สุด ·
            คะแนนเป็นดัชนีสมพงษ์ (合 Index) เต็ม 100
          </p>
        </Section>
      )}

      {/* ---- annual ---- */}
      <Section title={`จังหวะเวลา ปี ${data.annual.year}`} cn="流年">
        <div className="rounded-lg border border-line bg-cloud p-5">
          <div className="flex items-center gap-2 text-sm text-ink">
            <span className="cjk text-lg text-gold">{data.annual.ganzhi}</span>
            <span className="text-muted">ปี{data.annual.animalTh}</span>
          </div>
          <p className="mt-2 text-sm text-ink-soft">{data.annual.summary}</p>
        </div>
      </Section>

      {/* ---- narrative ---- */}
      <Section flow title="บทวิเคราะห์" cn="解读">
        <div className="space-y-6">
          {data.narrative.sections.map((s) => (
            <div key={s.id} className="print-avoid-break">
              <h4 className="text-lg text-ink">{s.title}</h4>
              <div className="mt-2 space-y-2">
                {s.paragraphs.map((para, i) => (
                  <p key={i} className="text-sm leading-relaxed text-ink-soft">
                    {para}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ---- disclaimer ---- */}
      <div className="mt-8 rounded-lg border border-line bg-paper-warm/40 p-5">
        <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">หมายเหตุ</div>
        <ul className="space-y-1.5">
          {data.disclaimer.map((d, i) => (
            <li key={i} className="text-xs leading-relaxed text-muted">
              • {d}
            </li>
          ))}
        </ul>
      </div>
    </article>
  )
}

function Section({
  title,
  cn,
  hint,
  flow,
  children,
}: {
  title: string
  cn?: string
  hint?: string
  /** ส่วนที่เนื้อหายาวเกินหนึ่งหน้ากระดาษ — ยอมให้ไหลข้ามหน้าแทนที่จะดันทั้งบล็อกไปหน้าใหม่ */
  flow?: boolean
  children: React.ReactNode
}) {
  return (
    <section
      className={`report-section mt-6 rounded-xl border border-line bg-card p-6 shadow-soft md:p-8 ${
        flow ? 'report-section-flow' : ''
      }`}
    >
      <div className="mb-5 flex items-baseline justify-between">
        <h3 className="flex items-baseline gap-2 text-xl text-ink">
          {title}
          {cn && <span className="cjk text-sm text-muted">{cn}</span>}
        </h3>
      </div>
      {hint && <p className="-mt-3 mb-4 text-xs text-muted">{hint}</p>}
      {children}
    </section>
  )
}

function ScoreRing({ score, label, color }: { score: number; label: string; color: string }) {
  const r = 42
  const c = 2 * Math.PI * r
  const off = c * (1 - score / 100)
  return (
    <div className="relative mx-auto h-32 w-32 flex-none">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#DCD4C2" strokeWidth="7" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display-en text-3xl font-semibold text-ink">{score}</span>
        <span className="cjk -mt-1 text-xs" style={{ color }}>
          合 · {label}
        </span>
      </div>
    </div>
  )
}

function PillarCard({ pillar }: { pillar: ReportData['subject']['chart']['pillars'][number] }) {
  const stemColor = ELEMENT_META[pillar.stemElement as ElementKey].color
  const branchColor = ELEMENT_META[pillar.branchElement as ElementKey].color
  return (
    <div className="rounded-lg border border-line bg-cloud p-2.5 text-center">
      <div className="text-[10px] text-muted">{pillar.positionTh}</div>
      {pillar.tenGodTh && <div className="mt-0.5 text-[10px] text-gold">{pillar.tenGodTh}</div>}
      <div className="cjk mt-1 text-2xl font-medium leading-none" style={{ color: stemColor }}>
        {pillar.stemCn}
      </div>
      <div className="cjk mt-1 text-2xl font-medium leading-none" style={{ color: branchColor }}>
        {pillar.branchCn}
      </div>
      <div className="mt-1.5 text-[10px] text-muted">{pillar.animalTh}</div>
      {pillar.hiddenStems.length > 0 && (
        <div className="mt-1.5 border-t border-line pt-1 text-[10px] text-ink-soft">
          {pillar.hiddenStems.map((h) => h.cn).join(' ')}
        </div>
      )}
    </div>
  )
}

/**
 * ความสัมพันธ์รายคู่ระหว่างผู้ถูกวิเคราะห์กับสมาชิกทีมหนึ่งคน (F-20)
 *
 * โครงตามที่ตัดสินไว้: คะแนน + ป้ายความสัมพันธ์ + คำบรรยายสั้น
 * ป้ายมาจากปัจจัยที่มีน้ำหนักสูงสุดของแต่ละฝั่ง ซึ่งเขียนเป็นไทยพร้อมวงเล็บศัพท์เดิมอยู่แล้ว
 */
function PairCard({ pair, rank }: { pair: TeamPairView; rank: number }) {
  const color = GRADE_COLOR[pair.grade] ?? '#BE8A2E'
  return (
    <div className="rounded-lg border border-line bg-cloud p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-paper-warm text-[11px] text-muted">
          {rank}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">คุณ{pair.name}</span>
        <span className="font-display-en text-lg font-semibold leading-none" style={{ color }}>
          {pair.score}
        </span>
        <span className="text-xs" style={{ color }}>
          {pair.gradeTh}
        </span>
      </div>

      <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-paper-warm">
        <div className="h-full rounded-full" style={{ width: `${pair.score}%`, background: color }} />
      </div>

      {(pair.strength || pair.watchOut) && (
        <div className="mt-3 space-y-2">
          {pair.strength && (
            <PairNote tone="jade" label="ส่งเสริม" highlight={pair.strength} />
          )}
          {pair.watchOut && (
            <PairNote tone="terracotta" label="ต้องบริหาร" highlight={pair.watchOut} />
          )}
        </div>
      )}

      {!pair.strength && !pair.watchOut && (
        <p className="mt-3 text-xs leading-6 text-muted">
          ไม่พบปฏิสัมพันธ์ที่มีนัยสำคัญระหว่างสองดวงนี้ — ทำงานร่วมกันแบบไม่ส่งเสริมและไม่ขัดกันเป็นพิเศษ
        </p>
      )}
    </div>
  )
}

function PairNote({
  tone,
  label,
  highlight,
}: {
  tone: 'jade' | 'terracotta'
  label: string
  highlight: PairHighlight
}) {
  const cls = tone === 'jade' ? 'text-jade' : 'text-terracotta'
  return (
    <div className="flex items-start gap-2 text-xs leading-6">
      <span className={`mt-px flex-none font-medium ${cls}`}>{tone === 'jade' ? '✓' : '⚠'} {label}</span>
      <span className="text-ink-soft">
        <b className="font-medium text-ink">{highlight.titleTh}</b> — {highlight.explanation}
      </span>
    </div>
  )
}

function Fact({ label, value, el }: { label: string; value: string; el?: ElementKey }) {
  return (
    <div>
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-ink">
        {el && <ElementIcon element={el} size={14} />}
        {value}
      </div>
    </div>
  )
}

function FactorList({
  title,
  positive,
  factors,
}: {
  title: string
  positive: boolean
  factors: ReportData['compatibility']['factors']
}) {
  const color = positive ? '#7B8B57' : '#B25C3C'
  return (
    <div className="rounded-lg border border-line bg-cloud p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium" style={{ color }}>
        <span className="h-2 w-2 rounded-full" style={{ background: color }} />
        {title}
      </div>
      {factors.length === 0 ? (
        <p className="text-xs text-muted">— ไม่พบปัจจัยเด่น —</p>
      ) : (
        <ul className="space-y-2">
          {factors.slice(0, 5).map((f, i) => (
            <li key={i} className="text-xs">
              <span className="font-medium text-ink">{f.titleTh}</span>
              <span className="text-muted"> · {f.pair}</span>
              <p className="mt-0.5 text-ink-soft">{f.explanation}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
