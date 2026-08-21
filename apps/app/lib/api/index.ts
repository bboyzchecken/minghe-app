'use client'

import { IS_MOCK } from '@/lib/env'
import { liveClient } from './live-client'
import { mockClient } from './mock-client'
import type { MingheClient } from './types'

/**
 * client ที่ทั้งเว็บใช้ — เลือกจาก MINGHE_MODE ใน .env ของ root project
 * หน้าเว็บไม่ควรรู้ว่าอยู่โหมดไหน ให้เรียกผ่านตัวนี้อย่างเดียว
 */
export const client: MingheClient = IS_MOCK ? mockClient : liveClient

export * from './types'
export { MOCK_ACCOUNTS } from './mock-accounts'
