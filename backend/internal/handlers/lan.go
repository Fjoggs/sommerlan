package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"time"

	"backend/internal/database"
	"github.com/rwcarlsen/goexif/exif"
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
	if err := requireAdmin(h.db, req); err != nil {
		http.Error(writer, err.Error(), http.StatusForbidden)
		return
	}
	writer.Header().Set("Content-Type", "application/json")

	err := req.ParseMultipartForm(0)
	if err != nil {
		fmt.Println("Parsing lan form failed", err)
	}

	startDate := req.FormValue("startDate")
	endDate := req.FormValue("endDate")
	event := req.FormValue("event")
	description := req.FormValue("description")
	fromDisplay := req.FormValue("fromDisplay")
	toDisplay := req.FormValue("toDisplay")

	lanId, err := database.AddLan(h.db, description, endDate, event, startDate, fromDisplay, toDisplay)
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
			Id:    user.Id,
			Name:  user.Name,
			Color: user.Color,
		}
		participants = append(participants, participant)
	}

	lanAwards := []database.AwardResponse{}
	for _, lanAwardId := range req.Form["awards"] {
		awardId, err := strconv.Atoi(lanAwardId)
		if err != nil {
			fmt.Println("Invalid award ID:", lanAwardId)
			continue
		}
		if _, err = database.AddLanAward(h.db, lanId, awardId); err != nil {
			fmt.Println("Failed to add lan award", err)
			return
		}
		award, err := database.GetAwardWithId(h.db, awardId)
		if err != nil {
			fmt.Println("Failed to get lan award", err)
			return
		}
		lanAwards = append(lanAwards, database.AwardResponse{Id: award.Id, Name: award.Name})
	}

	res := database.LanEvent{
		Awards:       lanAwards,
		Description:  description,
		End_date:     endDate,
		Event:        event,
		FromDisplay:  fromDisplay,
		Games:        lanGames,
		Id:           int(lanId),
		Participants: participants,
		Start_date:   startDate,
		ToDisplay:    toDisplay,
	}

	fmt.Println("Added LAN to db", res)
	err = json.NewEncoder(writer).Encode(res)
	if err != nil {
		log.Fatalf("Encoding response blew up: %v", err)
	}
}

func (h *LanHandlers) AlterLan(writer http.ResponseWriter, req *http.Request) {
	if err := requireAdmin(h.db, req); err != nil {
		http.Error(writer, err.Error(), http.StatusForbidden)
		return
	}
	writer.Header().Set("Content-Type", "application/json")

	err := req.ParseMultipartForm(0)
	if err != nil {
		fmt.Println("Parsing user form failed", err)
	}

	lanId := req.FormValue("lanId")
	id, err := strconv.Atoi(lanId)
	if err != nil {
		// Handle error - invalid ID format
		fmt.Println("Invalid lan ID:", lanId)
		return
	}

	description := req.FormValue("description")
	endDate := req.FormValue("endDate")
	event := req.FormValue("event")
	startDate := req.FormValue("startDate")
	fromDisplay := req.FormValue("fromDisplay")
	toDisplay := req.FormValue("toDisplay")
	err = database.AlterLan(h.db, id, description, endDate, event, startDate, fromDisplay, toDisplay)
	if err != nil {
		fmt.Println("Failed to add user", err)
		return
	}

	if err := database.RemoveLanGames(h.db, id); err != nil {
		fmt.Println("Failed to clear lan games", err)
		return
	}

	lanGames := []database.GameResponse{}
	for _, lanGameId := range req.Form["games"] {
		gameId, err := strconv.Atoi(lanGameId)
		if err != nil {
			fmt.Println("Invalid game ID:", lanGameId)
			continue
		}

		_, err = database.AddLanGame(h.db, int64(id), gameId)
		if err != nil {
			fmt.Println("Failed to add lan game", err)
			return
		}

		game, err := database.GetGameWithId(h.db, gameId)
		if err != nil {
			fmt.Println("Failed to get lan game", err)
			return
		}

		lanGames = append(lanGames, database.GameResponse{Id: game.Id, Name: game.Name})
	}

	if err := database.RemoveLanParticipants(h.db, id); err != nil {
		fmt.Println("Failed to clear lan participants", err)
		return
	}

	participants := []database.UserResponse{}
	for _, participantId := range req.Form["participants"] {
		userId, err := strconv.Atoi(participantId)
		if err != nil {
			fmt.Println("Invalid participant ID:", participantId)
			continue
		}

		_, err = database.AddLanParticipant(h.db, int64(id), userId)
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
			Id:    user.Id,
			Name:  user.Name,
			Color: user.Color,
		}
		participants = append(participants, participant)
	}

	if err := database.RemoveLanAwards(h.db, id); err != nil {
		fmt.Println("Failed to clear lan awards", err)
		return
	}

	lanAwards := []database.AwardResponse{}
	for _, lanAwardId := range req.Form["awards"] {
		awardId, err := strconv.Atoi(lanAwardId)
		if err != nil {
			fmt.Println("Invalid award ID:", lanAwardId)
			continue
		}
		if _, err = database.AddLanAward(h.db, int64(id), awardId); err != nil {
			fmt.Println("Failed to add lan award", err)
			return
		}
		award, err := database.GetAwardWithId(h.db, awardId)
		if err != nil {
			fmt.Println("Failed to get lan award", err)
			return
		}
		lanAwards = append(lanAwards, database.AwardResponse{Id: award.Id, Name: award.Name})
	}

	res := database.LanEvent{
		Awards:       lanAwards,
		Description:  description,
		End_date:     endDate,
		Event:        event,
		FromDisplay:  fromDisplay,
		Games:        lanGames,
		Id:           id,
		Participants: participants,
		Start_date:   startDate,
		ToDisplay:    toDisplay,
	}

	err = json.NewEncoder(writer).Encode(res)
	if err != nil {
		log.Fatalf("Encoding response blew up: %v", err)
	}
}

