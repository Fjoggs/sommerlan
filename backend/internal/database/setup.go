package database

import (
	"database/sql"
	"log"

	_ "modernc.org/sqlite"
)

const schema = `
CREATE TABLE IF NOT EXISTS user (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  color TEXT 
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

CREATE TABLE IF NOT EXISTS rsvp (
  user_id INTEGER,
  date TEXT,
  PRIMARY KEY (user_id, date),
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
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

	// Migration: add discord_id column if not already present (ignore error on re-run)
	_, _ = db.Exec(`ALTER TABLE lan ADD COLUMN from_display TEXT`)
	_, _ = db.Exec(`ALTER TABLE lan ADD COLUMN to_display TEXT`)
	_, _ = db.Exec(`ALTER TABLE user ADD COLUMN discord_id TEXT`)
	_, _ = db.Exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_user_discord_id ON user(discord_id) WHERE discord_id IS NOT NULL`)
	_, _ = db.Exec(`ALTER TABLE user ADD COLUMN nickname TEXT`)
	_, _ = db.Exec(`ALTER TABLE user ADD COLUMN role TEXT NOT NULL DEFAULT 'user'`)
	_, _ = db.Exec(`CREATE TABLE IF NOT EXISTS lan_images (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		lan_id INTEGER NOT NULL,
		filename TEXT NOT NULL,
		uploaded_by INTEGER,
		uploaded_at TEXT DEFAULT (datetime('now')),
		FOREIGN KEY (lan_id) REFERENCES lan(id) ON DELETE CASCADE,
		FOREIGN KEY (uploaded_by) REFERENCES user(id)
	)`)
	_, _ = db.Exec(`ALTER TABLE lan_images ADD COLUMN sort_order INTEGER`)
	_, _ = db.Exec(`ALTER TABLE lan_images ADD COLUMN exif_date TEXT`)
	_, _ = db.Exec(`CREATE TABLE IF NOT EXISTS tag (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL UNIQUE
	)`)
	_, _ = db.Exec(`CREATE TABLE IF NOT EXISTS lan_image_tag (
		image_id INTEGER NOT NULL,
		tag_id INTEGER NOT NULL,
		PRIMARY KEY (image_id, tag_id),
		FOREIGN KEY (image_id) REFERENCES lan_images(id) ON DELETE CASCADE,
		FOREIGN KEY (tag_id) REFERENCES tag(id) ON DELETE CASCADE
	)`)

	_, _ = db.Exec(`ALTER TABLE user ADD COLUMN color2 TEXT`)

	_, _ = db.Exec(`CREATE TABLE IF NOT EXISTS award (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL
	)`)
	_, _ = db.Exec(`CREATE TABLE IF NOT EXISTS lan_awards (
		lan_id INTEGER,
		award_id INTEGER,
		PRIMARY KEY (lan_id, award_id),
		FOREIGN KEY (lan_id) REFERENCES lan(id) ON DELETE CASCADE,
		FOREIGN KEY (award_id) REFERENCES award(id) ON DELETE CASCADE
	)`)

	log.Println("Database initialized successfully")
	return db, nil
}
