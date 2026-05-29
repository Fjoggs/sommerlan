package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
)

func requireAdmin(db *sql.DB, r *http.Request) error {
	user, err := GetUserFromRequest(db, r)
	if err != nil {
		return fmt.Errorf("unauthorized")
	}
	if user.Role != "admin" {
		return fmt.Errorf("forbidden")
	}
	return nil
}

func EnableCORS(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" {
			w.Header().Set("Access-Control-Allow-Origin", origin)
		}
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		// Handle preflight requests
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next(w, r)
	}
}
