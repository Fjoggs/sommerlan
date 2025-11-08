package database

import (
	"database/sql"
	"log"

	_ "modernc.org/sqlite"
)

const schema = `
CREATE TABLE IF NOT EXISTS user (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS game (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS lan (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
  start_date TEXT,
  end_date TEXT,
  event TEXT,
  description TEXT
);

CREATE TABLE IF NOT EXISTS lan_games (
  lan_id INTEGER,
  game_id INTEGER,
  PRIMARY KEY (lan_id, game_id),
  FOREIGN KEY (lan_id) REFERENCES lan(id) ON DELETE CASCADE,
  FOREIGN KEY (game_id) REFERENCES game(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lan_participants (
  lan_id INTEGER,
  user_id INTEGER,
  PRIMARY KEY (lan_id, user_id),
  FOREIGN KEY (lan_id) REFERENCES lan(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);
`

func InitDB(dbPath string) (*sql.DB, error) {
	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, err
	}

	// Test the connection
	if err = db.Ping(); err != nil {
		return nil, err
	}

	// Create tables
	if _, err = db.Exec(schema); err != nil {
		return nil, err
	}

	log.Println("Database initialized successfully")
	return db, nil
}
