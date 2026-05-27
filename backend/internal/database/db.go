package database

import (
	"database/sql"
	"fmt"
	"log"
	"strings"
	"time"
)

type Lan struct {
	Id          int
	Start_date  string
	End_date    string
	Event       string
	Description string
}

type LanEvent struct {
	Awards       []AwardResponse `json:"awards"`
	Description  string          `json:"description"`
	End_date     string          `json:"endDate"`
	Event        string          `json:"event"`
	FromDisplay  string          `json:"fromDisplay"`
	Games        []GameResponse  `json:"games"`
	Id           int             `json:"lanId"`
	ImageCount   int             `json:"imageCount"`
	Invitation    string          `json:"invitation,omitempty"`
	IsRomjulsLAN  bool            `json:"isRomjulsLAN"`
	QuoteCount   int             `json:"quoteCount"`
	GuestCount   int             `json:"guestCount"`
	Participants []UserResponse  `json:"participants"`
	Start_date   string          `json:"startDate"`
	ToDisplay    string          `json:"toDisplay"`
}

type GameResponse struct {
	Id   int    `json:"id"`
	Name string `json:"name"`
}

type AwardResponse struct {
	Id   int    `json:"id"`
	Name string `json:"name"`
}

type UserResponse struct {
	Id            int    `json:"id"`
	Name          string `json:"name"`
	Nickname      string `json:"nickname,omitempty"`
	EventNickname string `json:"eventNickname,omitempty"`
	Color         string `json:"color"`
	Color2        string `json:"color2,omitempty"`
	Role          string `json:"role,omitempty"`
}

func GetUsers(db *sql.DB) ([]UserResponse, error) {
	var users []UserResponse

	userQuery := "SELECT id, name, color, color2, nickname FROM user;"

	userRows, err := doQuery(db, userQuery)
	if err != nil {
		return users, err
	}
	defer userRows.Close()

	for userRows.Next() {
		var user UserResponse
		var color, color2, nickname sql.NullString
		err := userRows.Scan(&user.Id, &user.Name, &color, &color2, &nickname)
		if err != nil {
			return users, err
		}
		if color.Valid {
			user.Color = color.String
		}
		if color2.Valid {
			user.Color2 = color2.String
		}
		if nickname.Valid {
			user.Nickname = nickname.String
		}
		users = append(users, user)
	}
	return users, nil
}

func GetUserWithId(db *sql.DB, userId int) (UserResponse, error) {
	var user UserResponse

	userQuery := "SELECT id, name, color, color2, nickname FROM user WHERE id = ?;"

	userRow, err := doQueryWithId(db, userQuery, userId)
	if err != nil {
		return user, err
	}
	defer userRow.Close()

	for userRow.Next() {
		var color, color2, nickname sql.NullString
		err := userRow.Scan(&user.Id, &user.Name, &color, &color2, &nickname)
		if err != nil {
			fmt.Println("GetUserWithId scan failed", err)
			return user, err
		}
		if color.Valid {
			user.Color = color.String
		}
		if color2.Valid {
			user.Color2 = color2.String
		}
		if nickname.Valid {
			user.Nickname = nickname.String
		}
	}
	return user, nil
}

func DeleteUserWithId(db *sql.DB, id int) (int64, error) {
	query := "DELETE FROM user where id = ?"

	result, err := db.Exec(query, id)
	if err != nil {
		return 0, err
	}

	return result.RowsAffected()
}

type GameStat struct {
	Id       int    `json:"id"`
	Name     string `json:"name"`
	LanCount int    `json:"lanCount"`
}

type UserStat struct {
	Id       int    `json:"id"`
	Name     string `json:"name"`
	Nickname string `json:"nickname,omitempty"`
	Color    string `json:"color"`
	Color2   string `json:"color2,omitempty"`
	LanCount int    `json:"lanCount"`
}

func GetUserStats(db *sql.DB) ([]UserStat, error) {
	query := `
		SELECT u.id, u.name, COALESCE(u.nickname, ''), u.color, COALESCE(u.color2, ''),
		       COUNT(DISTINCT lp.lan_id) AS lan_count
		FROM user u
		JOIN lan_participants lp ON u.id = lp.user_id
		GROUP BY u.id
		ORDER BY lan_count DESC, u.name ASC
	`
	rows, err := db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var stats []UserStat
	for rows.Next() {
		var s UserStat
		if err := rows.Scan(&s.Id, &s.Name, &s.Nickname, &s.Color, &s.Color2, &s.LanCount); err != nil {
			return nil, err
		}
		stats = append(stats, s)
	}
	if stats == nil {
		stats = []UserStat{}
	}
	return stats, rows.Err()
}

