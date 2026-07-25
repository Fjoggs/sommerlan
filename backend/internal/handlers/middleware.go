package handlers

import (
	"crypto/subtle"
	"database/sql"
	"fmt"
	"net/http"

	"backend/internal/database"
)

func requireAuth(db *sql.DB, r *http.Request) error {
	if _, err := GetUserFromRequest(db, r); err != nil {
		return fmt.Errorf("unauthorized")
	}
	return nil
}

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

// authOrService accepts either a normal user session (web UI) or the shared
// service token (banterbot). Service calls may attribute the action to a
// sommerlan user via the X-Discord-Id header; if that's absent or unmatched,
// the returned user has Id == 0, meaning "attribute to no one".
func authOrService(db *sql.DB, r *http.Request, serviceToken string) (*database.UserResponse, error) {
	if serviceToken != "" && subtle.ConstantTimeCompare([]byte(ExtractToken(r)), []byte(serviceToken)) == 1 {
		if discordId := r.Header.Get("X-Discord-Id"); discordId != "" {
			if user, err := database.GetUserByDiscordId(db, discordId); err == nil {
				return user, nil
			}
		}
		return &database.UserResponse{}, nil
	}
	return GetUserFromRequest(db, r)
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
