# Unit 02 Spec: Authentication & Sessions (/login, /register)

## Goal

Build user registration (`/register`) and login (`/login`) pages with secure `bcryptjs` password hashing, JWT session cookies, and route guard middleware.

## Pages & UI

- `/register`: Email, Password, Name fields with "Register" submission button.
- `/login`: Email, Password fields with "Sign In" submission button.

## Backend Implementation

- `app/api/auth/register`: Hashes password with `bcryptjs.hash(password, 10)`, creates `User`, returns JWT cookie `auth_token`.
- `app/api/auth/login`: Verifies user via `bcryptjs.compare()`, generates JWT, sets HTTP-only `auth_token` cookie.
- `app/api/auth/me`: Returns current authenticated user details.
- `app/api/auth/logout`: Clears `auth_token` cookie.

## Verification Checklist

- [ ] Registering a user hashes the password and logs the user in.
- [ ] Logging in with incorrect password returns 401 error message.
- [ ] Accessing protected routes redirects unauthenticated users to `/login`.
