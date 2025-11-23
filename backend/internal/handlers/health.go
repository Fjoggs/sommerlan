package handlers

import (
	"encoding/json"
	"log"
	"net/http"
)

type healthResponse struct {
	Message string `json:"message"`
}

func HealthHandler(writer http.ResponseWriter, _ *http.Request) {
	writer.Header().Set("Content-Type", "application/json")

	response := healthResponse{
		Message: "OK",
	}

	err := json.NewEncoder(writer).Encode(response)
	if err != nil {
		log.Fatalf("Encoding response blew up: %v", err)
	}
}
