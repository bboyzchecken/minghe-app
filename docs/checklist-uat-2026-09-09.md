# Checklist ตรวจก่อนเปิด UAT — ใช้เช็ควันที่ 8 ก.ย. 2026

> ที่มา: [MingHe-TestCases-SIT_v2.0](MingHe-TestCases-SIT_v2_0.docx) + [dev plan UAT](dev-plan-uat-2026-09-09.md)
> **เอกสาร SIT baseline ไว้ 26 ส.ค. ก่อนคำตอบ อ.เม (8 ก.ย.)** — บางเคสจึงยังปิดไม่ได้รอบนี้ ดู §D
> ผลตรวจในไฟล์นี้มาจากการรันจริงวันที่ 8 ก.ย. 2026

---

## A · เช็คด้วยคำสั่ง — รันแล้วรู้ผลทันที (~5 นาที)

ตั้งต้นก่อนทุกครั้ง: `nvm use 22`

- [x] `cd packages/core && npx tsc --noEmit` → **0 error** ✅ ผ่านแล้ว
- [x] `cd packages/report && npx tsc --noEmit` → **0 error** ✅ ผ่านแล้ว
- [x] `cd apps/app && npx tsc --noEmit` → **0 error** ✅ ผ่านแล้ว
- [x] `cd packages/core && npx vitest run` → **69/69** ✅ ผ่านแล้ว
- [x] `cd packages/report && npx vitest run` → **4/4** ✅ ผ่านแล้ว
- [x] `cd apps/app && npx next build` → **exit 0 · 48 หน้า** ✅ ผ่านแล้ว
- [x] `grep -rn "ซินแสตรวจทาน" apps/app/app apps/app/lib apps/app/components` → **0 จุด** ✅ S3 ปิดแล้ว
- [ ] `grep -rn "ธาตุอุปการะ" apps/app/app apps/app/lib apps/app/components packages/core/src` → ต้องเหลือ **0** · **ตอนนี้ยังเหลือ 16 จุด** ❌
- [ ] `pnpm install --frozen-lockfile` บนเทอร์มินัลที่เพิ่งเปิดใหม่ → ผ่านโดยไม่มี error

---

## B · งานที่ต้องปิดให้จบก่อนพรุ่งนี้

### B0 · เร่งด่วนที่สุด — งาน S2+S3 ยังไม่ commit
- [ ] commit `apps/app/app/page.tsx` · `employer/page.tsx` · `employer/new/page.tsx` · `lib/pricing.ts`
- [ ] commit ไฟล์ใหม่ที่ยัง untracked: `app/about/` · `app/elements/` · `lib/content/{home,about,stems}.ts`
- [ ] **ทำก่อนอย่างอื่น** — ถ้าเครื่องมีปัญหาคืนนี้ = งานสองสายหายทั้งคู่

