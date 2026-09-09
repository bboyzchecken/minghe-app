# Runbook — ขึ้น production ครั้งแรก (DigitalOcean + Cloudflare Pages/Workers + GoDaddy)

> เขียน 9 ก.ย. 2026 · เริ่มจาก **มีบัญชีทุกที่แล้ว** (DigitalOcean, Cloudflare, GoDaddy, GitHub) แต่ยังไม่ได้ตั้งอะไรเลย
> ทำตามจากบนลงล่างได้เลย ทุกคำสั่งคัดลอกวางได้ · แทนที่ `<...>` ด้วยค่าจริง
> อ่านเพิ่ม: [deploy.md](deploy.md) (กติกา CI/CD) · [deploy-digitalocean.md](deploy-digitalocean.md) (เหตุผลที่เลือก DO)

---

## ⏱️ ถ้ามีแค่ 30 นาทีตอนนี้

งานทั้งหมดใช้เวลาลงมือจริง **~60–75 นาที** และมีช่วง **รอ DNS อีก 15 นาที – 24 ชม.** ที่เร่งไม่ได้
ดังนั้นใน 30 นาทีแรก ให้ทำ **3 อย่างที่เป็นนาฬิกาเดินช้าที่สุด** ก่อน ที่เหลือทำระหว่างรอได้:

| ลำดับ | ทำ | ทำไมต้องก่อน |
|---|---|---|
| 1 | §2 ย้าย nameserver ไป Cloudflare | นาฬิกา propagate เริ่มเดินทันที (15 นาที–24 ชม.) |
| 2 | §3 สร้าง Droplet + Reserved IP + Firewall | ระหว่างรอ DNS เครื่องบูตและติดตั้ง Docker ไปพร้อมกัน |
| 3 | §5 รัน `setup.sh` | ยกระบบขึ้นรอไว้ พอ DNS มาถึง Caddy ออก TLS ได้ทันที |

§6–§8 (GitHub secrets, Pages, ยิง deploy) ทำทีหลังได้ ไม่มีอะไรต้องรอ

---

## 📍 สถานะจริง — วัดจากภายนอก 9 ก.ย. 2026 18:52 น.

| สิ่งที่ตรวจ | ผลจริง | สรุป |
|---|---|---|
| Nameserver | `ursula` / `elliott.ns.cloudflare.com` | ✅ ย้ายสำเร็จ โซน active แล้ว |
| `MX` | `smtp` / `mailstore1.secureserver.net` | ✅ อีเมล GoDaddy รอด ยกมาครบ |
| `SPF` / `DMARC` | `v=spf1 include:secureserver.net -all` · `p=quarantine` | ⚠️ ดู §0 ข้อ 4 |
| `minghe.work` / `www` (DNS) | `104.21.11.176`, `172.67.149.189` (+AAAA) = Cloudflare proxy 🟠 | ✅ เรกคอร์ดมีแล้ว |
| `https://minghe.work` | ❌ **TLS handshake failure — ไม่มีใบรับรองที่ edge เลย** (`no peer certificate available`) | 🔴 เว็บเข้าไม่ได้ตอนนี้ |
| `http://minghe.work` | `308 → https` พร้อมเฮดเดอร์ `x-siteid: ap-southeast-1`, `x-version:` | 🔴 origin **ยังเป็น GoDaddy Website Builder ไม่ใช่ Pages** |
| `api.minghe.work` | `NXDOMAIN` | ❌ ยังไม่มีเรกคอร์ด |
| `uat.minghe.work` | `NXDOMAIN` | ❌ ยังไม่มีเรกคอร์ด |
| `minghe-work.pages.dev` | `Could not resolve host` | ❌ ยังไม่มีโปรเจกต์ Pages ชื่อนี้ |

**แปลว่า** NS ย้ายเสร็จจริง แต่ **Pages ยังไม่ได้ผูกกับโดเมน** — Cloudflare ดูดเรกคอร์ดเดิมของ GoDaddy Website Builder มาแล้วเปิด proxy ทับ
และ **Universal SSL ยังออกใบรับรองไม่เสร็จ** จึงยังไม่มีอะไรเปิดผ่าน https ได้เลย

**ลำดับที่ต้องทำต่อ:** §7.1 เชื่อม Pages กับ GitHub → §7.2 ตั้ง env → §7.4 ปิด `deploy-web.yml` → §7.7 ผูก custom domain
(ต้องลบ A/CNAME เก่าของ Website Builder ก่อน) → ตรวจ **SSL/TLS → Edge Certificates → Universal SSL = On**
→ §3 สร้าง Droplet → §4 เพิ่ม `api` / `uat`

---

## 0. ตัดสินใจ 3 ข้อก่อนแตะอะไร

### ข้อ 1 — หน้าบ้านอยู่ที่ไหน

ตอนนี้ในเครื่องคุณมี **ของสองเวอร์ชันขัดกันอยู่**:

**ตัดสินใจแล้ว: Pages build เองจาก GitHub (Git integration)** — ไม่ผ่าน GitHub Actions ตามที่ทำในโปรเจกต์อื่น
`minghe.work` = Pages · `uat.minghe.work` = static บน Droplet · `api.minghe.work` = Go API บน Droplet

ตอนนี้ในเครื่องมี `deploy-web.yml` สองเวอร์ชันขัดกันอยู่ ต้องจัดการก่อนเริ่ม §1:

