# ADR 0001 — Beef Game System

**Status:** Accepted  
**Date:** 2026-06-06

---

## Context

Beefs currently resolve by community vote-weight: whichever side accumulates more wagered coins wins. This makes the community the decision-maker, which removes agency from the two players involved.

The goal is to add mini-games (RPS, Mastermind, Tic-Tac-Toe, Reaction Test) so the players themselves determine the winner, while the community retains a betting role.

---

## Decisions

### 1. Game result determines the winner — not vote totals

Community votes become bets on a predicted outcome. The actual winner is determined by the game. Correct bettors share the coin pool as before. This preserves the community's skin-in-the-game without letting them control the result.

### 2. One `beef_games` table with JSONB `state`

**Considered:** separate table per game type (`beef_rps_games`, `beef_tictactoe_games`, …).  
**Chosen:** single table, `game_type` discriminator, `state JSONB`.  
**Why:** adding a new game requires only a new `GameHandler` service and a registry entry — zero schema migrations. The state shape is the Game Handler's contract, not the database's.

### 3. Hybrid transport: REST for turn-based, WebSocket for Reaction Test

Turn-based games (RPS, TicTacToe, Mastermind) use `POST /beefs/:id/game/move` — simple, stateless, easy to validate.  
The Reaction Test requires simultaneous presence and millisecond timing, so it uses the existing `/hidden-beef` WebSocket namespace with a `game:go` server trigger.  
**Why not all-WebSocket:** adds socket auth complexity and reconnect handling for games where it buys nothing.

### 4. Server measures Reaction Test timing — no client timestamps trusted

Server records the moment it emits `game:go`. Server records the moment it receives `game:reaction_click` from each player. Delta is computed server-side only.  
**Why:** client timestamps are trivially spoofable.

### 5. Both players must press Ready (explicit handshake) before `in_game`

The 30-minute fight window (`game_deadline_at`) requires both players to confirm presence. If only one confirms before the deadline, that player wins automatically. If neither confirms, the beef closes as a tie.  
**Why:** the Reaction Test requires simultaneous online presence; an implicit "first move = ready" cannot satisfy that constraint. Unified across all game types for consistency.

### 6. Move timeout per turn, duration via `SystemSettings`

Key: `game.move_timeout_seconds`, default 180. Owner-adjustable without redeployment.  
Player whose turn it is when `move_deadline_at` expires loses automatically. Checked by `BeefScheduler` (1-min interval, existing pattern).  
**Why per-turn and not per-game:** prevents stalling by disconnecting mid-game.

### 7. Client derives viewer role — no socket authentication

The WebSocket room `beef:{id}` broadcasts a single `game:state_update` event to all members. Clients compare their own `userId` against `beef.initiator_id` / `beef.target_id` to determine if they are a player or spectator.  
**Why not server-side role events:** would require socket-level JWT authentication (not currently implemented). Move validation remains server-side regardless, so the security boundary is not weakened.

### 8. Emote-only community interaction during `in_game`

Votes locked after `ends_at` (transition to `game_pending`). Comments remain open through `game_pending` and `in_game`. Comment coin rewards still apply.  
**Why:** betting after the first game move would let observers place informed bets, destroying the odds.

---

## New states added to BeefStatus

| New State | Trigger | What's allowed |
|---|---|---|
| `game_pending` | `ends_at` reached (scheduler) | Comments only; Ready handshake |
| `in_game` | Both players Ready | Comments; game moves |

---

## Consequences

- `BeefResolutionService.computeWinner` must accept an external `winnerId` (from game) instead of deriving it from vote totals. Vote pool distribution logic stays unchanged.
- `CreateBeefDto` gains a required `game_type` field.
- `Beef` entity gains `game_type` and `game_deadline_at` columns.
- New migration required for `beef_games` table and new Beef columns.
- `BeefScheduler` gains two new checks: `game_pending` deadline and `in_game` move deadline.
