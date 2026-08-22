'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ElementIcon } from '@/components/element-icon'

/**
 * สลับหน้าราคาระหว่าง "องค์กร" กับ "คนทำงาน"
 *
 * UAT พบว่าหน้าราคาเดิมวางราคาสองฝั่งไว้หน้าเดียวกัน ผู้ใช้อ่านแล้วสับสนว่าตัวเลขไหนของใคร
 * จึงแยกเป็นสองหน้า และมีแถบนี้ปักไว้ด้านบนตลอด เพื่อให้รู้เสมอว่า "กำลังดูราคาของใครอยู่"
 */
const TABS = [
  { href: '/pricing/employer', label: 'องค์กร / HR', sub: 'หาคนที่ใช่', el: 'metal' as const },
  { href: '/pricing/jobseeker', label: 'คนทำงาน', sub: 'หาที่ที่ใช่', el: 'water' as const },
]

export function AudienceSwitch() {
  const pathname = usePathname()

  return (
    <div className="sticky top-16 z-30 -mx-5 mb-10 border-b border-line/70 bg-paper/90 px-5 py-3 backdrop-blur-md sm:-mx-8 sm:px-8">
      <div className="mx-auto flex max-w-md items-center gap-1.5 rounded-full border border-line bg-cloud p-1.5 shadow-soft">
        {TABS.map((t) => {
          const active = pathname?.startsWith(t.href)
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-label={`ดูราคาสำหรับ${t.label}`}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm transition ${
                active
                  ? 'bg-ink font-medium text-paper shadow-soft'
                  : 'text-ink-soft hover:bg-paper-warm hover:text-ink'
              }`}
            >
              <ElementIcon element={t.el} size={16} />
              <span>{t.label}</span>
              <span className={`hidden text-xs sm:inline ${active ? 'text-paper/60' : 'text-muted'}`}>
                · {t.sub}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
