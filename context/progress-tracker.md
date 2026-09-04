# Progress Tracker — Secure Note-Taking Application

Update this file after every meaningful implementation change or architectural decision.

## Current Phase

- **Phase 1: Project Alignment & Context Setup** (Completed)
- **Phase 2: Full-Stack Implementation** (Completed)
- **Phase 3: Security, Scalability, CI/CD & Design Polish** (Completed)

## Roadmap & Target

- Production-ready PERN Stack application meeting all architectural and concurrency criteria.

## Current Status
- **Architecture**: Next.js 16 (App Router), React 19, Tailwind CSS v4, Hono.js router, Prisma ORM, Neon PostgreSQL, Redis Cloud (ioredis).
- **Authentication**: Dual-token architecture (15-minute Access Token + 7-day Refresh Token), Google OAuth 2.0 with local mock simulator fallback, Bcrypt password hashing.
- **Concurrency & Locking**: In-memory Redis SETNX distributed lock with Neon PostgreSQL atomic row-level update fallback.
- **Cache & Rate-Limiting**: Redis sliding-window brute-force lock by client IP (5 failed attempts / 15 min per IP) + 300s in-memory note caching.
- **UI & Experience**: Dark/Light mode on all pages, custom datetime expiry, responsive mobile navigation, audit access logging.
- **Code Quality**: Cleaned all unnecessary comments; verified 0 build errors across all 17 routes.

## Completed Work Checklist

- [x] **Database & Cloud Storage**: Connected live **Neon PostgreSQL** via `DATABASE_URL`. Removed local `dev.db`.
- [x] **Scalability Indexes**: Configured database indexes on `Note(userId, createdAt)`, `ShareLink(noteId, token, isUsed, isRevoked, expiresAt)`, and `AccessLog(shareLinkId, accessedAt)`.
- [x] **Hono.js Router**: Built high-speed API routes in `lib/hono-share.ts` with clean middleware.
- [x] **Viewer Audit Logging**: Added `AccessLog` model recording client IP (`x-forwarded-for`), User-Agent, timestamp, and status for every access attempt.
- [x] **First-Come First-Served Concurrency**: Single-query atomic SQL update locks one-time notes so only the first request succeeds; subsequent concurrent requests receive a polite 410 "already claimed" message.
- [x] **Brute-Force Attack Mitigation**: Offending users are blocked by their IP in Redis after 5 failed password attempts in 15 minutes, preserving note access for all other legitimate users.
- [x] **Note Editing**: Inline editor on `/notes/[id]` with `PUT /api/notes/[id]`.
- [x] **Note Search & Category Filters**: Real-time keyword search and category pills (`All`, `Active`, `Protected`, `One-Time`, `Public`) on dashboard.
- [x] **Direct Link Revocation**: One-click revocation from home page (`/`) which deletes and removes the link immediately.
- [x] **Auth-Gated Note Composition**: `/notes/new` requires authentication; unauthenticated users are redirected.
- [x] **Warm Minimalist Design System**: Editorial typography (`Inter` for UI, `Lora` for notes, `JetBrains Mono` for keys), paper canvas (`#faf9f7`), terracotta accent (`#d4735e`), and 3-category header.
- [x] **Automated CI/CD**: Created `.github/workflows/ci.yml` running linting, typechecking, and Next.js production builds on every push/PR.
- [x] **Production Build Validation**: Next.js production build succeeds with 0 errors across all 14 routes.

## Architectural Invariants

1. **Strict Single-Note Isolation**: Any share link accesses **only its parent note** (`where: { token }, select: { title, content }`).
2. **First-Come, First-Served Serialization**: One-time notes burn atomically on first read. Simultaneous race conditions fail with row count = 0.
3. **Audit Accuracy**: Failed password attempts never increment view counts and are recorded in `AccessLog` with `WRONG_PASSWORD`.
4. **Immediate Revocation Removal**: Revoking a link permanently deletes it from the database and active UI.
