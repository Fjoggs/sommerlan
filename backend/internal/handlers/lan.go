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
	lanId  int64
	gameId int
}

type addParticipantBody struct {
	lanId  int64
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

	lanGames := []database.GameResponse{}
	for _, lanGameId := range req.Form["games"] {
		gameId, err := strconv.Atoi(lanGameId)
		if err != nil {
			// Handle error - invalid ID format
			fmt.Println("Invalid participant ID:", lanGameId)
			continue
		}

		_, err = database.AddLanGame(h.db, lanId, gameId)
		if err != nil {
			fmt.Println("Failed to add lan game", err)
			return
		}

		game, err := database.GetGameWithId(h.db, gameId)
		if err != nil {
			fmt.Println("Failed to get lan game", err)
			return
		}

		lanGame := database.GameResponse{
			Id:   game.Id,
			Name: game.Name,
		}
		lanGames = append(lanGames, lanGame)
	}

	participants := []database.UserResponse{}
	for _, participantId := range req.Form["participants"] {
		userId, err := strconv.Atoi(participantId)
		if err != nil {
			// Handle error - invalid ID format
			fmt.Println("Invalid participant ID:", participantId)
			continue
		}

		_, err = database.AddLanParticipant(h.db, lanId, userId)
		if err != nil {
			fmt.Println("Failed to add lan user", err)
			return
		}

		user, err := database.GetUserWithId(h.db, userId)
		if err != nil {
			fmt.Println("Failed to get lan user", err)
			return
		}

		participant := database.UserResponse{
			Id:   user.Id,
			Name: user.Name,
		}
		participants = append(participants, participant)
	}

	res := database.LanEvent{
		Description:  description,
		End_date:     endDate,
		Event:        event,
		Games:        lanGames,
		Id:           int(lanId),
		Participants: participants,
		Start_date:   startDate,
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
