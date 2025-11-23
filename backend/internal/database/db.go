package database

import (
	"database/sql"
	"fmt"
	"log"
)

type Lan struct {
	Id          int    `json:"lanId"`
	Start_date  string `json:"startDate"`
	End_date    string `json:"endDate"`
	Event       string `json:"event"`
	Description string `json:"description"`
}

type LanGame struct {
	Lan_game string
}

type LanParticipant struct {
	Participant string
}

type LanEvent struct {
	Description  string   `json:"description"`
	End_date     string   `json:"endDate"`
	Event        string   `json:"event"`
	Games        []string `json:"games"`
	Id           int      `json:"lanId"`
	Participants []string `json:"participants"`
	Start_date   string   `json:"startDate"`
}

type Game struct {
	Id   int    `json:"id"`
	Name string `json:"name"`
}

func GetGames(db *sql.DB) ([]Game, error) {
	var games []Game

	gameQuery := "SELECT id, name FROM game;"

	gameRows, err := doQuery(db, gameQuery)
	if err != nil {
		return games, err
	}
	defer gameRows.Close()

	for gameRows.Next() {
		var game Game
		err := gameRows.Scan(&game.Id, &game.Name)
		if err != nil {
			return games, err
		}
		games = append(games, game)
	}
	return games, nil
}

func DeleteGameWithId(db *sql.DB, id int) (int64, error) {
	query := "DELETE FROM game where id = ?"

	result, err := db.Exec(query, id)
	if err != nil {
		return 0, err
	}

	return result.RowsAffected()
}

func DeleteLanWithId(db *sql.DB, id int) (int64, error) {
	query := "DELETE FROM lan where id = ?"

	result, err := db.Exec(query, id)
	if err != nil {
		return 0, err
	}

	return result.RowsAffected()
}

func GetLans(db *sql.DB) ([]LanEvent, error) {
	var events []LanEvent

	lanQuery := "SELECT id FROM lan;"

	lanRows, err := doQuery(db, lanQuery)
	if err != nil {
		return events, err
	}
	defer lanRows.Close()

	var lanIds []int

	for lanRows.Next() {
		var lanId int
		err := lanRows.Scan(&lanId)
		if err != nil {
			return events, err
		}
		lanIds = append(lanIds, lanId)
	}

	for _, lanId := range lanIds {
		event, err := GetLanById(db, lanId)
		if err != nil {
			fmt.Println("Blew up:", err)
			return events, err
		}
		events = append(events, event)
	}

	return events, err
}

func GetLanById(db *sql.DB, id int) (LanEvent, error) {
	var event LanEvent

	lanQuery := `
		SELECT
		lan.description,
		lan.end_date,
		lan.event,
		lan.id,
		lan.start_date
		FROM lan
		WHERE id = ?;
	`
	lanRow := queryLanWithId(db, lanQuery, id)

	var lan Lan

	err := lanRow.Scan(
		&lan.Description,
		&lan.End_date,
		&lan.Event,
		&lan.Id,
		&lan.Start_date,
	)
	if err != nil {
		return event, err
	}

	err = lanRow.Err()
	if err != nil {
		return event, err
	}

	lanGamesQuery := `
		SELECT
    game.name AS lan_game
		FROM lan
    JOIN lan_games ON lan.id = lan_games.lan_id
    JOIN game ON lan_games.game_id = game.id
    WHERE lan.id = ?;
	`
	var lanGames []string

	lanGamesRows, err := doQueryWithId(db, lanGamesQuery, 1)
	if err != nil {
		return event, err
	}
	defer lanGamesRows.Close()

	for lanGamesRows.Next() {
		var lanGame LanGame
		err := lanGamesRows.Scan(
			&lanGame.Lan_game,
		)
		if err != nil {
			return event, err
		}
		lanGames = append(lanGames, lanGame.Lan_game)
	}

	err = lanGamesRows.Err()
	if err != nil {
		return event, err
	}

	paricipantsQuery := `
		SELECT
		user.name AS participant
		FROM lan
		JOIN lan_participants ON lan.id = lan_participants.lan_id
		JOIN user ON lan_participants.user_id = user.id
    WHERE lan.id = ?;
	`
	var participants []string

	participantRows, err := doQueryWithId(db, paricipantsQuery, 1)
	if err != nil {
		return event, err
	}
	defer participantRows.Close()

	for participantRows.Next() {
		var participant LanParticipant
		err := participantRows.Scan(
			&participant.Participant,
		)
		if err != nil {
			return event, err
		}
		participants = append(participants, participant.Participant)
	}

	err = participantRows.Err()
	if err != nil {
		return event, err
	}

	event = LanEvent{
		Description:  lan.Description,
		End_date:     lan.End_date,
		Event:        lan.Event,
		Games:        lanGames,
		Id:           lan.Id,
		Participants: participants,
		Start_date:   lan.Start_date,
	}
	fmt.Println(event)
	return event, nil
}

func doQuery(db *sql.DB, query string) (*sql.Rows, error) {
	rows, err := db.Query(query)
	if err != nil {
		log.Fatal("Query failed:", err)
	}

	return rows, err
}

func queryLanWithId(db *sql.DB, query string, lanId int) *sql.Row {
	return db.QueryRow(query, lanId)
}

func doQueryWithId(db *sql.DB, query string, id int) (*sql.Rows, error) {
	rows, err := db.Query(query, id)
	if err != nil {
		log.Fatal("Query failed:", err)
	}

	return rows, err
}

func AddLan(
	db *sql.DB,
	description string,
	end_date string,
	event string,
	start_date string,
) (int64, error) {
	query := `
	INSERT INTO lan(
	description,
	end_date,
	event, 
	start_date)
	VALUES (?,?,?,?);
`

	result, err := db.Exec(query, description, end_date, event, start_date)
	if err != nil {
		return 0, fmt.Errorf("INSERT ERROR: %v", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		return 0, fmt.Errorf("INSERT ERRROR: %v", err)
	}

	return id, nil
}

func AddGame(db *sql.DB, name string) (int64, error) {
	query := "INSERT INTO game(name) VALUES (?)"

	result, err := db.Exec(query, name)
	if err != nil {
		return 0, fmt.Errorf("GAME INSERT ERROR: %v", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		return 0, fmt.Errorf("GAME INSERT ERRROR: %v", err)
	}

	return id, nil
}

func AddLanGame(db *sql.DB, lanId int, gameId int) (int64, error) {
	query := "INSERT INTO lan_games(lan_id, game_id) VALUES (?, ?)"

	result, err := db.Exec(query, lanId, gameId)
	if err != nil {
		return 0, fmt.Errorf("GAME INSERT ERROR: %v", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		return 0, fmt.Errorf("GAME INSERT ERRROR: %v", err)
	}

	return id, nil
}

func AddLanParticipant(db *sql.DB, lanId int, userId int) (int64, error) {
	query := "INSERT INTO lan_participants(lan_id, user_id) VALUES (?, ?)"

	result, err := db.Exec(query, lanId, userId)
	if err != nil {
		return 0, fmt.Errorf("PARTICIPANT INSERT ERROR: %v", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		return 0, fmt.Errorf("PARTICIPANT INSERT ERRROR: %v", err)
	}

	return id, nil
}
