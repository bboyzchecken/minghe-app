# 命合 Mìnghé — แพลตฟอร์มดูสมพงษ์คนกับองค์กร

> **เมื่อ "คนที่ใช่" เจอ "ที่ที่ใช่"** — วิเคราะห์ความเหมาะสมของพนักงานกับองค์กร
> ด้วยปาจือ (八字) และโหงวเฮ้ง แม่นยำระดับซินแสตัวจริง ส่งมอบรายงานผ่านรหัสเปิดที่ปลอดภัย

## ภาพรวม repo — มี 3 แอป ใช้เครื่องคำนวณชุดเดียวกัน

| แอป | คืออะไร | สถานะ (22 ส.ค. 2026) |
|-----|---------|----------------------|
| **`apps/proto`** | หน้าเว็บหลักที่ใช้ทำ UAT กับลูกค้า — Next.js static export, 2 ผลิตภัณฑ์ (Employer + Job Seeker), ล็อกอิน 4 บทบาท, Admin Console, สลับโหมด **mock / live** ได้ | 🟢 **งานหลักของรอบนี้** — ใช้ได้ทั้งสองโหมด |
| **`apps/api`** | Go REST API (Echo + GORM + Uber FX + **MySQL**) — เจ้าของข้อมูลให้ proto ในโหมด live: บัญชี องค์กร โปรไฟล์ คำสั่งซื้อ ความยินยอม เอกสารกฎหมาย | 🟢 ใช้งานได้ (migration + seed + order→pay→report ผ่านแล้ว) |
| **`apps/web`** | ตัว full-stack เวอร์ชันแรก — Next.js + Prisma + **PostgreSQL** + auth + payment mock + Docker all-in-one (สเปกเก่า: ระบบเครดิต, B2B ฝั่งเดียว, แบรนด์โทนเข้ม) | 🟡 ยังรันได้ แต่ไม่ได้พัฒนาต่อ — รอตัดสินใจ Q0-1 |

> **Q0-1 ยังไม่ปิด:** ยังไม่สรุปว่าปลายทางจริงจะให้ `apps/api` (Go + MySQL) หรือ `apps/web` (Prisma + Postgres)
> เป็นเจ้าของข้อมูล — ดู [`docs/uat-2026-08-01-feedback-plan.md`](docs/uat-2026-08-01-feedback-plan.md)
> ตอนนี้ proto ต่อกับ `apps/api` อยู่

แพ็กเกจที่ทุกแอปใช้ร่วมกัน: `packages/core` (เครื่องคำนวณปาจือ) · `packages/report` (ประกอบรายงาน + เรียบเรียงไทย) · `packages/db` (Prisma — เฉพาะ `apps/web`)

---

## 🚀 เริ่มเร็วที่สุด — `apps/proto` โหมด mock (ไม่ต้องมี API / ฐานข้อมูล)

ต้องมี Node.js ≥ 20 และ pnpm (`npm i -g pnpm`)

```bash
cp .env.example .env                 # MINGHE_MODE=mock เป็นค่าเริ่มต้นอยู่แล้ว
pnpm install
pnpm --filter @minghe/proto dev      # http://localhost:4311
```

ทุกอย่างทำงานในเบราว์เซอร์: คำนวณปาจือจริงผ่าน `@minghe/core`, ประกอบรายงานจริงผ่าน `@minghe/report`,
ข้อมูลบัญชี/คำสั่งซื้อเก็บใน `localStorage` — พฤติกรรมที่ผู้ใช้เห็น **เหมือนโหมด live ทุกอย่าง**
(ต้องล็อกอินก่อนจ่าย รหัสผ่านผิดเข้าไม่ได้ ประตูความยินยอมก่อนชำระเงิน) จึงใช้ตรวจ user process ได้จริง

### บัญชีทดลอง (มีปุ่มกดเข้าได้ทันทีที่หน้า `/login` — เฉพาะโหมด mock)

