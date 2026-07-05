# Multiplayer "Star Rush" — Plan

## What already exists (don't rebuild)

A working multiplayer scaffold is already in the repo under `src/games/roadtest/multiplayer/` (~1,300 LOC) and `supabase/migrations/20260705053945_*.sql`. It covers most of your spec:

- **Backend tables**: `game_matches` (code, host_id, status, seed, duration_s) and `game_match_players` (match_id, user_id, display_name, color, stars). RLS policies scoped to auth.uid + match membership. Both tables are in the `supabase_realtime` publication.
- **Realtime**: Supabase Realtime **Broadcast** at ~10 Hz for `{x, y, angle, speed, stars}` per player, plus **Presence** for join/leave and stale-row detection. `star_taken` events sync pickups.
- **Deterministic shared world**: `worldGen.ts` builds a 6×6 grid city from the match `seed` using a mulberry32 PRNG so every client renders identical roads, obstacles, and star spawn points.
- **Lobby**: `MultiplayerLobby.tsx` — host creates a match, gets a 4-char code, picks a duration from **three preset chips (2/3/5 min)**, up to 5 unique-color slots. Others join by code.
- **Round loop**: shared 3-2-1 countdown, live scoreboard, countdown timer, `star_taken` broadcast, `Podium.tsx` with gold/silver/bronze + rematch.
- **Star economy** (already in `MultiplayerScene.ts`): pickup +1, crash −3 and scatters, traffic-light violation −2, speeding −1. Star count is floored at 0.

## Real gaps vs. your new spec

| # | Your requirement | Status | Gap |
|---|---|---|---|
| 1 | Public list of open lobbies (not just code) | ❌ | Add a "Join a public match" screen listing `game_matches` where `status='lobby'` and player-count < 5 |
| 2 | Host sets the time limit | ⚠️ Partial | Currently three preset chips; upgrade to a free-form 1–10 min picker (still stored in `duration_s`) |
| 3 | Star loss on all traffic violations | ✅ Coded | Verify in a live 2-tab test; adjust penalties if too harsh/soft |
| 4 | Up to 5 players cap | ✅ | Enforced in lobby; add a server-side guard via `check_join_allowed` RPC to prevent race on the 5-slot cap |
| 5 | "Open world" feel | ⚠️ | Existing city is a fine 6×6 grid; polish pass (more star density, mini-map, camera smoothing) will make it feel bigger |
| 6 | Mobile fit | ⚠️ | Test scoreboard + timer at 390px; likely needs 1–2 CSS tweaks |
| 7 | Broaden access | ⚠️ | Currently gated to admin+instructor at `/simulator`. Confirm you want to open the multiplayer entry to **all logged-in students** (single-player is already opened per prior request) |

## Stages, in order

**Stage A — Audit & fix (must-do before opening it up)**
1. Two-tab live playtest: host + join, confirm world sync, star pickup sync, violation penalties, timer end → podium.
2. Fix any bugs surfaced (typical: presence race on the countdown, colors not unique, timer drift).

**Stage B — Public matchmaking**
3. Add a `PublicMatchList` component that polls (or realtime-subscribes to) open lobbies filtered by `status='lobby'` and current player-count < 5.
4. Add a `SECURITY DEFINER` RPC `join_open_match(match_code)` that atomically re-checks status+capacity to close the join-race.

**Stage C — Host-configurable time limit**
5. Replace the three duration chips with a numeric stepper (60s–600s, 30s increments). No schema change — `duration_s` is already int.

**Stage D — Feel & polish**
6. Increase star density and add a corner mini-map showing all 5 players + star clusters.
7. Camera smoothing / follow lerp; violation flash on the offending player only.
8. Mobile CSS pass at 390px.

**Stage E — Access & release**
9. If you want students in, remove the `/simulator` role gate specifically for the multiplayer entry point (keep single-player rules per your existing memory).
10. Add a "Last 10 matches" summary on the student profile so admins/instructors can see who played and the outcomes (uses existing `game_match_players.stars`).

## Backend approach (unchanged, already correct)

- **Supabase Realtime Broadcast** for position/state (cheap, ephemeral, not persisted).
- **Supabase Realtime Presence** for connect/disconnect + "who's in the lobby."
- **Postgres tables** only for durable state: the match record, the player roster, and final scores. That is exactly the current design and it's the right one — no need to introduce a separate WebSocket server.
- **Client-trust** model for now (each client reports its own position and star count). Called out in code; hardening (server-authoritative validation via an edge function) is a separate later stage if cheating becomes a real concern.

## Credit / message estimate

These are rough; multiplayer testing usually needs a couple of iteration rounds because bugs only surface with two live tabs.

| Stage | Realistic message range |
|---|---|
| A — Audit & bug-fix pass (2-tab test + likely 2 fixes) | 6 – 12 |
| B — Public lobby list + atomic-join RPC (1 migration + 1 component) | 5 – 8 |
| C — Free-form time picker | 1 – 2 |
| D — Star density + mini-map + camera + mobile polish | 8 – 14 |
| E — Access change + player history summary | 4 – 7 |
| **Total** | **~24 – 43 messages** |

Two things swing it:
- If Stage A turns up a Realtime desync bug (e.g. seed drift, presence flapping), add ~5 messages.
- If you want server-authoritative anti-cheat later, that's another ~10–15 on top (edge function + score reconciliation).

## Assumptions worth confirming before I build

1. Multiplayer entry stays at `/simulator` under the existing role gate, OR opens to all logged-in students (please pick).
2. Time limit range: **60s–600s in 30s steps** is fine, or do you want different bounds?
3. Public lobby list should be visible to any logged-in player who can enter the game — no separate "friends only" mode.
4. Rematch reuses the same seed, or generates a new one? (Current code resets scores but keeps the seed.)
