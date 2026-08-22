'use client'

/**
 * Admin · เอกสารกฎหมาย (F-01) — สถานะ 4 ฉบับที่ payment gateway ต้องการ
 * การเผยแพร่ต้องผ่านการตรวจโดยผู้รับผิดชอบก่อน จึงยังไม่มีปุ่ม publish บนหน้านี้
 */

import Link from 'next/link'
import { Icon } from '@/components/workspace/icons'
import { Badge, PageHeader, Panel, Skeleton, StatTile } from '@/components/workspace/ui'
import { useAdminLegal } from '@/lib/queries'

export default function AdminLegalPage() {
  const legal = useAdminLegal()
  const docs = legal.data ?? []
  const published = docs.filter((d) => d.status === 'published').length

  return (
    <>
      <PageHeader eyebrow="Compliance" title="เอกสารกฎหมาย" description="เอกสารทั้ง 4 ฉบับต้องเผยแพร่ครบก่อนยื่นขอ payment gateway (GB Prime Pay)" />

      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <StatTile label="เผยแพร่แล้ว" value={legal.isPending ? '—' : `${published} / ${docs.length || 4}`} icon="file" tone={published === 4 ? 'success' : 'warn'} hint={published < 4 ? 'ยังไม่ครบ — บล็อกการยื่น gateway' : 'ครบแล้ว'} />
        <StatTile label="ขั้นตอนถัดไป" value={<span className="text-base">รอผู้ตรวจเอกสาร</span>} icon="shield" hint="ดู docs/uat-2026-08-01-ask-ajarn-may.md (B1–B3)" />
      </div>

      <Panel title="สถานะรายฉบับ">
        {legal.isPending ? (
          <Skeleton rows={2} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {docs.map((d) => (
              <div key={d.slug} className="flex items-start justify-between gap-3 rounded-xl border border-ws-border p-4">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-ws-ink">{d.title}</div>
                  <div className="ws-mono mt-0.5 text-xs text-ws-muted">/legal/{d.slug} · v{d.version}</div>
                  <Link href={`/legal/${d.slug}`} className="mt-2 inline-flex items-center gap-1 text-xs text-ws-accent hover:underline" target="_blank">
                    เปิดดูหน้าเว็บ <Icon name="external" size={12} />
                  </Link>
                </div>
                {d.status === 'published' ? <Badge tone="success" dot>เผยแพร่แล้ว</Badge> : <Badge tone="warn" dot>ฉบับร่าง</Badge>}
              </div>
            ))}
          </div>
        )}
      </Panel>
    </>
  )
}
