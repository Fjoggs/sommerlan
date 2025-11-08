FROM golang:1.25.3

WORKDIR /app

COPY go.mod main.go ./
COPY internal/backend.go ./internal/

EXPOSE 8080

CMD go run main.go
