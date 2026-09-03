# Unit 05 Spec: Public Share Flow & Concurrency Engine (/share/[token])

## Goal

Construct the public share page (`/share/[token]`), password prompt modal, atomic race-condition safe one-time link unlock engine, and edge-case status banners.

## Public Share Logic (`/share/[token]`)

### 1. Pre-Access Validation
- Fetch `ShareLink` by `token`.
- If link does not exist -> Render `Invalid or Non-Existent Share Link` banner.
- If `isRevoked == true` -> Render `This share link has been revoked by the owner` banner.
- If `expiresAt < NOW()` -> Render `This share link expired on [Date]` banner.
- If `shareType == ONE_TIME` and `isUsed == true` -> Render `This one-time share link has already been used` banner.

### 2. Password Verification (For Protected Links)
- Render password prompt input field.
- On submission, verify password against `passwordHash` using `bcrypt.compare()`.
- If password incorrect -> Render "Incorrect Access Key" error. View count remains **unchanged**.

### 3. Atomic Unlock & View Count Transaction
- For **One-Time Links**, execute an atomic update query:
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
  If query returns zero rows (due to concurrent consumption), return 410 Gone error ("One-time link already used").
- For **Time-Based Links**, atomically increment `viewCount` by 1 upon valid unlock.

## Verification Checklist

- [ ] Public link opens without password; view count increments +1.
- [ ] Password-protected link requires correct key; wrong key yields error and 0 count increment.
- [ ] One-time link expires immediately after first successful view.
- [ ] Simultaneous requests to a one-time link result in exactly 1 success and N failure responses.
- [ ] Revoked links display the revoked banner and refuse note rendering.
