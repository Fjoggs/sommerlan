# SommerLAN

Private LAN party website for a friend group. Go backend + TypeScript frontend, SQLite DB, Discord OAuth.

## Stack

- **Backend**: Go (`net/http` ServeMux), SQLite via `modernc.org/sqlite`, no ORM
- **Frontend**: TypeScript compiled to ES modules (`tsc`), plain HTML/CSS — no framework
- **Auth**: Discord OAuth2, Bearer tokens stored in `localStorage`, sessions table in DB
- **DB**: `backend/sommerlan.db` (not `sommerlan.db` in root — that one is stale/ignored)

## Running

### Backend

Needs Discord env vars. Always source `run.sh`:

```bash
cd backend
source run.sh   # sets env vars AND runs `go run .`
```

If port 8080 is already in use (old process still running):

```bash
fuser -k 8080/tcp   # kills whatever holds the port
```

Then restart. Verify with `curl http://localhost:8080/api/health/`.

### Frontend

```bash
cd frontend
npm run build   # compiles TS → dist/
```

Frontend is served as static files by the Go backend at `/`. No separate dev server needed.

## Project structure

```
backend/
  main.go                          — routes, server entry
  internal/
    database/
      db.go                        — all SQL queries + structs (LanEvent, UserResponse, etc.)
      auth.go                      — session/Discord upsert queries
      setup.go                     — InitDB, schema, migrations (ALTER TABLE ... ADD COLUMN)
    handlers/
      auth.go                      — Discord OAuth flow, /api/auth/me/, UpdateMe
      lan.go                       — LAN CRUD + attend/unattend
      game.go                      — game CRUD
      user.go                      — user CRUD
      rsvp.go                      — RSVP endpoints
      middleware.go                — EnableCORS, requireAdmin

frontend/
  index.html                       — main page (timeline of LAN events)
  profile.html / rsvp.html / etc.
  ts/
    frontpage.ts                   — LAN timeline, edit mode, attend/unattend
    nav.ts                         — nav init: hides .nav-pre-lan after LAN_START, populates
                                     #profile-avatar circle, hides .nav-admin for non-admins
    auth.ts                        — requireAuth(), authHeaders(), token helpers
    crud.ts                        — fetchAll() helper
    types.ts                       — LAN, User, Game, RsvpEntry types
  css/
    style.css                      — main styles, design tokens, .menu, .timeline-event, etc.
    inputs.css                     — form/input base styles (loaded on most pages)
  dist/                            — compiled JS output (gitignored? check)
```

## DB schema (key tables)

```sql
user        — id, name, color, discord_id, nickname, role ('user'|'admin')
lan         — id, start_date, end_date, event ('pre'|'main'|'side'), description,
              from_display, to_display   (free-text month strings, e.g. "juli")
lan_participants — lan_id, user_id
lan_games        — lan_id, game_id
game        — id, name
sessions    — token, user_id
rsvp        — user_id, date
```

Migrations are done inline in `setup.go` via `_, _ = db.Exec("ALTER TABLE ...")` — safe to re-run.

## Roles

- Only `role = 'admin'` users can use mutation endpoints (POST/PATCH/DELETE lan/game/user)
- Currently only Fjoggs/PekkyD (id=2) is admin
- To promote a user: `UPDATE user SET role = 'admin' WHERE id = ?`
- Frontend: `.nav-admin` elements hidden for non-admins, edit button hidden on frontpage

## Key patterns

**Year extraction**: always use `lan.startDate.substring(0, 4)` — never `new Date().getFullYear()` (NaN risk with partial dates).

**DB date fields**: `start_date`/`end_date` are always `YYYY-01-01`/`YYYY-12-31`. `from_display`/`to_display` are free-form human strings (e.g. "juli").

**Migrations**: add new columns in `setup.go` with `_, _ = db.Exec("ALTER TABLE ...")` then run the same migration against the live DB file with sqlite3.

**Game save**: `AlterLan` calls `RemoveLanGames` then re-inserts — always send all checked game IDs in the PATCH.

**Sort order**: `fetchLans` uses `for...of` + `await` (not `forEach`) to preserve insertion order. DB query orders by `start_date ASC`.

**Edit mode overlay**: pure CSS — `body:has(.editing)::before { opacity: 1 }` darkens page, `.editing` gets `z-index: 2` + page gradient background.

**Nav profile avatar**: `#profile-avatar` is `position: fixed; top: 1rem; right: 1.5rem` — populated by `nav.ts` with user initial + color.

## Common issues

| Problem | Cause | Fix |
|---|---|---|
| Port 8080 in use on restart | Old process didn't die | `fuser -k 8080/tcp` |
| Role not returned by `/api/auth/me/` | Running old binary | Kill + restart backend |
| NaN in year display | Using `new Date(dateStr)` on partial date | Use `.substring(0, 4)` |
| Games wiped on LAN save | Forgot to send game IDs in PATCH | Include all checked game inputs |
| LAN sort order changes | `forEach` async race | Use `for...of` + `await` |
