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

type GameHandlers struct {
	db *sql.DB
}

func NewGameHandlers(db *sql.DB) *GameHandlers {
	return &GameHandlers{
		db: db,
	}
}

func (h *GameHandlers) GetGames(writer http.ResponseWriter, _ *http.Request) {
	writer.Header().Set("Content-Type", "application/json")

	lans, err := database.GetGames(h.db)
	if err != nil {
		fmt.Println("No games found in db", err)
		return
	}

	err = json.NewEncoder(writer).Encode(lans)
	if err != nil {
		log.Fatalf("Encoding response blew up: %v", err)
	}
}

func (a *GameHandlers) AddGame(writer http.ResponseWriter, req *http.Request) {
	writer.Header().Set("Content-Type", "application/json")

	err := req.ParseMultipartForm(0)
	if err != nil {
		fmt.Println("Parsing game form failed", err)
	}

	gameName := req.FormValue("gameName")
	gameId, err := database.AddGame(a.db, gameName)
	if err != nil {
		fmt.Println("Failed to add game", err)
		return
	}

	res := database.GameResponse{
		Id:   int(gameId),
		Name: gameName,
	}

	err = json.NewEncoder(writer).Encode(res)
	if err != nil {
		log.Fatalf("Encoding response blew up: %v", err)
	}
}

func (h *GameHandlers) DeleteGameWithId(writer http.ResponseWriter, req *http.Request) {
	writer.Header().Set("Content-Type", "application/json")

	idPath := req.PathValue("id")

	id, err := strconv.Atoi(idPath)
	if err != nil {
		log.Fatalf("Id to int failed: %v", err)
	}

	rowsDeleted, err := database.DeleteGameWithId(h.db, id)
	if err != nil {
		fmt.Println("No games found in db", err)
		return
	}

	fmt.Println("Deleted rows", rowsDeleted)
	writer.WriteHeader(http.StatusNoContent)
}
