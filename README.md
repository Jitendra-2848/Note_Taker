# Secure Note-Taking System with Expiring Share Links

A full-stack, enterprise-grade note-sharing application engineered with **Next.js 16 (App Router), PostgreSQL, and Redis**. Built to solve real-world concurrency, ephemeral data storage, dynamic access authorization, and high-throughput read scaling.

---

## 📖 Project Overview

This platform enables users to create and manage private notes while generating highly configurable, self-destructing share links. Unlike standard sharing tools, every link is backed by cryptographic key derivation and atomic database row locking to guarantee:

- **Zero Race Conditions**: Single-read notes cannot be double-consumed, even under millisecond-level concurrent requests.
- **Granular Access Control**: Support for unauthenticated public links or dynamically generated bcrypt-hashed password keys.
- **Accurate Telemetry**: Strict view analytics that differentiate legitimate reads from unauthorized attempts.
- **High-Throughput Caching**: Multi-tier caching capable of absorbing viral traffic spikes without database connection starvation.

---

## ✨ Features

- **Granular Expiry Settings**:
  - `ONE_TIME`: Auto-destructs immediately after the first successful unlock.
  - `TIME_BASED`: Remains accessible until a predefined duration (1h, 6h, 24h, 3d, 7d) or an exact custom date/time.
- **Flexible Access Modes**:
  - `PUBLIC`: Instant zero-friction access without passwords.
  - `PROTECTED`: Dynamically generated high-entropy access key hashed using Bcrypt.
- **Atomic Concurrency Protection**:
  - Dual-layer protection using Redis `SETNX` in-memory locks and PostgreSQL atomic row transactions.
- **Immediate Administrative Revocation**:
  - One-click instant revocation that purges active links across all distributed caches in real time.
- **Accurate View Analytics**:
  - View counts increment strictly on authorized views; incorrect password guesses and expired hits are isolated.
- **Comprehensive Audit Logs**:
  - Captures timestamp, IP address (`x-forwarded-for`), browser user-agent, and status (`SUCCESS`, `WRONG_PASSWORD`, `EXPIRED`, `ALREADY_USED`, `REVOKED`, `RACE_BLOCKED`).
- **Modern UI & Dual-Theme Experience**:
  - Fully responsive, glassmorphic UI with seamless Dark and Light theme toggle without layout shift or hydration flicker.

---

## 🛠️ Tech Stack

| Layer                       | Technologies                                                                                      |
| :-------------------------- | :------------------------------------------------------------------------------------------------ |
| **Frontend**                | Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS v4, Lucide Icons                    |
| **Backend API**             | Next.js 16 App Router Route Handlers (`app/api/`)                                                  |
| **Database & ORM**          | PostgreSQL (Neon Serverless with pgBouncer pooling) via Prisma ORM 5.x                            |
| **Caching & Locking**       | Redis Cloud (ioredis) + In-Process Node.js V8 Heap Memory Cache                                   |
| **Authentication**          | Dual-Token JWT (15-min Access Token + 7-day Refresh Token in HttpOnly cookies) + Google OAuth 2.0 |
| **Security & Cryptography** | Bcrypt (10 salt rounds), Node.js `crypto` CSPRNG, Sliding-Window Rate Limiting                    |

---

## 🏗️ System Architecture

