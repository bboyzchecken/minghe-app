/**
 * /order/new — สร้างออเดอร์ (wizard) เปิดให้ทั้งสมาชิกและ guest
 * server wrapper ส่ง session + เครดิตคงเหลือเข้า client wizard
 */

import { prisma } from '@minghe/db'
import { getSession } from '@/lib/auth'
import { OrderWizard } from './wizard'

export const metadata = { title: 'เริ่มวิเคราะห์ความเหมาะสม' }

export default async function NewOrderPage() {
  const session = await getSession()
  let credits = 0
  if (session) {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { credits: true },
    })
    credits = user?.credits ?? 0
  }

  return (
    <OrderWizard
      isLoggedIn={Boolean(session)}
      credits={credits}
      userEmail={session?.email ?? null}
    />
  )
}
