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

type AwardHandlers struct {
	db *sql.DB
}

func NewAwardHandlers(db *sql.DB) *AwardHandlers {
	return &AwardHandlers{db: db}
}

func (h *AwardHandlers) GetAwards(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	awards, err := database.GetAwards(h.db)
	if err != nil {
		fmt.Println("No awards found in db", err)
		return
	}

	if err := json.NewEncoder(w).Encode(awards); err != nil {
		log.Fatalf("Encoding response blew up: %v", err)
	}
}

func (h *AwardHandlers) AddAward(w http.ResponseWriter, r *http.Request) {
	if err := requireAdmin(h.db, r); err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}
	w.Header().Set("Content-Type", "application/json")

	if err := r.ParseMultipartForm(0); err != nil {
		fmt.Println("Parsing award form failed", err)
	}

	name := r.FormValue("awardName")
	if len(name) == 0 {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	id, err := database.AddAward(h.db, name)
	if err != nil {
		fmt.Println("Failed to add award", err)
		return
	}

	res := database.AwardResponse{Id: int(id), Name: name}
	if err := json.NewEncoder(w).Encode(res); err != nil {
		log.Fatalf("Encoding response blew up: %v", err)
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
