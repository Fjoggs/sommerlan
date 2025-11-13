package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"

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

	fmt.Println("Parsing form")
	err := req.ParseForm()
	if err != nil {
		fmt.Println("Parseform no likey", err)
	}

	fmt.Println("Looping PostForm")
	for key, value := range req.PostForm {
		fmt.Printf("%s = %s\n", key, value)
	}

	fmt.Println("Looping Form")
	for key, value := range req.Form {
		fmt.Printf("%s = %s\n", key, value)
	}

	fmt.Println("Decoder")
	err = json.NewDecoder(req.Body).Decode(&game)
	if err != nil {
		fmt.Println("error", err)
		http.Error(writer, err.Error(), http.StatusBadRequest)
		return
	}

	fmt.Println("Adding game")
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
