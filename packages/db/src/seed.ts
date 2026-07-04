/**
 * Seed ข้อมูลตั้งต้น: แอดมิน + ลูกค้าเดโม + ออเดอร์ตัวอย่างพร้อมรายงาน
 * รัน: pnpm db:seed (หลัง pnpm db:push)
 */

import bcrypt from 'bcryptjs'
import { generateReport } from '@minghe/report'
import { prisma } from './index'
import { serializeOrgData, serializeSubjectData } from './index'
import type { OrgData, SubjectData } from './types'

const DEMO_ACCESS_CODE = 'MH-DEMO-2569'

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@minghe.local'
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'minghe-admin-2026'

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 10),
      name: 'ผู้ดูแลระบบ 命合',
      role: 'ADMIN',
    },
  })
  console.log(`✓ admin: ${admin.email}`)

  const client = await prisma.user.upsert({
    where: { email: 'demo@minghe.local' },
    update: {},
    create: {
      email: 'demo@minghe.local',
      passwordHash: await bcrypt.hash('minghe-demo-2026', 10),
      name: 'บจก. เดโมพาณิชย์',
      role: 'CLIENT',
      credits: 3,
    },
  })
  console.log(`✓ client: ${client.email} (เครดิต ${client.credits})`)

  // ออเดอร์เดโมพร้อมรายงานสมบูรณ์ (เปิดดูได้ทันทีที่ /r/MH-DEMO-2569)
  const existing = await prisma.report.findUnique({ where: { accessCode: DEMO_ACCESS_CODE } })
  if (existing) {
    console.log(`✓ รายงานเดโมมีอยู่แล้ว: ${DEMO_ACCESS_CODE}`)
    return
  }

  const subjectData: SubjectData = {
    name: 'สมชาย ใจดี',
    gender: 'male',
    birthDate: '1992-08-17',
    birthTime: '07:45',
    province: 'กรุงเทพมหานคร',
    consentConfirmed: true,
  }
  const orgData: OrgData = {
    mode: 'executive',
    executiveName: 'คุณวิชัย มั่นคง',
    birthDate: '1970-03-05',
    birthTime: '14:30',
    province: 'เชียงใหม่',
    team: [
      { name: 'สมหญิง รักงาน', birthDate: '1988-11-20', birthTime: '09:00' },
      { name: 'อนันต์ ก้าวหน้า', birthDate: '1995-04-02' },
    ],
  }

  const reportData = await generateReport({
    subject: subjectData,
    org: orgData,
    targetYear: new Date().getFullYear(),
    options: { useAI: false },
  })

  const order = await prisma.order.create({
    data: {
      createdById: client.id,
      status: 'completed',
      subjectData: serializeSubjectData(subjectData),
      orgData: serializeOrgData(orgData),
      priceSatang: 49000,
      completedAt: new Date(),
      payment: {
        create: {
          userId: client.id,
          amount: 49000,
          provider: 'mock',
          status: 'paid',
        },
      },
      report: {
        create: {
          accessCode: DEMO_ACCESS_CODE,
          reportData: JSON.stringify(reportData),
          status: 'ready',
        },
      },
    },
  })
  console.log(`✓ ออเดอร์เดโม ${order.id} + รายงาน ${DEMO_ACCESS_CODE}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
