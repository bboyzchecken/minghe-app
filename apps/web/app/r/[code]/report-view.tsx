/**
 * เรนเดอร์รายงานความเหมาะสม 命合 ฉบับเต็ม — สไตล์ editorial พรีเมียม
 * "เอกสารที่ซินแสมืออาชีพจัดทำ" + พิมพ์เป็น PDF ได้จากปุ่มด้านบน
 */

import Link from 'next/link'
import type { ReportData } from '@minghe/report'
import type { CompatibilityFactor, ElementKey } from '@minghe/core'
import {
  Badge,
  ElementBar,
  ElementChip,
  GoldDivider,
  PillarCard,
  ScoreRing,
  Seal,
} from '@/components/ui'
import { formatThaiDate } from '@/lib/utils'
import { CopyCodeButton, PrintButton } from './print-button'

const ELEMENT_TH: Record<ElementKey, string> = {
  wood: 'ไม้',
  fire: 'ไฟ',
  earth: 'ดิน',
  metal: 'ทอง',
  water: 'น้ำ',
}

function gradeTone(score: number): 'success' | 'gold' | 'warning' | 'danger' {
  if (score >= 80) return 'success'
  if (score >= 65) return 'gold'
  if (score >= 50) return 'warning'
  return 'danger'
}

/** หัวข้อ section สไตล์เอกสาร: เลขจีน + ชื่อไทย + เส้นทอง */
function SectionHeading({ index, title }: { index: string; title: string }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <span className="font-cjk text-2xl font-bold text-cinnabar">{index}</span>
      <h2 className="text-2xl font-semibold text-ink">{title}</h2>
      <span className="ml-2 h-px flex-1 bg-line" />
    </div>
  )
}

