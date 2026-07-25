-- Migrate legacy banterbot `shopping` table into sommerlan's shopping_list/shopping_item.
--
-- Usage:
--   sqlite3 /path/to/sommerlan.db < migrate_shopping.sql
--
-- Edit BANTERBOT_DB_PATH below before running. Safe to run only ONCE — re-running
-- will duplicate rows (each migrated list is tagged '(migrert)' in its name so you
-- can spot dupes / clean up with a DELETE ... WHERE name LIKE '%(migrert)%' if needed).

ATTACH DATABASE '/home/fjogen/projects/banterbot/banterbot-database.db' AS bb;

BEGIN TRANSACTION;

-- Same statements as setup.go's InitDB — idempotent, so this is a no-op if the
-- backend has already been deployed and created them itself.
CREATE TABLE IF NOT EXISTS shopping_list (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_by INTEGER REFERENCES user(id),
    created_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT
);
CREATE TABLE IF NOT EXISTS shopping_item (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    list_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    checked INTEGER NOT NULL DEFAULT 0,
    created_by INTEGER REFERENCES user(id),
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (list_id) REFERENCES shopping_list(id) ON DELETE CASCADE
);

-- One shopping_list per legacy row. Old data has no per-row timestamp, so we
-- synthesize ascending created_at values (1 minute apart, anchored in the past)
-- to preserve original ordering without colliding with real/current lists.
INSERT INTO shopping_list (name, status, created_at, completed_at)
SELECT
    'Liste #' || shoppingId || ' (migrert)',
    CASE WHEN completed = 1 THEN 'completed' ELSE 'active' END,
    datetime('2023-01-01 00:00:00', '+' || (ROW_NUMBER() OVER (ORDER BY shoppingId)) || ' minutes'),
    CASE WHEN completed = 1
         THEN datetime('2023-01-01 00:00:00', '+' || (ROW_NUMBER() OVER (ORDER BY shoppingId)) || ' minutes')
         ELSE NULL END
FROM bb.shopping
ORDER BY shoppingId;

-- Split each legacy comma-separated `items` blob into individual shopping_item rows.
-- Quantity is always 1 since the old format never encoded structured quantities
-- (numbers/multipliers like "4x cola zero" are free text, kept verbatim in the name).
-- checked=1 for items belonging to completed lists (per user decision — the old
-- schema had no per-item checked state, so "list completed" is treated as "all bought").
WITH RECURSIVE split(shoppingId, completed, item, rest) AS (
    SELECT shoppingId, completed, '', items || ','
    FROM bb.shopping
    UNION ALL
    SELECT shoppingId,
           completed,
           trim(substr(rest, 1, instr(rest, ',') - 1)),
           substr(rest, instr(rest, ',') + 1)
    FROM split
    WHERE rest <> ''
)
INSERT INTO shopping_item (list_id, name, quantity, checked, created_at)
SELECT
    sl.id,
    s.item,
    1,
    CASE WHEN s.completed = 1 THEN 1 ELSE 0 END,
    sl.created_at
FROM split s
JOIN shopping_list sl ON sl.name = 'Liste #' || s.shoppingId || ' (migrert)'
WHERE s.item <> '';

COMMIT;

DETACH DATABASE bb;
