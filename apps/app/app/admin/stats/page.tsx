'use client'

/**
 * Admin · สถิติ — ย้อนหลังเป็นวัน / เดือน / ปี
 *   1) รายได้แยกฝั่ง + คืนเงิน + สมัครใหม่ (กราฟ + ตาราง)
 *   2) Funnel: คนเดินถึงขั้นไหนกี่คน หลุดตรงไหนมากสุด
 *   3) รายชื่อคนที่ลองเล่นแล้วไม่จ่าย → กด "ให้สิทธิ์ทดลอง" ได้จากตรงนี้เลย
 */

import { useState } from 'react'
import { RevenueChart, FunnelBars, bucketLabel } from '@/components/workspace/charts'
import { GrantCreditModal } from '@/components/workspace/grant-credit-modal'
import { Icon } from '@/components/workspace/icons'
import { Badge, Notice, PageHeader, Panel, ProductBadge, Segmented, Skeleton, StatTile, TableWrap, baht, relTime } from '@/components/workspace/ui'
import type { DropoffUser, StatsGranularity } from '@/lib/api'
import { useAdminStats } from '@/lib/queries'
import { stepLabel } from '@/lib/track'

export default function AdminStatsPage() {
  const [g, setG] = useState<StatsGranularity>('month')
  const [product, setProduct] = useState<'employer' | 'jobseeker'>('employer')
  const [granting, setGranting] = useState<DropoffUser | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const stats = useAdminStats(g)

  const series = stats.data?.series ?? []
  const totals = series.reduce(
    (acc, b) => ({
      emp: acc.emp + b.revenueEmployer,
      js: acc.js + b.revenueJobseeker,
      refunds: acc.refunds + b.refunds,
      signups: acc.signups + b.signups,
      started: acc.started + b.trialsStarted,
      paid: acc.paid + b.trialsPaid,
    }),
    { emp: 0, js: 0, refunds: 0, signups: 0, started: 0, paid: 0 },
  )
  const funnel = (stats.data?.funnel ?? []).filter((f) => f.product === product).sort((a, b) => a.index - b.index)
  const rangeLabel = g === 'day' ? '30 วันล่าสุด' : g === 'month' ? '12 เดือนล่าสุด' : '5 ปีล่าสุด'

  return (
    <>
      <PageHeader
        eyebrow="Analytics"
        title="สถิติ"
        description="รายได้ ผู้ใช้ และพฤติกรรมก่อนจ่ายเงิน — ดูย้อนหลังได้เป็นวัน เดือน ปี"
        actions={
          <Segmented
            value={g}
            onChange={setG}
            options={[
              { id: 'day', label: 'รายวัน' },
              { id: 'month', label: 'รายเดือน' },
              { id: 'year', label: 'รายปี' },
            ]}
          />
        }
      />

      {notice && <Notice tone="success" onClose={() => setNotice(null)}>{notice}</Notice>}

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatTile label={`รายได้องค์กร · ${rangeLabel}`} value={baht(totals.emp)} tone="accent" icon="wallet" />
        <StatTile label={`รายได้คนทำงาน · ${rangeLabel}`} value={baht(totals.js)} tone="success" icon="wallet" />
        <StatTile label="คืนเงิน" value={baht(totals.refunds)} tone={totals.refunds > 0 ? 'danger' : 'neutral'} icon="receipt" />
        <StatTile label="สมัครใหม่" value={totals.signups.toLocaleString('th-TH')} icon="users" />
        <StatTile
          label="เริ่มลอง → จ่าย"
          value={totals.started > 0 ? `${Math.round((totals.paid / totals.started) * 100)}%` : '—'}
          tone="violet"
          icon="chart"
          hint={`${totals.paid} / ${totals.started} คน`}
        />
      </div>

      <Panel title="รายได้ตามช่วงเวลา" description="สุทธิหลังคืนเงิน" className="mb-5">
        {stats.isPending ? <Skeleton rows={1} height="h-60" /> : <RevenueChart series={series} granularity={g} height={240} />}
      </Panel>

      <Panel title="ตารางย้อนหลัง" description={rangeLabel} className="mb-5" padded={false}>
        {stats.isPending ? (
          <div className="p-5"><Skeleton rows={4} height="h-8" /></div>
        ) : (
          <div className="px-4 md:px-5">
            <TableWrap>
              <thead>
                <tr>
                  <th className="ws-th">ช่วง</th>
                  <th className="ws-th text-right">องค์กร</th>
                  <th className="ws-th text-right">คนทำงาน</th>
                  <th className="ws-th text-right">รวมสุทธิ</th>
                  <th className="ws-th text-right">คืนเงิน</th>
                  <th className="ws-th text-right">คำสั่งซื้อ</th>
                  <th className="ws-th text-right">สมัครใหม่</th>
                  <th className="ws-th text-right">เริ่มลอง</th>
                  <th className="ws-th text-right">จ่าย</th>
                  <th className="ws-th text-right">แปลง</th>
                </tr>
              </thead>
              <tbody>
                {[...series].reverse().map((b) => (
                  <tr key={b.key} className="ws-row">
                    <td className="ws-td whitespace-nowrap font-medium">{bucketLabel(b.key, g)}</td>
                    <td className="ws-td ws-mono text-right">{baht(b.revenueEmployer)}</td>
                    <td className="ws-td ws-mono text-right">{baht(b.revenueJobseeker)}</td>
                    <td className="ws-td ws-mono text-right font-semibold">{baht(b.revenueEmployer + b.revenueJobseeker)}</td>
                    <td className={`ws-td ws-mono text-right ${b.refunds > 0 ? 'text-ws-danger' : 'text-ws-faint'}`}>{b.refunds > 0 ? baht(b.refunds) : '—'}</td>
                    <td className="ws-td ws-mono text-right">{b.ordersEmployer + b.ordersJobseeker}</td>
                    <td className="ws-td ws-mono text-right">{b.signups}</td>
                    <td className="ws-td ws-mono text-right">{b.trialsStarted}</td>
                    <td className="ws-td ws-mono text-right">{b.trialsPaid}</td>
                    <td className="ws-td ws-mono text-right text-ws-muted">{b.trialsStarted > 0 ? `${Math.round((b.trialsPaid / b.trialsStarted) * 100)}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          </div>
        )}
      </Panel>

      <div className="grid gap-5 xl:grid-cols-[1fr_1.4fr]">
        <Panel
          title="Funnel ก่อนจ่ายเงิน"
          description="นับคน (ไม่นับครั้ง) ที่ไปถึงแต่ละขั้น — ตัวเลขแดงคือ % ที่หลุดจากขั้นก่อนหน้า"
          action={
            <Segmented
              value={product}
              onChange={setProduct}
              options={[
                { id: 'employer', label: 'องค์กร' },
                { id: 'jobseeker', label: 'คนทำงาน' },
              ]}
            />
          }
        >
          {stats.isPending ? (
            <Skeleton rows={5} height="h-8" />
          ) : funnel.length === 0 ? (
            <p className="text-sm text-ws-muted">ยังไม่มีข้อมูลในช่วงนี้</p>
          ) : (
            <FunnelBars steps={funnel.map((f) => ({ label: stepLabel(f.step), count: f.count }))} color={product === 'employer' ? '#2563EB' : '#16A34A'} />
          )}
        </Panel>

        <Panel
          title="ลองเล่นแล้วไม่จ่าย"
          description="คนที่เปิดหน้ากรอกแล้วไม่ถึงขั้นชำระเงิน — ทักกลับหรือให้สิทธิ์ทดลองได้จากตรงนี้"
          padded={false}
        >
          {stats.isPending ? (
            <div className="p-5"><Skeleton rows={4} height="h-10" /></div>
          ) : (stats.data?.dropoffs ?? []).length === 0 ? (
            <p className="p-5 text-sm text-ws-muted">ยังไม่มีข้อมูล</p>
          ) : (
            <ul className="divide-y divide-ws-border">
              {(stats.data?.dropoffs ?? []).map((d) => (
                <li key={`${d.anonId}:${d.product}`} className="flex flex-wrap items-center gap-3 px-4 py-3 md:px-5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-medium text-ws-ink">{d.name || d.email || 'ยังไม่ล็อกอิน'}</span>
                      <ProductBadge product={d.product} />
                      {d.hasCredit && <Badge tone="success" dot>ให้สิทธิ์แล้ว</Badge>}
                    </div>
                    <div className="mt-0.5 text-xs text-ws-muted">
                      {d.email && <span className="ws-mono">{d.email} · </span>}
                      หยุดที่ <b className="text-ws-text">{stepLabel(d.lastStep)}</b> · {relTime(d.lastSeenAt)}
                    </div>
                  </div>
                  {d.userId ? (
                    <button onClick={() => setGranting(d)} disabled={d.hasCredit} className="ws-btn-soft ws-btn-sm">
                      <Icon name="gift" size={14} /> ให้สิทธิ์ทดลอง
                    </button>
                  ) : (
                    <span className="text-[11px] text-ws-faint">ยังไม่มีบัญชี — ให้สิทธิ์ไม่ได้</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <GrantCreditModal
        user={granting && granting.userId ? { id: granting.userId, email: granting.email, name: granting.name } : null}
        onClose={() => setGranting(null)}
        onDone={setNotice}
      />
    </>
  )
}
