# @minghe/app — หน้าเว็บ minghe.work

Next.js 15 (App Router, **static export**) + **TanStack Query** · คุยกับ Go API ที่ `apps/api`

## สิ่งที่ทำได้

- **คำนวณปาจือจริง** ผ่าน `@minghe/core` และ **ประกอบรายงาน** ผ่าน `@minghe/report` ในเบราว์เซอร์ (deterministic)
- **สมัครสมาชิกด้วยอีเมล + OTP** (`/register`) · ลืมรหัสผ่าน (`/forgot-password`) · ล็อกอิน (`/login`) — F-02
- **เข้าสู่ระบบด้วย Google (F-02)** — โค้ดครบทั้งสองฝั่ง ปุ่มเปิดใช้งานเองเมื่อ API ประกาศว่ามี OAuth client
  (อ่านจาก `/mode` ตอน runtime ไม่ได้ฝังตอน build) · โหมด mock เปลี่ยนเป็นตัวเลือก "บัญชี Google จำลอง"
- **สถานที่เกิดจากลิงก์ Google Maps (F-08)** — วางลิงก์ → กดตรวจ → ยืนยันชื่อสถานที่ พิกัด และเขตเวลา
  ก่อนคำนวณ · แกะไม่ได้ตกกลับไป dropdown จังหวัด · รองรับคนเกิดต่างประเทศผ่าน `tzOffsetHours`
- **Employer**: wizard 5 สเตป + team roster + dashboard องค์กร · **Job Seeker**: เช็กบริษัท + dashboard ส่วนตัว
- **บัญชีองค์กรหลายคน (F-05)** — เจ้าของเชิญสมาชิกด้วยอีเมลได้จริง รวมถึงอีเมลที่**ยังไม่มีบัญชี**
  (คำเชิญค้างไว้แล้วผูกให้อัตโนมัติตอนเขาเข้าระบบครั้งแรก) · HR เห็นรายชื่อแต่เชิญไม่ได้
- **ระบบ memory (F-25)** — `/employer/memory`: โปรไฟล์ที่บันทึกอัตโนมัติตอนสั่งซื้อ + Team Roster
  ที่ดึงเข้า wizard ได้ทั้งชุด · ฝั่งคนทำงานมีการ์ด "ข้อมูลที่ระบบจำไว้" บน dashboard · ลบรายคนได้ (PDPA)
- **ความสัมพันธ์รายคู่ในรายงาน (F-20)** — candidate เทียบสมาชิกทีมทีละคน เรียงตามคะแนน
  พร้อมป้ายความสัมพันธ์ไทย+วงเล็บจีน และคำบรรยายว่าเข้ากันเพราะอะไร / ต้องระวังอะไร
- **First-time trial (F-03)**: กรอกได้โดยไม่ล็อกอิน เจอประตูล็อกอินตอนชำระ กลับมาแล้วร่างยังอยู่
- **ประตูความยินยอม (F-06)**: ติ๊กยอมรับเอกสาร 3 ฉบับก่อนจ่าย (live บันทึกเป็นเรคคอร์ด `consents`)
- ออกรหัสเปิด `PJX-XXXX-XXXX` (+ PIN บางฉบับ) → เปิดรายงานที่ `/r` โดยไม่ต้องล็อกอิน
- **Admin Console** `/admin`: คิวงานแบบ "รับเรื่อง" กันแอดมินชนกัน (409), ระงับ/คืนสิทธิ์ผู้ใช้, สถานะเอกสารกฎหมาย
- **เอกสารกฎหมาย 4 ฉบับ (F-01)** — เนื้อหาจริงอยู่ใน `lib/legal/` เรนเดอร์แบบ static
  ยังเป็น **ฉบับร่าง**: ทุกหน้าขึ้นแถบ "ยังไม่มีผลบังคับใช้" และไฮไลต์ทุกช่องที่ยังต้องเติมข้อมูล

## Route

