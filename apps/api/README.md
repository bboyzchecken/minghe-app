# @minghe/api — Go REST API

Service ฝั่ง backend ของ MingHe สร้างตาม `PROJECT_TEMPLATE.md` (Go + Echo + GORM + Uber FX + MySQL)

> **หมายเหตุเรื่องสถาปัตยกรรม**
> service นี้เป็นคนละ stack กับ `apps/web` (Next.js + Prisma + PostgreSQL) ที่มีอยู่เดิม
> ยังไม่ได้ตัดสินใจว่าจะให้ตัวไหนเป็นเจ้าของข้อมูลจริง — ดู Q0-1 ใน
> [`docs/uat-2026-08-01-feedback-plan.md`](../../docs/uat-2026-08-01-feedback-plan.md)

---

## โหมด mock / live — สวิตช์เดียวที่ root

ทั้งหน้าเว็บและ service นี้อ่าน `.env` ไฟล์เดียวกันที่ **root ของโปรเจกต์** (`../../.env`)
สลับโหมดที่บรรทัดเดียว:

```bash
MINGHE_MODE=mock   # หรือ live
```

| | `mock` | `live` |
|---|---|---|
| หน้าเว็บเก็บข้อมูลที่ | เบราว์เซอร์ (localStorage) | ฐานข้อมูลผ่าน API ตัวนี้ |
| ต้องรัน MySQL + API ไหม | ไม่ต้อง | ต้อง |
| ปุ่มบัญชีทดลองบนหน้า login | แสดง กดเข้าใช้ได้ทันที | ไม่แสดง |
| `GET /mode` ส่งรายชื่อบัญชีทดลอง | ส่ง | ส่งลิสต์ว่างเสมอ |
| บัญชีทดลองถูก seed ตอน start | seed ให้อัตโนมัติ | ไม่สร้าง |

> แก้ `.env` แล้วต้อง **รีสตาร์ตทั้ง dev server ของหน้าเว็บและ API** — ค่าถูกอ่านตอนเริ่มทำงาน
> และฝั่ง Next.js ถูกฝังลงใน bundle ตอน build

### บัญชีทดลอง (มีผลเฉพาะโหมด mock)

| อีเมล | รหัสผ่าน | ฝั่ง |
|---|---|---|
| `employer@demo.minghe.work` | `demo1234` | องค์กร — เจ้าของ |
| `hr@demo.minghe.work` | `demo1234` | องค์กร — HR |
| `jobseeker@demo.minghe.work` | `demo1234` | คนทำงาน |
| `admin@minghe.work` | `changeme1234` | ผู้ดูแลระบบ |

รายการนี้นิยามที่ [`pkg/models/mockaccount.go`](pkg/models/mockaccount.go) และมีสำเนาฝั่งหน้าเว็บที่
`apps/app/lib/api/mock-accounts.ts` — **แก้ที่ใดที่หนึ่งต้องแก้อีกที่ให้ตรงกัน**

### Google login (F-02)

โค้ดพร้อมใช้งานแล้วทั้งสองฝั่ง — `POST /auth/google` รับ ID token จาก Google Identity Services
ตรวจกับ Google แล้วออก session · ถ้าอีเมลตรงกับบัญชีที่สมัครด้วยรหัสผ่านไว้แล้ว จะผูก `google_id` เข้าบัญชีเดิม

เปิดใช้งานด้วยการตั้งสองค่าใน `.env` ของ root แล้ว**รีสตาร์ตแค่ API**:

```bash
MINGHE_GOOGLE_LOGIN_ENABLED=true
GOOGLE_OAUTH_CLIENT_ID=xxxxx.apps.googleusercontent.com
```

`GET /mode` ประกาศ `google_login_enabled` + `google_client_id` ออกไปให้หน้าเว็บอ่านตอน runtime
จึงไม่ต้อง build หน้าเว็บใหม่ (client id ไม่ใช่ความลับ — ฝังในหน้าเว็บอยู่แล้วตามสเปกของ Google)
ตราบใดที่ยังไม่ครบสองค่า endpoint จะตอบ 501 และ `/mode` จะบอกว่าปิดอยู่

