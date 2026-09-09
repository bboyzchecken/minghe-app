import Link from 'next/link'
import type { Metadata } from 'next'
import { ElementIcon } from '@/components/element-icon'
import { Picture } from '@/components/picture'

export const metadata: Metadata = { title: 'สำหรับคนทำงาน' }

const WHY = [
  { el: 'water' as const, title: 'รู้ก่อนตัดสินใจ', desc: 'ก่อนตอบรับ offer หรือย้ายงาน — ดูว่าพลังงานองค์กรส่งเสริมหรือต้านดวงคุณ' },
  { el: 'wood' as const, title: 'เลือกที่ที่ใช่', desc: 'บางที่ทำให้คุณเปล่งประกาย บางที่ทำให้เหนื่อยโดยไม่รู้ตัว — ธาตุองค์กรมีผล' },
  { el: 'metal' as const, title: 'วางแผนจังหวะ', desc: 'ดูจังหวะดวงปีจร ช่วงเปลี่ยนงาน/เติบโต และจุดติดขัดที่ควรระวัง' },
]

const INPUTS = [
  'วันก่อตั้งบริษัท (ถ้าทราบ) — ให้ผลแม่นที่สุด',
  'ประเภทอุตสาหกรรม — ใช้ธาตุอุตสาหกรรมแทนได้',
  'ทิศทางที่ตั้ง (ฮวงจุ้ย)',
  'ขนาด/ลักษณะองค์กร (สตาร์ทอัพ vs องค์กรใหญ่)',
]

export default function JobSeekerIntro() {
  return (
    <div className="py-14 md:py-20">
      <section className="container-page grid gap-8 md:grid-cols-[1.1fr_0.9fr] md:items-center">
        <div>
          <span className="chip" style={{ borderColor: '#5E9BB566', color: '#5E9BB5' }}>
            <ElementIcon element="water" size={14} /> สำหรับคนทำงาน
          </span>
          <h1 className="mt-4 font-display-en text-5xl font-semibold text-ink">Job Seeker</h1>
          <p className="mt-4 max-w-lg text-lg text-ink-soft">
            ไม่ใช่แค่บริษัทที่เลือกคุณ — คุณก็เลือกบริษัทได้ เช็กว่าดวงคุณสมพงษ์กับที่นั่นไหม
            ก่อนทุ่มเทเวลาให้ที่ที่อาจไม่ส่งเสริมกัน
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/jobseeker/new" className="btn-primary">เช็กบริษัทเลย</Link>
            <Link href="/jobseeker/dashboard" className="btn-ghost">ดู Dashboard ตัวอย่าง</Link>
          </div>
          <div className="mt-6 text-sm text-ink-soft">
            <b className="text-ink">199 บาท / บริษัท</b> · หรือสมาชิก 399/เดือน (3 บริษัท/สัปดาห์)
            {' '}
            <Link href="/pricing/jobseeker" className="whitespace-nowrap text-gold hover:underline">
              ดูราคาฝั่งคนทำงานทั้งหมด →
            </Link>
          </div>
        </div>
        <div className="relative">
          <div className="overflow-hidden rounded-[28px] border border-line shadow-lift">
            <Picture
              src="/img/jobseeker.jpg"
              alt="Job Seeker"
              className="aspect-[4/5] w-full object-cover object-top"
              width={1024}
              height={1280}
              priority
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/30 to-transparent" />
          </div>
          <div className="absolute -bottom-5 -right-3 w-[78%] rounded-2xl border border-white/40 bg-cloud/85 p-5 shadow-lift backdrop-blur-md sm:-right-5">
            <div className="text-xs font-medium text-ink-soft">ข้อมูลบริษัทที่ใช้เช็ก</div>
            <ul className="mt-3 space-y-2">
              {INPUTS.map((t, i) => (
                <li key={t} className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-element-water/15 text-[10px] font-semibold text-element-water">
                    {i + 1}
                  </span>
                  <span className="text-xs text-ink-soft">{t}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] text-muted">กรอกเองได้ทันที — เฟสถัดไปเชื่อม DBD ค้นบริษัทอัตโนมัติ</p>
          </div>
        </div>
      </section>

      <section className="container-page mt-16">
        <h2 className="text-center text-3xl">ทำไมต้องเช็กก่อน</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          {WHY.map((f) => (
            <div key={f.title} className="rounded-xl border border-line bg-card p-6 shadow-soft">
              <ElementIcon element={f.el} size={26} />
              <h3 className="mt-3 text-lg">{f.title}</h3>
              <p className="mt-1.5 text-sm text-ink-soft">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page mt-16">
        <div className="rounded-xl bg-ink px-8 py-12 text-center text-paper">
          <h2 className="text-3xl text-paper">ที่ที่ใช่ กำลังรออยู่</h2>
          <p className="mx-auto mt-2 max-w-lg text-paper/80">เริ่มเช็กบริษัทแรกได้ทันที สมัครสมาชิกตอนชำระเงิน</p>
          <Link href="/jobseeker/new" className="btn-primary mt-6">เช็กบริษัท</Link>
        </div>
      </section>
    </div>
  )
}
