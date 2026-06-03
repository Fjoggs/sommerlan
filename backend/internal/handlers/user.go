package handlers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	"backend/internal/database"
)

type UserHandlers struct {
	db *sql.DB
}

func NewUserHandlers(db *sql.DB) *UserHandlers {
	return &UserHandlers{
		db: db,
	}
}

func (h *UserHandlers) GetUserStats(writer http.ResponseWriter, req *http.Request) {
	if err := requireAuth(h.db, req); err != nil {
		http.Error(writer, err.Error(), http.StatusUnauthorized)
		return
	}
	writer.Header().Set("Content-Type", "application/json")
	stats, err := database.GetUserStats(h.db)
	if err != nil {
		http.Error(writer, "failed to get user stats", http.StatusInternalServerError)
		return
	}
	if err := json.NewEncoder(writer).Encode(stats); err != nil {
		log.Printf("encode GetUserStats: %v", err)
	}
}

func (h *UserHandlers) GetUsers(writer http.ResponseWriter, req *http.Request) {
	if err := requireAuth(h.db, req); err != nil {
		http.Error(writer, err.Error(), http.StatusUnauthorized)
		return
	}
	writer.Header().Set("Content-Type", "application/json")

	users, err := database.GetUsers(h.db)
	if err != nil {
		http.Error(writer, "failed to get users", http.StatusInternalServerError)
		return
	}

	if err := json.NewEncoder(writer).Encode(users); err != nil {
		log.Printf("encode GetUsers: %v", err)
	}
}

func (h *UserHandlers) AddUser(writer http.ResponseWriter, req *http.Request) {
	if err := requireAdmin(h.db, req); err != nil {
		http.Error(writer, err.Error(), http.StatusForbidden)
		return
	}
	writer.Header().Set("Content-Type", "application/json")

	if err := req.ParseMultipartForm(0); err != nil {
		http.Error(writer, "invalid form", http.StatusBadRequest)
		return
	}

	userName := req.FormValue("userName")
	color := req.FormValue("color")
	color2 := req.FormValue("color2")
	userId, err := database.AddUser(h.db, userName, color, color2)
	if err != nil {
		http.Error(writer, "failed to add user", http.StatusInternalServerError)
		return
	}

	res := database.UserResponse{
		Id:     int(userId),
		Name:   userName,
		Color:  color,
		Color2: color2,
	}

	if err := json.NewEncoder(writer).Encode(res); err != nil {
		log.Printf("encode AddUser: %v", err)
	}
}

func (h *UserHandlers) AlterUser(writer http.ResponseWriter, req *http.Request) {
	if err := requireAdmin(h.db, req); err != nil {
		http.Error(writer, err.Error(), http.StatusForbidden)
		return
	}
	writer.Header().Set("Content-Type", "application/json")

	if err := req.ParseMultipartForm(0); err != nil {
		http.Error(writer, "invalid form", http.StatusBadRequest)
		return
	}

	userId := req.FormValue("userId")
	id, err := strconv.Atoi(userId)
	if err != nil {
		http.Error(writer, "invalid user id", http.StatusBadRequest)
		return
	}
	userName := req.FormValue("userName")
	color := req.FormValue("color")
	color2 := req.FormValue("color2")
	if err := database.AlterUser(h.db, id, userName, color, color2); err != nil {
		http.Error(writer, "failed to update user", http.StatusInternalServerError)
		return
	}

	res := database.UserResponse{
		Id:     id,
		Name:   userName,
		Color:  color,
		Color2: color2,
	}

	if err := json.NewEncoder(writer).Encode(res); err != nil {
		log.Printf("encode AlterUser: %v", err)
	}
}

func (h *UserHandlers) GetUserById(writer http.ResponseWriter, req *http.Request) {
	if err := requireAuth(h.db, req); err != nil {
		http.Error(writer, err.Error(), http.StatusUnauthorized)
		return
	}
	writer.Header().Set("Content-Type", "application/json")

	idPath := req.PathValue("id")
	id, err := strconv.Atoi(idPath)
	if err != nil || id <= 0 {
		http.Error(writer, "invalid id", http.StatusBadRequest)
		return
	}

	profile, err := database.GetUserProfile(h.db, id)
	if err != nil {
		http.Error(writer, "user not found", http.StatusNotFound)
		return
	}

	if err := json.NewEncoder(writer).Encode(profile); err != nil {
		log.Printf("encode GetUserById: %v", err)
	}
}

func (h *UserHandlers) DeleteUserWithId(writer http.ResponseWriter, req *http.Request) {
	if err := requireAdmin(h.db, req); err != nil {
		http.Error(writer, err.Error(), http.StatusForbidden)
		return
	}

	id, err := strconv.Atoi(req.PathValue("id"))
	if err != nil {
		http.Error(writer, "invalid id", http.StatusBadRequest)
		return
	}

	if _, err := database.DeleteUserWithId(h.db, id); err != nil {
		http.Error(writer, "failed to delete user", http.StatusInternalServerError)
		return
	}

	writer.WriteHeader(http.StatusNoContent)
}
