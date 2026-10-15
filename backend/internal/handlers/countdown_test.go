package handlers

import (
	"database/sql"
	"testing"
	"time"
)

func insertLan(t *testing.T, db *sql.DB, start, end, from, to string) {
	t.Helper()
	if _, err := db.Exec(`INSERT INTO lan (event, start_date, end_date, from_display, to_display, description) VALUES ('main', ?, ?, ?, ?, '')`, start, end, from, to); err != nil {
		t.Fatal(err)
	}
}

func Test_nextLan_explicitDates(t *testing.T) {
	db := newTestDB(t)
	future := time.Now().AddDate(0, 1, 0)
	insertLan(t, db, future.Format("2006-01-02"), future.AddDate(0, 0, 4).Format("2006-01-02"), "", "")

	_, start, end, err := nextLan(db)
	if err != nil {
		t.Fatal(err)
	}
	if start.Format("2006-01-02") != future.Format("2006-01-02") || end.Sub(start) != 4*24*time.Hour {
		t.Errorf("got %v - %v", start, end)
	}
}

func Test_nextLan_yearMarkerFallsBackToDisplay(t *testing.T) {
	db := newTestDB(t)
	year := time.Now().Year() + 1
	insertLan(t, db, time.Date(year, 1, 1, 0, 0, 0, 0, time.UTC).Format("2006-01-02"), time.Date(year, 12, 31, 0, 0, 0, 0, time.UTC).Format("2006-01-02"), "14. juli", "26. juli")

	_, start, end, err := nextLan(db)
	if err != nil {
		t.Fatal(err)
	}
	if start.Month() != time.July || start.Day() != 14 || end.Day() != 26 {
		t.Errorf("got %v - %v", start, end)
	}
}

func Test_nextLan_endedLanIsSkipped(t *testing.T) {
	db := newTestDB(t)
	insertLan(t, db, "2020-07-14", "2020-07-26", "", "")
	if _, _, _, err := nextLan(db); err != sql.ErrNoRows {
		t.Errorf("want ErrNoRows, got %v", err)
	}
}
