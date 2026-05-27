package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
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

func (h *RsvpHandlers) AddRsvp(writer http.ResponseWriter, req *http.Request) {
	lanId, err := strconv.Atoi(req.PathValue("id"))
	if err != nil {
		http.Error(writer, "invalid lan id", http.StatusBadRequest)
		return
	}
	user, err := GetUserFromRequest(h.db, req)
	if err != nil {
		http.Error(writer, "unauthorized", http.StatusUnauthorized)
		return
	}

	var body struct {
		Dates []string `json:"dates"`
	}
	if err := json.NewDecoder(req.Body).Decode(&body); err != nil {
		http.Error(writer, "invalid request body", http.StatusBadRequest)
		return
	}
	if len(body.Dates) == 0 {
		http.Error(writer, "dates are required", http.StatusBadRequest)
		return
	}

	if err := database.AddRsvpDates(h.db, user.Id, lanId, body.Dates); err != nil {
		fmt.Println("AddRsvp failed:", err)
		http.Error(writer, "failed to save rsvp", http.StatusInternalServerError)
		return
	}

	writer.WriteHeader(http.StatusNoContent)
}

func (h *RsvpHandlers) DeleteRsvp(writer http.ResponseWriter, req *http.Request) {
	lanId, err := strconv.Atoi(req.PathValue("id"))
	if err != nil {
		http.Error(writer, "invalid lan id", http.StatusBadRequest)
		return
	}
	user, err := GetUserFromRequest(h.db, req)
	if err != nil {
		http.Error(writer, "unauthorized", http.StatusUnauthorized)
		return
	}
	if err := database.DeleteRsvp(h.db, user.Id, lanId); err != nil {
		fmt.Println("DeleteRsvp failed:", err)
		http.Error(writer, "failed to delete rsvp", http.StatusInternalServerError)
		return
	}
	writer.WriteHeader(http.StatusNoContent)
}

func (h *RsvpHandlers) GetRsvps(writer http.ResponseWriter, req *http.Request) {
	lanId, err := strconv.Atoi(req.PathValue("id"))
	if err != nil {
		http.Error(writer, "invalid lan id", http.StatusBadRequest)
		return
	}
	writer.Header().Set("Content-Type", "application/json")

	entries, err := database.GetRsvps(h.db, lanId)
	if err != nil {
		fmt.Println("GetRsvps failed:", err)
		http.Error(writer, "failed to fetch rsvps", http.StatusInternalServerError)
		return
	}

	if err := json.NewEncoder(writer).Encode(entries); err != nil {
		fmt.Println("GetRsvps encode failed:", err)
	}
}
