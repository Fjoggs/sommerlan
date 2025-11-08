package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"reflect"
	"testing"
)

func Test_healthHandler(t *testing.T) {
	req, err := http.NewRequest("GET", "/health", nil)
	if err != nil {
		t.Fatal(err)
	}

	// Create a ResponseRecorder to record the response
	rr := httptest.NewRecorder()

	// Call the handler with our request and recorder
	HealthHandler(rr, req)

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

	// Call the handler with our request and recorder
	LanHandler(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("Handler returned wrong status: got %v want %v", rr.Code, http.StatusOK)
	}

	var response Lan
	err = json.Unmarshal(rr.Body.Bytes(), &response)
	if err != nil {
		t.Errorf("Handler failed to unmarshal response %v", err)
	}

	expectedGame := Game{
		Name: "CS",
	}

	expected := Lan{
		Description:  "Laptop-LAN som rippa pcen til PekkyD",
		Event:        "main",
		Games:        []Game{expectedGame},
		Participants: []string{"ulfos", "PekkyD", "Torp"},
		Year:         2011,
	}

	if !reflect.DeepEqual(response, expected) {
		t.Errorf("Handler returned wrong message: got %v want %v", response, expected)
	}
}