```
                                ┌───────────────────────────┐
                                │   Client (Browser / PWA)  │
                                └─────────────┬─────────────┘
                                              │
                         HTTP / JSON Requests │ (Rate-Limited by IP/Token)
                                              ▼
                                ┌───────────────────────────┐
                                │   Next.js 16 App Router   │
                                └─────────────┬─────────────┘
                                              │
                                               │
                                               ▼
                                 ┌───────────────────────────┐
                                 │ Next.js 16 Route Handlers │
                                 │  • /api/auth/*            │
                                 │  • /api/notes/*           │
                                 │  • /api/share/[token]/*   │
                                 └─────────────┬─────────────┘
                                               │
                                               ▼
         ┌────────────────────────────────────────────────────────┐
         │              Tiered Scalability Layer                  │
         │  1. L1 In-Process Node.js Heap Cache (0.01ms)          │
         │  2. L2 Redis Distributed Cache & SETNX Locks (1ms)     │
         │  3. Async Batched View Counter Buffer                  │
         └────────────────────────────┬───────────────────────────┘
                                      │
                                      ▼
         ┌────────────────────────────────────────────────────────┐
         │       PostgreSQL Database (Neon Connection Pooler)     │
         │  • Atomic Serialized Transactions (UPDATE ... RETURNING)│
         │  • B-Tree Indexed Lookups on Tokens & Timestamps       │
         └────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Entities (High-Level Overview)

The persistence layer uses a normalized relational model organized into four core domain entities:

- **Users**: Manages user accounts, authentication credentials (bcrypt password hashes), profiles, and note ownership.
- **Notes**: Stores note titles, markdown contents, author associations, and creation metadata.
- **ShareLinks**: Represents individual sharing rules tied to a note. Stores unique URL tokens, share duration types (`ONE_TIME` vs `TIME_BASED`), access control modes (`PUBLIC` vs `PROTECTED`), hashed dynamic access keys, expiration timestamps, usage flags, revocation states, and view metrics.
- **AccessLogs**: Tracks real-time telemetry for every share link interaction, capturing requester IP address, client browser user-agent, access outcome, and access timestamps.

---

## 🔌 API Endpoints

### Authentication

- `POST /api/auth/register` — Create a new user account with hashed credentials.
- `POST /api/auth/login` — Authenticate user, issuing access & refresh cookies.
- `POST /api/auth/refresh` — Rotate and renew access tokens using a valid refresh token.
- `POST /api/auth/logout` — Clear session cookies.
- `GET /api/auth/me` — Retrieve currently authenticated user context.
- `GET /api/auth/google` — Initiate Google OAuth 2.0 flow (with local mock fallback).
- `GET /api/auth/google/callback` — Exchange OAuth code and establish user session.

### Notes Management

- `GET /api/notes` — Fetch all notes owned by the authenticated user with share link metadata.
- `POST /api/notes` — Create a note and generate its primary share link.
- `GET /api/notes/:id` — Retrieve a specific note by ID.
- `PUT /api/notes/:id` — Update note title or content.
- `DELETE /api/notes/:id` — Delete note and cascade-delete its share links.
- `POST /api/notes/:id/share` — Generate an additional share link for an existing note.

### Share Link Operations

- `GET /api/share/:token` — Resolve link status, metadata, or public note content.
- `POST /api/share/:token` — Atomic unlock for protected notes or consumption of one-time links.
- `POST /api/share/:token/revoke` — Force-revoke a share link in real time.

---

## 🔑 Authentication & Authorization

- **Dual-Token Architecture**:
  - **Access Token**: Short-lived (15 minutes), signed with `JWT_SECRET`, transmitted via `HttpOnly`, `SameSite=Lax` cookies.
  - **Refresh Token**: Long-lived (7 days), signed with `JWT_REFRESH_SECRET`, stored securely for silent background re-authentication without interrupting user workflows.
- **Google OAuth 2.0**: Native OAuth integration with an automated local test simulator for instant zero-config testing.
- **Route Authorization**: Strict server-side verification using `getCurrentUser()` across all mutation routes.

---

## 📝 Note Management

- **Markdown Composer**: Clean, full-featured text editor supporting structured formatting.
- **Dynamic Duration Presets**: Rapid presets (1 hour, 6 hours, 24 hours, 3 days, 7 days) alongside an exact custom datetime picker.
- **Multi-Link Generation**: Create multiple independent share links per note with different permission sets (e.g. one public link for team members, one password-protected link for external clients).

---

## ⏳ Expiring Share Links

- **One-Time Access (`ONE_TIME`)**:
  - Consumed and burned permanently upon first successful read.
  - Subsequent access displays an informational `ALREADY_USED` status banner.
- **Time-Based Access (`TIME_BASED`)**:
  - Remains readable until `expiresAt`.
  - Expiration verified dynamically at query time: `("expiresAt" IS NULL OR "expiresAt" > CURRENT_TIMESTAMP)`.
- **Force Revocation**:
  - Note owners can revoke links at any point, instantly invalidating active sessions and distributed cache entries.

---

## 🛡️ Security Considerations

1. **Race-Condition & Double-Spend Prevention**:
   - **Distributed Lock**: Redis `SETNX` (`SET lock:token 1 EX 60 NX`) claims the link in $<1\text{ ms}$.
   - **Atomic SQL Serializer**: Single-query atomic row mutation (`UPDATE "ShareLink" SET "isUsed" = true WHERE "token" = $1 AND "isUsed" = false`). Exactly one request updates the row; all concurrent requests fail and receive HTTP 410.
2. **Brute-Force Rate Limiting**:
   - Tiered sliding-window rate limiters across all critical paths:
     - Auth routes: 10 requests / minute.
     - Note creation: 30 requests / minute.
     - Public reads: 200 requests / minute.
     - Password unlock attempts: **5 attempts / 15 minutes** per token/IP combination.
3. **Dynamic Password Entropy**:
   - Dynamic keys generated via `crypto.randomBytes(12).toString('base64url')` providing 72 bits of cryptographic entropy.
   - Hashed using `bcryptjs` (work factor 10) to make automated dictionary attacks computationally prohibitive.
4. **Environment Isolation**:
   - Production secrets strictly required in environment variables; zero hardcoded fallback keys.

---

## ⚠️ Error Handling

The application follows consistent, typed JSON error contracts with machine-readable error codes:

| HTTP Status             | Error Code                        | Description                                                |
| :---------------------- | :-------------------------------- | :--------------------------------------------------------- |
| `400 Bad Request`       | `VALIDATION_ERROR`                | Missing or malformed parameters.                           |
| `401 Unauthorized`      | `UNAUTHORIZED` / `WRONG_PASSWORD` | Missing session cookie or invalid access key.              |
| `404 Not Found`         | `NOT_FOUND`                       | Share link does not exist or has been deleted.             |
| `410 Gone`              | `EXPIRED`                         | Share link has passed its expiry timestamp.                |
| `410 Gone`              | `ALREADY_USED`                    | One-time link was previously consumed.                     |
| `410 Gone`              | `REVOKED`                         | Share link was manually revoked by the owner.              |
| `410 Gone`              | `RACE_CONDITION_BLOCKED`          | Concurrent request blocked to preserve one-time guarantee. |
| `429 Too Many Requests` | `RATE_LIMITED`                    | Throttled by rate limiter; includes `Retry-After` header.  |

---

## 🚀 Installation & Setup

### Prerequisites

- Node.js 20.x or higher
- PostgreSQL database instance (local or hosted via Neon / Supabase)
- _(Optional)_ Redis instance for distributed locks and rate limiting

### 1. Clone the Repository

```bash
git clone https://github.com/Jitendra-2848/Note_Taker.git
cd Note_Taker
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Database

```bash
# Push schema to database
npx prisma db push

# (Optional) Seed demo user and sample notes
npx tsx prisma/seed.ts
```

---

## 🔐 Environment Variables

Create a `.env` file in the root directory:

```env
# PostgreSQL Connection String (supports pooled connections)
DATABASE_URL="postgresql://user:password@host:5432/neondb?sslmode=require"

# JWT Signing Secrets (minimum 32 characters)
JWT_SECRET="your-256-bit-jwt-access-secret-minimum-32-characters"
JWT_REFRESH_SECRET="your-256-bit-jwt-refresh-secret-minimum-32-characters"

# Base Application URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Optional Redis Connection (falls back to PostgreSQL atomic queries if omitted)
REDIS_URL="redis://default:password@your-redis-host:6379"

# Optional Google OAuth 2.0 Credentials (leave dummy to use local OAuth simulator)
GOOGLE_CLIENT_ID="dummy-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="dummy-client-secret"
```

---

## 💻 Running the Project

### Development Mode

```bash
npm run dev
```

Access the application at [http://localhost:3000](http://localhost:3000).

### Production Build

```bash
npm run build
npm run start
```

### Automated End-to-End & Concurrency Tests

```bash
node x.js
```

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).

## Author

Jitendra Prajapati
