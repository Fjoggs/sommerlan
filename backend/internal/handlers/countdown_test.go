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
	// Newly created events have NULL display columns.
	if _, err := db.Exec(`INSERT INTO lan (event, start_date, end_date, description) VALUES ('main', ?, ?, '')`, future.Format("2006-01-02"), future.AddDate(0, 0, 4).Format("2006-01-02")); err != nil {
		t.Fatal(err)
	}

	_, start, end, err := nextLan(db)
	if err != nil {
		t.Fatal(err)
	}
	if start.Format("2006-01-02") != future.Format("2006-01-02") || end.Sub(start) != 4*24*time.Hour {
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