| เวอร์ชัน | ทำอะไร | จัดการยังไง |
|---|---|---|
| ที่ commit ไว้ (HEAD) | build → `wrangler pages deploy` → Pages | **ลบทิ้ง** — Pages build เองแล้ว เหลือไว้จะ deploy ซ้อน (§7.4) |
| ใน working tree | build → tar → scp → Caddy บน Droplet | **เก็บไว้เป็น UAT** เปลี่ยนชื่อไฟล์เป็น `deploy-web-uat.yml` |

```bash
git mv .github/workflows/deploy-web.yml .github/workflows/deploy-web-uat.yml
```

`git mv` ย้ายทั้งไฟล์ที่แก้ค้างไว้และประวัติในคราวเดียว — ได้ผลลัพธ์คือ **เหลือ workflow เดียวคือตัว UAT** ส่วนตัว Pages หายไปตามต้องการ
แล้วแก้ในไฟล์สองจุด: `name:` → `Deploy web UAT (Droplet)` และ `concurrency.group` → `deploy-web-uat`

> ถ้าตัดสินใจตรงข้าม — ให้ Droplet เสิร์ฟหน้าบ้านทั้งหมด — ข้าม §7 ทั้งหัวข้อ แล้วชี้ `minghe.work` ใน §4 ไปที่ Reserved IP แทน

### ข้อ 2 — DNS อยู่ที่ใคร

**ย้าย nameserver ไป Cloudflare** (โดเมนยังจดที่ GoDaddy เหมือนเดิม ไม่ต้องย้ายทะเบียน)

เหตุผลที่ไม่ใช่แค่ "ทางเลือก": **Cloudflare Pages ผูก apex (`minghe.work`) ด้วย CNAME** ซึ่ง DNS มาตรฐานทำกับ apex ไม่ได้
Cloudflare แก้ด้วย CNAME flattening — แต่ทำได้เฉพาะเมื่อ **Cloudflare เป็น DNS ของโซนนั้น** GoDaddy ไม่มีฟีเจอร์นี้ (ไม่มี ALIAS/ANAME)
ถ้าอยู่กับ GoDaddy DNS ต่อ จะได้แค่ `www.minghe.work` ส่วน apex ต้องใช้ URL forwarding ซึ่งพังทั้ง HTTPS และ SEO

### ข้อ 3 — 🔴 อีเมลของโดเมนจะรอดไหม

`.env` ตั้ง `GMAIL_SENDER_EMAIL=info@minghe.work` — แปลว่าโดเมนนี้ **ใช้ส่ง/รับอีเมลอยู่**
ถ้าย้าย nameserver แล้วไม่ยก **MX / SPF / DKIM / DMARC** ตามไปด้วย → **อีเมลตายทันที** และ **OTP สมัครสมาชิกจะไม่ถูกส่ง**

**✅ ข้อนี้ผ่านแล้ว** — ตรวจเมื่อ 9 ก.ย. 18:52 น. `MX` ยังชี้ `smtp/mailstore1.secureserver.net` และ `SPF` ยังอยู่ครบ
ถ้าย้ายโซนใหม่อีกครั้งในอนาคต ให้จดของเดิมไว้ก่อนด้วยคำสั่งนี้:

```bash
nslookup -type=MX minghe.work 8.8.8.8
nslookup -type=TXT minghe.work 8.8.8.8
nslookup -type=TXT _dmarc.minghe.work 8.8.8.8
```

### ข้อ 4 — 🔴 SPF ปัจจุบันจะทำให้ OTP เข้า spam

ค่าที่วัดได้จริง:

```
minghe.work  TXT  "v=spf1 include:secureserver.net -all"
_dmarc       TXT  "v=DMARC1; p=quarantine; adkim=r; aspf=r; ..."
```

`-all` = **ปฏิเสธผู้ส่งทุกรายที่ไม่ใช่ GoDaddy** แต่ `.env` ตั้ง `GMAIL_SENDER_EMAIL=info@minghe.work` และส่งผ่าน **Gmail API**
เมลจะออกจากเซิร์ฟเวอร์ Google → **SPF fail** → DMARC `p=quarantine` สั่งให้ปลายทางโยนเข้า spam

เลือกทางใดทางหนึ่ง **ก่อน** เปิดให้คนสมัครจริง:

| ทาง | ทำอะไร | เหมาะเมื่อ |
|---|---|---|
| ก | แก้ SPF เป็น `v=spf1 include:secureserver.net include:_spf.google.com -all` + เพิ่ม DKIM ของ Google | ยังอยากใช้ `info@minghe.work` เป็นผู้ส่ง |
| ข | เปลี่ยน `GMAIL_SENDER_EMAIL` เป็นที่อยู่ `@gmail.com` ของบัญชีที่ออก credential | เร็วที่สุด แต่ดูไม่เป็นทางการ |

ตรวจผลจริงหลังแก้: ส่ง OTP หาตัวเอง → เปิดเมล → *Show original* → ต้องได้ `SPF: PASS` และ `DKIM: PASS`

---

## 1. ของที่ต้องมีในมือก่อนเริ่ม

