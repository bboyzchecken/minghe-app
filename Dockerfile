# ============================================================
# 命合 Mìnghé — Docker image (all-in-one, deploy ที่ไหนก็ได้ที่มี Docker)
# multi-stage: builder ติดตั้ง+build / runner รันจริง
# ครอบทุกอย่าง: Next.js + เครื่องคำนวณปาจือ + Prisma client + seed
# ต้องการภายนอกอย่างเดียว = PostgreSQL (docker-compose มีให้ในตัว)
# ============================================================

FROM node:22-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH="/pnpm:$PATH"
# openssl = จำเป็นต่อ Prisma query engine บน Debian
RUN apt-get update -y \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable \
    && corepack prepare pnpm@11.9.0 --activate
WORKDIR /app

# ---- builder: ติดตั้ง deps → generate Prisma client → build Next ----
FROM base AS builder
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @minghe/db exec prisma generate
# build ไม่ต่อ DB (ทุก route เป็น dynamic) จึง build ได้โดยไม่ต้องมี Postgres
RUN pnpm --filter @minghe/web build
# ตัด cache ของ build ทิ้งเพื่อลดขนาด image
RUN rm -rf apps/web/.next/cache

# ---- runner: รันแอปจริง (คง node_modules ไว้เพื่อใช้ prisma CLI ตอน db push + seed) ----
FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app /app
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
# strip CR (กัน CRLF จาก Windows) + ทำให้ execute ได้
RUN sed -i 's/\r$//' /usr/local/bin/entrypoint.sh \
    && chmod +x /usr/local/bin/entrypoint.sh
EXPOSE 3000
# entrypoint: push schema → seed (ครั้งแรก) → next start
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