| บทบาท | อีเมล | รหัสผ่าน | เห็นอะไร |
|--------|-------|----------|----------|
| องค์กร — เจ้าของ | `employer@demo.minghe.work` | `demo1234` | dashboard องค์กร, team roster, จัดการสมาชิกได้ |
| องค์กร — HR | `hr@demo.minghe.work` | `demo1234` | dashboard เดียวกับเจ้าของ แต่เพิ่ม/ลบสมาชิกไม่ได้ |
| คนทำงาน | `jobseeker@demo.minghe.work` | `demo1234` | dashboard ส่วนตัว เช็กความสมพงษ์กับบริษัท |
| ผู้ดูแลระบบ | `admin@minghe.work` | `changeme1234` | Admin Console `/admin` (คิวงาน / ผู้ใช้ / เอกสารกฎหมาย) |

นิยามบทบาททั้งหมด (เห็นอะไร ทำอะไรได้/ไม่ได้) อยู่ที่เดียวใน [`apps/proto/lib/roles.ts`](apps/proto/lib/roles.ts)
รายชื่อบัญชีทดลองอยู่ที่ [`apps/proto/lib/api/mock-accounts.ts`](apps/proto/lib/api/mock-accounts.ts) และ
[`apps/api/pkg/models/mockaccount.go`](apps/api/pkg/models/mockaccount.go) — **แก้ที่หนึ่งต้องแก้อีกที่ให้ตรงกัน**

---

## โหมด live — ต่อ `apps/proto` เข้ากับ Go API + MySQL

ต้องมี Go ≥ 1.23 และ Docker (สำหรับ MySQL)

```bash
# 1) ยก MySQL 8.0 (พอร์ต 3306, root/123456 — เฉพาะเครื่อง dev)
docker compose -f apps/api/docker-compose.yml up -d

# 2) migration + seed (admin, องค์กรตัวอย่าง, ทีม 3 คน + บัญชีทดลองถ้าเป็นโหมด mock)
cd apps/api && go run . seed

# 3) ยก API ที่ http://localhost:5000 (เช็ก GET /healthz)
go run .
```

แล้วแก้ `.env` ที่ root บรรทัดเดียว → `MINGHE_MODE=live` → **รีสตาร์ตทั้ง dev server ของ proto และ API**
(ค่าถูกอ่านตอนเริ่มทำงาน และฝั่ง Next.js ถูกฝังลง bundle ตอน build)

| | `mock` | `live` |
|---|---|---|
| ข้อมูลอยู่ที่ | เบราว์เซอร์ (localStorage) | MySQL ผ่าน Go API |
| ต้องรัน MySQL + API | ไม่ต้อง | ต้อง |
| ปุ่มบัญชีทดลองบนหน้า login | แสดง กดเข้าได้ทันที | ไม่แสดง (`GET /mode` ส่งลิสต์ว่างเสมอ) |
| แถบบอกโหมดบนทุกหน้า | "โหมดสาธิต (mock)" สีทอง | "โหมดใช้งานจริง (live)" สีหยก + URL ของ API |

ค่าที่ไม่รู้จักถือเป็น `live` เสมอ — กันการเผลอปล่อยบัญชีทดลองขึ้นของจริง
ในโหมด live ตัวรายงานยังประกอบในเบราว์เซอร์จาก snapshot ที่บันทึกตอนสั่งซื้อ (engine เป็น TypeScript) —
API ทำหน้าที่เก็บและส่งต่อข้อมูล รายละเอียด endpoint ทั้งหมดดู [`apps/api/README.md`](apps/api/README.md)

### ไฟล์ตั้งค่า `.env` มีที่เดียว (root)

ทั้ง proto (ผ่าน `next.config.mjs`) และ Go API (ผ่าน `godotenv`) อ่าน `.env` ไฟล์เดียวกันที่ root