- [ ] บัญชี **DigitalOcean** ที่ผูกบัตรแล้ว (ยังไม่มี Droplet)
- [ ] บัญชี **Cloudflare** (ยังไม่มีโซน)
- [ ] บัญชี **GoDaddy** ที่ถือ `minghe.work` และเข้าหน้า Nameservers ได้
- [ ] **GitHub** repo `bboyzchecken/minghe-app` สิทธิ์ admin (ตั้ง Environments/Secrets ได้)
- [ ] เครื่องตัวเองมี `ssh`, `scp`, `git` (Windows: Git Bash มีครบ)
- [ ] Gmail API credential ครบ 4 ค่า (`GMAIL_CLIENT_ID/SECRET/REFRESH_TOKEN/ACCESS_TOKEN`) — **ไม่มี = สมัครสมาชิกไม่ได้**
- [ ] Cloudflare R2 keys (`R2_*`) ถ้าจะให้อัปโหลดรูป/วิดีโอทำงาน

**สร้าง SSH key เดี๋ยวนี้เลย** (ใช้ทั้ง §3 และ §6):

```bash
ssh-keygen -t ed25519 -C "minghe-deploy" -f ~/.ssh/minghe_do -N ""
cat ~/.ssh/minghe_do.pub
```

> ⚠️ `~/.ssh/minghe_do` (ไม่มี `.pub`) คือ **private key** — วางในหน้า GitHub Secrets เท่านั้น ห้ามส่งผ่านแชต/อีเมล

---

## 2. นาที 0–5 — Cloudflare zone + เปลี่ยน nameserver ที่ GoDaddy

### 2.1 เพิ่มโซนใน Cloudflare

1. Cloudflare dashboard → **Add a site** → พิมพ์ `minghe.work` → เลือกแผน **Free** → Continue
2. Cloudflare สแกน DNS เดิมจาก GoDaddy มาให้ — **ตรวจทีละบรรทัด**:
   - ✅ **เก็บไว้**: `MX` ทั้งหมด, `TXT` ที่ขึ้นต้น `v=spf1`, `google._domainkey`, `_dmarc`
   - ❌ **ลบทิ้ง**: `A`/`CNAME` ที่ชี้ไป GoDaddy Website Builder (มักเป็น `@` และ `www` ชี้ไป IP ของ GoDaddy หรือ `*.godaddysites.com`)
   - เทียบกับที่จดไว้ใน §0 ข้อ 3 ให้ครบ **ก่อน** ไปขั้นถัดไป
3. จด **nameserver 2 ตัว** ที่ Cloudflare ให้ (หน้าตาแบบ `xxx.ns.cloudflare.com`)
4. จด **Account ID** ไว้ด้วย (Workers & Pages → Overview → คอลัมน์ขวา) — ใช้ใน §6

### 2.2 ปิด Website Builder ที่ GoDaddy

GoDaddy → **My Products → Websites + Marketing** → เว็บของ `minghe.work` → **Settings → Remove/Unpublish**

> ถ้าไม่ปิด: GoDaddy จะพยายามยัดเรกคอร์ดคืน และ apex จะสลับไปมาระหว่างหน้า Builder กับแอปจริง

### 2.3 เปลี่ยน nameserver

GoDaddy → **Domain Portfolio** → `minghe.work` → **Nameservers → Change** → **I'll use my own nameservers**
→ ใส่ nameserver 2 ตัวจากข้อ 2.1 → Save → ยืนยันอีเมลถ้ามีถาม

**นาฬิกาเริ่มเดินตรงนี้** — Cloudflare จะส่งอีเมล "is now active" ปกติภายใน 15 นาที–2 ชม. (worst case 24 ชม.)

```bash
nslookup -type=NS minghe.work 8.8.8.8   # ต้องเห็น ns.cloudflare.com
```

**ไม่ต้องรอให้เสร็จ — ไป §3 ต่อได้เลย**

---

## 3. นาที 5–15 — สร้าง Droplet

### 3.1 Create Droplet

DigitalOcean → **Create → Droplets**

| ช่อง | เลือก |
|---|---|
| Region | **Singapore (SGP1)** — ใกล้ผู้ใช้ไทยที่สุด |
| Image | **Ubuntu 24.04 (LTS) x64** |
| Size | Basic → Regular SSD → **2 GB RAM / 1 vCPU / 50 GB** (~$12/เดือน) |
| Authentication | **SSH Key** → *New SSH Key* → วางเนื้อหา `~/.ssh/minghe_do.pub` → ตั้งชื่อ `minghe-deploy` |
| Additional options | ✅ **Enable Backups** (+20% ≈ $2.40/เดือน) · ✅ Monitoring |
| Hostname | `minghe-prod-sgp1` |

> ⚠️ **ห้ามเลือกแพ็ก 1 GB ($6)** — MySQL 8 + API + Caddy พร้อมกันบน 1 GB จะโดน OOM kill ตอนรัน migrate
> `setup.sh` เปิด swap 1 GB ให้แล้ว แต่ swap ไม่ทดแทน RAM สำหรับ InnoDB

### 3.2 Reserved IP

**Networking → Reserved IPs → Assign** → เลือก Droplet ที่เพิ่งสร้าง → จด IP ไว้ เรียกต่อจากนี้ว่า `<RESERVED_IP>`

