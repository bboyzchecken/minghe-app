#!/bin/sh
# ============================================================
# 命合 Mìnghé — container entrypoint
# 1) push schema เข้า Postgres (สร้างตารางถ้ายังไม่มี)
# 2) seed ข้อมูลตั้งต้น (admin + รายงานเดโม) — idempotent
# 3) รัน Next.js production server
# ============================================================
set -e

echo "→ [1/3] ปรับ schema ฐานข้อมูล (prisma db push)..."
pnpm --filter @minghe/db exec prisma db push --skip-generate --accept-data-loss

echo "→ [2/3] seed ข้อมูลตั้งต้น (admin + รายงานเดโม MH-DEMO-2569)..."
# seed อ่าน DATABASE_URL/ADMIN_* จาก environment ของ container (ไม่ใช่ไฟล์ .env)
pnpm --filter @minghe/db exec tsx src/seed.ts || echo "  (seed ข้ามไป — อาจมีข้อมูลอยู่แล้ว)"

echo "→ [3/3] เริ่ม 命合 Mìnghé web ที่พอร์ต ${PORT:-3000}..."
exec pnpm --filter @minghe/web start
