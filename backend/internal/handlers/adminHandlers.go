package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"

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

func (a *AdminHandlers) AddGameHandler(writer http.ResponseWriter, req *http.Request) {
	writer.Header().Set("Content-Type", "application/json")

	var game AddGameBody
	// Add this to your handler for debugging
	body, _ := io.ReadAll(req.Body)
	fmt.Printf("Raw body: %s\n", string(body))
	req.Body = io.NopCloser(strings.NewReader(string(body))) // Reset body for decoder

	err := json.NewDecoder(req.Body).Decode(&game)
	if err != nil {
		fmt.Println("error", err)
		http.Error(writer, err.Error(), http.StatusBadRequest)
		return
	}

	Admins, err := database.AddGame(a.db, game.Name)
	if err != nil {
		fmt.Println("No Admins found in db")
		return
	}

	err = json.NewEncoder(writer).Encode(Admins)
	if err != nil {
		log.Fatalf("Encoding response blew up: %v", err)
	}
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

func (a *AdminHandlers) AddParticipantHandler(writer http.ResponseWriter, req *http.Request) {
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
