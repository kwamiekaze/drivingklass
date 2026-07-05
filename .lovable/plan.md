# Star Rush Multiplayer

Add a real-time multiplayer mode to the road-test game at `/simulator`. Everything lives under `src/games/roadtest/` plus two new Supabase tables. Route gating and single-player features stay as they are.

## Backend (one migration)

New tables in `public`:

- **game_matches** — `id uuid pk`, `code text unique` (4-char), `host_id uuid`, `status text default 'lobby'` (`lobby`/`playing`/`finished`), `duration_s int`, `seed int`, `started_at timestamptz`, `created_at timestamptz default now()`.
- **game_match_players** — `match_id uuid fk → game_matches`, `user_id uuid`, `display_name text`, `color text`, `stars int default 0`, `joined_at timestamptz default now()`, `pk (match_id, user_id)`.

Grants + RLS:

- `authenticated` gets full CRUD; `service_role` gets ALL.
- `game_matches`: anyone authenticated can SELECT (needed to look up by code); INSERT only if `host_id = auth.uid()`; UPDATE only by host.
- `game_match_players`: SELECT if you're a player in that match (helper `public.is_match_player(uuid, uuid)` security-definer to avoid recursion); INSERT/UPDATE/DELETE only your own row (`user_id = auth.uid()`).
- Realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE ...` for both tables so lobby joins update live.

## Feature files

New under `src/games/roadtest/multiplayer/`:

- `types.ts` — `PlayerState`, `MatchRow`, `PlayerRow`, `NetMessage` union (`state` / `star_taken` / `star_respawn` / `start` / `end`).
- `worldGen.ts` — seeded RNG (mulberry32) that builds the 6×6 block city: road grid, intersections with lights/stop signs, cones + parked cars along roads, and ~25 star spawn points. Same seed = identical world on every client.
- `MultiplayerScene.ts` — Phaser scene: top-down camera follows own car, renders city tiles culled to viewport, updates local car physics, detects collisions/violations locally against seeded obstacles, applies scoring rules, broadcasts state at 10 Hz. Interpolates remote cars toward last known `{x,y,angle}`. Renders name tags + gold boundary.
- `net.ts` — thin wrapper around `supabase.channel(match_id)` with typed broadcasts + presence for disconnect detection (5s silence → grey scoreboard row). Client-trust model, commented as such.
- `MultiplayerLobby.tsx` — Host / Join UI: create match (2/3/5 min), 4-char code (`GK7X` style, uppercase alphanum, uniqueness retried), player list with color chips, host START.
- `MultiplayerGame.tsx` — mounts Phaser scene, HUD overlay: big countdown top-center, own star count, live scoreboard top-right (self highlighted gold), violation flash. Uses existing `TouchControls` and `sound.ts` for effects.
- `Podium.tsx` — 1st/2nd/3rd gold/silver/bronze cards, full standings, confetti reuse, host-only Rematch (same lobby, new seed → resets scores + status back to `playing`) and Back to Menu.
- `MultiplayerRoot.tsx` — small state machine: `menu → lobby → playing → podium`.

Wire-up:

- `RoadTestGame.tsx`: add `'multiplayer'` screen; render `MultiplayerRoot` when active.
- `StartScreen.tsx`: new button `Multiplayer: Star Rush` under the existing button row.
- `roadtest.css`: styles for lobby cards, code display, scoreboard, countdown, podium (gold/silver/bronze), color chips.

## Scoring rules (local, matches spec)

- Star pickup: +1, sound `starPickup()`.
- Crash into parked car OR another player: −3, drop 3 scatter stars near crash for anyone; sound `collision()`.
- Cone: −1. Red light: −2. Stop sign: −2. Speeding >45mph in city: −1 (throttled 5s).
- Never below 0. `stars` piggybacks on 10 Hz state broadcast.

## Netcode

- Channel: `supabase.channel('match:' + matchId, { config: { broadcast: { self: false }, presence: { key: userId } } })`.
- 10 Hz state broadcasts (throttled in scene update loop). Remote cars lerp toward latest target each frame.
- Star pickup: broadcast `{starId}`. First seen wins locally via a `Set<takenIds>` guard; duplicates ignored. Each taken star schedules a deterministic 12s respawn at the next seeded position in a round-robin queue (identical on every client — no coordinator needed).
- Round end: 5s after START, timer decrements. When it hits zero, host broadcasts `end`; all clients freeze, each persists their own final `stars` to `game_match_players`, host flips match `status = 'finished'`.

## Acceptance test (two browsers)

1. Browser A (host, admin/instructor): open `/simulator` → Multiplayer: Star Rush → Host, pick 2 min → gets code `GK7X`, sees self in lobby.
2. Browser B (second admin/instructor): Multiplayer: Star Rush → Join → enter `GK7X` → both lobbies show two players with distinct colors.
3. Host presses START → both clients count down 3-2-1 → both cars appear in the same city (verify identical building layout).
4. Drive A into a star → both scoreboards +1 for A; star vanishes on both screens; respawns 12s later.
5. A collides with B → both see −3, scatter stars appear; violation flashes.
6. Timer reaches 0 → podium shows correct winner + full standings on both clients.
7. Row visible in `game_matches` with `status = 'finished'`; two rows in `game_match_players` with final stars.

## Scope guardrails

- Only new files under `src/games/roadtest/multiplayer/`, small edits to `RoadTestGame.tsx` / `StartScreen.tsx` / `roadtest.css`, and one migration.
- Route protection unchanged (`admin`, `instructor`, `student` on `/simulator` — per current App.tsx).
- Client-trust model documented in a header comment in `net.ts` for future hardening.
