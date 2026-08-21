# Deploy minghe.work — ตั้งค่าครั้งแรก + กติกา production

> สรุป: หน้าบ้าน → **Cloudflare Pages** (ฟรี, CDN, กัน request) · API → **AWS Lightsail** 1 เครื่อง (Docker) ·
> ทุกอย่าง deploy อัตโนมัติด้วย GitHub Actions **เฉพาะเมื่อ push เข้า `main`** และ `main` ถูกป้องกันให้ต้องผ่าน PR + CI

```
                 push/merge → main
                        │
        ┌───────────────┴────────────────┐
  deploy-web.yml                    deploy-api.yml
  build static (live)               build image → ghcr.io/<owner>/minghe-api:<sha>
  wrangler pages deploy             scp compose+Caddyfile → ssh: compose pull && up -d
        │                                 │
  Cloudflare Pages                  Lightsail (Ubuntu + Docker)
  minghe.work  ──── fetch ────▶     api.minghe.work  (Caddy TLS → api:5000 → MySQL)
```

---

## 1. GitHub — environment `production` + secrets

**Settings → Environments → New environment: `production`**
- **Deployment branches and tags** → *Selected branches* → เพิ่ม `main` (นี่คือตัวกันไม่ให้ branch อื่น deploy ได้)
- (แนะนำ) **Required reviewers** → ใส่ตัวเอง/หัวหน้าทีม — ทุก deploy จะรอคนกด Approve ก่อน
- Secrets / Variables ตามตารางนี้ (ใส่ที่ระดับ environment `production`)

| ชื่อ | ชนิด | ใช้โดย | ค่า |
|---|---|---|---|
| `CLOUDFLARE_API_TOKEN` | secret | deploy-web | API token สิทธิ์ *Cloudflare Pages — Edit* (My Profile → API Tokens) |
| `CLOUDFLARE_ACCOUNT_ID` | secret | deploy-web | Account ID (หน้า Overview ของ dashboard) |
| `CF_PAGES_PROJECT` | variable | deploy-web | ชื่อโปรเจกต์ Pages (ค่าเริ่มต้น `minghe-work`) |
| `API_BASE_URL` | variable | ci, deploy-web | `https://api.minghe.work` |
| `LIGHTSAIL_HOST` | secret | deploy-api | static IP ของเครื่อง |
| `LIGHTSAIL_USER` | secret | deploy-api | `ubuntu` |
| `LIGHTSAIL_SSH_KEY` | secret | deploy-api | เนื้อหาไฟล์ `.pem` ที่ดาวน์โหลดจาก Lightsail |
| `GHCR_PULL_TOKEN` | secret | deploy-api | PAT (classic) สิทธิ์ `read:packages` — ใส่เฉพาะถ้า package เป็น private |

**Settings → Actions → General → Workflow permissions** → *Read and write permissions* (ให้ push image ขึ้น GHCR ได้)

## 2. ป้องกัน `main` (ruleset)

**Settings → Rules → Rulesets → New ruleset → Import a ruleset** → เลือกไฟล์ [`.github/rulesets/main.json`](../.github/rulesets/main.json)

สิ่งที่บังคับ: ห้ามลบ/force-push · ต้องมาทาง PR · ต้องผ่าน status check `web` และ `api` (จาก `ci.yml`) และ branch ต้องอัปเดตกับ main ล่าสุด
`required_approving_review_count` ตั้งเป็น 0 เพราะตอนนี้ dev คนเดียว — มีทีมเมื่อไรแก้เป็น 1

## 3. Cloudflare Pages (หน้าบ้าน)

1. Cloudflare dashboard → **Workers & Pages → Create → Pages → Upload assets** → ตั้งชื่อโปรเจกต์ `minghe-work` (ไม่ต้องอัปโหลดอะไร กด Create แล้วข้าม — CI จะ deploy ให้)
   หรือสร้างจากเครื่อง: `npx wrangler pages project create minghe-work --production-branch=main`
2. **Custom domains** → เพิ่ม `minghe.work` และ `www.minghe.work` (โดเมนอยู่ใน Cloudflare อยู่แล้ว DNS จะถูกตั้งให้)
3. ไม่ต้องตั้ง build setting / env ใด ๆ บน Pages — ทุกอย่าง build ใน GitHub Actions แล้วอัปโหลด `apps/app/out`
4. push เข้า `main` (หรือ Actions → *Deploy web* → Run workflow) → ดูผลที่ https://minghe.work

