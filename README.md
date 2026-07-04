# 命合 Mìnghé — แพลตฟอร์มดูสมพงษ์คนกับองค์กร

> **เมื่อ "คนที่ใช่" เจอ "ที่ที่ใช่"** — วิเคราะห์ความเหมาะสมของพนักงานกับองค์กร
> ด้วยปาจือ (八字) และโหงวเฮ้ง แม่นยำระดับซินแสตัวจริง ส่งมอบรายงานผ่านรหัสเปิดที่ปลอดภัย

## 🚀 เริ่มเร็วที่สุด — Docker (แนะนำสำหรับนำเสนอ)

มีแค่ Docker ก็รันทั้งระบบ (เว็บ + PostgreSQL + seed รายงานเดโม) ได้ด้วยคำสั่งเดียว:

```bash
docker compose up --build          # รอ ~3-5 นาทีครั้งแรก
# เปิด http://localhost:3000  ·  รายงานเดโม /r/MH-DEMO-2569
```

- ระบบ push schema + seed ให้อัตโนมัติตอนสตาร์ต (idempotent — รันซ้ำได้)
- พอร์ตชนกัน? ใช้ `WEB_PORT=3100 docker compose up --build` แล้วเปิด `:3100`
- หยุด: `docker compose down` (ลบข้อมูลด้วย: `docker compose down -v`)
- **นำ image ไป deploy ที่ไหนก็ได้ที่มี Docker** — self-contained ทั้งหมด (ดู "Deploy ฟรี" ด้านล่าง)

บัญชีที่ seed ให้:

| บทบาท | อีเมล | รหัสผ่าน |
|--------|-------|----------|
| แอดมิน | `admin@minghe.local` | `minghe-admin-2026` |
| ลูกค้าเดโม (มี 3 เครดิต) | `demo@minghe.local` | `minghe-demo-2026` |

รายงานตัวอย่างเปิดได้ทันทีที่ `/r/MH-DEMO-2569` (ไม่ต้องล็อกอิน)

> ⚠️ เปลี่ยน `AUTH_SECRET` + รหัสผ่านใน `docker-compose.yml` ก่อนใช้จริงเสมอ

## Local Development (แก้โค้ดสด)

ต้องมี Node.js ≥ 20, pnpm (`npm i -g pnpm`) และ PostgreSQL

```bash
docker compose up -d db            # รัน Postgres แค่ตัวเดียว (หรือใช้ Neon/Postgres ของคุณ)
cp .env.example packages/db/.env   # ตั้ง DATABASE_URL ให้ตรง Postgres
cp .env.example apps/web/.env.local
pnpm install
pnpm --filter @minghe/db db:push   # สร้างตาราง
pnpm --filter @minghe/db db:seed   # แอดมิน + รายงานเดโม
pnpm --filter @minghe/web dev      # http://localhost:3000
```

> ใช้ Postgres ทั้ง dev และ prod (พอร์ตข้ามได้ง่าย) — อยากใช้ SQLite แบบไม่ต่อเน็ตตอน dev
> เปลี่ยน `provider = "sqlite"` ใน `packages/db/prisma/schema.prisma` + `DATABASE_URL="file:./dev.db"`

### Environment Variables

คัดลอก `.env.example` — env ใช้ 2 จุด (local): `packages/db/.env` (Prisma CLI + seed)
และ `apps/web/.env.local` (`DATABASE_URL`, `AUTH_SECRET`, `ANTHROPIC_API_KEY` optional, `CRON_SECRET`)

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

## Deploy ฟรี 🆓

แอปนี้ **ไม่พึ่งบริการเสียเงินเลย** — จ่ายเงินเป็น mock, รูปเก็บเป็น data URL ในฐานข้อมูล
(ไม่ต้องมี S3/storage), AI เป็น optional, auth เขียนเอง — ต้องการภายนอกแค่ **ฐานข้อมูล**
มี 2 ทางที่ฟรี 100%:

### ทาง A — Docker ที่ไหนก็ได้ (พก image ไปเครื่องไหนก็รันได้)

image เป็น self-contained (มี Postgres มากับ compose) — deploy บนอะไรก็ได้ที่รัน Docker:
VPS ฟรี/ราคาถูก, เครื่องตัวเอง, Render/Railway/Fly (มี free trial), ฯลฯ

```bash
docker compose up --build -d       # ทั้งเว็บ + Postgres + seed
# เปลี่ยน AUTH_SECRET + รหัสผ่านใน docker-compose.yml ก่อน
```

จะแยก image ไปที่อื่น: `docker build -t minghe .` แล้ว push ขึ้น registry / ต่อ Postgres ของ host
ผ่าน env `DATABASE_URL` (image รัน `prisma db push` + seed + start ให้เองตอนสตาร์ต)

### ทาง B — Vercel + Neon (แนะนำสำหรับได้ลิงก์สาธารณะเร็วสุด)

1. **Neon** (neon.tech) → สร้าง project ฟรี → คัดลอก **pooled connection string**
2. เอา URL นั้น seed ฐานข้อมูลครั้งเดียวจากเครื่องตัวเอง:
   ```bash
   # ใส่ Neon URL ใน packages/db/.env: DATABASE_URL="postgresql://...-pooler..."
   pnpm --filter @minghe/db db:push && pnpm --filter @minghe/db db:seed
   ```
3. **Vercel** (vercel.com) → Import repo GitHub → **Root Directory = `apps/web`** →
   ตั้ง env: `DATABASE_URL` (Neon), `AUTH_SECRET` (สุ่มยาวๆ), `NEXT_PUBLIC_APP_URL`,
   `CRON_SECRET` (+ `ANTHROPIC_API_KEY` ถ้าต้องการ) → Deploy → ได้ลิงก์ `.vercel.app`

> Vercel Hobby ฟรีสำหรับเดโม/พรีเซนต์ (ToS ห้ามใช้เชิงพาณิชย์เต็มตัว) · Neon free tier
> 0.5GB พอเหลือเฟือ · รายงานไม่ใช้ AI สร้างเสร็จ <1 วิ อยู่ในลิมิต serverless 10 วิ

### หมายเหตุ production (เมื่อใช้จริง)

- **Rate limit:** หลาย instance แนะนำสลับ `lib/rate-limit.ts` เป็น Upstash Redis
  (interface เตรียมไว้แล้ว) — โค้ดดึง client IP จาก `x-real-ip`/ขวาสุด `x-forwarded-for` (กันปลอม)
- **Retention cron:** `apps/web/vercel.json` ตั้ง Cron เรียก `/api/cron/purge-photos` ทุกวัน
  (ลบรูปใบหน้าเกิน 90 วัน ตาม PDPA — ต้องตั้ง `CRON_SECRET`) · บน Docker ตั้ง cron ของ host
  ยิง endpoint นี้เอง
- **รูปอัปโหลด:** MVP เก็บเป็น data URL ใน DB — ปริมาณมากควรย้าย Supabase Storage / R2
- **ชำระเงินจริง:** ต่อ Stripe/Omise ที่ `payOrder()` ใน `lib/orders.ts` (จุดเดียว)

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