func GetGameStats(db *sql.DB) ([]GameStat, error) {
	query := `
		SELECT g.id, g.name, COUNT(DISTINCT lg.lan_id) AS lan_count
		FROM game g
		JOIN lan_games lg ON g.id = lg.game_id
		GROUP BY g.id
		ORDER BY lan_count DESC, g.name ASC
	`
	rows, err := db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var stats []GameStat
	for rows.Next() {
		var s GameStat
		if err := rows.Scan(&s.Id, &s.Name, &s.LanCount); err != nil {
			return nil, err
		}
		stats = append(stats, s)
	}
	if stats == nil {
		stats = []GameStat{}
	}
	return stats, rows.Err()
}

func GetGames(db *sql.DB) ([]GameResponse, error) {
	var games []GameResponse

	gameQuery := "SELECT id, name FROM game;"

	gameRows, err := doQuery(db, gameQuery)
	if err != nil {
		return games, err
	}
	defer gameRows.Close()

	for gameRows.Next() {
		var game GameResponse
		err := gameRows.Scan(&game.Id, &game.Name)
		if err != nil {
			return games, err
		}
		games = append(games, game)
	}
	return games, nil
}

func GetGameWithId(db *sql.DB, gameId int) (GameResponse, error) {
	var game GameResponse

	userQuery := "SELECT id, name FROM game WHERE id = ?;"

	gameRow, err := doQueryWithId(db, userQuery, gameId)
	if err != nil {
		return game, err
	}
	defer gameRow.Close()

	for gameRow.Next() {
		err := gameRow.Scan(&game.Id, &game.Name)
		if err != nil {
			return game, err
		}
	}
	return game, nil
}

func DeleteGameWithId(db *sql.DB, id int) (int64, error) {
	query := "DELETE FROM game where id = ?"

	result, err := db.Exec(query, id)
	if err != nil {
		return 0, err
	}

	return result.RowsAffected()
}

