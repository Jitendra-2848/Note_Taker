# Code Standards — Secure Note-Taking System

## Security Standards

1. **Password & Key Handling**:
   - Dynamic access keys generated via Node `crypto.randomBytes(12).toString('base64url')`.
   - Never store plain passwords in auth systems. Use `bcryptjs` with minimum 10 salt rounds.
   - For protected share links, `passwordHash` is stored in the database; `plainKey` is retained solely for creator display and copy conveniences.
2. **Pre-Join Isolation**:
   - The initial GET request to `/api/share/[token]` MUST omit `content` if `accessType === 'PROTECTED'`.
   - `content` is only returned via POST `/api/share/[token]` with a valid password.
3. **Atomic Concurrency**:
   - Use atomic single-query SQL updates (`UPDATE ... WHERE isUsed = 0 RETURNING *` or raw execute) for one-time links to eliminate race conditions.
4. **View Count Accuracy**:
   - Increment `viewCount` strictly on verified access. Failed password attempts must never increment `viewCount`.

## React & UI Standards

1. **Password UX Affordances**:
   - Always provide show/hide password visibility toggles (`Eye` / `EyeOff`).
   - Provide dedicated "Copy Key" and "Copy Share Package" buttons on link creation and detail views.
   - Provide password strength indicators on registration.
2. **Glassmorphic Styling**:
   - Use CSS variables (`var(--bg-base)`, `var(--bg-surface)`, `var(--accent-primary)`).
   - Use subtle backdrop blurs (`backdrop-blur-xl`), rounded corners (`rounded-2xl`), and ambient glows for a polished technical aesthetic.
3. **Edge Case Feedback**:
   - Explicit alert banners for all error conditions: `NOT_FOUND`, `EXPIRED`, `ALREADY_USED`, `REVOKED`, `WRONG_PASSWORD`.

## API Response Shapes

```ts
export type ApiResponse<T> = 
  | { success: true; data: T; message?: string }
  | { success: false; error: string; code?: string };
```