> ทำไมต้อง Reserved IP: วันหนึ่งถ้าต้องสร้างเครื่องใหม่ ย้าย IP มาผูกได้ใน 10 วินาที **ไม่ต้องแก้ DNS ไม่ต้องรอ propagate**

### 3.3 Cloud Firewall

**Networking → Firewalls → Create Firewall** ชื่อ `minghe-web`

Inbound:

| Type | Protocol | Port | Sources |
|---|---|---|---|
| SSH | TCP | 22 | All IPv4, All IPv6 (หรือแคบเป็น IP บ้าน/ออฟฟิศถ้าคงที่) |
| HTTP | TCP | 80 | All IPv4, All IPv6 |
| HTTPS | TCP | 443 | All IPv4, All IPv6 |

Outbound: ปล่อยค่าเริ่มต้น (allow all) — จำเป็นสำหรับ `docker pull` และ Let's Encrypt

**Apply to Droplets** → เลือก `minghe-prod-sgp1`

> ⚠️ จุดพลาดบ่อย: สร้าง firewall แล้วลืมผูกกับ Droplet → firewall ไม่มีผลเลย

### 3.4 ทดสอบเข้าเครื่อง

```bash
ssh -i ~/.ssh/minghe_do root@<RESERVED_IP>
```

DigitalOcean ให้ล็อกอินเป็น **`root`** ตั้งแต่แรก (ต่างจาก Lightsail ที่ให้ `ubuntu`) — จำไว้ใช้ตอนตั้ง `DEPLOY_USER` ใน §6

---

## 4. นาที 15–20 — DNS records ใน Cloudflare

พอ Cloudflare ขึ้น **Active** แล้ว → **DNS → Records → Add record**

| Type | Name | Content | Proxy | TTL |
|---|---|---|---|---|
| A | `api` | `<RESERVED_IP>` | 🔘 **DNS only (เมฆเทา)** | Auto |
| A | `uat` | `<RESERVED_IP>` | 🔘 **DNS only** | Auto |

> 🔴 **ต้องเป็นเมฆเทาตอนนี้** — Caddy ขอใบรับรอง Let's Encrypt ผ่าน HTTP-01 บนพอร์ต 80
> ถ้าเปิด proxy (เมฆส้ม) ไว้ก่อน Cloudflare จะดักพอร์ต 80 ไว้เอง แล้ว Caddy ออกใบรับรองไม่สำเร็จ
> เปิด proxy ทีหลังใน §9 หลังใบรับรองออกแล้ว

`@` และ `www` **ยังไม่ต้องเพิ่มเอง** — Cloudflare Pages จะสร้างให้อัตโนมัติใน §7

```bash
nslookup api.minghe.work 8.8.8.8    # ต้องได้ <RESERVED_IP>
```

---

## 5. นาที 20–35 — เตรียมเครื่องครั้งเดียว

### 5.1 ส่งไฟล์ขึ้นเครื่องแล้วรัน setup

จากเครื่องตัวเอง ที่ root ของ repo:

```bash
scp -i ~/.ssh/minghe_do -r deploy/droplet root@<RESERVED_IP>:~/droplet
ssh -i ~/.ssh/minghe_do root@<RESERVED_IP>
```

บน Droplet:

```bash
cd ~/droplet && chmod +x setup.sh && ./setup.sh
```

`setup.sh` ทำ 5 อย่าง: ติดตั้ง Docker + compose plugin + rsync → เปิด swap 1 GB → สร้าง `/opt/minghe` พร้อมวาง
`docker-compose.yml` / `Caddyfile` / `.env` (สุ่ม `JWT_SECRET_KEY` และ `MYSQL_ROOT_PASSWORD` ให้เอง) → `docker compose up -d`

ครั้งแรก `docker compose pull` จะ **fail ถ้า package บน GHCR ยังเป็น private** — ไม่เป็นไร ไปแก้ใน §6.3 แล้วค่อย pull ใหม่

### 5.2 แก้ `/opt/minghe/.env` ให้ครบ

```bash
nano /opt/minghe/.env
```

ค่าที่ **ต้อง** ตรวจ/แก้:

```ini
API_DOMAIN=api.minghe.work
WEB_DOMAIN=uat.minghe.work           # โดเมน UAT ที่ Caddy เสิร์ฟ static เอง

APP_BASE_URL=https://minghe.work
# ต้องมี origin ของหน้าบ้านทุกตัวที่ยิงเข้า API ไม่งั้นเบราว์เซอร์บล็อกหมด
CORS_ALLOWED_ORIGINS=https://minghe.work,https://www.minghe.work,https://uat.minghe.work,https://minghe-work.pages.dev

# 🔴 production ต้องเป็น false ทั้งคู่
MINGHE_SEED_DEMO_ACCOUNTS=false
MINGHE_OTP_ECHO=false

# ไม่มี 4 ค่านี้ = OTP ไม่ถูกส่ง = สมัครสมาชิกไม่ได้
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...
GMAIL_REFRESH_TOKEN=...
GMAIL_ACCESS_TOKEN=...
GMAIL_SENDER_EMAIL=info@minghe.work

R2_ENDPOINT=...
R2_ACCESS_KEY=...
R2_SECRET_KEY=...
```

> `https://minghe-work.pages.dev` ใน CORS มีไว้ให้ทดสอบผ่าน URL ของ Pages ได้ก่อน custom domain พร้อม

