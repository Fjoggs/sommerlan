# SommerLAN

Private LAN party website for a friend group. Go backend + TypeScript frontend, SQLite DB, Discord OAuth.

## Stack

- **Backend**: Go (`net/http` ServeMux), SQLite via `modernc.org/sqlite`, no ORM
- **Frontend**: TypeScript compiled to ES modules (`tsc`), plain HTML/CSS — no framework
- **Auth**: Discord OAuth2, Bearer tokens stored in `localStorage` or session cookie — `ExtractToken` checks both, sessions table in DB
- **DB**: `backend/sommerlan.db` (not `sommerlan.db` in root — that one is stale/ignored)

## Running

### Backend (dev)

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

`dist/` is gitignored — always run `npm run build` after pulling or changing any `.ts` file.

### Server settings

- `HOST` — listen address. Default `127.0.0.1` (localhost only, for running behind a reverse proxy such as nginx). Set `0.0.0.0` to listen on all interfaces.
- `PORT` — listen port (default `3000`).

## Project structure

```
backend/
  main.go                          — routes, server entry (DB_PATH + FRONTEND_PATH from env)
  internal/
    database/
      db.go                        — all SQL queries + structs (LanEvent, UserResponse, etc.)
      auth.go                      — session/Discord upsert queries
      setup.go                     — InitDB, schema, migrations (ALTER TABLE ... ADD COLUMN)
    handlers/
      auth.go                      — Discord OAuth flow, /api/auth/me/, UpdateMe
      nextlan.go                   — /api/next-lan/ (next LAN name/start/end; user or bot token)
      pages.go                     — NoCache, CleanURL and RequireLoginMiddleware (HTML → /login)
      lan.go                       — LAN CRUD + attend/unattend + images
      game.go                      — game CRUD + GetGameById
      user.go                      — user CRUD
      rsvp.go                      — RSVP endpoints
      middleware.go                — EnableCORS, requireAuth, requireAdmin

frontend/
  index.html                       — main page (timeline of LAN events)
  lan-event.html                   — LAN event subpage (images, participants, quotes, games)
  game.html                        — game detail page
  profile.html / etc.
  ts/
    frontpage.ts                   — LAN timeline, edit mode, attend/unattend, lifecycle phases
    lan-event.ts                   — event subpage: images, participants, quotes, lightbox
    game-detail.ts                 — game detail page
    nav.ts                         — nav init (avatar, hamburger, impersonation banner)
    auth.ts                        — requireAuth(), authHeaders(), token helpers
    crud.ts                        — fetchAll() / fetchById() helpers
    types.ts                       — LAN, User, Game, RsvpEntry types
    matrix.ts                      — BLOCKS, GAMES, RACES constants; renderMatrix(), renderCards(), renderDinnerTable()
  css/
    style.css                      — main styles, design tokens, lifecycle phase colors
    inputs.css                     — form/input base styles (loaded on most pages)
  dist/                            — compiled JS output (gitignored — always rebuild after pull)
  uploads/lan/{id}/                — original images
  uploads/lan/{id}/thumbs/         — thumbnails (~600px, served in image grid)
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
rsvp        — user_id, lan_id, date, wants_dinner (1/0, default 1)
```

Migrations are done inline in `setup.go` via `_, _ = db.Exec("ALTER TABLE ...")` — safe to re-run.

## Roles

- Only `role = 'admin'` users can use mutation endpoints (POST/PATCH/DELETE lan/game/user)
- Currently only Fjoggs/PekkyD (id=2) is admin
- To promote a user: `UPDATE user SET role = 'admin' WHERE id = ?`
- Frontend: `.nav-admin` elements hidden for non-admins, edit button hidden on frontpage

See `CLAUDE.md` for coding patterns and gotchas.
