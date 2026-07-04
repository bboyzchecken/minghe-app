import Link from 'next/link'
import { BrandLockup } from './ui'

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-paper-warm/60">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-3">
        <div>
          <BrandLockup />
          <p className="mt-4 max-w-xs text-sm text-muted">
            แพลตฟอร์มวิเคราะห์ความเหมาะสมของคนกับองค์กร ด้วยปาจือ (八字) และโหงวเฮ้ง —
            เมื่อ &ldquo;คนที่ใช่&rdquo; เจอ &ldquo;ที่ที่ใช่&rdquo;
          </p>
        </div>
        <div className="text-sm">
          <p className="mb-3 font-semibold text-ink">บริการ</p>
          <ul className="space-y-2 text-muted">
            <li>
              <Link href="/order/new" className="hover:text-cinnabar">
                เริ่มวิเคราะห์ความเหมาะสม
              </Link>
            </li>
            <li>
              <Link href="/pricing" className="hover:text-cinnabar">
                ราคาและแพ็กเกจ
              </Link>
            </li>
            <li>
              <Link href="/r" className="hover:text-cinnabar">
                เปิดรายงานด้วยรหัส
              </Link>
            </li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="mb-3 font-semibold text-ink">ความเป็นส่วนตัว</p>
          <ul className="space-y-2 text-muted">
            <li>
              <Link href="/privacy" className="hover:text-cinnabar">
                นโยบายความเป็นส่วนตัว (PDPA)
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-cinnabar">
                ข้อตกลงการใช้งาน
              </Link>
            </li>
          </ul>
          <p className="mt-4 text-xs text-muted/80">
            ผลวิเคราะห์เป็นข้อมูลประกอบการพิจารณาเชิงโหราศาสตร์จีน
            ควรใช้ร่วมกับทักษะ ประสบการณ์ และการสัมภาษณ์
          </p>
        </div>
      </div>
      <div className="border-t border-line/60 py-4 text-center text-xs text-muted">
        © {new Date().getFullYear()} 命合 Mìnghé · หมิงเหอ
      </div>
    </footer>
  )
}