| ตัวแปร | ค่าเริ่มต้น | ใช้ทำอะไร |
|--------|-------------|-----------|
| `MINGHE_MODE` | `mock` | สวิตช์หลัก mock / live |
| `MINGHE_API_BASE_URL` | `http://localhost:5000` | URL ของ API (เฉพาะโหมด live) |
| `MINGHE_GOOGLE_LOGIN_ENABLED` | `false` | ปุ่ม Google **แสดงอยู่แต่กดไม่ได้** จนกว่าจะมี OAuth client จริง (F-02) |
| `MYSQL_*`, `JWT_SECRET_KEY`, `PORT` | ดูใน `.env.example` | ฝั่ง API |
| `GMAIL_*` | ว่าง | ส่ง OTP ทางอีเมล — เว้นว่าง = พิมพ์ลง log แทน ใช้ทดสอบได้เลย |
| `R2_*`, `PAYMENT_*`, `LEGAL_*_VERSION` | ว่าง / `mock` / `draft` | อัปโหลดไฟล์ · payment gateway · เวอร์ชันเอกสารกฎหมายที่ผู้ใช้ยอมรับ |

---

## `apps/proto` — หน้าเว็บหลัก

### สิ่งที่ทำได้

- **คำนวณปาจือจริง** ผ่าน `@minghe/core` — เสาสี่ต้นจากลี่ชุน/สารทหลัก + เวลาสุริยะจริง (รันในเบราว์เซอร์)
- **ประกอบรายงานจริง** ผ่าน `@minghe/report` (`assembleReport` + `buildNarrative`) แบบ deterministic ไม่ใช้ LLM
- สิบเทพเชิง %, ดาวจุติ (桃花/文昌/天乙贵人), ดัชนีสมพงษ์ (合 Index), รายงานพิมพ์ PDF ได้
- **Employer**: wizard 5 สเตป (ผู้บริหาร / วันก่อตั้ง / ธาตุอุตสาหกรรม) + team roster + dashboard องค์กร
- **Job Seeker**: เช็กความสมพงษ์กับบริษัท + dashboard ส่วนตัว
- **First-time trial (F-03)**: เล่นโฟลว์ได้โดยไม่ล็อกอิน เจอประตูล็อกอินตอนชำระเงิน กลับมาแล้วร่างที่กรอกยังอยู่ครบ
- **ประตูความยินยอม (F-06)**: ปุ่มจ่ายล็อกจนกว่าจะติ๊กยอมรับเอกสาร 3 ฉบับ (โหมด live บันทึกเป็นเรคคอร์ด `consents` จริง)
- ชำระเงินจำลอง → ออกรหัสเปิด `PJX-XXXX-XXXX` (+ PIN บางฉบับ) → เปิดรายงานที่ `/r` โดยไม่ต้องล็อกอิน
- **Admin Console**: แอดมินหลายคนทำงานพร้อมกัน — ต้อง "รับเรื่อง" ก่อนดำเนินการ/ส่งมอบ งานของคนอื่นกดแล้วโดนกัน (409),
  ระงับ/คืนสิทธิ์ผู้ใช้, ดูสถานะเอกสารกฎหมาย 4 ฉบับ

### หน้าเว็บ

| Route | สิ่งที่แสดง |
|-------|-----------|
| `/` | Landing — แบรนด์ + การ์ด "ฉันเป็นองค์กร" / "ฉันเป็นคนหางาน" + ห้าธาตุ |
| `/pricing` | Employer 699/เดือน (6 candidate/สัปดาห์) · Job Seeker 399/เดือน หรือ 199/ครั้ง + add-ons |
| `/login` | ล็อกอินอีเมล (+ ปุ่ม Google ที่ยังปิดอยู่) · โหมด mock มีปุ่มบัญชีทดลอง + preview ว่าแต่ละบทบาทเห็นอะไร |
| `/employer` · `/employer/new` · `/employer/dashboard` | ฝั่งองค์กร: intro / wizard / dashboard (ต้องล็อกอิน) |
| `/jobseeker` · `/jobseeker/new` · `/jobseeker/dashboard` | ฝั่งคนทำงาน (dashboard ต้องล็อกอิน) |
| `/report` | รายงาน — อ่านคำสั่งซื้อที่เปิดอยู่จาก session ถ้าไม่มีแสดงรายงานตัวอย่างสด |
| `/r` | กรอกรหัส `PJX-XXXX-XXXX` (+ PIN) เพื่อเปิดรายงาน — ไม่ต้องล็อกอิน |
| `/admin` | Admin Console (เฉพาะ role=admin — ฝั่ง API บังคับอีกชั้น) |
| `/legal/{terms,privacy,refund,cookies}` | เอกสารกฎหมาย 4 ฉบับ — **ยังเป็น stub** รอข้อมูลนิติบุคคล/เงื่อนไขคืนเงิน (F-01) |

