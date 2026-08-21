# @minghe/app — หน้าเว็บ minghe.work

Next.js 15 (App Router, **static export**) + **TanStack Query** · คุยกับ Go API ที่ `apps/api`

## สิ่งที่ทำได้

- **คำนวณปาจือจริง** ผ่าน `@minghe/core` และ **ประกอบรายงาน** ผ่าน `@minghe/report` ในเบราว์เซอร์ (deterministic)
- **สมัครสมาชิกด้วยอีเมล + OTP** (`/register`) · ลืมรหัสผ่าน (`/forgot-password`) · ล็อกอิน (`/login`) — F-02
- **Employer**: wizard 5 สเตป + team roster + dashboard องค์กร · **Job Seeker**: เช็กบริษัท + dashboard ส่วนตัว
- **First-time trial (F-03)**: กรอกได้โดยไม่ล็อกอิน เจอประตูล็อกอินตอนชำระ กลับมาแล้วร่างยังอยู่
- **ประตูความยินยอม (F-06)**: ติ๊กยอมรับเอกสาร 3 ฉบับก่อนจ่าย (live บันทึกเป็นเรคคอร์ด `consents`)
- ออกรหัสเปิด `PJX-XXXX-XXXX` (+ PIN บางฉบับ) → เปิดรายงานที่ `/r` โดยไม่ต้องล็อกอิน
- **Admin Console** `/admin`: คิวงานแบบ "รับเรื่อง" กันแอดมินชนกัน (409), ระงับ/คืนสิทธิ์ผู้ใช้, สถานะเอกสารกฎหมาย

## Route

| Route | |
|---|---|
| `/` · `/pricing` · `/employer` · `/jobseeker` | Landing / ราคา / intro |
| `/login` · `/register` · `/forgot-password` | auth (อีเมล + OTP · Google ปิดอยู่จนกว่าจะมี OAuth client) |
| `/employer/new` · `/employer/dashboard` | ฝั่งองค์กร |
| `/jobseeker/new` · `/jobseeker/dashboard` | ฝั่งคนทำงาน |
| `/report` · `/r` | รายงาน / เปิดด้วยรหัส |
| `/admin` | Admin Console (role=admin — API บังคับอีกชั้น) |
| `/legal/{terms,privacy,refund,cookies}` | เอกสารกฎหมาย — ยัง stub รอ F-01 |

## โครงสร้างโค้ด

```
apps/app/
├── lib/env.ts            # MINGHE_* ที่ฝังมาจาก next.config.mjs (IS_MOCK, API_BASE_URL)
├── lib/queries.ts        # 🎯 TanStack Query hooks — หน้าจอเรียกข้อมูลผ่านที่นี่เท่านั้น
├── lib/api/
│   ├── types.ts          # MingheClient — สัญญากลาง (auth · otp · orders · admin)
│   ├── live-client.ts    # โหมด live → Go API (API_BASE_URL เป็น path สัมพัทธ์ได้ เช่น /backend)
│   ├── mock-client.ts    # โหมด mock → localStorage (ครอบทุก method ของ live — A-03)
│   └── mock-accounts.ts  # บัญชีทดลอง (ต้องตรงกับ apps/api/pkg/models/mockaccount.go)
├── lib/session.tsx       # SessionProvider — token ใน localStorage, adoptSession หลังสมัคร, returnTo
├── lib/roles.ts          # นิยาม 4 บทบาท: sees / can / cant / home
├── lib/store.ts          # sessionStorage: คำสั่งซื้อที่เปิดอยู่ + ร่าง wizard (F-03)
├── components/providers.tsx  # QueryClientProvider > SessionProvider
├── components/otp-field.tsx  # ช่อง OTP + กล่องแสดง dev_code เมื่อเซิร์ฟเวอร์ echo
├── Dockerfile            # build static → nginx (proxy /backend → api)
└── docker/nginx.conf.template
```

กติกา: **หน้าจอไม่เรียก `client` ตรง ๆ** — เพิ่ม endpoint ใหม่ = เพิ่ม method ใน `types.ts` → implement ทั้ง `live-client` และ `mock-client` → เพิ่ม hook ใน `queries.ts`

## ค่าตั้ง (ฝังตอน build — `process.env` ชนะไฟล์ `.env` ของ root)

| ตัวแปร | ค่าเริ่มต้น | |
|---|---|---|
| `MINGHE_MODE` | `live` | `mock` = ในเบราว์เซอร์ล้วน + แถบโหมดสาธิต + ปุ่มบัญชีทดลอง |
| `MINGHE_API_BASE_URL` | `http://localhost:5000` | URL หรือ path ของ API (Docker ใช้ `/backend`) |
| `MINGHE_GOOGLE_LOGIN_ENABLED` | `false` | ปุ่ม Google แสดงแต่กดไม่ได้ จนกว่าจะมี Client ID |

## รัน / build

```bash
pnpm --filter @minghe/app dev      # http://localhost:4311
pnpm --filter @minghe/app lint     # tsc --noEmit
pnpm --filter @minghe/app build    # static export → out/
```

> อย่ารัน `next build` ขณะ `next dev` ยังทำงานอยู่ — `.next` cache จะชนกัน

Deploy จริงผ่าน GitHub Actions → Cloudflare Pages (ดู [`docs/deploy.md`](../../docs/deploy.md))
