package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"
)

// nextLan queries the next upcoming/ongoing LAN and returns its event name and its start and
// end dates. Upcoming events always have real dates in start_date/end_date (only ancient
// events use YYYY-01-01/YYYY-12-31 year markers), so the free-form from_display/to_display
// strings are not consulted.
func nextLan(db *sql.DB) (event string, start, end time.Time, err error) {
	var startDate, endDate string
	err = db.QueryRow(`SELECT COALESCE(event, ''), start_date, end_date FROM lan WHERE end_date >= date('now') ORDER BY start_date ASC LIMIT 1`).Scan(&event, &startDate, &endDate)
	if err != nil {
		return "", time.Time{}, time.Time{}, err
	}
	start, err = time.ParseInLocation("2006-01-02", startDate, time.Local)
	if err != nil {
		return "", time.Time{}, time.Time{}, fmt.Errorf("unparseable start_date %q: %w", startDate, err)
	}
	end, err = time.ParseInLocation("2006-01-02", endDate, time.Local)
	if err != nil {
		return "", time.Time{}, time.Time{}, fmt.Errorf("unparseable end_date %q: %w", endDate, err)
	}
	return event, start, end, nil
}

// NextLanHandler exposes the next LAN's name and start/end dates (YYYY-MM-DD) to logged-in
// users or the banterbot service token, e.g. for !lantime. Returns 404 when no upcoming LAN
// is known.
func NextLanHandler(db *sql.DB, serviceToken string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if _, err := authOrService(db, r, serviceToken); err != nil {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		event, start, end, err := nextLan(db)
		if err != nil {
			if err != sql.ErrNoRows {
				log.Printf("NextLanHandler: %v", err)
			}
			http.Error(w, "no upcoming lan", http.StatusNotFound)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(map[string]string{
			"event": event,
			"start": start.Format("2006-01-02"),
			"end":   end.Format("2006-01-02"),
		}); err != nil {
			log.Printf("Encoding next lan response: %v", err)
		}
	}
}