func GetLans(db *sql.DB) ([]LanEvent, error) {
	var events []LanEvent

	lanQuery := "SELECT id FROM lan order by start_date;"

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
		lan.start_date,
		lan.from_display,
		lan.to_display,
		lan.invitation,
		lan.is_romjulslan
		FROM lan
		WHERE id = ?;
	`
	lanRow := queryLanWithId(db, lanQuery, id)

	var lan Lan
	var fromDisplay, toDisplay, invitation sql.NullString
	var isRomjulsLAN bool

	err := lanRow.Scan(
		&lan.Description,
		&lan.End_date,
		&lan.Event,
		&lan.Id,
		&lan.Start_date,
		&fromDisplay,
		&toDisplay,
		&invitation,
		&isRomjulsLAN,
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
    game.id, game.name
		FROM lan
    JOIN lan_games ON lan.id = lan_games.lan_id
    JOIN game ON lan_games.game_id = game.id
    WHERE lan.id = ?;
	`
	var lanGames []GameResponse

	lanGamesRows, err := doQueryWithId(db, lanGamesQuery, id)
	if err != nil {
		return event, err
	}
	defer lanGamesRows.Close()

	for lanGamesRows.Next() {
		var lanGame GameResponse
		err := lanGamesRows.Scan(
			&lanGame.Id,
			&lanGame.Name,
		)
		if err != nil {
			return event, err
		}
		lanGames = append(lanGames, lanGame)
	}

	err = lanGamesRows.Err()
	if err != nil {
		return event, err
	}

	var participants []UserResponse
	isUpcoming := lan.End_date > time.Now().Format("2006-01-02")

	if isUpcoming {
		rsvpQuery := `
			SELECT DISTINCT u.id, u.name, u.color, u.color2, u.nickname
			FROM rsvp r
			JOIN user u ON r.user_id = u.id
			WHERE r.lan_id = ?
			ORDER BY u.name;
		`
		rsvpRows, err := db.Query(rsvpQuery, id)
		if err != nil {
			return event, err
		}
		defer rsvpRows.Close()
		for rsvpRows.Next() {
			var p UserResponse
			var color, color2, nickname sql.NullString
			if err := rsvpRows.Scan(&p.Id, &p.Name, &color, &color2, &nickname); err != nil {
				return event, err
			}
			if color.Valid {
				p.Color = color.String
			}
			if color2.Valid {
				p.Color2 = color2.String
			}
			if nickname.Valid {
				p.Nickname = nickname.String
			}
			participants = append(participants, p)
		}
		if err = rsvpRows.Err(); err != nil {
			return event, err
		}
	} else {
		paricipantsQuery := `
			SELECT
				user.id, user.name, user.color, user.color2,
				COALESCE(lp.nickname, user.nickname), lp.nickname
			FROM lan
			JOIN lan_participants lp ON lan.id = lp.lan_id
			JOIN user ON lp.user_id = user.id
			WHERE lan.id = ?;
		`
		participantRows, err := doQueryWithId(db, paricipantsQuery, id)
		if err != nil {
			return event, err
		}
		defer participantRows.Close()

		for participantRows.Next() {
			var participant UserResponse
			var color, color2, nickname, eventNickname sql.NullString
			err := participantRows.Scan(
				&participant.Id,
				&participant.Name,
				&color,
				&color2,
				&nickname,
				&eventNickname,
			)
			if err != nil {
				fmt.Println("Scanning participant blew up", err)
				return event, err
			}
			if color.Valid {
				participant.Color = color.String
			}
			if color2.Valid {
				participant.Color2 = color2.String
			}
			if nickname.Valid {
				participant.Nickname = nickname.String
			}
			if eventNickname.Valid {
				participant.EventNickname = eventNickname.String
			}
			participants = append(participants, participant)
		}

		if err = participantRows.Err(); err != nil {
			return event, err
		}
	}

	lanAwardsQuery := `
		SELECT award.id, award.name
		FROM lan
		JOIN lan_awards ON lan.id = lan_awards.lan_id
		JOIN award ON lan_awards.award_id = award.id
		WHERE lan.id = ?;
	`
	var lanAwards []AwardResponse

	lanAwardsRows, err := doQueryWithId(db, lanAwardsQuery, id)
	if err != nil {
		return event, err
	}
	defer lanAwardsRows.Close()

	for lanAwardsRows.Next() {
		var a AwardResponse
		if err := lanAwardsRows.Scan(&a.Id, &a.Name); err != nil {
			return event, err
		}
		lanAwards = append(lanAwards, a)
	}
	if err = lanAwardsRows.Err(); err != nil {
		return event, err
	}

	var imageCount int
	db.QueryRow("SELECT COUNT(*) FROM lan_images WHERE lan_id = ?", id).Scan(&imageCount)
	var quoteCount int
	db.QueryRow("SELECT COUNT(*) FROM lan_quote WHERE lan_id = ?", id).Scan(&quoteCount)
	var guestCount int
	db.QueryRow("SELECT COUNT(*) FROM lan_guest WHERE lan_id = ?", id).Scan(&guestCount)

	event = LanEvent{
		Awards:       lanAwards,
		Description:  lan.Description,
		End_date:     lan.End_date,
		Event:        lan.Event,
		Games:        lanGames,
		Id:           lan.Id,
		ImageCount:   imageCount,
		Invitation:    invitation.String,
		IsRomjulsLAN:  isRomjulsLAN,
		QuoteCount:   quoteCount,
		GuestCount:   guestCount,
		Participants: participants,
		Start_date:   lan.Start_date,
		FromDisplay:  fromDisplay.String,
		ToDisplay:    toDisplay.String,
	}
	return event, nil
}

func DeleteLanWithId(db *sql.DB, id int) (int64, error) {
	query := "DELETE FROM lan where id = ?"

	result, err := db.Exec(query, id)
	if err != nil {
		return 0, err
	}

	return result.RowsAffected()
}

func doQuery(db *sql.DB, query string) (*sql.Rows, error) {
	rows, err := db.Query(query)
	if err != nil {
		log.Fatal("Query failed:", err)
	}

	return rows, err
}

func doQueryWithId(db *sql.DB, query string, id int) (*sql.Rows, error) {
	rows, err := db.Query(query, id)
	if err != nil {
		log.Fatal("Query failed:", err)
	}

	return rows, err
}

func queryLanWithId(db *sql.DB, query string, lanId int) *sql.Row {
	return db.QueryRow(query, lanId)
}