### โครงสร้างโค้ดที่ควรรู้

```
apps/proto/
├── lib/env.ts            # อ่าน MINGHE_* ที่ฝังมาจาก next.config.mjs (IS_MOCK, API_BASE_URL)
├── lib/api/
│   ├── types.ts          # MingheClient — สัญญากลางที่ทุกหน้าเรียก (ห้าม fetch เองตรง ๆ)
│   ├── mock-client.ts    # implementation โหมด mock (localStorage + คิวจำลอง)
│   ├── live-client.ts    # implementation โหมด live (เรียก Go API)
│   └── mock-accounts.ts  # บัญชีทดลอง (ต้องตรงกับฝั่ง Go)
├── lib/roles.ts          # นิยาม 4 บทบาท: sees / can / cant / home
├── lib/session.tsx       # SessionProvider — token ใน localStorage, returnTo หลังล็อกอิน
├── lib/store.ts          # sessionStorage: คำสั่งซื้อที่เปิดอยู่ + ร่าง wizard ที่กรอกค้าง (F-03)
├── lib/report.ts         # buildReport() — เรียก @minghe/report แบบ subpath (ไม่ลาก Anthropic SDK เข้า bundle)
└── components/           # mode-banner, require-login, role-badge, consent-checkbox, date-input (DD/MM/YYYY), report/
```

### Build + Deploy (static export)

proto เป็น `output: 'export'` ทั้งหมด → `pnpm --filter @minghe/proto build` ได้ `apps/proto/out/`

> อย่ารัน `next build` ขณะ `next dev` ของแอปเดียวกันยังทำงานอยู่ — `.next` cache จะพัง
> (`Cannot find module './NNN.js'`) ถ้าเจอ: หยุด dev, ลบ `.next`, เริ่มใหม่

- **Vercel**: Root Directory = `apps/proto` (มี `vercel.json` กำหนด build/install ให้แล้ว)
- **Cloudflare Pages**: build `pnpm install --no-frozen-lockfile && pnpm --filter @minghe/proto build` ·
  output `apps/proto/out` · env `NODE_VERSION=20`
- ค่า `MINGHE_*` ถูกฝังตอน build — จะ deploy โหมด live ต้องตั้ง `MINGHE_MODE=live` และ `MINGHE_API_BASE_URL`
  เป็น URL สาธารณะของ API ใน environment ของ CI (process.env ชนะไฟล์ `.env` เสมอ)

---

## `apps/web` — ตัว full-stack เวอร์ชันแรก (Docker all-in-one)

ยังรันได้ครบด้วยคำสั่งเดียว (เว็บ + PostgreSQL + seed รายงานเดโม) — เหมาะถ้าต้องการเดโมเวอร์ชันที่มี backend
ในตัวโดยไม่ยุ่งกับ Go/MySQL:

```bash
docker compose up --build          # รอ ~3-5 นาทีครั้งแรก → http://localhost:3000
# รายงานเดโม /r/MH-DEMO-2569 · พอร์ตชน: WEB_PORT=3100 docker compose up --build
# หยุด: docker compose down (ลบข้อมูลด้วย: docker compose down -v)
```

