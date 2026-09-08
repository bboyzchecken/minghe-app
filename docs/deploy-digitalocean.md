# แผนขึ้น production บน DigitalOcean

> เขียน 8 ก.ย. 2026 · แทนที่แผนเดิมที่อิง AWS Lightsail ใน [deploy.md](deploy.md)
> เหตุผลที่เปลี่ยน: AWS แบน IP ของเจ้าของบัญชี (สมัครหลาย product เกินไป) จึงใช้ Lightsail ไม่ได้

---

## 1. สถานะจริงวันนี้ — ตรวจด้วยการยิงจริง

| สิ่งที่ตรวจ | ผลจริง |
|---|---|
| `api.minghe.work` | ❌ **ไม่มี DNS record เลย** — `Could not resolve host` |
| `minghe.work` | ⚠️ ตอบ 200 แต่เป็น **หน้า GoDaddy Website Builder** ไม่ใช่แอปของเรา |
| Nameserver ของโดเมน | `ns53/ns54.domaincontrol.com` = **GoDaddy** (ไม่ใช่ Cloudflare) |
| Cloudflare Pages | ❌ ยังไม่เคย deploy |

### สรุปตรงไปตรงมา

> **ตอนนี้ยังไม่มี production เลยสักส่วนเดียว** — ท่อ deploy ที่เขียนไว้ใน [deploy.md](deploy.md) ยังไม่เคยถูกรันจริง
> งานนี้จึงไม่ใช่ "ย้ายจาก AWS ไป DO" แต่คือ **การขึ้น production ครั้งแรก** ซึ่งง่ายกว่า เพราะไม่มีข้อมูลต้องย้าย

### ✅ ข่าวดีสองข้อ

1. **โดเมนไม่ได้อยู่กับ AWS** — จดและใช้ DNS ที่ GoDaddy การโดนแบน AWS **ไม่กระทบสิทธิ์ในโดเมน**
2. **โค้ดไม่มีอะไรผูกกับ AWS เลย** — ตรวจทั้ง repo แล้ว: ที่เก็บไฟล์ใช้ **Cloudflare R2** · อีเมลใช้ **Gmail API** ·
   ฐานข้อมูลเป็น **MySQL ใน container** · หน้าบ้านเป็น **static export**
   คำว่า AWS/Lightsail ที่เหลือเป็นเพียง **ชื่อโฟลเดอร์ ชื่อ secret และคอมเมนต์** → เปลี่ยนได้ในไม่กี่นาที

---

## 2. 🔴 พรุ่งนี้ UAT — ผู้ทดสอบจะเข้าที่ URL ไหน

ตอนนี้ยังไม่มี URL ให้ผู้ทดสอบเข้าเลย **ต้องตัดสินเรื่องนี้ก่อนอย่างอื่น**

### ✅ ทางที่แนะนำ — deploy หน้าบ้านอย่างเดียวในโหมด mock (ประมาณ 30 นาที)

**ทำไมถึงทำได้:** `apps/app` เป็น **static export** และ **โหมด mock ทำงานในเบราว์เซอร์ทั้งหมด**
แปลว่า **ไม่ต้องมี API ไม่ต้องมีฐานข้อมูล ไม่ต้องมีเซิร์ฟเวอร์** ก็เดินครบทุกโฟลว์ได้ —
สมัครสมาชิก · กรอกฟอร์ม · teaser · ชำระเงิน · เปิดรายงาน ครบหมด

- [ ] `cd apps/app && npx next build` → ได้โฟลเดอร์ `out/` (ยืนยันแล้ว: **36 หน้าผ่าน**)
- [ ] `npx wrangler pages project create minghe-uat --production-branch=main`
- [ ] `npx wrangler pages deploy apps/app/out --project-name=minghe-uat`
- [ ] ได้ URL `https://minghe-uat.pages.dev` → **ส่งให้ผู้ทดสอบได้ทันที**
- [ ] **ไม่ต้องแตะ DNS ของ GoDaddy เลย** จึงไม่มีความเสี่ยงว่าโดเมนจะล่มกลางคัน

> **ห้ามใช้โดเมนจริงพรุ่งนี้** — หน้า GoDaddy Website Builder ยังอยู่บน `minghe.work`
> ถ้าไปแก้ DNS คืนนี้แล้วพลาด จะไม่เหลืออะไรให้ทดสอบเลย

### ทางเลือกสำรอง

