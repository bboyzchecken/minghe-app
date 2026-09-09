# Deploy minghe.work — ตั้งค่าครั้งแรก + กติกา production

> สรุป: หน้าบ้าน → **Cloudflare Pages** (ฟรี, CDN, กัน request) · API → **DigitalOcean Droplet** 1 เครื่อง (Docker) ·
> ทุกอย่าง deploy อัตโนมัติด้วย GitHub Actions **เฉพาะเมื่อ push เข้า `main`** และ `main` ถูกป้องกันให้ต้องผ่าน PR + CI

```
                 push/merge → main
                        │
        ┌───────────────┴────────────────┐
  deploy-web.yml                    deploy-api.yml
  build static (live)               build image → ghcr.io/<owner>/minghe-api:<sha>
  wrangler pages deploy             scp compose+Caddyfile → ssh: compose pull && up -d
        │                                 │
  Cloudflare Pages                  DO Droplet (Ubuntu + Docker)
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
| `DEPLOY_HOST` | secret | deploy-api | Reserved IP ของ Droplet |
| `DEPLOY_USER` | secret | deploy-api | `root` (ค่าเริ่มต้นของ DigitalOcean) |
| `DEPLOY_SSH_KEY` | secret | deploy-api | เนื้อหา private key `~/.ssh/minghe_do` (วางในหน้า GitHub เอง ห้ามส่งผ่านแชต) |
| `GHCR_PULL_TOKEN` | secret | deploy-api | PAT (classic) สิทธิ์ `read:packages` — ใส่เฉพาะถ้า package เป็น private |

**Settings → Actions → General → Workflow permissions** → *Read and write permissions* (ให้ push image ขึ้น GHCR ได้)

## 2. ป้องกัน `main` (ruleset)

**Settings → Rules → Rulesets → New ruleset → Import a ruleset** → เลือกไฟล์ [`.github/rulesets/main.json`](../.github/rulesets/main.json)

สิ่งที่บังคับ: ห้ามลบ/force-push · ต้องมาทาง PR · ต้องผ่าน status check `web` และ `api` (จาก `ci.yml`) และ branch ต้องอัปเดตกับ main ล่าสุด
`required_approving_review_count` ตั้งเป็น 0 เพราะตอนนี้ dev คนเดียว — มีทีมเมื่อไรแก้เป็น 1

## 3. Cloudflare Pages (หน้าบ้าน)

1. Cloudflare dashboard → **Workers & Pages → Create → Pages → Upload assets** → ตั้งชื่อโปรเจกต์ `minghe-work` (ไม่ต้องอัปโหลดอะไร กด Create แล้วข้าม — CI จะ deploy ให้)
   หรือสร้างจากเครื่อง: `npx wrangler pages project create minghe-work --production-branch=main`
2. **Custom domains** → เพิ่ม `minghe.work` และ `www.minghe.work`
   ⚠️ **โดเมนอยู่ที่ GoDaddy ไม่ใช่ Cloudflare** (nameserver = `ns53/ns54.domaincontrol.com`)
   Cloudflare จึงตั้ง DNS ให้เองไม่ได้ — ต้องไปเพิ่มเรกคอร์ดที่ GoDaddy ตามที่หน้า Custom domains บอก
   และ **ต้องปิดหน้า GoDaddy Website Builder ก่อน** ไม่งั้นจะทับ root domain กัน
3. ไม่ต้องตั้ง build setting / env ใด ๆ บน Pages — ทุกอย่าง build ใน GitHub Actions แล้วอัปโหลด `apps/app/out`
4. push เข้า `main` (หรือ Actions → *Deploy web* → Run workflow) → ดูผลที่ https://minghe.work

ค่าที่ฝังตอน build: `MINGHE_MODE=live`, `MINGHE_API_BASE_URL=${API_BASE_URL}` — เปลี่ยน API URL = แก้ variable แล้ว deploy ใหม่

## 4. DigitalOcean Droplet (API)

> เปลี่ยนจาก AWS Lightsail เพราะ AWS แบน IP ของเจ้าของบัญชี — โดเมนไม่ได้อยู่กับ AWS จึงไม่กระทบสิทธิ์ในโดเมน
> รายละเอียดการตัดสินใจและค่าใช้จ่ายอยู่ที่ [`deploy-digitalocean.md`](deploy-digitalocean.md)

1. สร้าง SSH key บนเครื่องตัวเอง: `ssh-keygen -t ed25519 -C "minghe-deploy" -f ~/.ssh/minghe_do`
2. **Create Droplet** → **Ubuntu 24.04 LTS** → region **Singapore (sgp1)** → Basic Regular **2 GB / 1 vCPU**
   → เปิด **Backups** → ใส่ **public key** (`~/.ssh/minghe_do.pub`) ตอนสร้าง
   ⚠️ อย่าเลือกแพ็ก 1 GB — MySQL 8 + API + Caddy จะโดน OOM kill ตอน migrate
3. **Networking → Reserved IP** → ผูกกับ Droplet (IP จะไม่เปลี่ยนแม้สร้างเครื่องใหม่)
4. **Networking → Firewall** → สร้างใหม่ เปิดขาเข้า `22`, `80`, `443` → **ผูกกับ Droplet** (ลืมผูก = firewall ไม่มีผล)
5. GoDaddy DNS → `A` record: `api` → `<Reserved IP>` · TTL 600
   (ยังไม่ต้องย้าย nameserver ไป Cloudflare — ระหว่างรอ propagate 24–48 ชม. โดเมนอาจเข้าไม่ได้)
6. เตรียมเครื่องครั้งเดียว — DigitalOcean ให้ล็อกอินเป็น `root` มาตั้งแต่แรก:

```bash
# จากเครื่องตัวเอง
scp -i ~/.ssh/minghe_do -r deploy/droplet root@<Reserved IP>:~/droplet
ssh -i ~/.ssh/minghe_do root@<Reserved IP>
# บน Droplet
cd ~/droplet && chmod +x setup.sh && ./setup.sh
nano /opt/minghe/.env     # ตรวจ GMAIL_* / API_DOMAIN / ปิด OTP_ECHO + SEED_DEMO
```

5. ทำ package `minghe-api` บน GHCR ให้เป็น **public** (Packages → Package settings → Change visibility) หรือไม่ก็ `docker login ghcr.io` บนเครื่องด้วย PAT + ตั้ง `GHCR_PULL_TOKEN`
6. push เข้า `main` (หรือรัน *Deploy API* เอง) → workflow จะ scp compose/Caddyfile, pull image, `up -d`, รอ healthcheck แล้ว `curl /healthz`
7. ตรวจ: `curl https://api.minghe.work/healthz` → `{"status":"ok","mode":"live",...}`

