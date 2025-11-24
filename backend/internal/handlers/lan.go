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

type addLanGame struct {
	lanId  int
	gameId int
}

type addParticipantBody struct {
	lanId  int
	userId int
}

type LanHandlers struct {
	db *sql.DB
}

func NewLanHandlers(db *sql.DB) *LanHandlers {
	return &LanHandlers{
		db: db,
	}
}

func (h *LanHandlers) GetLanById(writer http.ResponseWriter, req *http.Request) {
	writer.Header().Set("Content-Type", "application/json")

	idPath := req.PathValue("id")

	id, err := strconv.Atoi(idPath)
	if err != nil {
		log.Fatalf("Id to int failed: %v", err)
	}

	lan, err := database.GetLanById(h.db, id)
	fmt.Println("lan now", lan)
	if err != nil {
		fmt.Printf("No lan with %v found in db", id)
		return
	}

	err = json.NewEncoder(writer).Encode(lan)
	if err != nil {
		log.Fatalf("Encoding response blew up: %v", err)
	}
}

func (h *LanHandlers) GetLan(writer http.ResponseWriter, _ *http.Request) {
	writer.Header().Set("Content-Type", "application/json")

	lans, err := database.GetLans(h.db)
	if err != nil {
		fmt.Println("No lans found in db")
		return
	}

	err = json.NewEncoder(writer).Encode(lans)
	if err != nil {
		log.Fatalf("Encoding response blew up: %v", err)
	}
}

func (h *LanHandlers) AddLan(writer http.ResponseWriter, req *http.Request) {
	writer.Header().Set("Content-Type", "application/json")

	err := req.ParseMultipartForm(0)
	if err != nil {
		fmt.Println("Parsing lan form failed", err)
	}

	startDate := req.FormValue("startDate")
	endDate := req.FormValue("endDate")
	event := req.FormValue("event")
	description := req.FormValue("description")

	lanId, err := database.AddLan(h.db, description, endDate, event, startDate)
	if err != nil {
		fmt.Println("Failed to add lan", err)
		return
	}

	res := database.LanResponse{
		Id:          int(lanId),
		Start_date:  startDate,
		End_date:    endDate,
		Event:       event,
		Description: description,
	}

	fmt.Println("Added LAN to db", res)
	err = json.NewEncoder(writer).Encode(res)
	if err != nil {
		log.Fatalf("Encoding response blew up: %v", err)
	}
}

func (h *LanHandlers) DeleteLanWithId(writer http.ResponseWriter, req *http.Request) {
	writer.Header().Set("Content-Type", "application/json")

	idPath := req.PathValue("id")

	id, err := strconv.Atoi(idPath)
	if err != nil {
		log.Fatalf("Id to int failed: %v", err)
	}

	rowsDeleted, err := database.DeleteLanWithId(h.db, id)
	if err != nil {
		fmt.Println("No lan found in db", err)
		return
	}

	fmt.Println("Deleted rows", rowsDeleted)
	writer.WriteHeader(http.StatusNoContent)
}

func (a *LanHandlers) AddLanGame(writer http.ResponseWriter, req *http.Request) {
	writer.Header().Set("Content-Type", "application/json")

	var lanGame addLanGame

	err := json.NewDecoder(req.Body).Decode(&lanGame)
	if err != nil {
		fmt.Println("error", err)
		http.Error(writer, err.Error(), http.StatusBadRequest)
		return
	}

	rows, err := database.AddLanGame(a.db, lanGame.lanId, lanGame.gameId)
	if err != nil {
		fmt.Println("Blew up:", err)
		return
	}

	err = json.NewEncoder(writer).Encode(rows)
	if err != nil {
		log.Fatalf("Encoding response blew up: %v", err)
	}
}

func (a *LanHandlers) AddParticipant(writer http.ResponseWriter, req *http.Request) {
	writer.Header().Set("Content-Type", "application/json")

	var lanParticipant addParticipantBody

	err := json.NewDecoder(req.Body).Decode(&lanParticipant)
	if err != nil {
		fmt.Println("error", err)
		http.Error(writer, err.Error(), http.StatusBadRequest)
		return
	}

	rows, err := database.AddLanParticipant(a.db, lanParticipant.lanId, lanParticipant.userId)
	if err != nil {
		fmt.Println("Blew up:", err)
		return
	}

	err = json.NewEncoder(writer).Encode(rows)
	if err != nil {
		log.Fatalf("Encoding response blew up: %v", err)
	}
}
