# SommerLAN — Claude context

## Go-live checklist

- **Gate is enabled**: `countdown.go` uses `if !gateTime.IsZero() ...`. To disable for dev, prepend `false &&`.

## Key patterns

**Year extraction**: always use `lan.startDate.substring(0, 4)` — never `new Date().getFullYear()` (NaN risk with partial dates).

**DB date fields**: `start_date`/`end_date` are always `YYYY-01-01`/`YYYY-12-31`. `from_display`/`to_display` are free-form human strings (e.g. "juli").

**Migrations**: add new columns in `setup.go` with `_, _ = db.Exec("ALTER TABLE ...")` — idempotent, safe to re-run. Then apply the same statement against the live DB file with `sqlite3`.

**Game save**: `AlterLan` calls `RemoveLanGames` then re-inserts — always send all checked game IDs in the PATCH, never a diff.

**Sort order**: `fetchLans` uses `for...of` + `await` (not `forEach`) to preserve insertion order. DB query orders by `start_date ASC`.

**Edit mode overlay**: pure CSS — `body:has(.editing)::before { opacity: 1 }` darkens page, `.editing` gets `z-index: 2` + page gradient background.

**Nav profile avatar**: `#profile-avatar` is `position: fixed; top: 1rem; right: 1.5rem` — populated by `nav.ts` with user initial + color.

**API URLs are relative**: all `fetch()` calls use `/api/...` (no `localhost:8080`). Safe for both dev and prod.

**Countdown gate**: `LanGateMiddleware` in `countdown.go` intercepts all HTML requests server-side and redirects to `countdown.html` until the gate time. Gate time is computed at startup by `ComputeLanGateTime` — queries the next upcoming LAN's `start_date` from the DB and returns the first Monday on or after that date at 13:37 local time. Client-side `nav.ts` does the same redirect for JS-loaded navigation.

**Image performance**: the image grid can hold 70+ photos. Anything adding absolutely-positioned children inside `.image-card` (overflow:hidden + border-radius) causes scroll jank — the tag strip feature was removed for this reason.

**RSVP dinner tracking**: `wants_dinner` is stored per row in `rsvp` (default 1). `renderDinnerTable` in `matrix.ts` only renders if at least one user has a dinner date — returns early otherwise.

## LAN lifecycle phases

The CSS class on `.timeline-event` (frontpage) and `#content` (subpage) drives colors and badges:

| Class | Condition | Color |
|---|---|---|
| `upcoming-far` | > 180 days away | faint purple |
| `upcoming-medium` | 60–180 days | medium purple |
| `upcoming-soon` | 14–60 days | vivid purple |
| `upcoming` | < 14 days | bright purple + pulse |
| `happening` | start ≤ now ≤ end | orange + pulse |
| `over` | ended < 7 days ago | grey-blue, badge "GG" |
| _(none)_ | > 7 days after end | historical, no badge |

## Common issues

| Problem | Cause | Fix |
|---|---|---|
| Port 8080 in use on restart | Old process didn't die | `fuser -k 8080/tcp` |
| Role not returned by `/api/auth/me/` | Running old binary | Kill + restart backend |
| NaN in year display | Using `new Date(dateStr)` on partial date | Use `.substring(0, 4)` |
| Games wiped on LAN save | Forgot to send game IDs in PATCH | Include all checked game inputs |
| LAN sort order changes | `forEach` async race | Use `for...of` + `await` |
| Image section scroll jank | Positioned children inside overflow:hidden cards | Strip back to bare `<img>` and add back one-by-one to isolate |
| Countdown redirect loop | `nav.ts` redirecting back to countdown after it hits zero | Both `countdown.ts` and `nav.ts` must read `LAN_START` from `config.ts`, not hardcode |