func (h *LanHandlers) DeleteLanWithId(writer http.ResponseWriter, req *http.Request) {
	if err := requireAdmin(h.db, req); err != nil {
		http.Error(writer, err.Error(), http.StatusForbidden)
		return
	}
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

func (h *LanHandlers) AttendLan(writer http.ResponseWriter, req *http.Request) {
	user, err := GetUserFromRequest(h.db, req)
	if err != nil {
		http.Error(writer, "unauthorized", http.StatusUnauthorized)
		return
	}
	lanId, err := strconv.Atoi(req.PathValue("id"))
	if err != nil {
		http.Error(writer, "invalid lan id", http.StatusBadRequest)
		return
	}
	if _, err = database.AddLanParticipant(h.db, int64(lanId), user.Id); err != nil {
		http.Error(writer, "failed to add participant", http.StatusInternalServerError)
		return
	}
	writer.WriteHeader(http.StatusNoContent)
}

func (h *LanHandlers) UnattendLan(writer http.ResponseWriter, req *http.Request) {
	user, err := GetUserFromRequest(h.db, req)
	if err != nil {
		http.Error(writer, "unauthorized", http.StatusUnauthorized)
		return
	}
	lanId, err := strconv.Atoi(req.PathValue("id"))
	if err != nil {
		http.Error(writer, "invalid lan id", http.StatusBadRequest)
		return
	}
	if err = database.RemoveLanParticipant(h.db, int64(lanId), user.Id); err != nil {
		http.Error(writer, "failed to remove participant", http.StatusInternalServerError)
		return
	}
	writer.WriteHeader(http.StatusNoContent)
}

func (h *LanHandlers) GetLanImages(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	lanId, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid lan id", http.StatusBadRequest)
		return
	}
	images, err := database.GetLanImages(h.db, lanId)
	if err != nil {
		http.Error(w, "failed to get images", http.StatusInternalServerError)
		return
	}
	if images == nil {
		images = []database.LanImage{}
	}
	json.NewEncoder(w).Encode(images)
}

