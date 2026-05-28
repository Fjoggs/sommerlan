# Stage 1: compile TypeScript
FROM node:22-alpine AS frontend-builder
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# Stage 2: build Go binary
FROM golang:1.25.3-alpine AS backend-builder
WORKDIR /app
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ .
RUN CGO_ENABLED=0 GOOS=linux go build -o sommerlan .

# Stage 3: minimal runtime
FROM alpine:latest
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app

COPY --from=backend-builder /app/sommerlan .

COPY --from=frontend-builder /frontend/dist        ./frontend/dist
COPY frontend/*.html                               ./frontend/
COPY frontend/css/                                 ./frontend/css/
COPY frontend/fonts/                               ./frontend/fonts/
COPY frontend/data/                                ./frontend/data/

RUN mkdir -p ./frontend/uploads/lan

EXPOSE 8080

ENV FRONTEND_PATH=/app/frontend
ENV DB_PATH=/data/sommerlan.db

CMD ["./sommerlan"]