ยกระบบใหม่แล้วตรวจ:

```bash
cd /opt/minghe && docker compose up -d && docker compose ps
curl -s http://127.0.0.1:5000/healthz
# คาดว่าได้ {"status":"ok","mode":"live",...}
```

ถ้า DNS ของ `api` มาถึงแล้ว Caddy จะออกใบรับรองเองภายใน ~30 วินาที:

```bash
docker compose logs caddy | tail -30    # มองหา "certificate obtained successfully"
```

---

## 6. นาที 35–45 — GitHub: environment, secrets, GHCR

### 6.1 สร้าง environment `production`

**Settings → Environments → New environment** ชื่อ `production`
- **Deployment branches and tags** → *Selected branches* → เพิ่ม `main` ← ตัวกันไม่ให้ branch อื่น deploy ได้
- (แนะนำ) **Required reviewers** → ใส่ตัวเอง — ทุก deploy จะรอกด Approve ก่อน

### 6.2 ใส่ secrets และ variables (ระดับ environment `production`)

| ชื่อ | ชนิด | ค่า | ใช้โดย |
|---|---|---|---|
| `DEPLOY_HOST` | secret | `<RESERVED_IP>` | api + web-uat |
| `DEPLOY_USER` | secret | `root` | api + web-uat |
| `DEPLOY_SSH_KEY` | secret | เนื้อหาไฟล์ `~/.ssh/minghe_do` ทั้งไฟล์ รวมบรรทัด `-----BEGIN/END-----` | api + web-uat |
| `GHCR_PULL_TOKEN` | secret | PAT (classic) สิทธิ์ `read:packages` — ใส่เฉพาะถ้า package เป็น private | api |
| `CLOUDFLARE_API_TOKEN` | secret | ดู §6.4 | web |
| `CLOUDFLARE_ACCOUNT_ID` | secret | Account ID จาก §2.1 | web |
| `CF_PAGES_PROJECT` | variable | `minghe-work` | web |
| `API_BASE_URL` | variable | `https://api.minghe.work` | web + ci |
| `WEB_URL` | variable | `https://uat.minghe.work` | web-uat |
| `GOOGLE_LOGIN_ENABLED` | variable | `false` | web |

**Settings → Actions → General → Workflow permissions** → **Read and write permissions** (ให้ push image ขึ้น GHCR ได้)

### 6.3 GHCR

รัน workflow **Deploy API** หนึ่งครั้ง (§8) เพื่อให้ package `minghe-api` ถูกสร้างก่อน แล้วค่อย:

**GitHub profile → Packages → `minghe-api` → Package settings → Change visibility → Public**

หรือถ้าอยากให้เป็น private: ตั้ง `GHCR_PULL_TOKEN` ใน §6.2 แล้ว workflow จะ `docker login` บนเครื่องให้เอง

### 6.4 Cloudflare API token สำหรับ Pages

Cloudflare → **My Profile → API Tokens → Create Token → Create Custom Token**

| ช่อง | ค่า |
|---|---|
| Permissions | `Account` · `Cloudflare Pages` · **Edit** |
| Account Resources | Include → บัญชีของคุณ |
| TTL | ปล่อยว่าง (ไม่หมดอายุ) หรือกำหนดเองแล้วจดวันไว้ |

→ Continue → Create → **คัดลอกทันที** (แสดงครั้งเดียว) → วางเป็น secret `CLOUDFLARE_API_TOKEN`

---

## 7. นาที 45–55 — Cloudflare Pages (หน้าบ้าน production)

### 7.1 เชื่อม GitHub ให้ Pages build เอง (Git integration)

**Workers & Pages → Create → Pages → Connect to Git** → ติดตั้ง Cloudflare Pages GitHub App → เลือก repo `bboyzchecken/minghe-app`

ตั้งค่า build ตามนี้เป๊ะ ๆ:

| ช่อง | ค่า |
|---|---|
| Project name | `minghe-work` |
| Production branch | `main` |
| **Framework preset** | **None** |
| Build command | `pnpm --filter @minghe/app build` |
| Build output directory | `apps/app/out` |
| Root directory | `/` (ค่าเริ่มต้น — **ห้ามตั้งเป็น `apps/app`**) |

> ⚠️ **Framework preset ต้องเป็น None** — preset "Next.js" จะไปเรียก `@cloudflare/next-on-pages` ซึ่งสร้าง Worker สำหรับ SSR
> แต่ `apps/app` ตั้ง `output: 'export'` เป็น static ล้วน ใช้ preset แล้ว build พังทันที
>
> ⚠️ **Root directory ต้องเป็น `/`** — เป็น pnpm workspace ที่ `apps/app` พึ่ง `@minghe/core` และ `@minghe/report` ผ่าน `workspace:*`
> ถ้าตั้ง root เป็น `apps/app` จะ resolve dependency ไม่เจอ

### 7.2 Environment variables บน Pages

**Settings → Environment variables** → ใส่ให้ครบทั้ง **Production** และ **Preview**:

