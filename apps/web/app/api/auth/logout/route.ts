/**
 * POST /api/auth/logout — ออกจากระบบ (เรียกจาก <form method="post"> ใน layout)
 * ลบ session cookie แล้วพากลับหน้าแรก
 */

import { NextRequest, NextResponse } from 'next/server'
import { clearSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  await clearSession()
  // 303 See Other — บังคับ browser เปลี่ยน POST เป็น GET ตอน redirect
  return NextResponse.redirect(new URL('/', req.url), 303)
}
