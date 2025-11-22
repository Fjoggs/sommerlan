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

type AddGameBody struct {
	Name string
}

type AddLanGame struct {
	lanId  int
	gameId int
}

type AddParticipantBody struct {
	lanId  int
	userId int
}

type AdminHandlers struct {
	db *sql.DB
}

func NewAdminHandlers(db *sql.DB) *AdminHandlers {
	return &AdminHandlers{
		db: db,
	}
}

func (h *AdminHandlers) GetGames(writer http.ResponseWriter, _ *http.Request) {
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

type AddGameResponse struct {
	Id   int    `json:"id"`
	Name string `json:"name"`
}

func (a *AdminHandlers) AddGame(writer http.ResponseWriter, req *http.Request) {
	writer.Header().Set("Content-Type", "application/json")

	err := req.ParseMultipartForm(0)
	if err != nil {
		fmt.Println("Parsing game form failed", err)
	}

	gameName := req.FormValue("gameName")
	game := AddGameBody{
		Name: gameName,
	}

	fmt.Println("Adding game")
	gameId, err := database.AddGame(a.db, game.Name)
	if err != nil {
		fmt.Println("Failed to add game", err)
		return
	}

	res := AddGameResponse{
		Id:   int(gameId),
		Name: gameName,
	}

	err = json.NewEncoder(writer).Encode(res)
	if err != nil {
		log.Fatalf("Encoding response blew up: %v", err)
	}
}

func (h *AdminHandlers) DeleteGameWithId(writer http.ResponseWriter, req *http.Request) {
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

func (a *AdminHandlers) AddLanGame(writer http.ResponseWriter, req *http.Request) {
	writer.Header().Set("Content-Type", "application/json")

	var lanGame AddLanGame

	err := json.NewDecoder(req.Body).Decode(&lanGame)
	if err != nil {
		fmt.Println("error", err)
		http.Error(writer, err.Error(), http.StatusBadRequest)
		return
	}

	Admins, err := database.AddLanGame(a.db, lanGame.lanId, lanGame.gameId)
	if err != nil {
		fmt.Println("Blew up:", err)
		return
	}

	err = json.NewEncoder(writer).Encode(Admins)
	if err != nil {
		log.Fatalf("Encoding response blew up: %v", err)
	}
}

func (a *AdminHandlers) AddParticipant(writer http.ResponseWriter, req *http.Request) {
	writer.Header().Set("Content-Type", "application/json")

	var lanParticipant AddParticipantBody

	err := json.NewDecoder(req.Body).Decode(&lanParticipant)
	if err != nil {
		fmt.Println("error", err)
		http.Error(writer, err.Error(), http.StatusBadRequest)
		return
	}

	Admins, err := database.AddLanParticipant(a.db, lanParticipant.lanId, lanParticipant.userId)
	if err != nil {
		fmt.Println("Blew up:", err)
		return
	}

	err = json.NewEncoder(writer).Encode(Admins)
	if err != nil {
		log.Fatalf("Encoding response blew up: %v", err)
	}
}
