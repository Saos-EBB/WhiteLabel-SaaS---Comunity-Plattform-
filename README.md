
# White-Label Community Platform

> A modular, white-label SaaS community platform — full-stack, real-time, GDPR-compliant, and payment-ready.

![Status](https://img.shields.io/badge/status-in_development-orange)
![Backend](https://img.shields.io/badge/backend-NestJS-red)
![Frontend](https://img.shields.io/badge/frontend-Next.js-black)
![Database](https://img.shields.io/badge/database-PostgreSQL_+_PostGIS-blue)

🔗 **[Live Demo (coming soon)](#)** · **[B2B Showcase Page](#)**

---

## About

The final project of my Junior Full-Stack Developer certification — a production-grade, white-label community platform shipped in three modular tiers (Core, Connect, Premium) and re-skinnable per client.

### Motivation

Built to prove that a developer trained primarily in classical software engineering can ship a modern full-stack web platform end-to-end — real-time, payment-ready, GDPR-compliant, and accessible by design.

---

## What's Inside

The platform comes in two configurations sharing the same backbone:

**Light Mode** — the regulated community side
GDPR-compliant infrastructure (AES-256, pseudonymization, Art. 15 export), accessibility by design (WCAG-oriented), real-time chat, Stripe subscriptions, full moderation suite, PostGIS-based discovery, vulnerable user protection.

**Dark Mode** — the engagement & monetization layer
Live public "beef" battle system (15min–48h), coin economy with Stripe coin packages, weighted lottery payouts, hidden zone access (rotating film passwords), highscore leaderboard, exile mechanic with auto-resolution.

### License Tiers

| Tier | Light Mode | Dark Mode |
|---|---|---|
| **Core** | Auth, profile, chat, moderation, Stripe | Beef battles, voting, exile |
| **Connect** | + push, groups, caretakers, orgs | + coin economy, badges, rewards |
| **Premium** | + video chat, matching, ratings | + distribution engine, hidden zone, analytics |

---

## Tech Stack

- **Backend** — NestJS, TypeORM, EventEmitter2
- **Frontend** — Next.js 16, React, Tailwind
- **Database** — PostgreSQL 16 + PostGIS 3.4
- **Real-time** — Socket.io WebSockets
- **Payments** — Stripe (subscriptions + webhooks)
- **Security** — AES-256-CBC, bcrypt, JWT + HttpOnly refresh tokens, SHA-256+salt email hashing
- **Deployment** — Railway-ready, Docker

---

## Repository Structure

Monorepo combining frontend and backend in subfolders, with the full commit history of both preserved.

```
.
├── frontend/   # Next.js application
└── backend/    # NestJS API + WebSocket gateway
```

For setup, environment variables, and architecture details, see:
- [`frontend/README.md`](./frontend/README.md)
- [`backend/README.md`](./backend/README.md)

---

## Status

Active development. Core feature set is functional; currently in final integration and QA phase.

---

## About the Developer

Built by **Kevin Schaberl** (SaoS) — Junior Full-Stack Developer.

Background in classical software development, around six months into web full-stack with TypeScript, NestJS, and Next.js.

📫 Contact via the [B2B Showcase Page](#) or GitHub.
