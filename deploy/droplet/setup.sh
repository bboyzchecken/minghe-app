#!/usr/bin/env bash
# ============================================================
# 命合 Mìnghé — เตรียมเครื่อง DigitalOcean Droplet (Ubuntu 24.04) ครั้งแรกครั้งเดียว
#
# ใช้: scp ไฟล์ในโฟลเดอร์ deploy/droplet ไปที่เครื่อง แล้วรัน
#   chmod +x setup.sh && ./setup.sh          # ถ้าล็อกอินเป็น root (ค่าเริ่มต้นของ DO)
#   chmod +x setup.sh && sudo ./setup.sh     # ถ้าล็อกอินเป็นผู้ใช้อื่น
#
# สิ่งที่ทำ: ติดตั้ง Docker → สร้าง /opt/minghe → วาง compose/Caddyfile/.env → เปิด swap 1GB
#            (2GB RAM รัน MySQL + API สบายขึ้น) → ยกระบบขึ้น
# หลังจากนี้ deploy ทุกครั้งมาจาก GitHub Actions (.github/workflows/deploy-api.yml)
# ============================================================
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET=/opt/minghe

# DigitalOcean ให้ล็อกอินเป็น root มาตั้งแต่แรก ต่างจาก Lightsail ที่ให้ ubuntu + sudo
# ถ้ารันด้วย sudo ใช้เจ้าของเดิม ถ้ารันเป็น root ตรง ๆ ก็เป็น root — ไม่ยัด ubuntu ที่อาจไม่มีจริง
DEPLOY_USER="${SUDO_USER:-$(id -un)}"
if [ "$(id -u)" -ne 0 ]; then
  echo "สคริปต์นี้ต้องรันด้วยสิทธิ์ root — ใช้ sudo ./setup.sh" >&2
  exit 1
fi

echo "→ [1/5] ติดตั้ง Docker Engine + compose plugin (+ rsync ไว้ใช้ตอน deploy หน้าบ้าน)"
command -v rsync >/dev/null 2>&1 || { apt-get update -y && apt-get install -y rsync; }
if ! command -v docker >/dev/null 2>&1; then
  apt-get update -y
  apt-get install -y ca-certificates curl gnupg rsync
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
usermod -aG docker "$DEPLOY_USER" || true

echo "→ [2/5] swap 1GB (ถ้ายังไม่มี)"
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 1G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "→ [3/5] วางไฟล์ที่ $TARGET"
# web/ ต้องมีก่อน caddy สตาร์ต ไม่งั้น docker สร้างเป็นโฟลเดอร์ของ root แล้ว rsync เขียนไม่ได้
mkdir -p "$TARGET" "$TARGET/web"
cp "$HERE/docker-compose.yml" "$HERE/Caddyfile" "$TARGET/"
if [ ! -f "$TARGET/.env" ]; then
  cp "$HERE/.env.example" "$TARGET/.env"
  sed -i "s#^JWT_SECRET_KEY=.*#JWT_SECRET_KEY=$(openssl rand -hex 32)#" "$TARGET/.env"
  sed -i "s#^MYSQL_ROOT_PASSWORD=.*#MYSQL_ROOT_PASSWORD=$(openssl rand -hex 16)#" "$TARGET/.env"
  echo "   สร้าง $TARGET/.env พร้อมสุ่ม JWT_SECRET_KEY / MYSQL_ROOT_PASSWORD แล้ว — เปิดแก้ค่า GMAIL_* และโดเมนให้ครบ"
fi
chown -R "$DEPLOY_USER":"$DEPLOY_USER" "$TARGET"
chmod 600 "$TARGET/.env"

echo "→ [4/5] (ถ้า package บน GHCR เป็น private) login ด้วย PAT read:packages"
echo "   docker login ghcr.io -u <github-user>   # ข้ามได้ถ้าตั้ง package เป็น public"

echo "→ [5/5] ยกระบบ"
cd "$TARGET"
docker compose pull || echo "   (pull ไม่ได้ — ตรวจสิทธิ์ GHCR แล้วรัน docker compose pull อีกครั้ง)"
docker compose up -d
docker compose ps

cat <<EOF

เสร็จแล้ว ✓
  · ตรวจ API:  curl -s http://127.0.0.1:5000/healthz
  · เมื่อ DNS ${API_DOMAIN:-api.minghe.work} และ ${WEB_DOMAIN:-uat.minghe.work} ชี้มาที่เครื่องนี้
    และ DO Firewall เปิด 80/443 แล้ว Caddy จะออก TLS ให้เองทั้งสองโดเมน
  · หน้าบ้านยังว่างจนกว่าจะรัน workflow "Deploy web" ครั้งแรก (อัปโหลด static มาที่ $TARGET/web)
  · backup ฐานข้อมูลรายวัน: เพิ่ม cron
      0 3 * * * cd /opt/minghe && docker compose exec -T db sh -c 'mysqldump -uroot -p"\$MYSQL_ROOT_PASSWORD" minghe' | gzip > /opt/minghe/backup-\$(date +\\%F).sql.gz
EOF
