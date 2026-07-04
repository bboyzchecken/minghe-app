/**
 * @minghe/db — Prisma client singleton + typed JSON helpers
 */

import { PrismaClient } from '@prisma/client'
import type { OrgData, OrderAddon, SubjectData } from './types'

export * from './types'
export type { Prisma } from '@prisma/client'
export { PrismaClient }

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

/** Singleton — กัน hot-reload ของ Next.js เปิด connection ซ้ำ */
export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

/** ---- typed JSON (คอลัมน์ TEXT) ---- */

export function parseSubjectData(raw: string): SubjectData {
  return JSON.parse(raw) as SubjectData
}

export function serializeSubjectData(data: SubjectData): string {
  return JSON.stringify(data)
}

export function parseOrgData(raw: string): OrgData {
  return JSON.parse(raw) as OrgData
}

export function serializeOrgData(data: OrgData): string {
  return JSON.stringify(data)
}

export function parseAddons(raw: string): OrderAddon[] {
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as OrderAddon[]) : []
  } catch {
    return []
  }
}

/** parse reportData เป็น unknown — ให้ผู้เรียก cast เป็น ReportData ของ @minghe/report */
export function parseReportData<T = unknown>(raw: string): T {
  return JSON.parse(raw) as T
}
