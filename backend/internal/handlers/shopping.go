package handlers

import (
	"database/sql"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"

	"backend/internal/database"
)

type ShoppingHandlers struct {
	db           *sql.DB
	serviceToken string
}

func NewShoppingHandlers(db *sql.DB, serviceToken string) *ShoppingHandlers {
	return &ShoppingHandlers{db: db, serviceToken: serviceToken}
}

func (h *ShoppingHandlers) authOrService(w http.ResponseWriter, r *http.Request) (*database.UserResponse, bool) {
	user, err := authOrService(h.db, r, h.serviceToken)
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return nil, false
	}
	return user, true
}

func createdByPtr(user *database.UserResponse) *int {
	if user == nil || user.Id == 0 {
		return nil
	}
	return &user.Id
}

func writeShoppingError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, database.ErrShoppingNotFound):
		http.Error(w, "not found", http.StatusNotFound)
	case errors.Is(err, database.ErrShoppingListCompleted):
		http.Error(w, "shopping list is completed", http.StatusConflict)
	default:
		log.Printf("shopping handler error: %v", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
	}
}

func (h *ShoppingHandlers) GetShoppingLists(w http.ResponseWriter, r *http.Request) {
	if _, ok := h.authOrService(w, r); !ok {
		return
	}
	lists, err := database.GetShoppingLists(h.db)
	if err != nil {
		writeShoppingError(w, err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(lists)
}

func (h *ShoppingHandlers) CreateShoppingList(w http.ResponseWriter, r *http.Request) {
	user, ok := h.authOrService(w, r)
	if !ok {
		return
	}
	var body struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Name == "" {
		http.Error(w, "name is required", http.StatusBadRequest)
		return
	}
	list, err := database.CreateShoppingList(h.db, body.Name, createdByPtr(user))
	if err != nil {
		writeShoppingError(w, err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(list)
}

func (h *ShoppingHandlers) GetShoppingListById(w http.ResponseWriter, r *http.Request) {
	if _, ok := h.authOrService(w, r); !ok {
		return
	}
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid list id", http.StatusBadRequest)
		return
	}
	list, err := database.GetShoppingListById(h.db, id)
	if err != nil {
		writeShoppingError(w, err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(list)
}

func (h *ShoppingHandlers) PatchShoppingList(w http.ResponseWriter, r *http.Request) {
	if _, ok := h.authOrService(w, r); !ok {
		return
	}
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid list id", http.StatusBadRequest)
		return
	}
	var body struct {
		Name   *string `json:"name"`
		Status *string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	var list *database.ShoppingListDetail
	if body.Name != nil && *body.Name != "" {
		list, err = database.RenameShoppingList(h.db, id, *body.Name)
		if err != nil {
			writeShoppingError(w, err)
			return
		}
	}
	if body.Status != nil {
		if *body.Status != "active" && *body.Status != "completed" {
			http.Error(w, "status must be 'active' or 'completed'", http.StatusBadRequest)
			return
		}
		list, err = database.SetShoppingListStatus(h.db, id, *body.Status)
		if err != nil {
			writeShoppingError(w, err)
			return
		}
	}
	if list == nil {
		list, err = database.GetShoppingListById(h.db, id)
		if err != nil {
			writeShoppingError(w, err)
			return
		}
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(list)
}

func (h *ShoppingHandlers) DeleteShoppingList(w http.ResponseWriter, r *http.Request) {
	if _, ok := h.authOrService(w, r); !ok {
		return
	}
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid list id", http.StatusBadRequest)
		return
	}
	if err := database.DeleteShoppingList(h.db, id); err != nil {
		writeShoppingError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *ShoppingHandlers) AddShoppingItem(w http.ResponseWriter, r *http.Request) {
	user, ok := h.authOrService(w, r)
	if !ok {
		return
	}
	listId, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		http.Error(w, "invalid list id", http.StatusBadRequest)
		return
	}
	var body struct {
		Name     string `json:"name"`
		Quantity int    `json:"quantity"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Name == "" {
		http.Error(w, "name is required", http.StatusBadRequest)
		return
	}
	if body.Quantity == 0 {
		body.Quantity = 1
	}
	item, err := database.AddShoppingItem(h.db, listId, body.Name, body.Quantity, createdByPtr(user))
	if err != nil {
		writeShoppingError(w, err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(item)
}

func (h *ShoppingHandlers) PatchShoppingItem(w http.ResponseWriter, r *http.Request) {
	if _, ok := h.authOrService(w, r); !ok {
		return
	}
	itemId, err := strconv.Atoi(r.PathValue("itemId"))
	if err != nil {
		http.Error(w, "invalid item id", http.StatusBadRequest)
		return
	}
	var body struct {
		Quantity *int  `json:"quantity"`
		Checked  *bool `json:"checked"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	var item *database.ShoppingItem
	if body.Quantity != nil {
		item, err = database.SetShoppingItemQuantity(h.db, itemId, *body.Quantity)
		if err != nil {
			writeShoppingError(w, err)
			return
		}
	}
	if body.Checked != nil {
		item, err = database.SetShoppingItemChecked(h.db, itemId, *body.Checked)
		if err != nil {
			writeShoppingError(w, err)
			return
		}
	}
	if item == nil {
		http.Error(w, "no fields to update", http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(item)
}

func (h *ShoppingHandlers) DeleteShoppingItem(w http.ResponseWriter, r *http.Request) {
	if _, ok := h.authOrService(w, r); !ok {
		return
	}
	itemId, err := strconv.Atoi(r.PathValue("itemId"))
	if err != nil {
		http.Error(w, "invalid item id", http.StatusBadRequest)
		return
	}
	if err := database.DeleteShoppingItem(h.db, itemId); err != nil {
		writeShoppingError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