### B1 · S1 — คำว่า "ธาตุอุปถัมภ์" (อ.เม ยืนยัน 8 ก.ย. ข้อ 2.1) ❌ ยังไม่เริ่ม
- [ ] แก้ค่า `USEFUL_GOD.th` ที่ [glossary.ts:45](../packages/core/src/glossary.ts#L45) จาก `ธาตุอุปการะ` → `ธาตุอุปถัมภ์` (ตอนนี้ยังเป็น TODO)
- [ ] ไล่แก้คำเดิมที่กระจายอยู่ให้ครบ **16 จุด**
- [ ] เขียน `packages/core/tests/glossary.test.ts` — ทุกคีย์ต้องมีครบ 4 field ไม่มีค่าว่าง
- [ ] เติม `hint` ในฟอร์มสองฝั่ง ([employer/new](../apps/app/app/employer/new/page.tsx) · [jobseeker/new](../apps/app/app/jobseeker/new/page.tsx))
- [ ] **เกณฑ์ผ่าน**: grep คำเดิมเหลือ 0 · เปิดฟอร์มเห็นคำอธิบายใต้ช่อง

### B2 · S4 — ดาวในรายงาน (อ.เม ข้อ 1.2) ❌ ยังไม่เริ่ม
- [ ] เติม 4 field ที่ [stars.ts](../apps/app/lib/stars.ts) ยังไม่มี: `pillar` · `elementStatus` · `isClashed` · `domain` (ตอนนี้มี 6 field เดิม)
- [ ] ท่อกรอง — ดาวที่ถูกชง/ธาตุให้โทษรุนแรง ต้องไม่แสดง
- [ ] เพิ่ม section "ดาวประจำดวง" ใน [narrative.ts](../packages/report/src/narrative.ts) — ตอนนี้ narrative ไม่มีหัวข้อดาว (มีแต่ Section ใน [report-view.tsx:178](../apps/app/components/report/report-view.tsx#L178))
- [ ] **ดาวห้าม override ข้อสรุป** — วางท้ายลำดับ ไม่ใช่ headline

### B3 · S5 — 大運 (อ.เม ข้อ 4.1 + 4.2) ❌ ยังไม่เริ่ม
- [ ] `computeLuckPillars` ที่ [luck-pillars.ts](../packages/core/src/luck-pillars.ts) **ยัง throw อยู่** — ต้องเขียนสูตรจริง
- [ ] ทิศทางจากเพศ + หยิน-หยางของก้านปี · นับวันถึงเจี๋ยชี่ ÷ 3 · คืนอย่างน้อย 8 เสา
- [ ] ใช้ `lunar-typescript` ที่มีอยู่ — **ห้ามเพิ่ม dependency**
- [ ] เทสต์ `luck-pillars.test.ts` ≥ 6 เคส (ชาย/หญิง × ปีหยาง/ปีหยิน × เกิดใกล้เจี๋ยชี่)
- [ ] **เกณฑ์ผ่าน**: core เทสต์เดิม 69 เคสต้องไม่พัง

---

## C · เดินโฟลว์ด้วยมือ (โหมด mock) — ทำหลัง merge ครบ

- [ ] ฝั่งองค์กร: หน้าแรก → ฉันเป็นองค์กร → กรอกฟอร์ม → teaser → บังคับ login → ชำระเงิน → เปิดรายงาน
- [ ] ฝั่งคนหางาน: เส้นทางเดียวกันจนจบ
- [ ] สมัครสมาชิก + OTP + ลืมรหัสผ่าน
- [ ] เปิดรายงานด้วยรหัสที่ `/r`
- [ ] เปิดหน้าใหม่ของ S2 ทุกหน้า — `/about` · `/elements` · `/elements/[stem]` ครบ 10 ก้าน — ไม่มี 404
- [ ] เปิดบนมือถือ 1 รอบ (หน้าแรก + ฟอร์ม + รายงาน)
- [ ] ตรวจย่อหน้าแก้ความขัดแย้งในจดหมาย `/about` — ต้องมีประโยค "AI ไม่แตะการคำนวณ"

---

## D · เคสใน SIT ที่ยัง **ปิดไม่ได้รอบนี้** — ต้องแจ้งผู้ทดสอบก่อนเริ่ม

> เขียนเป็นเอกสาร "สิ่งที่ยังไม่มีในรอบนี้" ให้ผู้ทดสอบอ่านก่อน กันการรายงานเป็นบั๊กทั้งที่ยังไม่ได้ทำ

- [ ] **TC_CALC_002 (บางส่วน)** — สี่เสา + ดิถีผ่าน แต่ **月令 / Month Command ยังไม่มีในโค้ด** → แจ้งว่าตรวจได้เฉพาะสี่เสาและดิถี
- [ ] **TC_PROF_001** — Five Structures / Ten Profiles **ยังไม่มีกฎ derive** ([spec-round2-plan.md:77–78](spec-round2-plan.md#L77))
- [ ] **TC_UI_002 · TC_UI_003** — ตามมาจาก TC_PROF_001 ยังแสดงผลไม่ได้
- [ ] **TC_UI_001** — Evidence Layer panel ยังไม่มี
- [ ] **TC_LLM_001** — reasoning 19 ขั้นยังไม่มี (`llm.ts` ทำแค่ขัดเงาภาษา) — dev plan ระบุเองว่าไม่ลงรอบนี้
- [ ] **TC_LLM_002** — **ยังไม่มีไฟล์ `soul.md` ใน repo**
- [ ] **TC_PAY_001** — GB Prime Pay ยังไม่เชื่อม (`PAYMENT_PROVIDER=mock` · สถานะ `pending_gateway`) → UAT ใช้โหมด mock
- [ ] **TC_SEC_001** — ยังไม่มีการเข้ารหัสข้อมูลเกิด (grep `aes|encrypt` ทั้ง repo = 0 จุด · [profile.go:35–48](../apps/api/pkg/models/profile.go#L35) เก็บเป็น plaintext) → **ข้อนี้ควรยกให้เป็นงานบังคับก่อน public launch**
- [ ] อื่น ๆ ที่ต้องแจ้ง: เดือนจร/กราฟจังหวะยังไม่มี · ตาราง "จุดที่ควรบริหาร" ยังเป็นโครงเปล่ารอกฎจาก อ.เม · โหงวเฮ้งยังไม่เปิด

---

## E · สรุปสถานะ 5 สายของ dev plan

| สาย | เรื่อง | สถานะ |
|---|---|---|
| T0 | Node blocker + โครงไฟล์ | ✅ commit `ea7fe13` |
| S1 | คลังคำ + ธาตุอุปถัมภ์ | ❌ ยังไม่เริ่ม |
| S2 | หน้าแรก + /elements + /about | ✅ เสร็จ · ⚠️ **ยังไม่ commit** |
| S3 | คำโฆษณา + ราคา | ✅ เสร็จ · ⚠️ **ยังไม่ commit** |
| S4 | ดาวในรายงาน | ❌ ยังไม่เริ่ม |
| S5 | 大運 | ❌ ยังไม่เริ่ม (stub ยัง throw) |
