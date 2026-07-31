import Link from 'next/link'
import { ELEMENT_ORDER } from '@/lib/brand'
import { ElementIcon } from './element-icon'

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-paper-warm/60">
      <div className="container-page py-12">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <div className="flex items-baseline gap-2">
              <span className="cjk text-xl text-gold">命合</span>
              <span className="font-display-en text-xl font-semibold text-gold">Ming He</span>
            </div>
            <p className="mt-3 text-sm text-ink-soft">
              แพลตฟอร์มวิเคราะห์ความสมพงษ์ระหว่างคนกับองค์กรด้วยศาสตร์ปาจือ (八字)
              แม่นยำระดับซินแสตัวจริง — เมื่อ “คนที่ใช่” เจอ “ที่ที่ใช่”
            </p>
            <div className="mt-4 flex items-center gap-3">
              {ELEMENT_ORDER.map((e) => (
                <ElementIcon key={e} element={e} size={18} />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3">
            <div>
              <div className="mb-2 font-medium text-ink">ผลิตภัณฑ์</div>
              <ul className="space-y-1.5 text-ink-soft">
                <li><Link href="/employer" className="hover:text-gold">สำหรับองค์กร</Link></li>
                <li><Link href="/jobseeker" className="hover:text-gold">สำหรับคนทำงาน</Link></li>
                <li><Link href="/pricing" className="hover:text-gold">ราคา</Link></li>
              </ul>
            </div>
            <div>
              <div className="mb-2 font-medium text-ink">ตัวอย่าง</div>
              <ul className="space-y-1.5 text-ink-soft">
                <li><Link href="/report" className="hover:text-gold">รายงานตัวอย่าง</Link></li>
                <li><Link href="/employer/new" className="hover:text-gold">ทดลองวิเคราะห์</Link></li>
              </ul>
            </div>
            <div>
              <div className="mb-2 font-medium text-ink">ข้อมูล</div>
              <ul className="space-y-1.5 text-ink-soft">
                <li><span className="text-muted">PDPA / ความเป็นส่วนตัว</span></li>
                <li><span className="text-muted">ข้อตกลงการใช้งาน</span></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="gold-divider my-8" />
        <div className="flex flex-col gap-2 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>© {2026} 命合 Mìnghé · เวอร์ชันสาธิต (prototype) — ยังไม่เชื่อมระบบชำระเงินจริง</span>
          <span>ข้อมูลประกอบการพิจารณาเชิงโหราศาสตร์จีน ใช้เป็นข้อมูลเสริม ไม่ใช่เกณฑ์ตัดสินเพียงอย่างเดียว</span>
        </div>
      </div>
    </footer>
  )
}