| | วิธี | เวลา | ข้อเสีย |
|---|---|---|---|
| ข | รันในเครื่องแล้วแชร์จอ | 5 นาที | ผู้ทดสอบกดเองไม่ได้ ได้ feedback ตื้นกว่ามาก |
| ค | ขึ้น DO เต็มระบบคืนนี้ | 3–5 ชม. | **ไม่แนะนำ** — เปิด production ครั้งแรกคืนก่อน UAT คือการเดิมพันที่ไม่จำเป็น |

---

## 3. สถาปัตยกรรมปลายทาง (หลัง UAT)

```
                      push/merge → main
                             │
        ┌────────────────────┴─────────────────────┐
  deploy-web.yml                              deploy-api.yml
  build static (live)                    build image → ghcr.io/<owner>/minghe-api:<sha>
  wrangler pages deploy                  scp compose+Caddyfile → ssh: compose pull && up -d
        │                                          │
  Cloudflare Pages (ฟรี)                  DigitalOcean Droplet · Singapore
  minghe.work ────────── fetch ─────────▶  api.minghe.work
                                           Caddy (TLS อัตโนมัติ) → api:5000 → MySQL
```

**หน้าบ้านยังอยู่ Cloudflare Pages** — ฟรี เร็ว มี CDN และไม่เกี่ยวกับ AWS อยู่แล้ว ไม่มีเหตุต้องย้าย
**เปลี่ยนเฉพาะฝั่ง API** จาก Lightsail → DO Droplet

---

## 4. ความต่างระหว่าง Lightsail กับ DigitalOcean ที่มีผลจริง

`deploy/lightsail/` ใช้ Docker Compose + Caddy ล้วน ๆ **ไม่มีบริการเฉพาะ AWS เลย** จึงยกไปใช้ได้เกือบทั้งดุ้น
มีอยู่ 5 จุดที่ต่างกันจริงและต้องแก้:

| # | เรื่อง | Lightsail | DigitalOcean | ต้องทำอะไร |
|---|---|---|---|---|
| 1 | **ผู้ใช้ ssh เริ่มต้น** | `ubuntu` | **`root`** | เปลี่ยน secret `DEPLOY_USER` เป็น `root` หรือสร้างผู้ใช้ `deploy` ตอน setup **(ข้อนี้พลาดง่ายที่สุด)** |
| 2 | **SSH key** | ดาวน์โหลด `.pem` จากคอนโซล | เราสร้างเอง แล้วใส่ public key ตอนสร้าง Droplet | `ssh-keygen -t ed25519` แล้วเอา **private key** ใส่ GitHub secret |
| 3 | **IP คงที่** | Static IP | **Reserved IP** (ฟรีเมื่อผูกกับ Droplet) | ผูกก่อนตั้ง DNS |
| 4 | **Firewall** | ตั้งในหน้า instance | **Cloud Firewall** เป็นทรัพยากรแยก | สร้างแล้วผูกกับ Droplet · เปิด 22 / 80 / 443 |
| 5 | **สำรองข้อมูล** | Snapshot | Snapshot หรือ Backups (+20% ของค่า Droplet) | เปิด Backups ตอนสร้าง Droplet |

**ที่เหมือนกันทุกอย่าง**: Ubuntu 24.04 · Docker + Compose · Caddy ออก TLS เอง · MySQL ใน container · image จาก GHCR

---

## 5. ค่าใช้จ่ายโดยประมาณ

| รายการ | สเปก | ราคา/เดือน |
|---|---|---|
| Droplet (Basic Regular) | 2 GB RAM · 1 vCPU · 50 GB SSD · 2 TB transfer | ~$12 |
| Reserved IP | ฟรีเมื่อผูกกับ Droplet | $0 |
| Cloud Firewall | | $0 |
| Backups (แนะนำ) | +20% ของค่า Droplet | ~$2.40 |
| Cloudflare Pages | | $0 |
| **รวม** | | **~$14–15** |

- **เลือก region `sgp1` (สิงคโปร์)** — ใกล้ผู้ใช้ไทยที่สุด
- **อย่าเลือกแพ็ก $6 (1 GB)** — MySQL 8 + API + Caddy บน 1 GB จะโดน OOM kill เวลา migrate
- ต้นทุนใกล้เคียงของเดิมที่วางไว้กับ Lightsail ($12) — ไม่ได้แพงขึ้น

---

## 6. Checklist — ขึ้น DO

### 6.1 · แก้ใน repo (ทำที่ไหนก็ได้ ไม่ต้องรอเครื่อง)