| Route | |
|---|---|
| `/` · `/pricing` · `/employer` · `/jobseeker` | Landing / ราคา / intro |
| `/login` · `/register` · `/forgot-password` | auth (อีเมล + OTP · Google พร้อมใช้เมื่อตั้ง Client ID) |
| `/employer/new` · `/employer/dashboard` · `/employer/memory` | ฝั่งองค์กร (wizard · ภาพรวม · คลังข้อมูล) |
| `/jobseeker/new` · `/jobseeker/dashboard` | ฝั่งคนทำงาน |
| `/report` · `/r` | รายงาน / เปิดด้วยรหัส |
| `/admin` | Admin Console (role=admin — API บังคับอีกชั้น) |
| `/legal/{terms,privacy,refund,cookies}` | เอกสารกฎหมาย — มีเนื้อหาจริงแล้ว สถานะ "ร่าง" |

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
├── lib/google.ts         # ขอ ID token จาก Google Identity Services (F-02) — ไม่แตะ client secret
├── lib/place.ts          # แปลงสถานที่เกิดระหว่างฟอร์ม / engine / คลังข้อมูล (F-08 + F-25)
├── lib/legal/            # เนื้อหาเอกสารกฎหมาย 4 ฉบับ + SELLER (F-01)
├── components/providers.tsx        # QueryClientProvider > SessionProvider
├── components/otp-field.tsx        # ช่อง OTP + กล่องแสดง dev_code เมื่อเซิร์ฟเวอร์ echo
├── components/fields.tsx           # ชิ้นส่วนฟอร์มพื้นฐาน (แยกจาก forms.tsx กัน import วนกัน)
├── components/birth-place-field.tsx    # ช่องลิงก์ Google Maps + ยืนยันพิกัด + เขตเวลา (F-08)
├── components/google-sign-in-button.tsx # ปุ่ม Google ที่อ่านสถานะจาก /mode (F-02)
├── components/org-members-card.tsx      # สมาชิกองค์กร + ฟอร์มเชิญ (F-05)
├── components/memory-picker.tsx         # "ใช้ข้อมูลที่เคยกรอก" + ดึงทีมทั้งชุดเข้า wizard (F-25)
├── components/legal-document.tsx        # เรนเดอร์เอกสารกฎหมาย + แถบร่าง + ไฮไลต์ช่องว่าง (F-01)
├── components/logo.tsx             # โลโก้จากไฟล์จริงใน public/brand (F-11)
├── public/brand/         # โลโก้ที่แยกจาก logo.png — สร้างด้วย tools/brand/extract-logo.py
├── Dockerfile            # build static → nginx (proxy /backend → api)
└── docker/nginx.conf.template
```

กติกา: **หน้าจอไม่เรียก `client` ตรง ๆ** — เพิ่ม endpoint ใหม่ = เพิ่ม method ใน `types.ts` → implement ทั้ง `live-client` และ `mock-client` → เพิ่ม hook ใน `queries.ts`

## ค่าตั้ง (ฝังตอน build — `process.env` ชนะไฟล์ `.env` ของ root)

| ตัวแปร | ค่าเริ่มต้น | |
|---|---|---|
| `MINGHE_MODE` | `live` | `mock` = ในเบราว์เซอร์ล้วน + แถบโหมดสาธิต + ปุ่มบัญชีทดลอง |
| `MINGHE_API_BASE_URL` | `http://localhost:5000` | URL หรือ path ของ API (Docker ใช้ `/backend`) |
| `MINGHE_GOOGLE_LOGIN_ENABLED` | `false` | ค่าตั้งต้นระหว่างโหลด — **แหล่งความจริงจริง ๆ คือ `/mode` ของ API ตอน runtime** |

> **ปุ่ม Google ไม่ต้อง build ใหม่**: ได้ Client ID มาแล้วตั้ง `MINGHE_GOOGLE_LOGIN_ENABLED=true`
> กับ `GOOGLE_OAUTH_CLIENT_ID=...` ใน `.env` ของ root แล้วรีสตาร์ตแค่ API — หน้าเว็บอ่านสถานะเองผ่าน `/mode`
> (จำเป็น เพราะหน้าเว็บเป็น static export ถ้าฝังตอน build จะต้อง build ใหม่ทุกครั้งที่เปลี่ยนค่า)

## รัน / build

```bash
pnpm --filter @minghe/app dev      # http://localhost:4311
pnpm --filter @minghe/app lint     # tsc --noEmit
pnpm --filter @minghe/app build    # static export → out/
```

> อย่ารัน `next build` ขณะ `next dev` ยังทำงานอยู่ — `.next` cache จะชนกัน

Deploy จริงผ่าน GitHub Actions → Cloudflare Pages (ดู [`docs/deploy.md`](../../docs/deploy.md))
