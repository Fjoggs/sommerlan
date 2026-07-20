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
	"strings"
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
	db           *sql.DB
	frontendPath string
}

func NewLanHandlers(db *sql.DB, frontendPath string) *LanHandlers {
	return &LanHandlers{
		db:           db,
		frontendPath: frontendPath,
	}
}

func (h *LanHandlers) GetLanById(writer http.ResponseWriter, req *http.Request) {
	if err := requireAuth(h.db, req); err != nil {
		http.Error(writer, err.Error(), http.StatusUnauthorized)
		return
	}
	writer.Header().Set("Content-Type", "application/json")

	idPath := req.PathValue("id")

	id, err := strconv.Atoi(idPath)
	if err != nil {
		http.Error(writer, "invalid id", http.StatusBadRequest)
		return
	}

	lan, err := database.GetLanById(h.db, id)
	if err != nil {
		http.Error(writer, "lan not found", http.StatusNotFound)
		return
	}

	if err := json.NewEncoder(writer).Encode(lan); err != nil {
		log.Printf("encode GetLanById: %v", err)
	}
}

func (h *LanHandlers) GetLan(writer http.ResponseWriter, r *http.Request) {
	if err := requireAuth(h.db, r); err != nil {
		http.Error(writer, err.Error(), http.StatusUnauthorized)
		return
	}
	writer.Header().Set("Content-Type", "application/json")

	lans, err := database.GetLans(h.db)
	if err != nil {
		http.Error(writer, "failed to get lans", http.StatusInternalServerError)
		return
	}

	if err := json.NewEncoder(writer).Encode(lans); err != nil {
		log.Printf("encode GetLan: %v", err)
	}
}