ค่าที่ฝังตอน build: `MINGHE_MODE=live`, `MINGHE_API_BASE_URL=${API_BASE_URL}` — เปลี่ยน API URL = แก้ variable แล้ว deploy ใหม่

## 4. AWS Lightsail (API)

1. **Create instance** → Linux/Unix → OS only → **Ubuntu 24.04** → plan **$12 (2 GB RAM)** ขึ้นไป (MySQL + API) — เริ่มช่วงแรกพอ ขยายทีหลังได้
2. **Networking** → Attach **static IP** → Firewall เปิด `SSH 22`, `HTTP 80`, `HTTPS 443`
3. Cloudflare DNS → `A api.minghe.work → <static IP>` แนะนำ **DNS only (เมฆเทา)** ช่วงแรก ให้ Caddy ออก TLS ตรงได้
   (จะเปิด proxy สีส้มทีหลังก็ได้ — ตั้ง SSL mode เป็น *Full (strict)*)
4. ดาวน์โหลด key `.pem` → ssh เข้าเครื่อง แล้วเตรียมเครื่องครั้งเดียว:

```bash
# จากเครื่องตัวเอง
scp -i LightsailKey.pem -r deploy/lightsail ubuntu@<IP>:~/lightsail
ssh -i LightsailKey.pem ubuntu@<IP>
# บนเครื่อง Lightsail
cd ~/lightsail && chmod +x setup.sh && sudo ./setup.sh
sudo nano /opt/minghe/.env     # ตรวจ GMAIL_* / โดเมน / ปิด OTP_ECHO + SEED_DEMO
```

5. ทำ package `minghe-api` บน GHCR ให้เป็น **public** (Packages → Package settings → Change visibility) หรือไม่ก็ `docker login ghcr.io` บนเครื่องด้วย PAT + ตั้ง `GHCR_PULL_TOKEN`
6. push เข้า `main` (หรือรัน *Deploy API* เอง) → workflow จะ scp compose/Caddyfile, pull image, `up -d`, รอ healthcheck แล้ว `curl /healthz`
7. ตรวจ: `curl https://api.minghe.work/healthz` → `{"status":"ok","mode":"live",...}`

### สิ่งที่ต้องมีก่อนเปิดรับผู้ใช้จริง

- [ ] `/opt/minghe/.env`: `MINGHE_OTP_ECHO=false`, `MINGHE_SEED_DEMO_ACCOUNTS=false` (ค่าใน `.env.example` ของ deploy ปิดให้แล้ว)
- [ ] Gmail API credential (`GMAIL_*`) — ไม่มีแล้วสมัครสมาชิกไม่ได้ เพราะ OTP ไม่ถูกส่ง
- [ ] เปลี่ยนรหัส `admin@minghe.work` ทันทีหลังล็อกอินครั้งแรก (seed สร้างด้วย `changeme1234`)
- [ ] backup MySQL รายวัน (cron ตัวอย่างอยู่ท้าย `setup.sh`) + Lightsail snapshot รายสัปดาห์
- [ ] `CORS_ALLOWED_ORIGINS` ครอบ `https://minghe.work,https://www.minghe.work,https://<project>.pages.dev`

## 5. Rollback

- **หน้าบ้าน**: Cloudflare Pages → Deployments → เลือก deployment เก่า → *Rollback to this deployment* (ทันที)
- **API**: บนเครื่อง `sudo nano /opt/minghe/.env` แก้ `MINGHE_API_IMAGE=ghcr.io/<owner>/minghe-api:<sha เดิม>` → `cd /opt/minghe && docker compose up -d`
  (ทุก deploy เขียน tag ที่ใช้ลงบรรทัดนี้ไว้แล้ว — ดู sha ได้จากหน้า Actions หรือ `docker images`)

## 6. ขยายเมื่อโตขึ้น

ลำดับที่แนะนำ: Lightsail plan ใหญ่ขึ้น → แยก MySQL ไป **Lightsail managed database** (เปลี่ยนแค่ `MYSQL_*` ใน `.env`, ลบ service `db`)
→ เมื่อต้อง scale หลายเครื่อง ย้าย image เดิมไป **ECS Fargate + RDS** ได้โดยไม่ต้องแก้โค้ด (image เดียวกัน, env เดียวกัน)
