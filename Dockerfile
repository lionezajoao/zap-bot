# Multi-stage build para otimizar o tamanho da imagem
FROM golang:1.24-alpine AS builder

# Instalar dependências de build
RUN apk add --no-cache gcc musl-dev sqlite-dev

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências primeiro (para cache)
COPY go.mod go.sum ./
RUN go mod download

# Copiar código fonte
COPY . .

# Compilar a aplicação
RUN CGO_ENABLED=1 GOOS=linux go build -o bot main.go

# Imagem final (mais leve)
FROM alpine:latest

# Instalar dependências runtime
RUN apk add --no-cache sqlite ca-certificates tzdata

# Criar usuário não-root por segurança
RUN adduser -D -s /bin/sh botuser

# Criar diretórios necessários
RUN mkdir -p /app/data /app/logs && \
    chown -R botuser:botuser /app

WORKDIR /app

# Copiar binário da imagem builder
COPY --from=builder /app/bot .
COPY --chown=botuser:botuser . .

# Mudar para usuário não-root
USER botuser

# Expor porta (para futuras funcionalidades webhook)
EXPOSE 8080

# Comando para executar a aplicação
CMD ["./bot"]