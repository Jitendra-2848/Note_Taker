# Note-Taking App with Secure Expiring Share Links

A full-stack, production-ready web application built with **Next.js 16, Hono.js, PostgreSQL (Prisma ORM), and Redis**. It enables users to create notes, generate time-limited and self-destructing share links, enforce dynamic key authentication, prevent concurrent race conditions, and track accurate view analytics.

---

## 🛠️ Tech Stack Used

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS v4, Lucide Icons
- **Backend API**: Hono.js router mounted within Next.js Route Handlers
- **Database & ORM**: PostgreSQL (Neon Serverless with connection pooling) via Prisma ORM 5.x
- **Caching & Locking**: Redis Cloud (ioredis) + In-Process Node.js V8 Memory Cache
- **Authentication**: Dual-Token JWT (15-min Access Token + 7-day Refresh Token in HttpOnly cookies) + Google OAuth 2.0
- **Security**: Bcrypt password hashing, crypto-random dynamic keys, sliding-window rate limiting

---

## ⚙️ Setup Instructions

### 1. Prerequisites
- Node.js 20.x or higher
- PostgreSQL database URL (e.g. Neon, Supabase, or local Postgres)
- *(Optional)* Redis URL (system automatically falls back to PostgreSQL atomic locking if Redis is not configured)

### 2. Clone & Install
```bash
git clone https://github.com/Jitendra-2848/Note_Taker.git
cd Note_Taker
npm install
```

### 3. Environment Configuration
Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```
Populate `.env` with your values:
```env
DATABASE_URL="postgresql://user:password@host:5432/neondb?sslmode=require"
JWT_SECRET="your-256-bit-access-secret-minimum-32-chars"
JWT_REFRESH_SECRET="your-256-bit-refresh-secret-minimum-32-chars"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
REDIS_URL="redis://default:password@your-redis-host:6379" # Optional
```

### 4. Database Setup & Seeding
```bash
# Push schema to database
npx prisma db push

# (Optional) Seed demo user and sample notes
npx tsx prisma/seed.ts
```

### 5. Run Application
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 6. Run Automated Concurrency & Load Tests
```bash
node x.js
```

---

## 🗄️ Database Schema

```prisma
model User {
  id           String      @id @default(uuid())
  email        String      @unique
  passwordHash String
  name         String?
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
  notes        Note[]
}

model Note {
  id         String      @id @default(uuid())
  title      String
  content    String
  userId     String
  user       User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt  DateTime    @default(now())
  updatedAt  DateTime    @updatedAt
  shareLinks ShareLink[]

  @@index([userId])
  @@index([createdAt])
}

model ShareLink {
  id           String      @id @default(uuid())
  noteId       String
  note         Note        @relation(fields: [noteId], references: [id], onDelete: Cascade)
  token        String      @unique @default(uuid())
  shareType    String      @default("TIME_BASED") // ONE_TIME | TIME_BASED
  accessType   String      @default("PUBLIC")     // PUBLIC | PROTECTED
  passwordHash String?                            // Nullable bcrypt hash of access key
  plainKey     String?                            // Unhashed key displayed once to creator
  expiresAt    DateTime?                          // Nullable expiry timestamp
  isUsed       Boolean     @default(false)
  isRevoked    Boolean     @default(false)
  viewCount    Int         @default(0)
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
  accessLogs   AccessLog[]

  @@index([noteId])
  @@index([token, isUsed, isRevoked])
  @@index([expiresAt])
}