| บทบาท | อีเมล | รหัสผ่าน |
|--------|-------|----------|
| แอดมิน | `admin@minghe.local` | `minghe-admin-2026` |
| ลูกค้าเดโม (มี 3 เครดิต) | `demo@minghe.local` | `minghe-demo-2026` |

แก้โค้ดสด: `docker compose up -d db` → ตั้ง `DATABASE_URL` ใน `packages/db/.env` และ `apps/web/.env.local` →
`pnpm --filter @minghe/db db:push && pnpm --filter @minghe/db db:seed` → `pnpm --filter @minghe/web dev`

Deploy ฟรีได้ 2 ทาง: **Docker ที่ไหนก็ได้** (image self-contained, ต่อ Postgres ผ่าน `DATABASE_URL`) หรือ
**Vercel + Neon** (Root Directory = `apps/web`, env: `DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`, `CRON_SECRET`,
`ANTHROPIC_API_KEY` optional) · Retention cron `/api/cron/purge-photos` ลบรูปใบหน้าเกิน 90 วันตาม PDPA

> ⚠️ เปลี่ยน `AUTH_SECRET` + รหัสผ่านใน `docker-compose.yml` ก่อนใช้จริงเสมอ
> ไม่ใส่ `ANTHROPIC_API_KEY` ก็ใช้ได้เต็มระบบ (รายงานใช้ตัวเรียบเรียงไทย deterministic) —
> ใส่เมื่อไหร่ระบบจะเรียก Claude ขัดเงาภาษา + อ่านโหงวเฮ้งจากรูป (vision) ให้อัตโนมัติ

---

## สถาปัตยกรรม

```
minghe-app/
├── .env.example         # ไฟล์ตั้งค่ากลาง — proto + Go API อ่านไฟล์เดียวกัน (คัดลอกเป็น .env)
├── apps/proto/          # 🎯 หน้าเว็บหลัก (Next.js 15 static export, พอร์ต 4311) — mock / live
├── apps/api/            # Go REST API (Echo + GORM + FX + MySQL, พอร์ต 5000) — backend ของ proto โหมด live
├── apps/web/            # Next.js 15 full-stack เวอร์ชันแรก (Prisma + Postgres, พอร์ต 3000)
├── packages/core/       # 🎯 เครื่องคำนวณปาจือ (pure TS + เทสต์หนัก) — browser-safe
├── packages/report/     # ประกอบรายงาน + เรียบเรียงไทย + Claude (optional, เฉพาะ apps/web)
├── packages/db/         # Prisma schema + client + seed (เฉพาะ apps/web)
├── docs/                # แผน UAT + ชุดคำถามที่รอคำตอบ
├── Dockerfile · docker-compose.yml · docker/   # แพ็กเกจ apps/web + Postgres
└── turbo.json · pnpm-workspace.yaml
```

| ส่วน | เทคโนโลยี |
|------|-----------|
| Monorepo | Turborepo + pnpm workspaces |
| หน้าเว็บ (proto / web) | Next.js 15 (App Router) + Tailwind CSS — แบรนด์โทน **อุ่นสว่าง "Modern Chinese"** (tokens ใน `apps/proto/tailwind.config.ts`) |
| เครื่องคำนวณ | `lunar-typescript` (ผู้พัฒนาเดียวกับ lunar-javascript/lunar-python) |
| API (proto live) | Go 1.23 · Echo · GORM · Uber FX · MySQL 8 · JWT HS256 อายุ 7 วัน |
| ฐานข้อมูล (web) | Prisma + PostgreSQL |
| AI (optional, web เท่านั้น) | Anthropic API — เรียบเรียงรายงาน + อ่านโหงวเฮ้ง |
| ชำระเงิน | Mock ทั้งสองฝั่ง — เลือกแล้วว่าจะใช้ **GB Prime Pay** (22 ส.ค. 2026) รอต่อ webhook |

---

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

---

