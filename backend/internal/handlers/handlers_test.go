package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"reflect"
	"testing"

	"backend/internal/database"
)

func Test_healthHandler(t *testing.T) {
	req, err := http.NewRequest("GET", "/health", nil)
	if err != nil {
		t.Fatal(err)
	}

	// Create a ResponseRecorder to record the response
	rr := httptest.NewRecorder()

	// Connect to db
	db, err := database.InitDB("../../sommerlan.db")
	if err != nil {
		t.Fatal("Failed to initialise database:", err)
	}

	defer db.Close()

	h := NewHandlers(db)

	// Call the handler with our request and recorder
	h.HealthHandler(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("Handler returned wrong status: got %v want %v", rr.Code, http.StatusOK)
	}

	var response HealthResponse
	err = json.Unmarshal(rr.Body.Bytes(), &response)
	if err != nil {
		t.Errorf("Handler failed to unmarshal response %v", err)
	}

	if response.Message != "OK" {
		t.Errorf("Handler returned wrong message: got %v want %v", response.Message, "OK")
	}
}

func Test_lanHandler(t *testing.T) {
	req, err := http.NewRequest("GET", "/lan", nil)
	if err != nil {
		t.Fatal(err)
	}

	// Create a ResponseRecorder to record the response
	rr := httptest.NewRecorder()

	// Connect to db
	db, err := database.InitDB("../../sommerlan.db")
	if err != nil {
		t.Fatal("Failed to initialise database:", err)
	}

	defer db.Close()

	h := NewHandlers(db)

	// Call the handler with our request and recorder
	h.LanHandler(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("Handler returned wrong status: got %v want %v", rr.Code, http.StatusOK)
	}

	var response []database.LanEvent
	err = json.Unmarshal(rr.Body.Bytes(), &response)
	if err != nil {
		t.Errorf("Handler failed to unmarshal response %v", err)
	}

	event := database.LanEvent{
		Description:  "Første lan",
		End_date:     "2011-01-01",
		Event:        "pre",
		Games:        []string{"CS"},
		Participants: []string{"PekkyD"},
		Start_date:   "2011-01-01",
	}

	expected := []database.LanEvent{event}

	if !reflect.DeepEqual(response, expected) {
		t.Errorf("Handler returned wrong message: got %v want %v", response, event)
	}
}
