/**
 * ชนิดข้อมูล JSON ที่เก็บในคอลัมน์ subjectData / orgData ของ Order
 * (เก็บเป็น TEXT ที่ serialize แล้ว — พอร์ตได้ทั้ง SQLite และ Postgres
 *  อ่าน/เขียนผ่าน helper ใน index.ts เพื่อคงความ type-safe)
 */

export interface SubjectData {
  name: string
  gender?: 'male' | 'female'
  birthDate: string // 'YYYY-MM-DD' (ค.ศ.)
  birthTime: string // 'HH:mm' — บังคับ (หัวใจของความแม่น)
  province?: string
  longitude?: number
  lateZiRule?: 'same-day' | 'next-day'
  /** อ้างอิงรูปที่อัปโหลด (Asset id) สำหรับอ่านโหงวเฮ้ง */
  photoAssetId?: string
  /** ยืนยันว่าได้รับความยินยอมจากเจ้าของข้อมูลแล้ว (PDPA) */
  consentConfirmed: boolean
}

export interface TeamMemberData {
  name: string
  birthDate: string
  birthTime?: string
  province?: string
}

export type OrgData =
  | {
      mode: 'executive'
      executiveName?: string
      birthDate: string
      birthTime: string
      province?: string
      team?: TeamMemberData[]
    }
  | {
      mode: 'company-date'
      companyName?: string
      foundingDate: string // 'YYYY-MM-DD'
      team?: TeamMemberData[]
    }
  | {
      mode: 'industry'
      industryId: string
      companyName?: string
      team?: TeamMemberData[]
    }

export interface OrderAddon {
  id: 'rush' | 'deep-analysis' | 'sinsae-call'
  priceSatang: number
}

export type OrderStatus = 'pending' | 'processing' | 'completed' | 'failed'
export type UserRole = 'CLIENT' | 'ADMIN'