---

## เริ่มใช้งาน

ค่าตั้งอยู่ที่ root — ถ้ายังไม่มีให้คัดลอกจากตัวอย่าง

```bash
cp ../../.env.example ../../.env
```

```bash
docker compose up -d
```

```bash
go run . seed
```

```bash
go run .
```

API จะฟังที่ `http://localhost:5000` — ตรวจว่าขึ้นหรือยังด้วย `GET /healthz`

### คำสั่ง CLI

| คำสั่ง | ผล |
|---|---|
| `go run .` | ยก API server (พอร์ต 5000) |
| `go run . up` | รัน migration อย่างเดียว |
| `go run . seed` | migration + สร้างข้อมูลตั้งต้น (admin, องค์กรตัวอย่าง, ทีม 3 คน) |

บัญชีจาก seed: `admin@minghe.work` / `changeme1234` — **เปลี่ยนรหัสผ่านทันทีหลังใช้ครั้งแรก**

---

## โครงสร้าง

```
apps/api/
├── main.go                        # โหลด env, FX, migration, คำสั่ง CLI
├── seeder.go                      # ข้อมูลตั้งต้นสำหรับ dev
├── docker-compose.yml             # MySQL 8.0 สำหรับเครื่อง dev
├── Dockerfile                     # multi-stage build → alpine
├── migrations/                    # SQL แก้มือ (เอกสารประกอบ)
└── pkg/
    ├── core/config.go             # โครงสร้าง Config ทั้งหมด
    ├── handlers/api/
    │   ├── api.go                 # Server struct + เส้นทาง + middleware chain
    │   ├── middleware.go          # JWT, IsAdmin, OptionalJwt
    │   ├── request/request.go     # OTP, bcrypt, access code, pagination
    │   └── *.handler.go           # หนึ่งไฟล์ต่อหนึ่ง domain
    ├── models/                    # GORM struct + Store interface ต่อ domain
    ├── store/                     # การเข้าถึงข้อมูล (implement interface ใน models)
    ├── services/{email,storage}/  # Gmail API, Cloudflare R2
    ├── logger/                    # logrus + middleware บันทึก request
    └── utils/{dateutil,geo,hashutil,str,validator}/
```

Handler พึ่งพา **interface** ของ store ไม่ใช่ struct จริง — สลับ implementation หรือใส่ mock ตอนทดสอบได้

---

## Domain ที่มีและ feedback ที่รองรับ

| Domain | ตาราง | รองรับ feedback ข้อ |
|---|---|---|
| `user` | `users` | F-02 ล็อกอินอีเมล + Google · F-03 trial แล้วค่อยล็อกอิน |
| `verification` | `verification_codes` | OTP สมัครสมาชิก / รีเซ็ตรหัสผ่าน |
| `organization` | `organizations`, `organization_members`, `teams`, `team_members`, `organization_invites` | F-05 บัญชีบริษัท + คำเชิญ · F-25 team roster |
| `profile` | `profiles` | F-25 ระบบ memory · F-07 วันที่ DMY · F-08 ลิงก์ Google Maps · F-09 ประเภทธุรกิจ |
| `order` | `orders` | คำสั่งซื้อ + ประตูตรวจความยินยอมก่อนชำระเงิน |
| `report` | `reports` | F-21/F-22 momentum · F-23 ชั้นภาษา · F-24 จุดที่ควรบริหาร · F-27 chart<br>(F-20 pairwise คำนวณและแสดงผลฝั่ง TypeScript แล้ว) |
| `consent` | `consents`, `legal_documents` | F-01 เอกสารกฎหมาย · F-06 กล่องยินยอม |

---

## เส้นทาง API

### สาธารณะ

