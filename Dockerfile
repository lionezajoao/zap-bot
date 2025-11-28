FROM golang:1.24-alpine AS builder

RUN apk add --no-cache gcc musl-dev

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=1 GOOS=linux go build -o bot cmd/main.go

FROM alpine:latest

RUN apk add --no-cache ca-certificates tzdata

RUN adduser -D -s /bin/sh botuser

RUN mkdir -p /app/data /app/logs && \
    chown -R botuser:botuser /app

WORKDIR /app

COPY --from=builder /app/bot .
COPY --chown=botuser:botuser . .

USER botuser

CMD ["./bot"]