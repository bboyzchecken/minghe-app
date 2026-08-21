# Stage 1: Build
FROM golang:1.23-alpine AS build
WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
ARG COMMIT=dev
RUN CGO_ENABLED=0 go build -ldflags "-X main.GitCommit=$COMMIT" -o artifacts/minghe-api .

# Stage 2: Runtime
FROM alpine:latest
RUN apk --no-cache add tzdata ca-certificates
ENV TZ=Asia/Bangkok

WORKDIR /app
COPY --from=build /app/artifacts/minghe-api ./artifacts/minghe-api

EXPOSE 5000
CMD ["./artifacts/minghe-api"]
