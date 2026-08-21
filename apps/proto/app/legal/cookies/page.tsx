import { LegalStub } from '@/components/legal-stub'

export const metadata = { title: 'นโยบายคุกกี้' }

export default function CookiesPage() {
  return (
    <LegalStub
      title="นโยบายคุกกี้"
      cn="Cookie 政策"
      purpose="อธิบายว่าเว็บไซต์ใช้คุกกี้และเทคโนโลยีคล้ายกันอย่างไร แยกตามประเภท และผู้ใช้จัดการความยินยอมได้อย่างไร"
      needs={[
        'รายการคุกกี้ที่ใช้จริง แยกเป็น จำเป็น / วิเคราะห์ / การตลาด',
        'ใช้ analytics เจ้าไหน (GA4, Vercel Analytics, อื่น ๆ)',
        'ต้องมี cookie consent banner หรือไม่ — ขึ้นกับว่ามีคุกกี้ที่ไม่จำเป็นหรือเปล่า',
        'ระยะเวลาจัดเก็บของคุกกี้แต่ละตัว',
      ]}
    />
  )
}
