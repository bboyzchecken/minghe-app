# 命合 Mìnghé — แพลตฟอร์มดูสมพงษ์คนกับองค์กร · minghe.work

> **เมื่อ "คนที่ใช่" เจอ "ที่ที่ใช่"** — วิเคราะห์ความเหมาะสมของพนักงานกับองค์กร
> ด้วยปาจือ (八字) แม่นยำระดับซินแสตัวจริง ส่งมอบรายงานผ่านรหัสเปิดที่ปลอดภัย

## ภาพรวม repo

| ส่วน | คืออะไร |
|-----|---------|
| **`apps/app`** | หน้าเว็บ minghe.work — Next.js 15 (static export) + **TanStack Query** · 2 ผลิตภัณฑ์ (Employer / Job Seeker) · สมัคร/ล็อกอินอีเมล + OTP · Admin Console |
| **`apps/api`** | Go REST API (Echo + GORM + Uber FX + **MySQL**) — **เจ้าของข้อมูลเจ้าเดียว**: บัญชี องค์กร โปรไฟล์ คำสั่งซื้อ ความยินยอม เอกสารกฎหมาย |
| `packages/core` | เครื่องคำนวณปาจือ (pure TypeScript, browser-safe, มีเทสต์) |
| `packages/report` | ประกอบรายงาน + เรียบเรียงไทย |
| `deploy/lightsail` | compose + Caddy + setup script สำหรับ production API บน AWS Lightsail |
| `.github/workflows` | CI (ทุก PR) · deploy หน้าบ้าน → Cloudflare Pages · deploy API → Lightsail (เฉพาะ `main`) |

สถาปัตยกรรมตัดสินแล้ว 22 ส.ค. 2026 (Q0-1/Q0-1b ใน [`docs/uat-2026-08-01-feedback-plan.md`](docs/uat-2026-08-01-feedback-plan.md)):
หน้าเว็บเรียกข้อมูลผ่าน hooks ใน [`apps/app/lib/queries.ts`](apps/app/lib/queries.ts) → interface เดียว [`apps/app/lib/api`](apps/app/lib/api/types.ts)
ที่มี 2 implementation สลับได้ด้วย `MINGHE_MODE` — **`live`** (Go API, ของจริง) และ **`mock`** (ในเบราว์เซอร์ล้วน ไว้ให้ลูกค้าตรวจ user process)
ไม่มี Prisma / API route ฝั่ง Next อีกต่อไป

---

## 🚀 รันทั้งระบบด้วยคำสั่งเดียว (Docker)

ต้องมี Docker Desktop (หรือ Docker Engine + compose plugin)

```bash
docker compose up --build -d
```

| service | ทำอะไร | เข้าได้ที่ |
|---|---|---|
| `db` | MySQL 8.0 (ข้อมูลอยู่ใน volume `minghe_mysql`) | ภายใน network เท่านั้น |
| `api` | Go API — migrate + seed อัตโนมัติตอน start | `http://localhost:5000` (เฉพาะเครื่องโฮสต์) |
| `web` | nginx เสิร์ฟหน้าเว็บ + proxy `/backend/*` → api | **`http://localhost:8080`** |

เครื่องอื่นใน LAN เปิด **`http://<IP เครื่องนี้>:8080`** ได้เลย — หน้าเว็บเรียก API ผ่าน origin เดียวกัน (`/backend`)
จึงไม่ต้องฝัง IP ตอน build และไม่ติด CORS

ครั้งแรกใช้เวลา build ~3–5 นาที (ต้องมีอินเทอร์เน็ตสำหรับดึง base image + Google Fonts) หลังจากนั้น cache ไว้

```bash
docker compose ps                 # สถานะ (ทั้ง 3 ต้องเป็น healthy)
docker compose logs -f api        # ดู log API
docker compose down               # หยุด (เก็บข้อมูล)  ·  down -v = ลบข้อมูลด้วย
WEB_PORT=80 docker compose up -d  # เปลี่ยนพอร์ตหน้าเว็บ
```

### บัญชีสำหรับเดโม (compose หลักตั้ง `MINGHE_SEED_DEMO_ACCOUNTS=true`)

ระบบอยู่โหมด **live** — ไม่มีปุ่มบัญชีทดลองบนหน้า login ต้องพิมพ์เอง

