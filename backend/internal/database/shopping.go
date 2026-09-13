package database

import (
	"database/sql"
	"errors"
)

var ErrShoppingListCompleted = errors.New("shopping list is completed")
var ErrShoppingNotFound = errors.New("shopping list or item not found")

type ShoppingItem struct {
	Id        int    `json:"id"`
	ListId    int    `json:"listId"`
	Name      string `json:"name"`
	Quantity  int    `json:"quantity"`
	Checked   bool   `json:"checked"`
	CreatedAt string `json:"createdAt"`
}

type ShoppingListSummary struct {
	Id           int    `json:"id"`
	Name         string `json:"name"`
	Status       string `json:"status"`
	CreatedAt    string `json:"createdAt"`
	CompletedAt  string `json:"completedAt,omitempty"`
	ItemCount    int    `json:"itemCount"`
	LanId        *int   `json:"lanId,omitempty"`
	HideQuantity bool   `json:"hideQuantity"`
}

type ShoppingListDetail struct {
	Id           int            `json:"id"`
	Name         string         `json:"name"`
	Status       string         `json:"status"`
	CreatedAt    string         `json:"createdAt"`
	CompletedAt  string         `json:"completedAt,omitempty"`
	Items        []ShoppingItem `json:"items"`
	LanId        *int           `json:"lanId,omitempty"`
	HideQuantity bool           `json:"hideQuantity"`
}

func nullableUserId(userId *int) sql.NullInt64 {
	if userId == nil {
		return sql.NullInt64{}
	}
	return sql.NullInt64{Int64: int64(*userId), Valid: true}
}

func nullableLanId(lanId *int) sql.NullInt64 {
	if lanId == nil {
		return sql.NullInt64{}
	}
	return sql.NullInt64{Int64: int64(*lanId), Valid: true}
}

func lanIdPtr(n sql.NullInt64) *int {
	if !n.Valid {
		return nil
	}
	v := int(n.Int64)
	return &v
}

