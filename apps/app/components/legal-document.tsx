import Link from 'next/link'
import { LEGAL_DOCS, PLACEHOLDER_PATTERN, SELLER, type LegalDoc, type LegalSection } from '@/lib/legal'

/**
 * หน้าเอกสารกฎหมาย (F-01)
 *
 * สองอย่างที่ตั้งใจให้มองข้ามไม่ได้ ตราบใดที่ยังเป็นร่าง:
 *   1. แถบบนสุดบอกชัดว่า "ยังไม่มีผลบังคับใช้"
 *   2. ข้อความในวงเล็บเหลี่ยมถูกไฮไลต์ทุกจุด — จะได้เห็นทันทีว่าเหลือช่องไหนต้องเติม
 * เมื่อผู้รับผิดชอบตรวจเสร็จแล้ว เปลี่ยน status เป็น 'published' แถบทั้งสองจะหายไปเอง
 */

/** ไฮไลต์ตัวยึด [...] ที่ยังไม่ได้เติมข้อมูลจริง */
function withPlaceholders(text: string) {
  return text.split(PLACEHOLDER_PATTERN).map((part, i) =>
    part.startsWith('[') && part.endsWith(']') ? (
      <mark key={i} className="rounded bg-terracotta/15 px-1 py-0.5 text-terracotta">
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    ),
  )
}

function Section({ section, index }: { section: LegalSection; index: number }) {
  return (
    <section className="mt-9 scroll-mt-24" id={`s-${index + 1}`}>
      <h2 className="text-xl md:text-2xl">{section.heading}</h2>

      {section.paragraphs?.map((p) => (
        <p key={p} className="mt-3 text-[15px] leading-7 text-ink-soft">
          {withPlaceholders(p)}
        </p>
      ))}

      {section.bullets && (
        <ul className="mt-3 space-y-2">
          {section.bullets.map((b) => (
            <li key={b} className="flex items-start gap-2.5 text-[15px] leading-7 text-ink-soft">
              <span className="mt-3 h-1.5 w-1.5 flex-none rounded-full bg-gold/60" />
              <span>{withPlaceholders(b)}</span>
            </li>
          ))}
        </ul>
      )}

      {section.table && (
        <div className="mt-4 overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead className="bg-paper-warm/60">
              <tr>
                {section.table.head.map((h) => (
                  <th key={h} className="px-4 py-2.5 font-medium text-ink">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.table.rows.map((row) => (
                <tr key={row.join('|')} className="border-t border-line/70 align-top">
                  {row.map((cell) => (
                    <td key={cell} className="px-4 py-2.5 leading-6 text-ink-soft">
                      {withPlaceholders(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {section.callout && (
        <p className="mt-4 rounded-lg border-l-2 border-gold bg-gold/[0.06] px-4 py-3 text-[15px] leading-7 text-ink">
          {withPlaceholders(section.callout)}
        </p>
      )}
    </section>
  )
}

export function LegalDocumentView({ doc }: { doc: LegalDoc }) {
  const isDraft = doc.status === 'draft'

  return (
    <div className="container-page max-w-3xl py-12 md:py-16">
      <span className="eyebrow">เอกสารทางกฎหมาย · {doc.cn}</span>
      <h1 className="mt-3 text-3xl md:text-4xl">{doc.title}</h1>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <span>เวอร์ชัน {doc.version}</span>
        <span>แก้ไขล่าสุด {doc.revised}</span>
        <span>
          สถานะ:{' '}
          <b className={isDraft ? 'text-terracotta' : 'text-jade'}>
            {isDraft ? 'ร่าง — ยังไม่มีผลบังคับใช้' : 'บังคับใช้แล้ว'}
          </b>
        </span>
      </div>

      <p className="mt-5 text-[15px] leading-7 text-ink-soft">{doc.intro}</p>

      {isDraft && (
        <div className="mt-7 rounded-2xl border border-dashed border-terracotta/40 bg-terracotta/[0.05] p-5">
          <div className="font-medium text-ink">เอกสารฉบับร่าง — ต้องผ่านการตรวจก่อนประกาศใช้</div>
          <p className="mt-2 text-sm text-ink-soft">
            เนื้อหาด้านล่างเป็นร่างตั้งต้นที่เขียนตามระบบงานจริงและข้อสรุปที่ตกลงกันไว้
            ยังไม่ผูกพันตามกฎหมายจนกว่า {withPlaceholders(SELLER.reviewer)} จะตรวจและอนุมัติ
            ข้อความในกรอบสีส้มคือช่องที่ยังต้องเติมข้อมูลจริง
          </p>
          <div className="mt-4 text-sm font-medium text-ink">ต้องเติมหรือยืนยันก่อนประกาศใช้</div>
          <ul className="mt-2 space-y-1.5">
            {doc.pending.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-ink-soft">
                <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-terracotta/60" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {doc.sections.map((section, i) => (
        <Section key={section.heading} section={section} index={i} />
      ))}

      <div className="gold-divider my-10" />

      <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
        {LEGAL_DOCS.map((other) => (
          <Link
            key={other.slug}
            href={`/legal/${other.slug}`}
            className={other.slug === doc.slug ? 'font-medium text-ink' : 'text-gold hover:underline'}
          >
            {other.title}
          </Link>
        ))}
      </div>

      <p className="mt-6 text-sm text-muted">
        ติดต่อ:{' '}
        <a href={`mailto:${SELLER.email}`} className="text-gold hover:underline">
          {SELLER.email}
        </a>
      </p>
    </div>
  )
}
