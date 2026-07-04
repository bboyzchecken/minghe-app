# 命合 Mìnghé — แพลตฟอร์มดูสมพงษ์คนกับองค์กร

> **เมื่อ "คนที่ใช่" เจอ "ที่ที่ใช่"** — วิเคราะห์ความเหมาะสมของพนักงานกับองค์กร
> ด้วยปาจือ (八字) และโหงวเฮ้ง แม่นยำระดับซินแสตัวจริง ส่งมอบรายงานผ่านรหัสเปิดที่ปลอดภัย

## เริ่มใช้งาน (Local Development)

ต้องมี Node.js ≥ 20 และ pnpm (`npm i -g pnpm`)

```bash
pnpm install                      # ติดตั้ง dependencies ทั้ง monorepo
pnpm --filter @minghe/db db:push  # สร้างฐานข้อมูล SQLite (dev.db)
pnpm --filter @minghe/db db:seed  # แอดมิน + ลูกค้าเดโม + รายงานตัวอย่าง
pnpm --filter @minghe/web dev     # เปิดเว็บที่ http://localhost:3000
```

บัญชีที่ seed ให้:

| บทบาท | อีเมล | รหัสผ่าน |
|--------|-------|----------|
| แอดมิน | `admin@minghe.local` | `minghe-admin-2026` |
| ลูกค้าเดโม (มี 3 เครดิต) | `demo@minghe.local` | `minghe-demo-2026` |

รายงานตัวอย่างเปิดได้ทันทีที่ `/r/MH-DEMO-2569` (ไม่ต้องล็อกอิน)

> ⚠️ เปลี่ยนรหัสผ่านทั้งสองบัญชีก่อนขึ้น production เสมอ (ตั้งผ่าน env `ADMIN_EMAIL` / `ADMIN_PASSWORD` แล้ว seed ใหม่)

### Environment Variables

คัดลอก `.env.example` แล้วปรับค่า — ไฟล์ env ใช้ 2 จุด:

- `packages/db/.env` — `DATABASE_URL` (Prisma CLI + seed)
- `apps/web/.env.local` — `DATABASE_URL`, `AUTH_SECRET`, `ANTHROPIC_API_KEY` (optional), `NEXT_PUBLIC_APP_URL`

**ไม่ใส่ `ANTHROPIC_API_KEY` ก็ใช้งานได้เต็มระบบ** — รายงานใช้ตัวเรียบเรียงไทยแบบ
deterministic และข้ามการอ่านโหงวเฮ้งจากรูป / ใส่ key เมื่อไหร่ ระบบจะเรียก Claude
ขัดเงาภาษารายงาน + อ่านโหงวเฮ้ง (vision) ให้อัตโนมัติ

## สถาปัตยกรรม

```
minghe-app/
├── apps/web/            # Next.js 15 (App Router) — landing + app + API + viewer
│   ├── app/(marketing)/ # landing, pricing, privacy, terms
│   ├── app/(auth)/      # login, register
│   ├── app/(app)/       # dashboard, account (ต้องล็อกอิน)
│   ├── app/order/       # wizard สร้างออเดอร์ (สมาชิก + guest)
│   ├── app/r/[code]/    # เปิดรายงานด้วยรหัส + พิมพ์ PDF
│   ├── app/admin/       # แผงผู้ดูแล
│   └── lib/             # auth (JWT), orders, access-code, rate-limit, pricing
├── packages/core/       # 🎯 เครื่องคำนวณปาจือ (pure TS + เทสต์หนัก)
├── packages/report/     # ประกอบรายงาน + เรียบเรียงไทย + Claude (optional)
└── packages/db/         # Prisma schema + client + seed
```

| ส่วน | เทคโนโลยี |
|------|-----------|
| Monorepo | Turborepo + pnpm workspaces |
| Web | Next.js 15 (App Router) + Tailwind CSS (design tokens ตามแบรนด์) |
| เครื่องคำนวณ | `lunar-typescript` (ผู้พัฒนาเดียวกับ lunar-javascript/lunar-python) |
| ฐานข้อมูล | Prisma — dev: SQLite / prod: PostgreSQL (Supabase/Neon) |
| Auth | JWT session cookie (jose) + bcryptjs — ไม่พึ่งบริการภายนอก |
| AI (optional) | Anthropic API — เรียบเรียงรายงาน + อ่านโหงวเฮ้ง |
| ชำระเงิน | Mock provider (โครงพร้อมต่อ Stripe/Omise ที่ `lib/orders.ts` จุดเดียว) |

## ความแม่นยำของเครื่องคำนวณ (หัวใจของแพลตฟอร์ม)

`packages/core` ตั้งเสาสี่ต้น (四柱) ตามหลักซินแส:

1. **ขอบเขตปี = ลี่ชุน (立春) เวลาจริง** — ไม่ใช่ตรุษจีน/1 ม.ค.
2. **ขอบเขตเดือน = สารทหลัก (節) 12 จุด เวลาจริง**
3. **เสาวัน = วัฏจักร 60 วันต่อเนื่อง**
4. **เสาเวลา = 子時 เริ่ม 23:00** + สูตร 五鼠遁 + กติกา 早/晚子時 (config ได้)
5. **เวลาสุริยะจริง (真太陽時)** — แก้ลองจิจูด (ตาราง 77 จังหวัด) + สมการเวลา
   (กรุงเทพฯ คลาดจากนาฬิกาได้ถึง ~32 นาที — เพียงพอให้เสาเวลาเปลี่ยน)
6. **ขอบปี/เดือนเทียบเวลาสัมบูรณ์** — ตารางสารทอ้างเวลาปักกิ่ง (UTC+8)
   ระบบแปลงเวลาเกิดไทย (UTC+7) เป็นเวลาสัมบูรณ์ก่อนเทียบ (จุดที่ระบบทั่วไปมักพลาด 1 ชม.)

### Validation

```bash
pnpm --filter @minghe/core test   # 69 เทสต์ ต้องผ่าน 100%
```

- เสาวัน 20 วันกระจาย 1900–2026 เทียบ **สูตร JDN อิสระ** (anchor: 1 ต.ค. 1949 = วัน 甲子)
- ดวงอ้างอิงเต็มผัง 5 เคส คำนวณมือด้วยกฎ 五虎遁/五鼠遁
- เคสขอบ: ก่อน/หลังลี่ชุน ±15 นาที, รอยต่อสารท, 22:59/23:01, 早/晚子時 ทั้งสองกติกา
- เคสไทย: เทียบลี่ชุนด้วยเวลาสัมบูรณ์, เวลาสุริยะจริงเปลี่ยนเสาเวลาจริง

**กฎเหล็ก:** engine = คำนวณ / LLM = เรียบเรียงเท่านั้น — ห้ามให้ LLM แตะตัวเลข

## ระบบรหัสเปิดรายงาน (Access Code)

- รูปแบบ `MH-XXXX-XXXX` — crypto random, ตัดอักษรสับสน (I/L/O/U/0/1), entropy ~6.5×10¹¹
- ใครมีรหัสเปิดดู + พิมพ์ PDF ได้โดยไม่ต้องมีบัญชี (เหมาะส่งงาน Fastwork)
- ความปลอดภัย: rate limit ต่อ IP, PIN เสริม (optional), วันหมดอายุ, เพิกถอนจาก admin,
  audit log ทุกการเข้าถึง (เก็บ IP แบบ hash ทางเดียว — PDPA)

## Deploy (Production)

1. **DB:** สร้าง Postgres (Supabase/Neon) → แก้ `packages/db/prisma/schema.prisma`
   `provider = "postgresql"` → ตั้ง `DATABASE_URL` → `pnpm db:push && pnpm db:seed`
2. **Web:** Vercel — root directory `apps/web`, ตั้ง env: `DATABASE_URL`, `AUTH_SECRET`
   (สุ่มใหม่ยาวๆ), `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_APP_URL`, `CRON_SECRET`
3. **Rate limit:** production หลาย instance แนะนำสลับ `lib/rate-limit.ts`
   เป็น Upstash Redis (interface เตรียมไว้แล้ว เปลี่ยนไฟล์เดียว) — โค้ดดึง client IP
   จาก `x-real-ip`/ขวาสุดของ `x-forwarded-for` (กันปลอม XFF)
4. **Retention cron:** `apps/web/vercel.json` ตั้ง Vercel Cron เรียก `/api/cron/purge-photos`
   ทุกวัน (ลบรูปถ่ายใบหน้าที่เกิน 90 วันหลังส่งมอบ ตาม PDPA) — ต้องตั้ง `CRON_SECRET`
4. **รูปอัปโหลด:** MVP เก็บเป็น data URL ใน DB — ปริมาณมากควรย้ายไป
   Supabase Storage / Cloudflare R2 (จุดต่อที่ `lib/orders.ts`)
5. **ชำระเงินจริง:** ต่อ Stripe/Omise ที่ `payOrder()` ใน `lib/orders.ts`

## PDPA

- ขอ consent ชัดเจนก่อนรับข้อมูล/รูป (บังคับใน wizard — สร้างออเดอร์ไม่ได้ถ้าไม่ยืนยัน)
- นโยบายความเป็นส่วนตัว `/privacy` + ข้อตกลง `/terms`
- ทุกรายงานแนบหมายเหตุ "ข้อมูลประกอบการพิจารณา" + คำเตือนการใช้อย่างเป็นธรรม
- Audit log เก็บ IP แบบ hash ทางเดียว / สิทธิขอลบข้อมูลผ่านช่องทางในหน้า account

## คำสั่งที่ใช้บ่อย

```bash
pnpm dev            # dev ทุก workspace (turbo)
pnpm build          # build ทั้งหมด
pnpm test           # เทสต์ทั้งหมด (core 69 + report 4)
pnpm db:push        # sync schema
pnpm db:seed        # seed ข้อมูลตั้งต้น
```