func GetUserByDiscordId(db *sql.DB, discordId string) (*UserResponse, error) {
	var user UserResponse
	var color, color2, nickname sql.NullString
	err := db.QueryRow(
		`SELECT id, name, color, color2, nickname, role FROM user WHERE discord_id = ?`,
		discordId,
	).Scan(&user.Id, &user.Name, &color, &color2, &nickname, &user.Role)
	if err != nil {
		return nil, err
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
	return &user, nil
}

func GetShoppingLists(db *sql.DB) ([]ShoppingListSummary, error) {
	rows, err := db.Query(
		`SELECT l.id, l.name, l.status, l.created_at, COALESCE(l.completed_at, ''), l.lan_id, l.hide_quantity,
		        (SELECT COUNT(*) FROM shopping_item i WHERE i.list_id = l.id)
		 FROM shopping_list l
		 ORDER BY l.created_at DESC`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	lists := []ShoppingListSummary{}
	for rows.Next() {
		var l ShoppingListSummary
		var lanId sql.NullInt64
		if err := rows.Scan(&l.Id, &l.Name, &l.Status, &l.CreatedAt, &l.CompletedAt, &lanId, &l.HideQuantity, &l.ItemCount); err != nil {
			return nil, err
		}
		l.LanId = lanIdPtr(lanId)
		lists = append(lists, l)
	}
	return lists, rows.Err()
}

func getShoppingItems(db *sql.DB, listId int) ([]ShoppingItem, error) {
	rows, err := db.Query(
		`SELECT id, list_id, name, quantity, checked, created_at FROM shopping_item WHERE list_id = ? ORDER BY created_at ASC, id ASC`,
		listId,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []ShoppingItem{}
	for rows.Next() {
		var i ShoppingItem
		if err := rows.Scan(&i.Id, &i.ListId, &i.Name, &i.Quantity, &i.Checked, &i.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	return items, rows.Err()
}

func GetShoppingListById(db *sql.DB, id int) (*ShoppingListDetail, error) {
	var l ShoppingListDetail
	var completedAt sql.NullString
	var lanId sql.NullInt64
	err := db.QueryRow(
		`SELECT id, name, status, created_at, completed_at, lan_id, hide_quantity FROM shopping_list WHERE id = ?`,
		id,
	).Scan(&l.Id, &l.Name, &l.Status, &l.CreatedAt, &completedAt, &lanId, &l.HideQuantity)
	if err == sql.ErrNoRows {
		return nil, ErrShoppingNotFound
	}
	if err != nil {
		return nil, err
	}
	if completedAt.Valid {
		l.CompletedAt = completedAt.String
	}
	l.LanId = lanIdPtr(lanId)

	items, err := getShoppingItems(db, id)
	if err != nil {
		return nil, err
	}
	l.Items = items
	return &l, nil
}

func CreateShoppingList(db *sql.DB, name string, createdBy *int, lanId *int) (*ShoppingListDetail, error) {
	res, err := db.Exec(
		`INSERT INTO shopping_list(name, status, created_by, lan_id) VALUES(?, 'active', ?, ?)`,
		name, nullableUserId(createdBy), nullableLanId(lanId),
	)
	if err != nil {
		return nil, err
	}
	id, _ := res.LastInsertId()
	return GetShoppingListById(db, int(id))
}

func RenameShoppingList(db *sql.DB, id int, name string) (*ShoppingListDetail, error) {
	if _, err := db.Exec(`UPDATE shopping_list SET name = ? WHERE id = ?`, name, id); err != nil {
		return nil, err
	}
	return GetShoppingListById(db, id)
}

func SetShoppingListLan(db *sql.DB, id int, lanId *int) (*ShoppingListDetail, error) {
	if _, err := db.Exec(`UPDATE shopping_list SET lan_id = ? WHERE id = ?`, nullableLanId(lanId), id); err != nil {
		return nil, err
	}
	return GetShoppingListById(db, id)
}

func SetShoppingListHideQuantity(db *sql.DB, id int, hideQuantity bool) (*ShoppingListDetail, error) {
	if _, err := db.Exec(`UPDATE shopping_list SET hide_quantity = ? WHERE id = ?`, hideQuantity, id); err != nil {
		return nil, err
	}
	return GetShoppingListById(db, id)
}

// SetShoppingListStatus flips a list between "active" and "completed", setting/clearing completed_at.
func SetShoppingListStatus(db *sql.DB, id int, status string) (*ShoppingListDetail, error) {
	if status == "completed" {
		if _, err := db.Exec(`UPDATE shopping_list SET status = 'completed', completed_at = datetime('now') WHERE id = ?`, id); err != nil {
			return nil, err
		}
	} else {
		if _, err := db.Exec(`UPDATE shopping_list SET status = 'active', completed_at = NULL WHERE id = ?`, id); err != nil {
			return nil, err
		}
	}
	return GetShoppingListById(db, id)
}

func DeleteShoppingList(db *sql.DB, id int) error {
	_, err := db.Exec(`DELETE FROM shopping_list WHERE id = ?`, id)
	return err
}

// AddShoppingItem fails with ErrShoppingListCompleted if the list has already been finished.
func AddShoppingItem(db *sql.DB, listId int, name string, quantity int, createdBy *int) (*ShoppingItem, error) {
	var status string
	err := db.QueryRow(`SELECT status FROM shopping_list WHERE id = ?`, listId).Scan(&status)
	if err == sql.ErrNoRows {
		return nil, ErrShoppingNotFound
	}
	if err != nil {
		return nil, err
	}
	if status != "active" {
		return nil, ErrShoppingListCompleted
	}

	if quantity < 1 {
		quantity = 1
	}
	res, err := db.Exec(
		`INSERT INTO shopping_item(list_id, name, quantity, created_by) VALUES(?, ?, ?, ?)`,
		listId, name, quantity, nullableUserId(createdBy),
	)
	if err != nil {
		return nil, err
	}
	id, _ := res.LastInsertId()

	var i ShoppingItem
	err = db.QueryRow(
		`SELECT id, list_id, name, quantity, checked, created_at FROM shopping_item WHERE id = ?`,
		id,
	).Scan(&i.Id, &i.ListId, &i.Name, &i.Quantity, &i.Checked, &i.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &i, nil
}

func SetShoppingItemQuantity(db *sql.DB, itemId int, quantity int) (*ShoppingItem, error) {
	if quantity < 1 {
		quantity = 1
	}
	if _, err := db.Exec(`UPDATE shopping_item SET quantity = ? WHERE id = ?`, quantity, itemId); err != nil {
		return nil, err
	}
	return getShoppingItemById(db, itemId)
}

func SetShoppingItemChecked(db *sql.DB, itemId int, checked bool) (*ShoppingItem, error) {
	if _, err := db.Exec(`UPDATE shopping_item SET checked = ? WHERE id = ?`, checked, itemId); err != nil {
		return nil, err
	}
	return getShoppingItemById(db, itemId)
}

func getShoppingItemById(db *sql.DB, itemId int) (*ShoppingItem, error) {
	var i ShoppingItem
	err := db.QueryRow(
		`SELECT id, list_id, name, quantity, checked, created_at FROM shopping_item WHERE id = ?`,
		itemId,
	).Scan(&i.Id, &i.ListId, &i.Name, &i.Quantity, &i.Checked, &i.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, ErrShoppingNotFound
	}
	if err != nil {
		return nil, err
	}
	return &i, nil
}

func DeleteShoppingItem(db *sql.DB, itemId int) error {
	_, err := db.Exec(`DELETE FROM shopping_item WHERE id = ?`, itemId)
	return err
}
