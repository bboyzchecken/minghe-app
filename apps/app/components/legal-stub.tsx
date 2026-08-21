import Link from 'next/link'

/**
 * โครงหน้าเอกสารกฎหมาย (F-01)
 *
 * เจตนา: ตอนนี้ยังไม่มีเนื้อหาฉบับจริง — หน้านี้ทำไว้เพื่อให้ลิงก์ในกล่องยินยอม (F-06)
 * และใน footer ไม่ตาย และเพื่อจอง URL ไว้ให้ payment gateway ตรวจ
 * ห้ามใส่ข้อความกฎหมายที่ยังไม่ผ่านการตรวจลงในหน้านี้
 */
export function LegalStub({
  title,
  cn,
  purpose,
  needs,
}: {
  title: string
  cn: string
  purpose: string
  needs: string[]
}) {
  return (
    <div className="container-page max-w-3xl py-14 md:py-20">
      <span className="eyebrow">เอกสารทางกฎหมาย · {cn}</span>
      <h1 className="mt-3 text-3xl md:text-4xl">{title}</h1>
      <p className="mt-4 text-ink-soft">{purpose}</p>

      <div className="mt-8 rounded-2xl border border-dashed border-gold/40 bg-gold/[0.05] p-6">
        <div className="font-medium text-ink">อยู่ระหว่างจัดทำ — ยังไม่มีผลบังคับใช้</div>
        <p className="mt-2 text-sm text-ink-soft">
          เอกสารฉบับจริงต้องผ่านการตรวจโดยผู้รับผิดชอบก่อนเผยแพร่ หน้านี้ถูกสร้างไว้เพื่อจอง URL
          สำหรับยื่นขอ payment gateway และให้ลิงก์ในกล่องยินยอมทำงานได้ระหว่างพัฒนา
        </p>
        <div className="mt-5 text-sm font-medium text-ink">ข้อมูลที่ยังต้องได้มาก่อนร่างเนื้อหา</div>
        <ul className="mt-2 space-y-1.5">
          {needs.map((n) => (
            <li key={n} className="flex items-start gap-2 text-sm text-ink-soft">
              <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-gold/60" />
              {n}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-8 flex flex-wrap gap-4 text-sm">
        <Link href="/legal/terms" className="text-gold hover:underline">เงื่อนไขการใช้งาน</Link>
        <Link href="/legal/privacy" className="text-gold hover:underline">นโยบายความเป็นส่วนตัว</Link>
        <Link href="/legal/refund" className="text-gold hover:underline">นโยบายการคืนเงินและการขอลบบัญชี</Link>
        <Link href="/legal/cookies" className="text-gold hover:underline">นโยบายคุกกี้</Link>
      </div>

      <p className="mt-10 text-sm text-muted">
        ติดต่อ: <a href="mailto:info@minghe.work" className="text-gold hover:underline">info@minghe.work</a>
      </p>
    </div>
  )
}