```
GET   /healthz
POST  /auth/requestRegister        ส่ง OTP ไปอีเมล
POST  /auth/register               ยืนยัน OTP + สร้างบัญชี
POST  /auth/login
POST  /auth/google                 รับ Google ID token
POST  /auth/requestResetPassword
POST  /auth/verifyResetPassword
PATCH /auth/resetPassword
GET   /legal                       รายการเอกสารที่เผยแพร่แล้ว
GET   /legal/:slug                 terms | privacy | refund | cookies
POST  /geo/resolve                 แกะลิงก์ Google Maps → พิกัด + ชื่อสถานที่ + เขตเวลา (F-08)
POST  /consents                    บันทึกความยินยอม (ยังไม่ล็อกอินก็ได้)
POST  /r                           เปิดรายงานด้วยรหัส PJX-XXXX-XXXX
```

### ต้องล็อกอิน (`/api`)

```
GET    /me                                          PATCH /me      DELETE /me
GET    /profiles          POST /profiles
GET    /profiles/:id      PATCH /profiles/:id        DELETE /profiles/:id
GET    /organizations     POST /organizations
GET    /organizations/:id PATCH /organizations/:id
GET    /organizations/:id/members    POST /organizations/:id/members
DELETE /organizations/:id/members/:userId
GET    /organizations/:id/invites    DELETE /organizations/:id/invites/:inviteId
GET    /organizations/:id/teams      POST /organizations/:id/teams
GET    /teams/:id/members            POST /teams/:id/members
DELETE /teams/:id/members/:profileId
GET    /orders            POST /orders
GET    /orders/:id        POST /orders/:id/pay       GET /orders/:id/report
```

### ผู้ดูแลระบบ (`/admin`)

```
GET   /users              PATCH /users/:id/status
GET   /orders             POST  /orders/:id/process
GET   /legal              POST  /legal
```

---

## จุดที่ควรรู้ก่อนแก้ต่อ

**คำเชิญเข้าองค์กรรับได้แม้ยังไม่มีบัญชี (F-05)** — `POST /organizations/:id/members` ตอบต่างกันสามแบบ
โดยตั้งใจ: `201` เข้าเป็นสมาชิกทันที (มีบัญชีแล้ว) · `200` เปลี่ยนบทบาทของสมาชิกเดิม · `202` ค้างเป็นคำเชิญ
คำเชิญที่ค้างจะถูกผูกให้อัตโนมัติที่ `claimPendingInvites()` ทุกครั้งที่ผู้ใช้สมัคร ล็อกอิน หรือเข้าด้วย Google
— จึงไม่ต้องมีหน้า "กดรับคำเชิญ" แยก และรองรับกรณีที่คำเชิญถูกส่งหลังจากเขามีบัญชีแล้วด้วย

**ตัวแกะลิงก์ Google Maps ต้องอยู่ฝั่ง server (F-08)** — ลิงก์ย่อ `maps.app.goo.gl` ไม่มีพิกัดอยู่ใน URL
ต้องยิงตาม redirect ซึ่งเบราว์เซอร์ทำไม่ได้เพราะ CORS · `pkg/utils/geo` กัน SSRF ไว้สองชั้น
(อนุญาตเฉพาะโดเมนของ Google + บล็อกปลายทางที่ resolve เป็น IP ภายใน)
`pkg/utils/geo/timezone.go` เดาเขตเวลาจากพิกัดด้วยตารางภูมิภาค เพราะสูตร `lng/15` ผิดกับจีน อินเดีย เนปาล เมียนมา
— ค่าที่ได้เป็นแค่ค่าตั้งต้น หน้าเว็บให้ผู้ใช้ยืนยันหรือแก้เองก่อนคำนวณเสมอ

**วันที่รับเป็น DD/MM/YYYY เท่านั้น (F-07)** — `dateutil.ParseDMY` ไม่รับ ISO และไม่รับ MM/DD
ถ้าส่ง `1990-09-13` มาจะได้ 422 พร้อมข้อความภาษาไทย จงใจให้เข้มเพื่อไม่ให้เกิดความกำกวมระหว่าง
`01/02` กับ `02/01` ฝั่ง client แปลงเป็น ISO เองไม่ได้