- [ ] `git mv deploy/lightsail deploy/droplet`
- [ ] `deploy/droplet/docker-compose.yml` — แก้คอมเมนต์บรรทัด 2 (`AWS Lightsail` → `DigitalOcean Droplet`) · **ตัวไฟล์ไม่ต้องแก้อะไรเลย**
- [ ] `deploy/droplet/setup.sh` — แก้คอมเมนต์ + รองรับกรณีล็อกอินเป็น `root` (ตอนนี้เขียนเผื่อ `ubuntu` + `sudo`)
- [ ] `deploy/droplet/Caddyfile` — แก้คอมเมนต์เรื่อง firewall
- [ ] `.github/workflows/deploy-api.yml`
  - [ ] เปลี่ยนชื่อ workflow → `Deploy API (DigitalOcean)`
  - [ ] เปลี่ยน secret: `LIGHTSAIL_HOST` → `DEPLOY_HOST` · `LIGHTSAIL_USER` → `DEPLOY_USER` · `LIGHTSAIL_SSH_KEY` → `DEPLOY_SSH_KEY`
  - [ ] เปลี่ยน `paths:` จาก `deploy/lightsail/**` → `deploy/droplet/**`
  - [ ] เปลี่ยน `source:` ใน scp-action ให้ตรงกับพาธใหม่
- [ ] `docs/deploy.md` — เขียนหัวข้อ 4 ใหม่ให้เป็น DO + แก้ตาราง secret
  - [ ] ⚠️ **แก้ข้อความที่ผิดความจริง** — หัวข้อ 3 เขียนว่า *"โดเมนอยู่ใน Cloudflare อยู่แล้ว"* ซึ่ง**ไม่จริง** โดเมนอยู่ GoDaddy
- [ ] `README.md` — แก้ 4 จุดที่อ้าง Lightsail (บรรทัด 15, 16, 77, 122, 141)
- [ ] **เกณฑ์ผ่าน**: `grep -rniE "lightsail|aws" --exclude-dir=node_modules --exclude-dir=.git .` เหลือเฉพาะในเอกสารประวัติ

### 6.2 · สร้างเครื่องบน DigitalOcean

- [ ] สร้าง SSH key บนเครื่องตัวเอง: `ssh-keygen -t ed25519 -C "minghe-deploy" -f ~/.ssh/minghe_do`
- [ ] Create Droplet → **Ubuntu 24.04 LTS** · region **Singapore (sgp1)** · Basic Regular **2 GB / 1 vCPU** · เปิด **Backups**
- [ ] ใส่ **public key** (`~/.ssh/minghe_do.pub`) ตอนสร้าง
- [ ] Networking → **Reserved IP** → ผูกกับ Droplet
- [ ] Networking → **Firewall** → สร้างใหม่ เปิดขาเข้า `22 (SSH)` · `80 (HTTP)` · `443 (HTTPS)` → ผูกกับ Droplet
- [ ] ทดสอบ: `ssh -i ~/.ssh/minghe_do root@<Reserved IP>`

### 6.3 · เตรียมเครื่องครั้งเดียว

- [ ] `scp -i ~/.ssh/minghe_do -r deploy/droplet root@<IP>:~/droplet`
- [ ] `ssh -i ~/.ssh/minghe_do root@<IP>` แล้ว `cd ~/droplet && chmod +x setup.sh && ./setup.sh`
- [ ] แก้ `/opt/minghe/.env` — ตั้ง `MYSQL_ROOT_PASSWORD` · `API_DOMAIN=api.minghe.work` · `GMAIL_*`
- [ ] ⚠️ ปิดของทดสอบให้ครบ: `MINGHE_OTP_ECHO=false` · `MINGHE_SEED_DEMO_ACCOUNTS=false`
- [ ] `CORS_ALLOWED_ORIGINS` ครอบ `https://minghe.work,https://www.minghe.work,https://<project>.pages.dev`

### 6.4 · DNS ที่ GoDaddy

**ทางเลือก ก — เร็วที่สุด ไม่ย้าย nameserver** (แนะนำสำหรับรอบแรก)
- [ ] GoDaddy DNS → เพิ่ม `A` record: `api` → `<Reserved IP>` · TTL 600
- [ ] `www` → CNAME → `<project>.pages.dev`
- [ ] `@` (root) → ตามที่ Cloudflare Pages กำหนด (**ต้องปิดหน้า Website Builder ก่อน ไม่งั้นจะทับกัน**)

**ทางเลือก ข — ย้าย nameserver ไป Cloudflare** (ดีกว่าในระยะยาว)
- [ ] เพิ่มโดเมนใน Cloudflare → เปลี่ยน NS ที่ GoDaddy → **รอ propagate ได้ถึง 24–48 ชม.**
- [ ] ⚠️ **ห้ามทำก่อน UAT** — ระหว่างรอ propagate โดเมนอาจเข้าไม่ได้