| บทบาท | อีเมล | รหัสผ่าน | เห็นอะไร |
|--------|-------|----------|----------|
| องค์กร — เจ้าของ | `employer@demo.minghe.work` | `demo1234` | dashboard องค์กร + ประวัติ 2 ใบ (`PJX-K7QM-3PLA`, `PJX-9WDC-XR2E` PIN `1988`) |
| องค์กร — HR | `hr@demo.minghe.work` | `demo1234` | dashboard เดียวกัน แต่เพิ่ม/ลบสมาชิกไม่ได้ |
| คนทำงาน | `jobseeker@demo.minghe.work` | `demo1234` | dashboard ส่วนตัว + ประวัติ 1 ใบ (`PJX-2XKD-9MRT`) |
| ผู้ดูแลระบบ | `admin@minghe.work` | `changeme1234` | Admin Console `/admin` — มีงานรอรับเรื่อง 2 ใบ |

**สมัครสมาชิกใหม่ได้จริง** ที่ `/register` — ยังไม่ได้ตั้งค่า Gmail จึงเปิด `MINGHE_OTP_ECHO=true`:
รหัส OTP จะแสดงบนหน้าจอพร้อมป้าย "สภาพแวดล้อมทดสอบ" · **production ต้องปิด** (ดู `deploy/lightsail/.env.example`)

ค่าปรับได้ทั้งหมดอยู่ใน [`.env.example`](.env.example) — คัดลอกเป็น `.env` แล้ว compose จะอ่านให้เอง

### โหมดสาธิต (mock) สำหรับให้ลูกค้าตรวจ user process

```bash
docker compose -f docker-compose.yml -f docker-compose.mock.yml up --build -d
```

หน้าเว็บทำงานในเบราว์เซอร์ล้วน (localStorage) มีแถบ "โหมดสาธิต" + ปุ่มบัญชีทดลองกดได้ทันทีที่หน้า login
พฤติกรรมเหมือน live ทุกอย่าง (ต้องล็อกอินก่อนจ่าย, สมัครต้องผ่าน OTP, Admin กันงานชนกัน)

---

## พัฒนาในเครื่อง (ไม่ใช้ Docker)

ต้องมี Node.js ≥ 20, pnpm (`npm i -g pnpm`), Go ≥ 1.23, MySQL (ใช้ `docker compose up -d db` ก็ได้)

```bash
cp .env.example .env              # แก้ MINGHE_MODE=mock ถ้าอยากเล่นหน้าเว็บอย่างเดียว
pnpm install
pnpm api:seed && pnpm api:dev     # Go API ที่ :5000 (อ่าน .env ของ root)
pnpm dev                          # หน้าเว็บที่ http://localhost:4311
```

`MINGHE_*` ถูกฝังลง bundle ตอน build/dev start — แก้ `.env` แล้วต้องรีสตาร์ต `pnpm dev`

```bash
pnpm lint      # tsc ทุก package
pnpm test      # vitest: packages/core + packages/report
pnpm build     # static export → apps/app/out
```

รายละเอียดแต่ละส่วน: [`apps/app/README.md`](apps/app/README.md) · [`apps/api/README.md`](apps/api/README.md)

---

## Deploy production (minghe.work)

ทุกอย่างอัตโนมัติผ่าน GitHub Actions เมื่อ push เข้า `main` — ขั้นตอนตั้งค่าครั้งแรกอยู่ที่ **[`docs/deploy.md`](docs/deploy.md)**

| ส่วน | ไปที่ | workflow |
|---|---|---|
| หน้าบ้าน `minghe.work` | Cloudflare Pages (static, ฟรี, กัน request ให้) | [`deploy-web.yml`](.github/workflows/deploy-web.yml) |
| API `api.minghe.work` | AWS Lightsail 1 เครื่อง (Docker: MySQL + API + Caddy TLS) | [`deploy-api.yml`](.github/workflows/deploy-api.yml) |

กติกา `main`: ต้องผ่าน PR + CI (`web`, `api`) ก่อน merge — ruleset นำเข้าได้จาก [`.github/rulesets/main.json`](.github/rulesets/main.json)
และ workflow deploy ใช้ environment `production` ที่จำกัด branch = `main`

---

## โครงสร้าง

```
minghe-app/
├── docker-compose.yml        # db + api + web — รันทั้งระบบ (live)
├── docker-compose.mock.yml   # override โหมดสาธิต
├── .env.example              # ค่าตั้งทั้งหมด (compose / app / api อ่านไฟล์เดียวกัน)
├── apps/app/                 # หน้าเว็บ (Next.js static export + TanStack Query) · Dockerfile → nginx
├── apps/api/                 # Go API · Dockerfile → alpine · seed_demo.go = ข้อมูลเดโม
├── packages/core/            # เครื่องคำนวณปาจือ
├── packages/report/          # ประกอบรายงาน + เรียบเรียงไทย
├── deploy/lightsail/         # production API: compose + Caddyfile + setup.sh
├── .github/workflows/        # ci.yml · deploy-web.yml · deploy-api.yml
├── .github/rulesets/         # main.json — ป้องกัน main
└── docs/                     # แผน UAT · deploy.md
```