func (h *LanHandlers) UploadLanImage(w http.ResponseWriter, r *http.Request) {
	user, err := GetUserFromRequest(h.db, r)
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	lanId, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid lan id", http.StatusBadRequest)
		return
	}
	if err := r.ParseMultipartForm(20 << 20); err != nil {
		http.Error(w, "failed to parse form", http.StatusBadRequest)
		return
	}
	file, header, err := r.FormFile("image")
	if err != nil {
		http.Error(w, "no image provided", http.StatusBadRequest)
		return
	}
	defer file.Close()

	allowed := map[string]bool{
		"image/jpeg": true,
		"image/png":  true,
		"image/gif":  true,
		"image/webp": true,
	}
	contentType := header.Header.Get("Content-Type")
	if !allowed[contentType] {
		http.Error(w, "unsupported image type", http.StatusBadRequest)
		return
	}

	ext := filepath.Ext(header.Filename)
	if ext == "" {
		ext = ".jpg"
	}
	filename := fmt.Sprintf("%d%s", time.Now().UnixNano(), ext)

	uploadDir := fmt.Sprintf("../frontend/uploads/lan/%d", lanId)
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		http.Error(w, "failed to create upload directory", http.StatusInternalServerError)
		return
	}
	dst, err := os.Create(filepath.Join(uploadDir, filename))
	if err != nil {
		http.Error(w, "failed to save image", http.StatusInternalServerError)
		return
	}
	defer dst.Close()
	if _, err := io.Copy(dst, file); err != nil {
		http.Error(w, "failed to write image", http.StatusInternalServerError)
		return
	}

	var exifDate *string
	fullPath := filepath.Join(uploadDir, filename)
	if f, err := os.Open(fullPath); err == nil {
		if x, err := exif.Decode(f); err == nil {
			if t, err := x.DateTime(); err == nil {
				s := t.Format("2006:01:02 15:04:05")
				exifDate = &s
			}
		}
		f.Close()
	}

	thumbDir := filepath.Join(uploadDir, "thumbs")
	if err := os.MkdirAll(thumbDir, 0755); err == nil {
		exec.Command("magick", fullPath, "-thumbnail", "600x600>", "-auto-orient", filepath.Join(thumbDir, filename)).Run()
	}

	img, err := database.AddLanImage(h.db, lanId, filename, user.Id, exifDate)
	if err != nil {
		http.Error(w, "failed to save image record", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(img)
}

func (h *LanHandlers) DeleteLanImage(w http.ResponseWriter, r *http.Request) {
	if err := requireAdmin(h.db, r); err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}
	lanId, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid lan id", http.StatusBadRequest)
		return
	}
	imageId, err := strconv.Atoi(r.PathValue("imageId"))
	if err != nil {
		http.Error(w, "invalid image id", http.StatusBadRequest)
		return
	}
	dbLanId, filename, err := database.GetLanImageFilename(h.db, imageId)
	if err != nil || dbLanId != lanId {
		http.Error(w, "image not found", http.StatusNotFound)
		return
	}
	if err := database.DeleteLanImageById(h.db, imageId); err != nil {
		http.Error(w, "failed to delete image", http.StatusInternalServerError)
		return
	}
	_ = os.Remove(fmt.Sprintf("../frontend/uploads/lan/%d/%s", lanId, filename))
	w.WriteHeader(http.StatusNoContent)
}

func (h *LanHandlers) GetTags(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	tags, err := database.GetAllTags(h.db)
	if err != nil {
		http.Error(w, "failed to get tags", http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(tags)
}

func (h *LanHandlers) AddImageTag(w http.ResponseWriter, r *http.Request) {
	if err := requireAdmin(h.db, r); err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}
	imageId, err := strconv.Atoi(r.PathValue("imageId"))
	if err != nil {
		http.Error(w, "invalid image id", http.StatusBadRequest)
		return
	}
	var body struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Name == "" {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	tag, err := database.AddImageTag(h.db, imageId, body.Name)
	if err != nil {
		http.Error(w, "failed to add tag", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tag)
}

func (h *LanHandlers) RemoveImageTag(w http.ResponseWriter, r *http.Request) {
	if err := requireAdmin(h.db, r); err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}
	imageId, err := strconv.Atoi(r.PathValue("imageId"))
	if err != nil {
		http.Error(w, "invalid image id", http.StatusBadRequest)
		return
	}
	tagId, err := strconv.Atoi(r.PathValue("tagId"))
	if err != nil {
		http.Error(w, "invalid tag id", http.StatusBadRequest)
		return
	}
	if err := database.RemoveImageTag(h.db, imageId, tagId); err != nil {
		http.Error(w, "failed to remove tag", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *LanHandlers) ReorderLanImages(w http.ResponseWriter, r *http.Request) {
	if err := requireAdmin(h.db, r); err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}
	lanId, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid lan id", http.StatusBadRequest)
		return
	}
	var body struct {
		Ids []int `json:"ids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || len(body.Ids) == 0 {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	if err := database.ReorderLanImages(h.db, lanId, body.Ids); err != nil {
		http.Error(w, "failed to reorder images", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *LanHandlers) AddParticipantToLan(writer http.ResponseWriter, req *http.Request) {
	if err := requireAdmin(h.db, req); err != nil {
		http.Error(writer, err.Error(), http.StatusForbidden)
		return
	}
	idPath := req.PathValue("id")
	lanId, err := strconv.Atoi(idPath)
	if err != nil {
		http.Error(writer, "invalid lan id", http.StatusBadRequest)
		return
	}

	var body struct {
		UserId int `json:"userId"`
	}
	if err := json.NewDecoder(req.Body).Decode(&body); err != nil {
		http.Error(writer, "invalid request body", http.StatusBadRequest)
		return
	}
	if body.UserId == 0 {
		http.Error(writer, "userId is required", http.StatusBadRequest)
		return
	}

	_, err = database.AddLanParticipant(h.db, int64(lanId), body.UserId)
	if err != nil {
		fmt.Println("AddParticipantToLan failed:", err)
		http.Error(writer, "failed to add participant", http.StatusInternalServerError)
		return
	}

	writer.WriteHeader(http.StatusNoContent)
}