func AddLan(
	db *sql.DB,
	description string,
	end_date string,
	event string,
	start_date string,
	from_display string,
	to_display string,
) (int64, error) {
	query := `
	INSERT INTO lan(description, end_date, event, start_date, from_display, to_display)
	VALUES (?, ?, ?, ?, NULLIF(?, ''), NULLIF(?, ''));
`
	result, err := db.Exec(query, description, end_date, event, start_date, from_display, to_display)
	if err != nil {
		return 0, fmt.Errorf("INSERT ERROR: %v", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		return 0, fmt.Errorf("INSERT ERRROR: %v", err)
	}

	return id, nil
}

func AlterLan(
	db *sql.DB,
	id int,
	description string,
	end_date string,
	event string,
	start_date string,
	from_display string,
	to_display string,
	invitation string,
	isRomjulsLAN bool,
) error {
	query := `UPDATE lan SET description = ?, end_date = ?, event = ?, start_date = ?, from_display = NULLIF(?, ''), to_display = NULLIF(?, ''), invitation = NULLIF(?, ''), is_romjulslan = ? WHERE id = ?`

	_, err := db.Exec(query, description, end_date, event, start_date, from_display, to_display, invitation, isRomjulsLAN, id)
	if err != nil {
		return fmt.Errorf("LAN UPDATE ERROR: %v", err)
	}

	return nil
}

func AddUser(db *sql.DB, name string, color string, color2 string) (int64, error) {
	query := "INSERT INTO user(name, color, color2) VALUES (?, ?, NULLIF(?, ''))"

	result, err := db.Exec(query, name, color, color2)
	if err != nil {
		return 0, fmt.Errorf("USER INSERT ERROR: %v", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		return 0, fmt.Errorf("USER INSERT ERRROR: %v", err)
	}

	return id, nil
}

func AlterUser(db *sql.DB, id int, name string, color string, color2 string) error {
	query := "UPDATE USER set name = ?, color = ?, color2 = NULLIF(?, '') WHERE id = ?"

	_, err := db.Exec(query, name, color, color2, id)
	if err != nil {
		return fmt.Errorf("USER UPDATE ERROR: %v", err)
	}

	return nil
}

func GetOrCreateGame(db *sql.DB, name string) (GameResponse, error) {
	var g GameResponse
	err := db.QueryRow("SELECT id, name FROM game WHERE LOWER(name) = LOWER(?)", name).Scan(&g.Id, &g.Name)
	if err == nil {
		return g, nil
	}
	if err != sql.ErrNoRows {
		return g, err
	}
	id, err := AddGame(db, name)
	if err != nil {
		return g, err
	}
	g.Id = int(id)
	g.Name = name
	return g, nil
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

func AlterGame(db *sql.DB, id int, name string) error {
	query := "UPDATE GAME set name = ? WHERE id = ?"

	_, err := db.Exec(query, name, id)
	if err != nil {
		return fmt.Errorf("GAME UPDATE ERROR: %v", err)
	}

	return nil
}

func RemoveLanGames(db *sql.DB, lanId int) error {
	_, err := db.Exec("DELETE FROM lan_games WHERE lan_id = ?", lanId)
	return err
}

func AddLanGame(db *sql.DB, lanId int64, gameId int) (int64, error) {
	query := "INSERT OR IGNORE INTO lan_games(lan_id, game_id) VALUES (?, ?)"

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

func GetAwards(db *sql.DB) ([]AwardResponse, error) {
	var awards []AwardResponse
	rows, err := doQuery(db, "SELECT id, name FROM award;")
	if err != nil {
		return awards, err
	}
	defer rows.Close()
	for rows.Next() {
		var a AwardResponse
		if err := rows.Scan(&a.Id, &a.Name); err != nil {
			return awards, err
		}
		awards = append(awards, a)
	}
	return awards, nil
}

func GetAwardWithId(db *sql.DB, id int) (AwardResponse, error) {
	var a AwardResponse
	row, err := doQueryWithId(db, "SELECT id, name FROM award WHERE id = ?;", id)
	if err != nil {
		return a, err
	}
	defer row.Close()
	for row.Next() {
		if err := row.Scan(&a.Id, &a.Name); err != nil {
			return a, err
		}
	}
	return a, nil
}

func AddAward(db *sql.DB, name string) (int64, error) {
	result, err := db.Exec("INSERT INTO award(name) VALUES (?)", name)
	if err != nil {
		return 0, fmt.Errorf("AWARD INSERT ERROR: %v", err)
	}
	return result.LastInsertId()
}

func RemoveLanAwards(db *sql.DB, lanId int) error {
	_, err := db.Exec("DELETE FROM lan_awards WHERE lan_id = ?", lanId)
	return err
}

func AddLanAward(db *sql.DB, lanId int64, awardId int) (int64, error) {
	result, err := db.Exec("INSERT OR IGNORE INTO lan_awards(lan_id, award_id) VALUES (?, ?)", lanId, awardId)
	if err != nil {
		return 0, fmt.Errorf("AWARD INSERT ERROR: %v", err)
	}
	return result.LastInsertId()
}

type RsvpEntry struct {
	UserId   int      `json:"userId"`
	Name     string   `json:"name"`
	Nickname string   `json:"nickname,omitempty"`
	Color    string   `json:"color"`
	Color2   string   `json:"color2,omitempty"`
	Dates    []string `json:"dates"`
}

func AddRsvpDates(db *sql.DB, userId, lanId int, dates []string) error {
	tx, err := db.Begin()
	if err != nil {
		return fmt.Errorf("RSVP BEGIN ERROR: %v", err)
	}
	if _, err := tx.Exec("DELETE FROM rsvp WHERE user_id = ? AND lan_id = ?", userId, lanId); err != nil {
		tx.Rollback()
		return fmt.Errorf("RSVP DELETE ERROR: %v", err)
	}
	stmt, err := tx.Prepare("INSERT INTO rsvp(user_id, lan_id, date) VALUES(?, ?, ?)")
	if err != nil {
		tx.Rollback()
		return fmt.Errorf("RSVP PREPARE ERROR: %v", err)
	}
	defer stmt.Close()
	for _, date := range dates {
		if _, err := stmt.Exec(userId, lanId, date); err != nil {
			tx.Rollback()
			return fmt.Errorf("RSVP INSERT ERROR: %v", err)
		}
	}
	return tx.Commit()
}

func DeleteRsvp(db *sql.DB, userId, lanId int) error {
	_, err := db.Exec("DELETE FROM rsvp WHERE user_id = ? AND lan_id = ?", userId, lanId)
	return err
}

func GetRsvps(db *sql.DB, lanId int) ([]RsvpEntry, error) {
	query := `
		SELECT u.id, u.name, u.color, u.color2, u.nickname, r.date
		FROM rsvp r
		JOIN user u ON r.user_id = u.id
		WHERE r.lan_id = ?
		ORDER BY u.id, r.date
	`
	rows, err := db.Query(query, lanId)
	if err != nil {
		return nil, fmt.Errorf("RSVP QUERY ERROR: %v", err)
	}
	defer rows.Close()

	entryMap := make(map[int]*RsvpEntry)
	var order []int
	for rows.Next() {
		var userId int
		var name, date string
		var color, color2, nickname sql.NullString
		if err := rows.Scan(&userId, &name, &color, &color2, &nickname, &date); err != nil {
			return nil, err
		}
		if _, ok := entryMap[userId]; !ok {
			c := ""
			if color.Valid {
				c = color.String
			}
			c2 := ""
			if color2.Valid {
				c2 = color2.String
			}
			n := ""
			if nickname.Valid {
				n = nickname.String
			}
			entryMap[userId] = &RsvpEntry{UserId: userId, Name: name, Nickname: n, Color: c, Color2: c2}
			order = append(order, userId)
		}
		entryMap[userId].Dates = append(entryMap[userId].Dates, date)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	result := make([]RsvpEntry, 0, len(order))
	for _, id := range order {
		result = append(result, *entryMap[id])
	}
	return result, nil
}

func RemoveLanParticipant(db *sql.DB, lanId int64, userId int) error {
	_, err := db.Exec("DELETE FROM lan_participants WHERE lan_id = ? AND user_id = ?", lanId, userId)
	return err
}

func RemoveLanParticipants(db *sql.DB, lanId int) error {
	_, err := db.Exec("DELETE FROM lan_participants WHERE lan_id = ?", lanId)
	return err
}

func SetNickname(db *sql.DB, id int, nickname string, color string, color2 string) error {
	_, err := db.Exec("UPDATE user SET nickname = NULLIF(?, ''), color = ?, color2 = NULLIF(?, '') WHERE id = ?", nickname, color, color2, id)
	if err != nil {
		return fmt.Errorf("NICKNAME UPDATE ERROR: %v", err)
	}
	return nil
}

// UpdateLanParticipants removes participants not in userIds and inserts new ones,
// preserving the nickname column on existing rows.
func UpdateLanParticipants(db *sql.DB, lanId int, userIds []int) error {
	if len(userIds) == 0 {
		_, err := db.Exec("DELETE FROM lan_participants WHERE lan_id = ?", lanId)
		return err
	}
	placeholders := strings.Repeat("?,", len(userIds))
	placeholders = placeholders[:len(placeholders)-1]
	args := make([]interface{}, 0, len(userIds)+1)
	args = append(args, lanId)
	for _, id := range userIds {
		args = append(args, id)
	}
	if _, err := db.Exec(
		fmt.Sprintf("DELETE FROM lan_participants WHERE lan_id = ? AND user_id NOT IN (%s)", placeholders),
		args...,
	); err != nil {
		return err
	}
	for _, userId := range userIds {
		if _, err := db.Exec("INSERT OR IGNORE INTO lan_participants(lan_id, user_id) VALUES (?, ?)", lanId, userId); err != nil {
			return err
		}
	}
	return nil
}

func SetParticipantNickname(db *sql.DB, lanId, userId int, nickname string) error {
	_, err := db.Exec(
		"UPDATE lan_participants SET nickname = NULLIF(?, '') WHERE lan_id = ? AND user_id = ?",
		nickname, lanId, userId,
	)
	return err
}

func AddLanParticipant(db *sql.DB, lanId int64, userId int) (int64, error) {
	query := "INSERT OR IGNORE INTO lan_participants(lan_id, user_id) VALUES (?, ?)"

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

type Tag struct {
	Id   int    `json:"id"`
	Name string `json:"name"`
}

type LanImage struct {
	Id         int     `json:"id"`
	LanId      int     `json:"lanId"`
	Filename   string  `json:"filename"`
	UploadedBy int     `json:"uploadedBy,omitempty"`
	UploadedAt string  `json:"uploadedAt"`
	ExifDate   *string `json:"exifDate,omitempty"`
	Tags       []Tag   `json:"tags"`
}

func GetLanImages(db *sql.DB, lanId int) ([]LanImage, error) {
	rows, err := db.Query(
		"SELECT id, lan_id, filename, uploaded_by, uploaded_at, exif_date FROM lan_images WHERE lan_id = ? ORDER BY sort_order ASC, uploaded_at ASC",
		lanId,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var images []LanImage
	imageIdx := map[int]int{}
	for rows.Next() {
		var img LanImage
		var uploadedBy sql.NullInt64
		var exifDate sql.NullString
		if err := rows.Scan(&img.Id, &img.LanId, &img.Filename, &uploadedBy, &img.UploadedAt, &exifDate); err != nil {
			return nil, err
		}
		if uploadedBy.Valid {
			img.UploadedBy = int(uploadedBy.Int64)
		}
		if exifDate.Valid {
			img.ExifDate = &exifDate.String
		}
		img.Tags = []Tag{}
		imageIdx[img.Id] = len(images)
		images = append(images, img)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	tagRows, err := db.Query(
		"SELECT lit.image_id, t.id, t.name FROM lan_image_tag lit JOIN tag t ON lit.tag_id = t.id JOIN lan_images li ON lit.image_id = li.id WHERE li.lan_id = ? ORDER BY t.name ASC",
		lanId,
	)
	if err != nil {
		return nil, err
	}
	defer tagRows.Close()
	for tagRows.Next() {
		var imageId int
		var tag Tag
		if err := tagRows.Scan(&imageId, &tag.Id, &tag.Name); err != nil {
			return nil, err
		}
		if idx, ok := imageIdx[imageId]; ok {
			images[idx].Tags = append(images[idx].Tags, tag)
		}
	}
	return images, tagRows.Err()
}

func AddLanImage(db *sql.DB, lanId int, filename string, uploadedBy int, exifDate *string) (LanImage, error) {
	res, err := db.Exec(
		"INSERT INTO lan_images(lan_id, filename, uploaded_by, exif_date, sort_order) VALUES(?, ?, ?, ?, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM lan_images WHERE lan_id = ?))",
		lanId, filename, uploadedBy, exifDate, lanId,
	)
	if err != nil {
		return LanImage{}, err
	}
	id, _ := res.LastInsertId()
	var img LanImage
	var uploadedByNull sql.NullInt64
	var exifDateNull sql.NullString
	row := db.QueryRow(
		"SELECT id, lan_id, filename, uploaded_by, uploaded_at, exif_date FROM lan_images WHERE id = ?",
		id,
	)
	_ = row.Scan(&img.Id, &img.LanId, &img.Filename, &uploadedByNull, &img.UploadedAt, &exifDateNull)
	if uploadedByNull.Valid {
		img.UploadedBy = int(uploadedByNull.Int64)
	}
	if exifDateNull.Valid {
		img.ExifDate = &exifDateNull.String
	}
	img.Tags = []Tag{}
	return img, nil
}

func GetAllTags(db *sql.DB) ([]Tag, error) {
	rows, err := db.Query("SELECT id, name FROM tag ORDER BY name ASC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var tags []Tag
	for rows.Next() {
		var t Tag
		if err := rows.Scan(&t.Id, &t.Name); err != nil {
			return nil, err
		}
		tags = append(tags, t)
	}
	if tags == nil {
		tags = []Tag{}
	}
	return tags, rows.Err()
}

func AddImageTag(db *sql.DB, imageId int, tagName string) (Tag, error) {
	_, _ = db.Exec("INSERT OR IGNORE INTO tag(name) VALUES(?)", tagName)
	var tag Tag
	if err := db.QueryRow("SELECT id, name FROM tag WHERE name = ?", tagName).Scan(&tag.Id, &tag.Name); err != nil {
		return Tag{}, err
	}
	if _, err := db.Exec("INSERT OR IGNORE INTO lan_image_tag(image_id, tag_id) VALUES(?, ?)", imageId, tag.Id); err != nil {
		return Tag{}, err
	}
	return tag, nil
}

func RemoveImageTag(db *sql.DB, imageId, tagId int) error {
	_, err := db.Exec("DELETE FROM lan_image_tag WHERE image_id = ? AND tag_id = ?", imageId, tagId)
	return err
}

func ReorderLanImages(db *sql.DB, lanId int, ids []int) error {
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	for i, id := range ids {
		if _, err := tx.Exec("UPDATE lan_images SET sort_order = ? WHERE id = ? AND lan_id = ?", i+1, id, lanId); err != nil {
			tx.Rollback()
			return err
		}
	}
	return tx.Commit()
}

type UserLanEntry struct {
	LanId       int    `json:"lanId"`
	StartDate   string `json:"startDate"`
	EndDate     string `json:"endDate"`
	Event       string `json:"event"`
	Description string `json:"description"`
	FromDisplay string `json:"fromDisplay,omitempty"`
	ToDisplay   string `json:"toDisplay,omitempty"`
}

type UserProfile struct {
	Id       int           `json:"id"`
	Name     string        `json:"name"`
	Nickname string        `json:"nickname,omitempty"`
	Color    string        `json:"color"`
	Color2   string        `json:"color2,omitempty"`
	Lans     []UserLanEntry `json:"lans"`
}

func GetUserProfile(db *sql.DB, userId int) (UserProfile, error) {
	user, err := GetUserWithId(db, userId)
	if err != nil {
		return UserProfile{}, err
	}

	query := `
		SELECT lan.id, lan.start_date, lan.end_date, lan.event, lan.description,
		       lan.from_display, lan.to_display
		FROM lan
		JOIN lan_participants ON lan.id = lan_participants.lan_id
		WHERE lan_participants.user_id = ?
		ORDER BY lan.start_date ASC
	`
	rows, err := db.Query(query, userId)
	if err != nil {
		return UserProfile{}, err
	}
	defer rows.Close()

	var lans []UserLanEntry
	for rows.Next() {
		var entry UserLanEntry
		var fromDisplay, toDisplay sql.NullString
		if err := rows.Scan(&entry.LanId, &entry.StartDate, &entry.EndDate, &entry.Event, &entry.Description, &fromDisplay, &toDisplay); err != nil {
			return UserProfile{}, err
		}
		if fromDisplay.Valid {
			entry.FromDisplay = fromDisplay.String
		}
		if toDisplay.Valid {
			entry.ToDisplay = toDisplay.String
		}
		lans = append(lans, entry)
	}
	if lans == nil {
		lans = []UserLanEntry{}
	}

	return UserProfile{
		Id:       user.Id,
		Name:     user.Name,
		Nickname: user.Nickname,
		Color:    user.Color,
		Color2:   user.Color2,
		Lans:     lans,
	}, rows.Err()
}

func GetLanImageFilename(db *sql.DB, imageId int) (lanId int, filename string, err error) {
	row := db.QueryRow("SELECT lan_id, filename FROM lan_images WHERE id = ?", imageId)
	err = row.Scan(&lanId, &filename)
	return
}

func DeleteLanImageById(db *sql.DB, imageId int) error {
	_, err := db.Exec("DELETE FROM lan_images WHERE id = ?", imageId)
	return err
}

type LanQuote struct {
	Id           int    `json:"id"`
	LanId        int    `json:"lanId"`
	Quote        string `json:"quote"`
	AttributedTo string `json:"attributedTo,omitempty"`
	CreatedAt    string `json:"createdAt"`
}

func GetLanQuotes(db *sql.DB, lanId int) ([]LanQuote, error) {
	rows, err := db.Query(
		"SELECT id, lan_id, quote, COALESCE(attributed_to, ''), created_at FROM lan_quote WHERE lan_id = ? ORDER BY created_at ASC",
		lanId,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var quotes []LanQuote
	for rows.Next() {
		var q LanQuote
		if err := rows.Scan(&q.Id, &q.LanId, &q.Quote, &q.AttributedTo, &q.CreatedAt); err != nil {
			return nil, err
		}
		quotes = append(quotes, q)
	}
	if quotes == nil {
		quotes = []LanQuote{}
	}
	return quotes, rows.Err()
}

func AddLanQuote(db *sql.DB, lanId, createdBy int, quote, attributedTo string) (LanQuote, error) {
	res, err := db.Exec(
		"INSERT INTO lan_quote(lan_id, quote, attributed_to, created_by) VALUES(?, ?, NULLIF(?, ''), ?)",
		lanId, quote, attributedTo, createdBy,
	)
	if err != nil {
		return LanQuote{}, err
	}
	id, _ := res.LastInsertId()
	var q LanQuote
	db.QueryRow(
		"SELECT id, lan_id, quote, COALESCE(attributed_to, ''), created_at FROM lan_quote WHERE id = ?",
		id,
	).Scan(&q.Id, &q.LanId, &q.Quote, &q.AttributedTo, &q.CreatedAt)
	return q, nil
}

func DeleteLanQuote(db *sql.DB, quoteId int) error {
	_, err := db.Exec("DELETE FROM lan_quote WHERE id = ?", quoteId)
	return err
}

func UpdateLanQuote(db *sql.DB, quoteId int, quote, attributedTo string) (LanQuote, error) {
	_, err := db.Exec(
		"UPDATE lan_quote SET quote = ?, attributed_to = NULLIF(?, '') WHERE id = ?",
		quote, attributedTo, quoteId,
	)
	if err != nil {
		return LanQuote{}, err
	}
	var q LanQuote
	err = db.QueryRow(
		"SELECT id, lan_id, quote, COALESCE(attributed_to, ''), created_at FROM lan_quote WHERE id = ?",
		quoteId,
	).Scan(&q.Id, &q.LanId, &q.Quote, &q.AttributedTo, &q.CreatedAt)
	return q, err
}

type LanGuest struct {
	Id        int    `json:"id"`
	LanId     int    `json:"lanId"`
	Name      string `json:"name"`
	CreatedAt string `json:"createdAt"`
}

func GetLanGuests(db *sql.DB, lanId int) ([]LanGuest, error) {
	rows, err := db.Query(
		"SELECT id, lan_id, name, created_at FROM lan_guest WHERE lan_id = ? ORDER BY created_at ASC",
		lanId,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var guests []LanGuest
	for rows.Next() {
		var g LanGuest
		if err := rows.Scan(&g.Id, &g.LanId, &g.Name, &g.CreatedAt); err != nil {
			return nil, err
		}
		guests = append(guests, g)
	}
	if guests == nil {
		guests = []LanGuest{}
	}
	return guests, rows.Err()
}

func AddLanGuest(db *sql.DB, lanId int, name string) (LanGuest, error) {
	res, err := db.Exec(
		"INSERT INTO lan_guest(lan_id, name) VALUES(?, ?)",
		lanId, name,
	)
	if err != nil {
		return LanGuest{}, err
	}
	id, _ := res.LastInsertId()
	var g LanGuest
	db.QueryRow(
		"SELECT id, lan_id, name, created_at FROM lan_guest WHERE id = ?",
		id,
	).Scan(&g.Id, &g.LanId, &g.Name, &g.CreatedAt)
	return g, nil
}

func DeleteLanGuest(db *sql.DB, guestId int) error {
	_, err := db.Exec("DELETE FROM lan_guest WHERE id = ?", guestId)
	return err
}
