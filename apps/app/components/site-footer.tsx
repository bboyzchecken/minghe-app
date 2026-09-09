'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { isWorkspacePath } from './workspace/shell'
import { ELEMENT_ORDER } from '@/lib/brand'
import { ElementIcon } from './element-icon'
import { Logo } from './logo'
import { SELLER } from '@/lib/legal'
import { openCookieSettings } from '@/lib/analytics'
import { GA_ID } from '@/lib/env'

export function SiteFooter() {
  const pathname = usePathname()
  if (isWorkspacePath(pathname)) return null
  return (
    <footer className="no-print mt-24 border-t border-line bg-paper-warm/60">
      <div className="container-page py-12">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <Logo variant="lockup" height={38} />
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
          <div className="grid grid-cols-2 gap-x-8 gap-y-6 text-sm sm:grid-cols-4">
            <div>
              <div className="mb-2 font-medium text-ink">ผลิตภัณฑ์</div>
              <ul className="space-y-1.5 text-ink-soft">
                <li><Link href="/employer" className="hover:text-gold">สำหรับองค์กร</Link></li>
                <li><Link href="/jobseeker" className="hover:text-gold">สำหรับคนทำงาน</Link></li>
                <li><Link href="/pricing/employer" className="hover:text-gold">ราคา · องค์กร</Link></li>
                <li><Link href="/pricing/jobseeker" className="hover:text-gold">ราคา · คนทำงาน</Link></li>
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
                <li><Link href="/elements" className="hover:text-gold">ก้านวันทั้ง 10 แบบ</Link></li>
                <li><Link href="/about" className="hover:text-gold">จดหมายจากทีมซินแส</Link></li>
                <li><Link href="/legal/privacy" className="hover:text-gold">นโยบายความเป็นส่วนตัว (PDPA)</Link></li>
                <li><Link href="/legal/terms" className="hover:text-gold">เงื่อนไขการใช้งาน</Link></li>
                <li><Link href="/legal/refund" className="hover:text-gold">การคืนเงิน / ลบบัญชี</Link></li>
                <li><Link href="/legal/cookies" className="hover:text-gold">นโยบายคุกกี้</Link></li>
                {/* ถอนความยินยอมต้องง่ายพอ ๆ กับตอนให้ — ซ่อนเมื่อไม่มีคุกกี้สถิติให้ตั้งค่า */}
                {GA_ID && (
                  <li>
                    <button type="button" onClick={openCookieSettings} className="hover:text-gold">
                      ตั้งค่าคุกกี้
                    </button>
                  </li>
                )}
              </ul>
            </div>
            <div>
              {/* F-19 — อีเมลติดต่อตามสไลด์หน้า 10 */}
              <div className="mb-2 font-medium text-ink">ติดต่อ</div>
              <ul className="space-y-1.5 text-ink-soft">
                <li>
                  <a href="mailto:info@minghe.work" className="hover:text-gold">
                    info@minghe.work
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="gold-divider my-8" />

        {/* ข้อมูลผู้ขาย — GB Prime Pay บังคับให้แสดงบนเว็บ (Q0-3 / F-01) */}
        <div className="mb-6 text-xs leading-6 text-muted">
          <div className="mb-1 font-medium text-ink-soft">ข้อมูลผู้ให้บริการ</div>
          <div>
            {SELLER.legalName} · เลขทะเบียน {SELLER.registrationNo}
          </div>
          <div>{SELLER.address}</div>
          <div>ราคาทั้งหมดบนเว็บไซต์เป็นเงินบาท (THB) · ชำระผ่านบัตรเครดิต/เดบิต และ QR PromptPay</div>
        </div>

        <div className="flex flex-col gap-2 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>© {2026} 命合 Mìnghé · minghe.work</span>
          <span>ข้อมูลประกอบการพิจารณาเชิงโหราศาสตร์จีน ใช้เป็นข้อมูลเสริม ไม่ใช่เกณฑ์ตัดสินเพียงอย่างเดียว</span>
        </div>
      </div>
    </footer>
  )
}