**ลิงก์ Google Maps ต้องแกะฝั่ง server (F-08)** — `pkg/utils/geo/googlemaps.go`
รองรับทั้ง `@lat,lng`, `?q=`, `!3d!4d` และลิงก์ย่อ `maps.app.goo.gl` (ตาม redirect สูงสุด 5 ชั้น)
มีการกรอง host และกันไม่ให้ลิงก์ชี้กลับเข้าเครือข่ายภายใน ถ้าแกะไม่ได้จะยอมรับก็ต่อเมื่อมี
`birth_province` เป็นทางสำรอง

**ความยินยอมเป็นประตูจริงของการชำระเงิน (F-06)** — `POST /orders/:id/pay` บังคับ `consent_id`
กล่องติ๊กฝั่ง UI เป็นแค่ชั้นแรก ชั้นที่ผูกพันคือเรคคอร์ด `consents` ที่เก็บ IP, user agent,
เวลา และ **เวอร์ชันของเอกสารที่ยอมรับ** โดยเวอร์ชันมาจากฝั่ง server เสมอ ไม่รับจาก client

**คอลัมน์ JSON เป็น NULL ได้** — MySQL ปฏิเสธสตริงว่างในคอลัมน์ชนิด JSON
ฟิลด์อย่าง `Report.NarrativeJSON` จึงเป็น `*string` โดย `nil` แปลว่า "ยังไม่ได้ทำส่วนนี้"

**การชำระเงินยังเป็น mock** — `PayOrder` เชื่อผลจาก client อยู่
เมื่อสรุปผู้ให้บริการแล้ว (Q0-3) ต้องย้ายการยืนยันไปที่ webhook มี `hashutil.VerifyHMAC` เตรียมไว้แล้ว

**`google_id` ต้องเป็น NULL เมื่อไม่ได้ผูก Google** — คอลัมน์นี้มี unique index
MySQL ยอมให้ NULL ซ้ำได้แต่ไม่ยอมให้สตริงว่างซ้ำ ฟิลด์จึงเป็น `*string`
(เจอตอน seed บัญชีทดลองใบที่สองแล้วชน — มี migration `20260822_google_id_null_when_unused` แก้ข้อมูลเดิมให้)

**seed ไม่เผยแพร่เอกสารกฎหมาย** — สร้างเป็นฉบับร่างเปล่าเท่านั้น
ข้อความกฎหมายต้องผ่านการตรวจโดยผู้รับผิดชอบก่อน publish (F-01)

---

## เพิ่ม domain ใหม่

1. `pkg/models/<domain>.go` — GORM struct + Store interface + Query struct
2. `pkg/store/<domain>/<domain>.store.go` — implement interface
3. `pkg/handlers/api/<domain>.handler.go` — handler ของ Echo
4. `main.go` — เพิ่ม `fx.Provide` และเพิ่ม model ใน `AutoMigrate`
5. `pkg/handlers/api/api.go` — เพิ่มฟิลด์ใน `Server`, พารามิเตอร์ใน `NewServer`, และลงทะเบียนเส้นทาง

---

## Convention

- พอร์ต **5000** · timezone **Asia/Bangkok** (ตรึงที่ startup)
- JSON key เป็น **snake_case** · error shape คือ `{"error": "message"}`
- ไม่ใช้ soft delete — ใช้ฟิลด์ `status` แทน
- role: `admin` | `user` · status: `active` | `deactivated`
- token อายุ **7 วัน**, HS256 — ตรวจสถานะบัญชีจาก DB ทุก request ให้การระงับบัญชีมีผลทันที
- เงินเก็บเป็น **สตางค์** (`amount_satang`) กันปัญหาทศนิยม
- ราคาคำนวณฝั่ง server เสมอ ไม่รับตัวเลขราคาจาก client
