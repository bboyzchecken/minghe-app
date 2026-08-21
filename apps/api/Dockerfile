# ============================================================
# 命合 Mìnghé — Go API image
# multi-stage: build แบบ static binary → รันบน alpine ตัวเล็ก (~30MB)
# ใช้ทั้งใน docker compose (LAN demo) และบน Lightsail (ผ่าน GHCR)
# ============================================================

FROM golang:1.23-alpine AS build
WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .
ARG COMMIT=dev
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath \
    -ldflags "-s -w -X main.GitCommit=${COMMIT}" \
    -o /out/minghe-api .

# ---- runtime ----
FROM alpine:3.20
RUN apk --no-cache add tzdata ca-certificates wget \
    && adduser -D -u 10001 minghe
ENV TZ=Asia/Bangkok
WORKDIR /app

COPY --from=build /out/minghe-api /app/minghe-api
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
# strip CR (กัน CRLF จาก Windows) + ทำให้ execute ได้
RUN sed -i 's/\r$//' /app/docker-entrypoint.sh && chmod +x /app/docker-entrypoint.sh

USER minghe
EXPOSE 5000
HEALTHCHECK --interval=10s --timeout=3s --start-period=30s --retries=12 \
    CMD wget -qO- http://127.0.0.1:5000/healthz >/dev/null || exit 1

# entrypoint: migrate + seed (idempotent) → start server
ENTRYPOINT ["/app/docker-entrypoint.sh"]
