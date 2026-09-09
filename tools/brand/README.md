# tools/brand — สคริปต์งานแบรนด์

สคริปต์ทั้งหมด **รันจาก root ของโปรเจกต์** (ไม่ใช่จากในโฟลเดอร์นี้) เพราะอ่าน `.env` และเขียนลง `apps/app/public/`

```bash
pip install pillow numpy requests
```

## `extract-logo.py` — แยกชิ้นส่วนโลโก้จาก `logo.png` (F-11)

`logo.png` ที่ลูกค้าส่งมาเป็นแผ่น brand sheet ขนาด 1920×1080 มีโลโก้สามแบบอยู่บนพื้นครีมสีเดียว
สคริปต์ตัดออกเป็นชิ้น ๆ แล้วถอดพื้นครีมออกด้วยการ unpremultiply เทียบสีพื้นที่รู้ค่าแน่นอน
— ได้ PNG พื้นโปร่งที่ขอบตัวอักษรยังไล่ระดับครบ ไม่เป็นขอบหยัก

```bash
python tools/brand/extract-logo.py
```

ผลลัพธ์ลง `apps/app/public/brand/` — `logo-lockup` / `logo-wordmark` / `logo-mark` อย่างละสองเวอร์ชัน
(ปกติ + `-light` สำหรับพื้นเข้ม)

> **ถ้าลูกค้าส่ง `logo.png` ฉบับใหม่มา** ให้ตรวจพิกัดกรอบในตัวแปร `cut(...)` ก่อนรัน
> เพราะสคริปต์ตัดตามพิกัดคงที่ของแผ่นเดิม
>
> **ถ้าได้ไฟล์เวกเตอร์ (.ai / .svg) มา** ให้ใช้ไฟล์นั้นแทนผลจากสคริปต์นี้ —
> ภาพ raster ขยายใหญ่มาก ๆ (ป้าย งานพิมพ์) จะไม่คม

## `make-favicon.py` — favicon จากมาร์คของแบรนด์

```bash
python tools/brand/make-favicon.py
```

เขียน `apps/app/app/{icon.png,apple-icon.png,favicon.ico}` — Next.js App Router ใส่ `<link>` ให้เอง
ต้องรัน `extract-logo.py` ก่อนเสมอ เพราะอ่านจาก `logo-mark.png`

## `gen-images.py` — เจนภาพประกอบด้วย FLUX (F-16, F-17)

ใช้ `BFL_API_KEY` จาก `.env` ของ root

```bash
python tools/brand/gen-images.py                 # เจนใหม่ทั้งหมด
python tools/brand/gen-images.py employer-a      # เจนเฉพาะบางภาพ
```

| ไฟล์ | ใช้ที่ไหน | โจทย์ |
|---|---|---|
| `hero-elements.jpg` | hero หน้าแรก | F-16 — ภาพเดียวที่ represent ครบห้าธาตุ |
| `brand-band-elements.jpg` | แถบแบรนด์ท้ายหน้าแรก | F-16 — ห้าธาตุแบบแถบพื้นผิว |
| `employer-a/b.jpg` | การ์ดองค์กร + หน้า `/employer` | F-17 — สื่อว่าเป็นนายจ้าง มีบริบทเรื่องงาน |
| `jobseeker-a/b.jpg` | การ์ดคนทำงาน + หน้า `/jobseeker` | F-17 — สื่อว่าเป็นคนหางาน กำลังชั่งใจเรื่องงาน |

ตัวที่เลือกใช้จริงถูก **คัดลอก** ไปเป็น `employer.jpg` / `jobseeker.jpg` / `brand-band.jpg`
เปลี่ยนใจเลือกอีกตัวก็แค่ copy ทับ ไม่ต้องแก้โค้ด:

```bash
cp apps/app/public/img/employer-b.jpg apps/app/public/img/employer.jpg
```

prompt ทั้งหมดอยู่ในตัวสคริปต์ — แก้ prompt แล้วรันใหม่ได้เลย seed ถูกตรึงไว้เพื่อให้เจนซ้ำได้ผลเดิม

## `optimize-images.py` — บีบภาพใน `public/img` (งานเร็วเว็บ)

ภาพชุดเดิมถูกเรนเดอร์มาด้วย quality สูงมาก (ไฟล์ละ 200-370 KB) เกินความจำเป็นสำหรับ
ขนาดที่แสดงจริงบนหน้าเว็บ สคริปต์นี้บีบ JPEG ทับที่เดิม (quality 82 + progressive)
แล้วสร้าง `.webp` คู่กันไว้ให้ `<Picture>` (`apps/app/components/picture.tsx`) เลือกใช้ก่อน

```bash
python tools/brand/optimize-images.py
```

รันซ้ำได้ ไม่พัง — แต่ไม่ได้อะไรเพิ่ม (ไฟล์ที่เล็กอยู่แล้วจะไม่ถูกเขียนทับ)

> **ถ้าเพิ่มรูปใหม่ลง `public/img/`** ให้รันสคริปต์นี้ก่อน commit
> ไม่งั้น `<Picture>` จะชี้ไปที่ `.webp` ที่ยังไม่มี แล้วเบราว์เซอร์จะตกไปโหลด `.jpg` ก้อนใหญ่แทน

## `subset-cjk-font.py` — ฟอนต์จีนฉบับ subset

ดึง `Noto_Serif_SC` จาก `next/font/google` ตรง ๆ จะได้ @font-face กลับมา 300+ ก้อน
(ซอยตามช่วง unicode ของตัวจีนทั้งชุด) กลายเป็น CSS ~279 KB ที่บล็อกการเรนเดอร์ทุกหน้า
ทั้งที่เว็บนี้ใช้ตัวจีนจริงแค่ ~225 ตัว

```bash
python tools/brand/subset-cjk-font.py
```

ผลลัพธ์ลง `apps/app/app/fonts/noto-serif-sc-subset-400.woff2` (~42 KB) — `app/layout.tsx`
เรียกผ่าน `next/font/local`

> **ต้องรันใหม่เมื่อเพิ่มตัวจีนตัวใหม่ลงในโค้ด** ถ้าลืม ตัวที่ขาดจะไม่ขึ้นเป็นสี่เหลี่ยมเปล่า
> แต่ตกไปใช้ฟอนต์จีนของระบบ (ดู `fallback` ใน `app/layout.tsx`) ซึ่งหน้าตาจะหลุดโทนแบรนด์
