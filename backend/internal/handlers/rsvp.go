package handlers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"regexp"
	"strconv"

	"backend/internal/database"
)

var dateRegex = regexp.MustCompile(`^\d{4}-\d{2}-\d{2}$`)

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
		Dates       []string `json:"dates"`
		DinnerDates []string `json:"dinner_dates"`
	}
	if err := json.NewDecoder(req.Body).Decode(&body); err != nil {
		http.Error(writer, "invalid request body", http.StatusBadRequest)
		return
	}
	if len(body.Dates) == 0 {
		http.Error(writer, "dates are required", http.StatusBadRequest)
		return
	}
	for _, d := range body.Dates {
		if !dateRegex.MatchString(d) {
			http.Error(writer, "invalid date format: "+d, http.StatusBadRequest)
			return
		}
	}

	if err := database.AddRsvpDates(h.db, user.Id, lanId, body.Dates, body.DinnerDates); err != nil {
		log.Printf("AddRsvp user=%d lan=%d: %v", user.Id, lanId, err)
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
		log.Printf("DeleteRsvp user=%d lan=%d: %v", user.Id, lanId, err)
		http.Error(writer, "failed to delete rsvp", http.StatusInternalServerError)
		return
	}
	writer.WriteHeader(http.StatusNoContent)
}

func (h *RsvpHandlers) GetRsvps(writer http.ResponseWriter, req *http.Request) {
	if err := requireAuth(h.db, req); err != nil {
		http.Error(writer, err.Error(), http.StatusUnauthorized)
		return
	}
	lanId, err := strconv.Atoi(req.PathValue("id"))
	if err != nil {
		http.Error(writer, "invalid lan id", http.StatusBadRequest)
		return
	}
	writer.Header().Set("Content-Type", "application/json")

	entries, err := database.GetRsvps(h.db, lanId)
	if err != nil {
		log.Printf("GetRsvps lan=%d: %v", lanId, err)
		http.Error(writer, "failed to fetch rsvps", http.StatusInternalServerError)
		return
	}

	if err := json.NewEncoder(writer).Encode(entries); err != nil {
		log.Printf("encode GetRsvps: %v", err)
	}
}
