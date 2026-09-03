# Architecture Context — Secure Note-Taking Application

## Stack

| Layer | Technology | Role |
| --- | --- | --- |
| **Framework** | Next.js 16 (App Router) + React 19 | Server components, routing, client state orchestration |
| **Backend API** | Next.js 16 Route Handlers (`app/api/`) / Hono | Fast endpoints, request validation, cookie management |
| **Database** | PostgreSQL / SQLite + Prisma ORM 5.x | Relational schema, connection pooling, ACID transaction guarantees |
| **Authentication** | JWT + `bcryptjs` + HTTP-Only Cookies | Secure user registration, authentication, and session persistence |
| **Styling & UI** | Tailwind CSS v4 + Lucide React + Glassmorphism | Dark technical aesthetic, ambient glows, responsive layout |

## Data Model & Relational Schema (`prisma/schema.prisma`)

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
  plainKey     String?   // Optional unhashed key stored for note owner convenience
  expiresAt    DateTime? // Expiry timestamp
  isUsed       Boolean   @default(false)
  isRevoked    Boolean   @default(false)
  viewCount    Int       @default(0)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}
```

## Security & Concurrency Architecture

### 1. Password Before Joining Security Model
- **Pre-Unlock Isolation**: When accessing `/share/[token]` for a `PROTECTED` note, the API route returns **only** public metadata (`title`, `accessType`, `shareType`, `expiresAt`). The sensitive note body `content` is **strictly excluded** from the payload until valid password verification is performed.
- **Dynamic Access Key Generation**: Random 12-char cryptographic keys generated via `crypto.randomBytes()`, ensuring high entropy resistance against guessing.
- **Bcrypt Work Factor**: Hashed with salt rounds 10.
- **Brute-Force & View Count Integrity**:
  - Failed password submission returns `401 Unauthorized` with code `WRONG_PASSWORD`.
  - The database `viewCount` is NOT modified on failed password submissions.
  - Rate limiting boundaries protect against automated key guessing.

### 2. Race-Condition Defense for One-Time Links
To prevent two or more users from concurrently opening and viewing a one-time link, the consumption query is executed as an **atomic single-query SQL transaction**:
```sql
UPDATE "ShareLink"
SET "isUsed" = 1, "viewCount" = "viewCount" + 1, "updatedAt" = CURRENT_TIMESTAMP
WHERE "token" = $1
  AND "shareType" = 'ONE_TIME'
  AND "isUsed" = 0
  AND "isRevoked" = 0
  AND ("expiresAt" IS NULL OR "expiresAt" > CURRENT_TIMESTAMP);
```
- Row-level database locking ensures that the first transaction sets `isUsed = 1` and returns 1 updated row.
- Any subsequent or simultaneous transaction finds 0 matching rows (`isUsed = 0` condition fails) and receives a `410 RACE_CONDITION_BLOCKED` response.

### 3. Force Invalidation / Revocation
- Note owners can revoke any share link instantly (`POST /api/share/[token]/revoke`).
- Revoked links immediately return `410 REVOKED` and block any further content rendering.

## System Invariants

1. **Zero Content Leakage**: Protected note content MUST never be delivered in initial GET responses before password verification.
2. **Atomic Consumption**: One-time links MUST be burned atomically; two simultaneous requests must NEVER both succeed.
3. **Audit Precision**: The `viewCount` metric must increase strictly on valid views. Failed passwords or expired links must yield zero increment.
4. **Owner Authority**: Force revoke overrides all duration and access permissions immediately.