> ทั้งสองทาง: ตั้ง `api` เป็น **DNS only (เมฆเทา)** ช่วงแรก ให้ Caddy ออก TLS ตรงได้ · เปิด proxy ทีหลังพร้อมตั้ง SSL mode เป็น *Full (strict)*

### 6.5 · เชื่อม CI/CD

- [ ] GitHub → Settings → Environments → `production` → ใส่ secret
  - [ ] `DEPLOY_HOST` = Reserved IP
  - [ ] `DEPLOY_USER` = `root` (หรือชื่อผู้ใช้ที่สร้างใน setup.sh)
  - [ ] `DEPLOY_SSH_KEY` = เนื้อหาไฟล์ `~/.ssh/minghe_do` (**private key** — ห้ามส่งในแชต ใส่ในหน้า GitHub เอง)
- [ ] ทำ package `minghe-api` บน GHCR เป็น public หรือใส่ `GHCR_PULL_TOKEN`
- [ ] รัน workflow *Deploy API* ด้วยมือหนึ่งครั้ง
- [ ] ตรวจ: `curl https://api.minghe.work/healthz` → `{"status":"ok","mode":"live",...}`

### 6.6 · ก่อนเปิดรับผู้ใช้จริง

- [ ] Gmail API credential ครบ (ไม่มี = สมัครสมาชิกไม่ได้ เพราะ OTP ไม่ถูกส่ง)
- [ ] เปลี่ยนรหัส `admin@minghe.work` ทันทีหลังล็อกอินครั้งแรก (seed ใช้ `changeme1234`)
- [ ] ตั้ง cron backup MySQL รายวัน (ตัวอย่างอยู่ท้าย `setup.sh`) + เปิด DO Backups
- [ ] เอกสารกฎหมายผ่านการตรวจ + เปลี่ยน `status` จาก `draft` เป็น `published` + ตั้ง `LEGAL_*_VERSION`
- [ ] GB Prime Pay เชื่อมจริง (ตอนนี้บันทึกคำสั่งซื้อและออกรหัสโดย**ยังไม่ตัดเงินจริง**)

---

## 7. ลำดับที่แนะนำ

```
คืนนี้        deploy static + mock → Cloudflare Pages → ได้ URL ให้ UAT   (~30 นาที · ไม่แตะ DNS)

พรุ่งนี้      UAT บน pages.dev

หลัง UAT     6.1 แก้ repo (lightsail → droplet)        ← ทำที่ไหนก็ได้ ไม่ต้องรอเครื่อง
             6.2–6.3 สร้าง Droplet + เตรียมเครื่อง
             6.4 ตั้ง DNS ที่ GoDaddy (ทางเลือก ก)
             6.5 เชื่อม CI/CD แล้วยิง deploy จริง
             6.6 เช็กลิสต์ก่อนเปิดขาย
```

---

## 8. ความเสี่ยง

| # | เรื่อง | วิธีกัน |
|---|---|---|
| R-1 | **แก้ DNS คืนก่อน UAT แล้วพลาด** | ใช้ `pages.dev` สำหรับ UAT ไม่แตะโดเมนจริงเลย |
| R-2 | **ล็อกอินเป็น `root` ไม่ใช่ `ubuntu`** | จุดที่พลาดบ่อยที่สุดเวลาย้ายจาก Lightsail — ตรวจ `DEPLOY_USER` ให้ตรงกับที่ setup.sh สร้างจริง |
| R-3 | **หน้า GoDaddy Website Builder ทับโดเมนอยู่** | ต้องปิดก่อนชี้ root domain มาที่ Pages ไม่งั้น DNS จะขัดกัน |
| R-4 | **Droplet 1 GB แล้ว MySQL โดน OOM** | ใช้ 2 GB ขึ้นไป |
| R-5 | **บัญชี DO โดนแบนซ้ำรอย AWS** | สมัครด้วยข้อมูลจริงและใช้บริการเท่าที่ต้องใช้ · **เปิด Backups ตั้งแต่วันแรก** จะได้กู้ได้ถ้าบัญชีมีปัญหา · เก็บ dump ฐานข้อมูลไว้นอก DO ด้วย |
| R-6 | **ไม่มีอะไร deploy อยู่เลยตอนนี้** | ถือเป็นข้อดีในแง่หนึ่ง — ไม่มีข้อมูลผู้ใช้จริงต้องย้าย ไม่มี downtime ต้องบริหาร |
