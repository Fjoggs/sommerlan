package handlers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"path"
	"strings"
	"time"
)

const lanStart = "2026-07-15T13:37:00"

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

// CleanURLHandler redirects /foo.html → /foo (301) and rewrites /foo → serves foo.html transparently.
func CleanURLHandler(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		p := r.URL.Path
		if strings.HasSuffix(p, ".html") {
			clean := strings.TrimSuffix(p, ".html")
			if clean == "/index" {
				clean = "/"
			}
			http.Redirect(w, r, clean, http.StatusMovedPermanently)
			return
		}
		if p != "/" && !strings.Contains(path.Base(p), ".") {
			r2 := r.Clone(r.Context())
			r2.URL.Path = p + ".html"
			next.ServeHTTP(w, r2)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func LanGateMiddleware(db *sql.DB, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		p := r.URL.Path
		isHTML := p == "/" || !strings.Contains(path.Base(p), ".")
		if !isHTML {
			next.ServeHTTP(w, r)
			return
		}

		if p == "/login" {
			next.ServeHTTP(w, r)
			return
		}

		_, authErr := GetUserFromRequest(db, r)
		isAuthed := authErr == nil

		if time.Now().Before(lanStartTime) {
			switch p {
			case "/countdown":
				if !isAuthed {
					http.Redirect(w, r, "/login", http.StatusFound)
					return
				}
				next.ServeHTTP(w, r)
			case "/rsvp":
				if !isAuthed {
					http.Redirect(w, r, "/login", http.StatusFound)
					return
				}
				next.ServeHTTP(w, r)
			default:
				if !isAuthed {
					http.Redirect(w, r, "/login", http.StatusFound)
					return
				}
				http.Redirect(w, r, "/countdown", http.StatusFound)
			}
			return
		}

		if !isAuthed {
			http.Redirect(w, r, "/login", http.StatusFound)
			return
		}
		next.ServeHTTP(w, r)
	})
}
