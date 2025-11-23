package handlers

import (
	"encoding/json"
	"log"
	"net/http"
)

func HealthHandler(writer http.ResponseWriter, _ *http.Request) {
	writer.Header().Set("Content-Type", "application/json")

	response := HealthResponse{
		Message: "OK",
	}

	err := json.NewEncoder(writer).Encode(response)
	if err != nil {
		log.Fatalf("Encoding response blew up: %v", err)
	}
}
