---
name: context
description: Domain glossary for the XXX platform
---

# Domain Glossary

## Beef

A public conflict between two users (Initiator and Target) that goes through a defined lifecycle and is resolved by a mini-game. The community watches and bets on the outcome.

**Beef Status lifecycle:**
`pending_approval` → `waiting` → `active` → `game_pending` → `in_game` → `closed` | `chickened`

- `pending_approval` — created by Initiator, awaiting admin approval
- `waiting` — approved, Target must accept or chicken out (within 24 h)
- `active` — Target accepted; Betting Phase is open until `ends_at`
- `game_pending` — Betting Phase ended; both players have until `game_deadline_at` (30 min) to press Ready
- `in_game` — both players pressed Ready; the Beef Game is being played
- `closed` — game finished; Winner determined
- `chickened` — Target never accepted; Target gets exile + chicken_count++

**Initiator** — the user who creates the Beef.

**Target** — the user challenged by the Initiator.

**Game Type** — chosen by the Initiator at creation time. Determines which mini-game resolves the Beef. Target can accept or reject a Beef based on its Game Type.

**Winner** — determined solely by the Beef Game result, not by vote totals.

---

## Beef Game

The mini-game that resolves a Beef. Each game is implemented as a **Game Handler** — a service that satisfies the `GameHandler` interface — and registered in the **Game Registry**.

**Game Handler** — implements: `gameType`, `realtime`, `createInitialState()`, `applyMove()`, `getWinner()`, `getPlayerToMove()`.

**Game Registry** — a map of `game_type → GameHandler`. Adding a new game requires only a new Handler and a new entry in the registry — no schema migration.

**Game State** — stored as JSONB in `beef_games.state`. Shape is game-specific and owned by the Game Handler.

**Move Deadline** — per-move timer (`move_deadline_at` on the `beef_games` record). If expired, the player whose turn it was loses. Duration controlled by `SystemSettings` key `game.move_timeout_seconds`.

**Realtime Game** — a Game Handler with `realtime: true`. Moves travel over the `/hidden-beef` WebSocket namespace instead of REST. Currently: Reaction Test only.

**No-Draw Rule** — no Beef Game may end in a draw. If a draw occurs within a game, play continues until a winner is determined (extra round, new code, etc.).

**RPS (Rock-Paper-Scissors)** — extensible move set (e.g. Lizard, Spock can be added later). Both choices hidden until both submitted. No draw possible due to No-Draw Rule → re-play until winner.

**TicTacToe** — Best of 3 series. A drawn board counts as an extra game (No-Draw Rule). Initiator = X, Target = O.

**Mastermind** — Single shared secret code (same code for both players). Both guess simultaneously. Fastest correct solve wins. If both solve in same number of guesses → new game with new code.

---

## Betting Phase

The period during which the community places Bets on a Beef. Active while the Beef status is `active`, until `ends_at`. No new Bets accepted after `ends_at`.

**Bet** — a community member's wagered coins on either the Initiator or the Target (stored as `beef_votes`). Bets are placed during the Betting Phase; they are locked once the Beef moves to `game_pending`.

**Correct Bettors** — community members who bet on the side that matches the Winner. They share the community portion of the Coin Pool.

**Coin Pool** — sum of all wagered coins. Distributed on resolution: 40 % to Winner, 5 % lottery to Correct Bettors (up to 10 winners, ticket-weighted), remainder stays in platform.

---

## Ready Handshake

The two-step gate between `game_pending` and `in_game`. Both the Initiator and Target must press Ready within the 30-minute fight window (`game_deadline_at`). If only one presses Ready before `game_deadline_at`, that player wins automatically. If neither presses Ready, the Beef closes as a Tie.

---

## Reaction Test

A real-time Beef Game where both players are online simultaneously. The server emits a `game:go` WebSocket event; both players respond with `game:reaction_click`. The server measures round-trip time from its own clock — no client timestamps trusted. Faster response wins.

---

## Exile

A 24-hour cooldown applied to both players after a Beef closes (win or lose) or after a Chicken. During exile a user cannot initiate a new Beef. Exile is cleared automatically on the next Beef creation attempt if the timestamp has passed.

---

## Coin

Platform currency. Earned by participating in Beefs (opening, commenting, winning). Spent on Bets. Packages: sardine / thunfisch / hai / moby_dick (hardcoded in CoinService).

---

## Tooth

A trophy earned by the Winner of a closed Beef. Collected from the Loser. 15 unconverted Teeth can be combined into a ToothChain.

---

## Badge

A temporary profile decoration (winner / loser) created when a Beef closes. Expires after `duration_seconds × 4` milliseconds.

---

## Exile

See above under Beef.

---

## Hidden Zone

The feature area containing Beef, Coin, Teeth, and Badge. Accessible only to authenticated users. Lives under `src/modules/hidden/`.

---

## Emote Mode

During `in_game` and `game_pending` states, community members may post comments (emotes/reactions) but cannot place new Bets. Comment coin rewards still apply (up to 3 comments per user per Beef).
