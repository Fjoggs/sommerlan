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

type RsvpHandlers struct {
	db *sql.DB
}

func NewRsvpHandlers(db *sql.DB) *RsvpHandlers {
	return &RsvpHandlers{db: db}
}

func (h *RsvpHandlers) SubmitRsvp(writer http.ResponseWriter, req *http.Request) {
	writer.Header().Set("Content-Type", "application/json")

	if err := req.ParseMultipartForm(0); err != nil {
		fmt.Println("Parsing rsvp form failed", err)
		http.Error(writer, "bad request", http.StatusBadRequest)
		return
	}

	lanId, err := strconv.Atoi(req.FormValue("lanId"))
	if err != nil {
		fmt.Println("Invalid lanId", err)
		http.Error(writer, "invalid lanId", http.StatusBadRequest)
		return
	}

	userId, err := strconv.Atoi(req.FormValue("userId"))
	if err != nil {
		fmt.Println("Invalid userId", err)
		http.Error(writer, "invalid userId", http.StatusBadRequest)
		return
	}

	dates := req.Form["dates"]

	_, err = database.AddLanParticipant(h.db, int64(lanId), userId)
	if err != nil {
		fmt.Println("Failed to add participant", err)
		http.Error(writer, "failed to add participant", http.StatusInternalServerError)
		return
	}

	if err := database.SetParticipantDates(h.db, lanId, userId, dates); err != nil {
		fmt.Println("Failed to set participant dates", err)
		http.Error(writer, "failed to set dates", http.StatusInternalServerError)
		return
	}

	lan, err := database.GetLanById(h.db, lanId)
	if err != nil {
		fmt.Println("Failed to fetch updated lan", err)
		http.Error(writer, "failed to fetch lan", http.StatusInternalServerError)
		return
	}

	if err := json.NewEncoder(writer).Encode(lan); err != nil {
		log.Fatalf("Encoding response blew up: %v", err)
	}
}
