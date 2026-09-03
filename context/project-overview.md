# Project Overview — Secure Note-Taking Application

## Overview

**Note-Taking App with Secure Expiring Share Links** is a full-stack Next.js 16 + Hono.js + PostgreSQL web application. The application enables authenticated users to create secure notes and generate custom expiring share links with granular access controls (Public vs. Password-Protected) and duration parameters (One-time view vs. Time-based expiration), backed by atomic database transactions that guarantee protection against race conditions and concurrent access exploits.

## Goals

1. **Secure Expiring Share Links**: Deliver one-time view (`ONE_TIME`) and time-based (`TIME_BASED`) share link generation with automated background/query-level expiration logic.
2. **Flexible Access Modes**: Support unauthenticated public link access (`PUBLIC`) and dynamically key-protected access (`PROTECTED`) with bcrypt hashing.
3. **Race-Condition Proof Execution**: Guarantee via atomic SQL transactions (`UPDATE ... WHERE is_used = false RETURNING *`) that one-time links can never be unlocked or viewed by more than one user simultaneously.
4. **Accurate Analytics & Auditing**: Track view counts accurately (increment strictly on valid public access or successful password entry, ignoring wrong password attempts or expired links).
5. **Instant Administrative Control**: Empower note owners to forcefully invalidate/revoke share links at any time.

## Core User Flow

1. **Authentication**: User registers or logs in via `/register` or `/login`.
2. **Note Creation (`/notes/new`)**: User enters note title and content, selects share options:
   - Expiry date/time (e.g. 1 hour, 24 hours, custom date).
   - Share type: One-Time Access vs. Time-Based Access.
   - Access type: Public vs. Password-Protected.
   - For password-protected links: dynamic cryptographic key auto-generated (or custom key provided).
3. **Share Link Generation**: Upon creation, a unique secure 64-character token URL (`/share/[token]`) is generated and presented with a copy action.
4. **Note Management (`/notes/[id]`)**: Owner views active share links, live view count metrics, and triggers **Force Invalidate / Revoke**.
5. **Recipient Access (`/share/[token]`)**:
   - **Public Link**: Renders note content immediately; view count increments +1.
   - **Password Protected**: Displays password prompt modal; wrong key yields error with 0 count increment; correct key unlocks note and increments count +1.
   - **One-Time Link**: On first successful unlock, `is_used` atomicity sets to `true`; subsequent attempts display "One-Time Link Expired/Used".
   - **Revoked / Expired Link**: Displays immediate error banner; note content stays hidden.

## Pages Required & Map

- `/login` — User authentication login page.
- `/register` — User registration page.
- `/notes/new` — Note creation form with share link configuration controls.
- `/notes/[id]` — Note detail view, link manager, view count analytics, and Revoke action.
- `/share/[token]` — Public unlock portal handling verification, one-time consumption, and edge-case errors.

## Scope

### In Scope
- Next.js 16 App Router client & server integration.
- PostgreSQL database schema (`User`, `Note`, `ShareLink`, `AccessLog`).
- Atomic SQL queries for race-condition prevention.
- Cryptographic dynamic password generator.
- Force Invalidate / Revoke toggle.
- Comprehensive submission README with technical architecture Q&A answers.

### Out of Scope
- Multi-user real-time collaborative canvas (deferred).
- Mobile native apps (responsive web only).

## Success Criteria

1. **Build Quality**: `npm run build` compiles with 0 TypeScript and 0 lint errors.
2. **Race Condition Prevention**: Simulated parallel requests to a one-time link yield exactly 1 success and N failure responses.
3. **View Count Precision**: Failed password attempts do not increment view count.
4. **Security Integrity**: Passwords and access keys are stored securely using bcrypt hashing.
5. **Documentation Completeness**: README satisfies all required architecture and security questions.
