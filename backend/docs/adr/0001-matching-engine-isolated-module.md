# ADR 0001 — Matching Engine as isolated, swappable module

**Status:** Accepted  
**Date:** 2026-06-09

## Context

The platform needs a Discover/Swipe feature. The Match Score algorithm (interest overlap + distance) is deliberately simple at launch, but expected to evolve — e.g. density-adaptive skip expiry, weighted flags, ML signals. If the algorithm is scattered across the controller or service layer it becomes hard to change without touching unrelated code.

## Decision

The matching algorithm lives exclusively in `MatchingService` inside `src/modules/core/matching/`. All other code (controller, swipe recording, match creation) calls only the public interface of `MatchingService` and never reimplements scoring logic. The module has no outward dependencies on other feature modules — only on `Profile`, `UserInterest`, and `Swipe` data.

## Consequences

- Replacing or tuning the algorithm requires touching one file.
- The module boundary makes it straightforward to extract into a separate service later if scoring becomes expensive.
- Slightly more indirection than inlining the query — accepted trade-off.

## Alternatives considered

- **Inline in ProfileService:** rejected — couples profile management to discovery logic.
- **Pre-computed queue via background job:** deferred — not needed at current scale. On-demand query with good indexes is sufficient.