## ระบบรหัสเปิดรายงาน (Access Code)

- ใครมีรหัสเปิดดู + พิมพ์ PDF ได้โดยไม่ต้องมีบัญชี (เหมาะส่งงาน Fastwork) — ตัดอักษรสับสน (I/L/O/U/0/1) ออก
- **`apps/proto` + `apps/api`**: รูปแบบ `PJX-XXXX-XXXX` (ตามสเปก §7) + PIN เสริมบางฉบับ · เปิดที่ `/r` (live: `POST /r`)
- **`apps/web`**: รูปแบบ `MH-XXXX-XXXX` · เปิดที่ `/r/[code]` · rate limit ต่อ IP, วันหมดอายุ, เพิกถอนจาก admin,
  audit log (เก็บ IP แบบ hash ทางเดียว — PDPA)

---

## PDPA / กฎหมาย

- ขอ consent ชัดเจนก่อนรับข้อมูล — proto/API: ประตูความยินยอมก่อนชำระเงินผูกกับ **เวอร์ชันเอกสาร** ที่ฝั่ง server กำหนด
  (`LEGAL_*_VERSION`) ไม่รับจาก client · web: บังคับใน wizard
- เอกสาร 4 ฉบับ (terms / privacy / refund / cookies) ใน proto ยังเป็น stub — ต้องได้ข้อมูลนิติบุคคล + เงื่อนไขคืนเงิน
  + ผู้ตรวจ ก่อนร่าง (F-01) และ **ต้องมีคนตรวจก่อน publish** — seed ของ API สร้างเป็นฉบับร่างเปล่าเท่านั้น
- ทุกรายงานแนบหมายเหตุ "ข้อมูลประกอบการพิจารณา" + คำเตือนการใช้อย่างเป็นธรรม

---

## สถานะงาน + เอกสาร

- [`docs/uat-2026-08-01-feedback-plan.md`](docs/uat-2026-08-01-feedback-plan.md) — feedback 29 ข้อจาก UAT รอบ 1 ส.ค. 2026
  แยกเป็น wave: **Wave 1 ✅** (copy/ฟอร์ม/consent/login UI) · **Wave 3 ✅ mock+live** (F-02 บางส่วน, F-03, F-05, F-25 บางส่วน) ·
  Wave 2 รอ asset/คำตอบ · Wave 4 (analytics F-20–F-27) รอ workshop กับผู้เชี่ยวชาญ
- [`docs/uat-2026-08-01-questions.md`](docs/uat-2026-08-01-questions.md) — 30 คำถามที่รอคำตอบเพื่อปลดล็อกข้อ 🟡
- ตัดสินใจแล้ว: แบรนด์โทนอุ่นสว่าง · Payment gateway = **GB Prime Pay** · Google login ปิดไว้จนกว่าจะมี OAuth client
- ยังเปิดอยู่: **Q0-1** (api หรือ web เป็นเจ้าของข้อมูล) · ราคา "Executive Analysis +89" vs "Executive Insights +399" ·
  ฟอนต์จริง + โลโก้จากอาจารย์เม · โหงวเฮ้ง = Coming Soon

---

## คำสั่งที่ใช้บ่อย

```bash
pnpm --filter @minghe/proto dev     # หน้าเว็บหลัก http://localhost:4311
pnpm --filter @minghe/proto build   # static export → apps/proto/out
pnpm --filter @minghe/proto lint    # tsc --noEmit

cd apps/api && go run .             # Go API http://localhost:5000
cd apps/api && go run . seed        # migration + seed
cd apps/api && go run . up          # migration อย่างเดียว

pnpm dev            # dev ทุก workspace (turbo)
pnpm build          # build ทั้งหมด
pnpm test           # เทสต์ทั้งหมด (core 69 + report 4)
pnpm db:push        # sync schema (Prisma — apps/web)
pnpm db:seed        # seed ข้อมูลตั้งต้น (Prisma — apps/web)
```