model AccessLog {
  id          String    @id @default(uuid())
  shareLinkId String
  shareLink   ShareLink @relation(fields: [shareLinkId], references: [id], onDelete: Cascade)
  ipAddress   String?
  userAgent   String?
  status      String    // SUCCESS | WRONG_PASSWORD | EXPIRED | ALREADY_USED | REVOKED | RACE_BLOCKED
  accessedAt  DateTime  @default(now())

  @@index([shareLinkId])
  @@index([accessedAt])
}
```

---

## 🔄 Share Link Flow (Point-to-Point)

1. **Note Creation (`/notes/new`)**:
   - User inputs Title and Content.
   - Selects **Share Type**: `ONE_TIME` (burns on first read) or `TIME_BASED` (accessible until expiry).
   - Selects **Access Type**: `PUBLIC` (opens directly) or `PROTECTED` (requires access key).
   - Selects **Expiry Window**: 1h, 6h, 24h, 3d, 7d, or a custom exact date/time picker.

2. **Link & Key Generation**:
   - Generates a unique 64-character URL token: `/share/[token]`.
   - If `PROTECTED`, automatically generates a cryptographically random 16-character access key (`crypto.randomBytes`).
   - The password hash (`bcrypt.hash(key, 10)`) is stored in the database; the plain key is shown to the creator with a 1-click copy button.

3. **Public Access Flow**:
   - Recipient navigates to `/share/[token]`.
   - Server checks revocation and expiration.
   - If valid, renders note content immediately and records a successful view.

4. **Password-Protected Access Flow**:
   - Recipient navigates to `/share/[token]`.
   - Content is withheld. A password modal is displayed.
   - Correct key unlocks the note and increments view count by 1.
   - Incorrect key returns `401 WRONG_PASSWORD` with 0 view count change and logs the attempt.

---

## 🔒 Core Logic & Architecture (Point-to-Point)

### 1. Password / Key Generation Logic
- High-entropy dynamic access keys generated via `crypto.randomBytes(12).toString('base64url')`.
- Hashed using `bcryptjs` with cost factor 10 before persisting to PostgreSQL.
- Only the creator receives the plain key at link generation time.

### 2. Expiry Logic
- Expiration timestamps (`expiresAt`) are calculated at creation (`Date.now() + expiresInHours * 3600000`) or parsed from custom datetime input.
- Database queries enforce validity checks: `("expiresAt" IS NULL OR "expiresAt" > CURRENT_TIMESTAMP)`.
- Accessing an expired link returns HTTP `410 EXPIRED` without incrementing view count.

### 3. Invalidate / Revoke Logic
- Note owners can click **Revoke** on the Dashboard or Note Detail page (`/api/share/[token]/revoke`).
- Atomically sets `isRevoked = true` in PostgreSQL.
- Immediately evicts the token from Redis and in-process Node memory caches.
- Subsequent requests instantly receive HTTP `410 REVOKED`.

### 4. View Count Logic
- **Public Note**: Increments `viewCount` by +1 upon valid page fetch.
- **Protected Note**: Increments `viewCount` by +1 **strictly after** `bcrypt.compare()` returns `true`.
- **Wrong Password**: Does **not** increment `viewCount` (logged in `AccessLog` as `WRONG_PASSWORD`).
- **Expired / Revoked / Consumed Links**: Does **not** increment `viewCount`.

### 5. Race-Condition Handling (One-Time Links)
To prevent two users from opening a one-time link at the same millisecond:
1. **Layer 1 (In-Memory Redis Distributed Lock)**:
   - First incoming request acquires lock via `SET lock:token 1 EX 60 NX`.
   - Any concurrent request arriving in $<1\text{ ms}$ fails the lock in memory and is rejected immediately with HTTP `410 RACE_CONDITION_BLOCKED`.
2. **Layer 2 (PostgreSQL Atomic Row Lock)**:
   - Executes single atomic SQL update:
     ```sql
     UPDATE "ShareLink"
     SET "isUsed" = true, "viewCount" = "viewCount" + 1, "updatedAt" = CURRENT_TIMESTAMP
     WHERE "token" = $1 AND "isUsed" = false AND "isRevoked" = false
     ```
   - Exactly 1 concurrent transaction modifies the row; all others match 0 rows and are safely rejected.

---

## ❓ Required Technical Q&A Answers

### Q1: How do you prevent two users from using a one-time link at the same time?
> **Answer**: We combine an in-memory distributed lock with atomic database transactions:
> 1. **Redis SETNX Lock**: The first request acquires `SET lock:token 1 EX 60 NX` in $<1\text{ ms}$. Concurrent requesters fail the memory lock and are rejected immediately.
> 2. **Atomic SQL Mutation**: We run `UPDATE "ShareLink" SET "isUsed" = true WHERE "token" = $1 AND "isUsed" = false`. Database row-level locks serialize the write; exactly 1 request modifies the row and receives the note, while all concurrent requests fail the `isUsed = false` condition and return HTTP `410 ALREADY_USED`.

### Q2: How do you update view count safely?
> **Answer**: 
> 1. View counts are updated via atomic SQL increment operations (`viewCount = viewCount + 1`), preventing lost updates caused by read-modify-write race conditions.
> 2. Increments execute **strictly after authorization succeeds**. For password-protected links, `bcrypt.compare()` must validate before the increment query runs. Failed attempts, expired links, and revoked links never trigger increment operations.

### Q3: How would this work if 1 million people opened the link?
> **Answer**: To handle 1 million viral requests without crashing:
> 1. **Global Edge CDN Caching**: Public time-based links return `Cache-Control: public, s-maxage=5, stale-while-revalidate=15`. Cloudflare/Vercel Edge CDNs absorb 90%+ of reads at edge data centers without touching application servers.
> 2. **In-Process V8 Heap Cache (`lib/memory-cache.ts`)**: The Node.js process caches active note data in memory for 5 seconds (0.01ms latency), protecting Redis connection limits.
> 3. **Redis In-Memory Layer (`lib/redis.ts`)**: Shared cache across server instances serving up to 100,000 ops/sec.
> 4. **Asynchronous View Counter Batching (`lib/view-buffer.ts`)**: View increments are collected in memory and flushed to PostgreSQL in batched updates every 3 seconds, reducing database write operations from 1,000,000 to ~20.
> 5. **One-Time Race Shield**: Redis `SETNX` rejects 999,999 parallel requesters in memory; only 1 transaction reaches PostgreSQL.

### Q4: How would you prevent brute-force attempts on password-protected links?
> **Answer**:
> 1. **Sliding-Window Rate Limiting (`lib/rate-limiter.ts`)**: Enforce a strict rate limit of **5 failed password attempts per 15 minutes** per IP/token combination. Exceeding attempts triggers HTTP `429 Too Many Requests` with a `Retry-After` header.
> 2. **Computational Cost**: Bcrypt with cost factor 10 introduces a deliberate CPU workload per attempt, preventing automated high-speed dictionary attacks.
> 3. **Isolation**: Rate limits are scoped to client IP and token; an attack on one note does not impact other users.

---

## 📹 Demo Video Checklist

When recording your demonstration video, verify that each of the following flows is shown:

- [x] **Note Creation**: Creating a note with title, content, duration, and access settings.
- [x] **Share Link Generation**: Generating the unique shareable link.
- [x] **Public Share Link Flow**: Opening a public link directly without password prompts.
- [x] **Password-Protected Share Link Flow**: Unlocking a protected note using the generated access key.
- [x] **Dynamic Password / Key Generation**: Displaying the auto-generated high-entropy key with 1-click copy.
- [x] **Wrong Password Case**: Entering an incorrect key showing an error banner and 0 view count change.
- [x] **One-Time Expiry Case**: Opening a one-time note, refreshing/reopening, and verifying the `ALREADY_USED` notice.
- [x] **Time-Based Expiry Case**: Verifying that a link past its expiration timestamp displays the `EXPIRED` screen.
- [x] **Force Invalidate Case**: Clicking Revoke and confirming immediate link termination across all sessions.
- [x] **View Count Update**: Demonstrating that valid views increment by 1 while unauthorized attempts do not.
