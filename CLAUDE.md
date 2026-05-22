# SommerLAN

Event management site for a recurring LAN party. Dark theme, Norwegian UI text.

## Running the project

```bash
# Backend (from /backend)
go run main.go          # serves on :8080

# Frontend (from /frontend)
npm run dev             # tsc --watch, outputs to dist/
npx serve               # static file server
```

## Architecture

**Backend**: Go, SQLite (`sommerlan.db`), stdlib `net/http`
- `backend/internal/handlers/` — one file per resource (lan, game, user, rsvp)
- `backend/internal/database/db.go` — all DB queries and response types
- `backend/internal/database/setup.go` — schema (CREATE TABLE IF NOT EXISTS)
- `backend/main.go` — route registration

**Frontend**: Vanilla TS, no framework, compiled via `tsc`
- `frontend/ts/` — source files, compiled to `frontend/dist/ts/`
- `frontend/css/` — separate files per concern: `style.css` (globals/variables), `inputs.css` (form elements), `table.css`, `rsvp.css`, `headings.css`

## Data model

```
user        (id, name, color)
game        (id, name)
lan         (id, start_date, end_date, event TEXT, description)
lan_games           (lan_id, game_id)
lan_participants    (lan_id, user_id)
lan_participant_days (lan_id, user_id, date TEXT)  -- ISO date e.g. "2026-07-14"
```

`event` field values: `"pre"` | `"main"` | `"side"` — blank event = won't render on frontpage.

## API

All endpoints under `/api/`, trailing slash required, CORS enabled.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/lan/` | All LAN events with participants+games |
| GET | `/api/lan/{id}/` | Single LAN |
| POST | `/api/lan/` | Create LAN |
| DELETE | `/api/lan/{id}/` | Delete LAN |
| GET | `/api/user/` | All users |
| POST | `/api/user/` | Create user |
| PATCH | `/api/user/` | Update user |
| DELETE | `/api/user/{id}/` | Delete user |
| GET | `/api/game/` | All games |
| POST | `/api/game/` | Create game |
| DELETE | `/api/game/{id}/` | Delete game |
| POST | `/api/rsvp/` | Submit RSVP — body: `lanId`, `userId`, `dates[]` (ISO strings) |

Frontend uses `frontend/ts/crud.ts` helpers: `fetchAll`, `fetchById`, `create`, `deleteEntry`.

## RSVP page (`frontend/rsvp.html`)

- Finds the upcoming LAN automatically (earliest `endDate >= today` from `/api/lan/`)
- Displays participants and their attending dates as colored vertical ribbons (user's color)
- Form has grouped date toggles (Pre-pre-LAN / Pre-LAN / SommerLAN 2026) with a `*` select-all button per group
- Dates are hardcoded for SommerLAN 2026 (July 14–26) in both the HTML and `rsvp.ts` GROUPS constant — update both when the event changes

## CSS conventions

- Design tokens in `:root` in `style.css` — always use variables, don't hardcode colors
- Color palette: `oklch()` throughout
- Key variables: `--bg`, `--bg-light`, `--bg-dark`, `--text`, `--text-muted`, `--primary`, `--danger`, `--danger-dark`, `--danger-border`, `--border`, `--border-muted`, `--border-radius`, `--shadow`
- `rsvp.css` has `--slot-width` and `--name-width` with a `@media (max-width: 540px)` breakpoint
- `inputs.css` globally styles `label:has(input[type="checkbox"])` — override with `!important` in page-specific CSS when needed (see `.date-toggle`)
- `form { display: flex; flex-direction: column }` is a global default in `style.css`

## TypeScript notes

- All imports use `.js` extensions (compiled output)
- Top-level `await` is used freely (ES modules)
- `types.ts` exports: `LAN`, `Participant`, `User`, `Game`
- `Participant` extends `User` with `dates: string[]`
