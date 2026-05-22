package database

import (
	"database/sql"
	"fmt"

	"github.com/google/uuid"
)

var userColors = []string{
	"#5865F2",
	"#EB459E",
	"#57F287",
	"#FEE75C",
	"#ED4245",
	"#00B0F4",
	"#FF6D00",
	"#B660CD",
	"#1ABC9C",
	"#E91E63",
	"#9C27B0",
	"#FF9800",
}

func pickColor(db *sql.DB) string {
	var count int
	_ = db.QueryRow(`SELECT COUNT(*) FROM user`).Scan(&count)
	return userColors[count%len(userColors)]
}

// UpsertDiscordUser inserts a new user for the given Discord ID (if not seen before),
// then returns the user record.
func UpsertDiscordUser(db *sql.DB, name, discordID string) (*UserResponse, error) {
	_, err := db.Exec(
		`INSERT OR IGNORE INTO user(name, color, discord_id) VALUES(?, ?, ?)`,
		name, pickColor(db), discordID,
	)
	if err != nil {
		return nil, fmt.Errorf("UpsertDiscordUser insert: %w", err)
	}

	var user UserResponse
	var color, nickname sql.NullString
	err = db.QueryRow(
		`SELECT id, name, color, nickname, role FROM user WHERE discord_id = ?`,
		discordID,
	).Scan(&user.Id, &user.Name, &color, &nickname, &user.Role)
	if err != nil {
		return nil, fmt.Errorf("UpsertDiscordUser select: %w", err)
	}
	if color.Valid {
		user.Color = color.String
	}
	if nickname.Valid {
		user.Nickname = nickname.String
	}
	return &user, nil
}

func CreateSession(db *sql.DB, userID int) (string, error) {
	token := uuid.New().String()
	_, err := db.Exec(`INSERT INTO sessions(token, user_id) VALUES(?, ?)`, token, userID)
	if err != nil {
		return "", fmt.Errorf("CreateSession: %w", err)
	}
	return token, nil
}

func GetUserFromToken(db *sql.DB, token string) (*UserResponse, error) {
	var user UserResponse
	var color, nickname sql.NullString
	err := db.QueryRow(
		`SELECT u.id, u.name, u.color, u.nickname, u.role FROM sessions s JOIN user u ON s.user_id = u.id WHERE s.token = ?`,
		token,
	).Scan(&user.Id, &user.Name, &color, &nickname, &user.Role)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("no session for token")
	}
	if err != nil {
		return nil, fmt.Errorf("GetUserFromToken: %w", err)
	}
	if color.Valid {
		user.Color = color.String
	}
	if nickname.Valid {
		user.Nickname = nickname.String
	}
	return &user, nil
}

func DeleteSession(db *sql.DB, token string) error {
	_, err := db.Exec(`DELETE FROM sessions WHERE token = ?`, token)
	return err
}