| ตัวแปร | ค่า | ทำไม |
|---|---|---|
| `MINGHE_MODE` | `live` | ไม่ใส่ = อ่านจาก `.env` ของ repo แล้วอาจได้ mock |
| `MINGHE_API_BASE_URL` | `https://api.minghe.work` | ฝังตอน build |
| `MINGHE_GOOGLE_LOGIN_ENABLED` | `false` | |
| `NEXT_TELEMETRY_DISABLED` | `1` | |
| `NODE_VERSION` | `22` | `.nvmrc` มี `22` อยู่แล้ว ใส่ซ้ำกันพลาด |
| `PNPM_VERSION` | `11.9.0` | ใส่**เฉพาะเมื่อ** build ล้มเพราะ pnpm เวอร์ชันไม่ตรงกับ `packageManager` |

`next.config.mjs` เขียนไว้ว่า **`process.env` ชนะไฟล์ `.env` เสมอ** ค่าที่ตั้งตรงนี้จึงมีผลจริงตอน build

### 7.3 Build watch paths — กันไม่ให้ build ทุกครั้งที่แตะ API

**Settings → Builds & deployments → Build watch paths** → *Include*:

```
apps/app/*
packages/*
package.json
pnpm-lock.yaml
```

ไม่ตั้ง = แก้ `apps/api` หรือ `docs` ทีก็ build หน้าบ้านใหม่ทุกครั้ง เปลืองโควตา build (แผน Free 500 builds/เดือน)

### 7.4 🔴 ต้องปิด `deploy-web.yml` ไม่งั้น deploy ซ้อนกัน

ถ้าใช้ Git integration แล้ว **ยังเหลือ workflow ที่ `wrangler pages deploy` อยู่** จะมีสอง deployment แข่งกันทุกครั้งที่ push
เลือกทำอย่างใดอย่างหนึ่ง:

```bash
git rm .github/workflows/deploy-web.yml     # ทางที่สะอาดที่สุด — Pages รับผิดชอบหน้าบ้านทั้งหมด
```

หรือถ้าอยากเก็บไฟล์ไว้ ให้ตัด trigger `push` ออกเหลือแค่ `workflow_dispatch` (กดรันเองเมื่อจำเป็น)

**สิ่งที่เสียไปเมื่อย้ายมา Git integration** — รับได้ แต่ต้องรู้:
- หน้าบ้านไม่ผ่าน GitHub environment `production` อีกต่อไป → **ไม่มี required reviewer** และไม่รอ CI ผ่านก่อน deploy
- ตัวกันที่เหลือคือ ruleset ป้องกัน `main` (ต้องผ่าน PR + status check `web`/`api` ก่อน merge) — ของที่เข้า `main` ได้จึงผ่าน CI มาแล้วเสมอ
- `deploy-api.yml` **ไม่กระทบ** ยังใช้ environment `production` และ secret ชุดเดิมทุกอย่าง

### 7.5 Preview deployments กับ CORS

Pages จะสร้าง URL preview ให้ทุก PR แบบ `https://<hash>.minghe-work.pages.dev` — ซึ่ง **API จะบล็อกด้วย CORS** เพราะไม่อยู่ในรายการ

Echo (CORS middleware ของ API) รองรับ wildcard → เติมใน `/opt/minghe/.env`:

```ini
CORS_ALLOWED_ORIGINS=https://minghe.work,https://www.minghe.work,https://uat.minghe.work,https://minghe-work.pages.dev,https://*.minghe-work.pages.dev
```

> ⚠️ แลกมาด้วยการที่ **ทุก preview build ยิงเข้า API production ได้** ช่วง UAT รับได้ แต่พอมีข้อมูลลูกค้าจริงควรตัด wildcard ออก
> แล้วปิด preview ที่ **Settings → Builds & deployments → Preview deployments → None** แทน

### 7.6 (ทางเลือก) deploy ด้วยมือจากเครื่อง

ใช้ตอนอยากดันของขึ้นเดี๋ยวนี้โดยไม่ต้อง push — ไม่ขัดกับ Git integration:

```bash
MINGHE_MODE=live MINGHE_API_BASE_URL=https://api.minghe.work pnpm --filter @minghe/app build
npx wrangler pages deploy apps/app/out --project-name=minghe-work --branch=main
```

### 7.7 ผูก custom domain

Pages project → **Custom domains → Set up a domain**
1. ใส่ `minghe.work` → Continue → Cloudflare เห็นว่าโซนอยู่บัญชีเดียวกัน → **Activate domain** (สร้างเรกคอร์ดให้เอง ไม่ต้องแตะ DNS)
2. ทำซ้ำกับ `www.minghe.work`

ปกติ active ภายใน 1–5 นาที ถ้าค้างที่ *Verifying* เกิน 10 นาที ให้กลับไปดูว่า §2.2 ปิด Website Builder แล้วจริงหรือยัง

### 7.8 ให้ `www` ไปที่ apex ตัวเดียว (แนะนำ)

**Rules → Redirect Rules → Create rule**
- ชื่อ: `www → apex`
- If: `Hostname` `equals` `www.minghe.work`
- Then: **Dynamic redirect** · `concat("https://minghe.work", http.request.uri.path)` · **301** · ✅ Preserve query string

> ทำแบบนี้แล้ว SEO ไม่ถูกแบ่งเป็นสองโดเมน และเหลือ origin เดียวให้ดูแลใน `CORS_ALLOWED_ORIGINS`

---

## 8. นาที 55–65 — ยิง deploy จริง แล้วตรวจ

```bash
git add -A
git commit -m "chore(deploy): runbook production + แยก workflow UAT ออกจาก Pages"
git push origin main
```

