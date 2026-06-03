package handlers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	"backend/internal/database"
)

type GameHandlers struct {
	db *sql.DB
}

func NewGameHandlers(db *sql.DB) *GameHandlers {
	return &GameHandlers{
		db: db,
	}
}

func (h *GameHandlers) GetGameStats(writer http.ResponseWriter, req *http.Request) {
	if err := requireAuth(h.db, req); err != nil {
		http.Error(writer, err.Error(), http.StatusUnauthorized)
		return
	}
	writer.Header().Set("Content-Type", "application/json")
	stats, err := database.GetGameStats(h.db)
	if err != nil {
		http.Error(writer, "failed to get game stats", http.StatusInternalServerError)
		return
	}
	if err := json.NewEncoder(writer).Encode(stats); err != nil {
		log.Printf("encode GetGameStats: %v", err)
	}
}

func (h *GameHandlers) GetGames(writer http.ResponseWriter, req *http.Request) {
	if err := requireAuth(h.db, req); err != nil {
		http.Error(writer, err.Error(), http.StatusUnauthorized)
		return
	}
	writer.Header().Set("Content-Type", "application/json")

	games, err := database.GetGames(h.db)
	if err != nil {
		http.Error(writer, "failed to get games", http.StatusInternalServerError)
		return
	}

	if err := json.NewEncoder(writer).Encode(games); err != nil {
		log.Printf("encode GetGames: %v", err)
	}
}

func (a *GameHandlers) AddGame(writer http.ResponseWriter, req *http.Request) {
	if err := requireAdmin(a.db, req); err != nil {
		http.Error(writer, err.Error(), http.StatusForbidden)
		return
	}
	writer.Header().Set("Content-Type", "application/json")

	if err := req.ParseMultipartForm(0); err != nil {
		http.Error(writer, "invalid form", http.StatusBadRequest)
		return
	}

	gameName := req.FormValue("gameName")
	if len(gameName) == 0 {
		writer.WriteHeader(http.StatusBadRequest)
		return
	}

	gameId, err := database.AddGame(a.db, gameName)
	if err != nil {
		http.Error(writer, "failed to add game", http.StatusInternalServerError)
		return
	}

	res := database.GameResponse{
		Id:   int(gameId),
		Name: gameName,
	}

	if err := json.NewEncoder(writer).Encode(res); err != nil {
		log.Printf("encode AddGame: %v", err)
	}
}

func (a *GameHandlers) AlterGame(writer http.ResponseWriter, req *http.Request) {
	if err := requireAdmin(a.db, req); err != nil {
		http.Error(writer, err.Error(), http.StatusForbidden)
		return
	}
	writer.Header().Set("Content-Type", "application/json")

	if err := req.ParseMultipartForm(0); err != nil {
		http.Error(writer, "invalid form", http.StatusBadRequest)
		return
	}

	id, err := strconv.Atoi(req.FormValue("gameId"))
	if err != nil {
		http.Error(writer, "invalid game id", http.StatusBadRequest)
		return
	}
	gameName := req.FormValue("gameName")
	if err := database.AlterGame(a.db, id, gameName); err != nil {
		http.Error(writer, "failed to update game", http.StatusInternalServerError)
		return
	}

	res := database.GameResponse{
		Id:   id,
		Name: gameName,
	}

	if err := json.NewEncoder(writer).Encode(res); err != nil {
		log.Printf("encode AlterGame: %v", err)
	}
}

func (h *GameHandlers) GetGameById(writer http.ResponseWriter, req *http.Request) {
	if err := requireAuth(h.db, req); err != nil {
		http.Error(writer, err.Error(), http.StatusUnauthorized)
		return
	}
	writer.Header().Set("Content-Type", "application/json")

	id, err := strconv.Atoi(req.PathValue("id"))
	if err != nil {
		http.Error(writer, "invalid id", http.StatusBadRequest)
		return
	}

	profile, err := database.GetGameProfile(h.db, id)
	if err != nil {
		http.Error(writer, "game not found", http.StatusNotFound)
		return
	}

	if err := json.NewEncoder(writer).Encode(profile); err != nil {
		log.Printf("encode GetGameById: %v", err)
	}
}

func (h *GameHandlers) DeleteGameWithId(writer http.ResponseWriter, req *http.Request) {
	if err := requireAdmin(h.db, req); err != nil {
		http.Error(writer, err.Error(), http.StatusForbidden)
		return
	}

	id, err := strconv.Atoi(req.PathValue("id"))
	if err != nil {
		http.Error(writer, "invalid id", http.StatusBadRequest)
		return
	}

	if _, err := database.DeleteGameWithId(h.db, id); err != nil {
		http.Error(writer, "failed to delete game", http.StatusInternalServerError)
		return
	}

	writer.WriteHeader(http.StatusNoContent)
}