func (h *LanHandlers) AddLan(writer http.ResponseWriter, req *http.Request) {
	if err := requireAdmin(h.db, req); err != nil {
		http.Error(writer, err.Error(), http.StatusForbidden)
		return
	}
	writer.Header().Set("Content-Type", "application/json")

	if err := req.ParseMultipartForm(0); err != nil {
		http.Error(writer, "invalid form", http.StatusBadRequest)
		return
	}

	startDate := req.FormValue("startDate")
	endDate := req.FormValue("endDate")
	event := req.FormValue("event")
	description := req.FormValue("description")
	fromDisplay := req.FormValue("fromDisplay")
	toDisplay := req.FormValue("toDisplay")

	lanId, err := database.AddLan(h.db, description, endDate, event, startDate, fromDisplay, toDisplay)
	if err != nil {
		http.Error(writer, "failed to add lan", http.StatusInternalServerError)
		return
	}

	lanGames := []database.GameResponse{}
	for _, lanGameId := range req.Form["games"] {
		gameId, err := strconv.Atoi(lanGameId)
		if err != nil {
			continue
		}
		if _, err = database.AddLanGame(h.db, lanId, gameId); err != nil {
			http.Error(writer, "failed to add lan game", http.StatusInternalServerError)
			return
		}
		game, err := database.GetGameWithId(h.db, gameId)
		if err != nil {
			http.Error(writer, "failed to get lan game", http.StatusInternalServerError)
			return
		}
		lanGames = append(lanGames, database.GameResponse{Id: game.Id, Name: game.Name})
	}

	participants := []database.UserResponse{}
	for _, participantId := range req.Form["participants"] {
		userId, err := strconv.Atoi(participantId)
		if err != nil {
			continue
		}
		if _, err = database.AddLanParticipant(h.db, lanId, userId); err != nil {
			http.Error(writer, "failed to add lan participant", http.StatusInternalServerError)
			return
		}
		user, err := database.GetUserWithId(h.db, userId)
		if err != nil {
			http.Error(writer, "failed to get lan participant", http.StatusInternalServerError)
			return
		}
		participants = append(participants, database.UserResponse{Id: user.Id, Name: user.Name, Color: user.Color})
	}

	lanAwards := []database.AwardResponse{}
	for _, lanAwardId := range req.Form["awards"] {
		awardId, err := strconv.Atoi(lanAwardId)
		if err != nil {
			continue
		}
		if _, err = database.AddLanAward(h.db, lanId, awardId); err != nil {
			http.Error(writer, "failed to add lan award", http.StatusInternalServerError)
			return
		}
		award, err := database.GetAwardWithId(h.db, awardId)
		if err != nil {
			http.Error(writer, "failed to get lan award", http.StatusInternalServerError)
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

	if err := json.NewEncoder(writer).Encode(res); err != nil {
		log.Printf("encode AddLan: %v", err)
	}
}

func (h *LanHandlers) AlterLan(writer http.ResponseWriter, req *http.Request) {
	if err := requireAdmin(h.db, req); err != nil {
		http.Error(writer, err.Error(), http.StatusForbidden)
		return
	}
	writer.Header().Set("Content-Type", "application/json")

	if err := req.ParseMultipartForm(0); err != nil {
		http.Error(writer, "invalid form", http.StatusBadRequest)
		return
	}

	id, err := strconv.Atoi(req.FormValue("lanId"))
	if err != nil {
		http.Error(writer, "invalid lan id", http.StatusBadRequest)
		return
	}

	description := req.FormValue("description")
	endDate := req.FormValue("endDate")
	event := req.FormValue("event")
	startDate := req.FormValue("startDate")
	fromDisplay := req.FormValue("fromDisplay")
	toDisplay := req.FormValue("toDisplay")
	invitation := req.FormValue("invitation")
	isRomjulsLAN := req.FormValue("isRomjulsLAN") == "1"
	if err := database.AlterLan(h.db, id, description, endDate, event, startDate, fromDisplay, toDisplay, invitation, isRomjulsLAN); err != nil {
		http.Error(writer, "failed to update lan", http.StatusInternalServerError)
		return
	}

	if err := database.RemoveLanGames(h.db, id); err != nil {
		http.Error(writer, "failed to clear lan games", http.StatusInternalServerError)
		return
	}

	lanGames := []database.GameResponse{}
	for _, lanGameId := range req.Form["games"] {
		gameId, err := strconv.Atoi(lanGameId)
		if err != nil {
			continue
		}
		if _, err = database.AddLanGame(h.db, int64(id), gameId); err != nil {
			http.Error(writer, "failed to add lan game", http.StatusInternalServerError)
			return
		}
		game, err := database.GetGameWithId(h.db, gameId)
		if err != nil {
			http.Error(writer, "failed to get lan game", http.StatusInternalServerError)
			return
		}
		lanGames = append(lanGames, database.GameResponse{Id: game.Id, Name: game.Name})
	}

	var participantIds []int
	for _, participantId := range req.Form["participants"] {
		userId, err := strconv.Atoi(participantId)
		if err != nil {
			continue
		}
		participantIds = append(participantIds, userId)
	}

	if err := database.UpdateLanParticipants(h.db, id, participantIds); err != nil {
		http.Error(writer, "failed to update lan participants", http.StatusInternalServerError)
		return
	}

	participants := []database.UserResponse{}
	for _, userId := range participantIds {
		user, err := database.GetUserWithId(h.db, userId)
		if err != nil {
			http.Error(writer, "failed to get lan participant", http.StatusInternalServerError)
			return
		}
		participants = append(participants, database.UserResponse{Id: user.Id, Name: user.Name, Color: user.Color})
	}

	if err := database.RemoveLanAwards(h.db, id); err != nil {
		http.Error(writer, "failed to clear lan awards", http.StatusInternalServerError)
		return
	}

	lanAwards := []database.AwardResponse{}
	for _, lanAwardId := range req.Form["awards"] {
		awardId, err := strconv.Atoi(lanAwardId)
		if err != nil {
			continue
		}
		if _, err = database.AddLanAward(h.db, int64(id), awardId); err != nil {
			http.Error(writer, "failed to add lan award", http.StatusInternalServerError)
			return
		}
		award, err := database.GetAwardWithId(h.db, awardId)
		if err != nil {
			http.Error(writer, "failed to get lan award", http.StatusInternalServerError)
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
		Invitation:   invitation,
		Participants: participants,
		Start_date:   startDate,
		ToDisplay:    toDisplay,
	}

	if err := json.NewEncoder(writer).Encode(res); err != nil {
		log.Printf("encode AlterLan: %v", err)
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
		http.Error(writer, "invalid id", http.StatusBadRequest)
		return
	}

	if _, err := database.DeleteLanWithId(h.db, id); err != nil {
		http.Error(writer, "failed to delete lan", http.StatusInternalServerError)
		return
	}

	writer.WriteHeader(http.StatusNoContent)
}

func (h *LanHandlers) AddGameToLan(w http.ResponseWriter, r *http.Request) {
	if _, err := GetUserFromRequest(h.db, r); err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	lanId, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid lan id", http.StatusBadRequest)
		return
	}
	name := strings.TrimSpace(r.FormValue("name"))
	if name == "" {
		http.Error(w, "name is required", http.StatusBadRequest)
		return
	}
	game, err := database.GetOrCreateGame(h.db, name)
	if err != nil {
		http.Error(w, "failed to get or create game", http.StatusInternalServerError)
		return
	}
	if _, err := database.AddLanGame(h.db, int64(lanId), game.Id); err != nil {
		http.Error(w, "failed to add game to lan", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(game)
}

func (a *LanHandlers) AddLanGame(writer http.ResponseWriter, req *http.Request) {
	if err := requireAuth(a.db, req); err != nil {
		http.Error(writer, err.Error(), http.StatusUnauthorized)
		return
	}
	writer.Header().Set("Content-Type", "application/json")

	var lanGame addLanGame

	if err := json.NewDecoder(req.Body).Decode(&lanGame); err != nil {
		http.Error(writer, err.Error(), http.StatusBadRequest)
		return
	}

	rows, err := database.AddLanGame(a.db, lanGame.lanId, lanGame.gameId)
	if err != nil {
		http.Error(writer, "failed to add lan game", http.StatusInternalServerError)
		return
	}

	if err := json.NewEncoder(writer).Encode(rows); err != nil {
		log.Printf("encode AddLanGame: %v", err)
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
	if err := requireAuth(h.db, r); err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}
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
		log.Printf("UploadLanImage: unauthorized: %v", err)
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	lanId, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		log.Printf("UploadLanImage: invalid lan id %q: %v", r.PathValue("id"), err)
		http.Error(w, "invalid lan id", http.StatusBadRequest)
		return
	}
	if err := r.ParseMultipartForm(20 << 20); err != nil {
		log.Printf("UploadLanImage user=%d lan=%d: failed to parse form: %v", user.Id, lanId, err)
		http.Error(w, "failed to parse form", http.StatusBadRequest)
		return
	}
	file, header, err := r.FormFile("image")
	if err != nil {
		log.Printf("UploadLanImage user=%d lan=%d: no image provided: %v", user.Id, lanId, err)
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
	buf := make([]byte, 512)
	n, err := file.Read(buf)
	if err != nil && n == 0 {
		log.Printf("UploadLanImage user=%d lan=%d file=%q: could not read file: %v", user.Id, lanId, header.Filename, err)
		http.Error(w, "could not read file", http.StatusBadRequest)
		return
	}
	if _, err := file.Seek(0, 0); err != nil {
		log.Printf("UploadLanImage user=%d lan=%d file=%q: seek failed: %v", user.Id, lanId, header.Filename, err)
		http.Error(w, "could not read file", http.StatusInternalServerError)
		return
	}
	contentType := http.DetectContentType(buf[:n])
	if !allowed[contentType] {
		log.Printf("UploadLanImage user=%d lan=%d file=%q: unsupported content type %q", user.Id, lanId, header.Filename, contentType)
		http.Error(w, "unsupported image type", http.StatusBadRequest)
		return
	}

	base := fmt.Sprintf("%d", time.Now().UnixNano())
	filename := base + ".webp"

	uploadDir := fmt.Sprintf("%s/uploads/lan/%d", h.frontendPath, lanId)
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		log.Printf("UploadLanImage user=%d lan=%d: failed to create upload dir %q: %v", user.Id, lanId, uploadDir, err)
		http.Error(w, "failed to create upload directory", http.StatusInternalServerError)
		return
	}

	// Write original to a temp file, then convert to webp
	origExt := filepath.Ext(header.Filename)
	if origExt == "" {
		origExt = ".jpg"
	}
	tmpPath := filepath.Join(uploadDir, base+origExt)
	dst, err := os.Create(tmpPath)
	if err != nil {
		log.Printf("UploadLanImage user=%d lan=%d: failed to create %q: %v", user.Id, lanId, tmpPath, err)
		http.Error(w, "failed to save image", http.StatusInternalServerError)
		return
	}
	if _, err := io.Copy(dst, file); err != nil {
		dst.Close()
		os.Remove(tmpPath)
		log.Printf("UploadLanImage user=%d lan=%d: failed to write %q: %v", user.Id, lanId, tmpPath, err)
		http.Error(w, "failed to write image", http.StatusInternalServerError)
		return
	}
	dst.Close()

	var exifDate *string
	if f, err := os.Open(tmpPath); err == nil {
		if x, err := exif.Decode(f); err == nil {
			if t, err := x.DateTime(); err == nil {
				s := t.Format("2006:01:02 15:04:05")
				exifDate = &s
			}
		}
		f.Close()
	}

	fullPath := filepath.Join(uploadDir, filename)
	if err := exec.Command("magick", tmpPath, "-auto-orient", "-quality", "92", fullPath).Run(); err != nil {
		// magick unavailable or failed — keep original
		log.Printf("UploadLanImage user=%d lan=%d: magick convert failed, keeping original %q: %v", user.Id, lanId, tmpPath, err)
		filename = base + origExt
		fullPath = tmpPath
	}

	thumbDir := filepath.Join(uploadDir, "thumbs")
	if err := os.MkdirAll(thumbDir, 0755); err != nil {
		log.Printf("UploadLanImage user=%d lan=%d: failed to create thumb dir %q: %v", user.Id, lanId, thumbDir, err)
	} else if err := exec.Command("magick", tmpPath, "-thumbnail", "600x600>", "-auto-orient", "-quality", "92", filepath.Join(thumbDir, filename)).Run(); err != nil {
		log.Printf("UploadLanImage user=%d lan=%d: thumbnail generation failed for %q: %v", user.Id, lanId, filename, err)
	}

	if fullPath != tmpPath {
		os.Remove(tmpPath)
	}

	img, err := database.AddLanImage(h.db, lanId, filename, user.Id, exifDate)
	if err != nil {
		log.Printf("UploadLanImage user=%d lan=%d file=%q: failed to save image record: %v", user.Id, lanId, filename, err)
		http.Error(w, "failed to save image record", http.StatusInternalServerError)
		return
	}
	log.Printf("UploadLanImage user=%d lan=%d: saved %q (image id %d)", user.Id, lanId, filename, img.Id)
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
	_ = os.Remove(fmt.Sprintf("%s/uploads/lan/%d/%s", h.frontendPath, lanId, filename))
	w.WriteHeader(http.StatusNoContent)
}

func (h *LanHandlers) GetTags(w http.ResponseWriter, r *http.Request) {
	if err := requireAuth(h.db, r); err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}
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

	if _, err = database.AddLanParticipant(h.db, int64(lanId), body.UserId); err != nil {
		http.Error(writer, "failed to add participant", http.StatusInternalServerError)
		return
	}

	writer.WriteHeader(http.StatusNoContent)
}

func (h *LanHandlers) SetParticipantNickname(w http.ResponseWriter, r *http.Request) {
	if err := requireAdmin(h.db, r); err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}
	lanId, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid lan id", http.StatusBadRequest)
		return
	}
	userId, err := strconv.Atoi(r.PathValue("userId"))
	if err != nil {
		http.Error(w, "invalid user id", http.StatusBadRequest)
		return
	}
	if err := database.SetParticipantNickname(h.db, lanId, userId, r.FormValue("nickname")); err != nil {
		http.Error(w, "failed to set nickname", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *LanHandlers) GetLanQuotes(w http.ResponseWriter, r *http.Request) {
	if err := requireAuth(h.db, r); err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}
	lanId, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid lan id", http.StatusBadRequest)
		return
	}
	quotes, err := database.GetLanQuotes(h.db, lanId)
	if err != nil {
		http.Error(w, "failed to get quotes", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(quotes)
}

func (h *LanHandlers) AddLanQuote(w http.ResponseWriter, r *http.Request) {
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
	quote := r.FormValue("quote")
	if quote == "" {
		http.Error(w, "quote is required", http.StatusBadRequest)
		return
	}
	attributedTo := r.FormValue("attributedTo")
	q, err := database.AddLanQuote(h.db, lanId, user.Id, quote, attributedTo)
	if err != nil {
		http.Error(w, "failed to add quote", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(q)
}

func (h *LanHandlers) DeleteLanQuote(w http.ResponseWriter, r *http.Request) {
	if err := requireAdmin(h.db, r); err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}
	quoteId, err := strconv.Atoi(r.PathValue("quoteId"))
	if err != nil {
		http.Error(w, "invalid quote id", http.StatusBadRequest)
		return
	}
	if err := database.DeleteLanQuote(h.db, quoteId); err != nil {
		http.Error(w, "failed to delete quote", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *LanHandlers) PatchLanQuote(w http.ResponseWriter, r *http.Request) {
	if err := requireAdmin(h.db, r); err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}
	quoteId, err := strconv.Atoi(r.PathValue("quoteId"))
	if err != nil {
		http.Error(w, "invalid quote id", http.StatusBadRequest)
		return
	}
	quote := r.FormValue("quote")
	if quote == "" {
		http.Error(w, "quote is required", http.StatusBadRequest)
		return
	}
	q, err := database.UpdateLanQuote(h.db, quoteId, quote, r.FormValue("attributedTo"))
	if err != nil {
		http.Error(w, "failed to update quote", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(q)
}

func (h *LanHandlers) GetLanGuests(w http.ResponseWriter, r *http.Request) {
	if err := requireAuth(h.db, r); err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}
	lanId, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid lan id", http.StatusBadRequest)
		return
	}
	guests, err := database.GetLanGuests(h.db, lanId)
	if err != nil {
		http.Error(w, "failed to get guests", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(guests)
}

func (h *LanHandlers) AddLanGuest(w http.ResponseWriter, r *http.Request) {
	if err := requireAdmin(h.db, r); err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}
	lanId, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid lan id", http.StatusBadRequest)
		return
	}
	name := strings.TrimSpace(r.FormValue("name"))
	if name == "" {
		http.Error(w, "name is required", http.StatusBadRequest)
		return
	}
	g, err := database.AddLanGuest(h.db, lanId, name)
	if err != nil {
		http.Error(w, "failed to add guest", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(g)
}

func (h *LanHandlers) DeleteLanGuest(w http.ResponseWriter, r *http.Request) {
	if err := requireAdmin(h.db, r); err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}
	guestId, err := strconv.Atoi(r.PathValue("guestId"))
	if err != nil {
		http.Error(w, "invalid guest id", http.StatusBadRequest)
		return
	}
	if err := database.DeleteLanGuest(h.db, guestId); err != nil {
		http.Error(w, "failed to delete guest", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
