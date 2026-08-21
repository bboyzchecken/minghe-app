# ============================================================
# 命合 Mìnghé — หน้าเว็บ (Next.js static export → nginx)
# build context = root ของ repo (ต้องเห็น packages/core, packages/report)
#
# nginx เสิร์ฟไฟล์ static และ reverse-proxy `/backend/*` → Go API
# หน้าเว็บจึงเรียก API ที่ origin เดียวกันเสมอ — เปิดจากเครื่องไหนใน LAN ก็ได้
# โดยไม่ต้องฝัง IP/โดเมนของ API ตอน build และไม่ติด CORS
# ============================================================

FROM node:22-alpine AS base
RUN npm install -g pnpm@11.9.0
WORKDIR /app

# ---- builder ----
FROM base AS builder
# manifest ก่อน เพื่อให้ layer ติดตั้ง dependency ถูก cache เมื่อแก้แค่โค้ด
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/app/package.json apps/app/package.json
COPY packages/core/package.json packages/core/package.json
COPY packages/report/package.json packages/report/package.json
RUN pnpm install --frozen-lockfile

COPY packages packages
COPY apps/app apps/app
COPY .env.example .env.example

# ค่าเหล่านี้ถูกฝังลง bundle ตอน build (process.env ชนะไฟล์ .env เสมอ — ดู next.config.mjs)
ARG MINGHE_MODE=live
ARG MINGHE_API_BASE_URL=/backend
ARG MINGHE_GOOGLE_LOGIN_ENABLED=false
ENV MINGHE_MODE=${MINGHE_MODE} \
    MINGHE_API_BASE_URL=${MINGHE_API_BASE_URL} \
    MINGHE_GOOGLE_LOGIN_ENABLED=${MINGHE_GOOGLE_LOGIN_ENABLED} \
    NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @minghe/app build

# ---- runner ----
FROM nginx:1.27-alpine AS runner
# nginx image จะ envsubst ไฟล์ใน /etc/nginx/templates/*.template ให้ตอน start
COPY apps/app/docker/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=builder /app/apps/app/out /usr/share/nginx/html
ENV API_UPSTREAM=http://api:5000
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=5 \
    CMD wget -qO- http://127.0.0.1/healthz >/dev/null || exit 1
