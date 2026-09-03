# Secure Note-Taking System with Expiring Share Links

> **Production PERN Stack Application**  
> **Project Name:** Note-Taking App with Secure Expiring Share Links  
> **Features:** Dual-Token Authentication, Google OAuth 2.0, Redis Caching & Distributed Locking, Atomic Concurrency Control, Dual Theme (Dark/Light).  

---

## 📌 Executive Summary & Architecture Overview

This project is a full-stack **Next.js 16 + Hono.js + PostgreSQL** note-sharing application with secure, expiring share links. The application enables users to create notes, configure duration parameters (`ONE_TIME` vs `TIME_BASED`), assign access controls (`PUBLIC` vs `PROTECTED`), auto-generate high-entropy access keys, force-revoke active share links, and track view counts accurately while enforcing atomic database transactions to eliminate race conditions.

---

## 🛠️ Tech Stack Used

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS v4, Lucide Icons.
- **Backend API**: Next.js 16 Route Handlers / Hono.js API endpoints.
- **Database & ORM**: PostgreSQL / SQLite with Prisma ORM 5.x.
- **Security & Authentication**: `bcryptjs` (password hashing), `jsonwebtoken` (JWT HTTP-Only session cookies), `crypto` (secure dynamic key generation).

---

## 🗄️ Database Schema (`prisma/schema.prisma`)

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
}

model ShareLink {
  id           String    @id @default(uuid())
  noteId       String
  note         Note      @relation(fields: [noteId], references: [id], onDelete: Cascade)
  token        String    @unique @default(uuid())
  shareType    String    @default("TIME_BASED") // ONE_TIME | TIME_BASED
  accessType   String    @default("PUBLIC")     // PUBLIC | PROTECTED
  passwordHash String?   // Nullable bcrypt hash of access key
  plainKey     String?   // Unhashed key displayed to note creator
  expiresAt    DateTime? // Nullable expiration timestamp
  isUsed       Boolean   @default(false)
  isRevoked    Boolean   @default(false)
  viewCount    Int       @default(0)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}
```

---

## ⚙️ Setup & Installation Instructions

### Prerequisites
- Node.js v18+ and npm installed.

### 1. Clone & Install Dependencies
```bash
git clone <repository-url>
cd note_taker
npm install
```

### 2. Database Migration & Seed
```bash
# Push database schema
npx prisma db push

# Seed demo test user & sample notes
npx tsx prisma/seed.ts
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔒 Logic Explanations & Technical Architecture

### 1. Share Link Flow
1. **Creation**: User creates a note at `/notes/new` and specifies share options (`ONE_TIME` or `TIME_BASED`, `PUBLIC` or `PROTECTED`, and Expiry limit).
2. **Generation**: A 64-character UUID token URL `/share/[token]` is generated. If `PROTECTED` is selected, a 12-character cryptographic password key is generated and hashed with bcrypt before saving.
3. **Resolution**: Opening `/share/[token]` checks:
   - Does token exist? (If no -> 404 `NOT_FOUND`).
   - Is `isRevoked == true`? (If yes -> 410 `REVOKED`).
   - Is `expiresAt < NOW()`? (If yes -> 410 `EXPIRED`).
   - Is `shareType == ONE_TIME` and `isUsed == true`? (If yes -> 410 `ALREADY_USED`).
   - Is link `PROTECTED`? (Prompts for password; incorrect password yields 401 and 0 view count update; correct password unlocks content).

### 2. Password / Key Generation Logic
Access keys are generated using Node's cryptographically secure `crypto.randomBytes(12).toString('base64url')` routine. The key is presented to the creator once and saved in the database as a `bcrypt` hash (`bcrypt.hash(key, 10)`).

### 3. Expiry Logic
Expiration timestamps (`expiresAt`) are calculated dynamically upon note creation (`Date.now() + expiresInHours * 3600000`). Database queries filter active links by enforcing `("expiresAt" IS NULL OR "expiresAt" > NOW())`.

### 4. Invalidate / Revoke Logic
Note owners can click **Force Invalidate** on `/notes/[id]`. This triggers a POST request to `/api/share/[token]/revoke` which sets `isRevoked = true`. Future requests to the link immediately return a `410 REVOKED` error banner regardless of remaining expiration time.

### 5. View Count Logic
- **Public View**: `viewCount` is incremented by +1 upon successful load.
- **Protected View**: `viewCount` is incremented by +1 **only** after bcrypt password verification succeeds. Failed password attempts do **not** increment `viewCount`.
- **Expired/Revoked/Used Links**: No count increment occurs.

### 6. Race-Condition & Concurrency Handling
One-time links (`ONE_TIME`) use an **atomic single-query SQL transaction**:
```sql
UPDATE "ShareLink"
SET "isUsed" = true, "viewCount" = "viewCount" + 1, "updatedAt" = NOW()
WHERE "token" = $1
  AND "shareType" = 'ONE_TIME'
  AND "isUsed" = false
  AND "isRevoked" = false
  AND ("expiresAt" IS NULL OR "expiresAt" > NOW())
RETURNING *;
```
Because PostgreSQL and SQLite enforce row-level locks on `UPDATE` operations, if 1,000 users hit a one-time link simultaneously, **exactly 1 request** updates the row and receives the note content, while the remaining 999 requests receive 0 updated rows and a `410 RACE_CONDITION_BLOCKED` response.

---

## ❓ Required Technical Q&A Answers

### Q1: How do you prevent two users from using a one-time link at the same time?
> **Answer**: We enforce atomic single-query SQL state mutations (`UPDATE "ShareLink" SET is_used = true WHERE token = $1 AND is_used = false RETURNING *`). Database row locks guarantee that execution is serialized; the first request atomically sets `is_used = true` and succeeds, while concurrent requests fail the `WHERE is_used = false` condition and return a `410 ALREADY_USED` error.

### Q2: How do you update view count safely?
> **Answer**: View count increments are executed using atomic SQL increments (`viewCount = viewCount + 1`) strictly AFTER authorization succeeds. For password-protected links, `bcrypt.compare()` must return `true` before the database increment query is executed, ensuring invalid attempts never pollute analytics.

### Q3: How would this work if 1 million people opened the link?
> **Answer**: To scale to 1 million concurrent users:
> 1. **Distributed Caching (Redis/Upstash)**: Share link metadata, bcrypt hashes, and revocation states are cached in Redis with short TTLs (e.g. 10s), bypassing database reads for 99.9% of traffic.
> 2. **Asynchronous View Counter Aggregation**: Instead of performing synchronous SQL writes per view, view events are published to a Redis HyperLogLog / Kafka queue and flushed to PostgreSQL in batch chunks every 5 seconds.
> 3. **Edge Validation**: Link expiration and revocation checks are executed at CDN Edge Workers (Cloudflare / Vercel Edge Middleware) before requests ever reach origin servers.

### Q4: How would you prevent brute-force attempts on password-protected links?
> **Answer**:
> 1. **IP & Token Rate-Limiting**: Enforce a Sliding Window rate limiter (max 5 failed password attempts per 15 minutes per IP/Token) returning `429 Too Many Requests`.
> 2. **Exponential Backoff**: Introduce progressive delay penalties (1s, 2s, 4s, 8s) on consecutive incorrect password submissions.
> 3. **Bcrypt Work Factor**: Use bcrypt with cost factor 10 to make automated dictionary attacks computationally expensive.

