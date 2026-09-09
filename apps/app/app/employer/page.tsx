import Link from 'next/link'
import type { Metadata } from 'next'
import { ElementIcon } from '@/components/element-icon'
import { Picture } from '@/components/picture'

export const metadata: Metadata = { title: 'สำหรับองค์กร' }

const FEATURES = [
  {
    el: 'metal' as const,
    title: 'Cross-Data Processing',
    desc: 'วิเคราะห์รวมหลายชั้นในครั้งเดียว — ดวงผู้บริหาร × วันก่อตั้งบริษัท × ธาตุอุตสาหกรรม เพื่อเห็นภาพความเข้ากันรอบด้าน',
  },
  {
    el: 'water' as const,
    title: 'Profile Memory & Auto-Fill',
    desc: 'ตั้งโปรไฟล์บริษัทและผู้บริหารครั้งเดียว ระบบจำถาวร ครั้งต่อไป auto-fill ไม่ต้องกรอกซ้ำ',
  },
  {
    el: 'wood' as const,
    title: 'Team Roster',
    desc: 'จำรายชื่อทีม เลือกจากคลัง เพิ่ม/แก้/ลบได้ วิเคราะห์ความเข้ากันทั้งทีม — 5 คนแรกฟรี',
  },
  {
    el: 'earth' as const,
    title: 'เกณฑ์อ่านดวงโดยซินแส',
    desc: 'ซินแสเป็นผู้กำหนดกฎการอ่านดวงและอนุมัติเกณฑ์ทั้งหมด — ระบบประมวลผลตามเกณฑ์นั้นและส่งรายงานอัตโนมัติทุกฉบับ',
  },
  {
    el: 'fire' as const,
    title: 'รหัสเปิดที่ปลอดภัย',
    desc: 'รายงานทุกฉบับส่งด้วยรหัสเปิด (PJX-XXXX-XXXX) ตั้ง PIN / กำหนดวันหมดอายุ / เพิกถอนได้ พร้อม audit log',
  },
  {
    el: 'metal' as const,
    title: 'สิบเทพ % + ดาวจุติ',
    desc: 'รายงานเชิงลึกแสดงโครงสร้างสิบเทพเป็นเปอร์เซ็นต์ และดาวจุติ (桃花/文昌/天乙贵人) ที่สะท้อนพรสวรรค์การทำงาน',
  },
]

const INPUTS = [
  'วันจดทะเบียนบริษัท (ธาตุก่อตั้ง / จุดกำเนิดพลังงานองค์กร)',
  'ธาตุอุตสาหกรรม (ประเภทธุรกิจส่งเสริมธาตุเจ้าเรือนไหม)',
  'ที่ตั้ง / ทิศทาง (ฮวงจุ้ย)',
  'ลักษณะ & ขนาดองค์กร (Agile เล็ก vs Corporate ใหญ่)',
]

export default function EmployerIntro() {
  return (
    <div className="py-14 md:py-20">
      <section className="container-page grid gap-8 md:grid-cols-[1.1fr_0.9fr] md:items-center">
        <div>
          <span className="chip" style={{ borderColor: '#BE8A2E66', color: '#BE8A2E' }}>
            <ElementIcon element="metal" size={14} /> สำหรับองค์กร
          </span>
          <h1 className="mt-4 font-display-en text-5xl font-semibold text-ink">Employer</h1>
          <p className="mt-4 max-w-lg text-lg text-ink-soft">
            มองหา candidate ที่เข้ากับผู้บริหาร ทีม และวัฒนธรรมองค์กร — วิเคราะห์ความสมพงษ์ด้วยปาจือ
            ก่อนตัดสินใจจ้างหรือจัดทีม เพื่อลดแรงเสียดทานและวางคนให้ถูกที่
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/employer/new" className="btn-primary">เริ่มวิเคราะห์ candidate</Link>
            <Link href="/employer/dashboard" className="btn-ghost">ดู Dashboard ตัวอย่าง</Link>
          </div>
          <div className="mt-6 text-sm text-ink-soft">
            สมาชิก <b className="text-ink">699 บาท/เดือน</b> · โควตา 6 candidate/สัปดาห์ · เกินโควตาจ่ายรายหัว 199/299/399
            {' '}
            <Link href="/pricing/employer" className="whitespace-nowrap text-gold hover:underline">
              ดูราคาฝั่งองค์กรทั้งหมด →
            </Link>
          </div>
        </div>
        <div className="relative">
          <div className="overflow-hidden rounded-[28px] border border-line shadow-lift">
            <Picture
              src="/img/employer.jpg"
              alt="Employer"
              className="aspect-[4/5] w-full object-cover object-top"
              width={1024}
              height={1280}
              priority
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/30 to-transparent" />
          </div>
          <div className="absolute -bottom-5 -left-3 w-[78%] rounded-2xl border border-white/40 bg-cloud/85 p-5 shadow-lift backdrop-blur-md sm:-left-5">
            <div className="text-xs font-medium text-ink-soft">ข้อมูลที่ใช้คำนวณความสมพงษ์</div>
            <ul className="mt-3 space-y-2">
              {INPUTS.map((t, i) => (
                <li key={t} className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-gold/15 text-[10px] font-semibold text-gold">
                    {i + 1}
                  </span>
                  <span className="text-xs text-ink-soft">{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="container-page mt-16">
        <h2 className="text-center text-3xl">ฟีเจอร์เด่น</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl border border-line bg-card p-6 shadow-soft">
              <div className="flex h-11 w-11 items-center justify-center rounded-full" style={{ background: '#00000008' }}>
                <ElementIcon element={f.el} size={24} />
              </div>
              <h3 className="mt-3 text-lg">{f.title}</h3>
              <p className="mt-1.5 text-sm text-ink-soft">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page mt-16">
        <div className="rounded-xl bg-ink px-8 py-12 text-center text-paper">
          <h2 className="text-3xl text-paper">พร้อมวิเคราะห์ทีมของคุณ?</h2>
          <p className="mx-auto mt-2 max-w-lg text-paper/80">เริ่มกรอกข้อมูลได้ทันที สมัครสมาชิกตอนชำระเงิน</p>
          <Link href="/employer/new" className="btn-primary mt-6">เริ่มวิเคราะห์</Link>
        </div>
      </section>
    </div>
  )
}
