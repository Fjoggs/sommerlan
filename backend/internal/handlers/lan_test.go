package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"

	"backend/internal/database"
)

func newTestDB(t *testing.T) *sql.DB {
	t.Helper()
	db, err := database.InitDB(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatal("Failed to initialise database:", err)
	}
	t.Cleanup(func() { db.Close() })
	return db
}

func Test_healthHandler(t *testing.T) {
	req, err := http.NewRequest("GET", "/health", nil)
	if err != nil {
		t.Fatal(err)
	}

	// Create a ResponseRecorder to record the response
	rr := httptest.NewRecorder()

	HealthHandler(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("Handler returned wrong status: got %v want %v", rr.Code, http.StatusOK)
	}

	var response healthResponse
	err = json.Unmarshal(rr.Body.Bytes(), &response)
	if err != nil {
		t.Errorf("Handler failed to unmarshal response %v", err)
	}

	if response.Message != "OK" {
		t.Errorf("Handler returned wrong message: got %v want %v", response.Message, "OK")
	}
}

func Test_lanHandler_requiresAuth(t *testing.T) {
	t.Setenv("DISABLE_AUTH", "")
	req := httptest.NewRequest("GET", "/lan", nil)
	rr := httptest.NewRecorder()

	NewLanHandlers(newTestDB(t), "").GetLan(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("Handler returned wrong status: got %v want %v", rr.Code, http.StatusUnauthorized)
	}
}

func Test_lanHandler(t *testing.T) {
	t.Setenv("DISABLE_AUTH", "true")
	db := newTestDB(t)

	if _, err := db.Exec(`INSERT INTO user(name) VALUES ('PekkyD')`); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`INSERT INTO lan(description, end_date, event, start_date) VALUES ('Første lan', '2011-12-31', 'pre', '2011-01-01')`); err != nil {
		t.Fatal(err)
	}

	req := httptest.NewRequest("GET", "/lan", nil)
	rr := httptest.NewRecorder()

	NewLanHandlers(db, "").GetLan(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("Handler returned wrong status: got %v want %v", rr.Code, http.StatusOK)
	}

	var response []database.LanEvent
	if err := json.Unmarshal(rr.Body.Bytes(), &response); err != nil {
		t.Fatalf("Handler failed to unmarshal response %v", err)
	}

	if len(response) != 1 {
		t.Fatalf("got %d lans, want 1", len(response))
	}
	got := response[0]
	if got.Description != "Første lan" || got.Event != "pre" || got.Start_date != "2011-01-01" || got.End_date != "2011-12-31" {
		t.Errorf("Handler returned wrong lan: %+v", got)
	}
}
