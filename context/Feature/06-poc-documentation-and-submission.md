# Unit 06 Spec: Production README & Technical Q&A

## Goal

Generate the production `README.md` for the technical assessment submission, detailing setup steps, database schema, share link workflow, and comprehensive technical Q&A answers.

## README Content Structure

### 1. Project Overview & Setup Instructions
- Step-by-step setup (`npm install`, `npx prisma db push`, `npm run dev`).
- Test Credentials (if seeded).

### 2. Tech Stack & Database Schema
- Stack: Next.js 16, TypeScript, Hono.js, PostgreSQL / Prisma ORM, Redis Cloud, Tailwind CSS.
- Entity Relationship Diagrams for `User`, `Note`, `ShareLink`, and `AccessLog`.

### 3. Share Link Flow & Invalidation Logic
- Explanation of One-Time vs Time-Based duration logic.
- Public vs Password-Protected authentication logic.
- Dynamic key generation algorithm (`crypto.randomBytes`).
- Force Invalidate / Revoke workflow.

### 4. Technical Q&A Section (Mandatory Questions)
1. **How do you prevent two users from using a one-time link at the same time?**
   - Answer: We execute an atomic in-memory Redis SETNX lock combined with a single-query atomic SQL transaction (`UPDATE "ShareLink" SET "isUsed" = true WHERE "token" = $1 AND "isUsed" = false RETURNING *`). The database row lock ensures atomic execution, guaranteeing that exactly one concurrent request succeeds while all others fail.
2. **How do you update view count safely?**
   - Answer: View count updates use atomic increment operations (`viewCount = viewCount + 1`) executed strictly on valid public views or verified password unlocks. Failed password attempts do not execute the update query.
3. **How would this work if 1 million people opened the link?**
   - Answer: We offload static assets and public link validation to Edge Caching / Redis / CDN key-value stores. Expired or used states are cached in Redis with short TTLs to eliminate database read bottlenecks under peak traffic loads.
4. **How would you prevent brute-force attempts on password-protected links?**
   - Answer: We enforce IP and token-based rate limiting (max 5 failed password attempts per 15 minutes per IP) using Sliding Window Rate-Limiting middleware (`ioredis` rate limiters) returning `429 Too Many Requests`.

## Verification Checklist
- All technical Q&A questions answered thoroughly.
- Zero company names or hardcoded submission targets included.
