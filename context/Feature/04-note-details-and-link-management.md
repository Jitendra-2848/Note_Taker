# Unit 04 Spec: Note Details & Force Revoke Link Management (/notes/[id])

## Goal

Build the note detail page (`/notes/[id]`), presenting the note content, active share links table, view count metrics, link status badges, and **Force Invalidate / Revoke** capability.

## UI Requirements (`/notes/[id]`)

- Note Display Card: Title, content body, created timestamp.
- Active Share Links Card:
  - Token Link URL with one-click "Copy Link" button.
  - Share Type badge (`One-Time` | `Time-Based`).
  - Access Type badge (`Public` | `Password Protected`).
  - Access Key (if protected and plain key is stored).
  - Expiry status (e.g. "Expires in 18 hours" or "Expired").
  - Live View Count badge (`👁️ View Count: N`).
  - **Force Invalidate / Revoke Button**: Red button triggering instant invalidation.

## Backend Implementation (`app/api/share/[token]/revoke`)

- Route Handler accepting `POST /api/share/[token]/revoke`.
- Verifies note ownership via user session.
- Sets `isRevoked = true` on the `ShareLink` record.

## Verification Checklist

- [ ] Viewing `/notes/[id]` displays note details and active share link details.
- [ ] Live view count accurately reflects total successful unlocks/views.
- [ ] Clicking "Force Invalidate / Revoke" immediately sets `isRevoked = true` and disables the share link URL.
