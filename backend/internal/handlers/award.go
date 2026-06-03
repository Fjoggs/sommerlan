package handlers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	"backend/internal/database"
)

type AwardHandlers struct {
	db *sql.DB
}

func NewAwardHandlers(db *sql.DB) *AwardHandlers {
	return &AwardHandlers{db: db}
}

func (h *AwardHandlers) GetAwards(w http.ResponseWriter, r *http.Request) {
	if err := requireAuth(h.db, r); err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}
	w.Header().Set("Content-Type", "application/json")

	awards, err := database.GetAwards(h.db)
	if err != nil {
		http.Error(w, "failed to get awards", http.StatusInternalServerError)
		return
	}

	if err := json.NewEncoder(w).Encode(awards); err != nil {
		log.Printf("encode GetAwards: %v", err)
	}
}

func (h *AwardHandlers) AddAward(w http.ResponseWriter, r *http.Request) {
	if err := requireAdmin(h.db, r); err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}
	w.Header().Set("Content-Type", "application/json")

	if err := r.ParseMultipartForm(0); err != nil {
		http.Error(w, "invalid form", http.StatusBadRequest)
		return
	}

	name := r.FormValue("awardName")
	if len(name) == 0 {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	id, err := database.AddAward(h.db, name)
	if err != nil {
		http.Error(w, "failed to add award", http.StatusInternalServerError)
		return
	}

	res := database.AwardResponse{Id: int(id), Name: name}
	if err := json.NewEncoder(w).Encode(res); err != nil {
		log.Printf("encode AddAward: %v", err)
	}
}

func (h *AwardHandlers) DeleteAwardWithId(w http.ResponseWriter, r *http.Request) {
	if err := requireAdmin(h.db, r); err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}

	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	if _, err := database.GetAwardWithId(h.db, id); err != nil {
		http.Error(w, "award not found", http.StatusNotFound)
		return
	}

	if _, err := h.db.Exec("DELETE FROM award WHERE id = ?", id); err != nil {
		http.Error(w, "failed to delete award", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