### สิ่งที่ต้องมีก่อนเปิดรับผู้ใช้จริง

- [ ] `/opt/minghe/.env`: `MINGHE_OTP_ECHO=false`, `MINGHE_SEED_DEMO_ACCOUNTS=false` (ค่าใน `.env.example` ของ deploy ปิดให้แล้ว)
- [ ] Gmail API credential (`GMAIL_*`) — ไม่มีแล้วสมัครสมาชิกไม่ได้ เพราะ OTP ไม่ถูกส่ง
- [ ] เปลี่ยนรหัส `admin@minghe.work` ทันทีหลังล็อกอินครั้งแรก (seed สร้างด้วย `changeme1234`)
- [ ] backup MySQL รายวัน (cron ตัวอย่างอยู่ท้าย `setup.sh`) + เปิด **DO Backups** ตั้งแต่วันแรก
      และเก็บ dump ไว้นอก DigitalOcean ด้วย เผื่อบัญชีมีปัญหาแบบที่เจอกับ AWS
- [ ] `CORS_ALLOWED_ORIGINS` ครอบ `https://minghe.work,https://www.minghe.work,https://<project>.pages.dev`
- [ ] **เอกสารกฎหมายผ่านการตรวจแล้ว** — เนื้อหาอยู่ที่ `apps/app/lib/legal/` ยังเป็นสถานะ `draft`
      ต้องเติมข้อมูลนิติบุคคล + ตัวเลขเงื่อนไขคืนเงิน แล้วให้ผู้รับผิดชอบตรวจ ก่อนเปลี่ยน `status` เป็น `published`
      และตั้ง `LEGAL_*_VERSION` ใน `.env` ให้ตรงกัน (บันทึกความยินยอมอ้างอิงเลขเวอร์ชันนี้)
- [ ] **GB Prime Pay เชื่อมจริงแล้ว** — ตอนนี้หน้าชำระเงินบันทึกคำสั่งซื้อและออกรหัสทันทีโดย**ยังไม่ตัดเงินจริง**
- [ ] Google login (ถ้าจะเปิด): `MINGHE_GOOGLE_LOGIN_ENABLED=true` + `GOOGLE_OAUTH_CLIENT_ID`
      — ตั้งที่ฝั่ง API พอ ไม่ต้อง build หน้าเว็บใหม่ · redirect URI ต้องตรงกับโดเมนจริง

## 5. Rollback

- **หน้าบ้าน**: Cloudflare Pages → Deployments → เลือก deployment เก่า → *Rollback to this deployment* (ทันที)
- **API**: บนเครื่อง `nano /opt/minghe/.env` แก้ `MINGHE_API_IMAGE=ghcr.io/<owner>/minghe-api:<sha เดิม>` → `cd /opt/minghe && docker compose up -d`
  (ทุก deploy เขียน tag ที่ใช้ลงบรรทัดนี้ไว้แล้ว — ดู sha ได้จากหน้า Actions หรือ `docker images`)

## 6. ขยายเมื่อโตขึ้น

ลำดับที่แนะนำ: resize Droplet ให้ใหญ่ขึ้น → แยก MySQL ไป **DO Managed Database** (เปลี่ยนแค่ `MYSQL_*` ใน `.env`, ลบ service `db`)
→ เมื่อต้อง scale หลายเครื่อง ย้าย image เดิมไป **DO App Platform** หรือ Kubernetes ได้โดยไม่ต้องแก้โค้ด (image เดียวกัน, env เดียวกัน)
