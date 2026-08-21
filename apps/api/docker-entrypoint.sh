#!/bin/sh
# ============================================================
# 命合 Mìnghé API — container entrypoint
# 1) migration + seed ข้อมูลตั้งต้น (idempotent — รันซ้ำได้ ไม่ทับรหัสผ่านที่เปลี่ยนแล้ว)
#    ข้ามได้ด้วย MINGHE_SKIP_SEED=true
# 2) ยก API server
# ============================================================
set -e

if [ "${MINGHE_SKIP_SEED:-false}" != "true" ]; then
  echo "→ [1/2] migrate + seed (MINGHE_MODE=${MINGHE_MODE:-live} · demo accounts=${MINGHE_SEED_DEMO_ACCOUNTS:-false})"
  /app/minghe-api seed
fi

echo "→ [2/2] เริ่ม API ที่พอร์ต ${PORT:-5000}"
exec /app/minghe-api
