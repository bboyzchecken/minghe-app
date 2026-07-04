/**
 * /admin/users — ผู้ใช้ทั้งหมด + ฟอร์มปรับเครดิตต่อแถว
 */

import type { Metadata } from 'next'
import { prisma } from '@minghe/db'
import { Badge, Card } from '@/components/ui'
import { formatThaiDate } from '@/lib/utils'
import { CreditForm } from './credit-form'

export const metadata: Metadata = { title: 'ผู้ใช้ทั้งหมด' }
export const dynamic = 'force-dynamic'

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      credits: true,
      createdAt: true,
      _count: { select: { orders: true } },
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">ผู้ใช้ทั้งหมด</h1>
        <p className="mt-1 text-sm text-muted">
          สมาชิกในระบบ {users.length} บัญชี — ปรับเครดิตรายงานได้จากตารางนี้ (เครดิต 1 หน่วย = รายงาน 1 ฉบับ)
        </p>
      </div>

      <Card>
        {users.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">ยังไม่มีผู้ใช้ในระบบ</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-semibold text-muted">
                  <th className="px-3 py-2">อีเมล</th>
                  <th className="px-3 py-2">ชื่อ</th>
                  <th className="px-3 py-2">บทบาท</th>
                  <th className="px-3 py-2 text-right">เครดิต</th>
                  <th className="px-3 py-2 text-right">ออเดอร์</th>
                  <th className="px-3 py-2">สมัครเมื่อ</th>
                  <th className="px-3 py-2">ปรับเครดิต</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-line/60 last:border-0 hover:bg-paper-warm">
                    <td className="px-3 py-2.5 font-medium text-ink">{user.email}</td>
                    <td className="px-3 py-2.5 text-ink-soft">{user.name ?? '—'}</td>
                    <td className="px-3 py-2.5">
                      {user.role === 'ADMIN' ? (
                        <Badge tone="gold">ผู้ดูแลระบบ</Badge>
                      ) : (
                        <Badge tone="neutral">ลูกค้า</Badge>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono font-semibold text-ink">
                      {user.credits}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs text-ink-soft">
                      {user._count.orders}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-xs text-ink-soft">
                      {formatThaiDate(user.createdAt)}
                    </td>
                    <td className="px-3 py-2.5">
                      <CreditForm userId={user.id} email={user.email} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
