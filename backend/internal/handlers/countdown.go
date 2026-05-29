package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"time"
)

const lanStart = "2026-07-20T13:37:00"

var lanStartTime = func() time.Time {
	t, err := time.ParseInLocation("2006-01-02T15:04:05", lanStart, time.Local)
	if err != nil {
		log.Fatalf("Invalid lanStart format: %v", err)
	}
	return t
}()

func CountdownHandler(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]string{"target": lanStart}); err != nil {
		log.Fatalf("Encoding countdown response blew up: %v", err)
	}
}

func LanGateMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = lanStartTime
		next.ServeHTTP(w, r)
	})
}
