package handlers

import (
	"database/sql"
)

type AdminHandlers struct {
	db *sql.DB
}

func NewAdminHandlers(db *sql.DB) *LanHandlers {
	return &LanHandlers{
		db: db,
	}
}
