package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"path"
	"strconv"
	"strings"
	"time"
)

var norwegianMonths = map[string]time.Month{
	"januar":    time.January,
	"februar":   time.February,
	"mars":      time.March,
	"april":     time.April,
	"mai":       time.May,
	"juni":      time.June,
	"juli":      time.July,
	"august":    time.August,
	"september": time.September,
	"oktober":   time.October,
	"november":  time.November,
	"desember":  time.December,
}

// parseNorwegianDisplayDate parses a free-form "D. month" string (e.g. "20. juli"),
// as stored in from_display/to_display, into a concrete date in the given year.
func parseNorwegianDisplayDate(display string, year int) (time.Time, error) {
	fields := strings.Fields(display)
	if len(fields) != 2 {
		return time.Time{}, fmt.Errorf("expected \"D. month\", got %q", display)
	}
	day, err := strconv.Atoi(strings.TrimSuffix(fields[0], "."))
	if err != nil {
		return time.Time{}, fmt.Errorf("invalid day in %q: %w", display, err)
	}
	month, ok := norwegianMonths[strings.ToLower(fields[1])]
	if !ok {
		return time.Time{}, fmt.Errorf("unknown month in %q", display)
	}
	return time.Date(year, month, day, 0, 0, 0, 0, time.Local), nil
}

// ComputeLanGateTime queries the next upcoming/ongoing LAN and returns the first Monday
// on or after its actual start date (parsed from from_display, since start_date is always
// a YYYY-01-01 year marker) at 13:37 local time. Returns zero time (gate open) if no
// upcoming LAN exists or its date can't be determined.
func ComputeLanGateTime(db *sql.DB) time.Time {
	var startDate, fromDisplay string
	err := db.QueryRow(`SELECT start_date, from_display FROM lan WHERE end_date >= date('now') ORDER BY start_date ASC LIMIT 1`).Scan(&startDate, &fromDisplay)
	if err == sql.ErrNoRows {
		log.Println("No upcoming LAN in DB; site gate is open")
		return time.Time{}
	}
	if err != nil {
		log.Printf("Failed to query upcoming LAN: %v; site gate is open", err)
		return time.Time{}
	}
	year, err := strconv.Atoi(startDate[:4])
	if err != nil {
		log.Printf("Unparseable LAN start_date %q: %v; site gate is open", startDate, err)
		return time.Time{}
	}
	t, err := parseNorwegianDisplayDate(fromDisplay, year)
	if err != nil {
		log.Printf("Unparseable LAN from_display %q: %v; site gate is open", fromDisplay, err)
		return time.Time{}
	}
	for t.Weekday() != time.Monday {
		t = t.AddDate(0, 0, 1)
	}
	return time.Date(t.Year(), t.Month(), t.Day(), 13, 37, 0, 0, time.Local)
}

func CountdownHandler(gateTime time.Time) http.HandlerFunc {
	target := gateTime.Format("2006-01-02T15:04:05")
	return func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(map[string]string{"target": target}); err != nil {
			log.Printf("Encoding countdown response: %v", err)
		}
	}
}

// NoCacheMiddleware sets Cache-Control: no-cache on all responses, telling browsers to always
// revalidate via ETag before using a cached copy. LanGateMiddleware overrides this to no-store
// for HTML pages; static assets (JS, CSS, fonts) keep no-cache.
func NoCacheMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-cache")
		next.ServeHTTP(w, r)
	})
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

func LanGateMiddleware(db *sql.DB, gateTime time.Time, next http.Handler) http.Handler {
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

		w.Header().Set("Cache-Control", "no-store")

		user, authErr := GetUserFromRequest(db, r)
		isAuthed := authErr == nil
		isAdmin := isAuthed && user.Role == "admin"

		if !gateTime.IsZero() && time.Now().Before(gateTime) && !isAdmin {
			switch p {
			case "/countdown", "/rsvp":
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
