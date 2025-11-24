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

type UserHandlers struct {
	db *sql.DB
}

func NewUserHandlers(db *sql.DB) *UserHandlers {
	return &UserHandlers{
		db: db,
	}
}

func (h *UserHandlers) GetUsers(writer http.ResponseWriter, _ *http.Request) {
	writer.Header().Set("Content-Type", "application/json")

	lans, err := database.GetUsers(h.db)
	if err != nil {
		fmt.Println("No users found in db", err)
		return
	}

	err = json.NewEncoder(writer).Encode(lans)
	if err != nil {
		log.Fatalf("Encoding response blew up: %v", err)
	}
}

func (a *UserHandlers) AddUser(writer http.ResponseWriter, req *http.Request) {
	writer.Header().Set("Content-Type", "application/json")

	err := req.ParseMultipartForm(0)
	if err != nil {
		fmt.Println("Parsing user form failed", err)
	}

	userName := req.FormValue("userName")
	userId, err := database.AddUser(a.db, userName)
	if err != nil {
		fmt.Println("Failed to add user", err)
		return
	}

	res := database.UserResponse{
		Id:   int(userId),
		Name: userName,
	}

	err = json.NewEncoder(writer).Encode(res)
	if err != nil {
		log.Fatalf("Encoding response blew up: %v", err)
	}
}

func (h *UserHandlers) DeleteUserWithId(writer http.ResponseWriter, req *http.Request) {
	writer.Header().Set("Content-Type", "application/json")

	idPath := req.PathValue("id")

	id, err := strconv.Atoi(idPath)
	if err != nil {
		log.Fatalf("Id to int failed: %v", err)
	}

	rowsDeleted, err := database.DeleteUserWithId(h.db, id)
	if err != nil {
		fmt.Println("No users found in db", err)
		return
	}

	fmt.Println("Deleted rows", rowsDeleted)
	writer.WriteHeader(http.StatusNoContent)
}