หรือกดเอง: **Actions → Deploy API (DigitalOcean) → Run workflow** (branch `main`) แล้วตามด้วย **Deploy web (Cloudflare Pages)**

สิ่งที่ workflow ทำ:
- **Deploy API** → build image → push `ghcr.io/bboyzchecken/minghe-api:<sha>` + `:latest` → scp `docker-compose.yml`+`Caddyfile` ไป `/opt/minghe` → ssh: เขียน `MINGHE_API_IMAGE` ลง `.env` → `compose pull && up -d` → รอ healthcheck ≤150 วินาที → `curl /healthz`
- **Deploy web** → `pnpm build` (static export) → `wrangler pages deploy apps/app/out`

### เกณฑ์ผ่าน — ต้องได้ครบทุกข้อ

```bash
curl -s https://api.minghe.work/healthz          # {"status":"ok","mode":"live",...}
curl -sI https://minghe.work | head -1           # HTTP/2 200
curl -sI https://www.minghe.work | head -1       # HTTP/2 301 → https://minghe.work
curl -sI https://uat.minghe.work | head -1       # HTTP/2 200 (ถ้ารัน deploy-web-uat แล้ว)
```

```bash
# CORS ทำงานจริงหรือไม่ — สำคัญที่สุดและพลาดบ่อยที่สุด
curl -si -X OPTIONS https://api.minghe.work/api/v1/auth/login -H "Origin: https://minghe.work" -H "Access-Control-Request-Method: POST" | grep -i access-control-allow-origin
```

จากนั้นเปิด `https://minghe.work` ในเบราว์เซอร์ → DevTools → Network → **สมัครสมาชิกจริงหนึ่งบัญชี** → ต้องได้อีเมล OTP จริง

---

## 9. ปิดท้าย — hardening (ทำวันเดียวกัน อย่าเลื่อน)

### 9.1 เปิด Cloudflare proxy หน้า API

หลังจาก `curl https://api.minghe.work/healthz` ผ่านแล้วเท่านั้น:

1. **SSL/TLS → Overview** → ตั้งเป็น **Full (strict)** ← ทำ**ก่อน**เปิดเมฆส้ม
2. **DNS → Records** → `api` → สลับเป็น 🟠 **Proxied**
3. ตรวจซ้ำ: `curl -s https://api.minghe.work/healthz` ต้องยังได้ `ok`

ได้อะไร: ซ่อน IP จริงของ Droplet · กัน DDoS · WAF พื้นฐาน
ถ้าพัง: สลับกลับเป็นเมฆเทาได้ทันที ไม่เกิน 1 นาที

> ⚠️ Cloudflare proxy จำกัด request body ที่ **100 MB** (แผน Free) — ถ้าอัปโหลดวิดีโอผ่าน API ตรง ให้ยิงเข้า R2 ด้วย presigned URL แทน

### 9.2 เปลี่ยนรหัสผ่าน admin

seed สร้าง `admin@minghe.work` ด้วยรหัส `changeme1234` — **ล็อกอินแล้วเปลี่ยนทันที** ก่อนบอก URL ให้ใคร

### 9.3 backup ฐานข้อมูล

```bash
ssh -i ~/.ssh/minghe_do root@<RESERVED_IP>
crontab -e
```

```cron
0 3 * * * cd /opt/minghe && docker compose exec -T db sh -c 'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" minghe' | gzip > /opt/minghe/backup-$(date +\%F).sql.gz
5 3 * * * find /opt/minghe -name 'backup-*.sql.gz' -mtime +14 -delete
```

DO Backups (เปิดไว้แล้วตอนสร้าง) กู้ทั้งเครื่องได้ แต่ **ดึง dump ลงมาเก็บนอก DigitalOcean อาทิตย์ละครั้ง** ด้วย —
บทเรียนจากตอนบัญชี AWS โดนแบน: ถ้าบัญชีมีปัญหา backup ที่อยู่ในบัญชีนั้นก็เข้าไม่ถึงเหมือนกัน

```bash
scp -i ~/.ssh/minghe_do root@<RESERVED_IP>:/opt/minghe/backup-*.sql.gz ./backups/
```

### 9.4 เช็กลิสต์ก่อนเปิดรับเงินจริง

- [ ] `MINGHE_OTP_ECHO=false` และ `MINGHE_SEED_DEMO_ACCOUNTS=false` ใน `/opt/minghe/.env`
- [ ] เปลี่ยนรหัส admin แล้ว
- [ ] cron backup ทำงาน (ตรวจว่ามีไฟล์ `backup-*.sql.gz` วันถัดไป)
- [ ] เอกสารกฎหมายเปลี่ยนจาก `draft` → `published` + ตั้ง `LEGAL_*_VERSION` ให้ตรง (บันทึกความยินยอมอ้างเลขเวอร์ชันนี้)
- [ ] **GB Prime Pay เชื่อมจริง** — ตอนนี้ `PAYMENT_PROVIDER=mock` หน้าชำระเงินบันทึกคำสั่งซื้อและออกรหัสโดย**ยังไม่ตัดเงินจริง**
- [ ] `MINGHE_GOOGLE_LOGIN_ENABLED` + `GOOGLE_OAUTH_REDIRECT_URL` ตรงกับโดเมนจริง (ถ้าจะเปิด)

