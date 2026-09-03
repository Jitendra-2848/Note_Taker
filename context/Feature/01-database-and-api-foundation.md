# Unit 01 Spec: Database Schema & API Foundation

## Goal

Configure the relational database models (`User`, `Note`, `ShareLink`), Prisma client singleton, connection pool, and Hono.js API route engine to serve as the backend foundation for Note Taker.

## Data Model (`prisma/schema.prisma`)

- **User**: `id`, `email`, `passwordHash`, `name`, `createdAt`, `updatedAt`
- **Note**: `id`, `title`, `content`, `userId`, `createdAt`, `updatedAt`
- **ShareLink**:
  - `id`: String (UUID)
  - `noteId`: String (Foreign Key -> Note)
  - `token`: String (Unique 64-char UUID)
  - `shareType`: Enum (`ONE_TIME` | `TIME_BASED`)
  - `accessType`: Enum (`PUBLIC` | `PROTECTED`)
  - `passwordHash`: String? (Bcrypt hash of access key)
  - `plainKey`: String? (Unhashed key displayed to creator)
  - `expiresAt`: DateTime?
  - `isUsed`: Boolean (default `false`)
  - `isRevoked`: Boolean (default `false`)
  - `viewCount`: Int (default `0`)

## Implementation Details

### 1. Database Setup (`lib/db.ts`)
- Instantiate PrismaClient singleton attached to `globalThis` to prevent connection leaks during hot reload.
- Support PostgreSQL / SQLite database provider config.

### 2. API Server Engine (`app/api/[[...route]]/route.ts`)
- Mount Hono.js app handling `/api/*` subroutes with JSON response helpers, cors middleware, and global error handling.

## Verification Checklist

- [ ] `prisma/schema.prisma` compiles cleanly with `npx prisma validate`.
- [ ] Database client imports cleanly into API handlers.
- [ ] Base `/api/health` endpoint returns `{ status: "ok" }`.
