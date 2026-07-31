# 命合 Mìnghé — Prototype (Static Demo)

เวอร์ชัน **prototype สำหรับนำเสนอ** — ไม่มี backend / API / ฐานข้อมูล / ระบบล็อกอิน
ทุกอย่างคำนวณ **ในเบราว์เซอร์** แล้ว export เป็นไฟล์ static (`next build` → `out/`)
deploy ได้ทั้ง **Vercel** และ **Cloudflare Pages**

> ของจริง (full-stack: Prisma + Postgres + auth + payment) ยังอยู่ครบที่ `apps/web`
> — prototype นี้แยกออกมาเพื่อเดโมโดยเฉพาะ โดย reuse เครื่องคำนวณชุดเดียวกัน

## สิ่งที่ prototype นี้ทำได้จริง (ไม่ต้องมี API)

- **คำนวณปาจือจริง** ผ่าน `@minghe/core` (lunar-typescript) — ตั้งเสาสี่ต้นจากลี่ชุน/สารทหลัก + เวลาสุริยะจริง
- **ประกอบรายงานจริง** ผ่าน `@minghe/report` (`assembleReport` + `buildNarrative`) แบบ deterministic ล้วน
- สิบเทพเชิง %, ดาวจุติ (神煞: 桃花/文昌/天乙贵人 — lookup table ในตัว), ดัชนีสมพงษ์ (合 Index)
- ครบทั้ง 2 ผลิตภัณฑ์: **Employer** (wizard 5 สเตป + team roster) และ **Job Seeker**
- ชำระเงินจำลอง (mock) → ออกรหัสเปิด (PJX-XXXX-XXXX) → เปิดรายงาน + พิมพ์ PDF

## หน้าเว็บ

| Route | สิ่งที่แสดง |
|-------|-----------|
| `/` | Landing — แบรนด์ + สองผลิตภัณฑ์ + ห้าธาตุ |
| `/pricing` | ราคาสเปกใหม่ (Employer 699 / JobSeeker 399·199 + add-ons) |
| `/employer` · `/employer/new` · `/employer/dashboard` | ฝั่งองค์กร: intro / wizard 5 สเตป / dashboard |
| `/jobseeker` · `/jobseeker/new` · `/jobseeker/dashboard` | ฝั่งคนทำงาน |
| `/report` | รายงาน (อ่านออเดอร์จาก session; ถ้าไม่มี → รายงานตัวอย่างสด) |

## รันในเครื่อง

```bash
pnpm install
pnpm --filter @minghe/proto dev      # http://localhost:4311
```

## Build (static export)

> อย่ารัน `next build` ขณะ `next dev` ยังทำงานอยู่ (มันจะชน `.next` cache)

```bash
pnpm --filter @minghe/proto build    # ได้ผลลัพธ์ที่ apps/proto/out/
```

## Deploy

### Vercel
สร้างโปรเจกต์ใหม่บน Vercel แล้วตั้งค่า:
- **Root Directory:** `apps/proto`
- Framework preset: **Next.js** (auto) — `apps/proto/vercel.json` กำหนด build/install ให้แล้ว
- ไม่ต้องตั้ง env ใดๆ (ไม่มี DB/API)

### Cloudflare Pages
- **Build command:** `pnpm install --no-frozen-lockfile && pnpm --filter @minghe/proto build`
- **Build output directory:** `apps/proto/out`
- **Environment variable:** `NODE_VERSION = 20`

(สร้างขึ้นเป็น multi-page static ทั้งหมด — ทั้งสองแพลตฟอร์มเสิร์ฟ `out/` ได้ตรงๆ)

## หมายเหตุ / open items (อ้างอิง handoff)

- ทิศทางแบรนด์ = โทนอุ่นสว่าง (mockup) ตามที่ยืนยัน
- ราคา "Executive Analysis +89" vs "Executive Insights +399" ยังรอสรุป — prototype แสดงทั้งคู่
- โหงวเฮ้ง (Face Reading) = Coming Soon
- ฟอนต์ใช้ Google Fonts ชั่วคราว (Cormorant/Trirong/Sarabun/Sacramento) รอฟอนต์จริงจากอาจารย์เม