---

## 10. (ทางเลือก) Cloudflare Worker — proxy `/api` ให้เป็น origin เดียวกัน

**ยังไม่ต้องทำในรอบแรก** ทำเมื่อเจอปัญหา CORS บ่อย หรืออยากซ่อน `api.minghe.work` จากผู้ใช้

ประโยชน์: หน้าบ้านยิงไป `/api/...` บนโดเมนเดียวกัน → **ไม่มี preflight ไม่มี CORS cookie เป็น first-party**

`workers/api-proxy/src/index.js`:

```js
export default {
  async fetch(request) {
    const url = new URL(request.url)
    if (!url.pathname.startsWith('/api/')) return fetch(request)

    const upstream = new URL(request.url)
    upstream.hostname = 'api.minghe.work'
    upstream.pathname = url.pathname.slice(4) // ตัด /api ออก

    // ส่งต่อ method/headers/body เดิมทั้งหมด — Worker ทำหน้าที่แค่เปลี่ยนปลายทาง
    return fetch(new Request(upstream, request))
  },
}
```

```bash
npx wrangler deploy workers/api-proxy/src/index.js --name minghe-api-proxy
```

ผูก route: **Workers & Pages → minghe-api-proxy → Settings → Domains & Routes → Add route** → `minghe.work/api/*`

ถ้าใช้ทางนี้ ต้องเปลี่ยนสองที่พร้อมกัน:
- GitHub variable `API_BASE_URL` → `/api` แล้ว deploy หน้าบ้านใหม่
- `CORS_ALLOWED_ORIGINS` ยังต้องมี `https://minghe.work` ไว้ (Worker ส่ง `Origin` เดิมไปด้วย)

---

## 11. Rollback

| พัง | แก้ | เวลา |
|---|---|---|
| หน้าบ้าน | Pages → **Deployments** → เลือกอันเก่า → *Rollback to this deployment* | ~10 วินาที |
| API | `nano /opt/minghe/.env` แก้ `MINGHE_API_IMAGE=ghcr.io/bboyzchecken/minghe-api:<sha เดิม>` → `cd /opt/minghe && docker compose up -d` | ~1 นาที |
| Cloudflare proxy ทำ API พัง | DNS → `api` → สลับกลับเป็นเมฆเทา | ~1 นาที |
| เครื่องเจ๊ง | สร้าง Droplet ใหม่ → ย้าย Reserved IP มาผูก → รัน `setup.sh` → restore dump | ~20 นาที |

ทุก deploy เขียน tag ที่ใช้ลงบรรทัด `MINGHE_API_IMAGE` ให้แล้ว — ดู sha เก่าได้จากหน้า Actions หรือ `docker images`

---

## 12. เจอปัญหา แก้ตรงนี้

| อาการ | สาเหตุที่เจอบ่อยที่สุด | แก้ |
|---|---|---|
| Caddy ออกใบรับรองไม่ได้ | `api` เป็นเมฆส้ม / firewall ไม่ได้ผูกกับ Droplet / DNS ยังไม่ propagate | สลับเป็นเมฆเทา · ตรวจ **Apply to Droplets** · `docker compose logs caddy` |
| deploy-api fail ที่ step ssh | `DEPLOY_USER` ไม่ใช่ `root` หรือ private key วางไม่ครบบรรทัด BEGIN/END | แก้ secret แล้ว re-run |
| `docker compose pull` → denied | package บน GHCR เป็น private และไม่มี `GHCR_PULL_TOKEN` | ทำ package เป็น public หรือใส่ PAT `read:packages` |
| หน้าเว็บขึ้น แต่ทุก request ไป API แดง | `CORS_ALLOWED_ORIGINS` ไม่มี origin จริง | แก้ `/opt/minghe/.env` → `docker compose up -d` |
| สมัครสมาชิกแล้วไม่ได้ OTP | `GMAIL_*` ยังว่าง หรือ MX หายตอนย้าย NS | เติม credential · ตรวจ `nslookup -type=MX minghe.work` |
| apex เปิดแล้วเจอหน้า GoDaddy | Website Builder ยังไม่ถูกปิด | §2.2 แล้วรอ 5 นาที |
| API ตายเงียบตอน migrate | RAM ไม่พอ (แพ็ก 1 GB) | `docker compose logs api` หา OOM → resize เป็น 2 GB |

---

## 13. ภาพรวมปลายทาง

```
                          push/merge → main
                                 │
        ┌────────────────────────┼────────────────────────┐
  deploy-web.yml           deploy-api.yml          deploy-web-uat.yml
  build static (live)      build → GHCR            build static → tar
  wrangler pages deploy    scp + ssh compose up    scp + rsync → /opt/minghe/web
        │                        │                        │
  Cloudflare Pages         DO Droplet · Singapore · 2 GB · Docker
  minghe.work        ───▶  api.minghe.work          uat.minghe.work
  www → 301 → apex         Caddy TLS → api:5000 → MySQL (volume + cron dump)
                           Reserved IP · Cloud Firewall 22/80/443 · DO Backups
```

**ค่าใช้จ่าย ~$14–15/เดือน** — Droplet $12 + Backups $2.40 · Reserved IP, Cloud Firewall, Cloudflare Pages/Workers/DNS ฟรีหมด
