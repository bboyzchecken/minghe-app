import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

/**
 * อ่าน .env ของ root project
 *
 * ทั้งหน้าเว็บและ Go API อ่านไฟล์เดียวกัน — สลับ mock/live ที่ไฟล์นั้นที่เดียว
 * ตัวแปรถูกฝังตอน build ดังนั้นถ้าแก้ .env ต้องรีสตาร์ต dev server (หรือ build ใหม่)
 */
function readRootEnv() {
  const candidates = [resolve(here, '../../.env'), resolve(here, '../../.env.example')]

  for (const path of candidates) {
    let raw
    try {
      raw = readFileSync(path, 'utf8')
    } catch {
      continue
    }

    const env = {}
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq < 1) continue
      const key = trimmed.slice(0, eq).trim()
      let value = trimmed.slice(eq + 1).trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      env[key] = value
    }
    return env
  }
  return {}
}

const rootEnv = readRootEnv()

// process.env ชนะไฟล์เสมอ เผื่อต้องการ override ตอนสั่ง build ใน CI
const pick = (key, fallback) => process.env[key] ?? rootEnv[key] ?? fallback

// ค่าที่ไม่รู้จักถือเป็น live — กันการเผลอปล่อยบัญชีทดลองขึ้นของจริง
const mode = pick('MINGHE_MODE', 'mock') === 'mock' ? 'mock' : 'live'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prototype แบบ static ล้วน — `next build` export เป็นไฟล์ static ใน ./out
  // โหมด live เรียก Go API จากเบราว์เซอร์ตรง ๆ จึงยังไม่ต้องมี server ฝั่ง Next
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  // ใช้ซอร์ส TypeScript ของ workspace โดยตรง (คำนวณปาจือ + ประกอบรายงานฝั่ง client)
  transpilePackages: ['@minghe/core', '@minghe/report'],

  env: {
    NEXT_PUBLIC_MINGHE_MODE: mode,
    NEXT_PUBLIC_API_BASE_URL: pick('MINGHE_API_BASE_URL', 'http://localhost:5000'),
    NEXT_PUBLIC_GOOGLE_LOGIN_ENABLED: pick('MINGHE_GOOGLE_LOGIN_ENABLED', 'false'),
    NEXT_PUBLIC_GA_ID: pick('MINGHE_GA_ID', ''),
  },
}

console.log(`[minghe] โหมด: ${mode}`)

export default nextConfig