function FactorRow({ factor }: { factor: CompatibilityFactor }) {
  return (
    <div
      className="print-avoid-break rounded-md border-l-4 bg-cloud p-4"
      style={{ borderLeftColor: factor.isPositive ? '#4F8073' : '#9C3A27' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-cjk text-lg font-semibold text-ink">{factor.pair}</span>
          <span className="text-sm font-semibold text-ink">{factor.titleTh}</span>
        </div>
        <span
          className="shrink-0 font-mono text-sm font-semibold"
          style={{ color: factor.isPositive ? '#4F8073' : '#9C3A27' }}
        >
          {factor.points > 0 ? '+' : ''}
          {factor.points}
        </span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{factor.explanation}</p>
      <p className="mt-1 text-xs text-muted">ตำแหน่ง: {factor.positions}</p>
    </div>
  )
}

export function ReportView({ data, accessCode }: { data: ReportData; accessCode: string }) {
  const { subject, org, compatibility, annual, meta, faceReading, narrative, team } = data
  const chart = subject.chart
  const wu = subject.wuxing
  const positives = compatibility.factors.filter((f) => f.isPositive)
  const negatives = compatibility.factors.filter((f) => !f.isPositive)

  return (
    <div className="min-h-screen bg-paper">
      {/* แถบเครื่องมือ (ไม่พิมพ์) */}
      <div className="no-print sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <Seal size={32} />
            <span className="font-display-en text-sm tracking-[0.2em] text-ink">MÍNGHÉ</span>
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <CopyCodeButton code={accessCode} />
            <PrintButton />
          </div>
        </div>
      </div>

      {/* ลายน้ำตราประทับ */}
      <div className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center">
        <div className="opacity-[0.04]">
          <Seal size={420} />
        </div>
      </div>

      <article className="relative z-10 mx-auto max-w-4xl px-4 py-8 print:py-0">
        {/* ---- หน้าปก ---- */}
        <header
          className="starfield relative overflow-hidden rounded-lg bg-ink px-8 py-14 text-center print-avoid-break"
          style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
        >
          <div className="flex justify-center">
            <Seal size={72} />
          </div>
          <p className="mt-6 font-display-en text-sm tracking-[0.35em] text-gold-soft">
            MÍNGHÉ FIT REPORT
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-paper md:text-4xl">
            รายงานความเหมาะสม 命合
          </h1>
          <p className="mt-4 text-lg text-paper/85">
            {meta.subjectName} <span className="text-gold">×</span> {org.label}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Badge tone="gold">ดัชนีสมพงษ์ {compatibility.score}/100</Badge>
            <span className="text-sm text-paper/60">{compatibility.gradeTh}</span>
          </div>
          <p className="mt-6 font-mono text-sm tracking-[0.2em] text-paper/50">{accessCode}</p>
          <p className="mt-1 text-xs text-paper/40">จัดทำเมื่อ {formatThaiDate(meta.generatedAt)}</p>
        </header>

        {/* ---- ผังปาจือ ---- */}
        <section className="mt-12 print-page-break">
          <SectionHeading index="壹" title={`ผังปาจือ (命盘) ของ${chart.name}`} />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {chart.pillars.map((p) => (
              <PillarCard
                key={p.position}
                positionTh={p.positionTh}
                ganzhi={p.ganzhi}
                stemTh={p.stemTh}
                branchTh={p.branchTh}
                animalTh={p.animalTh}
                tenGodTh={p.tenGodTh}
                stemElement={p.stemElement}
                branchElement={p.branchElement}
              />
            ))}
          </div>
          <div className="mt-4 grid gap-3 text-sm text-ink-soft md:grid-cols-2">
            <div className="rounded-md border border-line bg-cloud p-4">
              <p>
                <span className="text-muted">ก้านวัน (日主):</span>{' '}
                <span className="font-cjk text-lg font-semibold text-ink">{chart.dayMasterCn}</span>{' '}
                ธาตุ{chart.dayMasterElementTh}
              </p>
              <p className="mt-1">
                <span className="text-muted">ปีนักษัตร:</span> {chart.zodiacTh}
              </p>
              <p className="mt-1 text-xs text-muted">{chart.lunarDate}</p>
            </div>
            <div className="rounded-md border border-line bg-cloud p-4">
              <p className="text-muted">เวลาเกิด</p>
              {chart.trueSolarTime.applied ? (
                <>
                  <p className="mt-1">
                    นาฬิกา {chart.trueSolarTime.clockTime} น. → เวลาสุริยะจริง{' '}
                    <span className="font-semibold text-cinnabar">
                      {chart.trueSolarTime.solarTime} น.
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    ปรับ {chart.trueSolarTime.totalCorrectionMinutes} นาที (เวลาสุริยะจริง 真太陽時
                    จากลองจิจูด{chart.province ? ` ${chart.province}` : ''} + สมการเวลา)
                  </p>
                </>
              ) : (
                <p className="mt-1">
                  {chart.birthTime} น. (ใช้เวลานาฬิกาโดยตรง — ไม่ได้ระบุสถานที่เกิด)
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ---- ห้าธาตุ ---- */}
        <section className="mt-12 print-avoid-break">
          <SectionHeading index="貳" title="วิเคราะห์ห้าธาตุ (五行) และกำลังก้านวัน" />
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-md border border-line bg-cloud p-5">
              <p className="mb-4 text-sm font-semibold text-ink">สัดส่วนห้าธาตุในดวง</p>
              <ElementBar percentages={wu.percentages} />
            </div>
            <div className="rounded-md border border-line bg-cloud p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-ink">กำลังก้านวัน</p>
                <Badge tone={wu.strengthCategory === 'strong' ? 'info' : wu.strengthCategory === 'weak' ? 'warning' : 'success'}>
                  {wu.strengthCategoryTh}
                </Badge>
              </div>
              <p className="mt-1 font-mono text-3xl font-semibold text-ink">{wu.strengthScore}/100</p>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">{wu.strengthExplanation}</p>
              <div className="mt-4">
                <p className="mb-1.5 text-xs font-semibold text-muted">ธาตุอุปการะ</p>
                <div className="flex flex-wrap gap-2">
                  {wu.favorableElements.map((el) => (
                    <ElementChip key={el} element={el} />
                  ))}
                </div>
              </div>
              {wu.missing.length > 0 ? (
                <p className="mt-3 text-xs text-muted">
                  ธาตุที่พร่องในดวง: {wu.missing.map((e) => ELEMENT_TH[e]).join(', ')}
                </p>
              ) : null}
            </div>
          </div>

          {/* ที่มาของคะแนนกำลัง */}
          <div className="mt-4 overflow-x-auto rounded-md border border-line bg-cloud">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-paper-warm/50 text-left text-xs text-muted">
                  <th className="px-4 py-2 font-semibold">องค์ประกอบ</th>
                  <th className="px-4 py-2 font-semibold">คะแนน</th>
                  <th className="px-4 py-2 font-semibold">รายละเอียด</th>
                </tr>
              </thead>
              <tbody>
                {wu.scoreBreakdown.map((b, i) => (
                  <tr key={i} className="border-b border-line/60 last:border-0">
                    <td className="whitespace-nowrap px-4 py-2 font-semibold text-ink">{b.label}</td>
                    <td className="whitespace-nowrap px-4 py-2 font-mono text-ink-soft">{b.points}</td>
                    <td className="px-4 py-2 text-ink-soft">{b.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {wu.dominantTenGods.length > 0 ? (
            <div className="mt-4 rounded-md border border-line bg-cloud p-5">
              <p className="mb-3 text-sm font-semibold text-ink">สิบเทพเด่นในดวง (十神)</p>
              <div className="grid gap-2 md:grid-cols-2">
                {wu.dominantTenGods.map((t) => (
                  <div key={t.cn} className="text-sm text-ink-soft">
                    <span className="font-cjk font-semibold text-ink">{t.cn}</span> {t.th} —{' '}
                    <span className="text-muted">{t.workMeaning}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        {/* ---- ดัชนีสมพงษ์ ---- */}
        <section className="mt-12 print-page-break">
          <SectionHeading index="叁" title={`ความเข้ากันกับ${org.label}`} />
          <div className="flex flex-col items-center gap-6 rounded-lg border border-line bg-cloud p-6 md:flex-row md:items-start print-avoid-break">
            <div className="shrink-0 text-center">
              <ScoreRing score={compatibility.score} size={150} />
              <Badge tone={gradeTone(compatibility.score)} className="mt-2">
                {compatibility.gradeTh}
              </Badge>
            </div>
            <div className="flex-1">
              <p className="text-base leading-relaxed text-ink">{compatibility.summary}</p>
              <div className="mt-4 flex gap-4 text-sm">
                <span className="text-jade">▲ จุดประสาน {positives.length} ปัจจัย</span>
                <span className="text-cinnabar-deep">▼ จุดที่ควรบริหาร {negatives.length} ปัจจัย</span>
              </div>
            </div>
          </div>

          {positives.length > 0 ? (
            <div className="mt-6">
              <p className="mb-3 text-sm font-semibold text-jade">จุดประสาน (合)</p>
              <div className="space-y-3">
                {positives.map((f, i) => (
                  <FactorRow key={`p-${i}`} factor={f} />
                ))}
              </div>
            </div>
          ) : null}

          {negatives.length > 0 ? (
            <div className="mt-6">
              <p className="mb-3 text-sm font-semibold text-cinnabar-deep">จุดที่ควรบริหาร (沖/害/刑)</p>
              <div className="space-y-3">
                {negatives.map((f, i) => (
                  <FactorRow key={`n-${i}`} factor={f} />
                ))}
              </div>
            </div>
          ) : null}
        </section>

        {/* ---- ทีม ---- */}
        {team && team.pairwise.length > 0 ? (
          <section className="mt-12 print-avoid-break">
            <SectionHeading index="肆" title="ความเข้ากันกับทีม" />
            <div className="mb-4 flex items-center gap-4 rounded-md border border-line bg-cloud p-4">
              <ScoreRing score={team.overallScore} size={90} />
              <div>
                <Badge tone={gradeTone(team.overallScore)}>{team.overallGradeTh}</Badge>
                <p className="mt-2 text-sm text-ink-soft">{team.summary}</p>
              </div>
            </div>
            <div className="overflow-x-auto rounded-md border border-line bg-cloud">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line bg-paper-warm/50 text-left text-xs text-muted">
                    <th className="px-4 py-2 font-semibold">สมาชิก</th>
                    <th className="px-4 py-2 font-semibold">ดัชนีสมพงษ์</th>
                    <th className="px-4 py-2 font-semibold">ระดับ</th>
                    <th className="px-4 py-2 font-semibold">ปัจจัยเด่น</th>
                  </tr>
                </thead>
                <tbody>
                  {team.pairwise.map((p) => (
                    <tr key={p.name} className="border-b border-line/60 last:border-0">
                      <td className="whitespace-nowrap px-4 py-2 font-semibold text-ink">{p.name}</td>
                      <td className="whitespace-nowrap px-4 py-2 font-mono text-ink-soft">{p.score}/100</td>
                      <td className="whitespace-nowrap px-4 py-2 text-ink-soft">{p.gradeTh}</td>
                      <td className="px-4 py-2 text-ink-soft">
                        {p.topFactors[0]?.titleTh ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {/* ---- โหงวเฮ้ง ---- */}
        <section className="mt-12 print-avoid-break">
          <SectionHeading index="伍" title="โหงวเฮ้ง (面相)" />
          {faceReading.available && faceReading.sections ? (
            <div className="space-y-4">
              {faceReading.sections.map((s, i) => (
                <div key={i} className="rounded-md border border-line bg-cloud p-5">
                  <p className="mb-2 font-semibold text-ink">{s.title}</p>
                  <p className="text-sm leading-relaxed text-ink-soft">{s.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-gold/40 bg-gold/5 px-4 py-3 text-sm text-ink-soft">
              {faceReading.notice ?? 'รายงานฉบับนี้วิเคราะห์จากผังปาจือเป็นหลัก'}
            </div>
          )}
        </section>

        {/* ---- บทวิเคราะห์เรียบเรียง ---- */}
        <section className="mt-12">
          <SectionHeading index="陸" title="บทวิเคราะห์" />
          <div className="space-y-8">
            {narrative.sections.map((s) => (
              <div key={s.id} className="print-avoid-break">
                <h3 className="mb-2 text-xl font-semibold text-ink">{s.title}</h3>
                <div className="space-y-3">
                  {s.paragraphs.map((para, i) => (
                    <p key={i} className="text-[15px] leading-[1.9] text-ink-soft">
                      {para}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ---- จังหวะเวลา ---- */}
        <section className="mt-12 print-avoid-break">
          <SectionHeading index="柒" title={`จังหวะเวลา ปี ${annual.year}`} />
          <div className="rounded-md border border-line bg-cloud p-5">
            <div className="flex items-center gap-3">
              <span className="font-cjk text-2xl font-bold text-cinnabar">{annual.ganzhi}</span>
              <span className="text-sm text-ink-soft">ปี{annual.animalTh}</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">{annual.summary}</p>
          </div>
        </section>

        <GoldDivider className="mt-12" />

        {/* ---- หมายเหตุ / Disclaimer ---- */}
        <section className="mt-6 rounded-lg border border-gold/40 bg-paper-warm/60 p-6 print-avoid-break">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
            <Seal size={22} /> หมายเหตุสำคัญ
          </p>
          <ul className="space-y-2 text-xs leading-relaxed text-ink-soft">
            {data.disclaimer.map((d, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-gold">◆</span>
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* footer ในเอกสาร */}
        <footer className="mt-8 flex items-center justify-between border-t border-line pt-4 text-xs text-muted">
          <span className="font-mono">{accessCode}</span>
          <span className="flex items-center gap-1.5">
            <span className="font-cjk">命合</span> Mìnghé · เอกสารลับเฉพาะบุคคล
          </span>
        </footer>
      </article>
    </div>
  )
}
