# Unit 03 Spec: Note Creation & Dynamic Share Link Generator (/notes/new)

## Goal

Implement the note creation page (`/notes/new`) supporting note title, content, expiry date-time selection, Share Type (`ONE_TIME` vs `TIME_BASED`), Access Type (`PUBLIC` vs `PROTECTED`), dynamic password auto-generation, and share link URL creation.

## UI Requirements (`/notes/new`)

- Form Inputs:
  - Title (Text input)
  - Content (Textarea)
  - Expiry Selector (1 Hour, 24 Hours, 7 Days, Custom Expiry Date-Time picker)
  - Share Type Radio: `One-Time Access` | `Time-Based Access`
  - Access Type Radio: `Public` | `Password Protected`
  - Dynamic Password Field: Auto-generates a secure 12-char key (`generateAccessKey()`) with a "Regenerate" button when `Password Protected` is selected.
- Submission Action: Sends note & share configuration to API and redirects to `/notes/[id]` with a "Share Link Created" success banner.

## Backend Implementation (`app/api/notes/route.ts`)

- Accepts note title, content, and `shareOptions` payload.
- Hashes access key using `bcryptjs` if access type is `PROTECTED`.
- Creates `Note` and associated `ShareLink` record with generated 64-char UUID token.

## Verification Checklist

- [ ] Creating a note with a public share link generates a valid token URL.
- [ ] Selecting `Password Protected` auto-generates a dynamic password and hashes it before saving.
- [ ] Expiry timestamp is correctly calculated and saved in `expiresAt`.
