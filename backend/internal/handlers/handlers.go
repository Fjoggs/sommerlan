package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"

	"backend/internal/database"
)

type HealthResponse struct {
	Message string `json:"message"`
}

type Handlers struct {
	db *sql.DB
}

func NewHandlers(db *sql.DB) *Handlers {
	return &Handlers{
		db: db,
	}
}

func (h *Handlers) HealthHandler(writer http.ResponseWriter, _ *http.Request) {
	writer.Header().Set("Content-Type", "application/json")

	response := HealthResponse{
		Message: "OK",
	}

	err := json.NewEncoder(writer).Encode(response)
	if err != nil {
		log.Fatalf("Encoding response blew up: %v", err)
	}
}

func (h *Handlers) LanHandlerById(writer http.ResponseWriter, req *http.Request) {
	writer.Header().Set("Content-Type", "application/json")

	idPath := req.PathValue("id")

	id, err := strconv.Atoi(idPath)
	if err != nil {
		log.Fatalf("Id to int failed: %v", err)
	}

	lan, err := database.GetLanById(h.db, id)
	fmt.Println("lan now", lan)
	if err != nil {
		fmt.Printf("No lan with %v found in db", id)
		return
	}

	fmt.Println(lan)

	err = json.NewEncoder(writer).Encode(lan)
	if err != nil {
		log.Fatalf("Encoding response blew up: %v", err)
	}
}

func (h *Handlers) LanHandler(writer http.ResponseWriter, _ *http.Request) {
	writer.Header().Set("Content-Type", "application/json")

	lans, err := database.GetLans(h.db)
	if err != nil {
		fmt.Println("No lans found in db")
		return
	}

	fmt.Println(lans)

	err = json.NewEncoder(writer).Encode(lans)
	if err != nil {
		log.Fatalf("Encoding response blew up: %v", err)
	}
}

func EnableCORS(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		// Handle preflight requests
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next(w, r)
	}
}
